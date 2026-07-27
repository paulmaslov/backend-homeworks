import { generateFileMock } from "@/providers/files/testing/generate-file-mock";

export type ImageMimeType = "image/jpeg" | "image/png";

export function buildImage(
    mimeType: ImageMimeType = "image/png",
    size = 1024,
): Buffer {
    return generateFileMock({ mimetype: mimeType, size }).buffer;
}

// байты, не совпадающие ни с одной известной сигнатурой
export function buildNotAnImage(size = 1024): Buffer {
    return Buffer.alloc(size, 0x2a);
}
