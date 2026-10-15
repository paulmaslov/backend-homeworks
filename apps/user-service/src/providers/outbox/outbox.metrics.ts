import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Counter, Gauge, register } from "@prometheus-io/client";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

import {
    IOutboxRepository,
    OutboxStats,
} from "@user-service/providers/outbox/outbox.repository.interface";

export const outboxEventsPublished = new Counter({
    name: "outbox_events_published_total",
    help: "Number of outbox events published to Kafka",
});

export const outboxPublishErrors = new Counter({
    name: "outbox_publish_errors_total",
    help: "Number of outbox relay iterations that failed to publish events",
});

export const outboxRelayLastPoll = new Gauge({
    name: "outbox_relay_last_poll_timestamp_seconds",
    help: "Unix time of the last outbox relay iteration",
});

// предел для подсчета очереди
const MAX_PENDING_EVENTS_TO_COUNT = 10_000;

// меньше таймаута опроса prometheus (10с по умолчанию), чтобы зависшая база
// не задерживала ответ /metrics
const STATS_TIMEOUT_MS = 1_000;

const STATS_METRICS = {
    PENDING: "outbox_pending_events",
    OLDEST_AGE: "outbox_oldest_pending_event_age_seconds",
    UP: "outbox_stats_up",
} as const;

// метрики очереди считаются sql запросом к базе в момент опроса /metrics.
// ошибки ловим внутри collect чтобы не упал бы весь ответ /metrics. при ошибке
// возвращаем прошлые значения, о сбое говорит outbox_stats_up = 0. метрики
// создаются вместе с модулем и снимаются при остановке, тк им нужен репозиторий
@Injectable()
export class OutboxMetrics implements OnModuleInit, OnModuleDestroy {
    private inflight?: Promise<OutboxStats>;

    constructor(
        private readonly outboxRepository: IOutboxRepository,
        @InjectPinoLogger(OutboxMetrics.name)
        private readonly logger: PinoLogger,
    ) {}

    onModuleInit(): void {
        const readStats = (): Promise<OutboxStats> => this.readStats();
        const logger = this.logger;

        new Gauge({
            name: STATS_METRICS.PENDING,
            help: `Number of outbox events waiting to be published, capped at ${MAX_PENDING_EVENTS_TO_COUNT}`,
            async collect() {
                try {
                    this.set((await readStats()).pending);
                } catch {
                    // о сбое говорит outbox_stats_up
                }
            },
        });

        new Gauge({
            name: STATS_METRICS.OLDEST_AGE,
            help: "Age of the oldest outbox event waiting to be published",
            async collect() {
                try {
                    this.set((await readStats()).oldestAgeSeconds);
                } catch {
                    // о сбое говорит outbox_stats_up
                }
            },
        });

        new Gauge({
            name: STATS_METRICS.UP,
            help: "Whether the last outbox stats query succeeded: 1 - yes, 0 - no",
            async collect() {
                try {
                    await readStats();
                    this.set(1);
                } catch (error) {
                    logger.warn({ err: error }, "Failed to read outbox stats");
                    this.set(0);
                }
            },
        });
    }

    onModuleDestroy(): void {
        for (const name of Object.values(STATS_METRICS)) {
            register.removeSingleMetric(name);
        }
    }

    private readStats(): Promise<OutboxStats> {
        this.inflight ??= this.outboxRepository
            .getStats(MAX_PENDING_EVENTS_TO_COUNT)
            .finally(() => {
                this.inflight = undefined;
            });

        return withTimeout(this.inflight, STATS_TIMEOUT_MS);
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Outbox stats query timed out after ${ms} ms`));
        }, ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
