import * as path from "node:path";

import { mongo } from "mongoose";
import { MongoDBStorage, Umzug } from "umzug";

import { MigrationContext } from "@notification-service/databases/migration.context";
import {
    buildMongoClientOptions,
    buildMongoUri,
    MongoConfig,
} from "@notification-service/providers/databases/mongodb/mongo-options";

const EXTENSION = path.extname(__filename);
const MIGRATIONS_FOLDER = path.join(__dirname, "migrations");
const MIGRATIONS_GLOB = path
    .join(MIGRATIONS_FOLDER, `*${EXTENSION}`)
    .replace(/\\/g, "/");

export function createMongoClient(config: MongoConfig): mongo.MongoClient {
    return new mongo.MongoClient(
        buildMongoUri(config),
        buildMongoClientOptions(config),
    );
}

export function createMigrator(db: mongo.Db): Umzug<MigrationContext> {
    return new Umzug({
        migrations: {
            glob: MIGRATIONS_GLOB,
            // в бд всегда пишем одинаковое название миграции, чтобы правильно
            // отслеживать примененные миграции
            resolve: (params) => ({
                ...Umzug.defaultResolver(params),
                name: params.name.replace(/\.js$/, ".ts"),
            }),
        },
        context: { db },
        storage: new MongoDBStorage({ connection: db }),
        logger: console,
        create: { folder: MIGRATIONS_FOLDER },
    });
}
