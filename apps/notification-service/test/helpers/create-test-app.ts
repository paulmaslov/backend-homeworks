import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Logger } from "nestjs-pino";

import { setupHttpApp } from "@libs/common";

import { AppModule } from "@notification-service/app.module";
import { startKafkaServer } from "@notification-service/providers/kafka/kafka-server";

// поднимаем сервис так же, как main.ts, только без swagger
export async function createTestApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();

    setupHttpApp(app);
    app.useLogger(app.get(Logger));

    await app.listen(0);
    await startKafkaServer(app);

    return app;
}
