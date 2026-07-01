export interface PaginationMeta {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
}

// дженерик - чтобы класс был переиспользуемым для других сущностей в будущем
export class PaginatedDto<T> {
    readonly data: T[];
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
