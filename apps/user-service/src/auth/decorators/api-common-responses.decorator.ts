import { applyDecorators } from "@nestjs/common";
import {
    ApiInternalServerErrorResponse,
    ApiTooManyRequestsResponse,
} from "@nestjs/swagger";

import { ErrorResponseDto } from "@libs/common";

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
