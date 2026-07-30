import { NestFactory } from "@nestjs/core";

import { AppModule } from "@/app.module";
import { IdempotencyCleanupService } from "@/features/wallet/idempotency-cleanup.service";

async function main(): Promise<void> {
    // createApplicationContext, а не create: http-слой скрипту не нужен,
    // порт он не занимает
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        await app.get(IdempotencyCleanupService).run();
    } finally {
        await app.close();
    }
}

void main().catch((error: unknown) => {
    console.error(error);
    // код возврата - единственное, что видит cron
    process.exitCode = 1;
});
