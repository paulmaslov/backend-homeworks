import { applyDecorators } from "@nestjs/common";
import {
    ApiInternalServerErrorResponse,
    ApiTooManyRequestsResponse,
} from "@nestjs/swagger";

import { ErrorResponseDto } from "@/common/dto/error-response.dto";

export const ApiCommonResponses = () =>
    applyDecorators(
        ApiTooManyRequestsResponse({
            type: ErrorResponseDto,
            description: "Rate limit exceeded",
        }),
        ApiInternalServerErrorResponse({
            type: ErrorResponseDto,
            description: "Unexpected server error",
        }),
    );
