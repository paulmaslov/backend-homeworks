import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "nestjs-pino";

import { AppModule } from "@/app.module";
import { setupApp } from "@/common/setup-app";

export async function createTestApp(): Promise<INestApplication> {
    const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();

    // swagger, cors не настраиваем, т.к. они не влияют на логику тестов
    setupApp(app);
    app.useLogger(app.get(Logger));

    await app.init();

    return app;
}
