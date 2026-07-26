import { Module } from "@nestjs/common";
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
                return {
                    ...buildSequelizeOptions(
                        config.getOrThrow<DatabaseConfig>("database"),
                    ),
                    autoLoadModels: true,
                    synchronize: false,
                };
            },
        }),
    ],
})
export class PostgresqlModule {}
