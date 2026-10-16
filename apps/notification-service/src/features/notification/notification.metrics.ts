import { Counter, Gauge } from "@prometheus-io/client";

export const websocketConnections = new Gauge({
    name: "notification_websocket_connections",
    help: "Number of open WebSocket connections",
});

export const notificationsSent = new Counter({
    name: "notification_sent_total",
    help: "Number of notifications emitted to user rooms",
    labelNames: ["type"],
});
