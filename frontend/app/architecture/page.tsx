"use client";
import { useCallback, useState } from "react";
import { ReactFlow, Background, BackgroundVariant, Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Zap, TrendingUp, FileSearch, Brain, CheckCircle, User, Plug, BookOpen, Wrench, Hash, Database, Radio, Network, ChevronDown, Play } from "lucide-react";
import { useChatStream } from "@/hooks/useChatStream";

// ─── React Flow graph definition ─────────────────────────────────────────────

const INITIAL_NODES: Node[] = [
  { id: "user",    position: { x: 200, y: 0   }, data: { label: "User Query" },    type: "default" },
  { id: "router",  position: { x: 200, y: 100 }, data: { label: "Router" },        type: "default" },
  { id: "finance", position: { x: 60,  y: 220 }, data: { label: "MCP Finance" },   type: "default" },
  { id: "rag",     position: { x: 340, y: 220 }, data: { label: "RAG Pipeline" },  type: "default" },
  { id: "synth",   position: { x: 200, y: 340 }, data: { label: "Synthesizer" },   type: "default" },
  { id: "answer",  position: { x: 200, y: 440 }, data: { label: "Answer" },         type: "default" },
];

const INITIAL_EDGES: Edge[] = [
  { id: "u-r",   source: "user",    target: "router",  animated: false },
  { id: "r-f",   source: "router",  target: "finance", animated: false, label: "market query" },
  { id: "r-rag", source: "router",  target: "rag",     animated: false, label: "doc query" },
  { id: "f-s",   source: "finance", target: "synth",   animated: false },
  { id: "rag-s", source: "rag",     target: "synth",   animated: false },
  { id: "s-a",   source: "synth",   target: "answer",  animated: false },
];

const NODE_STYLE_DEFAULT = {
  background: "#1e1e2e",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#f1f5f9",
  borderRadius: 8,
  fontSize: 13,
  padding: "8px 14px",
};

const NODE_STYLE_ACTIVE = {
  ...NODE_STYLE_DEFAULT,
  border: "1.5px solid #818cf8",
  background: "#1e1b4b",
  boxShadow: "0 0 12px rgba(129,140,248,0.4)",
};

// ─── Concept cards ────────────────────────────────────────────────────────────

const CONCEPTS = [
  {
    Icon: Zap,
    name: "LangGraph",
    summary: "State machine that controls how the AI decides what to do next",
    detail: `LangGraph models agent behavior as a directed graph. Each "node" is a Python function that reads the current state and returns an update. "Edges" define which node runs next — and can be conditional (e.g., "if the query needs market data, go to finance_node"). This gives you explicit, inspectable control flow instead of a black-box agent loop.`,
    code: `g = StateGraph(AgentState)
g.add_node("router", router_node)
g.add_node("finance", finance_node)
g.add_conditional_edges(
  "router",
  lambda s: "finance" if "finance" in s["next_tools"] else "rag"
)`,
  },
  {
    Icon: Plug,
    name: "MCP (Model Context Protocol)",
    summary: "A USB-C standard for connecting AI to external data sources",
    detail: `MCP defines a standard protocol for AI agents to call external tools. Your finance server runs as a subprocess that "speaks MCP". LangChain's MultiServerMCPClient starts that subprocess and automatically converts its tools into functions LangGraph can call. The LLM never directly imports yfinance — it calls the MCP server and receives back structured JSON.`,
    code: `# finance_server.py
@server.tool()
def get_stock_quote(ticker: str) -> dict:
    t = yf.Ticker(ticker)
    return {"price": t.info["currentPrice"], ...}`,
  },
  {
    Icon: BookOpen,
    name: "RAG (Retrieval-Augmented Generation)",
    summary: "Giving the LLM access to documents it was never trained on",
    detail: `The LLM has never read your internal compliance documents. RAG solves this: before calling the LLM, we search the documents for the most relevant paragraphs and inject them into the prompt. The LLM reads those paragraphs and answers as if it "knows" the document. This approach works for any private data — policy docs, emails, code, legal contracts.`,
    code: `results = vectorstore.similarity_search(query, k=3)
context = "\\n---\\n".join([doc.page_content for doc in results])
# Now inject context into the LLM prompt`,
  },
  {
    Icon: Wrench,
    name: "Tool Calling",
    summary: "How the LLM says 'I need to look something up' and actually does it",
    detail: `Modern LLMs like Llama 3.3 can output a structured JSON "tool call" instead of a text response — e.g., {"tool": "get_stock_quote", "args": {"ticker": "AAPL"}}. LangGraph intercepts this, runs the actual function, and feeds the result back to the LLM as context for the next step. This is how the agent can take real actions in the world.`,
    code: `# LangGraph handles this automatically
# The LLM outputs: {"tool": "get_stock_quote", "args": {...}}
# LangGraph calls the function and returns the result
# Then the LLM continues with the new information`,
  },
  {
    Icon: Hash,
    name: "BM25 Document Search",
    summary: "Keyword-based retrieval that fits inside a 512 MB free-tier instance",
    detail: `The project originally used sentence-transformers + ChromaDB for semantic search. That approach loaded PyTorch (~300 MB RAM) just to embed 3 documents — instantly OOM-killing Render's free-tier container. We replaced it with BM25 (Best Match 25), a proven ranking algorithm used by Elasticsearch and Solr. BM25 scores documents by term frequency and inverse document frequency, requires zero ML dependencies, and builds its index from raw text files in milliseconds. For a small, known corpus of regulatory documents, retrieval quality is indistinguishable from semantic search in practice.`,
    code: `from rank_bm25 import BM25Okapi

# Build index from raw .txt files — no pre-build step, no model download
chunks = [para.lower().split() for para in paragraphs]
bm25 = BM25Okapi(chunks)

# Query
scores = bm25.get_scores(query.lower().split())
top_k = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:3]`,
  },
  {
    Icon: Database,
    name: "In-Memory Document Index",
    summary: "No vector database needed — plain text files, cached on first query",
    detail: `Instead of a persistent vector database, the RAG pipeline reads the 3 regulatory .txt files at first query, splits them into paragraphs, and builds the BM25 index in memory using Python's functools.lru_cache. The index is reused for every subsequent query in the same process. This eliminates chromadb, sentence-transformers, and langchain-chroma from the dependency tree — saving ~350 MB RAM and removing the need for a pre-build ingestion step. The design decision: for a corpus this small and static, a vector DB is engineering overhead that doesn't improve outcomes.`,
    code: `from functools import lru_cache

@lru_cache(maxsize=1)
def _build_index():
    # Runs once per process, result is cached forever
    for txt_file in DOCS_DIR.glob("*.txt"):
        paragraphs = text.split("\\n\\n")
        chunks.append(para.lower().split())
    return BM25Okapi(chunks), metadata`,
  },
  {
    Icon: Radio,
    name: "SSE Streaming",
    summary: "How the answer arrives word-by-word instead of all at once",
    detail: `SSE (Server-Sent Events) is a standard HTTP feature where the server keeps a connection open and pushes new lines of data as they're ready. FastAPI yields each LangGraph event as a line: "data: {json}\\n\\n". The browser reads these one-by-one, which is why you see the execution log update in real time and the agent's thoughts appear as they happen.`,
    code: `# FastAPI
async def event_stream():
    async for event in graph.astream_events(...):
        yield f"data: {json.dumps(event)}\\n\\n"

# Next.js (browser)
const reader = res.body.getReader()
while (true) {
  const { value } = await reader.read()
  // parse SSE lines...
}`,
  },
  {
    Icon: Network,
    name: "Agent Orchestration",
    summary: "How all the pieces connect into one intelligent system",
    detail: `The full request lifecycle: (1) User message → Next.js → FastAPI POST /api/chat. (2) FastAPI starts LangGraph. (3) Router node calls Groq LLM to decide which tools are needed. (4) Finance node calls MCP server (yfinance). (5) RAG node scores query against BM25 index built from regulatory .txt files. (6) Synth node calls Groq with all gathered data. (7) Response streams back token-by-token via SSE. Total latency: ~3-5s.`,
    code: `# The full graph in 5 lines
g.add_node("router", router_node)  # decides tools
g.add_node("finance", finance_node)  # live data
g.add_node("rag", rag_node)  # doc search
g.add_node("synth", synth_node)  # final answer
# Edges define the conditional flow`,
  },
];

const PRESET_QUERIES = [
  "What is Apple's P/E ratio?",
  "What do our compliance docs say about insider trading?",
  "Is AAPL restricted, and what is its current price?",
];

const FLOW_STEPS = [
  { n: 1, text: "You type a question on the demo page and hit Send." },
  { n: 2, text: "Next.js sends a POST request to FastAPI at /api/chat with your message." },
  { n: 3, text: "FastAPI starts the LangGraph state machine and begins streaming SSE events." },
  { n: 4, text: "Router node calls Groq (Llama 3.3 70B) to decide: finance, rag, or both?" },
  { n: 5, text: "Finance node calls the MCP server and fetches get_stock_quote() + get_technicals() via yfinance." },
  { n: 6, text: "RAG node scores your query against a BM25 index built from the regulatory .txt files and returns the top-3 most relevant paragraphs." },
  { n: 7, text: "Synthesizer node calls Groq again with all gathered context and streams the final answer back via SSE." },
];

// ─── Expandable concept card ──────────────────────────────────────────────────

function ConceptCard({ c }: { c: typeof CONCEPTS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/8 bg-[#1e1e2e]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left"
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#818cf8]/10">
          <c.Icon className="h-4 w-4 text-[#818cf8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100">{c.name}</p>
          <p className="mt-0.5 text-sm text-slate-400">{c.summary}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/6 px-5 py-4">
          <p className="mb-3 text-sm leading-relaxed text-slate-300">{c.detail}</p>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-slate-300">
            {c.code}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    INITIAL_NODES.map((n) => ({ ...n, style: NODE_STYLE_DEFAULT }))
  );
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const { isLoading, executionLog, sendMessage } = useChatStream();

  const handlePreset = useCallback(
    async (query: string) => {
      setNodes((nds) => nds.map((n) => ({ ...n, style: NODE_STYLE_DEFAULT })));
      setNodes((nds) =>
        nds.map((n) => (n.id === "user" ? { ...n, style: NODE_STYLE_ACTIVE } : n))
      );

      const cleanup = setInterval(() => {
        const latest = [...executionLog].reverse().find((e) => e.type === "node_start");
        if (latest?.node) {
          setNodes((nds) =>
            nds.map((n) => ({
              ...n,
              style: n.id === latest.node ? NODE_STYLE_ACTIVE : NODE_STYLE_DEFAULT,
            }))
          );
        }
      }, 300);

      await sendMessage(query);
      clearInterval(cleanup);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === "answer" ? { ...n, style: NODE_STYLE_ACTIVE } : { ...n, style: NODE_STYLE_DEFAULT }
        )
      );
    },
    [executionLog, sendMessage, setNodes]
  );

  const activeNodeFromLog = executionLog.filter((e) => e.type === "node_start").at(-1)?.node;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-slate-50">Architecture</h1>
      <p className="mb-10 text-slate-400">
        How the agent works — live. Click a preset query to watch the diagram animate.
      </p>

      {/* Section A — Interactive Diagram */}
      <section className="mb-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="h-[520px] rounded-xl border border-white/8 bg-[#1e1e2e] overflow-hidden">
            <ReactFlow
              nodes={nodes.map((n) => ({
                ...n,
                style: n.id === activeNodeFromLog && isLoading ? NODE_STYLE_ACTIVE : n.style,
              }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} color="rgba(255,255,255,0.04)" />
            </ReactFlow>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Try a query
            </p>
            {PRESET_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handlePreset(q)}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-[#1e1e2e] px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-[#818cf8]/40 hover:text-[#818cf8] disabled:opacity-40"
              >
                <Play className="h-3 w-3 shrink-0" />
                {q}
              </button>
            ))}
            {isLoading && (
              <div className="rounded-lg border border-[#818cf8]/30 bg-[#818cf8]/10 px-4 py-3 text-sm text-[#818cf8]">
                Agent running…
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section B — Concept cards */}
      <section className="mb-16">
        <h2 className="mb-2 text-xl font-bold text-slate-50">The Stack Explained</h2>
        <p className="mb-6 text-sm text-slate-500">Click any card to expand the technical details.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CONCEPTS.map((c) => (
            <ConceptCard key={c.name} c={c} />
          ))}
        </div>
      </section>

      {/* Section C — Data flow walkthrough */}
      <section className="mb-16">
        <h2 className="mb-6 text-xl font-bold text-slate-50">Data Flow Walkthrough</h2>
        <p className="mb-6 text-sm text-slate-400">
          What happens, in order, when you submit a combined query like{" "}
          <em>"Is AAPL restricted, and what is its P/E ratio?"</em>
        </p>
        <ol className="space-y-3">
          {FLOW_STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-lg border border-white/8 bg-[#1e1e2e] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#818cf8]/20 text-xs font-bold text-[#818cf8]">
                {s.n}
              </span>
              <p className="text-sm text-slate-300">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
