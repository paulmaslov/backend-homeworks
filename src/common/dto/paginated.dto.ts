import { ApiProperty } from "@nestjs/swagger";

export class PaginationMeta {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
}

// дженерик - чтобы класс был переиспользуемым для других сущностей в будущем
export class PaginatedDto<T> {
    @ApiProperty({ type: "array", items: { type: "object" } })
    readonly data: T[];

    @ApiProperty({ type: PaginationMeta })
    readonly meta: PaginationMeta;

    constructor(data: T[], total: number, page: number, limit: number) {
        this.data = data;
        this.meta = {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
