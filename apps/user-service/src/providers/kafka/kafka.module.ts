import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { Partitioners } from "kafkajs";

import { KAFKA_CLIENT } from "@user-service/providers/kafka/kafka.constants";

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: KAFKA_CLIENT,
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            clientId: "user-service",
                            brokers:
                                config.getOrThrow<string[]>("kafka.brokers"),
                            // повторы kafkajs по умолчанию (5, около 10 с) не
                            // дали бы relay вовремя увидеть отказ брокера,
                            // тк таймаут отправки сработал бы раньше
                            retry: { retries: 2 },
                        },
                        producerOnlyMode: true,
                        producer: {
                            createPartitioner: Partitioners.DefaultPartitioner,
                        },
                    },
                }),
            },
        ]),
    ],
    exports: [ClientsModule],
})
export class KafkaModule {}
