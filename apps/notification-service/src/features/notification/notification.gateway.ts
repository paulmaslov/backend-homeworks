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
import { Server, Socket } from "socket.io";

import {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@notification-service/features/notification/notification.events";

type NotificationServer = Server<ClientToServerEvents, ServerToClientEvents>;
type NotificationSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway()
export class NotificationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    private readonly server: NotificationServer;

    constructor(
        @InjectPinoLogger(NotificationGateway.name)
        private readonly logger: PinoLogger,
    ) {}

    afterInit(): void {
        this.logger.info("Gateway initialized");
    }

    handleConnection(client: NotificationSocket): void {
        this.logger.info(
            {
                clientId: client.id,
                connectedClients: this.server.sockets.sockets.size,
            },
            "Client connected",
        );
    }

    handleDisconnect(client: NotificationSocket): void {
        this.logger.info({ clientId: client.id }, "Client disconnected");
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
