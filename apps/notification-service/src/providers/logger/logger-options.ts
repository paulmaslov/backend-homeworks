import { ConfigService } from "@nestjs/config";
import { Params } from "nestjs-pino";

import { buildLoggerParams, SWAGGER_PATH } from "@libs/common";

export function buildLoggerOptions(config: ConfigService): Params {
    return buildLoggerParams(
        {
            level: config.getOrThrow<string>("logging.level"),
            pretty: config.getOrThrow<boolean>("logging.pretty"),
            env: config.getOrThrow<string>("nodeEnv"),
        },
        {
            // исключаем swagger из логов
            autoLogging: {
                ignore: (req) =>
                    req.url?.startsWith(`/${SWAGGER_PATH}`) ?? false,
            },
        },
    );
}
