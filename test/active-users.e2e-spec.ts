import { INestApplication } from "@nestjs/common";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { AvatarResponseDto } from "@/features/avatars/dto/avatar-response.dto";
import { ActiveUsersPageResponseDto } from "@/features/users/dto/active-user-response.dto";
import {
    ACTIVE_USER_MIN_AVATARS,
    ACTIVE_USERS_MAX_LIMIT,
    MAX_USER_AGE,
    MIN_USER_AGE,
} from "@/features/users/user.constants";

import { api, API_PREFIX } from "./helpers/api";
import { buildImage } from "./helpers/build-image";
import { UserOverrides } from "./helpers/build-user";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { registerUser } from "./helpers/register-user";
import { cleanBucket } from "./helpers/s3";

const ACTIVE_USERS_URL = `${API_PREFIX}/users/active`;
const AVATARS_URL = `${API_PREFIX}/users/me/avatars`;

// диапазон, в который попадает любой пользователь
const ANY_AGE = { ageFrom: MIN_USER_AGE, ageTo: MAX_USER_AGE };

describe("Active users (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    beforeEach(async () => {
        await cleanDatabase(app);
        await cleanBucket(app);
    });

    afterAll(async () => {
        await app?.close();
    });

    // регистрируем пользователя и загружаем ему avatarCount количество аватарок
    const registerUserWithAvatars = async (
        login: string,
        overrides: UserOverrides = {},
        avatarCount = ACTIVE_USER_MIN_AVATARS,
    ): Promise<{ accessToken: string; avatars: AvatarResponseDto[] }> => {
        const { accessToken } = await registerUser(app, {
            login,
            email: `${login}@example.com`,
            ...overrides,
        });

        const avatars: AvatarResponseDto[] = [];
        for (let i = 0; i < avatarCount; i++) {
            const response = await api(app)
                .post(AVATARS_URL)
                .set("Authorization", `Bearer ${accessToken}`)
                .attach("file", buildImage(), {
                    filename: "avatar.png",
                    contentType: "image/png",
                })
                .expect(201);

            avatars.push(response.body as AvatarResponseDto);
        }

        return { accessToken, avatars };
    };

    const findActiveUsers = async (
        accessToken: string,
        query: Record<string, unknown>,
    ): Promise<ActiveUsersPageResponseDto> => {
        const response = await api(app)
            .get(ACTIVE_USERS_URL)
            .query(query)
            .set("Authorization", `Bearer ${accessToken}`)
            .expect(200);

        return response.body as ActiveUsersPageResponseDto;
    };

    describe("GET /users/active - negative tests", () => {
        it("Returns 401 without access token", async () => {
            await api(app)
                .get(ACTIVE_USERS_URL)
                .query({ ageFrom: 20, ageTo: 30 })
                .expect(401);
        });

        it("Returns 401 with invalid access token", async () => {
            await api(app)
                .get(ACTIVE_USERS_URL)
                .query({ ageFrom: 20, ageTo: 30 })
                .set("Authorization", "Bearer not-a-real-token")
                .expect(401);
        });

        it.each([
            { reason: "ageFrom is missing", query: { ageTo: 30 } },
            { reason: "ageTo is missing", query: { ageFrom: 20 } },
            {
                reason: "ageFrom is not a number",
                query: { ageFrom: "twenty", ageTo: 30 },
            },
            {
                reason: "ageFrom is below the allowed minimum",
                query: { ageFrom: MIN_USER_AGE - 1, ageTo: 30 },
            },
            {
                reason: "ageTo is above the allowed maximum",
                query: { ageFrom: 20, ageTo: MAX_USER_AGE + 1 },
            },
            {
                reason: "ageFrom is greater than ageTo",
                query: { ageFrom: 30, ageTo: 20 },
            },
            {
                reason: "limit is over the allowed maximum",
                query: {
                    ageFrom: 20,
                    ageTo: 30,
                    limit: ACTIVE_USERS_MAX_LIMIT + 1,
                },
            },
            {
                reason: "the cursor is not a valid token",
                query: { ageFrom: 20, ageTo: 30, cursor: "not-a-cursor" },
            },
            {
                reason: "an unknown parameter is passed",
                query: { ageFrom: 20, ageTo: 30, role: "admin" },
            },
        ])("Returns 400 when $reason", async ({ query }) => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .get(ACTIVE_USERS_URL)
                .query(query)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(400);
        });

        it("Returns 400 when the cursor was issued for another age range", async () => {
            const { accessToken } = await registerUserWithAvatars("alice", {
                age: 20,
                description: "bio",
            });
            await registerUserWithAvatars("bob", {
                age: 25,
                description: "bio",
            });

            const first = await findActiveUsers(accessToken, {
                ageFrom: 20,
                ageTo: 30,
                limit: 1,
            });

            await api(app)
                .get(ACTIVE_USERS_URL)
                .query({ ageFrom: 20, ageTo: 25, cursor: first.nextCursor })
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(400);
        });
    });

    describe("GET /users/active - positive tests", () => {
        it("Returns a user with a description and enough active avatars", async () => {
            const { accessToken } = await registerUserWithAvatars("alice", {
                age: 25,
                description: "frontend dev",
            });

            const body = await findActiveUsers(accessToken, ANY_AGE);

            expect(body.data).toHaveLength(1);
            expect(body.data[0].login).toBe("alice");
        });

        it.each([
            { reason: "is missing", description: undefined },
            { reason: "is empty", description: "" },
        ])(
            "Skips a user whose description $reason",
            async ({ description }) => {
                const { accessToken } = await registerUserWithAvatars(
                    "candidate",
                    {
                        description,
                    },
                );

                const body = await findActiveUsers(accessToken, ANY_AGE);

                expect(body.data).toHaveLength(0);
            },
        );

        // пробуем ровно 2 аватарки, где пользователь еще не считается активным
        it("Skips a user with fewer avatars than required", async () => {
            const { accessToken } = await registerUserWithAvatars(
                "candidate",
                { description: "bio" },
                ACTIVE_USER_MIN_AVATARS - 1,
            );

            const body = await findActiveUsers(accessToken, ANY_AGE);

            expect(body.data).toHaveLength(0);
        });

        it("Includes both ends of the age range and nothing outside it", async () => {
            const { accessToken } = await registerUserWithAvatars("too_young", {
                age: 19,
                description: "bio",
            });
            await registerUserWithAvatars("lower_bound", {
                age: 20,
                description: "bio",
            });
            await registerUserWithAvatars("upper_bound", {
                age: 30,
                description: "bio",
            });
            await registerUserWithAvatars("too_old", {
                age: 31,
                description: "bio",
            });

            const body = await findActiveUsers(accessToken, {
                ageFrom: 20,
                ageTo: 30,
            });

            expect(body.data.map((user) => user.login)).toEqual([
                "lower_bound",
                "upper_bound",
            ]);
        });

        it("Drops a user when a deleted avatar leaves him below the limit", async () => {
            const { accessToken, avatars } = await registerUserWithAvatars(
                "alice",
                {
                    description: "bio",
                },
            );

            await api(app)
                .delete(`${AVATARS_URL}/${avatars[0].id}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(204);

            const body = await findActiveUsers(accessToken, ANY_AGE);

            expect(body.data).toHaveLength(0);
        });

        it("Skips a deleted user even if his avatars are still active", async () => {
            const reader = await registerUser(app, {
                login: "reader",
                email: "reader@example.com",
            });
            const alice = await registerUserWithAvatars("alice", {
                description: "bio",
            });

            await api(app)
                .delete(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${alice.accessToken}`)
                .expect(204);

            const body = await findActiveUsers(reader.accessToken, ANY_AGE);

            expect(body.data).toHaveLength(0);
        });

        it("Returns only the report fields", async () => {
            const { accessToken } = await registerUserWithAvatars("alice", {
                description: "bio",
            });

            const body = await findActiveUsers(accessToken, ANY_AGE);
            const [user] = body.data;

            expect(Object.keys(user).sort()).toEqual([
                "age",
                "avatarsCount",
                "description",
                "id",
                "lastAvatar",
                "login",
            ]);
            expect(Object.keys(user.lastAvatar).sort()).toEqual([
                "createdAt",
                "id",
                "url",
            ]);
        });

        it("Returns the last uploaded avatar with the url from the upload response", async () => {
            const { accessToken, avatars } = await registerUserWithAvatars(
                "alice",
                {
                    description: "bio",
                },
            );
            const lastUploaded = avatars[avatars.length - 1];

            const body = await findActiveUsers(accessToken, ANY_AGE);
            const [user] = body.data;

            expect(user.avatarsCount).toBe(ACTIVE_USER_MIN_AVATARS);
            expect(user.lastAvatar.id).toBe(lastUploaded.id);
            expect(user.lastAvatar.url).toBe(lastUploaded.url);
        });

        it("Falls back to the previous avatar when the newest one is deleted", async () => {
            const { accessToken, avatars } = await registerUserWithAvatars(
                "alice",
                { description: "bio" },
                ACTIVE_USER_MIN_AVATARS + 1,
            );
            const newest = avatars[avatars.length - 1];
            const previous = avatars[avatars.length - 2];

            await api(app)
                .delete(`${AVATARS_URL}/${newest.id}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(204);

            const body = await findActiveUsers(accessToken, ANY_AGE);
            const [user] = body.data;

            expect(user.avatarsCount).toBe(ACTIVE_USER_MIN_AVATARS);
            expect(user.lastAvatar.id).toBe(previous.id);
        });

        it("Walks through the pages in age order without repeats", async () => {
            const { accessToken } = await registerUserWithAvatars("first", {
                age: 20,
                description: "bio",
            });
            await registerUserWithAvatars("second", {
                age: 25,
                description: "bio",
            });
            await registerUserWithAvatars("third", {
                age: 30,
                description: "bio",
            });

            const first = await findActiveUsers(accessToken, {
                ...ANY_AGE,
                limit: 2,
            });

            expect(first.data.map((user) => user.login)).toEqual([
                "first",
                "second",
            ]);
            expect(first.nextCursor).not.toBeNull();

            const second = await findActiveUsers(accessToken, {
                ...ANY_AGE,
                limit: 2,
                cursor: first.nextCursor,
            });

            expect(second.data.map((user) => user.login)).toEqual(["third"]);
            expect(second.nextCursor).toBeNull();
        });

        it("Returns a null cursor when the last page is exactly full", async () => {
            const { accessToken } = await registerUserWithAvatars("first", {
                age: 20,
                description: "bio",
            });
            await registerUserWithAvatars("second", {
                age: 25,
                description: "bio",
            });

            const body = await findActiveUsers(accessToken, {
                ...ANY_AGE,
                limit: 2,
            });

            expect(body.data).toHaveLength(2);
            expect(body.nextCursor).toBeNull();
        });
    });

    // проверяем, что индекс используется
    describe("GET /users/active - query plan", () => {
        // заполняем таблицы sql запросом, так как http запросы
        // заняли бы очень много времени
        const createManyUsers = async (sequelize: Sequelize): Promise<void> => {
            // заполняем таблицу пользователями, возраст раскидываем
            // по всему разрешенному диапазону от 14 до 139
            await sequelize.query(
                `INSERT INTO users (id, login, email, password, age, description, "createdAt", "updatedAt")
                 SELECT gen_random_uuid(), 'bulk_' || i, 'bulk_' || i || '@example.com', 'hash',
                        $1::int + i % ($2::int - $1::int), 'bio', now(), now()
                 FROM generate_series(1, 1000) AS i`,
                { bind: [MIN_USER_AGE, MAX_USER_AGE], type: QueryTypes.INSERT },
            );

            // заполняем аватарками пользователей
            await sequelize.query(
                `INSERT INTO avatars (id, "userId", "fileName", "mimeType", size, "createdAt", "updatedAt")
                 SELECT gen_random_uuid(), u.id, u.login || '_' || n || '.png', 'image/png', 1024, now(), now()
                 FROM users u, generate_series(1, $1::int) AS n`,
                { bind: [ACTIVE_USER_MIN_AVATARS], type: QueryTypes.INSERT },
            );

            // чтобы планировщик выбрал индекс, а не полное чтение таблицы
            await sequelize.query("ANALYZE users, avatars", {
                type: QueryTypes.RAW,
            });
        };

        it("Uses the partial indexes instead of scanning the tables", async () => {
            const sequelize = app.get(Sequelize);
            const { accessToken } = await registerUser(app);

            await createManyUsers(sequelize);

            // перехватываем текст запроса sql для explain
            // чтобы тест был устойчив к изменениям самого запроса
            let executedSql = "";
            let executedBind: unknown[] = [];

            sequelize.addHook(
                "afterQuery",
                "captureActiveUsers",
                (options, query) => {
                    const { sql } = query as unknown as { sql: string };

                    if (sql.includes(`AS "avatarsCount"`)) {
                        executedSql = sql;
                        executedBind = options.bind as unknown[];
                    }
                },
            );

            try {
                await findActiveUsers(accessToken, { ageFrom: 20, ageTo: 25 });
            } finally {
                sequelize.removeHook("afterQuery", "captureActiveUsers");
            }

            // смотрим план выполнения запроса, который составила бд
            const plan = await sequelize.query<{ "QUERY PLAN": string }>(
                `EXPLAIN ${executedSql}`,
                { bind: executedBind, type: QueryTypes.SELECT },
            );
            const planText = plan.map((row) => row["QUERY PLAN"]).join("\n");

            expect(planText).toContain("users_age_active_with_description");
            expect(planText).toContain("avatars_user_id_created_at_active");
            // смотрим, чтобы не было чтения таблицы
            expect(planText).not.toMatch(/Seq Scan on (users|avatars)/);
        });
    });
});
