import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    ServiceUnavailableException,
} from "@nestjs/common";
import type { Response } from "express";

@Catch(ServiceUnavailableException)
export class HealthCheckFilter implements ExceptionFilter {
    catch(exception: ServiceUnavailableException, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();
        response.status(exception.getStatus()).json(exception.getResponse());
    }
}
