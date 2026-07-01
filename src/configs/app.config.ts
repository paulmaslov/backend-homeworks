export default () => ({
    port: parseInt(process.env.PORT as string, 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    isProduction: process.env.NODE_ENV === "production",
    cors: {
        origin: process.env.CORS_ORIGIN as string,
    },
    database: {
        host: process.env.DB_HOST as string,
        port: parseInt(process.env.DB_PORT as string, 10),
        user: process.env.DB_USER as string,
        password: process.env.DB_PASSWORD as string,
        name: process.env.DB_NAME as string,
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET as string,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN as string,
        refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN as string,
    },
});
