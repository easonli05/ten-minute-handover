// The app's two Drizzle drivers support atomicity in opposite ways:
// neon-http (production, src/db/index.ts) has no real db.transaction() — it
// throws "No transactions support in neon-http driver" — but does support
// db.batch(), which sends an array of not-yet-executed queries to Neon as
// one HTTP request, run as a single all-or-nothing Postgres transaction.
// node-postgres (tests / scripts, src/db/pg-client.ts) is the opposite: no
// db.batch(), but a real interactive db.transaction() over its TCP
// connection. This picks whichever primitive the given `db` actually
// supports, so the same calling code gets real atomicity — and is
// testable — under either driver.
//
// `build(handle)` must return queries built against the `handle` it is
// given (not the outer `db`), unexecuted (no `await`, no `.then()`) —
// Drizzle query builders only run when awaited/batched, so building them
// against `handle` and either batching or sequentially awaiting them here
// is what makes this work under both drivers.
//
// The two drivers' `batch`/`transaction` methods have genuinely different,
// non-overlapping signatures (Drizzle doesn't export a shared interface for
// "supports one atomic-write primitive or the other"), so the runtime
// feature-detection below goes through a narrow, contained `any` rather
// than fighting the type checker over two incompatible concrete types —
// `Handle` (what callers actually see) is still inferred normally from the
// `db` argument at each call site.
export async function runAtomically<Handle>(
  db: Handle,
  build: (handle: Handle) => unknown[],
): Promise<void> {
  const dynamic = db as unknown as {
    batch?: (queries: unknown[]) => Promise<unknown>;
    transaction?: (cb: (tx: Handle) => Promise<void>) => Promise<void>;
  };

  if (typeof dynamic.batch === "function") {
    const queries = build(db);
    if (queries.length === 0) return;
    await dynamic.batch(queries);
    return;
  }

  if (typeof dynamic.transaction !== "function") {
    throw new Error("runAtomically: db supports neither batch() nor transaction()");
  }

  await dynamic.transaction(async (tx) => {
    for (const query of build(tx)) {
      await query;
    }
  });
}
