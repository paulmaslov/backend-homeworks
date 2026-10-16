import { setTimeout as delay } from "node:timers/promises";

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { mongo } from "mongoose";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

const RETRY_DELAY_MS = 5_000;

const KAFKA_HEARTBEAT_INTERVAL_MS = 3_000;

export function isMongoUnavailable(error: unknown): boolean {
    return (
        error instanceof mongo.MongoServerSelectionError ||
        error instanceof mongo.MongoNetworkError
    );
}

// Ошибка, которая выбрасывается в момент, когда сервис падает / останавливается
// и при этом мы ждали обработку сообщения, из-за неработающей монги
export class MongoWaitAbortedError extends Error {
    constructor() {
        super("Service is stopping, stopped waiting for MongoDB");
        this.name = MongoWaitAbortedError.name;
    }
}

@Injectable()
export class MongoRetry implements OnModuleDestroy {
    private readonly shutdown = new AbortController();

    constructor(
        @InjectPinoLogger(MongoRetry.name)
        private readonly logger: PinoLogger,
    ) {}

    // отправляем хартбиты кафке раз в HEARTBEAT_INTERVAL_MS миллисекунд,
    // чтобы консюмер не исключили из группы
    // и пытаемся сохранить сообщения в монгу и отправить уведомления клиенту
    async whileUnavailable<T>(
        fn: () => Promise<T>,
        keepAlive: () => Promise<void>,
    ): Promise<T> {
        const heartbeat = setInterval(() => {
            keepAlive().catch((error: unknown) => {
                this.logger.warn({ err: error }, "Heartbeat failed");
            });
        }, KAFKA_HEARTBEAT_INTERVAL_MS);

        try {
            return await this.retry(fn);
        } finally {
            clearInterval(heartbeat);
        }
    }

    onModuleDestroy(): void {
        this.shutdown.abort();
    }

    private async retry<T>(fn: () => Promise<T>): Promise<T> {
        for (let attempt = 1; ; attempt += 1) {
            try {
                return await this.unlessStopped(fn());
            } catch (error) {
                if (!isMongoUnavailable(error)) {
                    throw error;
                }

                this.logger.warn(
                    { err: error, attempt, retryInMs: RETRY_DELAY_MS },
                    "MongoDB is unavailable, retrying",
                );

                await this.unlessStopped(
                    delay(RETRY_DELAY_MS, undefined, {
                        signal: this.shutdown.signal,
                    }),
                );
            }
        }
    }

    // обертка над ожиданием (запрос к монге или пауза между попытками), чтобы при
    // остановке сервиса не ждать ответа лежащей монги или конца паузы
    private unlessStopped<T>(promise: Promise<T>): Promise<T> {
        const { signal } = this.shutdown;

        return new Promise<T>((resolve, reject) => {
            const abort = (): void => reject(new MongoWaitAbortedError());

            if (signal.aborted) {
                abort();
                return;
            }

            signal.addEventListener("abort", abort, { once: true });
            promise
                .then(resolve, reject)
                .finally(() => signal.removeEventListener("abort", abort));
        });
    }
}
