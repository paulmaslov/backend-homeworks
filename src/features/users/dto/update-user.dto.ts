import {
    IsEmail,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    Max,
    MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
    @ApiPropertyOptional({ example: "john" })
    @IsOptional()
    @IsString()
    @MinLength(3, { message: "Login should not be shorter than 3 symbols" })
    @MaxLength(50, { message: "Login should not be longer than 50 symbols" })
    readonly login?: string;

    @ApiPropertyOptional({ example: "john@example.com" })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: "Incorrect email" })
    @MaxLength(255)
    readonly email?: string;

    @ApiPropertyOptional({ example: 26 })
    @IsOptional()
    @IsInt({ message: "Age must be an integer" })
    @Min(14, { message: "Age must be at least 14" })
    @Max(140, { message: "Age must be at most 140" })
    readonly age?: number;

    @ApiPropertyOptional({ example: "Updated bio" })
    @IsOptional()
    @IsString()
    @MaxLength(1000, { message: "Description must not exceed 1000 symbols" })
    readonly description?: string;
}
