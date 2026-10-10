import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { BALANCE_RESET_QUEUE } from "@user-service/features/balance-reset/balance-reset.constants";
import { BalanceResetController } from "@user-service/features/balance-reset/balance-reset.controller";
import { BalanceReset } from "@user-service/features/balance-reset/balance-reset.model";
import { BalanceResetProcessor } from "@user-service/features/balance-reset/balance-reset.processor";
import { BalanceResetRepository } from "@user-service/features/balance-reset/balance-reset.repository";
import { IBalanceResetRepository } from "@user-service/features/balance-reset/balance-reset.repository.interface";
import { BalanceResetRunner } from "@user-service/features/balance-reset/balance-reset.runner";
import { BalanceResetScheduler } from "@user-service/features/balance-reset/balance-reset.scheduler";
import { BalanceResetService } from "@user-service/features/balance-reset/balance-reset.service";
import { BalanceResetRun } from "@user-service/features/balance-reset/balance-reset-run.model";
import { UsersModule } from "@user-service/features/users/users.module";

@Module({
    imports: [
        SequelizeModule.forFeature([BalanceReset, BalanceResetRun]),
        BullModule.registerQueue({ name: BALANCE_RESET_QUEUE }),
        UsersModule,
    ],
    controllers: [BalanceResetController],
    providers: [
        { provide: IBalanceResetRepository, useClass: BalanceResetRepository },
        BalanceResetService,
        BalanceResetRunner,
        BalanceResetProcessor,
        BalanceResetScheduler,
    ],
})
export class BalanceResetModule {}
