import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";

import {
    buildSequelizeOptions,
    DatabaseConfig,
} from "@/providers/databases/postgresql/sequelize-options";

@Module({
    imports: [
        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const database = config.getOrThrow<DatabaseConfig>("database");
                const logger = new Logger("Sequelize");

                return {
                    ...buildSequelizeOptions(
                        database,
                        database.logging
                            ? (sql, durationMs) =>
                                  logger.debug({ sql, durationMs }, "query")
                            : undefined,
                    ),
                    autoLoadModels: true,
                    synchronize: false,
                };
            },
        }),
    ],
})
export class PostgresqlModule {}
