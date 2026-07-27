import { ApiProperty } from "@nestjs/swagger";

import { AVATAR_FIELD_NAME } from "@/features/avatars/avatars.constants";

export class UploadAvatarDto {
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "Изображение jpeg или png, до 10 МБ",
    })
    [AVATAR_FIELD_NAME]: Express.Multer.File;
}
