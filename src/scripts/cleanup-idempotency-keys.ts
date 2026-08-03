import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Logger as PinoAppLogger } from "nestjs-pino";

import { AppModule } from "@/app.module";
import { IdempotencyCleanupService } from "@/features/wallet/idempotency-cleanup.service";

async function main(): Promise<void> {
    // createApplicationContext, а не create: http-слой скрипту не нужен,
    // порт он не занимает
    const app = await NestFactory.createApplicationContext(AppModule, {
        bufferLogs: true,
    });
    app.useLogger(app.get(PinoAppLogger));

    try {
        await app.get(IdempotencyCleanupService).run();
    } finally {
        await app.close();
    }
}

void main().catch((error: unknown) => {
    new Logger("CleanupIdempotencyKeys").fatal(
        "Cleanup script failed",
        error instanceof Error ? error.stack : String(error),
    );
    // код возврата - единственное, что видит cron
    process.exitCode = 1;
});
