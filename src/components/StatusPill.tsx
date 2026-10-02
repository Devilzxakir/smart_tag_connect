import type { TagStatus } from "@/lib/store";

const styles: Record<TagStatus, { label: string; className: string }> = {
  empty: { label: "Empty", className: "bg-muted text-muted-foreground" },
  written: { label: "Written", className: "bg-success/15 text-success" },
  demo: { label: "Demo", className: "bg-warning/15 text-warning" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
};

export function StatusPill({ status }: { status: TagStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.className}`}
    >
      {s.label}
    </span>
  );
}
