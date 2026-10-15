import { Logger as NestLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Partitioners } from "kafkajs";
import { Logger } from "nestjs-pino";

import { setupHttpApp, setupSwagger } from "@libs/common";

import { AppModule } from "@notification-service/app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    const config = app.get(ConfigService);

    setupHttpApp(app);
    setupSwagger(app, {
        title: "Notification service API",
        description:
            "History of user notifications. Realtime notifications are delivered over Socket.IO, see README",
    });

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
            client: {
                clientId: "notification-service",
                brokers: config.getOrThrow<string[]>("kafka.brokers"),
            },
            consumer: { groupId: "notification-service" },
            // читаем партицию сначала, если нет сохраненного офсета,
            // чтобы не пропустить сообщения, пришедшие до первого коммита
            subscribe: { fromBeginning: true },
            // producer сервера нужен для записи в dlq
            producer: { createPartitioner: Partitioners.DefaultPartitioner },
        },
    });

    app.enableShutdownHooks();

    const port = config.getOrThrow<number>("port");
    await app.listen(port);

    // запускаем только после запуска websocket gateway,
    // тк консюмер использует его при чтении из кафки
    await app.startAllMicroservices();

    new NestLogger("Bootstrap").log(
        `Application is listening on port ${port} in ${config.getOrThrow<string>("nodeEnv")} mode`,
    );
}

void bootstrap().catch((error: unknown) => {
    new NestLogger("Bootstrap").fatal(
        { err: error },
        "Application failed to start",
    );
    // открытые соединения (mongo, kafka, redis) держат процесс живым:
    // без явного выхода сервис зависнет, не слушая порт
    process.exit(1);
});
