// A plain `pg` wire-protocol DB client, for tooling that isn't the deployed
// app itself: the seed script and integration tests. The app's own
// src/db/index.ts intentionally uses the Neon HTTP driver (see
// docs/decisions.md), which only speaks to a real Neon endpoint over
// HTTP/WebSocket — it can't reach a local or CI Postgres. This driver works
// against any Postgres, including Neon's own direct connection string, and
// is already a dependency drizzle-kit itself needs for `db:push`/`generate`.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function createPgDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return { db: drizzle(pool, { schema }), pool };
}
