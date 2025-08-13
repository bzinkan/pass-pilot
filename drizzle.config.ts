import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL_MIGRATE ??
  process.env.DATABASE_URL ??
  "";

if (!url) {
  throw new Error("Set DATABASE_URL_MIGRATE or DATABASE_URL");
}

export default defineConfig({
  out: "./migrations",            // keep your folder
  schema: "./shared/schema.ts",   // keep your schema path
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});

