import { Response } from "supertest";
import { REFRESH_COOKIE } from "@/auth/auth.constants";

export function getRefreshCookie(response: Response): string | undefined {
    return getCookies(response).find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
}

export function getCookies(response: Response): string[] {
    const raw: unknown = response.headers["set-cookie"];

    if (Array.isArray(raw)) {
        return raw as string[];
    }

    return typeof raw === "string" ? [raw] : [];
}
