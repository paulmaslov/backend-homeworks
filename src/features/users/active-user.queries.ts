import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/sequelize";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import {
    ActiveUser,
    ActiveUsersPage,
    FindActiveUsersParams,
    IActiveUserQueries,
} from "@/features/users/active-user.queries.interface";
import {
    ACTIVE_USER_MIN_AVATARS,
    ACTIVE_USERS_QUERY_TIMEOUT_MS,
} from "@/features/users/user.constants";

interface ActiveUserRow {
    readonly id: string;
    readonly login: string;
    readonly age: number;
    readonly description: string;
    readonly avatarsCount: number;
    readonly lastAvatarId: string;
    readonly lastAvatarFileName: string;
    readonly lastAvatarCreatedAt: Date;
}

@Injectable()
export class ActiveUserQueries implements IActiveUserQueries {
    constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

    async find(params: FindActiveUsersParams): Promise<ActiveUsersPage> {
        const { ageFrom, ageTo, limit, keyset } = params;

        // параметры, которые подставятся в sql запрос
        // запрашиваем на строку больше, чем нужно, если она пришла, значит есть следующая страница
        const bind: (number | string)[] = [ageFrom, ageTo, limit + 1];
        if (keyset) {
            bind.push(keyset.age, keyset.id);
        }

        const rows = await this.sequelize.transaction(async (transaction) => {
            // на случай если клиент пришлет широкий диапазон возраста,
            // и подходящих пользователей нет, либо очень мало,
            // постгрес будет читать все строки индекса
            await this.sequelize.query(
                `SET LOCAL statement_timeout = ${ACTIVE_USERS_QUERY_TIMEOUT_MS}`,
                { transaction, type: QueryTypes.RAW },
            );

            return this.sequelize.query<ActiveUserRow>(
                this.buildSql(Boolean(keyset)),
                { bind, transaction, type: QueryTypes.SELECT },
            );
        });

        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;

        return {
            rows: page.map((row) => this.toActiveUser(row)),
            hasMore,
        };
    }

    private buildSql(withCursor: boolean): string {
        return `
            SELECT u.id,
                   u.login,
                   u.age,
                   u.description,
                   ac.cnt::int    AS "avatarsCount",
                   la.id          AS "lastAvatarId",
                   la."fileName"  AS "lastAvatarFileName",
                   la."createdAt" AS "lastAvatarCreatedAt"
            FROM users u
            JOIN LATERAL (
                SELECT count(*) AS cnt
                FROM avatars a
                WHERE a."userId" = u.id
                  AND a."deletedAt" IS NULL
            ) ac ON ac.cnt >= ${ACTIVE_USER_MIN_AVATARS}
            JOIN LATERAL (
                SELECT a.id, a."fileName", a."createdAt"
                FROM avatars a
                WHERE a."userId" = u.id
                  AND a."deletedAt" IS NULL
                ORDER BY a."createdAt" DESC, a.id DESC
                LIMIT 1
            ) la ON true
            WHERE u."deletedAt" IS NULL
              AND u.description <> ''
              AND u.age BETWEEN $1::smallint AND $2::smallint
              ${withCursor ? "AND (u.age, u.id) > ($4::smallint, $5::uuid)" : ""}
            ORDER BY u.age, u.id
            LIMIT $3::int
        `;
    }

    private toActiveUser(row: ActiveUserRow): ActiveUser {
        return {
            id: row.id,
            login: row.login,
            age: row.age,
            description: row.description,
            avatarsCount: row.avatarsCount,
            lastAvatar: {
                id: row.lastAvatarId,
                fileName: row.lastAvatarFileName,
                createdAt: row.lastAvatarCreatedAt,
            },
        };
    }
}
