import ms, { StringValue } from "ms";

export default () => ({
    port: parseInt(process.env.PORT as string, 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    isProduction: process.env.NODE_ENV === "production",
    cors: {
        origin: process.env.CORS_ORIGIN as string,
    },
    rateLimit: {
        requests: parseInt(process.env.RATE_LIMIT_REQUESTS as string, 10),
        periodMs: ms(process.env.RATE_LIMIT_PERIOD as StringValue),
    },
    database: {
        host: process.env.DB_HOST as string,
        port: parseInt(process.env.DB_PORT as string, 10),
        user: process.env.DB_USER as string,
        password: process.env.DB_PASSWORD as string,
        name: process.env.DB_NAME as string,
        logging: process.env.DB_LOGGING === "true",
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET as string,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN as string,
        refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN as string,
    },
    s3: {
        endpoint: process.env.S3_ENDPOINT as string,
        region: process.env.S3_REGION as string,
        accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
        bucket: process.env.S3_BUCKET as string,
        publicUrl: process.env.S3_PUBLIC_URL as string,
    },
    redis: {
        host: process.env.REDIS_HOST as string,
        port: parseInt(process.env.REDIS_PORT as string, 10),
        password: process.env.REDIS_PASSWORD as string,
    },
    cache: {
        userTtlMs: ms(process.env.USERS_CACHE_TTL as StringValue),
    },
    wallet: {
        idempotencyTtlMs: ms(process.env.IDEMPOTENCY_KEY_TTL as StringValue),
    },
});
