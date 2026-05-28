# Feature Implementation Plan — Market-Agent UI

**Overall Progress:** `100%` (All steps complete)

---

## TLDR

A proper multi-page website (Next.js) backed by a FastAPI + LangGraph Python server. Users chat with an AI agent on `/demo`; a separate `/architecture` page has an interactive React Flow diagram that animates live as the agent runs. The whole stack is free and open-source. Three pages: landing (`/`), demo (`/demo`), architecture (`/architecture`).

---

## Final Architecture

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 15 (App Router)  →  Vercel (free)   │
│                                                          │
│  /           Hero page: tagline, CTAs, tech badges       │
│  /demo        Chat UI (left) + Event log panel (right)   │
│  /architecture React Flow diagram + concept card grid    │
└──────────────────────┬───────────────────────────────────┘
                       │  SSE (Server-Sent Events)
                       │  POST /api/chat → streaming response
                       ▼
┌──────────────────────────────────────────────────────────┐
│  BACKEND — FastAPI (Python)  →  Render.com (free tier)  │
│                                                          │
│  POST /api/chat   Triggers LangGraph, streams events     │
│  GET  /api/health Health check for Render keep-alive     │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│  ORCHESTRATOR — LangGraph state machine                  │
│                                                          │
│  router_node   → decides: finance / rag / both           │
│  finance_node  → MCP server (yfinance + financedatabase) │
│  rag_node      → ChromaDB (mock regulatory docs)         │
│  synth_node    → Groq LLM (llama-3.3-70b, free)         │
└──────────────────────────────────────────────────────────┘
```

**SSE event stream format** (FastAPI → Next.js):
```json
{ "type": "routing",  "node": "router",  "data": { "decision": "both" } }
{ "type": "tool_call","node": "finance", "data": { "ticker": "AAPL", "result": {...} } }
{ "type": "tool_call","node": "rag",     "data": { "query": "...", "chunks": [...] } }
{ "type": "synthesis","node": "synth",   "data": { "token": "Based on..." } }
{ "type": "done",     "node": null,      "data": {} }
```

---

## Critical Decisions

- **Frontend: Next.js 15 (App Router)** — Streamlit cannot do multi-page routing, React Flow diagrams, or custom nav. Next.js is the right tool the moment we need a "real website."
- **LLM: Groq free tier (`llama-3.3-70b-versatile`)** — Best free option for tool-calling agents. Free key at console.groq.com, no credit card.
- **Streaming: SSE (Server-Sent Events)** — One-directional, works through standard HTTP (no WebSocket upgrade needed). FastAPI `StreamingResponse` + browser `EventSource` / `fetch` with `ReadableStream`.
- **Architecture diagram: React Flow** — Free, open-source, built for node-graph UIs. Nodes change color based on incoming SSE events.
- **Backend host: Render.com** — Free tier for Python services. Note: free tier spins down after 15 min of inactivity (first request takes ~30s to wake up). Acceptable for a demo/portfolio project.
- **Frontend host: Vercel** — Free tier, perfect for Next.js. Instant deploys from GitHub.
- **Vector DB: ChromaDB (pre-built, committed to repo)** — Render's filesystem is also ephemeral; pre-building and committing the index solves this for both local and cloud.
- **Embeddings: `sentence-transformers/all-MiniLM-L6-v2`** — Runs fully on CPU, no API key, good semantic search quality.
- **Design: Dark mode** — Background `#0a0a0f`, accent `#06b6d4` (cyan), cards `#1e1e2e`. shadcn/ui dark theme as the component base.

---

## Concept Cards (Architecture Page)

These 8 cards appear on `/architecture`. Each has a one-line summary (visible to all) and an expandable technical deep-dive (for developers):

| # | Concept | One-liner |
|---|---|---|
| 1 | **LangGraph** | State machine that controls how the AI decides what to do next |
| 2 | **MCP (Model Context Protocol)** | A USB-C standard for connecting AI to external data sources |
| 3 | **RAG** | Giving the LLM access to documents it was never trained on |
| 4 | **Tool Calling** | How the LLM says "I need to look something up" and actually does it |
| 5 | **Embeddings** | Converting text into numbers so you can search by meaning, not keywords |
| 6 | **Vector Database (ChromaDB)** | A search engine that finds semantically similar content |
| 7 | **SSE Streaming** | How the answer arrives word-by-word instead of all at once |
| 8 | **Agent Orchestration** | How all the pieces connect into one intelligent system |

---

## Tasks

- [x] 🟩 **Step 1: Project Structure & Environment**
  - [ ] 🟥 Create monorepo layout: `backend/` (Python) + `frontend/` (Next.js)
  - [ ] 🟥 Backend: `backend/requirements.txt` — fastapi, uvicorn, langgraph, langchain, langchain-groq, langchain-mcp-adapters, mcp, yfinance, financedatabase, chromadb, sentence-transformers, python-dotenv
  - [ ] 🟥 Backend: `backend/.env.example` — `GROQ_API_KEY=` placeholder
  - [ ] 🟥 Backend: Python virtual environment setup instructions
  - [ ] 🟥 Frontend: scaffold Next.js 15 app with `--typescript --tailwind --app` flags
  - [ ] 🟥 Frontend: install shadcn/ui (dark theme), React Flow (`@xyflow/react`)
  - [ ] 🟥 Set up CORS on FastAPI to allow requests from the Next.js dev server (`localhost:3000`) and the Vercel production URL

  > **Why a monorepo:** backend and frontend are separate deployments (Render + Vercel) but live in the same GitHub repo. Simpler to manage, and Vercel/Render each deploy their own subdirectory.

---

- [x] 🟩 **Step 2: LangGraph State Machine (backend)**
  - [ ] 🟥 `backend/agent/state.py` — `AgentState` TypedDict:
    - `messages: list[BaseMessage]`
    - `next_tools: list[str]` — e.g. `["finance"]`, `["rag"]`, `["finance", "rag"]`
    - `finance_result: dict | None`
    - `rag_result: list[str] | None`
    - `execution_log: list[dict]` — each entry becomes an SSE event
    - `error: str | None`
  - [ ] 🟥 `backend/agent/graph.py` — 4 nodes wired into a `StateGraph`:
    - `router_node` — Groq LLM reads the query, outputs `next_tools`
    - `finance_node` — stub (returns dummy data for now)
    - `rag_node` — stub (returns dummy data for now)
    - `synth_node` — Groq LLM synthesizes final answer from state
  - [ ] 🟥 Conditional edge from `router_node`: routes to `finance_node`, `rag_node`, or both (sequentially)
  - [ ] 🟥 Smoke-test the graph with a dummy query from a Python script

  > **LangGraph explained:** Think of it like a flowchart for the AI. Each "node" is a Python function that reads the current state and returns an updated state. "Edges" define which node runs next (and can be conditional). The graph keeps running until it reaches `END`.

---

- [x] 🟩 **Step 3: MCP Finance Server (backend)**
  - [ ] 🟥 `backend/mcp_servers/finance_server.py` using the `mcp` Python SDK:
    - `get_stock_quote(ticker: str)` → price, change%, volume, market cap, P/E ratio
    - `get_technicals(ticker: str)` → RSI-14, 50-day SMA, 200-day SMA, MACD signal
    - `search_tickers(query: str)` → matching tickers + company names
  - [ ] 🟥 All 3 tools wrapped in try/except — return `{"error": "message"}` dict instead of raising
  - [ ] 🟥 `backend/agent/mcp_client.py` — `MultiServerMCPClient` configured to launch `finance_server.py` via `stdio` transport
  - [ ] 🟥 Replace `finance_node` stub with real MCP tool calls
  - [ ] 🟥 Test: `python -c "from agent.graph import graph; ..."` → ask for AAPL price

  > **MCP explained:** Your `finance_server.py` is a tiny server process that speaks a standard protocol (like a waiter who knows the menu). LangChain's `MultiServerMCPClient` starts that process and translates its tools into something LangGraph can call. The AI never directly imports yfinance — it calls the MCP server and gets back JSON, the same way a browser calls an API.

---

- [x] 🟩 **Step 4: RAG Pipeline (backend)**
  - [ ] 🟥 Create 3 mock regulatory documents in `backend/rag/docs/`:
    - `sec_rule_10b5.txt` — insider trading prohibition, key definitions, examples
    - `mifid2_summary.txt` — MiFID II compliance overview, reporting requirements
    - `trading_blackout_policy.txt` — internal blackout periods, restricted tickers list (includes AAPL, TSLA, MSFT)
  - [ ] 🟥 `backend/rag/ingest.py`:
    - Load docs → split into 500-char chunks (50-char overlap) via `RecursiveCharacterTextSplitter`
    - Embed with `sentence-transformers/all-MiniLM-L6-v2` (local, free, no API key)
    - Persist to `backend/rag/chroma_db/`
  - [ ] 🟥 Run `ingest.py` once, commit `backend/rag/chroma_db/` to git
  - [ ] 🟥 `backend/rag/retriever.py` — load persisted ChromaDB, expose `search_docs(query: str) -> list[str]` returning top-3 chunks
  - [ ] 🟥 Replace `rag_node` stub with real ChromaDB retrieval
  - [ ] 🟥 Test: ask the graph about insider trading rules

  > **RAG explained:** The LLM has never read your compliance documents (they're not in its training data). RAG solves this: before calling the LLM, we search the documents for the most relevant paragraphs and paste them into the LLM's prompt. The LLM reads those paragraphs and answers as if it "knows" the documents. Embeddings make the search semantic — "trading restrictions" finds "blackout period policy" even though those words don't overlap.

---

- [x] 🟩 **Step 5: FastAPI Streaming Endpoint (backend)**
  - [ ] 🟥 `backend/main.py` — FastAPI app with:
    - `POST /api/chat` — receives `{ "message": "..." }`, returns `StreamingResponse` in SSE format
    - `GET /api/health` — returns `{"status": "ok"}` (Render.com uses this for uptime monitoring)
    - CORS configured for `localhost:3000` and the production Vercel URL
  - [ ] 🟥 In the `/api/chat` handler: run `graph.astream_events()`, serialize each event as `data: {json}\n\n` (SSE format), yield into the stream
  - [ ] 🟥 Map LangGraph event types to the SSE event schema:
    - `on_chain_start` with node name → `{ type: "routing" | "tool_call" | "synthesis", node: "..." }`
    - `on_tool_end` → include raw tool output in `data`
    - `on_llm_new_token` → `{ type: "synthesis", data: { token: "..." } }`
    - `on_chain_end` at the graph level → `{ type: "done" }`
  - [ ] 🟥 Test the endpoint with `curl -N -X POST localhost:8000/api/chat -d '{"message":"What is AAPL price?"}'`

  > **SSE explained:** SSE (Server-Sent Events) is like a one-way radio broadcast from server to browser. The browser makes one HTTP request, and the server keeps the connection open, pushing new lines of data as they're ready. Each line is `data: {json}\n\n`. The browser reads these one by one, which is how the response appears word-by-word rather than all at once.

---

- [x] 🟩 **Step 6: Next.js App Shell (frontend)**
  - [ ] 🟥 Configure shadcn/ui dark theme in `tailwind.config.ts` with custom colors:
    - Background: `#0a0a0f`, Surface: `#1e1e2e`, Accent: `#06b6d4` (cyan)
  - [ ] 🟥 `frontend/components/Navbar.tsx` — top nav with logo + links: Demo | Architecture
  - [ ] 🟥 `frontend/app/layout.tsx` — root layout wrapping all pages with `<Navbar />`
  - [ ] 🟥 Create a shared `useChatStream` hook in `frontend/hooks/useChatStream.ts`:
    - Takes a message string
    - `fetch`es `POST /api/chat` with `Accept: text/event-stream`
    - Parses SSE events line-by-line
    - Returns: `{ response, executionLog, activeNode, isLoading }`
    - `activeNode` is the key one — used to highlight React Flow nodes on the architecture page

---

- [x] 🟩 **Step 7: Landing Page (`/`)**
  - [ ] 🟥 `frontend/app/page.tsx` — hero section:
    - Project name + tagline ("AI-powered fintech intelligence. Live.")
    - Two primary CTAs: "Try the Demo →" and "How It Works →"
    - Tech badge strip: LangGraph · MCP · RAG · Groq · ChromaDB · Next.js
  - [ ] 🟥 Brief 3-card "what it does" section below the hero:
    - Card 1: "Live Market Data" (MCP finance server)
    - Card 2: "Regulatory Intelligence" (RAG pipeline)
    - Card 3: "Transparent AI" (Under the Hood panel)
  - [ ] 🟥 Dark mode styling, cyan accents, minimal animations (fade-in on scroll via Tailwind)

---

- [x] 🟩 **Step 8: Demo Page (`/demo`)**
  - [ ] 🟥 `frontend/app/demo/page.tsx` — two-column layout:
    - Left (60%): chat thread with user/assistant messages, `<input>` at bottom
    - Right (40%): "Under the Hood" event log panel
  - [ ] 🟥 Chat column: renders message history, streams the assistant response token-by-token using `useChatStream`
  - [ ] 🟥 "Under the Hood" panel: renders `executionLog` from the stream as a vertical timeline:
    - Each event is a card showing: node name, timestamp, and collapsible raw JSON
    - Color-coded: router=yellow, finance=blue, rag=green, synthesis=purple
  - [ ] 🟥 Loading states: show a pulsing indicator while `isLoading` is true
  - [ ] 🟥 Error state: if `type: "error"` arrives in stream, display friendly message

---

- [x] 🟩 **Step 9: Architecture Page (`/architecture`)**
  - [ ] 🟥 `frontend/app/architecture/page.tsx` — three sections stacked vertically:

  **Section A — Interactive Diagram (top)**
  - [ ] 🟥 React Flow graph with 6 nodes: `User Input → Router → [Finance MCP, RAG] → Synthesizer → Response`
  - [ ] 🟥 Each node has a default style (dark card) and an `active` style (cyan glow + border)
  - [ ] 🟥 "Try it" widget with 3 preset queries as clickable buttons:
    - "What is Apple's P/E ratio?" (finance only)
    - "What do our compliance docs say about insider trading?" (RAG only)
    - "Is AAPL restricted in our trading policy, and what's its current price?" (both)
  - [ ] 🟥 Clicking a preset query calls `useChatStream`; `activeNode` from the stream drives which React Flow node glows

  **Section B — Concept Cards (middle)**
  - [ ] 🟥 8-card grid (2 columns on desktop, 1 on mobile), one per concept listed in the Critical Decisions section
  - [ ] 🟥 Each card: icon + concept name + one-liner (always visible) + `<details>` expandable section with technical explanation + a relevant code snippet (3-5 lines max)

  **Section C — Data Flow Walkthrough (bottom)**
  - [ ] 🟥 Step-by-step numbered list walking through exactly what happens when you submit a combined query:
    1. Next.js sends POST to FastAPI
    2. FastAPI starts LangGraph graph
    3. Router node calls Groq to decide which tools to use
    4. Finance node starts MCP subprocess, calls get_stock_quote()
    5. RAG node embeds query, searches ChromaDB, returns top-3 chunks
    6. Synthesizer node calls Groq with all gathered data
    7. Response streams back token-by-token via SSE

---

- [ ] 🟥 **Step 10: End-to-End Integration Test**
  - [ ] 🟥 Run backend locally (`uvicorn main:app --reload`) + frontend (`npm run dev`)
  - [ ] 🟥 Test Query A (finance only): "What is Tesla's current stock price and RSI?"
  - [ ] 🟥 Test Query B (RAG only): "What are MiFID II reporting requirements?"
  - [ ] 🟥 Test Query C (combined): "Is Apple in our blackout policy, and what's its P/E ratio?"
  - [ ] 🟥 Test Query D (failure): "What is the price of NOTASTOCK999?"
  - [ ] 🟥 Verify React Flow diagram animates correctly for each query type
  - [ ] 🟥 Verify concept card expandables render correctly

---

- [ ] 🟥 **Step 11: Deployment**
  - [ ] 🟥 Push project to GitHub (new repo: `finance-market-agent`)
  - [ ] 🟥 **Render.com** — deploy `backend/` as a Python web service:
    - Build command: `pip install -r requirements.txt`
    - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
    - Add `GROQ_API_KEY` as environment variable in Render dashboard
    - Free tier: note the 15-min spin-down; acceptable for portfolio demo
  - [ ] 🟥 **Vercel** — deploy `frontend/` directory:
    - Add `NEXT_PUBLIC_API_URL=https://<your-render-url>` as environment variable
    - Update FastAPI CORS to include the Vercel production URL
  - [ ] 🟥 Test the live deployed URLs end-to-end
  - [ ] 🟥 Add `NEXT_PUBLIC_API_URL` to `.env.local` for local dev pointing to `http://localhost:8000`

---

## Open Decisions (Settle When We Get There)

1. **Mock doc realism**: Should the 3 regulatory docs be minimal stubs or more realistic multi-paragraph content? More realistic = more interesting RAG results in the demo.
2. **MACD on the finance panel**: Include MACD alongside RSI/SMA on the "Under the Hood" display? One more yfinance calculation.
3. **React Flow layout**: Top-to-bottom linear flow vs. a branching diamond shape showing the parallel finance/RAG calls? Diamond is more accurate, slightly more complex to set up.

---

## File Map

```
finance-market-agent/
├── backend/
│   ├── agent/
│   │   ├── graph.py          ← LangGraph state machine
│   │   ├── state.py          ← AgentState TypedDict
│   │   └── mcp_client.py     ← MultiServerMCPClient config
│   ├── mcp_servers/
│   │   └── finance_server.py ← Custom MCP server (yfinance + financedatabase)
│   ├── rag/
│   │   ├── docs/             ← 3 mock regulatory text files
│   │   ├── ingest.py         ← One-time script to build ChromaDB index
│   │   ├── retriever.py      ← ChromaDB search wrapper
│   │   └── chroma_db/        ← Pre-built index (committed to git)
│   ├── main.py               ← FastAPI app + /api/chat SSE endpoint
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx        ← Root layout with Navbar
│   │   ├── page.tsx          ← / landing page
│   │   ├── demo/
│   │   │   └── page.tsx      ← /demo chat interface
│   │   └── architecture/
│   │       └── page.tsx      ← /architecture diagram + concept cards
│   ├── components/
│   │   └── Navbar.tsx
│   ├── hooks/
│   │   └── useChatStream.ts  ← Shared SSE streaming hook
│   ├── tailwind.config.ts    ← Dark theme + custom colors
│   └── package.json
│
├── PLAN.md
└── ISSUE.md
```
