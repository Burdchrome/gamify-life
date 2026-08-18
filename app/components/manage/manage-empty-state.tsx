export function ManageEmptyState() {
  return (
    <div className="rounded-[4px] border border-white/[0.06] bg-white/[0.02] px-[14px] py-8 text-center">
      <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-text-muted">
        NO PROTOCOLS LOADED
      </p>
      <p className="mt-2 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted/70">
        UPLOAD THE FIRST PROTOCOL ABOVE
      </p>
    </div>
  );
}
