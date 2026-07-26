import * as AWS from "@aws-sdk/client-s3";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { IFileService } from "@/providers/files/files.adapter";

import { S3Lib } from "./constants/do-spaces-service-lib.constant";
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
            await this.S3.putObject({
                Bucket: this.bucketName,
                Key: path,
                Body: file.buffer,
                ACL: "public-read",
                ContentType: file.mimetype,
            });
        } catch (error) {
            this.logger.error(`❌ File upload error with path: ${path}`);
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
            this.logger.error(`❌ File remove error with path: ${path}`);
            throw new RemoveException(
                error instanceof Error ? error.message : JSON.stringify(error),
            );
        }
    }
}
