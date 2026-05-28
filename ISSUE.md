# Feature: Fintech Market Intelligence Agent — Full-Stack Build

**Type:** Feature  
**Priority:** High  
**Effort:** XL (11 phases)  
**Status:** ✅ Complete and deployed

---

## TL;DR

A proper multi-page website (Next.js) backed by a FastAPI + LangGraph Python server. Users chat with an AI agent on `/demo`; an `/architecture` page has an interactive React Flow diagram that animates live as the agent runs, plus 8 concept cards explaining the AI stack. Everything is free and open-source.

**Live URLs:**
- **Frontend:** https://playmarketmind.vercel.app
- **Backend:** https://marketmind-f8zl.onrender.com
- **GitHub:** https://github.com/rituann/marketmind

**Pages:** `/` (landing) · `/demo` (chat) · `/architecture` (interactive diagram + explainer)

---

## Stack (All Free)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | **Next.js 15** (App Router) | Multi-page routing, React Flow, custom nav — Streamlit can't do this |
| Styling | **Tailwind CSS + shadcn/ui** (dark theme) | Free, standard, dark mode out of the box |
| Icons | **Lucide React** | SVG icon set, replaces emojis for a polished look |
| Architecture diagram | **React Flow (`@xyflow/react`)** | Free, open-source, built for node-graph UIs |
| Backend | **FastAPI** (Python) | Lightweight, async-first, ideal for SSE streaming |
| Orchestrator | **LangGraph** | State machine with 4 explicit nodes for transparent routing |
| LLM | **Groq free tier** (`llama-3.3-70b-versatile`) | Best free tool-calling LLM; key from console.groq.com |
| MCP finance tools | **Custom MCP server** (`yfinance`) | Free, no API key, covers quotes + fundamentals + technicals |
| Vector DB | **ChromaDB** (pre-built index committed to repo) | Free, local, zero cloud account |
| Embeddings | **`sentence-transformers/all-MiniLM-L6-v2`** | Free, runs on CPU, no API key |
| Streaming | **SSE (Server-Sent Events)** | One-way HTTP stream, FastAPI → Next.js |
| Frontend deploy | **Vercel** (free tier) | Native Next.js host |
| Backend deploy | **Render.com** (free tier) | Free Python hosting; sleeps after 15 min inactivity |

---

## What Was Built

### Backend (`backend/`)
- `agent/state.py` — `AgentState` TypedDict with messages, next_tools, finance_result, rag_result, execution_log, error
- `agent/graph.py` — LangGraph graph: `router → [finance, rag] → synth → END`. Groq LLM drives routing and synthesis.
- `agent/mcp_client.py` — Calls yfinance tools directly (no subprocess). Company name map (Tesla→TSLA, Apple→AAPL, etc.) for natural language queries.
- `mcp_servers/finance_server.py` — Three tools: `get_stock_quote`, `get_technicals` (RSI, SMA, MACD), `search_tickers`. All wrapped in try/except.
- `rag/docs/` — Three mock regulatory documents: `sec_rule_10b5.txt`, `mifid2_summary.txt`, `trading_blackout_policy.txt`
- `rag/ingest.py` — One-time script: loads docs → splits into 500-char chunks → embeds with all-MiniLM-L6-v2 → persists ChromaDB
- `rag/retriever.py` — ChromaDB similarity search with cosine distance threshold 1.2. Uses `langchain_huggingface.HuggingFaceEmbeddings`.
- `rag/chroma_db/` — Pre-built vector index (32 chunks). Committed to git so Render doesn't rebuild on each deploy.
- `main.py` — FastAPI with SSE `StreamingResponse`. Maps `astream_events` to SSE schema. CORS for localhost + playmarketmind.vercel.app.

### Frontend (`frontend/`)
- `app/layout.tsx` — Root layout: Navbar + Footer (name + GitHub link)
- `app/page.tsx` — Landing: business-friendly hero text, 3 feature cards with Lucide icons, tech badge strip, CTAs
- `app/demo/page.tsx` — Chat (left) + Under the Hood panel (right). Mobile tab toggle. Cold-start banner. Clear chat button. Lucide icons throughout.
- `app/architecture/page.tsx` — React Flow diagram (6 nodes, cyan glow on active node). 8 concept cards (expandable with ChevronDown). Data flow walkthrough. Preset query buttons with Play icon.
- `hooks/useChatStream.ts` — SSE parser: returns `response`, `executionLog`, `activeNode`, `isLoading`, `error`, `sendMessage`
- `components/Navbar.tsx` — Sticky top nav: MarketMind logo + Demo/Architecture links

---

## Resolved Technical Issues

| Issue | Resolution |
|---|---|
| `financedatabase==2.2.2` doesn't exist | Pinned to `2.1.1`; loosened all version pins for Python 3.14 compat |
| `financedatabase.search()` API changed | Updated to `equities.search(name=query)` kwargs format |
| `langchain.text_splitter` removed | Migrated to `langchain_text_splitters` |
| `langchain_community.embeddings` deprecated | Migrated to `langchain_huggingface` |
| RAG retriever threshold too strict (0.8) | Raised to 1.2 — combined queries (finance + compliance) now find relevant chunks |
| Finance node timing out on Render | Removed subprocess-per-call MCP pattern; now calls yfinance functions directly |
| Company names not parsed (e.g. "Tesla") | Added `COMPANY_NAME_MAP` in mcp_client.py |
| Frontend `.git` nested repo | Removed `frontend/.git`; re-staged as regular directory |
| Emoji icons looked unprofessional | Replaced all 15+ emojis with Lucide React SVG icons |
| Render free-tier OOM crash on cold start | sentence-transformers pulled in PyTorch (~300 MB); replaced full stack (chromadb + sentence-transformers + langchain-chroma) with `rank-bm25` — pure Python, zero ML deps, ~1 MB RAM. BM25 builds index from raw .txt files in-memory on first query via `lru_cache`. |
| Conversational queries ("Hi", "how do I feed you data") returned "No tickers found" | Router had no "none" path — every query defaulted to finance tool. Added `tools: []` option to router prompt; `route_after_router` now short-circuits to synth when tools list is empty. Graph edge map updated to include `"synth"` as a valid router target. |

---

## Integration Test Results (all passing)

| Query | Route | Result |
|---|---|---|
| "What is Tesla's current stock price and RSI?" | `finance` | $440.36, RSI 64.16 |
| "What are MiFID II reporting requirements?" | `rag` | Real chunks from mifid2_summary.txt |
| "Is Apple in our blackout policy, and what's its PE?" | `finance + rag` | Blackout since Mar 15, PE 37.59 |
| "What is the stock price of NOTASTOCK999?" | `finance` | Graceful "not found" message |
| "Hi" | `none` | Clean conversational greeting, no tool errors |
| "How can I feed you data?" | `none` | Natural explanation of the system, no ticker error |

---

## UI/UX Improvements (Post-Deploy)

- **Emojis → Lucide icons** across all pages (landing cards, event log, arch nodes, concept cards)
- **Cold start banner** on demo page — dismissible amber notice about Render free tier 30s wakeup
- **Landing hero rewritten** for business audience (PMs, recruiters, fintech)
- **Footer** with author name and GitHub link
- **Mobile tab toggle** on demo page — "Chat" and "Under the Hood" tabs on small screens
- **Concept cards** — explicit ChevronDown icon + "Click any card to expand" hint
- **Clear chat button** (RotateCcw icon) on demo page

## Design Refresh (Session 2)

- **Accent colour**: Cyan (`#06b6d4`) → Indigo (`#818cf8` / `#6366f1`) — eliminates the "AI startup dark mode" signal
- **Font**: Added Inter via `next/font/google` (`--font-inter` CSS variable) — more authoritative than system-ui
- **Background**: `#0a0a0f` (near-black) → `#0f172a` (dark slate-navy) — lighter, easier on the eye, still dark
- **Hero badge removed**: The cyan pill "Agentic AI · Production Architecture" replaced with plain uppercase eyebrow `MARKET INTELLIGENCE PLATFORM`
- **Feature cards**: Centered layout with large icons (96×96px container, 48px icon) and `text-base` body copy — MBB editorial style rather than bullet-card style
- **Button text**: Corrected to white (indigo is darker than old cyan; `text-[#0a0a0f]` would have been illegible)
- **Vercel root directory fix**: Set `frontend` as root directory in Vercel dashboard to stop GitHub-triggered deployments from failing with "pages directory not found"
- **Architecture page**: Updated concept cards for BM25, "none" routing path, and all ChromaDB/sentence-transformers references

---

## Out of Scope

- User authentication or login
- Persistent chat history across sessions
- Real regulatory document ingestion (mock docs only)
- Multiple LLM provider support
- Real-time yfinance websocket streaming (polling only)
