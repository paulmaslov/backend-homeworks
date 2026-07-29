import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";

import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";

import {
    userCacheKey,
    USERS_LIST_VERSION_KEY,
    USERS_LIST_VERSION_TTL_MS,
    usersListCacheKey,
} from "./user-cache.keys";

// слой общения с редисом
@Injectable()
export class UserCache {
    private readonly ttlMs: number;

    constructor(
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        config: ConfigService,
    ) {
        this.ttlMs = config.getOrThrow<number>("cache.userTtlMs");
    }

    async wrapProfile<T>(userId: string, load: () => Promise<T>): Promise<T> {
        return this.wrap(userCacheKey(userId), load);
    }

    // версию читаем до похода в бд: если между этими двумя моментами кто-то
    // изменит пользователей, то мы будем отдавать по свежему ключу
    // устаревший результат
    async wrapList<T>(
        query: ListUsersQueryDto,
        load: () => Promise<T>,
    ): Promise<T> {
        const version = await this.listVersion();
        return this.wrap(usersListCacheKey(version, query), load);
    }

    async invalidateProfile(userId: string): Promise<void> {
        const key = userCacheKey(userId);

        try {
            await this.cache.del(key);
        } catch (error) {
            console.warn(`Failed to invalidate cache key ${key}`, error);
        }
    }

    // новое поколение - текущее время всегда больше предыдущего, поэтому
    // кэши со списками пользователей прошлых версий становятся
    // недостижимыми и истекают сами
    async invalidateList(): Promise<void> {
        await this.set(
            USERS_LIST_VERSION_KEY,
            Date.now(),
            USERS_LIST_VERSION_TTL_MS,
        );
    }

    private async wrap<T>(key: string, load: () => Promise<T>): Promise<T> {
        const cached = await this.cache.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await load();
        await this.set(key, value, this.ttlMs);

        return value;
    }

    private async listVersion(): Promise<number> {
        const version = await this.cache.get<number>(USERS_LIST_VERSION_KEY);
        if (version !== undefined) {
            return version;
        }

        // версии ещё нет (первый запрос) либо редис недоступен - заводим новую
        // если редис упал запись тоже не пройдёт, и каждый запрос
        // просто пойдёт мимо кэша
        const initial = Date.now();
        await this.set(
            USERS_LIST_VERSION_KEY,
            initial,
            USERS_LIST_VERSION_TTL_MS,
        );

        return initial;
    }

    private async set<T>(key: string, value: T, ttl: number): Promise<void> {
        try {
            await this.cache.set(key, value, ttl);
        } catch (error) {
            console.warn(`Failed to write cache key ${key}`, error);
        }
    }
}
