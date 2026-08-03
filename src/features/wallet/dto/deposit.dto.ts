import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

import {
    AMOUNT_FORMAT,
    AMOUNT_NON_ZERO,
} from "@/features/wallet/wallet.constants";

export class DepositDto {
    @ApiProperty({
        description:
            "Decimal string, up to 12 digits before the dot and 2 after, greater than zero",
        pattern: AMOUNT_FORMAT.source,
        example: "500.00",
    })
    @IsString()
    @Matches(AMOUNT_FORMAT, {
        message: "Amount must be a decimal string with up to 2 fraction digits",
    })
    @Matches(AMOUNT_NON_ZERO, { message: "Amount must be greater than 0" })
    readonly amount: string;
}
