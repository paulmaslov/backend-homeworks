import * as AWS from "@aws-sdk/client-s3";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

import { IFileService } from "@/providers/files/files.adapter";

import { S3Lib } from "./constants/s3-lib.constant";
import { RemoveFilePayloadDto } from "./dto/remove-file-payload.dto";
import { UploadFilePayloadDto } from "./dto/upload-file-payload.dto";
import { UploadFileResultDto } from "./dto/upload-file-result.dto";
import { RemoveException } from "./exceptions/remove.exception";
import { UploadException } from "./exceptions/upload.exception";

@Injectable()
export class S3Service extends IFileService {
    private readonly bucketName: string;

    constructor(
        @Inject(S3Lib) private readonly S3: AWS.S3,
        config: ConfigService,

        @InjectPinoLogger(S3Service.name)
        private readonly logger: PinoLogger,
    ) {
        super();
        this.bucketName = config.getOrThrow<string>("s3.bucket");
    }

    async uploadFile(dto: UploadFilePayloadDto): Promise<UploadFileResultDto> {
        const { folder, file, name } = dto;
        const path = `${folder}/${name}`;
        const startedAt = Date.now();

        this.logger.debug(
            {
                bucket: this.bucketName,
                path,
                size: file.size,
                mimeType: file.mimetype,
            },
            "Uploading file to bucket",
        );

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
                {
                    err: error,
                    bucket: this.bucketName,
                    path,
                    durationMs: Date.now() - startedAt,
                },
                "File upload failed",
            );
            throw new UploadException(
                error instanceof Error ? error.message : JSON.stringify(error),
            );
        }

        this.logger.debug(
            {
                bucket: this.bucketName,
                path,
                durationMs: Date.now() - startedAt,
            },
            "File uploaded",
        );

        return { path };
    }

    async removeFile(dto: RemoveFilePayloadDto): Promise<void> {
        const { path } = dto;
        const startedAt = Date.now();

        this.logger.debug(
            { bucket: this.bucketName, path },
            "Removing file from bucket",
        );

        try {
            await this.S3.deleteObject({
                Bucket: this.bucketName,
                Key: path,
            });
        } catch (error) {
            this.logger.error(
                {
                    err: error,
                    bucket: this.bucketName,
                    path,
                    durationMs: Date.now() - startedAt,
                },
                "File remove failed",
            );
            throw new RemoveException(
                error instanceof Error ? error.message : JSON.stringify(error),
            );
        }

        this.logger.debug(
            {
                bucket: this.bucketName,
                path,
                durationMs: Date.now() - startedAt,
            },
            "File removed",
        );
    }
}
