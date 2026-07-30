import {
    Body,
    Controller,
    Get,
    Header,
    Post,
    Res,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Response } from "express";

import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { BalanceResponseDto } from "@/features/wallet/dto/balance-response.dto";
import { DepositDto } from "@/features/wallet/dto/deposit.dto";
import { TransferDto } from "@/features/wallet/dto/transfer.dto";
import { TransferResponseDto } from "@/features/wallet/dto/transfer-response.dto";
import { IdempotencyKeyHeader } from "@/features/wallet/idempotency-key.decorator";
import { IDEMPOTENCY_REPLAYED_HEADER } from "@/features/wallet/wallet.constants";
import { WalletService } from "@/features/wallet/wallet.service";

@ApiTags("wallet")
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller("wallet")
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @ApiOperation({ summary: "Get the authenticated user's balance" })
    @ApiOkResponse({ type: BalanceResponseDto })
    @ApiUnauthorizedResponse({
        description: "Not authenticated or account deleted",
    })
    // баланс не кэшируется ни в редисе, ни у клиента
    @Header("Cache-Control", "no-store")
    @Get("balance")
    async getBalance(
        @CurrentUser("userId") userId: string,
    ): Promise<BalanceResponseDto> {
        return this.walletService.getBalance(userId);
    }

    @ApiOperation({
        summary: "Deposit money to the authenticated user's own balance",
    })
    @ApiHeader({ name: "Idempotency-Key", required: true })
    @ApiCreatedResponse({ type: TransferResponseDto })
    @ApiBadRequestResponse({
        description: "Invalid amount or missing Idempotency-Key",
    })
    @ApiUnauthorizedResponse({
        description: "Not authenticated or account deleted",
    })
    @ApiConflictResponse({
        description: "Balance limit exceeded or idempotency key reused",
    })
    @Post("deposits")
    async deposit(
        @CurrentUser("userId") userId: string,
        @IdempotencyKeyHeader() idempotencyKey: string,
        @Body() dto: DepositDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<TransferResponseDto> {
        const { transfer, replayed } = await this.walletService.deposit(
            userId,
            dto,
            idempotencyKey,
        );

        // повтор тоже отдает код 201
        if (replayed) {
            res.setHeader(IDEMPOTENCY_REPLAYED_HEADER, "true");
        }

        return transfer;
    }

    @ApiOperation({ summary: "Transfer money to another user" })
    @ApiHeader({ name: "Idempotency-Key", required: true })
    @ApiCreatedResponse({ type: TransferResponseDto })
    @ApiBadRequestResponse({
        description:
            "Invalid payload, transfer to self or missing Idempotency-Key",
    })
    @ApiUnauthorizedResponse({
        description: "Not authenticated or account deleted",
    })
    @ApiNotFoundResponse({ description: "Recipient not found" })
    @ApiConflictResponse({
        description:
            "Insufficient funds, balance limit exceeded or idempotency key reused",
    })
    @Post("transfers")
    async transfer(
        @CurrentUser("userId") userId: string,
        @IdempotencyKeyHeader() idempotencyKey: string,
        @Body() dto: TransferDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<TransferResponseDto> {
        const { transfer, replayed } = await this.walletService.transfer(
            userId,
            dto,
            idempotencyKey,
        );

        if (replayed) {
            res.setHeader(IDEMPOTENCY_REPLAYED_HEADER, "true");
        }

        return transfer;
    }
}
