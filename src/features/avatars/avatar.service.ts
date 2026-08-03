import { randomUUID } from "node:crypto";

import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/sequelize";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { IAvatarRepository } from "@/features/avatars/avatar.repository.interface";
import {
    AVATAR_OUTPUT_EXTENSION,
    AVATARS_FOLDER,
    MAX_ACTIVE_AVATARS,
} from "@/features/avatars/avatars.constants";
import { AvatarResponseDto } from "@/features/avatars/dto/avatar-response.dto";
import {
    processAvatar,
    ProcessedAvatar,
} from "@/features/avatars/process-avatar";
import { UserService } from "@/features/users/user.service";
import { IFileService } from "@/providers/files/files.adapter";

@Injectable()
export class AvatarService {
    private readonly publicUrl: string;

    constructor(
        private readonly avatarRepository: IAvatarRepository,
        private readonly userService: UserService,
        private readonly fileService: IFileService,
        @InjectConnection() private readonly sequelize: Sequelize,
        config: ConfigService,

        @InjectPinoLogger(AvatarService.name)
        private readonly logger: PinoLogger,
    ) {
        this.publicUrl = config.getOrThrow<string>("s3.publicUrl");
    }

    async upload(
        userId: string,
        file: Express.Multer.File,
    ): Promise<AvatarResponseDto> {
        await this.checkIfLimitIsReached(userId);

        // дальше везде работаем с пересобранной картинкой,
        // а не с тем, что прислал клиент
        const processed = await this.processImage(userId, file.buffer);

        // имя файла генерируем сами, чтобы не было коллизий
        const fileName = `${randomUUID()}.${AVATAR_OUTPUT_EXTENSION}`;

        // загружаем файл до транзакции, чтобы не держать ее открытой долгое время
        // сирот убираем при ролбэке транзакции
        await this.fileService.uploadFile({
            body: processed.buffer,
            contentType: processed.mimeType,
            folder: AVATARS_FOLDER,
            name: fileName,
        });

        try {
            const avatar = await this.sequelize.transaction(
                async (transaction) => {
                    // блокируем строку пользователя, чтобы избежать параллельной загрузки
                    await this.userService.lockByIdOrFail(userId, transaction);

                    await this.checkIfLimitIsReached(userId, transaction);

                    return await this.avatarRepository.create(
                        {
                            userId,
                            fileName,
                            mimeType: processed.mimeType,
                            size: processed.size,
                        },
                        transaction,
                    );
                },
            );

            this.logger.info(
                {
                    userId,
                    avatarId: avatar.id,
                    fileName,
                    size: processed.size,
                    mimeType: processed.mimeType,
                },
                "Avatar uploaded",
            );

            return new AvatarResponseDto(avatar, this.publicUrl);
        } catch (error) {
            this.logger.warn(
                { userId, fileName },
                "Avatar transaction failed, removing uploaded object",
            );

            await this.removeOrphan(fileName);
            throw error;
        }
    }

    async remove(userId: string, avatarId: string): Promise<void> {
        const affected = await this.avatarRepository.softDeleteOwned(
            avatarId,
            userId,
        );

        // попытка удаления существующей чужой аватарки дает 404, а не 403
        if (affected === 0) {
            throw new NotFoundException(`Avatar with id ${avatarId} not found`);
        }

        this.logger.info({ userId, avatarId }, "Avatar removed");
    }

    private async checkIfLimitIsReached(
        userId: string,
        transaction?: Transaction,
    ): Promise<void> {
        const activeCount = await this.avatarRepository.countActiveByUserId(
            userId,
            transaction,
        );

        if (activeCount >= MAX_ACTIVE_AVATARS) {
            this.logger.debug({ userId, activeCount }, "Avatar limit reached");
            throw new ConflictException(
                `Active avatars limit is ${MAX_ACTIVE_AVATARS}, delete one before uploading a new avatar`,
            );
        }
    }

    private async removeOrphan(fileName: string): Promise<void> {
        try {
            await this.fileService.removeFile({
                path: `${AVATARS_FOLDER}/${fileName}`,
            });
        } catch (error) {
            this.logger.error(
                { err: error, fileName, folder: AVATARS_FOLDER },
                "Failed to remove orphaned object",
            );
        }
    }

    private async processImage(
        userId: string,
        buffer: Buffer,
    ): Promise<ProcessedAvatar> {
        try {
            return await processAvatar(buffer);
        } catch (error) {
            this.logger.debug(
                { err: error, userId },
                "Avatar processing failed",
            );

            throw new UnprocessableEntityException(
                "Image could not be processed",
            );
        }
    }
}
