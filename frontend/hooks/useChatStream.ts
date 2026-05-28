"use client";
import { useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ExecutionEvent {
  type: "routing" | "tool_call" | "synthesis" | "node_start" | "error" | "final_answer" | "done";
  node: string | null;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface ChatStreamResult {
  response: string;
  executionLog: ExecutionEvent[];
  activeNode: string | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
}

export function useChatStream(): ChatStreamResult {
  const [response, setResponse] = useState("");
  const [executionLog, setExecutionLog] = useState<ExecutionEvent[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    setResponse("");
    setExecutionLog([]);
    setActiveNode(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw) as Omit<ExecutionEvent, "timestamp">;
            const stamped: ExecutionEvent = { ...event, timestamp: Date.now() };

            if (event.type === "done") {
              setActiveNode(null);
              setIsLoading(false);
            } else if (event.type === "final_answer") {
              const answer = event.data?.answer as string | undefined;
              if (answer) setResponse(answer);
              setActiveNode(null);
            } else if (event.type === "node_start" && event.node) {
              setActiveNode(event.node);
              setExecutionLog((prev) => [...prev, stamped]);
            } else if (event.type === "error") {
              const msg = event.data?.message as string | undefined;
              setError(msg ?? "Unknown error");
              setIsLoading(false);
            } else {
              if (event.node) setActiveNode(event.node);
              setExecutionLog((prev) => [...prev, stamped]);
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
      setActiveNode(null);
    }
  }, []);

  return { response, executionLog, activeNode, isLoading, error, sendMessage };
}
