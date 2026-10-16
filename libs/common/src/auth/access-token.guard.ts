import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { AccessTokenError } from "./access-token.error";
import {
    AccessTokenVerifier,
    extractBearerToken,
} from "./access-token.verifier";
import { CurrentUserData } from "./current-user.interface";

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(private readonly verifier: AccessTokenVerifier) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context
            .switchToHttp()
            .getRequest<Request & { user?: CurrentUserData }>();

        try {
            const { userId } = this.verifier.verify(
                extractBearerToken(request.headers.authorization),
            );
            request.user = { userId };
            return true;
        } catch (error) {
            if (error instanceof AccessTokenError) {
                throw new UnauthorizedException({
                    message: error.message,
                    code: error.data.code,
                });
            }
            throw error;
        }
    }
}
