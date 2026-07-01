import { BaseRepository } from "@/common/repositories/base.repository";
import { CreateUserData, IUserRepository } from "./user.repository.interface";
import { User } from "./user.model";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class UserRepository
    extends BaseRepository<User>
    implements IUserRepository
{
    constructor(@InjectModel(User) model: typeof User) {
        super(model);
    }

    async create(
        data: CreateUserData,
        transaction?: Transaction,
    ): Promise<User> {
        return this.model.create(data, this.withTx({}, transaction));
    }

    async findById(
        id: string,
        transaction?: Transaction,
    ): Promise<User | null> {
        return this.model.findByPk(id, this.withTx({}, transaction));
    }

    async findByIdOrFail(id: string, transaction?: Transaction): Promise<User> {
        const user = await this.findById(id, transaction);
        if (!user) {
            throw new NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }

    async findByLogin(
        login: string,
        transaction?: Transaction,
    ): Promise<User | null> {
        return this.model.findOne(
            this.withTx({ where: { login } }, transaction),
        );
    }

    async findByEmail(
        email: string,
        transaction?: Transaction,
    ): Promise<User | null> {
        return this.model.findOne(
            this.withTx({ where: { email } }, transaction),
        );
    }
}
