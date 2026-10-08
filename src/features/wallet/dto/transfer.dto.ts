import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, Matches } from "class-validator";

import {
    AMOUNT_FORMAT,
    AMOUNT_NON_ZERO,
} from "@/features/wallet/wallet.constants";

export class TransferDto {
    @ApiProperty({ example: "0f4d2c3e-7b1a-4c2d-9e8f-1a2b3c4d5e6f" })
    @IsUUID()
    readonly toUserId: string;

    @ApiProperty({ example: "100.00" })
    @IsString()
    @Matches(AMOUNT_FORMAT, {
        message: "Amount must be a decimal string with up to 2 fraction digits",
    })
    @Matches(AMOUNT_NON_ZERO, { message: "Amount must be greater than 0" })
    readonly amount: string;
}
