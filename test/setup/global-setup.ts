import * as AWS from "@aws-sdk/client-s3";
import { MinioContainer, StartedMinioContainer } from "@testcontainers/minio";
import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

import { createMigrator, createSequelize } from "@/databases/migrator";

import {
    RATE_LIMIT_PERIOD,
    RATE_LIMIT_REQUESTS,
    S3_BUCKET,
    S3_REGION,
} from "./env-defaults";

declare global {
    var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer | undefined;
    var __MINIO_CONTAINER__: StartedMinioContainer | undefined;
}

const POSTGRES_IMAGE = "postgres:16-alpine";
const MINIO_IMAGE = "minio/minio";

// политика как в compose :
const buildPublicReadPolicy = (bucket: string): string =>
    JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "PublicReadAvatars",
                Effect: "Allow",
                Principal: { AWS: ["*"] },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${bucket}/*`],
            },
        ],
    });

async function startPostgres(): Promise<void> {
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

    console.log(
        `[e2e] Postgres is ready: ${container.getHost()}:${container.getPort()}`,
    );
}

async function startMinio(): Promise<void> {
    console.log("[e2e] Starting minio container...");

    const container = await new MinioContainer(MINIO_IMAGE).start();

    globalThis.__MINIO_CONTAINER__ = container;

    const endpoint = container.getConnectionUrl();

    process.env.S3_ENDPOINT = endpoint;
    process.env.S3_REGION = S3_REGION;
    process.env.S3_ACCESS_KEY_ID = container.getUsername();
    process.env.S3_SECRET_ACCESS_KEY = container.getPassword();
    process.env.S3_BUCKET = S3_BUCKET;
    process.env.S3_PUBLIC_URL = `${endpoint}/${S3_BUCKET}`;

    const s3 = new AWS.S3({
        endpoint,
        region: S3_REGION,
        forcePathStyle: true,
        credentials: {
            accessKeyId: container.getUsername(),
            secretAccessKey: container.getPassword(),
        },
    });

    await s3.createBucket({ Bucket: S3_BUCKET });
    await s3.putBucketPolicy({
        Bucket: S3_BUCKET,
        Policy: buildPublicReadPolicy(S3_BUCKET),
    });

    console.log(`[e2e] MinIO is ready: ${endpoint}, bucket "${S3_BUCKET}"`);
}

export default async function globalSetup(): Promise<void> {
    process.env.NODE_ENV = "test";
    process.env.PORT = "3001";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    // большой лимит, чтобы тесты не триггерили рейт лимитер
    process.env.RATE_LIMIT_REQUESTS = RATE_LIMIT_REQUESTS;
    process.env.RATE_LIMIT_PERIOD = RATE_LIMIT_PERIOD;
    process.env.JWT_ACCESS_SECRET = "test_access_secret";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";

    await Promise.all([startPostgres(), startMinio()]);

    const sequelize = createSequelize();
    try {
        await createMigrator(sequelize).up();
    } finally {
        await sequelize.close();
    }
    console.log("[e2e] Migrations applied");
}
