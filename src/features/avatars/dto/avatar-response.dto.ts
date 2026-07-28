import { Avatar } from "@/features/avatars/avatar.model";
import { buildAvatarUrl } from "@/features/avatars/avatar-url";

export class AvatarResponseDto {
    readonly id: string;
    readonly url: string;
    readonly createdAt: Date;

    constructor(avatar: Avatar, publicUrl: string) {
        this.id = avatar.id;
        this.url = buildAvatarUrl(publicUrl, avatar.fileName);
        this.createdAt = avatar.createdAt;
    }
}
