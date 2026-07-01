import {Module} from "@nestjs/common";
import {SequelizeModule} from "@nestjs/sequelize";
import {IUserRepository} from "./user.repository.interface";
import {UserRepository} from "./user.repository";

@Module({
    imports: [SequelizeModule.forFeature([User])],
    providers: [
        { provide: IUserRepository, useClass: UserRepository },
    ],
    exports: [IUserRepository],
})
export class UsersModule