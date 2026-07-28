import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseError } from "sequelize";

import {
    ActiveUsersPage,
    IActiveUserQueries,
} from "@/features/users/active-user.queries.interface";
import {
    decodeActiveUsersCursor,
    encodeActiveUsersCursor,
} from "@/features/users/active-users-cursor";
import {
    ActiveUserResponseDto,
    ActiveUsersPageResponseDto,
} from "@/features/users/dto/active-user-response.dto";
import { ListActiveUsersQueryDto } from "@/features/users/dto/list-active-users.dto"; // код postgres, который приходит, когда сработал statement_timeout

// код postgres, который приходит, когда сработал statement_timeout
const QUERY_CANCELED = "57014";

function isStatementTimeout(error: unknown): boolean {
    return (
        error instanceof DatabaseError &&
        (error.parent as { code?: string } | undefined)?.code === QUERY_CANCELED
    );
}

// отдельный сервис, тк это другой слой ответственности - не управление аккаунтами как в UserService,
// этот сервис только собирает отчет, ничего не меняет
@Injectable()
export class ActiveUserService {
    private readonly publicUrl: string;

    constructor(
        private readonly activeUserQueries: IActiveUserQueries,
        config: ConfigService,
    ) {
        this.publicUrl = config.getOrThrow<string>("s3.publicUrl");
    }

    async findActive(
        query: ListActiveUsersQueryDto,
    ): Promise<ActiveUsersPageResponseDto> {
        const cursor = query.cursor
            ? decodeActiveUsersCursor(query.cursor)
            : undefined;

        // курсор действителен только внутри той выборки, из которой выдан
        if (
            cursor &&
            (cursor.ageFrom !== query.ageFrom || cursor.ageTo !== query.ageTo)
        ) {
            throw new BadRequestException(
                "Cursor does not match the requested age range",
            );
        }

        let page: ActiveUsersPage;
        try {
            page = await this.activeUserQueries.find({
                ageFrom: query.ageFrom,
                ageTo: query.ageTo,
                limit: query.limit,
                keyset: cursor ? { age: cursor.age, id: cursor.id } : undefined,
            });
        } catch (error) {
            // TODO: посмотреть, какую ошибку отправлять
            if (isStatementTimeout(error)) {
                throw new BadRequestException(
                    "Query took too long, narrow the age range and retry",
                );
            }
            throw error;
        }

        const data = page.rows.map(
            (row) => new ActiveUserResponseDto(row, this.publicUrl),
        );

        // курсор строится по последней отданной строке - с неё
        // продолжит следующий запрос
        const last = page.rows.at(-1);
        const nextCursor =
            page.hasMore && last
                ? encodeActiveUsersCursor({
                      ageFrom: query.ageFrom,
                      ageTo: query.ageTo,
                      age: last.age,
                      id: last.id,
                  })
                : null;

        return new ActiveUsersPageResponseDto(data, nextCursor);
    }
}
