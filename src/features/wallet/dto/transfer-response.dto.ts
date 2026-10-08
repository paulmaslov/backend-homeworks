import { ApiProperty } from "@nestjs/swagger";

import { Transfer } from "@/features/wallet/transfer.model";

export class TransferResponseDto {
    @ApiProperty({ format: "uuid" })
    readonly id: string;

    // null - пополнение: деньги вошли в систему извне
    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description:
            "null means a deposit: the money entered the system from outside",
    })
    readonly fromUserId: string | null;

    @ApiProperty({ format: "uuid" })
    readonly toUserId: string;

    @ApiProperty({ description: "Decimal string", example: "100.00" })
    readonly amount: string;

    @ApiProperty({ format: "date-time" })
    readonly createdAt: Date;

    constructor(transfer: Transfer) {
        this.id = transfer.id;
        this.fromUserId = transfer.fromUserId;
        this.toUserId = transfer.toUserId;
        this.amount = transfer.amount;
        this.createdAt = transfer.createdAt;
    }
}
