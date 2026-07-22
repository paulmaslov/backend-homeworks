import { INestApplication } from "@nestjs/common";

import { api, API_PREFIX } from "./helpers/api";
import { createTestApp } from "./helpers/create-test-app";
import { ErrorResponse } from "./helpers/error-response";
import { RATE_LIMIT_PERIOD, RATE_LIMIT_REQUESTS } from "./setup/env-defaults";

const REQUESTS = 2;
const PERIOD = "1s";
const PERIOD_MS = 1000;

describe("Rate limit (e2e)", () => {
    let app: INestApplication;

    const attempt = () =>
        api(app)
            .post(`${API_PREFIX}/auth/login`)
            .send({ login: "nobody", password: "whatever" });

    const exhaustLimit = async () => {
        for (let i = 0; i < REQUESTS; i++) {
            await attempt().expect(401);
        }
    };

    beforeAll(async () => {
        process.env.RATE_LIMIT_REQUESTS = String(REQUESTS);
        process.env.RATE_LIMIT_PERIOD = PERIOD;

        app = await createTestApp();
    });

    beforeEach(async () => {
        // пережидаем, чтобы тесты не мешали друг другу
        await new Promise((resolve) => setTimeout(resolve, PERIOD_MS + 200));
    });

    afterAll(async () => {
        await app?.close();

        process.env.RATE_LIMIT_REQUESTS = RATE_LIMIT_REQUESTS;
        process.env.RATE_LIMIT_PERIOD = RATE_LIMIT_PERIOD;
    });

    it("Allows requests within the limit", async () => {
        const statuses: number[] = [];

        for (let i = 0; i < REQUESTS; i++) {
            const response = await attempt();

            statuses.push(response.status);
        }

        expect(statuses).toHaveLength(REQUESTS);
        expect(statuses).not.toContain(429);
    });

    it("Returns 429 when the limit is exceeded", async () => {
        await exhaustLimit();

        const response = await attempt().expect(429);

        const body = response.body as ErrorResponse;

        expect(body.statusCode).toBe(429);
        expect(body.path).toBe(`${API_PREFIX}/auth/login`);
        expect(typeof body.timestamp).toBe("string");
    });

    it("Counts each endpoint separately", async () => {
        await exhaustLimit();
        await attempt().expect(429);

        // у другого хендлера свой счетчик и рейт лимитер не должен тригернуться
        await api(app).get(`${API_PREFIX}/users`).expect(401);
    });

    it("Resets the counter after the period", async () => {
        await exhaustLimit();
        await attempt().expect(429);

        await new Promise((resolve) => setTimeout(resolve, PERIOD_MS + 200));

        await attempt().expect(401);
    });
});
