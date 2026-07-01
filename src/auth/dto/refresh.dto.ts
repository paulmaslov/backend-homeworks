import { IsString, IsNotEmpty } from "class-validator";

export class RefreshDto {
    @IsString()
    @IsNotEmpty({ message: "Refresh token is required" })
    readonly refresh_token: string;
}
