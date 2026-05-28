"""
MCP Finance Server — wraps yfinance + financedatabase.
Can be called two ways:
  1. python finance_server.py --call '{"tool":"get_stock_quote","arguments":{"ticker":"AAPL"}}'
  2. As a proper MCP stdio server (for future langchain-mcp-adapters integration)
"""
import sys
import json
import argparse


def get_stock_quote(ticker: str) -> dict:
    try:
        import yfinance as yf
        t = yf.Ticker(ticker.upper())
        info = t.info
        if not info or info.get("regularMarketPrice") is None:
            price = None
            hist = t.history(period="1d")
            if not hist.empty:
                price = round(float(hist["Close"].iloc[-1]), 2)
        else:
            price = info.get("regularMarketPrice") or info.get("currentPrice")

        if price is None:
            return {"error": f"No price data found for '{ticker}'. The symbol may be invalid."}

        return {
            "ticker": ticker.upper(),
            "price": price,
            "currency": info.get("currency", "USD"),
            "change_pct": round(info.get("regularMarketChangePercent", 0) or 0, 2),
            "volume": info.get("regularMarketVolume") or info.get("volume"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE") or info.get("forwardPE"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "company_name": info.get("longName") or info.get("shortName", ticker.upper()),
        }
    except Exception as e:
        return {"error": str(e)}


def get_technicals(ticker: str) -> dict:
    try:
        import yfinance as yf
        import pandas as pd
        t = yf.Ticker(ticker.upper())
        hist = t.history(period="1y")

        if hist.empty:
            return {"error": f"No historical data for '{ticker}'"}

        close = hist["Close"]

        sma50 = round(float(close.rolling(50).mean().iloc[-1]), 2) if len(close) >= 50 else None
        sma200 = round(float(close.rolling(200).mean().iloc[-1]), 2) if len(close) >= 200 else None

        # RSI-14
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss
        rsi = round(float(100 - (100 / (1 + rs.iloc[-1]))), 2)

        # MACD (12/26/9)
        ema12 = close.ewm(span=12).mean()
        ema26 = close.ewm(span=26).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9).mean()
        macd_val = round(float(macd_line.iloc[-1]), 4)
        signal_val = round(float(signal_line.iloc[-1]), 4)

        current_price = round(float(close.iloc[-1]), 2)
        trend = "ABOVE" if (sma50 and current_price > sma50) else "BELOW"

        return {
            "ticker": ticker.upper(),
            "current_price": current_price,
            "rsi_14": rsi,
            "sma_50": sma50,
            "sma_200": sma200,
            "macd": macd_val,
            "macd_signal": signal_val,
            "macd_histogram": round(macd_val - signal_val, 4),
            "price_vs_sma50": trend,
            "rsi_signal": "Overbought" if rsi > 70 else ("Oversold" if rsi < 30 else "Neutral"),
        }
    except Exception as e:
        return {"error": str(e)}


def search_tickers(query: str) -> dict:
    try:
        import financedatabase as fd
        equities = fd.Equities()
        results = equities.search(name=query)
        if results.empty:
            return {"results": [], "message": f"No tickers found for '{query}'"}
        top = results.head(5).reset_index()
        return {
            "results": [
                {"ticker": row.get("symbol", str(row.name)), "name": row.get("name", ""), "country": row.get("country", "")}
                for _, row in top.iterrows()
            ]
        }
    except Exception as e:
        # Fallback to yfinance
        try:
            import yfinance as yf
            ticker = yf.Ticker(query.upper())
            info = ticker.info
            if info and info.get("longName"):
                return {"results": [{"ticker": query.upper(), "name": info["longName"], "country": info.get("country", "")}]}
        except Exception:
            pass
        return {"error": str(e)}


TOOLS = {
    "get_stock_quote": get_stock_quote,
    "get_technicals": get_technicals,
    "search_tickers": search_tickers,
}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--call", type=str, help="JSON payload: {tool, arguments}")
    args = parser.parse_args()

    if args.call:
        try:
            payload = json.loads(args.call)
            tool_name = payload["tool"]
            arguments = payload.get("arguments", {})
            if tool_name not in TOOLS:
                print(json.dumps({"error": f"Unknown tool: {tool_name}"}))
                sys.exit(1)
            result = TOOLS[tool_name](**arguments)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
    else:
        print(json.dumps({"error": "Use --call flag"}))
        sys.exit(1)
