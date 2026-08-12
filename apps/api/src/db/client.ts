// Loads DATABASE_URL before the PostgreSQL pool is created.
import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env");
}

// The connection pool reuses database connections across API requests.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Future routes and workers will use this typed query client.
export const db = drizzle(pool, { schema });
