export const KAFKA_HEADERS = {
    // id исходного http-запроса - связывает логи сервисов по запросу
    REQUEST_ID: "x-request-id",
} as const;
