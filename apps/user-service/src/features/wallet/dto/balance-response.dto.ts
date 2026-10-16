import { ApiProperty } from "@nestjs/swagger";

export class BalanceResponseDto {
    @ApiProperty({
        description:
            "Decimal string rather than a number, to avoid float precision loss",
        example: "1500.00",
    })
    readonly balance: string;

    constructor(balance: string) {
        this.balance = balance;
    }
}
