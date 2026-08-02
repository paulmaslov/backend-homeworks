import "dotenv/config";

import { createMigrator, createSequelize } from "@/databases/migrator";

async function main(): Promise<void> {
    const sequelize = createSequelize();

    try {
        await createMigrator(sequelize).runAsCLI();
    } finally {
        await sequelize.close();
    }
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
