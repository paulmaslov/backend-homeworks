import { AccessTokenErrorCode } from "./access-token.constants";

// access-токен не прошел проверку. socket.io передает клиенту в connect_error
// поля message и data этой ошибки, http-guard кладет code в тело ответа 401
export class AccessTokenError extends Error {
    readonly data: { code: AccessTokenErrorCode };

    constructor(code: AccessTokenErrorCode, message: string) {
        super(message);
        this.name = AccessTokenError.name;
        this.data = { code };
    }
}
