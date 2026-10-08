import * as path from "node:path";

import { Sequelize } from "sequelize";
import { MigrationFn, SequelizeStorage, Umzug } from "umzug";

import appConfig from "@/configs/app.config";
import { MigrationContext } from "@/databases/migration.context";
import { buildSequelizeOptions } from "@/providers/databases/postgresql/sequelize-options";

// чтобы работало и локально (запуск через ts-node) с .ts файлами
// и в прод сборке с .js файлами
const EXTENSION = path.extname(__filename);
const MIGRATIONS_FOLDER = path.join(__dirname, "migrations");
const MIGRATIONS_GLOB = path
    .join(MIGRATIONS_FOLDER, `*${EXTENSION}`)
    .replace(/\\/g, "/");

interface MigrationModule {
    up: MigrationFn<MigrationContext>;
    down: MigrationFn<MigrationContext>;
}

export function createSequelize(): Sequelize {
    return new Sequelize({
        ...buildSequelizeOptions(appConfig().database),
        // umzug и так логирует каждую примененную миграцию
        logging: false,
    });
}

export function createMigrator(sequelize: Sequelize): Umzug<object> {
    return new Umzug({
        migrations: {
            glob: MIGRATIONS_GLOB,

            // каждая миграция выполняется в собственной транзакции, чтобы
            // упавшие миграции не оставляли схему в промежуточном состоянии
            resolve: ({ name, path: filepath }) => {
                if (!filepath) {
                    throw new Error(`Migration file not found for "${name}"`);
                }

                const run = async (direction: "up" | "down"): Promise<void> => {
                    const migration = (await import(
                        filepath
                    )) as MigrationModule;

                    await sequelize.transaction(async (transaction) => {
                        await migration[direction]({
                            name,
                            path: filepath,
                            context: {
                                queryInterface: sequelize.getQueryInterface(),
                                transaction,
                            },
                        });
                    });
                };

                return {
                    name,
                    up: () => run("up"),
                    down: () => run("down"),
                };
            },
        },
        storage: new SequelizeStorage({ sequelize }),
        logger: console,
        create: { folder: MIGRATIONS_FOLDER },
    });
}
