import {
    BeforeApplicationShutdown,
    Injectable,
    Logger,
    OnApplicationShutdown,
    OnModuleDestroy,
} from "@nestjs/common";

// пишет в лог этапы остановки сервиса. хуки корневого модуля nest вызывает раньше
// остальных, поэтому каждое сообщение появляется в начале своего этапа
@Injectable()
export class ShutdownLogger
    implements OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown
{
    private readonly logger = new Logger(ShutdownLogger.name);

    onModuleDestroy(): void {
        this.logger.log("Shutdown started, stopping background jobs");
    }

    beforeApplicationShutdown(signal?: string): void {
        this.logger.log(
            { signal },
            "Background jobs stopped, closing the server",
        );
    }

    onApplicationShutdown(): void {
        this.logger.log(
            "Server closed, closing connections to databases and brokers",
        );
    }
}
