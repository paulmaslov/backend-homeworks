import "reflect-metadata";

import {
    ArgumentMetadata,
    BadRequestException,
    ValidationPipe,
} from "@nestjs/common";

import { CreateUserDto } from "./create-user.dto";

describe("CreateUserDto validation", () => {
    const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    });
    const meta: ArgumentMetadata = { type: "body", metatype: CreateUserDto };

    const valid = {
        login: "john",
        email: "john@example.com",
        password: "strongPass1",
        age: 25,
    };

    describe("Negative tests", () => {
        it("Rejects a login shorter than 3 chars", async () => {
            await expect(
                pipe.transform({ ...valid, login: "jo" }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects an invalid email", async () => {
            await expect(
                pipe.transform({ ...valid, email: "not-an-email" }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects a password shorter than 8 chars", async () => {
            await expect(
                pipe.transform({ ...valid, password: "short" }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects age below 14", async () => {
            await expect(
                pipe.transform({ ...valid, age: 10 }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects age above 140", async () => {
            await expect(
                pipe.transform({ ...valid, age: 200 }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects unknown properties", async () => {
            await expect(
                pipe.transform({ ...valid, role: "admin" }, meta),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("Positive tests", () => {
        it("Passes a valid payload", async () => {
            await expect(pipe.transform(valid, meta)).resolves.toBeDefined();
        });

        it("Normalizes the email (trim + lowercase)", async () => {
            const result = (await pipe.transform(
                { ...valid, email: "  JOHN@Example.COM  " },
                meta,
            )) as CreateUserDto;

            expect(result.email).toBe("john@example.com");
        });
    });
});
