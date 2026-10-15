import { Inject, Injectable } from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";

import { JWT_ACCESS_ALGORITHM, VerifiedJwtPayload } from "@libs/contracts";

import { ACCESS_TOKEN_ERROR_CODES } from "./access-token.constants";
import { AccessTokenError } from "./access-token.error";
import {
    ACCESS_TOKEN_MODULE_OPTIONS,
    AccessTokenModuleOptions,
} from "./access-token.module-definition";

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
    constructor(
        private readonly jwtService: JwtService,
        @Inject(ACCESS_TOKEN_MODULE_OPTIONS)
        private readonly options: AccessTokenModuleOptions,
    ) {}

    verify(token: string | undefined): AuthenticatedUser {
        if (!token) {
            throw new AccessTokenError(
                ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
                "Access token is required",
            );
        }

        let payload: VerifiedJwtPayload;
        try {
            payload = this.jwtService.verify<VerifiedJwtPayload>(token, {
                publicKey: this.options.publicKey,
                algorithms: [JWT_ACCESS_ALGORITHM],
            });
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
