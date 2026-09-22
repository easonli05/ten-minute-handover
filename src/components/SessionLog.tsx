import type { ClassDetail } from "@/db/queries";
import { formatTaught } from "@/lib/date";

export function SessionLog({ sessions }: { sessions: ClassDetail["sessions"] }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold">Class log</h2>
      {sessions.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No sessions logged yet.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {sessions.map((session) => (
            <li key={session.id} className="border-t border-surface-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-xs font-medium text-muted">
                {session.date} · {formatTaught(session.date)}
              </p>
              {session.covered ? (
                <p className="mt-1 text-sm">
                  <span className="font-medium">Covered: </span>
                  {session.covered}
                </p>
              ) : null}
              {session.stuck ? (
                <p className="mt-1 text-sm">
                  <span className="font-medium">Stuck: </span>
                  {session.stuck}
                </p>
              ) : null}
              {session.nextOpener ? (
                <p className="mt-1 text-sm">
                  <span className="font-medium">Led to: </span>
                  {session.nextOpener}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
