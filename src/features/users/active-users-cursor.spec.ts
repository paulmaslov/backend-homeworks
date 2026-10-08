import { BadRequestException } from "@nestjs/common";

import { MAX_USER_AGE, MIN_USER_AGE } from "@/features/users/user.constants";

import {
    ActiveUsersCursor,
    decodeActiveUsersCursor,
    encodeActiveUsersCursor,
} from "./active-users-cursor";

const CURSOR: ActiveUsersCursor = {
    ageFrom: 20,
    ageTo: 30,
    age: 25,
    id: "00000000-0000-4000-8000-000000000000",
};

// произвольные base64 байты
const toBase64Url = (payload: string): string =>
    Buffer.from(payload).toString("base64url");

describe("activeUsersCursor", () => {
    it("Returns the same cursor after encode and decode", () => {
        const encoded = encodeActiveUsersCursor(CURSOR);

        expect(decodeActiveUsersCursor(encoded)).toEqual(CURSOR);
    });

    // курсор приходит от клиента, поэтому в bind должны уйти только age и id
    it("Keeps only age and id, dropping anything else", () => {
        const raw = toBase64Url(JSON.stringify({ ...CURSOR, evil: "1=1" }));

        expect(decodeActiveUsersCursor(raw)).toEqual(CURSOR);
    });

    it.each([
        { reason: "not a base64url string", raw: "not-a-cursor" },
        { reason: "an empty string", raw: "" },
        {
            reason: "a json without the expected fields",
            raw: toBase64Url('{"foo":1}'),
        },
        {
            reason: "a json primitive instead of an object",
            raw: toBase64Url("5"),
        },
        {
            reason: "an age out of the allowed range",
            raw: toBase64Url(
                JSON.stringify({ ...CURSOR, age: MIN_USER_AGE - 1 }),
            ),
        },
        {
            reason: "an id that is not a uuid",
            raw: toBase64Url(JSON.stringify({ ...CURSOR, id: "abc" })),
        },
        {
            reason: "a json without the range it was issued for",
            raw: toBase64Url(JSON.stringify({ age: 25, id: CURSOR.id })),
        },
        {
            reason: "a range boundary out of the allowed values",
            raw: toBase64Url(
                JSON.stringify({ ...CURSOR, ageTo: MAX_USER_AGE + 1 }),
            ),
        },
    ])("Throws when the cursor is $reason", ({ raw }) => {
        expect(() => decodeActiveUsersCursor(raw)).toThrow(BadRequestException);
    });
});
