import sharp, { Sharp } from "sharp";

export type ImageMimeType = "image/jpeg" | "image/png";

const DEFAULT_SIDE = 800;

const createImage = (width: number, height: number): Sharp =>
    sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 10, g: 120, b: 200 },
        },
    });

export function buildImage(
    mimeType: ImageMimeType = "image/png",
    side = DEFAULT_SIDE,
): Promise<Buffer> {
    const image = createImage(side, side);

    return mimeType === "image/jpeg"
        ? image.jpeg().toBuffer()
        : image.png().toBuffer();
}

// картинка с метаданными, чтобы проверить, что они не доходят до бакета
export function buildImageWithExif(): Promise<Buffer> {
    return createImage(DEFAULT_SIDE, DEFAULT_SIDE)
        .withMetadata({ orientation: 6 })
        .jpeg()
        .toBuffer();
}

// мало байт, много пикселе - лимит на размер файла такое не отсекает
export function buildPixelBomb(): Promise<Buffer> {
    return createImage(8000, 7000).png().toBuffer();
}

// корректная сигнатура png, дальше нули:
// пайп такое пропускает, декодировать невозможно
export function buildCorruptImage(size = 1024): Buffer {
    const buffer = Buffer.alloc(size);

    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);

    return buffer;
}

// байты, не совпадающие ни с одной известной сигнатурой
export function buildNotAnImage(size = 1024): Buffer {
    return Buffer.alloc(size, 0x2a);
}
