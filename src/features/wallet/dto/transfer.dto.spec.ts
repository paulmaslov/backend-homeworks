import "reflect-metadata";

import {
    ArgumentMetadata,
    BadRequestException,
    ValidationPipe,
} from "@nestjs/common";

import { TransferDto } from "./transfer.dto";

describe("TransferDto validation", () => {
    const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    });
    const meta: ArgumentMetadata = { type: "body", metatype: TransferDto };

    const valid = {
        toUserId: "00000000-0000-4000-8000-000000000000",
        amount: "100.00",
    };

    describe("Negative tests", () => {
        it.each([
            { reason: "zero", amount: "0" },
            { reason: "zero with fraction", amount: "0.00" },
            { reason: "three fraction digits", amount: "1.005" },
            { reason: "exponential notation", amount: "1e3" },
            { reason: "negative", amount: "-1.00" },
            { reason: "13 integer digits", amount: "1000000000000" },
            { reason: "a number instead of a string", amount: 100 },
            { reason: "an empty string", amount: "" },
        ])("Rejects an amount that is $reason", async ({ amount }) => {
            await expect(
                pipe.transform({ ...valid, amount }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects a toUserId that is not a uuid", async () => {
            await expect(
                pipe.transform({ ...valid, toUserId: "abc" }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        // отправитель всегда читается из jwt токена
        it("Rejects unknown properties", async () => {
            await expect(
                pipe.transform({ ...valid, fromUserId: valid.toUserId }, meta),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("Positive tests", () => {
        it.each([
            { amount: "100.00" },
            { amount: "100" },
            { amount: "0.01" },
            { amount: "999999999999.99" },
        ])("Passes an amount of $amount", async ({ amount }) => {
            await expect(
                pipe.transform({ ...valid, amount }, meta),
            ).resolves.toBeDefined();
        });
    });
});
