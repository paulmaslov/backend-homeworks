// назвали так, чтобы не конфликтовать с web notification api
export interface UserNotification {
    // TODO: подключить монгу, id и createdAt - задел на будущее для хранения в бд
    id: string;
    createdAt: string;
    message: string;
}

export interface ClientToServerEvents {
    ping: (message: string) => void;
}

export interface ServerToClientEvents {
    pong: (message: string) => void;
    notification: (notification: UserNotification) => void;
}
