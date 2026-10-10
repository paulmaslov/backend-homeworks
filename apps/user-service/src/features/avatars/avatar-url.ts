import { AVATARS_FOLDER } from "@user-service/features/avatars/avatars.constants";

export function buildAvatarUrl(publicUrl: string, fileName: string): string {
    return `${publicUrl}/${AVATARS_FOLDER}/${fileName}`;
}
