import {
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from "@nestjs/common";
import {
    ApiAcceptedResponse,
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { ApiCommonResponses } from "@/auth/decorators/api-common-responses.decorator";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { ErrorResponseDto } from "@/common/dto/error-response.dto";
import { BalanceResetService } from "@/features/balance-reset/balance-reset.service";
import { BalanceResetResponseDto } from "@/features/balance-reset/dto/balance-reset-response.dto";

@ApiTags("balance-resets")
@ApiBearerAuth()
@ApiCommonResponses()
@ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Not authenticated or account deleted",
})
@UseGuards(AccessTokenGuard)
@Controller("balance-resets")
export class BalanceResetController {
    constructor(private readonly balanceResetService: BalanceResetService) {}

    @ApiOperation({ summary: "Schedule a reset of every user balance" })
    @ApiAcceptedResponse({ type: BalanceResetResponseDto })
    // ресурс на момент ответа не создан, работа отложена в очередь
    @HttpCode(HttpStatus.ACCEPTED)
    @Post()
    async create(): Promise<BalanceResetResponseDto> {
        return await this.balanceResetService.enqueue();
    }
}
