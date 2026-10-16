import { Histogram } from "@prometheus-io/client";
import type { NextFunction, Request, Response } from "express";

import { isServiceRequest } from "../http/service-routes";

const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
});

// возвращаем шаблон юрла запроса, а не реальный url
// (/users/:id, а не /users/42, например)
function routeTemplate(request: Request): string {
    const route: unknown = request.route;

    if (
        typeof route === "object" &&
        route !== null &&
        "path" in route &&
        typeof route.path === "string"
    ) {
        return `${request.baseUrl}${route.path}`;
    }

    return "unmatched";
}

// считает время запроса и коды ответов http-запросов
export function httpMetricsMiddleware(
    request: Request,
    response: Response,
    next: NextFunction,
): void {
    if (isServiceRequest(request.originalUrl)) {
        next();
        return;
    }

    const stopTimer = httpRequestDuration.startTimer();

    response.once("finish", () => {
        stopTimer({
            method: request.method,
            route: routeTemplate(request),
            status_code: String(response.statusCode),
        });
    });

    next();
}
