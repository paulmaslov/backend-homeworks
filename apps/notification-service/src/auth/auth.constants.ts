// TOKEN_EXPIRED - обновить токен через /auth/refresh и переподключиться,
// TOKEN_INVALID - не переподключаться, ошибка не лечится новым токеном
export const WS_AUTH_ERROR_CODES = {
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    TOKEN_INVALID: "TOKEN_INVALID",
} as const;

export type WsAuthErrorCode =
    (typeof WS_AUTH_ERROR_CODES)[keyof typeof WS_AUTH_ERROR_CODES];
