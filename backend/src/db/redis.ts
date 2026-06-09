import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });

redis.on("error", (err) => console.error("[redis] error:", err.message));

redis.connect().catch((err) => console.error("[redis] connect failed:", err.message));

export default redis;
