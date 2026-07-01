import { ConflictException, Injectable } from "@nestjs/common";
import { IUserRepository } from "./user.repository.interface";
import { CreateUserDto } from "./dto/create-user.dto";
import { User } from "./user.model";
import * as argon2 from "argon2";
import { Transaction } from "sequelize";

@Injectable()
export class UserService {
    constructor(private readonly userRepository: IUserRepository) {}

    async create(dto: CreateUserDto, transaction?: Transaction): Promise<User> {
        const existingByLogin = await this.userRepository.findByLogin(
            dto.login,
            transaction,
        );
        if (existingByLogin) {
            throw new ConflictException("User with such login already exists");
        }

        const existingByEmail = await this.userRepository.findByEmail(
            dto.email,
            transaction,
        );
        if (existingByEmail) {
            throw new ConflictException("User with such email already exists");
        }

        const passwordHash = await argon2.hash(dto.password);

        return this.userRepository.create(
            {
                login: dto.login,
                email: dto.email,
                password: passwordHash,
                age: dto.age,
                description: dto.description,
            },
            transaction,
        );
    }

    async findByLogin(login: string): Promise<User | null> {
        return this.userRepository.findByLogin(login);
    }

    async findByIdOrFail(id: string): Promise<User> {
        return this.userRepository.findByIdOrFail(id);
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findById(id);
    }
}
