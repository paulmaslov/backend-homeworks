import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

// id запроса выставляет pino-http
export const RequestId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const { id } = ctx.switchToHttp().getRequest<Request>();

        return typeof id === "string" ? id : JSON.stringify(id);
    },
);
