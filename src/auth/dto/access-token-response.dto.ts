import { ApiProperty } from "@nestjs/swagger";

export class AccessTokenResponseDto {
    @ApiProperty({
        description:
            "Access JWT, the refresh token is sent as an httpOnly cookie",
        example:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwZjRkMmMzZSJ9...",
    })
    readonly accessToken: string;
}
