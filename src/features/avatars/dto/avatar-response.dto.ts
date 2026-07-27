import { Avatar } from "@/features/avatars/avatar.model";
import { AVATARS_FOLDER } from "@/features/avatars/avatars.constants";

export class AvatarResponseDto {
    readonly id: string;
    readonly url: string;
    readonly createdAt: Date;

    constructor(avatar: Avatar, publicUrl: string) {
        this.id = avatar.id;
        this.url = `${publicUrl}/${AVATARS_FOLDER}/${avatar.fileName}`;
        this.createdAt = avatar.createdAt;
    }
}
