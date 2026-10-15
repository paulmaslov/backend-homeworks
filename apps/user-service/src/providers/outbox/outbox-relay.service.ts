import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
    OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ClientKafkaProxy } from "@nestjs/microservices";
import { KafkaJSProtocolError } from "kafkajs";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { lastValueFrom, timeout } from "rxjs";

import { KAFKA_CLIENT } from "@user-service/providers/kafka/kafka.constants";
import {
    outboxEventsPublished,
    outboxPublishErrors,
    outboxRelayLastPoll,
} from "@user-service/providers/outbox/outbox.metrics";
import {
    ClaimedOutboxEvent,
    IOutboxRepository,
} from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxSignal } from "@user-service/providers/outbox/outbox.signal";

const LEASE_MS = 30_000;

const PUBLISH_TIMEOUT_MS = 10_000;

const MAX_BACKOFF_MS = 30_000;

// сколько раз брокер может отказать событию, прежде чем мы его отложим.
// пауза между попытками растет от 1 с до 5 мин, все попытки занимают около часа
const MAX_ATTEMPTS = 20;
const FIRST_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

interface RejectedEvent {
    event: ClaimedOutboxEvent;
    error: unknown;
}

@Injectable()
export class OutboxRelayService
    implements OnApplicationBootstrap, OnModuleDestroy
{
    private readonly enabled: boolean;
    private readonly pollIntervalMs: number;
    private readonly batchSize: number;

    private running = false;
    private loop?: Promise<void>;
    private stopBackoff?: () => void;

    constructor(
        private readonly outboxRepository: IOutboxRepository,
        private readonly signal: OutboxSignal,
        @Inject(KAFKA_CLIENT) private readonly kafka: ClientKafkaProxy,
        config: ConfigService,

        @InjectPinoLogger(OutboxRelayService.name)
        private readonly logger: PinoLogger,
    ) {
        this.enabled = config.getOrThrow<boolean>("outbox.relayEnabled");
        this.pollIntervalMs = config.getOrThrow<number>(
            "outbox.pollIntervalMs",
        );
        this.batchSize = config.getOrThrow<number>("outbox.batchSize");
    }

    onApplicationBootstrap(): void {
        if (!this.enabled) {
            this.logger.warn("Outbox relay is disabled");
            return;
        }

        this.running = true;
        this.loop = this.run();
        this.logger.info(
            { pollIntervalMs: this.pollIntervalMs, batchSize: this.batchSize },
            "Outbox relay started",
        );
    }

    // не onApplicationShutdown, тк там уже закрываются kafka и бд, а relay должен
    // успеть удалить отправленное и снять аренду с остального до этого
    async onModuleDestroy(): Promise<void> {
        if (!this.running) {
            return;
        }

        this.running = false;
        this.signal.notify();
        this.stopBackoff?.();
        await this.loop;

        this.logger.info("Outbox relay stopped");
    }

    private async run(): Promise<void> {
        let failures = 0;

        while (this.running) {
            outboxRelayLastPoll.setToCurrentTime();
            try {
                const claimed = await this.publishBatch();

                if (failures > 0) {
                    this.logger.info({ failures }, "Outbox relay recovered");
                    failures = 0;
                }

                // взяли из аутбокса меньше, чем размер батча, значит свободных сообщений
                // больше нет, ждем до колла о новом событии или до таймаута.
                const outboxDrained = claimed < this.batchSize;
                if (outboxDrained && this.running) {
                    await this.signal.wait(this.pollIntervalMs);
                }
            } catch (error) {
                outboxPublishErrors.inc();
                failures += 1;
                const delayMs = Math.min(
                    this.pollIntervalMs * 2 ** failures,
                    MAX_BACKOFF_MS,
                );

                this.logger.warn(
                    { err: error, failures, retryInMs: delayMs },
                    "Outbox relay failed to publish events",
                );

                // новые сообщения не сокращают бэкофф, иначе каждый перевод
                // запускал бы еще одну попытку достучаться до лежащей kafka
                if (this.running) {
                    await this.backoff(delayMs);
                }
            }
        }
    }

    // возвращает количество арендованных событий
    private async publishBatch(): Promise<number> {
        const leaseDeadline = Date.now() + LEASE_MS;
        const events = await this.outboxRepository.claim({
            limit: this.batchSize,
            leaseMs: LEASE_MS,
        });
        const published = new Set<string>();
        const rejected: RejectedEvent[] = [];

        try {
            // события публикуются в кафку в том порядке, в котором они лежат в аутбоксе
            for (const event of events) {
                // не начинаем отправку, которая может не успеть до конца аренды
                if (
                    !this.running ||
                    Date.now() + PUBLISH_TIMEOUT_MS > leaseDeadline
                ) {
                    break;
                }

                try {
                    await this.publish(event);
                    published.add(event.id);
                } catch (error) {
                    // брокер не ответил - недоступна kafka, а не это событие.
                    // прерываем пачку, повторит следующая итерация после паузы
                    if (!isRejectedByBroker(error)) {
                        throw error;
                    }

                    // брокер ответил отказом - kafka работает, дело в самом событии.
                    // откладываем его и отправляем остальные
                    rejected.push({ event, error });
                }
            }
        } finally {
            outboxEventsPublished.inc(published.size);
            await this.outboxRepository.deletePublished([...published]);
            await this.retryRejected(rejected);

            const handled = new Set([
                ...published,
                ...rejected.map(({ event }) => event.id),
            ]);
            await this.outboxRepository.release(
                events
                    .map((event) => event.id)
                    .filter((id) => !handled.has(id)),
            );
        }

        if (published.size > 0) {
            this.logger.debug(
                { count: published.size },
                "Outbox events published",
            );
        }

        return events.length;
    }

    private async publish(event: ClaimedOutboxEvent): Promise<void> {
        await lastValueFrom(
            this.kafka
                .emit(event.topic, {
                    key: event.key,
                    value: event.payload,
                    headers: event.headers,
                })
                .pipe(timeout(PUBLISH_TIMEOUT_MS)),
        );
    }

    // событию, от которого отказался брокер, засчитываем попытку и назначаем
    // следующую с растущей паузой. после MAX_ATTEMPTS откладываем насовсем:
    // такое событие должен будет вручную разобрать человек
    private async retryRejected(rejected: RejectedEvent[]): Promise<void> {
        for (const { event, error } of rejected) {
            const attempts = event.attempts + 1;
            const lastError =
                error instanceof Error ? error.message : String(error);
            const context = {
                err: error,
                eventId: event.id,
                topic: event.topic,
                attempts,
            };

            if (attempts >= MAX_ATTEMPTS) {
                await this.outboxRepository.markFailed({
                    id: event.id,
                    attempts,
                    lastError,
                });
                this.logger.error(
                    context,
                    "Outbox event set aside after repeated rejections",
                );
                continue;
            }

            const retryInMs = Math.min(
                FIRST_RETRY_DELAY_MS * 2 ** (attempts - 1),
                MAX_RETRY_DELAY_MS,
            );
            await this.outboxRepository.scheduleRetry({
                id: event.id,
                attempts,
                lastError,
                retryInMs,
            });
            this.logger.warn(
                { ...context, retryInMs },
                "Outbox event rejected by Kafka, retrying later",
            );
        }
    }

    private backoff(ms: number): Promise<void> {
        return new Promise((resolve) => {
            const timer = setTimeout(resolve, ms);

            this.stopBackoff = () => {
                clearTimeout(timer);
                resolve();
            };
        });
    }
}

// true, если кафка ответила отказом (нужного топика не существует,
// либо проблема с сообщением)
function isRejectedByBroker(error: unknown): boolean {
    let current: unknown = error;

    while (current instanceof Error) {
        if (current instanceof KafkaJSProtocolError) {
            return true;
        }
        current = current.cause;
    }

    return false;
}
