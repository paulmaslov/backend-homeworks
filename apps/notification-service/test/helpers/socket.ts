import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { INestApplication } from "@nestjs/common";
import { io, Socket } from "socket.io-client";

import { withTimeout } from "@libs/testing";

import {
    ClientToServerEvents,
    ServerToClientEvents,
    UserNotification,
} from "@notification-service/features/notification/notification.events";

export type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// socket.io передает клиенту поле data ошибки, с которой сервер отклонил
// подключение
export type ConnectError = Error & { data?: unknown };

export function connectSocket(
    app: INestApplication,
    token?: string,
): TestSocket {
    const { port } = (app.getHttpServer() as Server).address() as AddressInfo;

    return io(`http://127.0.0.1:${port}`, {
        auth: token ? { token } : {},
        // сразу websocket, без long-polling
        transports: ["websocket"],
        // тест проверяет один исход подключения, повторы бы его скрыли
        reconnection: false,
        // отдельное соединение на каждый сокет
        forceNew: true,
    });
}

export function waitForConnect(socket: TestSocket): Promise<void> {
    return withTimeout(
        new Promise((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("connect_error", reject);
        }),
        "socket connection",
    );
}

export function waitForConnectError(socket: TestSocket): Promise<ConnectError> {
    return withTimeout(
        new Promise((resolve, reject) => {
            socket.once("connect_error", resolve);
            socket.once("connect", () =>
                reject(new Error("Socket connected, expected a rejection")),
            );
        }),
        "socket rejection",
    );
}

export function waitForNotification(
    socket: TestSocket,
): Promise<UserNotification> {
    return withTimeout(
        new Promise((resolve) => socket.once("notification", resolve)),
        "a notification",
    );
}

export function waitForDisconnect(
    socket: TestSocket,
): Promise<Socket.DisconnectReason> {
    return withTimeout(
        new Promise((resolve) => socket.once("disconnect", resolve)),
        "socket disconnect",
    );
}
