export const HEALTH_PATH = "health";

export const HEALTH_ROUTES = [`${HEALTH_PATH}/live`, `${HEALTH_PATH}/ready`];

// должно быть меньше таймаута пробы в кубернетисе, иначе он не дождется ответа
// и посчитает пробу проваленной
export const HEALTH_CHECK_TIMEOUT_MS = 1_000;

// в это время под продолжает принимать запросы после sigterm,
// а риднес проба отвечает уже 503
export const SHUTDOWN_DELAY_MS = 5_000;
