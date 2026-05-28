# MarketMind — AI Fintech Intelligence Agent

An AI analyst that reads live market data and your compliance documents at the same time.

**Live:** [playmarketmind.vercel.app](https://playmarketmind.vercel.app)  
**Repo:** [github.com/rituann/marketmind](https://github.com/rituann/marketmind)

---

## What It Does

Ask any question about a stock or a compliance policy. MarketMind:

1. Routes your query through a **LangGraph state machine** to decide which tools are needed
2. Pulls live prices, RSI, MACD, and P/E ratios via a **custom MCP finance server** (yfinance)
3. Searches internal regulatory documents via a **RAG pipeline** (ChromaDB + sentence-transformers)
4. Streams a synthesized answer back **token-by-token via SSE** — with every agent decision visible in real time

**Example queries:**
- *"What is Tesla's current RSI and is it overbought?"*
- *"What do our compliance docs say about insider trading?"*
- *"Is Apple on our restricted list, and what's its current P/E ratio?"*

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend — Next.js 15 (Vercel)             │
│  /           Landing page                   │
│  /demo       Chat UI + event log panel      │
│  /architecture  React Flow diagram + docs   │
└──────────────────┬──────────────────────────┘
                   │  SSE  (POST /api/chat)
                   ▼
┌─────────────────────────────────────────────┐
│  Backend — FastAPI (Render.com)             │
│  POST /api/chat   LangGraph + SSE stream    │
│  GET  /api/health Render uptime check       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  LangGraph State Machine                    │
│                                             │
│  router_node  → Groq LLM decides tools     │
│  finance_node → MCP server (yfinance)      │
│  rag_node     → ChromaDB similarity search │
│  synth_node   → Groq LLM final answer      │
└─────────────────────────────────────────────┘
```

### SSE Event Stream (FastAPI → Next.js)

```json
{ "type": "node_start",   "node": "router",  "data": {} }
{ "type": "routing",      "node": "router",  "data": { "decision": ["finance", "rag"] } }
{ "type": "tool_call",    "node": "finance", "data": { "ticker": "AAPL", "quote": {...} } }
{ "type": "tool_call",    "node": "rag",     "data": { "chunks": [...] } }
{ "type": "synthesis",    "node": "synth",   "data": { "response_length": 312 } }
{ "type": "final_answer", "node": "synth",   "data": { "answer": "..." } }
{ "type": "done",         "node": null,      "data": {} }
```

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | **Next.js 15** (App Router) | Multi-page routing, React Flow, custom nav |
| Styling | **Tailwind CSS + shadcn/ui** | Dark theme, zero config |
| Architecture diagram | **React Flow (`@xyflow/react`)** | Node-graph UI with live animations |
| Icons | **Lucide React** | Consistent SVG icon set |
| Backend | **FastAPI** | Async-first, ideal for SSE streaming |
| AI orchestration | **LangGraph** | Explicit state machine — no black-box agent loops |
| LLM | **Groq** (`llama-3.3-70b-versatile`) | Free tier, fast inference, tool-calling support |
| Finance data | **yfinance** | Free, no API key — prices, RSI, MACD, P/E |
| Regulatory docs | **ChromaDB** + sentence-transformers | Local vector search, pre-built index committed to repo |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Free, CPU-only, 384-dim semantic search |
| Streaming | **SSE (Server-Sent Events)** | Standard HTTP, no WebSocket needed |
| Frontend deploy | **Vercel** (free tier) | Native Next.js host |
| Backend deploy | **Render.com** (free tier) | Free Python hosting; sleeps after 15 min inactivity |

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com) (no credit card required)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your GROQ_API_KEY

python rag/ingest.py            # Build ChromaDB index (run once)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
# Open http://localhost:3000
```

---

## Deployment

### Backend → Render.com

1. New Web Service → connect `rituann/marketmind`
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add env var: `GROQ_API_KEY=<your key>`

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after sleep takes ~30s to wake up.

### Frontend → Vercel

1. Import `rituann/marketmind` repo, set root directory to `frontend`
2. Add env var: `NEXT_PUBLIC_API_URL=https://<your-render-url>.onrender.com`
3. Deploy

---

## Key Design Decisions

**Why LangGraph over a simple LLM call?**  
The routing decision (finance vs RAG vs both) needs to be inspectable and testable. LangGraph gives you a real state machine with explicit nodes and edges — you can see exactly which path was taken and why.

**Why MCP for the finance server?**  
MCP (Model Context Protocol) is a standard protocol for connecting AI to tools. By wrapping yfinance as an MCP server, the architecture stays clean: the LLM calls a tool interface, not a library. Swapping yfinance for a real data provider later requires no changes to the agent.

**Why pre-commit the ChromaDB index?**  
Render's free tier has an ephemeral filesystem. Building the index at startup would add ~30s to every cold start. Committing the pre-built index means it's always ready.

**Why SSE over WebSockets?**  
SSE is one-directional, stateless, and works through standard HTTP — no upgrade handshake, no connection management. For a server-to-browser stream of agent events, it's simpler and more reliable than WebSockets.

---

## Project Structure

```
finance-market-agent/
├── backend/
│   ├── agent/
│   │   ├── graph.py          # LangGraph state machine (4 nodes)
│   │   ├── state.py          # AgentState TypedDict
│   │   └── mcp_client.py     # Finance tool calls (direct import)
│   ├── mcp_servers/
│   │   └── finance_server.py # yfinance tools: quote, technicals, search
│   ├── rag/
│   │   ├── docs/             # 3 mock regulatory documents
│   │   ├── ingest.py         # One-time ChromaDB index builder
│   │   ├── retriever.py      # Similarity search wrapper
│   │   └── chroma_db/        # Pre-built vector index (committed to git)
│   ├── main.py               # FastAPI app + /api/chat SSE endpoint
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── layout.tsx        # Root layout: Navbar + Footer
    │   ├── page.tsx          # / landing page
    │   ├── demo/page.tsx     # /demo chat + event log
    │   └── architecture/page.tsx  # /architecture diagram + concept cards
    ├── components/
    │   └── Navbar.tsx
    ├── hooks/
    │   └── useChatStream.ts  # SSE streaming hook
    └── package.json
```

---

Built by [Ritu George](https://github.com/rituann)
