import { generateKeyPairSync } from "node:crypto";

import { KafkaContainer, StartedKafkaContainer } from "@testcontainers/kafka";
import { Kafka, logLevel } from "kafkajs";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

import { WALLET_TOPICS } from "@libs/contracts";

import { deadLetterTopic } from "@notification-service/common/filters/kafka-dead-letter.filter";
import {
    createMigrator,
    createMongoClient,
} from "@notification-service/databases/migrator";

declare global {
    var __MONGO_CONTAINER__: StartedTestContainer | undefined;
    var __KAFKA_CONTAINER__: StartedKafkaContainer | undefined;
}

const MONGO_IMAGE = "mongo:8.0";
const KAFKA_IMAGE = "confluentinc/cp-kafka:8.3.2";

const MONGO_PORT = 27017;
// порт, который модуль kafka открывает для клиентов снаружи контейнера
const KAFKA_PORT = 9093;

const MONGO_USER = "test_user";
const MONGO_PASSWORD = "test_password";
const MONGO_DB = "notifications_test";

// как в docker-compose
const TRANSFER_TOPIC_PARTITIONS = 3;

// официальный модуль mongodb поднимает реплика-сет, а сервис подключается
// к одиночной монге, как в docker-compose. поэтому обычный контейнер
async function startMongo(): Promise<void> {
    console.log("[e2e] Starting mongodb container...");

    const container = await new GenericContainer(MONGO_IMAGE)
        .withEnvironment({
            MONGO_INITDB_ROOT_USERNAME: MONGO_USER,
            MONGO_INITDB_ROOT_PASSWORD: MONGO_PASSWORD,
        })
        .withExposedPorts(MONGO_PORT)
        // образ сначала поднимает временную монгу, чтобы создать
        // пользователя, и перезапускает ее. готова только вторая
        .withWaitStrategy(Wait.forLogMessage(/Waiting for connections/, 2))
        .start();

    globalThis.__MONGO_CONTAINER__ = container;

    const host = container.getHost();
    const port = container.getMappedPort(MONGO_PORT);

    process.env.MONGO_HOST = host;
    process.env.MONGO_PORT = String(port);
    process.env.MONGO_USER = MONGO_USER;
    process.env.MONGO_PASSWORD = MONGO_PASSWORD;
    process.env.MONGO_DB = MONGO_DB;

    const client = createMongoClient({
        host,
        port,
        user: MONGO_USER,
        password: MONGO_PASSWORD,
        dbName: MONGO_DB,
    });
    try {
        await createMigrator(client.db(MONGO_DB)).up();
    } finally {
        await client.close();
    }

    console.log(`[e2e] MongoDB is ready: ${host}:${port}, migrations applied`);
}

async function startKafka(): Promise<void> {
    console.log("[e2e] Starting kafka container...");

    const container = await new KafkaContainer(KAFKA_IMAGE)
        // как в docker-compose: топики создаем сами, и опечатка в названии
        // дает ошибку, а не новый пустой топик
        .withEnvironment({ KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false" })
        .start();

    globalThis.__KAFKA_CONTAINER__ = container;

    const brokers = `${container.getHost()}:${container.getMappedPort(KAFKA_PORT)}`;
    process.env.KAFKA_BROKERS = brokers;

    const admin = new Kafka({
        clientId: "e2e-setup",
        brokers: [brokers],
        logLevel: logLevel.NOTHING,
    }).admin();

    await admin.connect();
    try {
        await admin.createTopics({
            waitForLeaders: true,
            topics: [
                {
                    topic: WALLET_TOPICS.TRANSFER_COMPLETED,
                    numPartitions: TRANSFER_TOPIC_PARTITIONS,
                },
                {
                    topic: deadLetterTopic(WALLET_TOPICS.TRANSFER_COMPLETED),
                    numPartitions: 1,
                },
            ],
        });
    } finally {
        await admin.disconnect();
    }

    console.log(`[e2e] Kafka is ready: ${brokers}`);
}

export default async function globalSetup(): Promise<void> {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "silent";
    process.env.LOG_PRETTY = "false";

    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "pem" },
    });
    process.env.JWT_ACCESS_PUBLIC_KEY = publicKey;
    // токены в тестах подписываем сами вместо user-service
    process.env.E2E_JWT_PRIVATE_KEY = privateKey;

    await Promise.all([startMongo(), startKafka()]);
}
