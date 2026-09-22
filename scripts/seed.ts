// Run with `npm run db:seed`. Inserts one clearly-labelled example class so
// a fresh deploy's Today screen isn't just an empty page — see
// docs/build-brief.md section 5 and docs/decisions.md for why this exists
// ahead of the rest of section 5. Safe to run more than once: the example
// class has a fixed id and the insert is a no-op if it's already there.
import { createPgDb } from "../src/db/pg-client";
import { classes, units } from "../src/db/schema";

const EXAMPLE_CLASS_ID = "example-class";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const { db, pool } = createPgDb(databaseUrl);

  const inserted = await db
    .insert(classes)
    .values({
      id: EXAMPLE_CLASS_ID,
      name: "Example class — edit or delete me",
      level: "B1",
      days: ["Tue", "Thu"],
      startTime: "18:30",
      students: ["Mei", "Tomo", "Andrés"],
    })
    .onConflictDoNothing({ target: classes.id })
    .returning({ id: classes.id });

  if (inserted.length > 0) {
    await db.insert(units).values([
      { classId: EXAMPLE_CLASS_ID, position: 1, title: "Unit 1 — Present simple review" },
      { classId: EXAMPLE_CLASS_ID, position: 2, title: "Unit 2 — Present perfect" },
      { classId: EXAMPLE_CLASS_ID, position: 3, title: "Unit 3 — Articles" },
    ]);
    console.log("Seeded example class with 3 units.");
  } else {
    console.log("Example class already exists — nothing to do.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
