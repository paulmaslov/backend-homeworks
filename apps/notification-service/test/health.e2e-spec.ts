import { INestApplication } from "@nestjs/common";

import { api } from "./helpers/api";
import { createTestApp } from "./helpers/create-test-app";
import { eventually } from "./helpers/wait";

describe("Health (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app?.close();
    });

    describe("Positive tests", () => {
        it("Reports MongoDB and Kafka as up", async () => {
            // статус kafka берется из фоновой проверки, а сразу после старта она еще
            // не закончилась и kafka числится degraded. ждем, пока станет up
            await eventually(async () => {
                const response = await api(app)
                    .get("/health/ready")
                    .expect(200);

                expect(response.body).toMatchObject({
                    status: "ok",
                    info: {
                        mongodb: { status: "up" },
                        kafka: { status: "up" },
                    },
                });
            });
        });
    });
});
