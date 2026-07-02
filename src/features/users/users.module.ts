import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { IUserRepository } from "./user.repository.interface";
import { UserRepository } from "./user.repository";
import { User } from "./user.model";
import { UserService } from "./user.service";
import { UsersController } from "@/features/users/users.controller";
import { RefreshTokenModule } from "@/auth/refresh-token.module";

@Module({
    imports: [SequelizeModule.forFeature([User]), RefreshTokenModule],
    controllers: [UsersController],
    providers: [
        { provide: IUserRepository, useClass: UserRepository },
        UserService,
    ],
    exports: [IUserRepository, UserService],
})
export class UsersModule {}
