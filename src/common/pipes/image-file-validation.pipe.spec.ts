import {
    BadRequestException,
    PayloadTooLargeException,
    UnsupportedMediaTypeException,
} from "@nestjs/common";

import { ImageFileValidationPipe } from "@/common/pipes/image-file-validation.pipe";
import { generateFileMock } from "@/providers/files/testing/generate-file-mock";

describe("ImageFileValidationPipe", () => {
    const MAX_SIZE = 1024 * 1024;

    const pipe = new ImageFileValidationPipe({
        maxSizeBytes: MAX_SIZE,
        mimeTypes: ["image/jpeg", "image/png"],
    });

    it("Returns the file when it is valid", () => {
        const file = generateFileMock();

        expect(pipe.transform(file as Express.Multer.File)).toBe(file);
    });

    it("Throws when no file was sent", () => {
        expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
    });

    it("Throws when the file is too large", () => {
        const file = generateFileMock({ size: MAX_SIZE + 1 });

        expect(() => pipe.transform(file as Express.Multer.File)).toThrow(
            PayloadTooLargeException,
        );
    });

    it("Throws when the mime type is not allowed", () => {
        const file = generateFileMock({ mimetype: "application/pdf" });

        expect(() => pipe.transform(file as Express.Multer.File)).toThrow(
            UnsupportedMediaTypeException,
        );
    });

    it("Throws when the content does not match the declared mime type", () => {
        // mime указан как png а на деле там произвольные байты
        const file = generateFileMock({
            buffer: Buffer.from("this is not an image"),
        });

        expect(() => pipe.transform(file as Express.Multer.File)).toThrow(
            UnsupportedMediaTypeException,
        );
    });

    it("Throws when the file is shorter than the signature", () => {
        const file = generateFileMock({ buffer: Buffer.from([0x89, 0x50]) });

        expect(() => pipe.transform(file as Express.Multer.File)).toThrow(
            UnsupportedMediaTypeException,
        );
    });
});
