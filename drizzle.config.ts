import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    // DATABASE_URL is the standard name; the legacy LOVABLE_DB_MIGRATION_URL
    // is still honoured as a fallback for existing environments.
    url: process.env.DATABASE_URL ?? process.env.LOVABLE_DB_MIGRATION_URL ?? "",
  },
});
