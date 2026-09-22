"use client";

export function BottomBar({
  onCatchNote,
  onLogClass,
}: {
  onCatchNote: () => void;
  onLogClass: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg gap-2 p-3">
        <button
          type="button"
          onClick={onCatchNote}
          className="flex-1 rounded-full border border-surface-border px-4 py-3 text-sm font-semibold active:bg-accent-soft"
        >
          Catch a note
        </button>
        <button
          type="button"
          onClick={onLogClass}
          className="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground active:opacity-80"
        >
          Log a class
        </button>
      </div>
    </div>
  );
}
