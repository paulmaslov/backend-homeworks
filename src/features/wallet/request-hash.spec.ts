import { WALLET_ENDPOINTS } from "@/features/wallet/wallet.constants";

import { buildRequestHash, normalizeAmount } from "./request-hash";

const TO_USER_ID = "00000000-0000-4000-8000-000000000000";
const OTHER_USER_ID = "11111111-1111-4111-8111-111111111111";

describe("normalizeAmount", () => {
    it.each([
        { raw: "100", expected: "100.00" },
        { raw: "100.5", expected: "100.50" },
        { raw: "100.00", expected: "100.00" },
        { raw: "0100.00", expected: "100.00" },
        { raw: "0", expected: "0.00" },
        { raw: "000", expected: "0.00" },
    ])("Turns $raw into $expected", ({ raw, expected }) => {
        expect(normalizeAmount(raw)).toBe(expected);
    });
});

describe("buildRequestHash", () => {
    const hashOf = (amount: string, toUserId = TO_USER_ID): string =>
        buildRequestHash(WALLET_ENDPOINTS.TRANSFERS, amount, toUserId);

    // одна и та же сумма, просто записанная по разному
    it.each([
        { amount: "100" },
        { amount: "100.0" },
        { amount: "100.00" },
        { amount: "0100.00" },
    ])("Gives the canonical hash for $amount", ({ amount }) => {
        expect(hashOf(amount)).toBe(hashOf("100.00"));
    });

    it("Differs when the amount differs", () => {
        expect(hashOf("100.00")).not.toBe(hashOf("100.01"));
    });

    it("Differs when the recipient differs", () => {
        expect(hashOf("100.00")).not.toBe(hashOf("100.00", OTHER_USER_ID));
    });

    // одни и те же параметры на /deposits и /transfers - разные хеши
    it("Differs between endpoints", () => {
        expect(
            buildRequestHash(WALLET_ENDPOINTS.TRANSFERS, "100.00", null),
        ).not.toBe(buildRequestHash(WALLET_ENDPOINTS.DEPOSITS, "100.00", null));
    });
});
