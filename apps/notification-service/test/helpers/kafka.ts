import { randomUUID } from "node:crypto";

import { Kafka, logLevel, Partitioners, Producer } from "kafkajs";

import { eventually } from "./wait";

const createKafka = (): Kafka =>
    new Kafka({
        clientId: "e2e",
        brokers: (process.env.KAFKA_BROKERS as string).split(","),
        logLevel: logLevel.NOTHING,
    });

export async function createProducer(): Promise<Producer> {
    const producer = createKafka().producer({
        createPartitioner: Partitioners.DefaultPartitioner,
    });
    await producer.connect();

    return producer;
}

// тело сообщения - json, как у relay в user-service
export async function publish(
    producer: Producer,
    topic: string,
    key: string,
    value: unknown,
): Promise<void> {
    await producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(value) }],
    });
}

export interface ReceivedMessage {
    key: string | undefined;
    headers: Record<string, string>;
}

export interface TopicReader {
    waitForMessage(key: string): Promise<ReceivedMessage>;
    stop(): Promise<void>;
}

export async function readTopic(topic: string): Promise<TopicReader> {
    const consumer = createKafka().consumer({ groupId: `e2e-${randomUUID()}` });
    const messages: ReceivedMessage[] = [];

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    await consumer.run({
        eachMessage: ({ message }) => {
            messages.push({
                key: message.key?.toString(),
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
