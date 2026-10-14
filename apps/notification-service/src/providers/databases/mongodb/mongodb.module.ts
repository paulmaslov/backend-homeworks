import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

import {
    buildMongoClientOptions,
    buildMongoUri,
    MongoConfig,
} from "@notification-service/providers/databases/mongodb/mongo-options";

@Module({
    imports: [
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const mongo = config.getOrThrow<MongoConfig>("mongo");
                const logger = new Logger("MongoDB");

                return {
                    uri: buildMongoUri(mongo),
                    dbName: mongo.dbName,
                    ...buildMongoClientOptions(mongo),
                    // индексы создают миграции, а не mongoose при старте
                    autoIndex: false,
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
