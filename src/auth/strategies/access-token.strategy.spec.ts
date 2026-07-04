import { ConfigService } from "@nestjs/config";
import { AccessTokenStrategy } from "./access-token.strategy";

describe("AccessTokenStrategy", () => {
    it("✅ maps the JWT payload to the current user (userId from sub)", () => {
        const config = {
            getOrThrow: jest.fn().mockReturnValue("access-secret"),
        } as unknown as ConfigService;

        const strategy = new AccessTokenStrategy(config);

        expect(strategy.validate({ sub: "user-1" })).toEqual({
            userId: "user-1",
        });
    });
});
