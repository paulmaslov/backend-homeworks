import { randomUUID } from "node:crypto";

import { ConfigService } from "@nestjs/config";
import { Params } from "nestjs-pino";
import { SerializedRequest, SerializedResponse } from "pino";

const DOCS_PATH = "/api/v1/docs";

// не выносить в отдельный модуль — приложение не запустится: LoggerModule
// раздаёт логгеры один раз, когда все остальные модули уже подключены
export function buildLoggerOptions(config: ConfigService): Params {
    return {
        pinoHttp: {
            level: config.getOrThrow<string>("logging.level"),

            formatters: {
                level: (label: string) => ({ level: label }),
            },

            base: { env: config.getOrThrow<string>("nodeEnv") },

            // сквозной id - берём из заголовка, если пришёл от nginx,
            // иначе генерим свой и возвращаем клиенту
            genReqId: (req, res) => {
                const incoming = req.headers["x-request-id"];
                const id =
                    typeof incoming === "string" && incoming.length > 0
                        ? incoming
                        : randomUUID();
                res.setHeader("X-Request-Id", id);
                return id;
            },

            // заголовки целиком не пишем из-за authorization и cookies
            serializers: {
                req: (req: SerializedRequest) => ({
                    id: req.id,
                    method: req.method,
                    url: req.url,
                }),
                res: (res: SerializedResponse) => ({
                    statusCode: res.statusCode,
                }),
            },

            // жестко исключаем чувствительную информацию, чтобы при
            // изменении вайтлиста | логировании конкретных сущностей
            // в сервисах - она не попала в логи
            redact: {
                paths: [
                    "req.headers.authorization",
                    "req.headers.cookie",
                    'res.headers["set-cookie"]',
                    "password",
                    "*.password",
                    "accessToken",
                    "*.accessToken",
                    "refreshToken",
                    "*.refreshToken",
                ],
                censor: "[REDACTED]",
            },

            customProps: (req) => ({
                userId: (req as { user?: { userId: string } }).user?.userId,
            }),

            // исключаем swagger из логов
            autoLogging: {
                ignore: (req) => req.url?.startsWith(DOCS_PATH) ?? false,
            },

            transport: config.getOrThrow<boolean>("logging.pretty")
                ? {
                      target: "pino-pretty",
                      options: {
                          colorize: true,
                          translateTime: "SYS:HH:MM:ss.l",
                          ignore: "pid,hostname",
                      },
                  }
                : undefined,
        },
    };
}
