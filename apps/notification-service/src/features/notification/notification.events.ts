export const NOTIFICATION_TYPES = {
    TRANSFER_SENT: "transfer.sent",
    TRANSFER_RECEIVED: "transfer.received",
} as const;

export type NotificationType =
    (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// назвали так, чтобы не конфликтовать с web notification api
export interface UserNotification {
    // TODO: подключить монгу, id и occurredAt - задел на будущее для хранения в бд
    id: string;
    type: NotificationType;
    transferId: string;
    fromUserId: string;
    toUserId: string;
    amount: string;
    occurredAt: string;
}

export interface ClientToServerEvents {
    ping: (message: string) => void;
}

export interface ServerToClientEvents {
    pong: (message: string) => void;
    notification: (notification: UserNotification) => void;
}
