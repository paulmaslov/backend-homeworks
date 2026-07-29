import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";

import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";

import {
    USERS_LIST_VERSION_KEY,
    USERS_LIST_VERSION_TTL_MS,
} from "./user-cache.keys";
import { UserCache } from "./user-cache.service";

const TTL_MS = 30_000;

const query: ListUsersQueryDto = { page: 1, limit: 20 };

describe("UserCache", () => {
    let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
    let userCache: UserCache;

    beforeEach(() => {
        cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

        const config = {
            getOrThrow: jest.fn(() => TTL_MS),
        } as unknown as ConfigService;

        userCache = new UserCache(cache as unknown as Cache, config);
    });

    describe("wrapProfile", () => {
        it("Loads from the source and caches the result on a miss", async () => {
            cache.get.mockResolvedValue(undefined);
            const load = jest.fn(() => Promise.resolve({ id: "user-1" }));

            const result = await userCache.wrapProfile("user-1", load);

            expect(result).toEqual({ id: "user-1" });
            expect(load).toHaveBeenCalledTimes(1);
            expect(cache.set).toHaveBeenCalledWith(
                "users:one:user-1",
                { id: "user-1" },
                TTL_MS,
            );
        });

        it("Does not touch the source on a hit", async () => {
            cache.get.mockResolvedValue({ id: "cached" });
            const load = jest.fn(() => Promise.resolve({ id: "fresh" }));

            const result = await userCache.wrapProfile("user-1", load);

            expect(result).toEqual({ id: "cached" });
            expect(load).not.toHaveBeenCalled();
            expect(cache.set).not.toHaveBeenCalled();
        });
    });

    describe("wrapList", () => {
        it("Builds the key from the current version", async () => {
            cache.get.mockImplementation((key: string) =>
                Promise.resolve(
                    key === USERS_LIST_VERSION_KEY ? 1000 : undefined,
                ),
            );
            const load = jest.fn(() => Promise.resolve({ data: [] }));

            await userCache.wrapList(query, load);

            expect(cache.set).toHaveBeenCalledWith(
                "users:list:v1000:1:20:",
                { data: [] },
                TTL_MS,
            );
        });

        it("Starts a new version when there is none yet", async () => {
            cache.get.mockResolvedValue(undefined);
            const load = jest.fn(() => Promise.resolve({ data: [] }));

            await userCache.wrapList(query, load);

            expect(cache.set).toHaveBeenCalledWith(
                USERS_LIST_VERSION_KEY,
                expect.any(Number),
                USERS_LIST_VERSION_TTL_MS,
            );
        });
    });

    describe("invalidateList", () => {
        it("Writes a version not smaller than the current time", async () => {
            const before = Date.now();

            await userCache.invalidateList();

            const [key, value] = cache.set.mock.calls[0] as [string, number];
            expect(key).toBe(USERS_LIST_VERSION_KEY);
            expect(value).toBeGreaterThanOrEqual(before);
        });
    });

    describe("when redis is unavailable", () => {
        let warn: jest.SpyInstance;

        beforeEach(() => {
            // мы специально делаем сервис кеша недоступным,
            // поэтому скрываем лог ошибки из вывода, чтобы не засорять его
            warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("Still returns the data loaded from the source", async () => {
            cache.get.mockResolvedValue(undefined);
            cache.set.mockRejectedValue(new Error("connection refused"));
            const load = jest.fn(() => Promise.resolve({ id: "user-1" }));

            await expect(
                userCache.wrapProfile("user-1", load),
            ).resolves.toEqual({ id: "user-1" });
            expect(warn).toHaveBeenCalled();
        });

        it("Does not break invalidation", async () => {
            cache.del.mockRejectedValue(new Error("connection refused"));

            await expect(
                userCache.invalidateProfile("user-1"),
            ).resolves.toBeUndefined();
            expect(warn).toHaveBeenCalled();
        });
    });
});
