import { createPublicKey } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { JWT_ACCESS_ALGORITHM, JwtPayload } from "@libs/common";

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // приватный ключ для генерации токена, он есть только у user-service
            secretOrKey: createPublicKey(
                config.getOrThrow<string>("jwt.accessPrivateKey"),
            ).export({ type: "spki", format: "pem" }),
            algorithms: [JWT_ACCESS_ALGORITHM],
        });
    }

    validate(payload: JwtPayload): {
        userId: string;
    } {
        return {
            userId: payload.sub,
        };
    }
}
