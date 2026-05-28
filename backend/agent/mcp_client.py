"""
Calls the finance server tools directly (no subprocess overhead).
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from mcp_servers.finance_server import get_stock_quote, get_technicals, search_tickers

COMPANY_NAME_MAP = {
    "apple": "AAPL", "tesla": "TSLA", "microsoft": "MSFT", "google": "GOOGL",
    "alphabet": "GOOGL", "amazon": "AMZN", "meta": "META", "facebook": "META",
    "nvidia": "NVDA", "netflix": "NFLX", "disney": "DIS", "berkshire": "BRK-B",
    "jpmorgan": "JPM", "goldman": "GS", "visa": "V", "mastercard": "MA",
    "walmart": "WMT", "salesforce": "CRM", "adobe": "ADBE", "intel": "INTC",
    "amd": "AMD", "uber": "UBER", "airbnb": "ABNB", "palantir": "PLTR",
}


def run_finance_tool(user_query: str) -> dict:
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
        return search_tickers(user_query)

    quote = get_stock_quote(ticker)
    technicals = get_technicals(ticker)

    return {
        "ticker": ticker,
        "quote": quote,
        "technicals": technicals
    }
