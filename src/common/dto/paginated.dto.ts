import { ApiProperty } from "@nestjs/swagger";

export class PaginationMeta {
    @ApiProperty({
        description: "Total rows matching the filter",
        example: 137,
    })
    readonly total: number;

    @ApiProperty({ description: "Current page, 1-based", example: 1 })
    readonly page: number;

    @ApiProperty({ description: "Requested page size", example: 20 })
    readonly limit: number;

    @ApiProperty({ example: 7 })
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
