import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";

import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { findOutboxEvents } from "./helpers/outbox";
import { deposit, registerPair, transfer } from "./helpers/wallet";

// relay выключен, поэтому в outbox остается ровно то, что записал перевод
describe("Transfer events (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
        await app.listen(0);
    });

    beforeEach(async () => {
        await cleanDatabase(app);
    });

    afterAll(async () => {
        await app?.close();
    });

    describe("Negative tests", () => {
        it("Records no event for a rejected transfer", async () => {
            const [sender, recipient] = await registerPair(app);
            await deposit(app, sender.accessToken, "10.00");

            await transfer(app, sender.accessToken, {
                toUserId: recipient.userId,
                amount: "50.00",
            }).expect(409);

            // событие пишется в одной транзакции с переводом и откатывается
            // вместе с ним
            expect(await findOutboxEvents(app)).toEqual([]);
        });

        it("Records one event when a transfer is retried with the same key", async () => {
            const [sender, recipient] = await registerPair(app);
            await deposit(app, sender.accessToken, "100.00");

            const body = { toUserId: recipient.userId, amount: "40.00" };
            const idempotencyKey = randomUUID();

            await transfer(app, sender.accessToken, body, {
                idempotencyKey,
            }).expect(201);
            // повтор отдает сохраненный ответ и не выполняет перевод заново
            await transfer(app, sender.accessToken, body, {
                idempotencyKey,
            }).expect(201);

            expect(await findOutboxEvents(app)).toHaveLength(1);
        });
    });
});
