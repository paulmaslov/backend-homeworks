import { Transfer } from "@/features/wallet/transfer.model";

export class TransferResponseDto {
    readonly id: string;
    // null - пополнение: деньги вошли в систему извне
    readonly fromUserId: string | null;
    readonly toUserId: string;
    readonly amount: string;
    readonly createdAt: Date;

    constructor(transfer: Transfer) {
        this.id = transfer.id;
        this.fromUserId = transfer.fromUserId;
        this.toUserId = transfer.toUserId;
        this.amount = transfer.amount;
        this.createdAt = transfer.createdAt;
    }
}
