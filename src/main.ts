import { Logger as NestLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { setupApp } from "@/common/setup-app";

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

    const swaggerConfig = new DocumentBuilder()
        .setTitle("Backend homeworks API")
        .setDescription("Registration, authentication and user management")
        .setVersion("1.0")
        .addBearerAuth({
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
                "Access token issued by POST /auth/login or /auth/register",
        })
        .addCookieAuth(REFRESH_COOKIE)
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/v1/docs", app, document);

    app.enableShutdownHooks();

    const port = config.getOrThrow<number>("port");
    await app.listen(port);

    new NestLogger("Bootstrap").log(
        `Application is listening on port ${port} in ${config.getOrThrow<string>("nodeEnv")} mode`,
    );
}

void bootstrap().catch((error: unknown) => {
    new NestLogger("Bootstrap").fatal(
        "Application failed to start",
        error instanceof Error ? error.stack : String(error),
    );
    process.exitCode = 1;
});
