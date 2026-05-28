"""
Calls the MCP finance server tools synchronously.
The MCP server runs as a subprocess via stdio transport.
"""
import subprocess
import json
import sys
import os


def _call_mcp_tool(tool_name: str, arguments: dict) -> dict:
    """Invoke a single tool on the MCP finance server via subprocess JSON-RPC."""
    server_path = os.path.join(os.path.dirname(__file__), "..", "mcp_servers", "finance_server.py")
    server_path = os.path.abspath(server_path)

    payload = json.dumps({"tool": tool_name, "arguments": arguments})
    try:
        result = subprocess.run(
            [sys.executable, server_path, "--call", payload],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return {"error": result.stderr.strip() or "MCP server error"}
        return json.loads(result.stdout.strip())
    except subprocess.TimeoutExpired:
        return {"error": "MCP server timed out after 30s"}
    except Exception as e:
        return {"error": str(e)}


COMPANY_NAME_MAP = {
    "apple": "AAPL", "tesla": "TSLA", "microsoft": "MSFT", "google": "GOOGL",
    "alphabet": "GOOGL", "amazon": "AMZN", "meta": "META", "facebook": "META",
    "nvidia": "NVDA", "netflix": "NFLX", "disney": "DIS", "berkshire": "BRK-B",
    "jpmorgan": "JPM", "goldman": "GS", "visa": "V", "mastercard": "MA",
    "walmart": "WMT", "salesforce": "CRM", "adobe": "ADBE", "intel": "INTC",
    "amd": "AMD", "uber": "UBER", "airbnb": "ABNB", "palantir": "PLTR",
}


def run_finance_tool(user_query: str) -> dict:
    """
    Given a free-text user query, extract the ticker and call the right MCP tools.
    Checks company name map first, then uppercase ticker regex, then falls back to search.
    """
    import re
    query_lower = user_query.lower()
    ticker = None

    for name, sym in COMPANY_NAME_MAP.items():
        if name in query_lower:
            ticker = sym
            break

    if not ticker:
        tickers = re.findall(r'\b[A-Z]{2,5}\b', user_query)
        stopwords = {"IS", "IT", "AT", "OR", "DO", "SO", "BE", "IN", "AND",
                     "FOR", "THE", "WHO", "CEO", "ETF", "IPO", "RSI", "RAG",
                     "AI", "US", "PE", "EPS", "INC", "LLC", "LTD"}
        known = [t for t in tickers if t not in stopwords]
        if known:
            ticker = known[0]

    if not ticker:
        return _call_mcp_tool("search_tickers", {"query": user_query})

    quote = _call_mcp_tool("get_stock_quote", {"ticker": ticker})
    technicals = _call_mcp_tool("get_technicals", {"ticker": ticker})

    return {
        "ticker": ticker,
        "quote": quote,
        "technicals": technicals
    }
