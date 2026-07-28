import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { RefreshTokenModule } from "@/auth/refresh-token.module";
import { ActiveUserQueries } from "@/features/users/active-user.queries";
import { IActiveUserQueries } from "@/features/users/active-user.queries.interface";
import { ActiveUserService } from "@/features/users/active-user.service";
import { UsersController } from "@/features/users/users.controller";

import { User } from "./user.model";
import { UserRepository } from "./user.repository";
import { IUserRepository } from "./user.repository.interface";
import { UserService } from "./user.service";

@Module({
    imports: [SequelizeModule.forFeature([User]), RefreshTokenModule],
    controllers: [UsersController],
    providers: [
        { provide: IUserRepository, useClass: UserRepository },
        { provide: IActiveUserQueries, useClass: ActiveUserQueries },
        UserService,
        ActiveUserService,
    ],
    exports: [IUserRepository, UserService],
})
export class UsersModule {}
