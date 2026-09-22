"use client";

import { useState } from "react";
import type { TodayClass } from "@/db/queries";
import { pickObviousClass } from "@/lib/class-picker";
import { BottomBar } from "./BottomBar";
import { ClassCard } from "./ClassCard";
import { ClassPickerSheet } from "./ClassPickerSheet";
import { LogSheet } from "./LogSheet";
import { NoteSheet } from "./NoteSheet";

type PickerMode = "note" | "log" | null;

export function TodayScreen({ classes }: { classes: TodayClass[] }) {
  const [loggingClassId, setLoggingClassId] = useState<string | null>(null);
  const [notingClassId, setNotingClassId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const loggingClass = classes.find((c) => c.class.id === loggingClassId);
  const notingClass = classes.find((c) => c.class.id === notingClassId);

  function startCatchNote() {
    const obvious = pickObviousClass(classes);
    if (obvious) {
      setNotingClassId(obvious.class.id);
    } else {
      setPickerMode("note");
    }
  }

  function startLogClass() {
    const obvious = pickObviousClass(classes);
    if (obvious) {
      setLoggingClassId(obvious.class.id);
    } else {
      setPickerMode("log");
    }
  }

  function handlePick(classId: string) {
    if (pickerMode === "note") setNotingClassId(classId);
    if (pickerMode === "log") setLoggingClassId(classId);
    setPickerMode(null);
  }

  return (
    <>
      <main className="mx-auto max-w-lg space-y-4 p-4 pb-28">
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

      <BottomBar onCatchNote={startCatchNote} onLogClass={startLogClass} />

      {pickerMode ? (
        <ClassPickerSheet
          title={pickerMode === "note" ? "Catch a note — which class?" : "Log a class — which one?"}
          classes={classes}
          onPick={handlePick}
          onClose={() => setPickerMode(null)}
        />
      ) : null}
      {loggingClass ? (
        <LogSheet data={loggingClass} onClose={() => setLoggingClassId(null)} />
      ) : null}
      {notingClass ? (
        <NoteSheet data={notingClass} onClose={() => setNotingClassId(null)} />
      ) : null}
    </>
  );
}
