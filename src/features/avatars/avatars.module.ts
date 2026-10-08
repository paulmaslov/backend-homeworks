import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { Avatar } from "@/features/avatars/avatar.model";
import { AvatarRepository } from "@/features/avatars/avatar.repository";
import { IAvatarRepository } from "@/features/avatars/avatar.repository.interface";
import { AvatarService } from "@/features/avatars/avatar.service";
import { AvatarsController } from "@/features/avatars/avatars.controller";
import { UsersModule } from "@/features/users/users.module";
import { FilesModule } from "@/providers/files/files.module";

@Module({
    imports: [SequelizeModule.forFeature([Avatar]), UsersModule, FilesModule],
    controllers: [AvatarsController],
    providers: [
        { provide: IAvatarRepository, useClass: AvatarRepository },
        AvatarService,
    ],
})
export class AvatarsModule {}
