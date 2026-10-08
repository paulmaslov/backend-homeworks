import * as Joi from "joi";

export const envValidationSchema = Joi.object({
    // app
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string()
        .valid("development", "production", "test")
        .default("development"),
    CORS_ORIGIN: Joi.string().default("http://localhost:5173"),

    // rate limit
    RATE_LIMIT_PERIOD: Joi.string().default("1m"),
    RATE_LIMIT_REQUESTS: Joi.number().default(10),

    // database
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_LOGGING: Joi.boolean().default(true),

    // jwt
    JWT_ACCESS_SECRET: Joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
    REFRESH_TOKEN_EXPIRES_IN: Joi.string().default("7d"),

    // s3
    S3_ENDPOINT: Joi.string().uri().required(),
    S3_REGION: Joi.string().required(),
    S3_ACCESS_KEY_ID: Joi.string().required(),
    S3_SECRET_ACCESS_KEY: Joi.string().required(),
    S3_BUCKET: Joi.string().required(),
    S3_PUBLIC_URL: Joi.string().uri().required(),

    // redis
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().required(),

    // cache
    USERS_CACHE_TTL: Joi.string().default("30s"),

    // wallet
    IDEMPOTENCY_KEY_TTL: Joi.string()
        .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
        .default("24h"),

    // balance reset
    BALANCE_RESET_ENABLED: Joi.boolean().default(true),
    BALANCE_RESET_INTERVAL: Joi.string()
        .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
        .default("10m"),
    BALANCE_RESET_BATCH_SIZE: Joi.number().min(1).default(1000),
    BALANCE_RESET_DEDUP_TTL: Joi.string()
        .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
        .default("5m"),

    // logging
    LOG_LEVEL: Joi.string()
        .valid("trace", "debug", "info", "warn", "error", "fatal", "silent")
        .default("info"),
    LOG_PRETTY: Joi.boolean().default(false),
});
