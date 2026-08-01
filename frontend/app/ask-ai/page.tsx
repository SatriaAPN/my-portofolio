"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { askAI, getCommonQuestions } from "@/lib/api";

const AI_GRAD = "linear-gradient(135deg,#4f8cff,#7a5cff 55%,#e35bd0)";
const FALLBACK_QUESTIONS = [
  "How many years of experience does he have?",
  "What's his strongest tech stack?",
  "What has he built recently?",
  "Is he open to remote work?",
  "What does he write about?",
  "How can I contact him?",
];
const CHIPS = [
  "What's his strongest tech stack?",
  "How many years of experience does he have?",
  "Is he open to remote work?",
  "How can I contact him?",
];

type Msg = { role: "user" | "bot"; text: string };

export default function AskAIPage() {
  const [log, setLog] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [questions, setQuestions] = useState<string[]>(FALLBACK_QUESTIONS);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCommonQuestions()
      .then((r) => r.questions?.length && setQuestions(r.questions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, thinking]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setLog((l) => [...l, { role: "user", text: q }]);
    setDraft("");
    setThinking(true);
    try {
      const { answer } = await askAI(q);
      setLog((l) => [...l, { role: "bot", text: answer }]);
    } catch {
      setLog((l) => [...l, { role: "bot", text: "Something went wrong — please try again." }]);
    } finally {
      setThinking(false);
    }
  };

  const reset = () => {
    setLog([]);
    setDraft("");
    setThinking(false);
  };

  const empty = log.length === 0;

  return (
    <div className="flex h-screen bg-white">
      {/* ============ SIDEBAR ============ */}
      <aside
        className="hidden flex-none flex-col md:flex"
        style={{ width: 288, background: "#f6f7fb", borderRight: "1px solid #eceef2", padding: "18px 14px" }}
      >
        <Link
          href="/"
          className="mb-1.5 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors hover:bg-[#eceef4] hover:text-ink"
          style={{ color: "#54596a" }}
        >
          <span style={{ fontSize: 16, lineHeight: 0 }}>←</span> Back to portfolio
        </Link>

        <div className="flex items-center gap-2.5 px-2.5 pt-1.5 pb-[18px]">
          <span className="flex-none" style={{ width: 30, height: 30, borderRadius: "50%", background: AI_GRAD }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
            Satria&rsquo;s assistant
          </span>
        </div>

        <button
          onClick={reset}
          className="flex w-full items-center gap-2.5 text-left transition-colors hover:bg-[#e3e6fa]"
          style={{ background: "#eef0fb", border: "none", color: "#4f5bd5", padding: "12px 14px", borderRadius: 12, fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          <span style={{ fontSize: 17, lineHeight: 0 }}>✎</span> New chat
        </button>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: "#9098aa", padding: "22px 12px 10px" }}>
          COMMON QUESTIONS
        </div>
        <div className="thin-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {questions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="block w-full truncate text-left transition-colors hover:bg-[#eceef4]"
              style={{ background: "transparent", border: "none", color: "#3a3d47", padding: "10px 12px", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-2.5 px-2.5 pt-3.5 pb-1" style={{ borderTop: "1px solid #eceef2" }}>
          <span
            className="flex flex-none items-center justify-center text-white"
            style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#4f5bd5,#6a5be0)", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-display)" }}
          >
            SN
          </span>
          <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 500 }}>
            Satria Aluh Perwira Nusa
          </span>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{ background: "radial-gradient(120% 90% at 60% 120%, #eef2ff 0%, #ffffff 55%)" }}
      >
        {/* mobile top bar */}
        <div
          className="flex items-center gap-2.5 md:hidden"
          style={{ padding: "12px 16px", borderBottom: "1px solid #eceef2", background: "rgba(255,255,255,.9)" }}
        >
          <Link href="/" title="Back to portfolio" style={{ color: "#54596a", fontSize: 18, lineHeight: 0, padding: "4px 6px" }}>
            ←
          </Link>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: AI_GRAD }} />
          <span className="flex-1" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>
            Satria&rsquo;s assistant
          </span>
          <button
            onClick={reset}
            title="New chat"
            className="flex items-center justify-center"
            style={{ background: "#eef0fb", border: "none", color: "#4f5bd5", width: 30, height: 30, borderRadius: 9, fontSize: 14, cursor: "pointer" }}
          >
            ✎
          </button>
        </div>

        {empty ? (
          /* EMPTY STATE */
          <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: 24 }}>
            <h1
              className="text-[34px] md:text-[52px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 40px", textAlign: "center", background: "linear-gradient(100deg,#4f8cff,#7a5cff 45%,#e35bd0)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              Ask away about Satria.
            </h1>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex w-full items-center gap-2.5"
              style={{ maxWidth: 720, background: "#fff", border: "1px solid #e2e5ee", borderRadius: 999, padding: "10px 10px 10px 24px", boxShadow: "0 10px 40px rgba(40,30,120,.09)" }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything about his experience, projects, or availability…"
                className="flex-1 bg-transparent outline-none"
                style={{ border: "none", fontSize: 16, fontFamily: "var(--font-sans)", color: "#1a1c22", padding: "8px 0" }}
              />
              <button type="submit" aria-label="Send" style={sendOrb(44)}>
                ↑
              </button>
            </form>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5" style={{ maxWidth: 720 }}>
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => send(c)}
                  className="transition-colors hover:border-[#cdd4ff] hover:text-primary"
                  style={{ border: "1px solid #e2e5ee", background: "#fff", padding: "9px 16px", borderRadius: 999, fontSize: 13.5, color: "#54596a", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* CONVERSATION */
          <>
            <div ref={logRef} className="thin-scroll flex-1 overflow-y-auto">
              <div className="mx-auto flex flex-col gap-[30px]" style={{ maxWidth: 760, padding: "40px 24px 20px" }}>
                {log.map((m, i) => (
                  <div
                    key={i}
                    className="anim-fadeup flex items-start gap-3.5"
                    style={{ flexDirection: m.role === "user" ? "row-reverse" : "row" }}
                  >
                    <div
                      className="flex flex-none items-center justify-center text-white"
                      style={{ width: 30, height: 30, borderRadius: "50%", background: m.role === "user" ? "#1a1c22" : AI_GRAD, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-display)" }}
                    >
                      {m.role === "user" ? "You" : ""}
                    </div>
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: m.role === "user" ? "12px 16px" : "2px 0",
                        borderRadius: m.role === "user" ? "16px 16px 4px 16px" : 0,
                        background: m.role === "user" ? "#eef0fb" : "transparent",
                        color: m.role === "user" ? "#1a1c22" : "#2a2d38",
                        fontSize: 15.5,
                        lineHeight: 1.65,
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex items-center gap-3.5">
                    <div className="flex-none" style={{ width: 30, height: 30, borderRadius: "50%", background: AI_GRAD }} />
                    <div className="flex gap-1.5" style={{ padding: "8px 0" }}>
                      <span className="typing-dot" />
                      <span className="typing-dot" style={{ animationDelay: ".15s" }} />
                      <span className="typing-dot" style={{ animationDelay: ".3s" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-none" style={{ padding: "10px 24px 22px" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft);
                }}
                className="mx-auto flex items-center gap-2.5"
                style={{ maxWidth: 760, background: "#fff", border: "1px solid #e2e5ee", borderRadius: 999, padding: "8px 8px 8px 22px", boxShadow: "0 8px 30px rgba(40,30,120,.07)" }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask a follow-up…"
                  className="flex-1 bg-transparent outline-none"
                  style={{ border: "none", fontSize: 16, fontFamily: "var(--font-sans)", color: "#1a1c22", padding: "8px 0" }}
                />
                <button type="submit" aria-label="Send" style={sendOrb(42)}>
                  ↑
                </button>
              </form>
              <div style={{ textAlign: "center", fontSize: 12, color: "#a1a6b4", marginTop: 10 }}>
                Answers are generated from Satria&rsquo;s profile. Double-check anything important.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function sendOrb(size: number): React.CSSProperties {
  return {
    width: size,
    height: size,
    border: "none",
    borderRadius: "50%",
    background: AI_GRAD,
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  };
}
