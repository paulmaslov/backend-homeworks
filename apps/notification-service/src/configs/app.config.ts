// настройки базы данных отдельно, чтобы мигратору хватало переменных базы данных.
// весь конфиг падает без лишних для миграций переменных
export const mongoConfig = () => ({
    host: process.env.MONGO_HOST as string,
    port: parseInt(process.env.MONGO_PORT as string, 10),
    user: process.env.MONGO_USER as string,
    password: process.env.MONGO_PASSWORD as string,
    dbName: process.env.MONGO_DB as string,
});

export default () => ({
    port: parseInt(process.env.NOTIFICATION_PORT as string, 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    jwt: {
        accessPublicKey: process.env.JWT_ACCESS_PUBLIC_KEY as string,
    },
    kafka: {
        brokers: (process.env.KAFKA_BROKERS as string)
            .split(",")
            .map((broker) => broker.trim()),
    },
    mongo: mongoConfig(),
    logging: {
        level: process.env.LOG_LEVEL as string,
        pretty: process.env.LOG_PRETTY === "true",
    },
});
