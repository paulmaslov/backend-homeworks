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
});
