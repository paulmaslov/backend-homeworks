import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { OutboxRepository } from "@user-service/providers/outbox/outbox.repository";
import { IOutboxRepository } from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxEvent } from "@user-service/providers/outbox/outbox-event.model";

@Module({
    imports: [SequelizeModule.forFeature([OutboxEvent])],
    providers: [{ provide: IOutboxRepository, useClass: OutboxRepository }],
    exports: [IOutboxRepository],
})
export class OutboxModule {}
