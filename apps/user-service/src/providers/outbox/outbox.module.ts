import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { KafkaModule } from "@user-service/providers/kafka/kafka.module";
import { OutboxRepository } from "@user-service/providers/outbox/outbox.repository";
import { IOutboxRepository } from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxSignal } from "@user-service/providers/outbox/outbox.signal";
import { OutboxEvent } from "@user-service/providers/outbox/outbox-event.model";
import { OutboxRelayService } from "@user-service/providers/outbox/outbox-relay.service";

@Module({
    imports: [SequelizeModule.forFeature([OutboxEvent]), KafkaModule],
    providers: [
        { provide: IOutboxRepository, useClass: OutboxRepository },
        OutboxSignal,
        OutboxRelayService,
    ],
    exports: [IOutboxRepository],
})
export class OutboxModule {}
