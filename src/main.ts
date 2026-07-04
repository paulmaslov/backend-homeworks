import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { REFRESH_COOKIE } from "./auth/auth.constants";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService);

    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

    app.use(cookieParser());

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
