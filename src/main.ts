import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { REFRESH_COOKIE } from "./auth/auth.constants";
import { setupApp } from "@/common/setup-app";

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
