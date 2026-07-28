import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import {
    ACTIVE_USERS_DEFAULT_PAGE_LIMIT,
    ACTIVE_USERS_MAX_LIMIT,
    MAX_USER_AGE,
    MIN_USER_AGE,
} from "@/features/users/user.constants";

export class ListActiveUsersQueryDto {
    @ApiProperty({ example: 25, minimum: MIN_USER_AGE, maximum: MAX_USER_AGE })
    @Type(() => Number)
    @IsInt()
    @Min(MIN_USER_AGE)
    @Max(MAX_USER_AGE)
    readonly ageFrom: number;

    @ApiProperty({ example: 35, minimum: MIN_USER_AGE, maximum: MAX_USER_AGE })
    @Type(() => Number)
    @IsInt()
    @Min(MIN_USER_AGE)
    @Max(MAX_USER_AGE)
    readonly ageTo: number;

    @ApiPropertyOptional({
        example: 20,
        default: ACTIVE_USERS_DEFAULT_PAGE_LIMIT,
        maximum: ACTIVE_USERS_MAX_LIMIT,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(ACTIVE_USERS_MAX_LIMIT)
    readonly limit: number = ACTIVE_USERS_DEFAULT_PAGE_LIMIT;

    @ApiPropertyOptional({
        description: "Токен следующей страницы, берётся из nextCursor",
    })
    @IsOptional()
    @IsString()
    readonly cursor?: string;
}
