export const WALLET_TOPICS = {
    TRANSFER_COMPLETED: "wallet.transfer.completed",
} as const;

// публикуется только после коммита перевода, ключ сообщения - transferId
export interface TransferCompletedEvent {
    // дубли отличаем по eventId
    // не про айди перевода, тк в будущем могут появиться другие события по
    // переводу, например - возврат / отмена
    readonly eventId: string;
    readonly transferId: string;
    readonly fromUserId: string;
    readonly toUserId: string;
    // десятичная строка, как в api, чтобы не терялись числа
    readonly amount: string;
    // время перевода
    readonly occurredAt: string;
}
