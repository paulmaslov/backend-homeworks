export const MAX_ACTIVE_AVATARS = 5;

export const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png"];

// папка внутри бакета, можно менять тк в бд не хранится
export const AVATARS_FOLDER = "profiles";

export const AVATAR_FIELD_NAME = "file";

// сторона квадрата, к которому приводим аватарку
export const AVATAR_SIZE_PX = 512;

export const AVATAR_WEBP_QUALITY = 85;

// потолок по пикселям - защита от decompression бомбы
export const AVATAR_MAX_INPUT_PIXELS = 50_000_000;

export const AVATAR_OUTPUT_MIME_TYPE = "image/webp";

export const AVATAR_OUTPUT_EXTENSION = "webp";
