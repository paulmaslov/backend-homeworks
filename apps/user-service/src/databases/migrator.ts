import * as path from "node:path";

import { Sequelize } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";

import { databaseConfig } from "@user-service/configs/app.config";
import { MigrationContext } from "@user-service/databases/migration.context";
import { buildSequelizeOptions } from "@user-service/providers/databases/postgresql/sequelize-options";

// чтобы работало и локально (запуск через ts-node) с .ts файлами
// и в прод сборке с .js файлами
const EXTENSION = path.extname(__filename);
const MIGRATIONS_FOLDER = path.join(__dirname, "migrations");
const MIGRATIONS_GLOB = path
    .join(MIGRATIONS_FOLDER, `*${EXTENSION}`)
    .replace(/\\/g, "/");

export function createSequelize(): Sequelize {
    return new Sequelize({
        ...buildSequelizeOptions(databaseConfig()),
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
            resolve: (params) => {
                const name = params.name.replace(/\.js$/, ".ts");

                const migration = Umzug.defaultResolver(params);

                const run = async (direction: "up" | "down"): Promise<void> => {
                    await sequelize.transaction(async (transaction) => {
                        const context: MigrationContext = {
                            queryInterface: sequelize.getQueryInterface(),
                            transaction,
                        };

                        await migration[direction]?.({
                            name,
                            path: params.path,
                            context,
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
