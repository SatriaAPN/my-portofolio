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
} from "./types";

// On the server, call the backend directly. In the browser, use a relative
// path so the Next.js rewrite proxies it (first-party cookie).
function base(): string {
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL || "http://localhost:8080";
  }
  return "";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base() + path, {
    // Public reads should always reflect the latest admin edits.
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ---------- Public reads (usable from Server Components) ---------- */

export const getSite = () => req<SiteContent>("/api/site");
export const getLivePosts = () => req<Post[]>("/api/posts");
export const getPost = (slug: string) =>
  req<Post>(`/api/posts/${encodeURIComponent(slug)}`);
export const getProjects = () => req<Project[]>("/api/projects");
export const getCommonQuestions = () =>
  req<{ questions: string[] }>("/api/ai/common-questions");

/* ---------- Ask AI (public) ---------- */

export const askAI = (question: string) =>
  req<{ answer: string }>("/api/ai/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });

/* ---------- Auth ---------- */

export const login = (email: string, password: string) =>
  req<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const logout = () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
export const me = () => req<User>("/api/auth/me");

/* ---------- Admin: posts ---------- */

export const adminListPosts = () => req<Post[]>("/api/admin/posts");
export const adminGetPost = (id: number) => req<Post>(`/api/admin/posts/${id}`);
export const adminCreatePost = (p: Partial<Post>) =>
  req<Post>("/api/admin/posts", { method: "POST", body: JSON.stringify(p) });
export const adminUpdatePost = (id: number, p: Partial<Post>) =>
  req<Post>(`/api/admin/posts/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const adminDeletePost = (id: number) =>
  req<{ ok: boolean }>(`/api/admin/posts/${id}`, { method: "DELETE" });

/* ---------- Admin: projects ---------- */

export const adminListProjects = () => req<Project[]>("/api/admin/projects");
export const adminCreateProject = (p: Partial<Project>) =>
  req<Project>("/api/admin/projects", { method: "POST", body: JSON.stringify(p) });
export const adminUpdateProject = (id: number, p: Partial<Project>) =>
  req<Project>(`/api/admin/projects/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const adminDeleteProject = (id: number) =>
  req<{ ok: boolean }>(`/api/admin/projects/${id}`, { method: "DELETE" });

/* ---------- Admin: site content ---------- */

export const adminUpdateSite = (s: SiteContent) =>
  req<SiteContent>("/api/admin/site", { method: "PUT", body: JSON.stringify(s) });

/* ---------- Admin: résumé PDF ---------- */

export const adminSetResume = (pdf: string, name: string) =>
  req<{ ok: boolean; name: string; updated: string }>("/api/admin/resume", {
    method: "PUT",
    body: JSON.stringify({ pdf, name }),
  });
export const adminDeleteResume = () =>
  req<{ ok: boolean }>("/api/admin/resume", { method: "DELETE" });

/* ---------- Admin: tailored CVs ---------- */

export const adminListCVs = () => req<CV[]>("/api/admin/cv");
export const adminGetCV = (id: number) => req<CV>(`/api/admin/cv/${id}`);
export const adminGenerateCV = (jd: string) =>
  req<CV>("/api/admin/cv/generate", { method: "POST", body: JSON.stringify({ jd }) });
export const adminDeleteCV = (id: number) =>
  req<{ ok: boolean }>(`/api/admin/cv/${id}`, { method: "DELETE" });

/* ---------- Admin: demo data ---------- */

export const adminOverview = () => req<Overview>("/api/admin/overview");
export const adminAnalytics = () => req<Analytics>("/api/admin/analytics");
export const adminMessages = () => req<Message[]>("/api/admin/messages");
export const adminChatlogs = () => req<ChatLog[]>("/api/admin/chatlogs");
