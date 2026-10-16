import { JwtService } from "@nestjs/jwt";

import { JWT_ACCESS_ALGORITHM, JwtPayload } from "@libs/contracts";

const DEFAULT_EXPIRES_IN_SECONDS = 15 * 60;

const jwt = new JwtService();

interface SignOptions {
    expiresInSeconds?: number;
    privateKey?: string;
}

// в тестах токены подписываем сами вместо user-service
export function signAccessToken(
    userId: string,
    {
        expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS,
        privateKey = process.env.E2E_JWT_PRIVATE_KEY,
    }: SignOptions = {},
): string {
    const payload: JwtPayload = { sub: userId };

    return jwt.sign(payload, {
        privateKey,
        algorithm: JWT_ACCESS_ALGORITHM,
        expiresIn: expiresInSeconds,
    });
}
