import { BadRequestException } from "@nestjs/common";
import { isUUID } from "class-validator";

import { MAX_USER_AGE, MIN_USER_AGE } from "@/features/users/user.constants";

// курсор несёт не только позицию, но и границы выборки, из которой он выдан:
// иначе клиент продолжит чужой запрос - он получит неверную страницу
export interface ActiveUsersCursor {
    readonly ageFrom: number;
    readonly ageTo: number;
    readonly age: number;
    readonly id: string;
}

function isAge(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= MIN_USER_AGE &&
        value <= MAX_USER_AGE
    );
}

export function encodeActiveUsersCursor(cursor: ActiveUsersCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeActiveUsersCursor(raw: string): ActiveUsersCursor {
    let parsed: unknown;

    try {
        parsed = JSON.parse(
            Buffer.from(raw, "base64url").toString("utf-8"),
        ) as unknown;
    } catch {
        throw new BadRequestException("Invalid cursor");
    }

    if (typeof parsed !== "object" || parsed === null) {
        throw new BadRequestException("Invalid cursor");
    }

    const { ageFrom, ageTo, age, id } = parsed as Record<string, unknown>;

    if (
        !isAge(ageFrom) ||
        !isAge(ageTo) ||
        !isAge(age) ||
        typeof id !== "string" ||
        !isUUID(id)
    ) {
        throw new BadRequestException("Invalid cursor");
    }

    return { ageFrom, ageTo, age, id };
}
