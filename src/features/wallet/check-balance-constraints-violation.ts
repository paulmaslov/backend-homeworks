import { ConflictException } from "@nestjs/common";
import { DatabaseError } from "sequelize";

import { WALLET_ERROR_CODES } from "@/features/wallet/wallet.constants";

// код pg, который приходит при нарушении check
const CHECK_VIOLATION = "23514";

export function rethrowCheckViolation(error: unknown): never {
    if (error instanceof DatabaseError) {
        const parent = error.parent as
            { code?: string; constraint?: string } | undefined;

        if (parent?.code === CHECK_VIOLATION) {
            if (parent.constraint === "users_balance_max") {
                throw new ConflictException({
                    code: WALLET_ERROR_CODES.BALANCE_LIMIT_EXCEEDED,
                    message: "Balance limit exceeded",
                });
            }

            // недостижимо, пока в debit работает WHERE balance >= amount.
            // если сработало - значит схема поймала баг в коде, и в таблице
            // все равно не окажется отрицательного баланса
            if (parent.constraint === "users_balance_non_negative") {
                throw new ConflictException({
                    code: WALLET_ERROR_CODES.INSUFFICIENT_FUNDS,
                    message: "Insufficient funds",
                });
            }
        }
    }

    throw error;
}
