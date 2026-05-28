import Link from "next/link";
import { TrendingUp, FileSearch, Eye } from "lucide-react";
import PrewarmBackend from "@/components/PrewarmBackend";

const TECH_BADGES = [
  "LangGraph", "MCP", "RAG", "Groq", "BM25", "Next.js", "FastAPI",
];

const FEATURES = [
  {
    Icon: TrendingUp,
    title: "Live Market Data",
    desc: "Real-time stock quotes, P/E ratios, RSI, MACD, and technical indicators — pulled live from Yahoo Finance on every query.",
  },
  {
    Icon: FileSearch,
    title: "Regulatory Intelligence",
    desc: "Ask about compliance policies, insider trading rules, and trading blackout periods. The agent reads your internal documents and answers in plain English.",
  },
  {
    Icon: Eye,
    title: "Transparent AI",
    desc: "Watch every decision the agent makes in real time — which tools it used, what data it fetched, and why — before the final answer arrives.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PrewarmBackend />
      {/* Hero */}
      <section className="flex flex-col items-center py-24 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Market Intelligence Platform
        </p>

        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-50 sm:text-6xl">
          An AI analyst that reads{" "}
          <span className="text-[#818cf8]">markets and your docs</span>
          {" "}at the same time.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-slate-400">
          Ask any question about a stock or a compliance policy. The agent
          pulls live market data, searches your internal documents, and streams
          back a cited answer — showing every step it took to get there.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/demo"
            className="rounded-lg bg-[#6366f1] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5]"
          >
            Try the Demo →
          </Link>
          <Link
            href="/architecture"
            className="rounded-lg border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-slate-100"
          >
            How it Works
          </Link>
        </div>

        {/* Tech badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-500">Built with:</span>
          {TECH_BADGES.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-slate-400"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center rounded-xl border border-white/8 bg-[#1e1e2e] p-8 text-center"
            >
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#818cf8]/10">
                <f.Icon className="h-12 w-12 text-[#818cf8]" />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-slate-100">{f.title}</h3>
              <p className="text-base leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
