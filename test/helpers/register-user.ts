import { INestApplication } from "@nestjs/common";

import { AccessTokenResponseDto } from "@/auth/dto/access-token-response.dto";

import { api, API_PREFIX } from "./api";
import { buildUser, UserOverrides } from "./build-user";
import { getRefreshCookie } from "./get-cookies";

export interface RegisteredUser {
    accessToken: string;
    refreshCookie: string;
}

export async function registerUser(
    app: INestApplication,
    overrides: UserOverrides = {},
): Promise<RegisteredUser> {
    const response = await api(app)
        .post(`${API_PREFIX}/auth/register`)
        .send(buildUser(overrides))
        .expect(201);

    const { accessToken } = response.body as AccessTokenResponseDto;

    const refreshCookie = getRefreshCookie(response) ?? "";

    return { accessToken, refreshCookie };
}
