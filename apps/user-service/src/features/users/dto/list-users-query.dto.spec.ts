import "reflect-metadata";

import {
    ArgumentMetadata,
    BadRequestException,
    ValidationPipe,
} from "@nestjs/common";

import { ListUsersQueryDto } from "./list-users-query.dto";

describe("ListUsersQueryDto validation", () => {
    const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    });
    const meta: ArgumentMetadata = {
        type: "query",
        metatype: ListUsersQueryDto,
    };

    describe("Negative tests", () => {
        it("Rejects a limit above 100", async () => {
            await expect(
                pipe.transform({ limit: "101" }, meta),
            ).rejects.toThrow(BadRequestException);
        });

        it("Rejects a page below 1", async () => {
            await expect(pipe.transform({ page: "0" }, meta)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("Rejects a non-integer page", async () => {
            await expect(pipe.transform({ page: "abc" }, meta)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("Positive tests", () => {
        it("Applies defaults when no params are given", async () => {
            const result = (await pipe.transform(
                {},
                meta,
            )) as ListUsersQueryDto;

            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
        });

        it("Coerces string query params to numbers", async () => {
            const result = (await pipe.transform(
                { page: "2", limit: "50" },
                meta,
            )) as ListUsersQueryDto;

            expect(result.page).toBe(2);
            expect(result.limit).toBe(50);
        });
    });
});
