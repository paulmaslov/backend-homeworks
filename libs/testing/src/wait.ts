import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 100;

// не ждем таймаута теста, падаем через timeoutMs
export function withTimeout<T>(
    promise: Promise<T>,
    waitingFor: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(
                new Error(
                    `Timed out after ${timeoutMs} ms waiting for ${waitingFor}`,
                ),
            );
        }, timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// раз в POLL_INTERVAL_MS повторяем проверку, пока сервис не закончит фоновую
// работу: обработку сообщения из kafka, отправку из outbox, проверку kafka
export async function eventually(
    assertion: () => Promise<void> | void,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    for (;;) {
        try {
            await assertion();
            return;
        } catch (error) {
            if (Date.now() >= deadline) {
                throw error;
            }
            await delay(POLL_INTERVAL_MS);
        }
    }
}
