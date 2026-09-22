"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClassDetail } from "@/db/queries";
import { ClassCard } from "./ClassCard";
import { ClassEditSection } from "./ClassEditSection";
import { LogSheet } from "./LogSheet";
import { NoteSheet } from "./NoteSheet";
import { SessionLog } from "./SessionLog";
import { SyllabusSection } from "./SyllabusSection";

export function ClassDetailScreen({ data }: { data: ClassDetail }) {
  const [logging, setLogging] = useState(false);
  const [noting, setNoting] = useState(false);

  return (
    <>
      <main className="mx-auto max-w-lg space-y-4 p-4 pb-10">
        <Link href="/" className="inline-block px-1 text-sm text-muted">
          ← Today
        </Link>

        <ClassCard
          data={data.today}
          onLog={() => setLogging(true)}
          onNote={() => setNoting(true)}
        />

        <SyllabusSection data={data} />
        <SessionLog sessions={data.sessions} />
        <ClassEditSection data={data} />
      </main>

      {logging ? (
        <LogSheet data={data.today} onClose={() => setLogging(false)} />
      ) : null}
      {noting ? (
        <NoteSheet data={data.today} onClose={() => setNoting(false)} />
      ) : null}
    </>
  );
}
