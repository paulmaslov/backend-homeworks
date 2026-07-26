import { BadRequestException } from "@nestjs/common";

export class UploadException extends BadRequestException {
    constructor(message?: string) {
        super(`${message || "Something went wrong"}`);
    }
}
