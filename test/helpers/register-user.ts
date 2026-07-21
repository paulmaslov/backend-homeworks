import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { buildUser, UserOverrides } from "./build-user";
import { getCookies } from "./get-cookies";

export interface RegisteredUser {
    accessToken: string;
    refreshCookie: string;
}

export async function registerUser(
    app: INestApplication,
    overrides: UserOverrides = {},
): Promise<RegisteredUser> {
    const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(buildUser(overrides))
        .expect(201);

    const body = response.body as { accessToken: string };

    const refreshCookie =
        getCookies(response).find((c) => c.startsWith("refreshToken=")) ?? "";

    return { accessToken: body.accessToken, refreshCookie };
}