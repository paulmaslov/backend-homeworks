import * as Joi from "joi";

export const envValidationSchema = Joi.object({
    // app
    NOTIFICATION_PORT: Joi.number().default(3001),
    NODE_ENV: Joi.string()
        .valid("development", "production", "test")
        .default("development"),

    // logging
    LOG_LEVEL: Joi.string()
        .valid("trace", "debug", "info", "warn", "error", "fatal", "silent")
        .default("info"),
    LOG_PRETTY: Joi.boolean().default(false),
});
