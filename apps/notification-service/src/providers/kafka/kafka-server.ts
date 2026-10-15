import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Consumer, Kafka, Partitioners, Producer } from "kafkajs";

import { KafkaConsumerWatcher } from "@notification-service/health/kafka-consumer.watcher";

export async function startKafkaServer(app: INestApplication): Promise<void> {
    const config = app.get(ConfigService);

    const server = app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
            client: {
                clientId: "notification-service",
                brokers: config.getOrThrow<string[]>("kafka.brokers"),
            },
            consumer: { groupId: "notification-service" },
            // читаем партицию сначала, если нет сохраненного офсета,
            // чтобы не пропустить сообщения, пришедшие до первого коммита
            subscribe: { fromBeginning: true },
            // producer сервера нужен для записи в dlq
            producer: { createPartitioner: Partitioners.DefaultPartitioner },
        },
    });

    await app.startAllMicroservices();

    // consumer создается при старте микросервиса, поэтому подписываемся после него
    const [, consumer] = server.unwrap<[Kafka, Consumer, Producer]>();
    app.get(KafkaConsumerWatcher).watch(consumer);
}
