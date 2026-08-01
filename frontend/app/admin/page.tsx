"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ToastProvider, useToast } from "@/components/Toast";
import { OverviewSection } from "@/components/admin/OverviewSection";
import { AnalyticsSection } from "@/components/admin/AnalyticsSection";
import { PostsSection } from "@/components/admin/PostsSection";
import { ProjectsSection } from "@/components/admin/ProjectsSection";
import { SiteSection } from "@/components/admin/SiteSection";
import { CVsSection } from "@/components/admin/CVsSection";
import { MessagesSection, ChatLogsSection } from "@/components/admin/MessagesChatLogs";
import {
  adminAnalytics,
  adminChatlogs,
  adminCreateProject,
  adminDeleteCV,
  adminListCVs,
  adminListPosts,
  adminListProjects,
  adminMessages,
  adminOverview,
  getSite,
  logout,
} from "@/lib/api";
import type {
  Analytics,
  CV,
  ChatLog,
  Message,
  Overview,
  Post,
  Project,
  SiteContent,
  User,
} from "@/lib/types";

type SectionKey =
  | "overview"
  | "metrics"
  | "posts"
  | "projects"
  | "site"
  | "cv"
  | "messages"
  | "logs";

const NAV: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "metrics", label: "Analytics" },
  { key: "posts", label: "Blog posts" },
  { key: "projects", label: "Projects" },
  { key: "site", label: "Site content" },
  { key: "cv", label: "Tailored CV" },
  { key: "messages", label: "Messages" },
  { key: "logs", label: "Chat logs" },
];

export default function AdminPage() {
  return (
    <AdminGate>
      {(user) => (
        <ToastProvider>
          <Dashboard user={user} />
        </ToastProvider>
      )}
    </AdminGate>
  );
}

function Dashboard({ user }: { user: User }) {
  const router = useRouter();
  const toast = useToast();
  const [section, setSection] = useState<SectionKey>("overview");

  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [site, setSite] = useState<SiteContent | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatlogs, setChatlogs] = useState<ChatLog[]>([]);

  const reload = useCallback(async () => {
    const [p, pr, cv, s, ov] = await Promise.all([
      adminListPosts(),
      adminListProjects(),
      adminListCVs(),
      getSite(),
      adminOverview(),
    ]);
    setPosts(p);
    setProjects(pr);
    setCvs(cv);
    setSite(s);
    setOverview(ov);
  }, []);

  useEffect(() => {
    reload().catch(() => {});
    adminAnalytics().then(setAnalytics).catch(() => {});
    adminMessages().then(setMessages).catch(() => {});
    adminChatlogs().then(setChatlogs).catch(() => {});
  }, [reload]);

  const live = posts.filter((p) => p.status === "LIVE").length;
  const unread = messages.filter((m) => m.status === "NEW").length;

  const meta: Record<SectionKey, { title: string; sub: string; action: string | null }> = {
    overview: { title: "Overview", sub: "Last 30 days across the site", action: "+ New post" },
    metrics: { title: "Analytics", sub: "Traffic, assistant, and system health · last 30 days", action: "Export report" },
    posts: { title: "Blog posts", sub: `${posts.length} posts · ${posts.length - live} in draft`, action: "+ New post" },
    projects: { title: "Projects", sub: `${projects.filter((p) => p.featured).length} featured · ${projects.length} total`, action: "+ Add project" },
    site: { title: "Site content", sub: "Experience and skills shown on the portfolio", action: "View live site ↗" },
    cv: { title: "Tailored CVs", sub: "Generated with AI from your site data", action: "+ New tailored CV" },
    messages: { title: "Messages", sub: `${unread} unread from recruiters`, action: "Mark all read" },
    logs: { title: "Chat logs", sub: "What visitors ask the assistant", action: "Export CSV" },
  };

  const counts: Record<SectionKey, string> = {
    overview: "",
    metrics: "",
    posts: String(posts.length),
    projects: String(projects.length),
    site: "",
    cv: String(cvs.length),
    messages: unread ? String(unread) : "",
    logs: String(chatlogs.length),
  };

  const onPrimary = async () => {
    switch (section) {
      case "overview":
      case "posts":
        router.push("/admin/editor");
        break;
      case "metrics":
        toast("Report exported — analytics-jul.csv");
        break;
      case "projects":
        try {
          await adminCreateProject({ title: "New project", tech: "", year: "", desc: "" });
          await reload();
          toast("Project added");
        } catch {
          toast("Could not add project");
        }
        break;
      case "site":
        window.open("/", "_blank");
        break;
      case "cv":
        router.push("/admin/cv");
        break;
      case "messages":
        toast("All messages marked read");
        break;
      case "logs":
        toast("Chat logs exported — chat-logs.csv");
        break;
    }
  };

  const doLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    router.replace("/admin/login");
  };

  const m = meta[section];

  return (
    <div className="flex min-h-screen" style={{ background: "#f6f7fb" }}>
      {/* SIDEBAR */}
      <aside
        className="hidden flex-none flex-col md:flex"
        style={{ width: 244, background: "#fff", borderRight: "1px solid #eceef2", padding: "18px 12px" }}
      >
        <div className="flex items-center gap-2.5" style={{ padding: "6px 10px 20px" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "#4f5bd5", flex: "0 0 auto" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Admin</span>
        </div>

        <div className="flex flex-col gap-[3px]">
          {NAV.map((n) => {
            const active = section === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                className="flex items-center transition-colors"
                style={{
                  background: active ? "#eef0fb" : "transparent",
                  color: active ? "#4f5bd5" : "#3a3d47",
                  fontWeight: active ? 600 : 400,
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span className="flex-1 text-left">{n.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#9098aa" }}>
                  {counts[n.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 transition-colors hover:bg-[#f2f3f8] hover:text-ink"
          style={{ color: "#54596a", fontSize: 14, padding: "10px 12px", borderRadius: 10 }}
        >
          <span style={{ fontSize: 15, lineHeight: 0 }}>↗</span> View live site
        </Link>

        <div className="mt-2 flex items-center gap-2.5" style={{ padding: "14px 10px 4px", borderTop: "1px solid #eceef2" }}>
          <span
            className="flex flex-none items-center justify-center text-white"
            style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#4f5bd5,#6a5be0)", fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-display)" }}
          >
            SN
          </span>
          <span className="flex-1 truncate" style={{ fontSize: 13.5, fontWeight: 500 }}>
            {user.name || user.email}
          </span>
          <button
            onClick={doLogout}
            title="Sign out"
            className="transition-colors hover:text-[#b3383c]"
            style={{ background: "transparent", border: "none", color: "#9098aa", fontSize: 12.5, fontWeight: 500, fontFamily: "var(--font-sans)", cursor: "pointer", padding: "4px 6px" }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="flex items-center justify-between"
          style={{ background: "#fff", borderBottom: "1px solid #eceef2", padding: "20px 34px" }}
        >
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 23, letterSpacing: "-0.015em", margin: 0 }}>
              {m.title}
            </h1>
            <div style={{ color: "#9098aa", fontSize: 13.5, marginTop: 3 }}>{m.sub}</div>
          </div>
          {m.action && (
            <button
              onClick={onPrimary}
              className="text-white transition-colors hover:bg-[#3a45b8]"
              style={{ background: "#4f5bd5", border: "none", borderRadius: 11, padding: "11px 18px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {m.action}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-5" style={{ padding: "28px 34px 44px" }}>
          {/* Mobile nav */}
          <div className="flex flex-wrap gap-2 md:hidden">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                style={{
                  background: section === n.key ? "#eef0fb" : "#fff",
                  color: section === n.key ? "#4f5bd5" : "#54596a",
                  border: "1px solid #e2e5ee",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {n.label}
              </button>
            ))}
          </div>

          {section === "overview" && <OverviewSection data={overview} />}
          {section === "metrics" && <AnalyticsSection data={analytics} />}
          {section === "posts" && (
            <PostsSection posts={posts} onEdit={(id) => router.push(`/admin/editor?post=${id}`)} />
          )}
          {section === "projects" && <ProjectsSection projects={projects} onRefresh={reload} />}
          {section === "site" && site && <SiteSection site={site} onRefresh={reload} />}
          {section === "cv" && (
            <CVsSection
              cvs={cvs}
              onOpen={(id) => router.push(`/admin/cv?cv=${id}`)}
              onNew={() => router.push("/admin/cv")}
              onDelete={async (id) => {
                try {
                  await adminDeleteCV(id);
                  await reload();
                  toast("CV deleted");
                } catch {
                  toast("Could not delete CV");
                }
              }}
            />
          )}
          {section === "messages" && <MessagesSection messages={messages} />}
          {section === "logs" && <ChatLogsSection logs={chatlogs} />}
        </div>
      </div>
    </div>
  );
}
