"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, login } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

const focusRing =
  "focus:border-primary focus:shadow-[0_0_0_3px_#eef0fb] focus:outline-none";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter both an email and a password.");
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* LEFT: form */}
      <div className="flex flex-col justify-center px-6 py-16 md:px-[7vw]">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-[14px] font-medium transition-colors hover:text-ink"
          style={{ color: "#54596a" }}
        >
          <span style={{ fontSize: 15, lineHeight: 0 }}>←</span> Back to site
        </Link>
        <div className="mb-8">
          <BrandMark />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 36, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          Sign in
        </h1>
        <p style={{ color: "#54596a", margin: "0 0 34px", fontSize: 16 }}>
          Manage posts, projects, and messages.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4" style={{ maxWidth: 400 }}>
          <label className="flex flex-col gap-[7px] text-[14px] font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="satria@example.com"
              className={`transition-shadow ${focusRing}`}
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-[7px] text-[14px] font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className={`transition-shadow ${focusRing}`}
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ background: "#fdf1f1", border: "1px solid #f6d9d9", color: "#b3383c", borderRadius: 10, padding: "11px 14px", fontSize: 13.5 }}>
              {error}
            </div>
          )}

          <div className="mt-0.5 flex items-center justify-between text-[14px]" style={{ color: "#54596a" }}>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" style={{ width: 15, height: 15, accentColor: "#4f5bd5" }} /> Remember me
            </label>
            <a href="#reset">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 text-white transition-colors hover:bg-[#3a45b8] disabled:opacity-60"
            style={{ background: "#4f5bd5", border: "none", borderRadius: 12, padding: "15px 22px", fontSize: 15.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 26, fontFamily: "var(--font-mono)", fontSize: 12, color: "#9098aa" }}>
          DEV LOGIN — admin@satrianusa.dev / admin1234
        </div>
      </div>

      {/* RIGHT: pitch panel */}
      <div
        className="hidden flex-col justify-end md:flex"
        style={{ background: "linear-gradient(150deg,#4f5bd5,#6a5be0)", color: "#fff", padding: "56px 4vw" }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#c8ccf5", marginBottom: 16 }}>
          ✦ CONTROL ROOM
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 32, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "0 0 14px", maxWidth: "22ch" }}>
          Everything behind the portfolio, in one place.
        </h2>
        <p style={{ color: "#d6d9f7", margin: 0, maxWidth: "36ch", fontSize: 16 }}>
          Drafts, published posts, recruiter messages, and what people ask the
          assistant.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #e2e5ee",
  borderRadius: 11,
  padding: "13px 15px",
  fontSize: 15,
  fontFamily: "var(--font-sans)",
  color: "#1a1c22",
  background: "#fff",
};
