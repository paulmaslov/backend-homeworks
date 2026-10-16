import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types";

import { NotificationsPageResponseDto } from "@notification-service/features/notification/dto/notification-response.dto";

import { signAccessToken } from "./tokens";

export const api = (app: INestApplication) =>
    request(app.getHttpServer() as App);

export const API_PREFIX = "/api/v1";

interface HistoryQuery {
    limit?: number;
    cursor?: string;
}

export async function getHistory(
    app: INestApplication,
    userId: string,
    query: HistoryQuery = {},
): Promise<NotificationsPageResponseDto> {
    const response = await api(app)
        .get(`${API_PREFIX}/notifications`)
        .query(query)
        .auth(signAccessToken(userId), { type: "bearer" })
        .expect(200);

    return response.body as NotificationsPageResponseDto;
}
