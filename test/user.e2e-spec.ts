import { INestApplication } from "@nestjs/common";

import { api, API_PREFIX } from "./helpers/api";
import { buildUser } from "./helpers/build-user";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { registerUser } from "./helpers/register-user";

describe("Users (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    beforeEach(async () => {
        await cleanDatabase(app);
    });

    afterAll(async () => {
        await app?.close();
    });

    describe("GET /users/me", () => {
        it("Returns token's owner profile", async () => {
            const login = "profile_owner";
            const email = "owner@example.com";
            const age = 30;

            const { accessToken } = await registerUser(app, {
                login,
                email,
                age,
            });

            const response = await api(app)
                .get(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as Record<string, unknown>;

            expect(body.login).toBe(login);
            expect(body.email).toBe(email);
            expect(body.age).toBe(age);
        });

        it("Doesn't return password hash", async () => {
            const { accessToken } = await registerUser(app);

            const response = await api(app)
                .get(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).not.toHaveProperty("password");
        });

        it("Returns 401 without access token", async () => {
            await api(app).get(`${API_PREFIX}/users/me`).expect(401);
        });

        it("Returns 401 with invalid access token", async () => {
            await api(app)
                .get(`${API_PREFIX}/users/me`)
                .set("Authorization", "Bearer not-a-real-token")
                .expect(401);
        });
    });

    describe("PATCH /users/me", () => {
        it("Updates bio", async () => {
            const { accessToken } = await registerUser(app);

            const response = await api(app)
                .patch(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ description: "updated bio" })
                .expect(200);

            const body = response.body as Record<string, unknown>;
            expect(body.description).toBe("updated bio");
        });

        it("Returns 409 if login is taken", async () => {
            await registerUser(app, {
                login: "occupied",
                email: "first@example.com",
            });

            const { accessToken } = await registerUser(app, {
                login: "second_user",
                email: "second@example.com",
            });

            await api(app)
                .patch(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ login: "occupied" })
                .expect(409);
        });

        it("Returns 400 when the payload contains a field outside the dto", async () => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .patch(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ password: "newPassw0rd" })
                .expect(400);

            // старый пароль должен остаться рабочим
            await api(app)
                .post(`${API_PREFIX}/auth/login`)
                .send({ login: "test_user", password: "strongPassw0rd" })
                .expect(200);
        });

        it("Updates email and normalizes it", async () => {
            const { accessToken } = await registerUser(app);

            const response = await api(app)
                .patch(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ email: "  NEW@Example.COM  " })
                .expect(200);

            const body = response.body as Record<string, unknown>;
            expect(body.email).toBe("new@example.com");
        });

        it("Returns 409 if email is taken", async () => {
            await registerUser(app, {
                login: "first_user",
                email: "first@example.com",
            });

            const { accessToken } = await registerUser(app, {
                login: "second_user",
                email: "second@example.com",
            });

            await api(app)
                .patch(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ email: "first@example.com" })
                .expect(409);
        });
    });

    describe("DELETE /users/me", () => {
        it("Deletes account", async () => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .delete(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(204);

            // токен ещё валиден по подписи, но пользователя уже нет
            await api(app)
                .get(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(404);
        });

        it("Revokes refresh tokens after deletion", async () => {
            const { accessToken, refreshCookie } = await registerUser(app);

            await api(app)
                .delete(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(204);

            await api(app)
                .post(`${API_PREFIX}/auth/refresh`)
                .set("Cookie", refreshCookie)
                .expect(401);
        });

        it("Frees login and email for reuse", async () => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .delete(`${API_PREFIX}/users/me`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(204);

            // проверка по уникальности только среди неудаленных пользователей
            await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser())
                .expect(201);
        });
    });

    describe("GET /users", () => {
        it("Returns list of users with correct information", async () => {
            await registerUser(app, {
                login: "bob",
                email: "bob@mail.com",
            });

            const { accessToken } = await registerUser(app, {
                login: "alice",
                email: "alice@mail.com",
            });

            const response = await api(app)
                .get(`${API_PREFIX}/users`)
                .query({ page: 1, limit: 1 })
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as {
                data: { login: string }[];
                meta: { total: number; totalPages: number };
            };

            expect(body.data).toHaveLength(1);
            expect(body.meta.total).toBe(2);
            expect(body.meta.totalPages).toBe(2);
            expect(body.data[0].login).toBe("alice"); // проверяем сортировку по login
        });

        it("Search is case insensitive", async () => {
            const { accessToken } = await registerUser(app, {
                login: "alice",
                email: "alice@example.com",
            });
            await registerUser(app, {
                login: "bob",
                email: "bob@example.com",
            });

            const response = await api(app)
                .get(`${API_PREFIX}/users`)
                .query({ search: "ALI" })
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as { data: { login: string }[] };

            expect(body.data).toHaveLength(1);
            expect(body.data[0].login).toBe("alice");
        });

        it("Returns 401 without access token", async () => {
            await api(app).get(`${API_PREFIX}/users`).expect(401);
        });

        it("Doesn't return password hashes in the list", async () => {
            const { accessToken } = await registerUser(app);

            const response = await api(app)
                .get(`${API_PREFIX}/users`)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as { data: Record<string, unknown>[] };

            expect(body.data.length).toBeGreaterThan(0);
            body.data.forEach((user) => {
                expect(user).not.toHaveProperty("password");
            });
        });
    });
});
