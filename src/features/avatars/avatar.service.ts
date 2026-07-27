import { randomUUID } from "node:crypto";

import {
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/sequelize";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { IAvatarRepository } from "@/features/avatars/avatar.repository.interface";
import {
    AVATAR_EXTENSIONS,
    AVATARS_FOLDER,
    MAX_ACTIVE_AVATARS,
} from "@/features/avatars/avatars.constants";
import { AvatarResponseDto } from "@/features/avatars/dto/avatar-response.dto";
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
    ) {
        this.publicUrl = config.getOrThrow<string>("s3.publicUrl");
    }

    async upload(
        userId: string,
        file: Express.Multer.File,
    ): Promise<AvatarResponseDto> {
        await this.checkIfLimitIsReached(userId);
        // имя файла генерируем сами, чтобы не было коллизий
        const fileName = `${randomUUID()}.${AVATAR_EXTENSIONS[file.mimetype]}`;

        // загружаем файл до транзакции, чтобы не держать ее открытой долгое время
        // сирот убираем при ролбэке транзакции
        await this.fileService.uploadFile({
            file,
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
                            mimeType: file.mimetype,
                            size: file.size,
                        },
                        transaction,
                    );
                },
            );

            return new AvatarResponseDto(avatar, this.publicUrl);
        } catch (error) {
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
            // TODO: замени на логгер, когда будешь делать логирование
            console.error(
                `Failed to remove orphaned object ${fileName}`,
                error instanceof Error ? error.stack : String(error),
            );
        }
    }
}
