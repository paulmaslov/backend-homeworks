import { Transaction } from "sequelize";
import { User } from "./user.model";

export interface CreateUserData {
    login: string;
    email: string;
    password: string;
    age: number;
    description?: string;
}

export interface FindUsersParams {
    limit: number;
    offset: number;
    search?: string;
}

export abstract class IUserRepository {
    abstract create(
        data: CreateUserData,
        transaction?: Transaction,
    ): Promise<User>;

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
