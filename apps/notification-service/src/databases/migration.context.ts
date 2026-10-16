import type { mongo } from "mongoose";

export interface MigrationContext {
    db: mongo.Db;
}
