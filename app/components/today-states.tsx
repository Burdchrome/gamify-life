export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-text-muted">
        NO OPS LOADED - SYSTEM STANDBY
      </p>
      <p className="mt-2 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted/70">
        AWAITING PROTOCOL UPLOAD
      </p>
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
