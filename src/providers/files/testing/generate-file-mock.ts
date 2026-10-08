import { IUploadedMulterFile } from "@/providers/files/s3/interfaces/upload-file.interface";

const SIGNATURES: Record<string, readonly number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

const DEFAULT_MIME_TYPE = "image/png";
const DEFAULT_SIZE = 1024;

// по умолчанию валидный мок файла, через overrides меняем параметры мока
export function generateFileMock(
    overrides: Partial<IUploadedMulterFile> = {},
): IUploadedMulterFile {
    const mimetype = overrides.mimetype ?? DEFAULT_MIME_TYPE;
    const size = overrides.size ?? DEFAULT_SIZE;

    const buffer = Buffer.alloc(size);
    const signature = SIGNATURES[mimetype];

    if (signature) {
        Buffer.from(signature).copy(buffer);
    }

    return {
        fieldname: "file",
        originalname: "sample.png",
        encoding: "7bit",
        mimetype: mimetype,
        buffer,
        size,
        ...overrides,
    };
}
