import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

import { IUploadedMulterFile } from "@/providers/files/s3/interfaces/upload-file.interface";

export class UploadFilePayloadDto {
    @ApiProperty()
    @IsNotEmpty()
    readonly file: IUploadedMulterFile;

    @ApiProperty({
        example: "/profiles/avatars",
    })
    @IsString()
    @IsNotEmpty()
    readonly folder: string;

    @ApiProperty({
        example: "file-name",
    })
    @IsString()
    @IsNotEmpty()
    readonly name: string;
}
