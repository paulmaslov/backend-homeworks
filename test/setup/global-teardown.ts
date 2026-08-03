export default async function globalTeardown(): Promise<void> {
    await Promise.all([
        globalThis.__POSTGRES_CONTAINER__?.stop(),
        globalThis.__MINIO_CONTAINER__?.stop(),
        globalThis.__REDIS_CONTAINER__?.stop(),
    ]);

    console.log("[e2e] Containers are down");
}
