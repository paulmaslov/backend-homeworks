// 12 цифр до точки и 2 цифры после
export const AMOUNT_FORMAT = /^\d{1,12}(\.\d{1,2})?$/;

// пропускаем 0, тк зачислять / переводить 0 - это лишняя операция
export const AMOUNT_NON_ZERO = /[1-9]/;

export const WALLET_ERROR_CODES = {
    ACCOUNT_DELETED: "ACCOUNT_DELETED",
    BALANCE_LIMIT_EXCEEDED: "BALANCE_LIMIT_EXCEEDED",
    SELF_TRANSFER_FORBIDDEN: "SELF_TRANSFER_FORBIDDEN",
    RECIPIENT_NOT_FOUND: "RECIPIENT_NOT_FOUND",
    INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
    IDEMPOTENCY_KEY_REQUIRED: "IDEMPOTENCY_KEY_REQUIRED",
    IDEMPOTENCY_KEY_REUSED: "IDEMPOTENCY_KEY_REUSED",
} as const;

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
export const IDEMPOTENCY_REPLAYED_HEADER = "Idempotency-Replayed";

// формат не навязываем - это забота клиента, ограничиваем только длину
export const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

// один и тот же ключ на /deposits и /transfers - две разные операции
export const WALLET_ENDPOINTS = {
    DEPOSITS: "deposits",
    TRANSFERS: "transfers",
} as const;

export type WalletEndpoint =
    (typeof WALLET_ENDPOINTS)[keyof typeof WALLET_ENDPOINTS];
