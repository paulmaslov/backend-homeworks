import { randomUUID } from "node:crypto";

import { Params } from "nestjs-pino";
import { SerializedRequest, SerializedResponse } from "pino";
import { Options } from "pino-http";

export interface LoggerSettings {
    level: string;
    pretty: boolean;
    env: string;
}

export function buildLoggerParams(
    settings: LoggerSettings,
    overrides: Options = {},
): Params {
    return {
        pinoHttp: {
            level: settings.level,

            formatters: {
                level: (label: string) => ({ level: label }),
            },

            base: { env: settings.env },

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

            transport: settings.pretty
                ? {
                      target: "pino-pretty",
                      options: {
                          colorize: true,
                          translateTime: "SYS:HH:MM:ss.l",
                          ignore: "pid,hostname",
                      },
                  }
                : undefined,

            ...overrides,
        },
    };
}
