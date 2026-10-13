import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
    OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientKafkaProxy } from "@nestjs/microservices";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { lastValueFrom, timeout } from "rxjs";

import { KAFKA_CLIENT } from "@user-service/providers/kafka/kafka.constants";
import { IOutboxRepository } from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxSignal } from "@user-service/providers/outbox/outbox.signal";

const LEASE_MS = 30_000;

const PUBLISH_TIMEOUT_MS = 10_000;

const MAX_BACKOFF_MS = 30_000;

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

                await lastValueFrom(
                    this.kafka
                        .emit(event.topic, {
                            key: event.key,
                            value: event.payload,
                            headers: event.headers,
                        })
                        .pipe(timeout(PUBLISH_TIMEOUT_MS)),
                );
                published.add(event.id);
            }
        } finally {
            await this.outboxRepository.deletePublished([...published]);
            await this.outboxRepository.release(
                events
                    .map((event) => event.id)
                    .filter((id) => !published.has(id)),
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
