import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { RATE_LIMIT_PERIOD, RATE_LIMIT_REQUESTS } from "./env-defaults";

declare global {
    var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

const POSTGRES_IMAGE = "postgres:16-alpine";

export default async function globalSetup(): Promise<void> {
    console.log("[e2e] Starting postgresql container...");

    const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
        .withDatabase("test_db")
        .withUsername("test_user")
        .withPassword("test_password")
        .start();

    // чтобы globalTeardown мог его положить
    globalThis.__POSTGRES_CONTAINER__ = container;

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getPort());
    process.env.DB_USER = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();
    process.env.DB_LOGGING = "false";

    process.env.NODE_ENV = "test";
    process.env.PORT = "3001";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    // большой лимит, чтобы тесты не триггерили рейт лимитер
    process.env.RATE_LIMIT_REQUESTS = RATE_LIMIT_REQUESTS;
    process.env.RATE_LIMIT_PERIOD = RATE_LIMIT_PERIOD;
    process.env.JWT_ACCESS_SECRET = "test_access_secret";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

    console.log(
        `[e2e] Postgres is ready: ${container.getHost()}:${container.getPort()}`,
    );
}
