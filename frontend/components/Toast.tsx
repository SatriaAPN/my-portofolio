"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastCtx = (msg: string) => void;

const Ctx = createContext<ToastCtx>(() => {});

export function useToast() {
  return useContext(Ctx);
}

// Fixed bottom-right dark pill, auto-dismiss after 2.2s (handoff spec).
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 2200);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div
          className="print-hide anim-fadeup"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 200,
            background: "#1a1c22",
            color: "#fff",
            padding: "13px 20px",
            borderRadius: 12,
            fontSize: 14,
            boxShadow: "var(--shadow-toast)",
          }}
        >
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}
