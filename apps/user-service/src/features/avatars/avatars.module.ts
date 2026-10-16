import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { Avatar } from "@user-service/features/avatars/avatar.model";
import { AvatarRepository } from "@user-service/features/avatars/avatar.repository";
import { IAvatarRepository } from "@user-service/features/avatars/avatar.repository.interface";
import { AvatarService } from "@user-service/features/avatars/avatar.service";
import { AvatarsController } from "@user-service/features/avatars/avatars.controller";
import { UsersModule } from "@user-service/features/users/users.module";
import { FilesModule } from "@user-service/providers/files/files.module";

@Module({
    imports: [SequelizeModule.forFeature([Avatar]), UsersModule, FilesModule],
    controllers: [AvatarsController],
    providers: [
        { provide: IAvatarRepository, useClass: AvatarRepository },
        AvatarService,
    ],
})
export class AvatarsModule {}
