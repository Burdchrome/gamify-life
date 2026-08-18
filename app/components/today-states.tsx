import Link from "next/link";

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-text-muted">
        NO OPS LOADED - SYSTEM STANDBY
      </p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center rounded-[8px] border border-cyan-divider px-4 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan"
        href="/manage"
      >
        UPLOAD PROTOCOLS VIA MANAGE
      </Link>
    </div>
  );
}

export function TodayError() {
  return (
    <div className="flex flex-1 items-center justify-center py-16 text-center">
      <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-error">
        OPS LINK DEGRADED - HABITS UNAVAILABLE
      </p>
    </div>
  );
}
