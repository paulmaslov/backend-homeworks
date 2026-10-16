import { BadRequestException } from "@nestjs/common";
import { isISO8601, isMongoId } from "class-validator";

export interface NotificationCursor {
    readonly createdAt: string;
    readonly id: string;
}

export function encodeNotificationCursor(cursor: NotificationCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeNotificationCursor(raw: string): NotificationCursor {
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

    const { createdAt, id } = parsed as Record<string, unknown>;

    if (
        typeof createdAt !== "string" ||
        !isISO8601(createdAt, { strict: true }) ||
        typeof id !== "string" ||
        !isMongoId(id)
    ) {
        throw new BadRequestException("Invalid cursor");
    }

    return { createdAt, id };
}
