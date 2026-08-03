import sharp from "sharp";

import {
    AVATAR_MAX_INPUT_PIXELS,
    AVATAR_OUTPUT_MIME_TYPE,
    AVATAR_SIZE_PX,
    AVATAR_WEBP_QUALITY,
} from "@/features/avatars/avatars.constants";

sharp.concurrency(1);

// кэш libvips рассчитан на повторную обработку одних и тех же файлов,
// мы считаем, что у нас каждая аватарка уникальна - это просто удержанная память
sharp.cache(false);

export interface ProcessedAvatar {
    readonly buffer: Buffer;
    readonly mimeType: string;
    readonly size: number;
    readonly width: number;
    readonly height: number;
}

// пересобираем файл из декодированных пикселей: всё, что не пиксели,
// в новый файл не попадает — exif, icc, xmp, дописанный после картинки мусор
export async function processAvatar(input: Buffer): Promise<ProcessedAvatar> {
    const { data, info } = await sharp(input, {
        limitInputPixels: AVATAR_MAX_INPUT_PIXELS,
    })
        // строго до resize - тег ориентации умрет вместе с остальными метаданными,
        .autoOrient()
        .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, {
            fit: "cover",
            withoutEnlargement: true,
        })
        .toColorspace("srgb")
        .webp({ quality: AVATAR_WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });

    return {
        buffer: data,
        mimeType: AVATAR_OUTPUT_MIME_TYPE,
        size: info.size,
        width: info.width,
        height: info.height,
    };
}
