import { mongo } from "mongoose";

export interface MongoConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
}

// kafkajs шлёт heartbeat только между сообщениями: пока консюмер ждёт
// ответа монги, heartbeatы не отправляются. Через 30 сек kafka исключает
// консюмер из группы. драйвер монги по умолчанию ждёт недоступную базу тоже
// 30 секунд, поэтому сокращаем до 5, чтобы ожидание монги упало раньше
const SERVER_SELECTION_TIMEOUT_MS = 5_000;

export function buildMongoUri(config: MongoConfig): string {
    return `mongodb://${config.host}:${config.port}`;
}

// общие настройки подключения для сервиса и мигратора
export function buildMongoClientOptions(
    config: MongoConfig,
): mongo.MongoClientOptions {
    return {
        auth: { username: config.user, password: config.password },
        authSource: "admin",
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
        // подтверждать запись только после журнала на диске: после ответа мы
        // отправляем push и kafka сдвигает позицию, и запись, потерянная при
        // падении монги, уже не повторится
        writeConcern: { w: "majority", journal: true },
    };
}
