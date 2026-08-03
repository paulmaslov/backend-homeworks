import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/sequelize";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Transaction, UniqueConstraintError } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { IUserRepository } from "@/features/users/user.repository.interface";
import { rethrowCheckViolation } from "@/features/wallet/check-balance-constraints-violation";
import { BalanceResponseDto } from "@/features/wallet/dto/balance-response.dto";
import { DepositDto } from "@/features/wallet/dto/deposit.dto";
import { TransferDto } from "@/features/wallet/dto/transfer.dto";
import { TransferResponseDto } from "@/features/wallet/dto/transfer-response.dto";
import { IIdempotencyRepository } from "@/features/wallet/idempotency.repository.interface";
import { buildRequestHash } from "@/features/wallet/request-hash";
import { ITransferRepository } from "@/features/wallet/transfer.repository.interface";
import {
    WALLET_ENDPOINTS,
    WALLET_ERROR_CODES,
    WalletEndpoint,
} from "@/features/wallet/wallet.constants";

export interface WalletOperationResult {
    readonly transfer: TransferResponseDto;
    readonly replayed: boolean;
}

@Injectable()
export class WalletService {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly transferRepository: ITransferRepository,
        private readonly idempotencyRepository: IIdempotencyRepository,
        @InjectConnection() private readonly sequelize: Sequelize,

        @InjectPinoLogger(WalletService.name)
        private readonly logger: PinoLogger,
    ) {}

    async getBalance(userId: string): Promise<BalanceResponseDto> {
        const balance = await this.userRepository.findBalance(userId);

        if (balance === null) {
            this.logger.warn(
                { userId },
                "Balance requested for a deleted account",
            );
            throw new UnauthorizedException({
                code: WALLET_ERROR_CODES.ACCOUNT_DELETED,
                message: "Account has been deleted",
            });
        }

        return new BalanceResponseDto(balance);
    }

    //  самопополнение было сделано для тестирования функции
    // в настоящей системе деньги бы приходили через платежного провайдера
    async deposit(
        userId: string,
        dto: DepositDto,
        idempotencyKey: string,
    ): Promise<WalletOperationResult> {
        const requestHash = buildRequestHash(
            WALLET_ENDPOINTS.DEPOSITS,
            dto.amount,
            null,
        );

        try {
            const transfer = await this.sequelize.transaction(
                async (transaction) => {
                    // ключ пишем в той же транзакции, что и операцию, и вся
                    // защита держится на ограничении уникальности ключа, явной проверки
                    // занят ли ключ нет намеренно - она была бы гонкой сама
                    // по себе - проверил свободен, а пока выполнял, его занял другой
                    const record = await this.idempotencyRepository.create(
                        {
                            userId,
                            endpoint: WALLET_ENDPOINTS.DEPOSITS,
                            key: idempotencyKey,
                            requestHash,
                        },
                        transaction,
                    );

                    const credited = await this.userRepository.credit(
                        userId,
                        dto.amount,
                        transaction,
                    );

                    // если пытаемся пополнить кошелек удаленного аккаунта
                    if (!credited) {
                        this.logger.warn(
                            { userId, amount: dto.amount },
                            "Deposit to a deleted account",
                        );
                        throw new UnauthorizedException({
                            code: WALLET_ERROR_CODES.ACCOUNT_DELETED,
                            message: "Account has been deleted",
                        });
                    }

                    const created = await this.transferRepository.create(
                        {
                            fromUserId: null,
                            toUserId: userId,
                            amount: dto.amount,
                        },
                        transaction,
                    );

                    await this.idempotencyRepository.attachTransfer(
                        record.id,
                        created.id,
                        transaction,
                    );

                    return created;
                },
            );

            this.logger.info(
                { userId, transferId: transfer.id, amount: transfer.amount },
                "Deposit completed",
            );

            return {
                transfer: new TransferResponseDto(transfer),
                replayed: false,
            };
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                return this.replay(
                    userId,
                    WALLET_ENDPOINTS.DEPOSITS,
                    idempotencyKey,
                    requestHash,
                );
            }
            // проверяем, нед ли выхода за пределы допустимого диапазона баланса
            rethrowCheckViolation(error);
        }
    }

    async transfer(
        fromUserId: string,
        dto: TransferDto,
        idempotencyKey: string,
    ): Promise<WalletOperationResult> {
        if (fromUserId === dto.toUserId) {
            this.logger.debug({ fromUserId }, "Self transfer rejected");
            throw new BadRequestException({
                code: WALLET_ERROR_CODES.SELF_TRANSFER_FORBIDDEN,
                message: "Cannot transfer to yourself",
            });
        }

        const requestHash = buildRequestHash(
            WALLET_ENDPOINTS.TRANSFERS,
            dto.amount,
            dto.toUserId,
        );

        try {
            const transfer = await this.sequelize.transaction(
                async (transaction) => {
                    await this.lockParticipants(
                        fromUserId,
                        dto.toUserId,
                        transaction,
                    );

                    // создаем запись с ключом идемпотентности после лока
                    // фор апдейт на пользователях, тк в модели ключей
                    // идемпотентности есть fk на пользователе - при вставке
                    // строки с новым ключом идемпотентности на строке с пользователем
                    // берется for key share лок, который конфликтует с for update локом
                    const record = await this.idempotencyRepository.create(
                        {
                            userId: fromUserId,
                            endpoint: WALLET_ENDPOINTS.TRANSFERS,
                            key: idempotencyKey,
                            requestHash,
                        },
                        transaction,
                    );

                    const debited = await this.userRepository.debit(
                        fromUserId,
                        dto.amount,
                        transaction,
                    );

                    if (!debited) {
                        this.logger.warn(
                            { fromUserId, amount: dto.amount },
                            "Insufficient funds",
                        );
                        throw new ConflictException({
                            code: WALLET_ERROR_CODES.INSUFFICIENT_FUNDS,
                            message: "Insufficient funds",
                        });
                    }

                    const credited = await this.userRepository.credit(
                        dto.toUserId,
                        dto.amount,
                        transaction,
                    );

                    // сейчас проверка проходит всегда из-за блокировки lockParticipants, но
                    // эта гарантия в другом методе и если при рефакторинге ее
                    // уберут, деньги могут списаться и не дойти
                    if (!credited) {
                        this.logger.error(
                            {
                                fromUserId,
                                toUserId: dto.toUserId,
                                amount: dto.amount,
                            },
                            "Credit affected 0 rows for a locked recipient",
                        );
                        // если мы попали в эту ветку, то порядок блокировок
                        // сломан, поэтому мы обязаны залогировать эту
                        // ошибку в all-exception фильтру
                        throw new Error(
                            `credit affected 0 rows for locked recipient ${dto.toUserId}`,
                        );
                    }

                    const created = await this.transferRepository.create(
                        {
                            fromUserId,
                            toUserId: dto.toUserId,
                            amount: dto.amount,
                        },
                        transaction,
                    );

                    await this.idempotencyRepository.attachTransfer(
                        record.id,
                        created.id,
                        transaction,
                    );

                    return created;
                },
            );

            this.logger.info(
                {
                    fromUserId,
                    toUserId: transfer.toUserId,
                    transferId: transfer.id,
                    amount: transfer.amount,
                },
                "Transfer completed",
            );

            return {
                transfer: new TransferResponseDto(transfer),
                replayed: false,
            };
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                return this.replay(
                    fromUserId,
                    WALLET_ENDPOINTS.TRANSFERS,
                    idempotencyKey,
                    requestHash,
                );
            }

            rethrowCheckViolation(error);
        }
    }

    // блокировки делаем всегда первой операцией и всегда в одном порядке,
    // чтобы защититься от дедлока
    private async lockParticipants(
        fromUserId: string,
        toUserId: string,
        transaction: Transaction,
    ): Promise<void> {
        // лексикографическая сортировка, детерменирована для uuid
        const orderedIds = [fromUserId, toUserId].sort();

        // строго последовательно
        for (const id of orderedIds) {
            const user = await this.userRepository.findByIdForUpdate(
                id,
                transaction,
            );

            // причина зависит от того, чья это строка - у отправителя
            // живой токен на удаленный аккаунт, получателя просто нет.
            // поэтому не используем готовый lockByIdOrFail - он всегда дает 404
            if (!user) {
                if (id === fromUserId) {
                    this.logger.warn(
                        { fromUserId },
                        "Transfer from a deleted account",
                    );
                    throw new UnauthorizedException({
                        code: WALLET_ERROR_CODES.ACCOUNT_DELETED,
                        message: "Account has been deleted",
                    });
                }

                this.logger.debug({ toUserId }, "Recipient not found");
                throw new NotFoundException({
                    code: WALLET_ERROR_CODES.RECIPIENT_NOT_FOUND,
                    message: "Recipient not found",
                });
            }
        }
    }

    // сюда попадаем только по нарушению уникального индекса, то есть когда
    // первая транзакция с этим ключом уже закоммитилась. наша к этому
    // моменту откатилась целиком, поэтому читаем вне транзакции
    private async replay(
        userId: string,
        endpoint: WalletEndpoint,
        idempotencyKey: string,
        requestHash: string,
    ): Promise<WalletOperationResult> {
        const record = await this.idempotencyRepository.findByScope(
            userId,
            endpoint,
            idempotencyKey,
        );

        // тот же ключ с другими параметрами - не повтор, а ошибка клиента:
        // иначе он получил бы в ответ чужую операцию и решил, что его прошла
        if (!record || record.requestHash !== requestHash) {
            this.logger.warn(
                { userId, endpoint, idempotencyKey },
                "Idempotency key reused with different parameters",
            );
            throw new ConflictException({
                code: WALLET_ERROR_CODES.IDEMPOTENCY_KEY_REUSED,
                message: "Idempotency key was used with different parameters",
            });
        }

        const transfer = record.transferId
            ? await this.transferRepository.findById(record.transferId)
            : null;

        // недостижимо: transferId проставляется в той же транзакции, что и
        // операция, поэтому строка ключа без него не коммитится
        // проверку требует компилятор тс-а
        // сюда можно попасть только если кто-то изменил код и сломал это поведение
        // поэтому бросаем просто ошибку, чтобы она попала в all exception фильтр и в логи
        if (!transfer) {
            this.logger.error(
                { userId, endpoint, idempotencyKeyId: record.id },
                "Idempotency key committed without a transfer",
            );
            throw new Error(
                `idempotency key ${record.id} is committed without a transfer`,
            );
        }

        this.logger.info(
            { userId, endpoint, idempotencyKey, transferId: transfer.id },
            "Idempotent replay",
        );

        return {
            transfer: new TransferResponseDto(transfer),
            replayed: true,
        };
    }
}
