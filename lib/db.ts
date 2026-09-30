import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  influencerPool?: Pool;
};

export const pool =
  globalForPg.influencerPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 3,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.influencerPool = pool;
}
