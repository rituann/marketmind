import Link from "next/link";

const TECH_BADGES = [
  "LangGraph", "MCP", "RAG", "Groq", "ChromaDB", "Next.js", "FastAPI",
];

const FEATURES = [
  {
    icon: "📈",
    title: "Live Market Data",
    desc: "Real-time stock quotes, P/E ratios, RSI, MACD, and technical indicators via a custom MCP finance server backed by yfinance.",
  },
  {
    icon: "📋",
    title: "Regulatory Intelligence",
    desc: "Ask about compliance policies, insider trading rules, and blackout periods. Powered by a RAG pipeline over mock regulatory documents.",
  },
  {
    icon: "🔍",
    title: "Transparent AI",
    desc: "Watch the agent think in real time. Every routing decision, tool call, and data fetch is surfaced in the Under the Hood panel.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="flex flex-col items-center py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 px-3 py-1 text-xs text-[#06b6d4]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#06b6d4]" />
          Agentic AI · Production Architecture
        </div>

        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-50 sm:text-6xl">
          AI-powered fintech{" "}
          <span className="text-[#06b6d4]">intelligence.</span>
          <br />
          Live.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-slate-400">
          Ask about any stock or compliance policy. A LangGraph state machine
          routes your query through live market data tools and a regulatory
          document RAG pipeline, then streams back a synthesized answer.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/demo"
            className="rounded-lg bg-[#06b6d4] px-6 py-3 text-sm font-semibold text-[#0a0a0f] transition-colors hover:bg-[#0891b2]"
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
              className="rounded-xl border border-white/8 bg-[#1e1e2e] p-6"
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-2 font-semibold text-slate-100">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
