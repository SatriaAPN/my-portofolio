// Mirrors the Go backend's JSON models (internal/models).

export type Category = "Performance" | "Architecture" | "Databases" | "Testing";
export type PostStatus = "LIVE" | "DRAFT";

export interface Post {
  id: number;
  title: string;
  slug: string;
  category: Category;
  status: PostStatus;
  date: string;
  views: string;
  readMin: number;
  excerpt: string;
  body: string;
  createdAt: string;
}

export interface Project {
  id: number;
  title: string;
  tech: string;
  year: string;
  featured: boolean;
  image: string;
  desc: string;
}

export interface ExperienceItem {
  period: string;
  role: string;
  company: string;
  location: string;
  logo: string;
  desc: string;
  highlights: string[];
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface SiteContent {
  headline: string[];
  skillGroups: SkillGroup[];
  experience: ExperienceItem[];
  heroImage: string;
  projectImage: string;
  // Résumé PDF is uploaded/served separately (see /api/resume); the site
  // payload only carries these light fields, never the file itself.
  resumeName?: string;
  hasResume?: boolean;
}

export interface RankedProject {
  title: string;
  tech: string;
  desc: string;
  hits: string[];
  n: number;
}

export interface CV {
  id: number;
  role: string;
  company: string;
  date: string;
  score: number;
  inJdCount: number;
  matchedNames: string[];
  gaps: string[];
  skillsOrdered: string[];
  ranked: RankedProject[];
  summary: string;
  jd: string;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface StatCard {
  label: string;
  value: string;
  delta: string;
  spark?: number[];
}

export interface Overview {
  stats: StatCard[];
  recentPosts: { title: string; meta: string; status: PostStatus }[];
  topQuestions: { text: string; count: number }[];
}

export interface Analytics {
  stats: StatCard[];
  traffic: {
    views: number[];
    visitors: number[];
    dates: string[];
    gridlines: { label: string; value: number }[];
    max: number;
    spike: { index: number; value: number; label: string };
  };
  health: {
    status: string;
    rows: { label: string; value: string }[];
    lastDeploy: string;
  };
  topPages: { label: string; value: string; share: number }[];
  referrers: { label: string; value: string; share: number }[];
}

export interface Message {
  initials: string;
  name: string;
  role: string;
  status: string;
  time: string;
  body: string;
}

export interface ChatLog {
  question: string;
  answered: boolean;
  count: number;
  when: string;
}
