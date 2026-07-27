export const MAX_ACTIVE_AVATARS = 5;

export const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png"];

// папка внутри бакета, можно менять тк в бд не хранится
export const AVATARS_FOLDER = "profiles";

export const AVATAR_FIELD_NAME = "file";

// расширение файла берём из mime, а не из имени, которое прислал клиент
export const AVATAR_EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
};
