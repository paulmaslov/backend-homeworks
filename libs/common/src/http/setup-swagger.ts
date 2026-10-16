import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export const SWAGGER_PATH = "api/v1/docs";

export interface SwaggerSettings {
    title: string;
    description: string;
    // дописать в документ то, что есть только у этого сервиса
    extend?: (builder: DocumentBuilder) => DocumentBuilder;
}

// одинаковая для сервисов документация: путь, версия и авторизация
// по access-токену, который выдает user-service
export function setupSwagger(
    app: INestApplication,
    settings: SwaggerSettings,
): void {
    const builder = new DocumentBuilder()
        .setTitle(settings.title)
        .setDescription(settings.description)
        .setVersion("1.0")
        .addBearerAuth({
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
                "Access token issued by user-service: POST /api/v1/auth/login or /api/v1/auth/register",
        });

    const config = (settings.extend?.(builder) ?? builder).build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(SWAGGER_PATH, app, document);
}
