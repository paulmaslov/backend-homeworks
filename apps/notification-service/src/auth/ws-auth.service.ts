import { Injectable } from "@nestjs/common";
import type { Socket } from "socket.io";

import {
    AccessTokenVerifier,
    AuthenticatedUser,
    extractBearerToken,
} from "./access-token.verifier";

@Injectable()
export class WsAuthService {
    constructor(private readonly verifier: AccessTokenVerifier) {}

    authenticate(handshake: Socket["handshake"]): AuthenticatedUser {
        return this.verifier.verify(this.extractToken(handshake));
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

        return extractBearerToken(handshake.headers.authorization);
    }
}
