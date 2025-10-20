"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ targetISO }: { targetISO: string }) {
  const [t, setT] = useState("…");

  useEffect(() => {
    const end = new Date(targetISO).getTime();
    const tick = () => {
      const d = Math.max(0, end - Date.now());
      const days = Math.floor(d / 86_400_000);
      const h = Math.floor((d % 86_400_000) / 3_600_000);
      const m = Math.floor((d % 3_600_000) / 60_000);
      const s = Math.floor((d % 60_000) / 1000);
      setT(`${days}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  return <span className="font-mono text-lg">{t}</span>;
}
