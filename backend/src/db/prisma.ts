import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. Initialize a standard PostgreSQL connection pool
const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL 
});

// 2. Wrap the pool in Prisma's Driver Adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter into the Prisma constructor
export const prisma = new PrismaClient({
    adapter, 
    log: ['warn', 'error'],
});