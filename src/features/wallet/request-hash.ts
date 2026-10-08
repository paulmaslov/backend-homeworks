import { createHash } from "node:crypto";

import { WalletEndpoint } from "@/features/wallet/wallet.constants";

// важно нормализовать параметры, т.к. 100 и 100.00 это одна и та же сумма
export function normalizeAmount(raw: string): string {
    const [whole, fraction = ""] = raw.split(".");

    // ведущие нули срезаем, но не последний: "000" должно остаться "0"
    const normalizedWhole = whole.replace(/^0+(?=\d)/, "");

    return `${normalizedWhole}.${fraction.padEnd(2, "0")}`;
}

export function buildRequestHash(
    endpoint: WalletEndpoint,
    amount: string,
    toUserId: string | null,
): string {
    return createHash("sha256")
        .update(`${endpoint}|${toUserId ?? ""}|${normalizeAmount(amount)}`)
        .digest("hex");
}
