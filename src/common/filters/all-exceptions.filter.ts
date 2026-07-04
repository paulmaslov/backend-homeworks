import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Request } from "express";

// приводим все ошибки к одному виду
// 500-ки логируются и отдаются клиенту без внутренних деталей
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : "Internal server error";

        if (!(exception instanceof HttpException)) {
            if (exception instanceof Error) {
                this.logger.error(exception.message, exception.stack);
            } else {
                this.logger.error(JSON.stringify(exception));
            }
        }

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(request) as string,
            ...(typeof exceptionResponse === "string"
                ? { message: exceptionResponse }
                : exceptionResponse),
        };

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
