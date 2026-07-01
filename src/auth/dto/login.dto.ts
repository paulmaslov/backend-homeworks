import { IsString, IsNotEmpty } from "class-validator";

export class LoginDto {
    @IsString()
    @IsNotEmpty({ message: "Login is required" })
    readonly login: string;

    @IsString()
    @IsNotEmpty({ message: "Password is required" })
    readonly password: string;
}
