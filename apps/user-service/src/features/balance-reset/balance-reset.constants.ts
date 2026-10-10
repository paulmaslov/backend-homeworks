export const BALANCE_RESET_QUEUE = "balance-reset";

// в шаблоне джобы шедулера нельзя указать дедупликацию, поэтому он раз в 10
// минут триггерит джобу, которая вызывает метод сервиса, который уже добавляет
// джобу с обнулением баланса в очередь
export const BALANCE_RESET_JOBS = {
    TICK: "balance-reset.tick",
    RUN: "balance-reset.run",
} as const;

export const BALANCE_RESET_SCHEDULER_ID = "balance-reset-schedule";

// ключ общий для ручного вызова и для шедулера, тк одновременно должен
// идти только один прогон обнуления балансов, откуда бы его ни запустили
export const BALANCE_RESET_DEDUP_ID = "balance-reset";

export interface BalanceResetJobData {
    readonly runId: string;
}

export const BALANCE_RESET_RUN_STATUSES = {
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
} as const;

export type BalanceResetRunStatus =
    (typeof BALANCE_RESET_RUN_STATUSES)[keyof typeof BALANCE_RESET_RUN_STATUSES];
