import {
    BadRequestException,
    createParamDecorator,
    ExecutionContext,
} from "@nestjs/common";
import { Request } from "express";

import {
    IDEMPOTENCY_KEY_HEADER,
    MAX_IDEMPOTENCY_KEY_LENGTH,
    MIN_IDEMPOTENCY_KEY_LENGTH,
    WALLET_ERROR_CODES,
} from "@/features/wallet/wallet.constants";

export const IdempotencyKeyHeader = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const raw = request.headers[IDEMPOTENCY_KEY_HEADER];
        const key = typeof raw === "string" ? raw.trim() : "";

        if (
            key.length < MIN_IDEMPOTENCY_KEY_LENGTH ||
            key.length > MAX_IDEMPOTENCY_KEY_LENGTH
        ) {
            throw new BadRequestException({
                code: WALLET_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
                message: `Idempotency-Key header is required and must be ${MIN_IDEMPOTENCY_KEY_LENGTH}-${MAX_IDEMPOTENCY_KEY_LENGTH} characters long`,
            });
        }

        return key;
    },
);
