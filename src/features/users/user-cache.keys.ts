import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";

const PREFIX = "users";

export const USERS_LIST_VERSION_KEY = `${PREFIX}:list:version`;

// в качестве версии кэша мы будем использовать временную метку,
// и будем перезаписывать при каждой инвалидации
export const USERS_LIST_VERSION_TTL_MS = 0;

export const userCacheKey = (userId: string): string => {
    return `${PREFIX}:one:${userId}`;
};

export const usersListCacheKey = (
    version: number,
    query: ListUsersQueryDto,
): string => {
    return [
        PREFIX,
        "list",
        `v${version}`,
        query.page,
        query.limit,
        query.search?.toLowerCase() ?? "",
    ].join(":");
};
