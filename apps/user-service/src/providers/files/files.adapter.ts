import { RemoveFilePayloadDto } from "./s3/dto/remove-file-payload.dto";
import { UploadFilePayloadDto } from "./s3/dto/upload-file-payload.dto";
import { UploadFileResultDto } from "./s3/dto/upload-file-result.dto";

export abstract class IFileService {
    abstract uploadFile(
        dto: UploadFilePayloadDto,
    ): Promise<UploadFileResultDto>;

    abstract removeFile(dto: RemoveFilePayloadDto): Promise<void>;
}
