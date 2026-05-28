"use client";
import { useState, useRef, useEffect } from "react";
import { useChatStream, ExecutionEvent } from "@/hooks/useChatStream";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const NODE_COLORS: Record<string, string> = {
  router: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  finance: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  rag: "text-green-400 border-green-400/30 bg-green-400/10",
  synth: "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

const NODE_LABELS: Record<string, string> = {
  router: "Router",
  finance: "MCP Finance",
  rag: "RAG Pipeline",
  synth: "Synthesizer",
};

const NODE_ICONS: Record<string, string> = {
  router: "⚡",
  finance: "📈",
  rag: "📋",
  synth: "🧠",
};

function EventCard({ event }: { event: ExecutionEvent }) {
  const [open, setOpen] = useState(false);
  const color = NODE_COLORS[event.node ?? ""] ?? "text-slate-400 border-white/10 bg-white/5";
  const label = NODE_LABELS[event.node ?? ""] ?? event.node ?? "system";
  const icon = NODE_ICONS[event.node ?? ""] ?? "•";
  const time = new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className={`rounded-lg border px-3 py-2 ${color} msg-animate`}>
      <button
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2 text-xs font-medium">
          <span>{icon}</span>
          <span>{label}</span>
          <span className="opacity-50">{event.type === "node_start" ? "started" : "completed"}</span>
        </span>
        <span className="shrink-0 text-xs opacity-40">{time}</span>
      </button>
      {open && event.type !== "node_start" && (
        <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-xs leading-relaxed text-slate-300">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

const SAMPLE_QUERIES = [
  "What is Apple's current stock price and RSI?",
  "What do our compliance docs say about insider trading?",
  "Is AAPL on our restricted list, and what's its P/E ratio?",
];

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { response, executionLog, isLoading, error, sendMessage } = useChatStream();

  useEffect(() => {
    if (response) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== response) {
          return [...prev.slice(0, -1), { role: "assistant", content: response }];
        }
        if (last?.role !== "assistant") {
          return [...prev, { role: "assistant", content: response }];
        }
        return prev;
      });
    }
  }, [response]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, executionLog]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    await sendMessage(msg);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Chat column */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <p className="text-sm text-slate-500">
                Ask about live market data or regulatory compliance.
              </p>
              <div className="flex flex-col gap-2">
                {SAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="rounded-lg border border-white/8 bg-[#1e1e2e] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-[#06b6d4]/40 hover:text-[#06b6d4]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex msg-animate ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#06b6d4] text-[#0a0a0f] font-medium"
                      : "bg-[#1e1e2e] text-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start msg-animate">
                <div className="rounded-xl bg-[#1e1e2e] px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block h-1.5 w-1.5 rounded-full bg-[#06b6d4] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/8 px-4 py-3">
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              className="flex-1 rounded-lg border border-white/10 bg-[#1e1e2e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#06b6d4]/50 focus:outline-none"
              placeholder="Ask about a stock, company, or compliance rule..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] transition-colors hover:bg-[#0891b2] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Under the Hood panel */}
      <div className="hidden w-80 shrink-0 border-l border-white/8 lg:flex lg:flex-col">
        <div className="border-b border-white/8 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Under the Hood
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {executionLog.length === 0 && (
            <p className="mt-4 text-center text-xs text-slate-600">
              Execution steps will appear here as the agent runs.
            </p>
          )}
          {executionLog.map((event, i) => (
            <EventCard key={i} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}
