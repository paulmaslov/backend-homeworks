import { Logger as NestLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { setupHttpApp, setupSwagger } from "@libs/common";

import { AppModule } from "@notification-service/app.module";
import { startKafkaServer } from "@notification-service/providers/kafka/kafka-server";

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

    app.enableShutdownHooks([], { useProcessExit: true });

    const port = config.getOrThrow<number>("port");
    await app.listen(port);

    // запускаем только после запуска websocket gateway,
    // тк консюмер использует его при чтении из кафки
    await startKafkaServer(app);

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
