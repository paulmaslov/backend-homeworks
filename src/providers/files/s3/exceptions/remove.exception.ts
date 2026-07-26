import { BadRequestException } from "@nestjs/common";

export class RemoveException extends BadRequestException {
    constructor(message?: string) {
        super(`${message || "Something went wrong"}`);
    }
}
