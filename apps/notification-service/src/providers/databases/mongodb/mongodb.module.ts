import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

export interface MongoConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
}

const SERVER_SELECTION_TIMEOUT_MS = 5_000;

@Module({
    imports: [
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const mongo = config.getOrThrow<MongoConfig>("mongo");
                const logger = new Logger("MongoDB");

                return {
                    uri: `mongodb://${mongo.host}:${mongo.port}`,
                    dbName: mongo.dbName,
                    auth: { username: mongo.user, password: mongo.password },
                    authSource: "admin",
                    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
                    onConnectionCreate: (connection) => {
                        connection.on("connected", () =>
                            logger.log("Connected"),
                        );
                        connection.on("disconnected", () =>
                            logger.warn("Disconnected"),
                        );
                    },
                };
            },
        }),
    ],
})
export class MongodbModule {}
