import { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";

import { setupHttpApp } from "@libs/common";

export function setupApp(app: INestApplication): void {
    setupHttpApp(app);

    app.use(cookieParser());
}
