import { LocalDate } from "./components/local-date";

export default function Home() {
  return (
    <main className="min-h-dvh bg-ground text-text-primary">
      <div className="scanline-overlay" aria-hidden="true" />
      <section className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-6 sm:px-6">
        <header className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-orbitron text-[11px] font-bold uppercase tracking-[4px] text-cyan">
                RUNNER://daily
              </p>
              <LocalDate />
            </div>
            <div className="shrink-0 text-right">
              <p className="font-orbitron text-xl font-bold leading-none text-yellow">
                --
              </p>
              <p className="mt-1 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-yellow/50">
                RANK
              </p>
            </div>
          </div>
        </header>
        <div className="h-px bg-cyan-divider" />
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-text-muted">
            NO OPS LOADED — SYSTEM STANDBY
          </p>
        </div>
      </section>
    </main>
  );
}
