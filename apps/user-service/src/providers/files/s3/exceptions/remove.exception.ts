import { ServiceUnavailableException } from "@nestjs/common";

// сбой хранилища - не вина клиента, поэтому 5xx
// причина остается для логов и не уходит в ответ
export class RemoveException extends ServiceUnavailableException {
    constructor(readonly reason?: string) {
        super("File storage is temporarily unavailable");
    }
}
