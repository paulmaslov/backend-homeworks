import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/sequelize";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { User } from "@/features/users/user.model";
import { IdempotencyCleanupService } from "@/features/wallet/idempotency-cleanup.service";

import { api, API_PREFIX } from "./helpers/api";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { deposit, getBalance, registerWithId } from "./helpers/wallet";

const MISSING_USER_ID = "00000000-0000-4000-8000-000000000000";

describe("Wallet transfers (e2e)", () => {
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

    // считаем только переводы: пополнения тоже лежат в этой таблице
    const countTransfers = async (): Promise<number> => {
        const [row] = await app.get(Sequelize).query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM transfers
             WHERE "fromUserId" IS NOT NULL`,
            { type: QueryTypes.SELECT },
        );

        return Number(row.count);
    };

    // верхняя граница баланса из миграции
    const MAX_BALANCE = "999999999999999.99";

    const setBalance = async (
        userId: string,
        balance: string,
    ): Promise<void> => {
        await app
            .get<typeof User>(getModelToken(User))
            .update({ balance }, { where: { id: userId } });
    };

    const registerPair = async (): Promise<
        [
            Awaited<ReturnType<typeof registerWithId>>,
            Awaited<ReturnType<typeof registerWithId>>,
        ]
    > => [
        await registerWithId(app, {
            login: "sender",
            email: "sender@example.com",
        }),
        await registerWithId(app, {
            login: "recipient",
            email: "recipient@example.com",
        }),
    ];

    it("Moves money from the sender to the recipient", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "100.00");

        const key = "retry-key-0001";

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: recipient.userId, amount: "40.51" })
            .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body.id).toEqual(expect.any(String));
        expect(body.fromUserId).toBe(sender.userId);
        expect(body.toUserId).toBe(recipient.userId);
        expect(body.amount).toBe("40.51");

        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "59.49",
        );
        await expect(getBalance(app, recipient.accessToken)).resolves.toBe(
            "40.51",
        );
        await expect(countTransfers()).resolves.toBe(1);
    });

    it("Rejects a transfer larger than the balance and changes nothing", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "10.00");

        const key = "retry-key-0001";

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: recipient.userId, amount: "10.01" })
            .expect(409);

        expect((response.body as { code: string }).code).toBe(
            "INSUFFICIENT_FUNDS",
        );

        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "10.00",
        );
        await expect(getBalance(app, recipient.accessToken)).resolves.toBe(
            "0.00",
        );
        await expect(countTransfers()).resolves.toBe(0);
    });

    it("Rejects a transfer to self", async () => {
        const user = await registerWithId(app);
        await deposit(app, user.accessToken, "10.00");

        const key = "retry-key-0001";

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: user.userId, amount: "1.00" })
            .expect(400);

        expect((response.body as { code: string }).code).toBe(
            "SELF_TRANSFER_FORBIDDEN",
        );
        await expect(getBalance(app, user.accessToken)).resolves.toBe("10.00");
        await expect(countTransfers()).resolves.toBe(0);
    });

    it("Returns 404 when the recipient does not exist", async () => {
        const sender = await registerWithId(app);
        await deposit(app, sender.accessToken, "10.00");

        const key = "retry-key-0001";

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: MISSING_USER_ID, amount: "1.00" })
            .expect(404);

        expect((response.body as { code: string }).code).toBe(
            "RECIPIENT_NOT_FOUND",
        );
        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "10.00",
        );
        await expect(countTransfers()).resolves.toBe(0);
    });

    it("Replays the first response when the same key is retried", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "100.00");

        const key = "retry-key-0001";
        const payload = { toUserId: recipient.userId, amount: "30.00" };

        const first = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send(payload)
            .expect(201);

        const second = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send(payload)
            .expect(201);

        expect(second.body).toEqual(first.body);
        expect(first.headers["idempotency-replayed"]).toBeUndefined();
        expect(second.headers["idempotency-replayed"]).toBe("true");

        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "70.00",
        );
        await expect(countTransfers()).resolves.toBe(1);
    });

    it("Treats a differently written same amount as the same request", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "100.00");

        const key = "normalized-key-01";

        const first = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: recipient.userId, amount: "30.00" })
            .expect(201);

        // 30 - те же деньги, что и 30.00, значит это повтор, а не другие параметры
        const second = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: recipient.userId, amount: "30" })
            .expect(201);

        expect(second.body).toEqual(first.body);
        await expect(countTransfers()).resolves.toBe(1);
    });

    it("Rejects the same key with different parameters", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "100.00");

        const key = "reused-key-0001";

        await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: recipient.userId, amount: "30.00" })
            .expect(201);

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId: recipient.userId, amount: "30.01" })
            .expect(409);

        expect((response.body as { code: string }).code).toBe(
            "IDEMPOTENCY_KEY_REUSED",
        );
        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "70.00",
        );
        await expect(countTransfers()).resolves.toBe(1);
    });

    it("Allows reusing a key after a failed operation", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "10.00");

        const key = "reusable-key-001";
        const payload = { toUserId: recipient.userId, amount: "50.00" };

        // пытаемся отправить больше денег, чем есть у отправителя
        await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send(payload)
            .expect(409);

        // ключ не занят - он откатился вместе с неудачной операцией
        await deposit(app, sender.accessToken, "40.00");

        await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send(payload)
            .expect(201);

        await expect(getBalance(app, sender.accessToken)).resolves.toBe("0.00");
        await expect(countTransfers()).resolves.toBe(1);
    });

    it.each([
        { reason: "missing", key: undefined },
        { reason: "too short", key: "short" },
    ])("Rejects a $reason Idempotency-Key", async ({ key }) => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "10.00");

        const request = api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`);

        if (key) {
            void request.set("Idempotency-Key", key);
        }

        const response = await request
            .send({ toUserId: recipient.userId, amount: "1.00" })
            .expect(400);

        expect((response.body as { code: string }).code).toBe(
            "IDEMPOTENCY_KEY_REQUIRED",
        );
        await expect(countTransfers()).resolves.toBe(0);
    });

    it("Rejects a transfer from a deleted account with a live token", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "10.00");

        await api(app)
            .delete(`${API_PREFIX}/users/me`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .expect(204);

        // токен пользователя, валиден еще 15 минут после удаления пользователя
        // (по-хорошему клиент должен держать его в ин мемори хранилище и
        // удалять при логауте / удалении, чтобы таких ситуаций не было)
        // и до кошелька запрос доходит - удаление ловим уже на локе
        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", randomUUID())
            .send({ toUserId: recipient.userId, amount: "1.00" })
            .expect(401);

        expect((response.body as { code: string }).code).toBe(
            "ACCOUNT_DELETED",
        );
        await expect(countTransfers()).resolves.toBe(0);
    });

    it("Rejects reading the balance of a deleted account", async () => {
        const user = await registerWithId(app);

        await api(app)
            .delete(`${API_PREFIX}/users/me`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(204);

        const response = await api(app)
            .get(`${API_PREFIX}/wallet/balance`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(401);

        expect((response.body as { code: string }).code).toBe(
            "ACCOUNT_DELETED",
        );
    });

    it("Rejects a deposit that overflows the balance limit", async () => {
        const user = await registerWithId(app);
        await setBalance(user.userId, MAX_BALANCE);

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/deposits`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .set("Idempotency-Key", randomUUID())
            .send({ amount: "0.01" })
            .expect(409);

        // 409, а не 500 - сумма вычисляется в NUMERIC(19,2) и упирается
        // в check, а не в numeric field overflow
        expect((response.body as { code: string }).code).toBe(
            "BALANCE_LIMIT_EXCEEDED",
        );
        await expect(getBalance(app, user.accessToken)).resolves.toBe(
            MAX_BALANCE,
        );
    });

    it("Rolls the debit back when the recipient balance overflows", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "10.00");
        await setBalance(recipient.userId, MAX_BALANCE);

        const response = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", randomUUID())
            .send({ toUserId: recipient.userId, amount: "1.00" })
            .expect(409);

        expect((response.body as { code: string }).code).toBe(
            "BALANCE_LIMIT_EXCEEDED",
        );

        // списание уже прошло, к моменту падения деньги обязаны вернуться
        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "10.00",
        );
        await expect(countTransfers()).resolves.toBe(0);
    });

    it("Never exposes the balance through the users API", async () => {
        const user = await registerWithId(app);
        await deposit(app, user.accessToken, "100.00");

        const profile = await api(app)
            .get(`${API_PREFIX}/users/me`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(200);

        expect(profile.body).not.toHaveProperty("balance");

        const list = await api(app)
            .get(`${API_PREFIX}/users`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(200);

        const { data } = list.body as { data: Record<string, unknown>[] };
        expect(data.length).toBeGreaterThan(0);

        for (const item of data) {
            expect(item).not.toHaveProperty("balance");
        }
    });

    it("Lets an expired key start a new operation", async () => {
        const [sender, recipient] = await registerPair();
        await deposit(app, sender.accessToken, "100.00");

        const key = "expiring-key-001";
        const payload = { toUserId: recipient.userId, amount: "30.00" };

        const first = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send(payload)
            .expect(201);

        // состариваем наш ключ
        await app.get(Sequelize).query(
            `UPDATE idempotency_keys
         SET "createdAt" = now() - interval '25 hours'
         WHERE "key" = :key`,
            { replacements: { key } },
        );

        await expect(app.get(IdempotencyCleanupService).run()).resolves.toBe(1);

        const second = await api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send(payload)
            .expect(201);

        // тот же ключ, но окно закрылось - это новая операция, а не повтор
        expect((second.body as { id: string }).id).not.toBe(
            (first.body as { id: string }).id,
        );
        expect(second.headers["idempotency-replayed"]).toBeUndefined();

        // история цела, деньги списаны дважды
        await expect(countTransfers()).resolves.toBe(2);
        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "40.00",
        );
    });
});
