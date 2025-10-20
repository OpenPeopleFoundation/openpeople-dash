"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./members.css";

const PASSWORD = (process.env.NEXT_PUBLIC_MEMBERS_PASSWORD ?? "").trim();

export default function MembersPage() {
  const router = useRouter();
  const passwordConfigured = PASSWORD.length > 0;
  const [status, setStatus] = useState<{ message: string; isError: boolean }>(() =>
    passwordConfigured
      ? { message: "", isError: false }
      : {
          message: "Member access password is not configured. Contact your Open People lead.",
          isError: true,
        },
  );
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordConfigured) {
      setStatus({
        message: "Member access password is not configured. Contact your Open People lead.",
        isError: true,
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = (formData.get("password") as string | null)?.trim() ?? "";

    if (!password) {
      setStatus({ message: "Password is required.", isError: true });
      return;
    }

    if (password === PASSWORD) {
      setSubmitting(true);
      setStatus({ message: "Opening dashboards...", isError: false });
      setTimeout(() => {
        router.push("/dash");
      }, 200);
    } else {
      setStatus({ message: "Incorrect password. Please try again.", isError: true });
    }
  };

  return (
    <main className="members-page">
      <div className="members-card">
        <h1>Members Access</h1>
        <p className="lead">Enter the password to open the operational dashboards.</p>
        <form className="gate-form" onSubmit={handleSubmit}>
          <label htmlFor="members-password">Access password</label>
          <input
            id="members-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={!passwordConfigured}
          />
          <button type="submit" disabled={isSubmitting || !passwordConfigured}>
            {isSubmitting ? "Redirecting…" : "Unlock dashboards"}
          </button>
        </form>
        <p className="status" data-state={status.isError ? "error" : "info"}>
          {status.message}
        </p>
        <p className="hint">Need help? Contact your Open People lead for access support.</p>
        <Link href="/">← Return to openpeople.world</Link>
      </div>
    </main>
  );
}
