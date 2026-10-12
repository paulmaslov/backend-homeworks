import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsResponse,
} from "@nestjs/websockets";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { DefaultEventsMap, Server, Socket } from "socket.io";

import {
    AuthenticatedUser,
    WsAuthService,
} from "@notification-service/auth/ws-auth.service";
import { WsUnauthorizedError } from "@notification-service/auth/ws-unauthorized.error";
import {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@notification-service/features/notification/notification.events";

const userRoom = (userId: string): string => `user:${userId}`;

type NotificationServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    AuthenticatedUser
>;
type NotificationSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    AuthenticatedUser
>;

@WebSocketGateway()
export class NotificationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    private readonly server: NotificationServer;

    constructor(
        private readonly wsAuth: WsAuthService,
        @InjectPinoLogger(NotificationGateway.name)
        private readonly logger: PinoLogger,
    ) {}

    afterInit(): void {
        this.server.use((socket, next) => {
            try {
                socket.data = this.wsAuth.authenticate(socket.handshake);
                next();
            } catch (error) {
                if (error instanceof WsUnauthorizedError) {
                    this.logger.warn(
                        { clientId: socket.id, code: error.data.code },
                        "Connection rejected",
                    );
                    next(error);
                    return;
                }

                this.logger.error(
                    { err: error, clientId: socket.id },
                    "Connection authentication failed",
                );
                next(new Error("Internal server error"));
            }
        });

        this.logger.info("Gateway initialized");
    }

    handleConnection(client: NotificationSocket): void {
        const { userId, tokenExpiresAt } = client.data;

        void client.join(userRoom(userId));

        const expiryTimer = setTimeout(() => {
            this.logger.info(
                { clientId: client.id, userId },
                "Access token expired, disconnecting",
            );
            client.disconnect(true);
        }, tokenExpiresAt - Date.now());
        client.once("disconnect", () => clearTimeout(expiryTimer));

        this.logger.info(
            {
                clientId: client.id,
                connectedClients: this.server.sockets.sockets.size,
            },
            "Client connected",
        );
    }

    handleDisconnect(client: NotificationSocket): void {
        this.logger.info(
            { clientId: client.id, userId: client.data.userId },
            "Client disconnected",
        );
    }

    @SubscribeMessage("ping")
    handlePing(
        @MessageBody() message: string,
        @ConnectedSocket() client: NotificationSocket,
    ): WsResponse<string> {
        this.logger.debug({ clientId: client.id, message }, "Ping received");
        return { event: "pong", data: message };
    }
}
