"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, adminDeleteProject, adminUpdateProject } from "@/lib/api";
import { resizeImageToDataURL } from "@/lib/image";
import { useToast } from "@/components/Toast";
import type { Project } from "@/lib/types";

const inputBase: React.CSSProperties = {
  border: "1px solid #eceef2",
  borderRadius: 9,
  padding: "9px 11px",
  width: "100%",
};

export function ProjectsSection({
  projects,
  onRefresh,
}: {
  projects: Project[];
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} onRefresh={onRefresh} />
      ))}
      <div className="flex items-center gap-[7px]" style={{ fontSize: 13, color: "#9098aa" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2f7d4f", display: "inline-block" }} />
        Changes save automatically. Two projects can be featured on the homepage;
        all appear on the projects page.
      </div>
    </div>
  );
}

function ProjectCard({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const toast = useToast();
  const [p, setP] = useState(project);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setP(project), [project]);

  const persist = async (next: Project, immediate = false) => {
    setP(next);
    if (timer.current) clearTimeout(timer.current);
    const run = async () => {
      try {
        await adminUpdateProject(next.id, next);
        onRefresh();
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          setP((cur) => ({ ...cur, featured: false }));
          toast(e.message);
        } else {
          toast("Could not save changes");
        }
      }
    };
    if (immediate) run();
    else timer.current = setTimeout(run, 600);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await resizeImageToDataURL(f);
      persist({ ...p, image: url }, true);
      toast("Cover updated");
    } catch {
      toast("Could not process image");
    }
  };

  const remove = async () => {
    try {
      await adminDeleteProject(p.id);
      toast("Project deleted");
      onRefresh();
    } catch {
      toast("Could not delete project");
    }
  };

  return (
    <div
      className="grid grid-cols-1 items-start gap-[18px] md:grid-cols-[210px_1fr]"
      style={{ background: "#fff", border: "1px solid #eceef2", borderRadius: 14, padding: "20px 22px" }}
    >
      {/* image column */}
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            aspectRatio: "16/9",
            borderRadius: 10,
            border: "1px solid #eceef2",
            background: p.image ? undefined : "var(--stripe)",
          }}
        >
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span style={{ color: "#9098aa", fontSize: 12 }}>No cover</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <label
            className="cursor-pointer transition-colors hover:bg-[#e3e6fa]"
            style={{ background: "#eef0fb", color: "#4f5bd5", borderRadius: 9, padding: "7px 13px", fontSize: 12.5, fontWeight: 600 }}
          >
            Upload
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
          {p.image && (
            <button
              onClick={() => persist({ ...p, image: "" }, true)}
              className="transition-colors hover:text-[#b3383c]"
              style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 12.5, cursor: "pointer", padding: "7px 5px", fontFamily: "var(--font-sans)" }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* fields */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <input
            value={p.title}
            onChange={(e) => persist({ ...p, title: e.target.value })}
            placeholder="Project title"
            className="flex-1 focus:border-primary focus:outline-none"
            style={{ ...inputBase, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#1a1c22" }}
          />
          <input
            value={p.year}
            onChange={(e) => persist({ ...p, year: e.target.value })}
            placeholder="Year"
            className="focus:border-primary focus:outline-none"
            style={{ ...inputBase, width: 90, fontFamily: "var(--font-mono)", fontSize: 12, color: "#54596a" }}
          />
        </div>
        <input
          value={p.tech}
          onChange={(e) => persist({ ...p, tech: e.target.value })}
          placeholder="GO · POSTGRES · REACT"
          className="focus:border-primary focus:outline-none"
          style={{ ...inputBase, fontFamily: "var(--font-mono)", fontSize: 12, color: "#4f5bd5" }}
        />
        <textarea
          value={p.desc}
          onChange={(e) => persist({ ...p, desc: e.target.value })}
          rows={2}
          placeholder="What it is and why it mattered…"
          className="focus:border-primary focus:outline-none"
          style={{ ...inputBase, fontSize: 13.5, fontFamily: "var(--font-sans)", color: "#54596a", resize: "vertical", lineHeight: 1.5 }}
        />
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 13.5, color: "#3a3d47" }}>
            <input
              type="checkbox"
              checked={p.featured}
              onChange={(e) => persist({ ...p, featured: e.target.checked }, true)}
              style={{ width: 15, height: 15, accentColor: "#4f5bd5" }}
            />
            Featured on homepage
          </label>
          <button
            onClick={remove}
            className="transition-colors hover:text-[#b3383c]"
            style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 13, cursor: "pointer", padding: "4px 6px", fontFamily: "var(--font-sans)" }}
          >
            Delete project
          </button>
        </div>
      </div>
    </div>
  );
}
