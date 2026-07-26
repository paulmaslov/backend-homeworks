import * as AWS from "@aws-sdk/client-s3";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { S3Lib } from "./constants/do-spaces-service-lib.constant";
import { S3Service } from "./s3.service";

@Module({
    imports: [ConfigModule],
    providers: [
        S3Service,
        {
            provide: S3Lib,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                return new AWS.S3({
                    endpoint: config.getOrThrow<string>("s3.endpoint"),
                    region: config.getOrThrow<string>("s3.region"),
                    forcePathStyle: true,
                    credentials: {
                        accessKeyId:
                            config.getOrThrow<string>("s3.accessKeyId"),
                        secretAccessKey:
                            config.getOrThrow<string>("s3.secretAccessKey"),
                    },
                });
            },
        },
    ],
    exports: [S3Service, S3Lib],
})
export class S3Module {}
