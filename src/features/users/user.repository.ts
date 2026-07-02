import { BaseRepository } from "@/common/repositories/base.repository";
import {
    CreateUserData,
    FindUsersParams,
    IUserRepository,
    UpdateUserData,
} from "./user.repository.interface";
import { User } from "./user.model";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction } from "sequelize";
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

    async update(
        id: string,
        data: UpdateUserData,
        transaction?: Transaction,
    ): Promise<User | null> {
        const [, rows] = await this.model.update(
            data,
            this.withTx({ where: { id }, returning: true }, transaction),
        );
        return rows[0] ?? null; // null, если юзер не найден (или deleted)
    }

    async softDelete(id: string, transaction?: Transaction): Promise<number> {
        // из-за paranoid destroy ставит deletedAt, а не удаляет физически
        return this.model.destroy(this.withTx({ where: { id } }, transaction));
    }

    async findAndCount(
        params: FindUsersParams,
    ): Promise<{ rows: User[]; count: number }> {
        const where = params.search
            ? { login: { [Op.iLike]: `%${params.search}%` } } // делаем независимым от регистра
            : {};

        return this.model.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["login", "ASC"]], // сортируем для стабильного порядка строк
        });
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
