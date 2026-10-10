import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { RefreshTokenModule } from "@user-service/auth/refresh-token.module";
import { ActiveUserQueries } from "@user-service/features/users/active-user.queries";
import { IActiveUserQueries } from "@user-service/features/users/active-user.queries.interface";
import { ActiveUserService } from "@user-service/features/users/active-user.service";
import { UserCacheService } from "@user-service/features/users/user-cache.service";
import { UsersController } from "@user-service/features/users/users.controller";
import { RedisCacheModule } from "@user-service/providers/cache/redis-cache.module";

import { User } from "./user.model";
import { UserRepository } from "./user.repository";
import { IUserRepository } from "./user.repository.interface";
import { UserService } from "./user.service";

@Module({
    imports: [
        SequelizeModule.forFeature([User]),
        RefreshTokenModule,
        RedisCacheModule,
    ],
    controllers: [UsersController],
    providers: [
        { provide: IUserRepository, useClass: UserRepository },
        { provide: IActiveUserQueries, useClass: ActiveUserQueries },
        UserService,
        ActiveUserService,
        UserCacheService,
    ],
    exports: [IUserRepository, UserService],
})
export class UsersModule {}
