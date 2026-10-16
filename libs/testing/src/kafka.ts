import { randomUUID } from "node:crypto";

import { KafkaContainer, StartedKafkaContainer } from "@testcontainers/kafka";
import { ITopicConfig, Kafka, logLevel } from "kafkajs";

import { eventually } from "./wait";

const KAFKA_IMAGE = "confluentinc/cp-kafka:8.3.2";

// порт, который модуль kafka открывает для клиентов снаружи контейнера
const KAFKA_PORT = 9093;

export interface StartedKafka {
    container: StartedKafkaContainer;
    brokers: string;
}

export interface ReceivedMessage {
    key: string | undefined;
    value: string;
    headers: Record<string, string>;
}

export interface TopicReader {
    waitForMessage(key: string): Promise<ReceivedMessage>;
    stop(): Promise<void>;
}

// по умолчанию адрес, который global setup записал в KAFKA_BROKERS
export function createKafkaClient(
    brokers = process.env.KAFKA_BROKERS as string,
): Kafka {
    return new Kafka({
        clientId: "e2e",
        brokers: brokers.split(","),
        logLevel: logLevel.NOTHING,
    });
}

// как в docker-compose
export async function startKafkaContainer(
    topics: ITopicConfig[],
): Promise<StartedKafka> {
    const container = await new KafkaContainer(KAFKA_IMAGE)
        .withEnvironment({ KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false" })
        .start();
    const brokers = `${container.getHost()}:${container.getMappedPort(KAFKA_PORT)}`;

    const admin = createKafkaClient(brokers).admin();
    await admin.connect();
    try {
        await admin.createTopics({ waitForLeaders: true, topics });
    } finally {
        await admin.disconnect();
    }

    return { container, brokers };
}

// на каждый вызов своя группа: читатель получает все сообщения топика
// с начала и ни с кем их не делит
export async function readTopic(topic: string): Promise<TopicReader> {
    const consumer = createKafkaClient().consumer({
        groupId: `e2e-${randomUUID()}`,
    });
    const messages: ReceivedMessage[] = [];

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    await consumer.run({
        eachMessage: ({ message }) => {
            messages.push({
                key: message.key?.toString(),
                value: message.value?.toString() ?? "",
                headers: Object.fromEntries(
                    Object.entries(message.headers ?? {}).map(
                        ([name, value]) => [name, value?.toString() ?? ""],
                    ),
                ),
            });
            return Promise.resolve();
        },
    });

    return {
        async waitForMessage(key) {
            let found: ReceivedMessage | undefined;
            await eventually(() => {
                found = messages.find((message) => message.key === key);
                expect(found).toBeDefined();
            });

            return found as ReceivedMessage;
        },
        stop: () => consumer.disconnect(),
    };
}
