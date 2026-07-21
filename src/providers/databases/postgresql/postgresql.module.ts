import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports: [
        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                // console.log('DB config:', {
                //     host: config.get('database.host'),
                //     port: config.get('database.port'),
                //     user: config.get('database.user'),
                //     name: config.get('database.name'),
                // });
                return {
                    dialect: "postgres",
                    host: config.get<string>("database.host"),
                    port: config.get<number>("database.port"),
                    username: config.get<string>("database.user"),
                    password: config.get<string>("database.password"),
                    database: config.get<string>("database.name"),
                    logging: config.get<boolean>("database.logging")
                        ? console.log
                        : false,
                    autoLoadModels: true,
                    synchronize: true,
                };
            },
        }),
    ],
})
export class PostgresqlModule {}
