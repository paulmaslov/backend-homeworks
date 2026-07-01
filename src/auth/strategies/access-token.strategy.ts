import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("jwt.accessSecret"),
        });
    }

    validate(payload: JwtPayload): {
        userId: string;
        login: string;
        email: string;
    } {
        return {
            userId: payload.sub,
            login: payload.login,
            email: payload.email,
        };
    }
}
