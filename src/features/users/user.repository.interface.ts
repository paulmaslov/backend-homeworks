import { Transaction } from "sequelize";

import { User } from "./user.model";

export interface CreateUserData {
    readonly login: string;
    readonly email: string;
    readonly password: string;
    readonly age: number;
    readonly description?: string;
}

export interface FindUsersParams {
    readonly limit: number;
    readonly offset: number;
    readonly search?: string;
}

export interface UpdateUserData {
    readonly login?: string;
    readonly email?: string;
    readonly age?: number;
    readonly description?: string;
}

export abstract class IUserRepository {
    abstract create(
        data: CreateUserData,
        transaction?: Transaction,
    ): Promise<User>;

    abstract update(
        id: string,
        data: UpdateUserData,
        transaction?: Transaction,
    ): Promise<User | null>;

    abstract softDelete(id: string, transaction?: Transaction): Promise<number>;

    abstract findAndCount(
        params: FindUsersParams,
    ): Promise<{ rows: User[]; count: number }>;

    abstract findById(
        id: string,
        transaction?: Transaction,
    ): Promise<User | null>;

    abstract findByIdOrFail(
        id: string,
        transaction?: Transaction,
    ): Promise<User>;

    abstract findByLogin(
        login: string,
        transaction?: Transaction,
    ): Promise<User | null>;

    abstract findByEmail(
        email: string,
        transaction?: Transaction,
    ): Promise<User | null>;
}
