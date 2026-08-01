import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/sequelize";
import { literal, Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { BaseRepository } from "@/common/repositories/base.repository";

import { User } from "./user.model";
import {
    CreateUserData,
    FindUsersParams,
    IUserRepository,
    UpdateUserData,
    UserToReset,
} from "./user.repository.interface";

@Injectable()
export class UserRepository
    extends BaseRepository<User>
    implements IUserRepository
{
    constructor(
        @InjectModel(User) model: typeof User,
        @InjectConnection() private readonly sequelize: Sequelize,
    ) {
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

    async findByIdForUpdate(
        id: string,
        transaction: Transaction,
    ): Promise<User | null> {
        return this.model.findByPk(id, {
            transaction,
            lock: Transaction.LOCK.UPDATE,
        });
    }

    async debit(
        id: string,
        amount: string,
        transaction: Transaction,
    ): Promise<boolean> {
        // проверка и вычитание - одна атомарная операция
        const [affected] = await this.model.update(
            {
                balance: literal(
                    `balance - ${this.sequelize.escape(amount)}::numeric`,
                ),
            },
            {
                where: { id, balance: { [Op.gte]: amount } },
                transaction,
            },
        );

        return affected > 0;
    }

    async credit(
        id: string,
        amount: string,
        transaction: Transaction,
    ): Promise<boolean> {
        const [affected] = await this.model.update(
            {
                balance: literal(
                    `balance + ${this.sequelize.escape(amount)}::numeric`,
                ),
            },
            { where: { id }, transaction },
        );

        return affected > 0;
    }

    async findBalance(id: string): Promise<string | null> {
        const user = await this.model.findByPk(id, {
            attributes: ["balance"],
        });

        return user?.balance ?? null;
    }

    async findUserBatchForUpdate(
        afterId: string | null,
        limit: number,
        transaction: Transaction,
    ): Promise<UserToReset[]> {
        return this.model.findAll({
            attributes: ["id", "balance"],
            where: {
                balance: { [Op.gt]: 0 },
                ...(afterId ? { id: { [Op.gt]: afterId } } : {}),
            },
            order: [["id", "ASC"]],
            limit,
            transaction,
            lock: Transaction.LOCK.UPDATE,
        });
    }

    async resetBalances(
        ids: string[],
        transaction: Transaction,
    ): Promise<number> {
        const [affected] = await this.model.update(
            { balance: "0" },
            { where: { id: { [Op.in]: ids } }, transaction },
        );

        return affected;
    }
}
