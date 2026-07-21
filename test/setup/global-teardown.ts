export default async function globalTeardown(): Promise<void> {
    const container = globalThis.__POSTGRES_CONTAINER__;

    if (container) {
        await container.stop();
        console.log("[e2e] Postgres container is down");
    }
}
