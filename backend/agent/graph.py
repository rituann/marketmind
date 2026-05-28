import json
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from .state import AgentState

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

ROUTER_SYSTEM = """You are a routing agent for a fintech intelligence system.
Given a user query, decide which tools are needed:
- "finance": for stock prices, market data, technical indicators, company fundamentals
- "rag": for regulatory documents, compliance policies, internal trading rules
- "both": for questions that need both market data AND regulatory information

Respond with ONLY a JSON object: {"tools": ["finance"], "reasoning": "brief explanation"}
or {"tools": ["rag"], "reasoning": "..."}
or {"tools": ["finance", "rag"], "reasoning": "..."}"""


def router_node(state: AgentState) -> AgentState:
    user_message = state["messages"][-1].content
    response = llm.invoke([
        SystemMessage(content=ROUTER_SYSTEM),
        HumanMessage(content=user_message)
    ])
    try:
        parsed = json.loads(response.content)
        next_tools = parsed.get("tools", ["finance"])
        reasoning = parsed.get("reasoning", "")
    except (json.JSONDecodeError, AttributeError):
        next_tools = ["finance", "rag"]
        reasoning = "Defaulting to both tools"

    log_entry = {
        "type": "routing",
        "node": "router",
        "data": {"decision": next_tools, "reasoning": reasoning}
    }
    return {
        "next_tools": next_tools,
        "execution_log": state.get("execution_log", []) + [log_entry],
        "error": None,
    }


def finance_node(state: AgentState) -> AgentState:
    from .mcp_client import run_finance_tool
    user_message = state["messages"][-1].content

    result = run_finance_tool(user_message)
    log_entry = {
        "type": "tool_call",
        "node": "finance",
        "data": result
    }
    return {
        "finance_result": result,
        "execution_log": state.get("execution_log", []) + [log_entry],
    }


def rag_node(state: AgentState) -> AgentState:
    from rag.retriever import search_docs
    user_message = state["messages"][-1].content

    try:
        chunks = search_docs(user_message)
        log_entry = {
            "type": "tool_call",
            "node": "rag",
            "data": {"query": user_message, "chunks": chunks, "count": len(chunks)}
        }
        return {
            "rag_result": chunks,
            "execution_log": state.get("execution_log", []) + [log_entry],
        }
    except Exception as e:
        log_entry = {
            "type": "tool_call",
            "node": "rag",
            "data": {"error": str(e), "chunks": []}
        }
        return {
            "rag_result": [],
            "execution_log": state.get("execution_log", []) + [log_entry],
        }


def synth_node(state: AgentState) -> AgentState:
    user_message = state["messages"][-1].content
    context_parts = []

    if state.get("finance_result"):
        fr = state["finance_result"]
        if "error" not in fr:
            context_parts.append(f"MARKET DATA:\n{json.dumps(fr, indent=2)}")
        else:
            context_parts.append(f"MARKET DATA ERROR: {fr['error']}")

    if state.get("rag_result"):
        docs_text = "\n---\n".join(state["rag_result"])
        context_parts.append(f"REGULATORY DOCUMENTS:\n{docs_text}")

    if state.get("error"):
        context_parts.append(f"NOTE: {state['error']}")

    context = "\n\n".join(context_parts) if context_parts else "No tool data available."

    system = """You are a fintech market intelligence analyst.
Answer the user's question using the provided tool data.
Be concise, factual, and cite specific numbers or policy text when available.
If tool data shows an error, acknowledge it gracefully."""

    response = llm.invoke([
        SystemMessage(content=system),
        HumanMessage(content=f"Context:\n{context}\n\nQuestion: {user_message}")
    ])

    log_entry = {
        "type": "synthesis",
        "node": "synth",
        "data": {"response_length": len(response.content)}
    }
    return {
        "messages": [AIMessage(content=response.content)],
        "execution_log": state.get("execution_log", []) + [log_entry],
    }


def route_after_router(state: AgentState) -> str:
    tools = state.get("next_tools", ["finance"])
    if "finance" in tools:
        return "finance"
    return "rag"


def route_after_finance(state: AgentState) -> str:
    if "rag" in state.get("next_tools", []):
        return "rag"
    return "synth"


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("router", router_node)
    g.add_node("finance", finance_node)
    g.add_node("rag", rag_node)
    g.add_node("synth", synth_node)

    g.set_entry_point("router")
    g.add_conditional_edges("router", route_after_router, {"finance": "finance", "rag": "rag"})
    g.add_conditional_edges("finance", route_after_finance, {"rag": "rag", "synth": "synth"})
    g.add_edge("rag", "synth")
    g.add_edge("synth", END)
    return g.compile()


graph = build_graph()
