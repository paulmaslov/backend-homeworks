import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { Avatar } from "@/features/avatars/avatar.model";
import { IAvatarRepository } from "@/features/avatars/avatar.repository.interface";
import { AvatarService } from "@/features/avatars/avatar.service";
import {
    AVATARS_FOLDER,
    MAX_ACTIVE_AVATARS,
} from "@/features/avatars/avatars.constants";
import { User } from "@/features/users/user.model";
import { UserService } from "@/features/users/user.service";
import { IFileService } from "@/providers/files/files.adapter";
import { IUploadedMulterFile } from "@/providers/files/s3/interfaces/upload-file.interface";
import { uuidFileName } from "@/providers/files/testing/file-name-pattern";
import { generateFileMock } from "@/providers/files/testing/generate-file-mock";

const USER_ID = "user-1";
const PUBLIC_URL = "http://storage.test/main";

const makeAvatar = (overrides: Partial<Avatar> = {}): Avatar =>
    ({
        id: "avatar-1",
        userId: USER_ID,
        fileName: "generated.png",
        mimeType: "image/png",
        size: 1024,
        createdAt: new Date(),
        deletedAt: null,
        ...overrides,
    }) as Avatar;

const makeFile = (
    overrides: Partial<IUploadedMulterFile> = {},
): Express.Multer.File => generateFileMock(overrides) as Express.Multer.File;

describe("AvatarService", () => {
    let service: AvatarService;
    let avatarRepository: jest.Mocked<IAvatarRepository>;
    let fileService: jest.Mocked<IFileService>;
    let userService: jest.Mocked<Pick<UserService, "lockByIdOrFail">>;

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

        it("Takes the extension from the mime type, not from originalname", async () => {
            await service.upload(
                USER_ID,
                makeFile({ mimetype: "image/jpeg", originalname: "photo.png" }),
            );

            const [payload] = avatarRepository.create.mock.calls[0];

            expect(payload.fileName).toMatch(uuidFileName("jpg"));
            expect(payload.mimeType).toBe("image/jpeg");
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
