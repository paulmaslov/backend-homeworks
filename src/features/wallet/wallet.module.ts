import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { UsersModule } from "@/features/users/users.module";
import { IdempotencyRepository } from "@/features/wallet/idempotency.repository";
import { IIdempotencyRepository } from "@/features/wallet/idempotency.repository.interface";
import { IdempotencyCleanupService } from "@/features/wallet/idempotency-cleanup.service";
import { IdempotencyKey } from "@/features/wallet/idempotency-key.model";
import { Transfer } from "@/features/wallet/transfer.model";
import { TransferRepository } from "@/features/wallet/transfer.repository";
import { ITransferRepository } from "@/features/wallet/transfer.repository.interface";
import { WalletController } from "@/features/wallet/wallet.controller";
import { WalletService } from "@/features/wallet/wallet.service";

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
