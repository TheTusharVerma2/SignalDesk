// Loads DATABASE_URL from .env for Drizzle's CLI commands.
import "dotenv/config";

import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env");
}

export default {
  // TypeScript schema that Drizzle uses to generate SQL migrations.
  schema: "./src/db/schema.ts",

  // Folder where generated SQL migration files will be stored.
  out: "./drizzle",

  // PostgreSQL is the database started by Docker Compose.
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL
  }
} satisfies Config;
