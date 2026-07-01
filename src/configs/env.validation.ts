import * as Joi from "joi";

export const envValidationSchema = Joi.object({
    // app
    PORT: Joi.number().default(3000),

    // database
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),

    // jwt
    JWT_ACCESS_SECRET: Joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
    REFRESH_TOKEN_EXPIRES_IN: Joi.string().default("7d"),
});
