export const RATE_LIMIT_REQUESTS = "10000";
export const RATE_LIMIT_PERIOD = "1m";

export const S3_REGION = "ru-central1";
export const S3_BUCKET = "avatars";

export const REDIS_PASSWORD = "test_redis_password";

export const USERS_CACHE_TTL = "30s";

export const IDEMPOTENCY_KEY_TTL = "24h";

// выключаем циклический сброс баланса пользователей раз в 10 минут,
// чтобы это не мешало другим тестам
export const BALANCE_RESET_ENABLED = "false";
export const BALANCE_RESET_INTERVAL = "10m";
// маленький батч, чтобы e2e реально проходил цикл, а не укладывался в одну итерацию
export const BALANCE_RESET_BATCH_SIZE = "2";
export const BALANCE_RESET_DEDUP_TTL = "5m";
