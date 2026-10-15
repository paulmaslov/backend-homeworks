// TOKEN_EXPIRED - обновить токен через /auth/refresh и переподключиться,
// TOKEN_INVALID - не переподключаться, ошибка не лечится новым токеном
export const ACCESS_TOKEN_ERROR_CODES = {
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    TOKEN_INVALID: "TOKEN_INVALID",
} as const;

export type AccessTokenErrorCode =
    (typeof ACCESS_TOKEN_ERROR_CODES)[keyof typeof ACCESS_TOKEN_ERROR_CODES];
