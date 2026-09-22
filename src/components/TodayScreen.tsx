"use client";

import { useState } from "react";
import type { TodayClass } from "@/db/queries";
import { ClassCard } from "./ClassCard";
import { LogSheet } from "./LogSheet";
import { NoteSheet } from "./NoteSheet";

export function TodayScreen({ classes }: { classes: TodayClass[] }) {
  const [loggingClassId, setLoggingClassId] = useState<string | null>(null);
  const [notingClassId, setNotingClassId] = useState<string | null>(null);

  const loggingClass = classes.find((c) => c.class.id === loggingClassId);
  const notingClass = classes.find((c) => c.class.id === notingClassId);

  return (
    <>
      <main className="mx-auto max-w-lg space-y-4 p-4 pb-10">
        <h1 className="px-1 text-xl font-semibold">Today</h1>
        {classes.length === 0 ? (
          <p className="px-1 text-sm text-muted">
            No classes yet. Add one to get started.
          </p>
        ) : (
          classes.map((data) => (
            <ClassCard
              key={data.class.id}
              data={data}
              onLog={() => setLoggingClassId(data.class.id)}
              onNote={() => setNotingClassId(data.class.id)}
            />
          ))
        )}
      </main>

      {loggingClass ? (
        <LogSheet data={loggingClass} onClose={() => setLoggingClassId(null)} />
      ) : null}
      {notingClass ? (
        <NoteSheet data={notingClass} onClose={() => setNotingClassId(null)} />
      ) : null}
    </>
  );
}
