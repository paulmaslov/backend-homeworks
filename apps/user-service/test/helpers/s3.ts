import * as AWS from "@aws-sdk/client-s3";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { S3Lib } from "../../src/providers/files/s3/constants/s3-lib.constant";

export const getS3Client = (app: INestApplication): AWS.S3 =>
    app.get<AWS.S3>(S3Lib);

export const getBucketName = (app: INestApplication): string =>
    app.get(ConfigService).getOrThrow<string>("s3.bucket");

export const getPublicUrl = (app: INestApplication): string =>
    app.get(ConfigService).getOrThrow<string>("s3.publicUrl");

// возвращает имена всех файлов в бакете
export async function listObjectKeys(app: INestApplication): Promise<string[]> {
    const listed = await getS3Client(app).listObjectsV2({
        Bucket: getBucketName(app),
    });

    // оставляем только имена, отфильтровываем размер, даты и тд
    return (listed.Contents ?? []).map((object) => object.Key ?? "");
}

export async function readObject(
    app: INestApplication,
    key: string,
): Promise<{ body: Buffer; contentType?: string }> {
    const object = await getS3Client(app).getObject({
        Bucket: getBucketName(app),
        Key: key,
    });

    const bytes = await object.Body?.transformToByteArray();

    return {
        body: Buffer.from(bytes ?? new Uint8Array()),
        contentType: object.ContentType,
    };
}

export async function cleanBucket(app: INestApplication): Promise<void> {
    const keys = await listObjectKeys(app);

    if (keys.length === 0) {
        return;
    }

    await getS3Client(app).deleteObjects({
        Bucket: getBucketName(app),
        Delete: { Objects: keys.map((Key) => ({ Key })) },
    });
}
