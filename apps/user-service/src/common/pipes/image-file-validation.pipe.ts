import {
    BadRequestException,
    Injectable,
    PayloadTooLargeException,
    PipeTransform,
    UnsupportedMediaTypeException,
} from "@nestjs/common";

export interface ImageFileValidationOptions {
    readonly maxSizeBytes: number;
    readonly mimeTypes: string[];
}

// первые байты файла, по которым определяется реальный формат
// проверять так - указано в документации неста про валидацию типов файлов
const SIGNATURES: Record<string, number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

@Injectable()
export class ImageFileValidationPipe implements PipeTransform<
    Express.Multer.File | undefined,
    Express.Multer.File
> {
    constructor(private readonly options: ImageFileValidationOptions) {}

    transform(file?: Express.Multer.File): Express.Multer.File {
        if (!file) {
            throw new BadRequestException("File is required");
        }

        if (file.size > this.options.maxSizeBytes) {
            throw new PayloadTooLargeException(
                `File is too large, maximum size is ${this.options.maxSizeBytes} bytes`,
            );
        }

        if (!this.options.mimeTypes.includes(file.mimetype)) {
            throw new UnsupportedMediaTypeException(
                `Unsupported file type, allowed types: ${this.options.mimeTypes.join(", ")}`,
            );
        }

        if (!this.hasMatchingSignature(file)) {
            throw new UnsupportedMediaTypeException(
                "File content does not match its declared type",
            );
        }

        return file;
    }

    // тип файла приходит от клиента, проверяем, чтобы он совпадал
    // с реальным типом файла
    private hasMatchingSignature(file: Express.Multer.File): boolean {
        const signature = SIGNATURES[file.mimetype];

        if (!signature || file.buffer.length < signature.length) {
            return false;
        }

        return signature.every((byte, index) => file.buffer[index] === byte);
    }
}
