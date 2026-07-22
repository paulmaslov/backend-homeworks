import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class ListUsersQueryDto {
    @ApiPropertyOptional({ example: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    readonly page: number = 1;

    @ApiPropertyOptional({ example: 20, default: 20 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    readonly limit: number = 20;

    @ApiPropertyOptional({ example: "john" })
    @IsOptional()
    @IsString()
    @MaxLength(50) // login максимум 50 символов в соответствие с моделью пользователя
    readonly search?: string;
}
