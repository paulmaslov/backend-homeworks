import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// тело ответа AllExceptionsFilter
export class ErrorResponseDto {
    @ApiProperty({ example: 400 })
    readonly statusCode: number;

    @ApiProperty({ format: "date-time", example: "2026-08-02T10:15:30.123Z" })
    readonly timestamp: string;

    @ApiProperty({ example: "/api/v1/users/me" })
    readonly path: string;

    @ApiProperty({
        description: "Error message or a list of validation errors",
        oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
        ],
        example: ["Age must be an integer"],
    })
    readonly message: string | string[];

    @ApiPropertyOptional({
        description:
            "Stable error code for programmatic handling. Use 'message' for display",
        example: "INSUFFICIENT_FUNDS",
    })
    readonly code?: string;

    @ApiPropertyOptional({ example: "Bad Request" })
    readonly error?: string;
}
