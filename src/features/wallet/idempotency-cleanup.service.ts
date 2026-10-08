import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

import { IIdempotencyRepository } from "@/features/wallet/idempotency.repository.interface";

// удаляем пачками, а не одним чтобы не держать блокировки на
// большом количестве строк
const BATCH_SIZE = 1000;

@Injectable()
export class IdempotencyCleanupService {
    constructor(
        private readonly idempotencyRepository: IIdempotencyRepository,
        private readonly config: ConfigService,

        @InjectPinoLogger(IdempotencyCleanupService.name)
        private readonly logger: PinoLogger,
    ) {}

    async run(): Promise<number> {
        const ttlMs = this.config.getOrThrow<number>("wallet.idempotencyTtlMs");

        // границу считаем один раз иначе каждая итерация гонится
        // за сдвигающимся окном
        const cutoff = new Date(Date.now() - ttlMs);

        let total = 0;
        let deleted = 0;

        do {
            deleted = await this.idempotencyRepository.deleteExpired(
                cutoff,
                BATCH_SIZE,
            );
            total += deleted;

            this.logger.debug(
                { deleted, total },
                "Idempotency keys batch removed",
            );
        } while (deleted === BATCH_SIZE);

        this.logger.info(
            { removed: total, cutoff: cutoff.toISOString() },
            "Idempotency cleanup finished",
        );

        return total;
    }
}
