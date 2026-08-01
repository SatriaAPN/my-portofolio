import type { Analytics } from "@/lib/types";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eceef2", borderRadius: 14 };
const CH = { w: 640, top: 20, bottom: 200 };

export function AnalyticsSection({ data }: { data: Analytics | null }) {
  if (!data) return <div style={{ color: "#9098aa", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading…</div>;

  const max = data.traffic.max;
  const yAt = (v: number) => CH.bottom - (v / max) * (CH.bottom - CH.top);
  const xAt = (i: number, n: number) => (i * CH.w) / (n - 1);
  const line = (arr: number[]) =>
    "M" + arr.map((v, i) => `${xAt(i, arr.length).toFixed(1)},${yAt(v).toFixed(1)}`).join(" L");
  const views = data.traffic.views;
  const visitors = data.traffic.visitors;
  const viewsLine = line(views);
  const area = viewsLine + ` L${CH.w},${CH.bottom} L0,${CH.bottom} Z`;
  const spikeX = xAt(data.traffic.spike.index, views.length);
  const spikeY = yAt(data.traffic.spike.value);
  const dateTicks = ["JUL 02", "JUL 09", "JUL 16", "JUL 23", "JUL 31"];

  return (
    <div className="flex flex-col gap-5">
      {/* sparkline stat cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {data.stats.map((s) => {
          const sp = s.spark || [];
          const mx = Math.max(1, ...sp);
          const pts = sp.map((v, i) => `${((i * 120) / (sp.length - 1)).toFixed(1)},${(32.5 - (v / mx) * 29).toFixed(1)}`).join(" ");
          return (
            <div key={s.label} style={{ ...card, padding: "18px 20px 14px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", color: "#9098aa" }}>
                {s.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.02em", margin: "7px 0 2px" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12.5, color: "#4f5bd5", marginBottom: 10 }}>{s.delta}</div>
              <svg viewBox="0 0 120 34" style={{ width: "100%", height: 34, display: "block" }}>
                <polyline points={pts} fill="none" stroke="#4f5bd5" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
              </svg>
            </div>
          );
        })}
      </div>

      {/* traffic chart + system health */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div style={{ ...card, padding: "22px 24px" }}>
          <div className="mb-4 flex items-center justify-between">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
              Traffic — last 30 days
            </span>
            <div className="flex gap-4" style={{ fontSize: 12, color: "#54596a" }}>
              <span className="inline-flex items-center gap-1.5">
                <span style={{ width: 10, height: 3, background: "#4f5bd5", borderRadius: 2, display: "inline-block" }} /> Page views
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span style={{ width: 10, height: 3, background: "#c3c8d4", borderRadius: 2, display: "inline-block" }} /> Visitors
              </span>
            </div>
          </div>
          <svg viewBox="0 0 640 224" style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f5bd5" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#4f5bd5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="200" x2="640" y2="200" stroke="#eceef2" strokeWidth={1} />
            {data.traffic.gridlines.map((g) => (
              <g key={g.label}>
                <line x1="0" y1={yAt(g.value)} x2="640" y2={yAt(g.value)} stroke="#f2f3f8" strokeWidth={1} />
                <text x="4" y={yAt(g.value) - 4} fontSize={9} fill="#c3c8d4" fontFamily="IBM Plex Mono, monospace">
                  {g.label}
                </text>
              </g>
            ))}
            <path d={area} fill="url(#gv)" />
            <path d={line(visitors)} fill="none" stroke="#c3c8d4" strokeWidth={1.6} strokeDasharray="4 3" />
            <path d={viewsLine} fill="none" stroke="#4f5bd5" strokeWidth={2.2} strokeLinejoin="round" />
            <circle cx={spikeX} cy={spikeY} r={3.5} fill="#4f5bd5" stroke="#fff" strokeWidth={1.5} />
            <text x={Math.min(560, Math.max(60, spikeX))} y={16} fontSize={10} fill="#4f5bd5" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">
              {data.traffic.spike.label}
            </text>
            {dateTicks.map((d, i) => (
              <text
                key={d}
                x={i === 0 ? 0 : i === 4 ? 640 : (i * 640) / 4}
                y={220}
                fontSize={9.5}
                fill="#9098aa"
                fontFamily="IBM Plex Mono, monospace"
                textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
              >
                {d}
              </text>
            ))}
          </svg>
        </div>

        <div style={card}>
          <div className="flex items-center justify-between" style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>System health</span>
            <span style={{ background: "#e9f6ee", color: "#2f7d4f", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 999 }}>
              {data.health.status}
            </span>
          </div>
          {data.health.rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3" style={{ padding: "14px 22px", borderBottom: "1px solid #f2f3f8" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34c778", display: "inline-block" }} />
              <span className="flex-1" style={{ fontSize: 14, color: "#3a3d47" }}>{r.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#1a1c22" }}>{r.value}</span>
            </div>
          ))}
          <div style={{ padding: "13px 22px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa" }}>
            {data.health.lastDeploy}
          </div>
        </div>
      </div>

      {/* top pages + referrers */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div style={card}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
            Top pages
          </div>
          {data.topPages.map((tp) => (
            <div key={tp.label} className="flex items-center gap-3" style={{ padding: "13px 22px", borderBottom: "1px solid #f2f3f8" }}>
              <span className="flex-1 truncate" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#3a3d47" }}>
                {tp.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#1a1c22" }}>{tp.value}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #eceef2", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
            Referrers
          </div>
          {data.referrers.map((rf) => (
            <div key={rf.label} style={{ padding: "12px 22px", borderBottom: "1px solid #f2f3f8" }}>
              <div className="mb-[7px] flex items-center gap-3">
                <span className="flex-1" style={{ fontSize: 13.5, color: "#3a3d47" }}>{rf.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1a1c22" }}>{rf.value}</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "#f2f3f8", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${rf.share}%`, borderRadius: 999, background: "linear-gradient(90deg,#4f5bd5,#6a5be0)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
