import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { IUserRepository } from "./user.repository.interface";
import { UserRepository } from "./user.repository";
import { User } from "./user.model";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

@Module({
    imports: [SequelizeModule.forFeature([User])],
    controllers: [UserController],
    providers: [
        { provide: IUserRepository, useClass: UserRepository },
        UserService,
    ],
    exports: [IUserRepository, UserService],
})
export class UsersModule {}
