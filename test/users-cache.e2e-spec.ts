import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/sequelize";

import { PaginatedDto } from "@/common/dto/paginated.dto";
import { UserResponseDto } from "@/features/users/dto/user-response.dto";
import { User } from "@/features/users/user.model";

import { api, API_PREFIX } from "./helpers/api";
import { cleanCache } from "./helpers/clean-cache";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { registerUser } from "./helpers/register-user";

const USERS_URL = `${API_PREFIX}/users`;
const ME_URL = `${API_PREFIX}/users/me`;

describe("Users cache (e2e)", () => {
    let app: INestApplication;
    // чтобы менять данные в обход апи
    let userModel: typeof User;

    beforeAll(async () => {
        app = await createTestApp();
        userModel = app.get<typeof User>(getModelToken(User));
    });

    beforeEach(async () => {
        await cleanDatabase(app);
        await cleanCache(app);
    });

    afterAll(async () => {
        await app?.close();
    });

    const getMe = (accessToken: string) =>
        api(app).get(ME_URL).set("Authorization", `Bearer ${accessToken}`);

    const getUsers = (accessToken: string) =>
        api(app).get(USERS_URL).set("Authorization", `Bearer ${accessToken}`);

    describe("GET /users/me - negative tests", () => {
        it("Returns 404 for a deleted account even if the profile was cached", async () => {
            const { accessToken } = await registerUser(app);
            await getMe(accessToken).expect(200);

            await api(app)
                .delete(ME_URL)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(204);

            await getMe(accessToken).expect(404);
        });

        it("Does not serve one user's profile to another", async () => {
            const alice = await registerUser(app, {
                login: "alice",
                email: "alice@example.com",
            });
            const bob = await registerUser(app, {
                login: "bob",
                email: "bob@example.com",
            });

            await getMe(alice.accessToken).expect(200);
            const response = await getMe(bob.accessToken).expect(200);

            expect((response.body as UserResponseDto).login).toBe("bob");
        });
    });

    describe("GET /users/me - positive tests", () => {
        it("Serves the profile from cache while the ttl has not expired", async () => {
            const { accessToken } = await registerUser(app);

            const first = await getMe(accessToken).expect(200);
            const { id, login } = first.body as UserResponseDto;

            // меняем строку мимо апи, поэтому инвалидации не происходит
            await userModel.update(
                { login: "changed_in_db" },
                { where: { id } },
            );

            const second = await getMe(accessToken).expect(200);

            expect((second.body as UserResponseDto).login).toBe(login);
        });

        it("Returns a fresh profile after an update", async () => {
            const { accessToken } = await registerUser(app);
            await getMe(accessToken).expect(200);

            await api(app)
                .patch(ME_URL)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ login: "updated_login" })
                .expect(200);

            const response = await getMe(accessToken).expect(200);

            expect((response.body as UserResponseDto).login).toBe(
                "updated_login",
            );
        });
    });

    describe("GET /users - positive tests", () => {
        it("Returns a fresh list after a new user registers", async () => {
            const { accessToken } = await registerUser(app, {
                login: "alice",
                email: "alice@example.com",
            });

            const before = await getUsers(accessToken).expect(200);
            expect(
                (before.body as PaginatedDto<UserResponseDto>).meta.total,
            ).toBe(1);

            await registerUser(app, {
                login: "bob",
                email: "bob@example.com",
            });

            const after = await getUsers(accessToken).expect(200);
            const body = after.body as PaginatedDto<UserResponseDto>;

            expect(body.meta.total).toBe(2);
            expect(body.data.map((user) => user.login)).toContain("bob");
        });
    });
});
