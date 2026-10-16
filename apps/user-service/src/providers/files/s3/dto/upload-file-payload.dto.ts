export class UploadFilePayloadDto {
    readonly body: Buffer;

    readonly contentType: string;

    readonly folder: string;

    readonly name: string;
}
