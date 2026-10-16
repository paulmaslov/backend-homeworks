import { mongo } from "mongoose";

export interface MongoConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
}

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
        // подтверждать запись только после журнала на диске: после ответа мы
        // отправляем push и kafka сдвигает позицию, и запись, потерянная при
        // падении монги, уже не повторится
        writeConcern: { w: "majority", journal: true },
    };
}
