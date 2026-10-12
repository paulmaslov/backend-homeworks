export default () => ({
    port: parseInt(process.env.NOTIFICATION_PORT as string, 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    jwt: {
        accessPublicKey: process.env.JWT_ACCESS_PUBLIC_KEY as string,
    },
    logging: {
        level: process.env.LOG_LEVEL as string,
        pretty: process.env.LOG_PRETTY === "true",
    },
});
