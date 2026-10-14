import { Logger as NestLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { setupSwagger } from "@libs/common";

import { setupApp } from "@user-service/common/setup-app";

import { AppModule } from "./app.module";
import { REFRESH_COOKIE } from "./auth/auth.constants";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    const config = app.get(ConfigService);

    setupApp(app);

    app.enableCors({
        origin: config.getOrThrow<string>("cors.origin"),
        credentials: true,
    });

    setupSwagger(app, {
        title: "Backend homeworks API",
        description: "Registration, authentication and user management",
        extend: (builder) => builder.addCookieAuth(REFRESH_COOKIE),
    });

    app.enableShutdownHooks();

    const port = config.getOrThrow<number>("port");
    await app.listen(port);

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
