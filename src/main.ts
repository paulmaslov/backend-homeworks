import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { setupApp } from "@/common/setup-app";

import { AppModule } from "./app.module";
import { REFRESH_COOKIE } from "./auth/auth.constants";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
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
        .addBearerAuth()
        .addCookieAuth(REFRESH_COOKIE)
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/v1/docs", app, document);

    await app.listen(config.getOrThrow<number>("port"));
}
void bootstrap();
