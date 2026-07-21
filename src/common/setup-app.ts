import {
    INestApplication,
    ValidationPipe,
    VersioningType,
} from "@nestjs/common";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { HttpAdapterHost } from "@nestjs/core";
import cookieParser from "cookie-parser";

export function setupApp(app: INestApplication): void {
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
}
