import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

export class SendNotificationDto {
    @IsUUID()
    readonly userId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    readonly message: string;
}
