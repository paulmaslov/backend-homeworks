import { Injectable } from "@nestjs/common";
import type { Consumer } from "kafkajs";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

// kafkajs сам перезапускает консюмер после временных ошибок. после неисправимой
// он останавливает консюмер насовсем, и события из кафки больше не читаются.
// в таком случае поможет только перезапуск пода
@Injectable()
export class KafkaConsumerWatcher {
    private stopReason?: string;

    constructor(
        @InjectPinoLogger(KafkaConsumerWatcher.name)
        private readonly logger: PinoLogger,
    ) {}

    watch(consumer: Consumer): void {
        consumer.on(consumer.events.CRASH, ({ payload }) => {
            if (payload.restart) {
                return;
            }

            this.stopReason = payload.error.message;
            this.logger.error(
                { err: payload.error, groupId: payload.groupId },
                "Kafka consumer stopped and will not restart",
            );
        });
    }

    // причина остановки или undefined, если consumer работает
    getStopReason(): string | undefined {
        return this.stopReason;
    }
}
