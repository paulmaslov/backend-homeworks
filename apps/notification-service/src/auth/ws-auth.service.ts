import { Injectable } from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import type { Socket } from "socket.io";

import { VerifiedJwtPayload } from "@libs/contracts";

import { WS_AUTH_ERROR_CODES } from "./auth.constants";
import { WsUnauthorizedError } from "./ws-unauthorized.error";

const BEARER_HEADER = /^Bearer\s+(\S+)$/i;

export interface AuthenticatedUser {
    userId: string;
    tokenExpiresAt: number;
}

@Injectable()
export class WsAuthService {
    constructor(private readonly jwtService: JwtService) {}

    authenticate(handshake: Socket["handshake"]): AuthenticatedUser {
        const token = this.extractToken(handshake);
        if (!token) {
            throw new WsUnauthorizedError(
                WS_AUTH_ERROR_CODES.TOKEN_INVALID,
                "Access token is required",
            );
        }

        let payload: VerifiedJwtPayload;
        try {
            payload = this.jwtService.verify<VerifiedJwtPayload>(token);
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new WsUnauthorizedError(
                    WS_AUTH_ERROR_CODES.TOKEN_EXPIRED,
                    "Access token has expired",
                );
            }
            throw new WsUnauthorizedError(
                WS_AUTH_ERROR_CODES.TOKEN_INVALID,
                "Access token is invalid",
            );
        }

        if (typeof payload.exp !== "number") {
            throw new WsUnauthorizedError(
                WS_AUTH_ERROR_CODES.TOKEN_INVALID,
                "Access token has no expiration",
            );
        }

        return { userId: payload.sub, tokenExpiresAt: payload.exp * 1000 };
    }

    // Токен берём из auth, а не из заголовка: браузерный websocket api не позволяет
    // задать заголовок, а auth передаётся внутри соединения и доступен любому клиенту.
    // Заголовок оставлен запасным путём для клиентов, которые умеют задавать только
    // заголовки (например, некоторые инструменты для ручного тестирования API).
    private extractToken(handshake: Socket["handshake"]): string | undefined {
        const fromAuth: unknown = handshake.auth.token;
        if (typeof fromAuth === "string" && fromAuth.length > 0) {
            return fromAuth;
        }

        return BEARER_HEADER.exec(handshake.headers.authorization ?? "")?.[1];
    }
}
