import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import type { Response } from "supertest";

import { api, API_PREFIX } from "./helpers/api";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import {
    deposit,
    getBalance,
    registerWithId,
    WalletUser,
} from "./helpers/wallet";

describe("Wallet concurrency (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();

        // createTestApp делает только init(), сервер не слушает порт.
        // supertest в этом случае поднимает listener сам, и первый же
        // завершившийся запрос его закрывает - остальные параллельные
        // получают ECONNRESET на подключении
        await app.listen(0);
    });

    beforeEach(async () => {
        await cleanDatabase(app);
    });

    afterAll(async () => {
        await app?.close();
    });

    const registerMany = async (
        count: number,
        prefix: string,
    ): Promise<WalletUser[]> =>
        Promise.all(
            Array.from({ length: count }, (_, index) =>
                registerWithId(app, {
                    login: `${prefix}_${index}`,
                    email: `${prefix}_${index}@example.com`,
                }),
            ),
        );

    // в обход апи складываем все балансы пользователей, для сравнения с тем,
    // сколько денег завели в систему (через самопополнение), любое
    // расхождение этих сумм означает ошибку
    const sumBalances = async (): Promise<string> => {
        const [row] = await app
            .get(Sequelize)
            .query<{ total: string }>(
                `SELECT coalesce(sum(balance), 0)::text AS total FROM users`,
                { type: QueryTypes.SELECT },
            );

        return row.total;
    };

    // считаем сколько всего денег завели в систему
    const countTransfers = async (): Promise<number> => {
        const [row] = await app.get(Sequelize).query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM transfers
             WHERE "fromUserId" IS NOT NULL`,
            { type: QueryTypes.SELECT },
        );

        return Number(row.count);
    };

    const transferRequest = (
        sender: WalletUser,
        toUserId: string,
        amount: string,
        key: string = randomUUID(),
    ): Promise<Response> =>
        api(app)
            .post(`${API_PREFIX}/wallet/transfers`)
            .set("Authorization", `Bearer ${sender.accessToken}`)
            .set("Idempotency-Key", key)
            .send({ toUserId, amount });

    it("Loses no money when ten transfers race for the same balance", async () => {
        const [sender, ...recipients] = await registerMany(11, "racer");
        await deposit(app, sender.accessToken, "50.00");

        // получатели разные - чтобы гонка была только на строке отправителя
        const responses = await Promise.all(
            recipients.map((recipient) =>
                transferRequest(sender, recipient.userId, "10.00"),
            ),
        );

        const statuses = responses.map((response) => response.status);
        expect(statuses.filter((status) => status === 201)).toHaveLength(5);
        expect(statuses.filter((status) => status === 409)).toHaveLength(5);

        for (const rejected of responses.filter((r) => r.status === 409)) {
            expect((rejected.body as { code: string }).code).toBe(
                "INSUFFICIENT_FUNDS",
            );
        }

        await expect(getBalance(app, sender.accessToken)).resolves.toBe("0.00");
        await expect(countTransfers()).resolves.toBe(5);
        // деньги не появились и не исчезли, только переехали
        await expect(sumBalances()).resolves.toBe("50.00");
    });

    it("Survives cross transfers without a deadlock", async () => {
        const PAIRS = 10;
        const [alice, bob] = await registerMany(2, "crossing");
        await deposit(app, alice.accessToken, "100.00");
        await deposit(app, bob.accessToken, "100.00");

        // без сортировки в lockParticipants
        // они захватывали бы строки в противоположном порядке
        const responses = await Promise.all(
            Array.from({ length: PAIRS }, (_, index) => [
                transferRequest(alice, bob.userId, "1.00", `a2b-key-${index}`),
                transferRequest(bob, alice.userId, "1.00", `b2a-key-${index}`),
            ]).flat(),
        );

        // при дедлоке постгрес автоматически прерывает ожидание разблокировки
        // строки у одной из транзакций, и прерванная транзакция вернется
        // как 500 клиенту, поэтому смотрим статус, а не баланс
        expect(responses.map((response) => response.status)).toEqual(
            Array.from({ length: PAIRS * 2 }, () => 201),
        );

        await expect(sumBalances()).resolves.toBe("200.00");
        await expect(countTransfers()).resolves.toBe(PAIRS * 2);
        await expect(getBalance(app, alice.accessToken)).resolves.toBe(
            "100.00",
        );
    });

    it("Performs one transfer when the same key is sent five times at once", async () => {
        const [sender, recipient] = await registerMany(2, "retrier");
        await deposit(app, sender.accessToken, "100.00");

        const key = "concurrent-retry-key";

        const responses = await Promise.all(
            Array.from({ length: 5 }, () =>
                transferRequest(sender, recipient.userId, "30.00", key),
            ),
        );

        expect(responses.map((response) => response.status)).toEqual([
            201, 201, 201, 201, 201,
        ]);

        const ids = new Set(
            responses.map((response) => (response.body as { id: string }).id),
        );
        expect(ids.size).toBe(1);

        await expect(getBalance(app, sender.accessToken)).resolves.toBe(
            "70.00",
        );
        await expect(getBalance(app, recipient.accessToken)).resolves.toBe(
            "30.00",
        );
        await expect(countTransfers()).resolves.toBe(1);
        await expect(sumBalances()).resolves.toBe("100.00");
    });

    // симулируем, когда пользователь несколько раз нажал на кнопку пополнить
    it("Credits once when the same deposit key is sent five times at once", async () => {
        const [user] = await registerMany(1, "topper");
        const key = "concurrent-deposit-key";

        // один запрос успевает вставить ключ первым в таблицу
        // остальные блокируются на констрейнте уникальности ждут пока первая
        // транзакция либо закоммитится, либо откатится
        const responses = await Promise.all(
            Array.from({ length: 5 }, () =>
                api(app)
                    .post(`${API_PREFIX}/wallet/deposits`)
                    .set("Authorization", `Bearer ${user.accessToken}`)
                    .set("Idempotency-Key", key)
                    .send({ amount: "25.00" }),
            ),
        );

        expect(responses.map((response) => response.status)).toEqual([
            201, 201, 201, 201, 201,
        ]);

        await expect(getBalance(app, user.accessToken)).resolves.toBe("25.00");
        await expect(sumBalances()).resolves.toBe("25.00");
    });
});
