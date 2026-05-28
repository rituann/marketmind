from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    next_tools: list[str]          # ["finance"], ["rag"], or ["finance", "rag"]
    finance_result: dict | None
    rag_result: list[str] | None
    execution_log: list[dict]      # each entry becomes one SSE event
    error: str | None
