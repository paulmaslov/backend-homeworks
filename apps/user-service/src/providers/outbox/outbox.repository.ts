import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";

import { BaseRepository } from "@user-service/common/repositories/base.repository";
import {
    AddOutboxEventData,
    IOutboxRepository,
} from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxEvent } from "@user-service/providers/outbox/outbox-event.model";

@Injectable()
export class OutboxRepository
    extends BaseRepository<OutboxEvent>
    implements IOutboxRepository
{
    constructor(@InjectModel(OutboxEvent) model: typeof OutboxEvent) {
        super(model);
    }

    async add(
        data: AddOutboxEventData,
        transaction: Transaction,
    ): Promise<void> {
        await this.model.create(data, { transaction });
    }
}
