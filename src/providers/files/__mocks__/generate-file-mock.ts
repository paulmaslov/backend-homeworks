import { IUploadedMulterFile } from "@/providers/files/s3/interfaces/upload-file.interface";

export function generateFileMock(size = 1024 * 1024): IUploadedMulterFile {
    return {
        fieldname: "imageUpload",
        originalname: "sample.jpg",
        encoding: "jpeg",
        mimetype: "image/png",
        buffer: Buffer.alloc(size),
        size,
    };
}
