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
    @Type(() => Number)
    @IsInt()
    @Min(1)
    readonly page: number = 1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    readonly limit: number = 20;

    @IsOptional()
    @IsString()
    @MaxLength(50) // login максимум 50 символов в соответствие с моделью пользователя
    readonly search?: string;
}
