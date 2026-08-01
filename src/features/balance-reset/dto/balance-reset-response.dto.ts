export class BalanceResetResponseDto {
    // null, если удержанной джобы уже нет в редисе
    readonly runId: string | null;
    readonly jobId: string;
    readonly deduplicated: boolean;

    constructor(runId: string | null, jobId: string, deduplicated: boolean) {
        this.runId = runId;
        this.jobId = jobId;
        this.deduplicated = deduplicated;
    }
}
