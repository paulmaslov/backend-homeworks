import { IsISO8601, IsUUID, Matches } from "class-validator";

import { TransferCompletedEvent } from "@libs/contracts";

export class TransferCompletedEventDto implements TransferCompletedEvent {
    @IsUUID()
    readonly eventId: string;

    @IsUUID()
    readonly transferId: string;

    @IsUUID()
    readonly fromUserId: string;

    @IsUUID()
    readonly toUserId: string;

    // десятичная строка, как в api user-service
    @Matches(/^\d{1,15}\.\d{2}$/)
    readonly amount: string;

    @IsISO8601()
    readonly occurredAt: string;
}
