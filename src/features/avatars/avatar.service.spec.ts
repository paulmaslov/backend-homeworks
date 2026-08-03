import {
    ConflictException,
    UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import sharp from "sharp";

import { createLoggerMock } from "@/common/testing/create-logger-mock";
import { Avatar } from "@/features/avatars/avatar.model";
import { IAvatarRepository } from "@/features/avatars/avatar.repository.interface";
import { AvatarService } from "@/features/avatars/avatar.service";
import {
    AVATAR_OUTPUT_EXTENSION,
    AVATAR_OUTPUT_MIME_TYPE,
    AVATARS_FOLDER,
    MAX_ACTIVE_AVATARS,
    MAX_AVATAR_SIZE_BYTES,
} from "@/features/avatars/avatars.constants";
import { User } from "@/features/users/user.model";
import { UserService } from "@/features/users/user.service";
import { IFileService } from "@/providers/files/files.adapter";
import { IUploadedMulterFile } from "@/providers/files/s3/interfaces/upload-file.interface";
import { uuidFileName } from "@/providers/files/testing/file-name-pattern";
import { generateFileMock } from "@/providers/files/testing/generate-file-mock";

const USER_ID = "user-1";
const PUBLIC_URL = "http://storage.test/main";

let imageBuffer: Buffer;

const makeAvatar = (overrides: Partial<Avatar> = {}): Avatar =>
    ({
        id: "avatar-1",
        userId: USER_ID,
        fileName: "generated.webp",
        mimeType: "image/png",
        size: 1024,
        createdAt: new Date(),
        deletedAt: null,
        ...overrides,
    }) as Avatar;

const makeFile = (
    overrides: Partial<IUploadedMulterFile> = {},
): Express.Multer.File =>
    generateFileMock({
        buffer: imageBuffer,
        size: imageBuffer.length,
        ...overrides,
    }) as Express.Multer.File;

// сигнатура png и нули: пайп такое пропускает, sharp декодировать не может
const makeBrokenFile = (): Express.Multer.File =>
    generateFileMock() as Express.Multer.File;

describe("AvatarService", () => {
    let service: AvatarService;
    let avatarRepository: jest.Mocked<IAvatarRepository>;
    let fileService: jest.Mocked<IFileService>;
    let userService: jest.Mocked<Pick<UserService, "lockByIdOrFail">>;

    beforeAll(async () => {
        imageBuffer = await sharp({
            create: {
                width: 800,
                height: 800,
                channels: 3,
                background: { r: 10, g: 120, b: 200 },
            },
        })
            .png()
            .toBuffer();
    });

    beforeEach(() => {
        avatarRepository = {
            create: jest.fn(),
            countActiveByUserId: jest.fn(),
            softDeleteOwned: jest.fn(),
        };

        fileService = {
            uploadFile: jest.fn(),
            removeFile: jest.fn(),
        };

        userService = {
            lockByIdOrFail: jest.fn(),
        };

        // настоящий откат проверяется в е2е
        const sequelize = {
            transaction: jest.fn((cb: (t: Transaction) => Promise<unknown>) =>
                cb({} as Transaction),
            ),
        } as unknown as Sequelize;

        // читается в конструкторе, поэтому готовим до создания сервиса
        const config = {
            getOrThrow: jest.fn(() => PUBLIC_URL),
        } as unknown as ConfigService;

        service = new AvatarService(
            avatarRepository,
            userService as unknown as UserService,
            fileService,
            sequelize,
            config,
            createLoggerMock(),
        );

        userService.lockByIdOrFail.mockResolvedValue({ id: USER_ID } as User);
        avatarRepository.countActiveByUserId.mockResolvedValue(0);
        avatarRepository.create.mockResolvedValue(makeAvatar());
        fileService.uploadFile.mockResolvedValue({ path: "some/path" });
    });

    describe("Upload", () => {
        it("Rejects when the limit is reached", async () => {
            avatarRepository.countActiveByUserId.mockResolvedValue(
                MAX_ACTIVE_AVATARS,
            );

            await expect(service.upload(USER_ID, makeFile())).rejects.toThrow(
                ConflictException,
            );
        });

        it("Does not touch the storage when the limit is reached", async () => {
            avatarRepository.countActiveByUserId.mockResolvedValue(
                MAX_ACTIVE_AVATARS,
            );

            await expect(service.upload(USER_ID, makeFile())).rejects.toThrow(
                ConflictException,
            );

            expect(fileService.uploadFile).not.toHaveBeenCalled();
        });

        it("Rejects when the image cannot be decoded", async () => {
            await expect(
                service.upload(USER_ID, makeBrokenFile()),
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it("Does not touch the storage when the image cannot be decoded", async () => {
            await expect(
                service.upload(USER_ID, makeBrokenFile()),
            ).rejects.toThrow(UnprocessableEntityException);

            expect(fileService.uploadFile).not.toHaveBeenCalled();
        });

        it("Names the file with the output extension, not with the one from the request", async () => {
            await service.upload(
                USER_ID,
                makeFile({ mimetype: "image/jpeg", originalname: "photo.png" }),
            );

            const [payload] = avatarRepository.create.mock.calls[0];

            expect(payload.fileName).toMatch(
                uuidFileName(AVATAR_OUTPUT_EXTENSION),
            );
        });

        it("Stores the mime type and size of the processed image, not of the request", async () => {
            await service.upload(
                USER_ID,
                makeFile({
                    mimetype: "image/jpeg",
                    size: MAX_AVATAR_SIZE_BYTES,
                }),
            );

            const [payload] = avatarRepository.create.mock.calls[0];
            const [uploaded] = fileService.uploadFile.mock.calls[0];

            expect(payload.mimeType).toBe(AVATAR_OUTPUT_MIME_TYPE);
            // в бд ровно то, что уехало в бакет
            expect(payload.size).toBe(uploaded.body.length);
            expect(payload.size).toBeLessThan(MAX_AVATAR_SIZE_BYTES);
        });

        it("Removes the uploaded object when the row cannot be created", async () => {
            avatarRepository.create.mockRejectedValue(new Error("db is down"));

            await expect(service.upload(USER_ID, makeFile())).rejects.toThrow(
                "db is down",
            );

            const [payload] = fileService.uploadFile.mock.calls[0];

            // сирота в бакете подчищается компенсацией
            expect(fileService.removeFile).toHaveBeenCalledWith({
                path: `${AVATARS_FOLDER}/${payload.name}`,
            });
        });
    });
});
