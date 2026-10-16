import ms, { StringValue } from "ms";

// настройки базы данных отдельно, чтобы мигратору хватало переменных базы данных.
// весь конфиг падает без лишних для миграций переменных
export const databaseConfig = () => ({
    host: process.env.DB_HOST as string,
    port: parseInt(process.env.DB_PORT as string, 10),
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    name: process.env.DB_NAME as string,
    logging: process.env.DB_LOGGING === "true",
});

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
    database: databaseConfig(),
    jwt: {
        accessPrivateKey: process.env.JWT_ACCESS_PRIVATE_KEY as string,
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
    balanceReset: {
        scheduleEnabled: process.env.BALANCE_RESET_ENABLED === "true",
        intervalMs: ms(process.env.BALANCE_RESET_INTERVAL as StringValue),
        batchSize: parseInt(process.env.BALANCE_RESET_BATCH_SIZE as string, 10),
        dedupTtlMs: ms(process.env.BALANCE_RESET_DEDUP_TTL as StringValue),
    },
    kafka: {
        brokers: (process.env.KAFKA_BROKERS as string)
            .split(",")
            .map((broker) => broker.trim()),
    },
    outbox: {
        relayEnabled: process.env.OUTBOX_RELAY_ENABLED === "true",
        pollIntervalMs: ms(process.env.OUTBOX_POLL_INTERVAL as StringValue),
        batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE as string, 10),
    },
    logging: {
        level: process.env.LOG_LEVEL as string,
        pretty: process.env.LOG_PRETTY === "true",
    },
});
