import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { IIdempotencyRepository } from "@/features/wallet/idempotency.repository.interface";

// удаляем пачками, а не одним чтобы не держать блокировки на
// большом количестве строк
const BATCH_SIZE = 1000;

@Injectable()
export class IdempotencyCleanupService {
    private readonly logger = new Logger(IdempotencyCleanupService.name);

    constructor(
        private readonly idempotencyRepository: IIdempotencyRepository,
        private readonly config: ConfigService,
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
        } while (deleted === BATCH_SIZE);

        this.logger.log(
            `Removed ${total} idempotency keys older than ${cutoff.toISOString()}`,
        );

        return total;
    }
}
