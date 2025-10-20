export function SectionProgress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 w-44">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: "var(--accent,#ff5a1f)" }} />
      </div>
      <span className="text-xs text-[var(--muted)] w-10 text-right font-mono">{pct}%</span>
    </div>
  );
}
