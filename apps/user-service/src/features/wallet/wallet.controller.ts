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

import { ErrorResponseDto } from "@libs/common";

import { ApiCommonResponses } from "@user-service/auth/decorators/api-common-responses.decorator";
import { CurrentUser } from "@user-service/auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "@user-service/auth/guards/access-token.guard";
import { BalanceResponseDto } from "@user-service/features/wallet/dto/balance-response.dto";
import { DepositDto } from "@user-service/features/wallet/dto/deposit.dto";
import { TransferDto } from "@user-service/features/wallet/dto/transfer.dto";
import { TransferResponseDto } from "@user-service/features/wallet/dto/transfer-response.dto";
import { IdempotencyKeyHeader } from "@user-service/features/wallet/idempotency-key.decorator";
import { IDEMPOTENCY_REPLAYED_HEADER } from "@user-service/features/wallet/wallet.constants";
import { WalletService } from "@user-service/features/wallet/wallet.service";

@ApiTags("wallet")
@ApiBearerAuth()
@ApiCommonResponses()
@ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Not authenticated or account deleted",
})
@UseGuards(AccessTokenGuard)
@Controller("wallet")
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @ApiOperation({ summary: "Get the authenticated user's balance" })
    @ApiOkResponse({ type: BalanceResponseDto })
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
    @ApiUnauthorizedResponse({
        description: "Not authenticated or account deleted",
    })
    @ApiConflictResponse({
        type: ErrorResponseDto,
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
        type: ErrorResponseDto,
        description:
            "Invalid payload, transfer to self or missing Idempotency-Key",
    })
    @ApiNotFoundResponse({
        type: ErrorResponseDto,
        description: "Recipient not found",
    })
    @ApiConflictResponse({
        type: ErrorResponseDto,
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
