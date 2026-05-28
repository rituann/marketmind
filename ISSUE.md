# Feature: Fintech Market Intelligence Agent — Full-Stack Build

**Type:** Feature  
**Priority:** High  
**Effort:** XL (multi-phase, 11 steps)  
**Status:** Ready for implementation

---

## TL;DR

A proper multi-page website (Next.js) backed by a FastAPI + LangGraph Python server. Users chat with an AI agent on `/demo`; an `/architecture` page has an interactive React Flow diagram that animates live as the agent runs, plus 8 concept cards explaining the AI stack. Everything is free and open-source.

**Pages:** `/` (landing) · `/demo` (chat) · `/architecture` (interactive diagram + explainer)

---

## Stack (Locked, All Free)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | **Next.js 15** (App Router) | Multi-page routing, React Flow, custom nav — Streamlit can't do this |
| Styling | **Tailwind CSS + shadcn/ui** (dark theme) | Free, standard, dark mode out of the box |
| Architecture diagram | **React Flow (`@xyflow/react`)** | Free, open-source, built for node-graph UIs |
| Backend | **FastAPI** (Python) | Lightweight, async-first, ideal for SSE streaming |
| Orchestrator | **LangGraph** | State machine with 4 explicit nodes for transparent routing |
| LLM | **Groq free tier** (`llama-3.3-70b-versatile`) | Best free tool-calling LLM; key from console.groq.com |
| MCP finance tools | **Custom MCP server** (`yfinance` + `financedatabase`) | Free, no API key, covers quotes + fundamentals + technicals |
| Vector DB | **ChromaDB** (pre-built index committed to repo) | Free, local, zero cloud account |
| Embeddings | **`sentence-transformers/all-MiniLM-L6-v2`** | Free, runs on CPU, no API key |
| Streaming | **SSE (Server-Sent Events)** | One-way HTTP stream, FastAPI → Next.js |
| Frontend deploy | **Vercel** (free tier) | Native Next.js host |
| Backend deploy | **Render.com** (free tier) | Free Python hosting (15-min spin-down on free tier) |

---

## Current State

Empty project directory. No code exists.

## Expected Outcome

Two deployed URLs:
1. **Vercel URL** (Next.js): 3-page website with landing, demo, and architecture pages
2. **Render URL** (FastAPI): backend API consumed by the frontend

A user visiting the demo page can ask a multi-part question (e.g., "Is Apple restricted in our compliance docs, and what's its P/E ratio?") and watch the LangGraph agent route the query, call the MCP finance server and RAG pipeline, and stream back a synthesized answer — with every step visible in the event log panel.

A user on the architecture page can click a preset query, watch the React Flow diagram animate in real time, and read layered explanations of every concept in the stack.

---

## LangGraph State Machine Design

```
router_node  →  finance_node  →  synth_node  →  END
             ↘  rag_node     ↗
```

State fields: `messages`, `next_tools`, `finance_result`, `rag_result`, `execution_log`, `error`

SSE event schema (FastAPI → browser):
```json
{ "type": "routing",   "node": "router",  "data": { "decision": "both" } }
{ "type": "tool_call", "node": "finance", "data": { "ticker": "AAPL", "result": {...} } }
{ "type": "tool_call", "node": "rag",     "data": { "query": "...", "chunks": [...] } }
{ "type": "synthesis", "node": "synth",   "data": { "token": "Based on..." } }
{ "type": "done",      "node": null,      "data": {} }
```

---

## Architecture Page Concept Cards

| Concept | One-liner |
|---|---|
| LangGraph | State machine that controls how the AI decides what to do next |
| MCP (Model Context Protocol) | A USB-C standard for connecting AI to external data sources |
| RAG | Giving the LLM access to documents it was never trained on |
| Tool Calling | How the LLM says "I need to look something up" and actually does it |
| Embeddings | Converting text into numbers so you can search by meaning, not keywords |
| Vector Database (ChromaDB) | A search engine that finds semantically similar content |
| SSE Streaming | How the answer arrives word-by-word instead of all at once |
| Agent Orchestration | How all the pieces connect into one intelligent system |

---

## Implementation Phases

### Phase 1 — Project Structure & Environment
- [ ] Monorepo: `backend/` + `frontend/` in one git repo
- [ ] `backend/requirements.txt`, `.env.example` (GROQ_API_KEY)
- [ ] Next.js scaffold with TypeScript, Tailwind, App Router
- [ ] shadcn/ui dark theme, React Flow installed

### Phase 2 — LangGraph State Machine
- [ ] `backend/agent/state.py` — AgentState TypedDict
- [ ] `backend/agent/graph.py` — 4 nodes + conditional edges (stubs first)

### Phase 3 — MCP Finance Server
- [ ] `backend/mcp_servers/finance_server.py` — 3 tools (quote, technicals, search)
- [ ] `backend/agent/mcp_client.py` — MultiServerMCPClient via stdio
- [ ] Replace finance_node stub with real MCP calls

### Phase 4 — RAG Pipeline
- [ ] `backend/rag/docs/` — 3 mock regulatory text files
- [ ] `backend/rag/ingest.py` — build + persist ChromaDB index
- [ ] `backend/rag/retriever.py` — search wrapper
- [ ] Replace rag_node stub with real ChromaDB calls
- [ ] Commit `backend/rag/chroma_db/` to git

### Phase 5 — FastAPI Streaming Endpoint
- [ ] `backend/main.py` — `POST /api/chat` as SSE StreamingResponse
- [ ] Map LangGraph `astream_events` to the SSE event schema above
- [ ] CORS for localhost:3000 + Vercel production URL

### Phase 6 — Next.js App Shell
- [ ] Custom dark theme colors in `tailwind.config.ts`
- [ ] `Navbar.tsx` with Demo and Architecture links
- [ ] `useChatStream.ts` shared hook (parses SSE, returns `activeNode`)

### Phase 7 — Landing Page (`/`)
- [ ] Hero: tagline + two CTAs + tech badge strip
- [ ] 3-card "what it does" section

### Phase 8 — Demo Page (`/demo`)
- [ ] Two-column: chat (left) + event log timeline (right)
- [ ] Streaming tokens + color-coded event cards

### Phase 9 — Architecture Page (`/architecture`)
- [ ] React Flow diagram (6 nodes, glow on `activeNode`)
- [ ] 3 preset query buttons wired to `useChatStream`
- [ ] 8 concept cards (expandable technical deep-dives)
- [ ] Data flow walkthrough (7-step numbered list)

### Phase 10 — End-to-End Integration Test
- [ ] 4 test queries (finance, RAG, combined, invalid ticker)
- [ ] Verify diagram animation + concept cards

### Phase 11 — Deployment
- [ ] GitHub repo push
- [ ] Render.com — FastAPI backend deploy
- [ ] Vercel — Next.js frontend deploy
- [ ] Set `NEXT_PUBLIC_API_URL` and `GROQ_API_KEY` env vars

---

## Technical Risks & Notes

| Risk | Mitigation |
|---|---|
| Render.com free tier spins down after 15 min inactivity | Add a "waking up..." loading state on the frontend; show a toast if first request takes >5s |
| ChromaDB index missing on Render cold start | Pre-build and commit `backend/rag/chroma_db/` to git |
| FastAPI CORS not configured for production Vercel URL | Update CORS origins in main.py after Vercel URL is known; use env var for flexibility |
| LangGraph `astream_events` async context in FastAPI | Use `async def` route handler; FastAPI handles the async loop natively |
| React Flow node layout | Use `dagre` layout library or manual positions for the 6-node diamond graph |
| `sentence-transformers` is ~500MB | Acceptable for Render deploy; cache in Docker layer if build times are slow |

---

## Out of Scope

- User authentication or login
- Persistent chat history across sessions
- Real regulatory document ingestion (mock docs only)
- Mobile-optimized layout (responsive but not mobile-first)
- Multiple LLM provider support
