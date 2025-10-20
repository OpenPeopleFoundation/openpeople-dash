import { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-full border border-[var(--ring)] hover:border-[var(--accent)] transition ${className}`}
    />
  );
}
