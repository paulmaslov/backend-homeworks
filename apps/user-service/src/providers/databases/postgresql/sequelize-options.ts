import { Options } from "sequelize";

export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    logging: boolean;
}

export function buildSequelizeOptions(
    config: DatabaseConfig,
    logQuery?: (sql: string, durationMs?: number) => void,
): Options {
    return {
        dialect: "postgres",
        host: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        database: config.name,
        benchmark: Boolean(logQuery),
        logging: logQuery ?? false,
    };
}
