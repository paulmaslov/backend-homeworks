import { ApiProperty } from "@nestjs/swagger";

import { AVATAR_FIELD_NAME } from "@/features/avatars/avatars.constants";

export class UploadAvatarDto {
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "jpeg or png image, up to 10 MB",
    })
    [AVATAR_FIELD_NAME]: Express.Multer.File;
}
