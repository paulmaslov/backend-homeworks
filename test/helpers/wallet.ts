import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";

import { BalanceResponseDto } from "@/features/wallet/dto/balance-response.dto";

import { api, API_PREFIX } from "./api";
import { UserOverrides } from "./build-user";
import { registerUser } from "./register-user";

export interface WalletUser {
    accessToken: string;
    userId: string;
}

// возвращаем не только токен, но и айдишник пользователя из токена
export async function registerWithId(
    app: INestApplication,
    overrides: UserOverrides = {},
): Promise<WalletUser> {
    const { accessToken } = await registerUser(app, overrides);

    const response = await api(app)
        .get(`${API_PREFIX}/users/me`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

    return { accessToken, userId: (response.body as { id: string }).id };
}

export async function deposit(
    app: INestApplication,
    accessToken: string,
    amount: string,
): Promise<void> {
    await api(app)
        .post(`${API_PREFIX}/wallet/deposits`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", randomUUID())
        .send({ amount })
        .expect(201);
}

export async function getBalance(
    app: INestApplication,
    accessToken: string,
): Promise<string> {
    const response = await api(app)
        .get(`${API_PREFIX}/wallet/balance`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

    return (response.body as BalanceResponseDto).balance;
}
