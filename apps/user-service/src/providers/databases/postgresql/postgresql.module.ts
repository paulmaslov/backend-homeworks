import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";

import {
    buildSequelizeOptions,
    DatabaseConfig,
} from "@user-service/providers/databases/postgresql/sequelize-options";

// запрос дольше этого postgres отменяет сам. долгих запросов у сервиса нет,
// а зависший держал бы соединение из пула и блокировки строк
const STATEMENT_TIMEOUT_MS = 30_000;

// если база не отвечает совсем на нашей стороне перестаем ждать ответ
const QUERY_TIMEOUT_MS = 35_000;

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
                    dialectOptions: {
                        statement_timeout: STATEMENT_TIMEOUT_MS,
                        query_timeout: QUERY_TIMEOUT_MS,
                    },
                    autoLoadModels: true,
                    synchronize: false,
                };
            },
        }),
    ],
})
export class PostgresqlModule {}
