import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/create-test-app";
import { cleanDatabase } from "./helpers/clean-database";
import { buildUser } from "./helpers/build-user";
import { getRefreshCookie } from "./helpers/get-cookies";
import { registerUser } from "./helpers/register-user";
import { api, API_PREFIX } from "./helpers/api";
import { AccessTokenResponseDto } from "@/auth/dto/access-token-response.dto";

describe("Auth (e2e)", () => {
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

    describe("POST /auth/register", () => {
        it("Register new user and returns access token", async () => {
            const response = await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser())
                .expect(201);

            const body = response.body as AccessTokenResponseDto;

            expect(typeof body.accessToken).toBe("string");
        });

        it("Checks if refresh cookie exists", async () => {
            const response = await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser())
                .expect(201);

            const refreshCookie = getRefreshCookie(response);

            expect(refreshCookie).toBeDefined();
            expect(refreshCookie).toContain("HttpOnly");
        });

        it("Register already existing user login", async () => {
            await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser())
                .expect(201);

            await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser({ email: "another@email.com" }))
                .expect(409);
        });

        it("Returns 409 when email is already taken", async () => {
            await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser())
                .expect(201);

            await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser({ login: "another_login" }))
                .expect(409);
        });

        it("Returns 400 when password is too short", async () => {
            await api(app)
                .post(`${API_PREFIX}/auth/register`)
                .send(buildUser({ password: "short" }))
                .expect(400);
        });
    });

    describe("POST /auth/login", () => {
        const login = "profile_owner";
        const password = "strongPassw0rd";

        it("Login by correct input", async () => {
            await registerUser(app, { login, password });

            const response = await api(app)
                .post(`${API_PREFIX}/auth/login`)
                .send({ login, password })
                .expect(200);

            expect(response.body).toHaveProperty("accessToken");
        });

        it("Returns 401 for incorrect password", async () => {
            await registerUser(app, { login, password });

            await api(app)
                .post(`${API_PREFIX}/auth/login`)
                .send({ login, password: "wrongPassw0rd" })
                .expect(401);
        });

        it("Returns 401 for incorrect login", async () => {
            await registerUser(app, { login, password });

            await api(app)
                .post(`${API_PREFIX}/auth/login`)
                .send({ login: "Rom4ik", password })
                .expect(401);
        });
    });

    describe("POST /auth/logout", () => {
        it("Checks if refresh token is revoked after logout", async () => {
            const { refreshCookie } = await registerUser(app);

            await api(app)
                .post(`${API_PREFIX}/auth/logout`)
                .set("Cookie", refreshCookie)
                .expect(204);

            await api(app)
                .post(`${API_PREFIX}/auth/refresh`)
                .set("Cookie", refreshCookie)
                .expect(401);
        });
    });

    describe("POST /auth/refresh", () => {
        it("Refreshes token pair by cookie", async () => {
            const { refreshCookie } = await registerUser(app);

            const response = await api(app)
                .post(`${API_PREFIX}/auth/refresh`)
                .set("Cookie", refreshCookie)
                .expect(200);

            expect(response.body).toHaveProperty("accessToken");

            const newCookie = getRefreshCookie(response);
            expect(newCookie).toBeDefined();
        });

        it("Checks if old refresh cookie not working after refresh", async () => {
            const { refreshCookie } = await registerUser(app);

            await api(app)
                .post(`${API_PREFIX}/auth/refresh`)
                .set("Cookie", refreshCookie)
                .expect(200);

            // тот же старый токен повторно
            await api(app)
                .post(`${API_PREFIX}/auth/refresh`)
                .set("Cookie", refreshCookie)
                .expect(401);
        });

        it("Returns 401 without refresh cookie", async () => {
            await api(app).post(`${API_PREFIX}/auth/refresh`).expect(401);
        });
    });
});
