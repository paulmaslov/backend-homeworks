export default async function globalTeardown(): Promise<void> {
    await Promise.all([
        globalThis.__MONGO_CONTAINER__?.stop(),
        globalThis.__KAFKA_CONTAINER__?.stop(),
    ]);

    console.log("[e2e] Containers are down");
}
