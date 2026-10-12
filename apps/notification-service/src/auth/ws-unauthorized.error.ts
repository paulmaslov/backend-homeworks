import { WsAuthErrorCode } from "./auth.constants";

// socket.io передаёт клиенту в connect_error поля message и data этой ошибки
export class WsUnauthorizedError extends Error {
    readonly data: { code: WsAuthErrorCode };

    constructor(code: WsAuthErrorCode, message: string) {
        super(message);
        this.name = WsUnauthorizedError.name;
        this.data = { code };
    }
}
