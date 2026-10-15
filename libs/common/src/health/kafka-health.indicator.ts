import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
    OnModuleDestroy,
} from "@nestjs/common";
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from "@nestjs/terminus";
import { Admin, Kafka, logLevel } from "kafkajs";

import {
    KAFKA_HEALTH_MODULE_OPTIONS,
    type KafkaHealthModuleOptions,
} from "./kafka-health.module-definition";

const CHECK_INTERVAL_MS = 10_000;

const REQUEST_TIMEOUT_MS = 3_000;

interface KafkaState {
    available: boolean;
    checkedAt?: string;
    message?: string;
}

// если кафка упадет, то наше приложение продолжает принимать запросы, но деградирует
// сообщения об уведомлениях сохраняются в аутбоксе. Перезапуском кафки
// занимается окрежение (кубернетис)
@Injectable()
export class KafkaHealthIndicator
    implements OnApplicationBootstrap, OnModuleDestroy
{
    private readonly admin: Admin;
    private state: KafkaState = {
        available: false,
        message: "Not checked yet",
    };
    private timer?: NodeJS.Timeout;
    private stopped = false;

    constructor(
        private readonly indicators: HealthIndicatorService,
        @Inject(KAFKA_HEALTH_MODULE_OPTIONS) options: KafkaHealthModuleOptions,
    ) {
        this.admin = new Kafka({
            clientId: options.clientId,
            brokers: options.brokers,
            requestTimeout: REQUEST_TIMEOUT_MS,
            // одна попытка, отключаем дефолтные ретраи у kafkajs
            retry: { retries: 0 },
            // в логи не включаем потому что причина видна в ответе read
            logLevel: logLevel.NOTHING,
        }).admin();
    }

    onApplicationBootstrap(): void {
        void this.refresh();
    }

    async onModuleDestroy(): Promise<void> {
        this.stopped = true;
        clearTimeout(this.timer);
        await this.admin.disconnect();
    }

    check(key: string): HealthIndicatorResult {
        const { available, ...details } = this.state;
        const indicator = this.indicators.check(key);

        return available ? indicator.up(details) : indicator.degraded(details);
    }

    private async refresh(): Promise<void> {
        try {
            // если подключение уже открыто, connect ничего не делает
            await this.admin.connect();
            await this.admin.describeCluster();
            this.state = {
                available: true,
                checkedAt: new Date().toISOString(),
            };
        } catch (error) {
            this.state = {
                available: false,
                checkedAt: new Date().toISOString(),
                message: error instanceof Error ? error.message : String(error),
            };
        }

        if (!this.stopped) {
            this.timer = setTimeout(
                () => void this.refresh(),
                CHECK_INTERVAL_MS,
            );
        }
    }
}
