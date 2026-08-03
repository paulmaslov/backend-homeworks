import { ApiProperty } from "@nestjs/swagger";

import { Avatar } from "@/features/avatars/avatar.model";
import { buildAvatarUrl } from "@/features/avatars/avatar-url";

export class AvatarResponseDto {
    @ApiProperty({
        format: "uuid",
    })
    readonly id: string;

    @ApiProperty({
        format: "uri",
        description: "Public link to the file in the storage",
        example: "https://cdn.example.com/profiles/8f3c1a2b.jpg",
    })
    readonly url: string;

    @ApiProperty({ format: "date-time" })
    readonly createdAt: Date;

    constructor(avatar: Avatar, publicUrl: string) {
        this.id = avatar.id;
        this.url = buildAvatarUrl(publicUrl, avatar.fileName);
        this.createdAt = avatar.createdAt;
    }
}
