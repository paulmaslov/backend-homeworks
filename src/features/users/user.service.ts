import {
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { IUserRepository } from "./user.repository.interface";
import { CreateUserDto } from "./dto/create-user.dto";
import { User } from "./user.model";
import * as argon2 from "argon2";
import { Transaction, UniqueConstraintError } from "sequelize";
import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";
import { UserResponseDto } from "@/features/users/dto/user-response.dto";
import { PaginatedDto } from "@/common/dto/paginated.dto";
import { UpdateUserDto } from "@/features/users/dto/update-user.dto";
import { IRefreshTokenRepository } from "@/auth/refresh-token.repository.interface";
import { InjectConnection } from "@nestjs/sequelize";
import { Sequelize } from "sequelize-typescript";

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly refreshTokenRepository: IRefreshTokenRepository,
        @InjectConnection() private readonly sequelize: Sequelize,
    ) {}

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

        try {
            return await this.userRepository.create(
                {
                    login: dto.login,
                    email: dto.email,
                    password: passwordHash,
                    age: dto.age,
                    description: dto.description,
                },
                transaction,
            );
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new ConflictException(
                    "User with such login or email already exists",
                );
            }
            throw error;
        }
    }

    async update(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
        // уникальность логина / почты, исключая себя
        if (dto.login) {
            const existing = await this.userRepository.findByLogin(dto.login);
            if (existing && existing.id !== userId) {
                throw new ConflictException(
                    "User with such login already exists",
                );
            }
        }

        if (dto.email) {
            const existing = await this.userRepository.findByEmail(dto.email);
            if (existing && existing.id !== userId) {
                throw new ConflictException(
                    "User with such email already exists",
                );
            }
        }

        let updated: User | null;
        try {
            updated = await this.userRepository.update(userId, dto);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new ConflictException(
                    "User with such login or email already exists",
                );
            }
            throw error;
        }
        if (!updated) {
            throw new NotFoundException(`User with id ${userId} not found`);
        }
        return new UserResponseDto(updated);
    }

    async remove(userId: string): Promise<void> {
        await this.sequelize.transaction(async (transaction) => {
            const affected = await this.userRepository.softDelete(
                userId,
                transaction,
            );
            if (affected === 0) {
                throw new NotFoundException(`User with id ${userId} not found`);
            }
            await this.refreshTokenRepository.deleteByUserId(
                userId,
                transaction,
            );
        });
    }

    async findAll(
        query: ListUsersQueryDto,
    ): Promise<PaginatedDto<UserResponseDto>> {
        const { page, limit, search } = query;
        const offset = (page - 1) * limit;

        const { rows, count } = await this.userRepository.findAndCount({
            limit,
            offset,
            search,
        });

        // маппим, чтобы не было хеша пароля в ответе
        const data = rows.map((user) => new UserResponseDto(user));
        return new PaginatedDto(data, count, page, limit);
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
