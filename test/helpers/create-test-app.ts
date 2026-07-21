import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "@/app.module";
import { setupApp } from "@/common/setup-app";

export async function createTestApp(): Promise<INestApplication> {
    const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();

    // swagger, cors не настраиваем, т.к. они не влияют на логику тестов
    setupApp(app);

    await app.init();

    return app;
}
