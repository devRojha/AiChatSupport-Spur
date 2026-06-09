import redis from "../db/redis.js";

export function normalise(message: string): string {
    return message.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

export async function redisGet(key: string): Promise<string | null> {
    try {
        return await redis.get(key);
    } catch {
        return null;
    }
}

export async function redisSet(key: string, value: string, ttl: number): Promise<void> {
    try {
        await redis.set(key, value, { EX: ttl });
    } catch {}
}
