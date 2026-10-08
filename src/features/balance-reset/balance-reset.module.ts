import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { BALANCE_RESET_QUEUE } from "@/features/balance-reset/balance-reset.constants";
import { BalanceResetController } from "@/features/balance-reset/balance-reset.controller";
import { BalanceReset } from "@/features/balance-reset/balance-reset.model";
import { BalanceResetProcessor } from "@/features/balance-reset/balance-reset.processor";
import { BalanceResetRepository } from "@/features/balance-reset/balance-reset.repository";
import { IBalanceResetRepository } from "@/features/balance-reset/balance-reset.repository.interface";
import { BalanceResetRunner } from "@/features/balance-reset/balance-reset.runner";
import { BalanceResetScheduler } from "@/features/balance-reset/balance-reset.scheduler";
import { BalanceResetService } from "@/features/balance-reset/balance-reset.service";
import { BalanceResetRun } from "@/features/balance-reset/balance-reset-run.model";
import { UsersModule } from "@/features/users/users.module";

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
