export interface ClientToServerEvents {
    ping: (message: string) => void;
}

export interface ServerToClientEvents {
    pong: (message: string) => void;
}
