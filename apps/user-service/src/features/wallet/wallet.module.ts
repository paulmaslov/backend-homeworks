import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { UsersModule } from "@user-service/features/users/users.module";
import { IdempotencyRepository } from "@user-service/features/wallet/idempotency.repository";
import { IIdempotencyRepository } from "@user-service/features/wallet/idempotency.repository.interface";
import { IdempotencyCleanupService } from "@user-service/features/wallet/idempotency-cleanup.service";
import { IdempotencyKey } from "@user-service/features/wallet/idempotency-key.model";
import { Transfer } from "@user-service/features/wallet/transfer.model";
import { TransferRepository } from "@user-service/features/wallet/transfer.repository";
import { ITransferRepository } from "@user-service/features/wallet/transfer.repository.interface";
import { WalletController } from "@user-service/features/wallet/wallet.controller";
import { WalletService } from "@user-service/features/wallet/wallet.service";

@Module({
    imports: [
        SequelizeModule.forFeature([Transfer, IdempotencyKey]),
        UsersModule,
    ],
    controllers: [WalletController],
    providers: [
        { provide: ITransferRepository, useClass: TransferRepository },
        { provide: IIdempotencyRepository, useClass: IdempotencyRepository },
        WalletService,
        IdempotencyCleanupService,
    ],
})
export class WalletModule {}
