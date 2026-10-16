import {
    Controller,
    UseFilters,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import {
    Ctx,
    EventPattern,
    KafkaContext,
    Payload,
    RpcException,
} from "@nestjs/microservices";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

import { KAFKA_HEADERS, WALLET_TOPICS } from "@libs/contracts";

import { KafkaDeadLetterFilter } from "@notification-service/common/filters/kafka-dead-letter.filter";
import { TransferCompletedEventDto } from "@notification-service/features/notification/dto/transfer-completed-event.dto";
import { NotificationService } from "@notification-service/features/notification/notification.service";
import { MongoRetry } from "@notification-service/providers/databases/mongodb/mongo-retry";

@Controller()
@UseFilters(KafkaDeadLetterFilter)
export class NotificationController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly mongoRetry: MongoRetry,

        @InjectPinoLogger(NotificationController.name)
        private readonly logger: PinoLogger,
    ) {}

    @EventPattern<string>(WALLET_TOPICS.TRANSFER_COMPLETED)
    @UsePipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            exceptionFactory: (errors) =>
                new RpcException(
                    errors
                        .flatMap((error) =>
                            Object.values(error.constraints ?? {}),
                        )
                        .join("; "),
                ),
        }),
    )
    async handleTransferCompleted(
        @Payload() event: TransferCompletedEventDto,
        @Ctx() context: KafkaContext,
    ): Promise<void> {
        this.logger.info(
            {
                eventId: event.eventId,
                transferId: event.transferId,
                requestId: readHeader(context, KAFKA_HEADERS.REQUEST_ID),
            },
            "Transfer completed event received",
        );

        // пока монга недоступна, сообщение ждет здесь, а не уходит в dlq
        await this.mongoRetry.whileUnavailable(
            () => this.notificationService.notifyTransferCompleted(event),
            context.getHeartbeat(),
        );
    }
}

function readHeader(context: KafkaContext, name: string): string | undefined {
    const value: unknown = context.getMessage().headers?.[name];
    return typeof value === "string" ? value : undefined;
}
