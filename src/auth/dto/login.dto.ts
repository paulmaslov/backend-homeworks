import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "sniper_2004" })
    @IsString()
    @IsNotEmpty({ message: "Login is required" })
    readonly login: string;

    @ApiProperty({ example: "veryStrongPassw0rd" })
    @IsString()
    @IsNotEmpty({ message: "Password is required" })
    readonly password: string;
}
