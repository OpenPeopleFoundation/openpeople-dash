import { ReactNode } from "react";

type CardProps = {
  className?: string;
  children?: ReactNode;
};

export function Card({ className = "", children }: CardProps) {
  return (
    <div
      className={`border border-[var(--ring)] rounded-2xl bg-[linear-gradient(180deg,rgba(8,9,12,0.98),rgba(6,7,10,0.92))] shadow-[0_0_55px_rgba(8,10,15,0.45)] backdrop-blur-xl ${className}`}
      style={{ boxShadow: "0 0 65px rgba(255,90,31,0.04) inset, 0 0 45px rgba(4,6,12,0.6)" }}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children }: CardProps) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}
