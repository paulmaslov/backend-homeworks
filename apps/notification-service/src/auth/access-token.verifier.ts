import { Injectable } from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";

import { VerifiedJwtPayload } from "@libs/contracts";

import { AccessTokenError } from "./access-token.error";
import { ACCESS_TOKEN_ERROR_CODES } from "./auth.constants";

const BEARER_HEADER = /^Bearer\s+(\S+)$/i;

export interface AuthenticatedUser {
    userId: string;
    tokenExpiresAt: number;
}

export function extractBearerToken(
    authorization: string | undefined,
): string | undefined {
    return BEARER_HEADER.exec(authorization ?? "")?.[1];
}

// проверка access-токена - общая для подключения по websocket и http-запросов
@Injectable()
export class AccessTokenVerifier {
    constructor(private readonly jwtService: JwtService) {}

    verify(token: string | undefined): AuthenticatedUser {
        if (!token) {
            throw new AccessTokenError(
                ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
                "Access token is required",
            );
        }

        let payload: VerifiedJwtPayload;
        try {
            payload = this.jwtService.verify<VerifiedJwtPayload>(token);
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new AccessTokenError(
                    ACCESS_TOKEN_ERROR_CODES.TOKEN_EXPIRED,
                    "Access token has expired",
                );
            }
            throw new AccessTokenError(
                ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
                "Access token is invalid",
            );
        }

        if (typeof payload.exp !== "number") {
            throw new AccessTokenError(
                ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
                "Access token has no expiration",
            );
        }

        return { userId: payload.sub, tokenExpiresAt: payload.exp * 1000 };
    }
}
