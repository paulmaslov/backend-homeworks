import { createHash } from "node:crypto";

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { createLoggerMock } from "@/common/testing/create-logger-mock";
import { User } from "@/features/users/user.model";
import { UserService } from "@/features/users/user.service";

import { AuthService } from "./auth.service";
import { RefreshToken } from "./refresh-token.model";
import { IRefreshTokenRepository } from "./refresh-token.repository.interface";

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

const sha256 = (raw: string): string =>
    createHash("sha256").update(raw).digest("hex");

describe("AuthService", () => {
    let service: AuthService;
    let userService: jest.Mocked<UserService>;
    let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

    beforeEach(() => {
        // чтобы ощищать счетчик вызовов argon2
        // ниже есть логика, которая опирается на этот счетчик, поэтому его нужно сбрасывать
        jest.clearAllMocks();

        userService = {
            create: jest.fn(),
            findByLogin: jest.fn(),
            findByIdOrFail: jest.fn(),
        } as unknown as jest.Mocked<UserService>;

        refreshTokenRepository = {
            create: jest.fn(),
            findByTokenHash: jest.fn(),
            deleteByTokenHash: jest.fn(),
            deleteByUserId: jest.fn(),
        };

        const jwtService = {
            sign: jest.fn().mockReturnValue("access-token"),
        } as unknown as JwtService;

        const config = {
            getOrThrow: jest.fn().mockReturnValue("7d"),
        } as unknown as ConfigService;

        const sequelize = {
            transaction: jest.fn(
                async (cb: (t: Transaction) => Promise<unknown>) => {
                    const commitHooks: Array<() => void> = [];

                    const result = await cb({
                        afterCommit: (hook: () => void) => {
                            commitHooks.push(hook);
                        },
                    } as unknown as Transaction);

                    // имитируем успешный коммит - хуки выполняются после колбэка,
                    // а не в момент регистрации
                    commitHooks.forEach((hook) => hook());

                    return result;
                },
            ),
        } as unknown as Sequelize;

        service = new AuthService(
            userService,
            refreshTokenRepository,
            jwtService,
            config,
            sequelize,
            createLoggerMock(),
        );
    });

    describe("login", () => {
        it("Throws UnauthorizedException when the user is not found", async () => {
            userService.findByLogin.mockResolvedValue(null);

            await expect(
                service.login({ login: "john", password: "plain" }),
            ).rejects.toThrow(UnauthorizedException);
            expect(argon2.verify).not.toHaveBeenCalled();
        });

        it("Throws UnauthorizedException when the password is invalid", async () => {
            userService.findByLogin.mockResolvedValue(makeUser());
            jest.mocked(argon2.verify).mockResolvedValue(false);

            await expect(
                service.login({ login: "john", password: "wrong" }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("Returns a token pair for valid credentials", async () => {
            userService.findByLogin.mockResolvedValue(makeUser());
            jest.mocked(argon2.verify).mockResolvedValue(true);

            const result = await service.login({
                login: "john",
                password: "correct",
            });

            expect(result.accessToken).toBe("access-token");
            expect(result.refreshToken).toEqual(expect.any(String));
            expect(refreshTokenRepository.create).toHaveBeenCalled();
        });
    });

    describe("refresh", () => {
        it("Throws UnauthorizedException when the token is not found", async () => {
            refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

            await expect(service.refresh("raw-token")).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("Throws UnauthorizedException and deletes an expired token", async () => {
            refreshTokenRepository.findByTokenHash.mockResolvedValue({
                userId: "user-1",
                expiresAt: new Date(Date.now() - 1000),
            } as unknown as RefreshToken);

            await expect(service.refresh("raw-token")).rejects.toThrow(
                UnauthorizedException,
            );
            expect(refreshTokenRepository.deleteByTokenHash).toHaveBeenCalled();
        });

        it("Rotates the token and returns a new pair", async () => {
            refreshTokenRepository.findByTokenHash.mockResolvedValue({
                userId: "user-1",
                expiresAt: new Date(Date.now() + 60000),
            } as unknown as RefreshToken);
            userService.findByIdOrFail.mockResolvedValue(makeUser());

            const result = await service.refresh("raw-token");

            expect(refreshTokenRepository.deleteByTokenHash).toHaveBeenCalled();
            expect(result.accessToken).toBe("access-token");
            expect(result.refreshToken).toEqual(expect.any(String));
        });
    });

    describe("register", () => {
        it("Creates the user and issues a token pair", async () => {
            userService.create.mockResolvedValue(makeUser());

            const result = await service.register({
                login: "john",
                email: "john@example.com",
                password: "plain-password",
                age: 25,
            });

            expect(userService.create).toHaveBeenCalled();
            expect(result.accessToken).toBe("access-token");
            expect(result.refreshToken).toEqual(expect.any(String));
        });
    });

    describe("logout", () => {
        it("Deletes the refresh token by its hash", async () => {
            await service.logout("raw-token");

            expect(
                refreshTokenRepository.deleteByTokenHash,
            ).toHaveBeenCalledWith(sha256("raw-token"));
        });
    });
});
