import { ConflictException, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { Transaction, UniqueConstraintError } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { IRefreshTokenRepository } from "@/auth/refresh-token.repository.interface";

import { CreateUserDto } from "./dto/create-user.dto";
import { User } from "./user.model";
import { IUserRepository } from "./user.repository.interface";
import { UserService } from "./user.service";

jest.mock("argon2");

const makeUser = (overrides: Partial<User> = {}): User =>
    ({
        id: "user-1",
        login: "john",
        email: "john@example.com",
        password: "hashed",
        age: 25,
        description: null,
        ...overrides,
    }) as User;

describe("UserService", () => {
    let service: UserService;
    let userRepository: jest.Mocked<IUserRepository>;
    let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

    beforeEach(() => {
        userRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findByIdOrFail: jest.fn(),
            findByLogin: jest.fn(),
            findByEmail: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
        };

        refreshTokenRepository = {
            create: jest.fn(),
            findByTokenHash: jest.fn(),
            deleteByTokenHash: jest.fn(),
            deleteByUserId: jest.fn(),
        };

        const sequelize = {
            transaction: jest.fn((cb: (t: Transaction) => Promise<unknown>) =>
                cb({} as Transaction),
            ),
        } as unknown as Sequelize;

        service = new UserService(
            userRepository,
            refreshTokenRepository,
            sequelize,
        );

        jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    });

    describe("create", () => {
        const dto = {
            login: "john",
            email: "john@example.com",
            password: "plain-password",
            age: 25,
        } as CreateUserDto;

        it("❌ throws ConflictException when the login already exists", async () => {
            userRepository.findByLogin.mockResolvedValue(makeUser());

            await expect(service.create(dto)).rejects.toThrow(
                ConflictException,
            );
            expect(userRepository.create).not.toHaveBeenCalled();
        });

        it("❌ throws ConflictException when the email already exists", async () => {
            userRepository.findByLogin.mockResolvedValue(null);
            userRepository.findByEmail.mockResolvedValue(makeUser());

            await expect(service.create(dto)).rejects.toThrow(
                ConflictException,
            );
            expect(userRepository.create).not.toHaveBeenCalled();
        });

        it("❌ maps a UniqueConstraintError to ConflictException", async () => {
            userRepository.findByLogin.mockResolvedValue(null);
            userRepository.findByEmail.mockResolvedValue(null);
            userRepository.create.mockRejectedValue(
                new UniqueConstraintError({ errors: [] }),
            );

            await expect(service.create(dto)).rejects.toThrow(
                ConflictException,
            );
        });

        it("✅ hashes the password and stores the hash, not the raw value", async () => {
            userRepository.findByLogin.mockResolvedValue(null);
            userRepository.findByEmail.mockResolvedValue(null);
            const created = makeUser();
            userRepository.create.mockResolvedValue(created);

            const result = await service.create(dto);

            expect(argon2.hash).toHaveBeenCalledWith("plain-password");
            expect(userRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ password: "hashed-password" }),
                undefined,
            );
            expect(result).toBe(created);
        });
    });

    describe("update", () => {
        const userId = "user-1";

        it("❌ throws ConflictException when the login is taken by another user", async () => {
            userRepository.findByLogin.mockResolvedValue(
                makeUser({ id: "other" }),
            );

            await expect(
                service.update(userId, { login: "taken" }),
            ).rejects.toThrow(ConflictException);
        });

        it("❌ throws ConflictException when the email is taken by another user", async () => {
            userRepository.findByEmail.mockResolvedValue(
                makeUser({ id: "other" }),
            );

            await expect(
                service.update(userId, {
                    email: "taken@example.com",
                }),
            ).rejects.toThrow(ConflictException);
        });

        it("❌ throws NotFoundException when the user does not exist", async () => {
            userRepository.update.mockResolvedValue(null);

            await expect(service.update(userId, { age: 30 })).rejects.toThrow(
                NotFoundException,
            );
        });

        it("❌ maps a UniqueConstraintError to ConflictException", async () => {
            userRepository.update.mockRejectedValue(
                new UniqueConstraintError({ errors: [] }),
            );

            await expect(
                service.update(userId, { login: "john" }),
            ).rejects.toThrow(ConflictException);
        });

        it("✅ does not conflict when the login belongs to the same user", async () => {
            userRepository.findByLogin.mockResolvedValue(
                makeUser({ id: userId }),
            );
            userRepository.update.mockResolvedValue(makeUser({ id: userId }));

            await expect(
                service.update(userId, { login: "john" }),
            ).resolves.toBeDefined();
        });

        it("✅ returns a UserResponseDto without the password", async () => {
            userRepository.update.mockResolvedValue(
                makeUser({ password: "secret-hash" }),
            );

            const result = await service.update(userId, {
                age: 30,
            });

            expect(result).not.toHaveProperty("password");
            expect(result.id).toBe("user-1");
        });
    });

    describe("remove", () => {
        it("❌ throws NotFoundException when nothing was deleted", async () => {
            userRepository.softDelete.mockResolvedValue(0);

            await expect(service.remove("user-1")).rejects.toThrow(
                NotFoundException,
            );
            expect(
                refreshTokenRepository.deleteByUserId,
            ).not.toHaveBeenCalled();
        });

        it("✅ soft-deletes the user and revokes refresh tokens", async () => {
            userRepository.softDelete.mockResolvedValue(1);
            refreshTokenRepository.deleteByUserId.mockResolvedValue(2);

            await service.remove("user-1");

            expect(userRepository.softDelete).toHaveBeenCalledWith(
                "user-1",
                expect.anything(),
            );
            expect(refreshTokenRepository.deleteByUserId).toHaveBeenCalledWith(
                "user-1",
                expect.anything(),
            );
        });
    });

    describe("findAll", () => {
        it("✅ computes the offset from page and limit", async () => {
            userRepository.findAndCount.mockResolvedValue({
                rows: [],
                count: 0,
            });

            await service.findAll({ page: 2, limit: 20 });

            expect(userRepository.findAndCount).toHaveBeenCalledWith({
                limit: 20,
                offset: 20,
                search: undefined,
            });
        });

        it("✅ maps rows to UserResponseDto without password and builds meta", async () => {
            userRepository.findAndCount.mockResolvedValue({
                rows: [makeUser({ password: "secret" })],
                count: 1,
            });

            const result = await service.findAll({
                page: 1,
                limit: 20,
            });

            expect(result.data[0]).not.toHaveProperty("password");
            expect(result.meta).toEqual({
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
        });
    });
});
