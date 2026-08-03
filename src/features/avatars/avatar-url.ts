import { AVATARS_FOLDER } from "@/features/avatars/avatars.constants";

export function buildAvatarUrl(publicUrl: string, fileName: string): string {
    return `${publicUrl}/${AVATARS_FOLDER}/${fileName}`;
}
