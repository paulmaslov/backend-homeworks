import { ApiProperty } from "@nestjs/swagger";

export class BalanceResetResponseDto {
    // null, если удержанной джобы уже нет в редисе
    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "null if the deduplicated job is no longer in redis",
    })
    readonly runId: string | null;

    @ApiProperty({
        description: "Job identifier in bullmq",
        example: "balance-reset",
    })
    readonly jobId: string;

    @ApiProperty({
        description:
            "true means a run was already scheduled and no new one was created",
        example: false,
    })
    readonly deduplicated: boolean;

    constructor(runId: string | null, jobId: string, deduplicated: boolean) {
        this.runId = runId;
        this.jobId = jobId;
        this.deduplicated = deduplicated;
    }
}
