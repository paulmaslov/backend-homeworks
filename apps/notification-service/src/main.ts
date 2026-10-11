import { Logger as NestLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { AppModule } from "@notification-service/app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    const config = app.get(ConfigService);

    app.enableShutdownHooks();

    const port = config.getOrThrow<number>("port");
    await app.listen(port);

    new NestLogger("Bootstrap").log(
        `Aplication is listening on port ${port} in ${config.getOrThrow<string>("nodeEnv")} mode`,
    );
}

void bootstrap().catch((error: unknown) => {
    new NestLogger("Bootstrap").fatal(
        "Application failed to start",
        error instanceof Error ? error.stack : String(error),
    );
    process.exitCode = 1;
});
