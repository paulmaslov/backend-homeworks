import * as AWS from "@aws-sdk/client-s3";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { IFileService } from "@/providers/files/files.adapter";

import { S3Lib } from "./constants/s3-lib.constant";
import { RemoveFilePayloadDto } from "./dto/remove-file-payload.dto";
import { UploadFilePayloadDto } from "./dto/upload-file-payload.dto";
import { UploadFileResultDto } from "./dto/upload-file-result.dto";
import { RemoveException } from "./exceptions/remove.exception";
import { UploadException } from "./exceptions/upload.exception";

@Injectable()
export class S3Service extends IFileService {
    private readonly logger = new Logger(S3Service.name);
    private readonly bucketName: string;

    constructor(
        @Inject(S3Lib) private readonly S3: AWS.S3,
        config: ConfigService,
    ) {
        super();
        this.bucketName = config.getOrThrow<string>("s3.bucket");
    }

    async uploadFile(dto: UploadFilePayloadDto): Promise<UploadFileResultDto> {
        const { folder, file, name } = dto;
        const path = `${folder}/${name}`;

        this.logger.log("📁 Beginning of uploading file to bucket");

        try {
            // убрал отсюда public read, потому что это дженерик сервис,
            // который может использоваться для загрузки разных файлов
            // и политика доступа определяется уже на бакетах
            await this.S3.putObject({
                Bucket: this.bucketName,
                Key: path,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
        } catch (error) {
            this.logger.error(
                `❌ File upload error with path: ${path}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw new UploadException(
                error instanceof Error ? error.message : JSON.stringify(error),
            );
        }
        return { path };
    }

    async removeFile(dto: RemoveFilePayloadDto): Promise<void> {
        const { path } = dto;

        this.logger.log("🗑️ Beginning of removing file from bucket");

        try {
            await this.S3.deleteObject({
                Bucket: this.bucketName,
                Key: path,
            });
        } catch (error) {
            this.logger.error(
                `❌ File remove error with path: ${path}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw new RemoveException(
                error instanceof Error ? error.message : JSON.stringify(error),
            );
        }
    }
}
