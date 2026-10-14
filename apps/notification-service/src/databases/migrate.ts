import "dotenv/config";

import appConfig from "@notification-service/configs/app.config";
import {
    createMigrator,
    createMongoClient,
} from "@notification-service/databases/migrator";

async function main(): Promise<void> {
    const config = appConfig().mongo;
    const client = createMongoClient(config);

    try {
        await createMigrator(client.db(config.dbName)).runAsCLI();
    } finally {
        await client.close();
    }
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
