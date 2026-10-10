import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UploadFileResultDto {
    @ApiProperty({
        example: "/profiles/avatars",
    })
    @IsString()
    @IsNotEmpty()
    readonly path: string;
}
