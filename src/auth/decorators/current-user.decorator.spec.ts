import "reflect-metadata";

import { ExecutionContext } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";

import { CurrentUser } from "./current-user.decorator";

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

// достаем функцию (data, ctx) => ..., которую использовали в декораторе из метаданных
const getFactory = (): ParamFactory => {
    // мок контроллера для теста
    class Probe {
        run(@CurrentUser() user: unknown): unknown {
            return user;
        }
    }

    const meta = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        Probe,
        "run",
    ) as Record<string, { factory: ParamFactory }>;

    return meta[Object.keys(meta)[0]].factory;
};

// мок ExecutionContext
const makeCtx = (user: unknown): ExecutionContext =>
    ({
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

describe("CurrentUser decorator", () => {
    const factory = getFactory();
    const user = { userId: "user-1", login: "john" };

    it("✅ returns the whole user when no field is requested", () => {
        expect(factory(undefined, makeCtx(user))).toEqual(user);
    });

    it("✅ returns a single field when a key is requested", () => {
        expect(factory("userId", makeCtx(user))).toBe("user-1");
    });
});
