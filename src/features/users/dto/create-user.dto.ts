import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
    IsEmail,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";

export class CreateUserDto {
    @ApiProperty({ example: "john" })
    @IsString()
    @MinLength(3, { message: "Login should not be shorter than 3 symbols" })
    @MaxLength(50, { message: "Login should not be longer than 50 symbols" })
    readonly login: string;

    @ApiProperty({ example: "john@example.com" })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: "Incorrect email" })
    @MaxLength(255)
    readonly email: string;

    @ApiProperty({ example: "strongPassw0rd", minLength: 8, maxLength: 128 })
    @IsString()
    @MinLength(8, { message: "Password should not be shorter than 8 symbols" })
    @MaxLength(128, {
        message: "Password should not be longer than 128 symbols",
    })
    readonly password: string;

    @ApiProperty({ example: 25 })
    @IsInt({ message: "Age must be an integer" })
    @Min(14, { message: "Age must be at least 14" })
    @Max(140, { message: "Age must be at most 140" })
    readonly age: number;

    @ApiPropertyOptional({ example: "Cool guy, frontend dev" })
    @IsOptional()
    @IsString()
    @MaxLength(1000, { message: "Description must not exceed 1000 symbols" })
    readonly description?: string;
}
