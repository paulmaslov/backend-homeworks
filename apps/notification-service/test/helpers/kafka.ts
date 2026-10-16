import { Partitioners, Producer } from "kafkajs";

import { createKafkaClient } from "@libs/testing";

export async function createProducer(): Promise<Producer> {
    const producer = createKafkaClient().producer({
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
