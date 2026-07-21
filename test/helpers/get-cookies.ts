import {Response} from "supertest";

export function getCookies(response: Response): string[] {
    const raw: unknown = response.headers["set-cookie"];

    if (Array.isArray(raw)) {
        return raw as string[];
    }

    return typeof raw === "string" ? [raw] : [];
}