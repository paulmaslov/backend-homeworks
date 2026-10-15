import {
    INestApplication,
    ValidationPipe,
    VersioningType,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

import { AllExceptionsFilter } from "../filters/all-exceptions.filter";
import { HEALTH_ROUTES } from "../health/health.constants";

// одинаковая для микросервисов настройка
// добавление префикса на запрос + версионирование + глобальные пайпы и фильтр ошибок
export function setupHttpApp(app: INestApplication): void {
    app.setGlobalPrefix("api", { exclude: HEALTH_ROUTES });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
}
