import { createPublicKey } from "node:crypto";

import * as Joi from "joi";

const rsaPublicKey = (value: string): string => {
    if (value.includes("PRIVATE KEY")) {
        throw new Error("must be a public key, got a private one");
    }
    if (createPublicKey(value).asymmetricKeyType !== "rsa") {
        throw new Error("must be an RSA public key");
    }
    return value;
};

export const envValidationSchema = Joi.object({
    // app
    NOTIFICATION_PORT: Joi.number().default(3001),
    NODE_ENV: Joi.string()
        .valid("development", "production", "test")
        .default("development"),

    // jwt
    JWT_ACCESS_PUBLIC_KEY: Joi.string().required().custom(rsaPublicKey),

    // logging
    LOG_LEVEL: Joi.string()
        .valid("trace", "debug", "info", "warn", "error", "fatal", "silent")
        .default("info"),
    LOG_PRETTY: Joi.boolean().default(false),
});
