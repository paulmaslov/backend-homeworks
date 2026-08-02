import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { Observable } from "rxjs";

import { CurrentUserData } from "@/common/interfaces/current-user.interface";

// customProps кладёт userId только в строку завершения запроса.
// здесь дописываем его в контекст, чтобы он был во всех строках,
// которые сервисы напишут по ходу обработки запроса
@Injectable()
export class LoggerContextInterceptor implements NestInterceptor<
    unknown,
    unknown
> {
    constructor(private readonly logger: PinoLogger) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<unknown>,
    ): Observable<unknown> {
        const request = context
            .switchToHttp()
            .getRequest<{ user?: CurrentUserData }>();

        if (request.user) {
            this.logger.assign({ userId: request.user.userId });
        }

        return next.handle();
    }
}
