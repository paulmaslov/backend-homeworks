import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { Cache } from "cache-manager";

export async function cleanCache(app: INestApplication): Promise<void> {
    await app.get<Cache>(CACHE_MANAGER).clear();
}
