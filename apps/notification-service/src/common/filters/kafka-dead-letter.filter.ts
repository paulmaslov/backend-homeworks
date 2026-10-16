import { ArgumentsHost, Catch, RpcExceptionFilter } from "@nestjs/common";
import { KafkaContext, RpcException } from "@nestjs/microservices";
import { Counter } from "@prometheus-io/client";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { from, Observable, throwError } from "rxjs";

import {
    isMongoUnavailable,
    MongoWaitAbortedError,
} from "@notification-service/providers/databases/mongodb/mongo-retry";

export const DEAD_LETTER_HEADERS = {
    ERROR: "x-dead-letter-error",
    REASON: "x-dead-letter-reason",
    ORIGINAL_TOPIC: "x-original-topic",
    ORIGINAL_PARTITION: "x-original-partition",
    ORIGINAL_OFFSET: "x-original-offset",
    FAILED_AT: "x-failed-at",
} as const;

export const deadLetterTopic = (topic: string): string => `${topic}.dlq`;

const deadLetters = new Counter({
    name: "notification_dead_letters_total",
    help: "Number of Kafka messages moved to dead letter topics",
    labelNames: ["topic", "reason"],
});

@Catch()
export class KafkaDeadLetterFilter implements RpcExceptionFilter<unknown> {
    constructor(
        @InjectPinoLogger(KafkaDeadLetterFilter.name)
        private readonly logger: PinoLogger,
    ) {}

    catch(exception: unknown, host: ArgumentsHost): Observable<void> {
        // если монга недоступна или сервис остановлен - не кладем в dlq
        if (
            isMongoUnavailable(exception) ||
            exception instanceof MongoWaitAbortedError
        ) {
            return throwError(() => exception);
        }

        const context = host.switchToRpc().getContext<KafkaContext>();

        return from(this.moveToDeadLetter(exception, context));
    }

    private async moveToDeadLetter(
        exception: unknown,
        context: KafkaContext,
    ): Promise<void> {
        const message = context.getMessage();
        const topic = context.getTopic();
        const reason = exception instanceof RpcException ? "invalid" : "failed";
        const error =
            exception instanceof Error ? exception.message : String(exception);

        await context.getProducer().send({
            topic: deadLetterTopic(topic),
            messages: [
                {
                    key: message.key,
                    value:
                        typeof message.value === "string"
                            ? message.value
                            : JSON.stringify(message.value),
                    headers: {
                        ...message.headers,
                        [DEAD_LETTER_HEADERS.ERROR]: error,
                        [DEAD_LETTER_HEADERS.REASON]: reason,
                        [DEAD_LETTER_HEADERS.ORIGINAL_TOPIC]: topic,
                        [DEAD_LETTER_HEADERS.ORIGINAL_PARTITION]: String(
                            context.getPartition(),
                        ),
                        [DEAD_LETTER_HEADERS.ORIGINAL_OFFSET]: message.offset,
                        [DEAD_LETTER_HEADERS.FAILED_AT]:
                            new Date().toISOString(),
                    },
                },
            ],
        });

        deadLetters.inc({ topic, reason });

        this.logger.error(
            {
                err: exception,
                reason,
                topic,
                partition: context.getPartition(),
                offset: message.offset,
            },
            "Kafka message moved to dead letter topic",
        );
    }
}
