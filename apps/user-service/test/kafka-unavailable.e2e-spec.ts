import { INestApplication } from "@nestjs/common";

import { eventually } from "@libs/testing";

import { api } from "./helpers/api";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { findOutboxEvents } from "./helpers/outbox";
import { deposit, registerPair, transfer } from "./helpers/wallet";

// на порту 1 никто не слушает, подключение к kafka сразу отклоняется
const UNREACHABLE_KAFKA = "127.0.0.1:1";

describe("Kafka unavailable (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        process.env.KAFKA_BROKERS = UNREACHABLE_KAFKA;
        process.env.OUTBOX_RELAY_ENABLED = "true";

        app = await createTestApp();
        await app.listen(0);
    });

    beforeEach(async () => {
        await cleanDatabase(app);
    });

    afterAll(async () => {
        await app?.close();
    });

    const readPublishErrors = async (): Promise<number> => {
        const response = await api(app).get("/metrics").expect(200);
        const line = response.text
            .split("\n")
            .find((row) => row.startsWith("outbox_publish_errors_total "));

        return Number(line?.split(" ")[1] ?? 0);
    };

    describe("Negative tests", () => {
        it("Stays ready and reports Kafka as degraded", async () => {
            await eventually(async () => {
                const response = await api(app)
                    .get("/health/ready")
                    .expect(200);

                expect(response.body).toMatchObject({
                    status: "degraded",
                    info: {
                        postgres: { status: "up" },
                        kafka: { status: "degraded" },
                    },
                });
                // checkedAt появляется после первой настоящей проверки,
                // до нее kafka тоже числится degraded
                expect(response.body).toHaveProperty("info.kafka.checkedAt");
            });
        });

        it("Accepts a transfer and keeps its event until Kafka is back", async () => {
            const [sender, recipient] = await registerPair(app);
            await deposit(app, sender.accessToken, "100.00");

            const response = await transfer(app, sender.accessToken, {
                toUserId: recipient.userId,
                amount: "40.00",
            }).expect(201);
            const { id: transferId } = response.body as { id: string };

            // ждем, пока relay попробует отправить событие и получит ошибку
            await eventually(async () => {
                expect(await readPublishErrors()).toBeGreaterThan(0);
            });

            // не обновляем количество попыток отправить сообщение в кафку
            // тк это проблема кафки, которая упала, а не сообщения
            const events = await findOutboxEvents(app);
            expect(
                events.map(({ key, attempts, failedAt }) => ({
                    key,
                    attempts,
                    failedAt,
                })),
            ).toEqual([{ key: transferId, attempts: 0, failedAt: null }]);
        });
    });
});
