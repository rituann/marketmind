import io
import json
import os
import zipfile
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Market-Agent API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "https://localhost:3000",
        "https://playmarketmind.vercel.app",
        "https://playmarketmind-me2mvozeq-ritzais-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/docs")
async def get_docs():
    from rag.retriever import list_docs
    return list_docs()


@app.post("/api/docs/upload")
async def upload_doc(file: UploadFile = File(...)):
    filename = file.filename or ""
    name = filename.rsplit(".", 1)[0] or "uploaded_doc"

    if filename.endswith(".txt"):
        raw = await file.read()
        text = raw.decode("utf-8", errors="ignore")

    elif filename.endswith(".docx"):
        raw = await file.read()
        try:
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                with z.open("word/document.xml") as f:
                    tree = ET.parse(f)
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = []
            for para in tree.findall(".//w:p", ns):
                texts = [node.text or "" for node in para.findall(".//w:t", ns)]
                joined = "".join(texts).strip()
                if joined:
                    paragraphs.append(joined)
            text = "\n\n".join(paragraphs)
        except Exception:
            raise HTTPException(status_code=400, detail="Could not parse .docx file.")

    else:
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty.")

    from rag.retriever import add_session_doc
    add_session_doc(name, text)
    return {"name": name, "characters": len(text), "status": "loaded"}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    from agent.graph import graph
    from langchain_core.messages import HumanMessage

    async def event_stream():
        initial_state = {
            "messages": [HumanMessage(content=req.message)],
            "next_tools": [],
            "finance_result": None,
            "rag_result": None,
            "execution_log": [],
            "error": None,
        }

        final_answer = ""

        try:
            async for event in graph.astream_events(initial_state, version="v2"):
                event_name = event.get("event", "")
                node_name = event.get("metadata", {}).get("langgraph_node", "")

                if event_name == "on_chain_start" and node_name in ("router", "finance", "rag", "synth"):
                    sse_event = {
                        "type": "node_start",
                        "node": node_name,
                        "data": {}
                    }
                    yield f"data: {json.dumps(sse_event)}\n\n"

                elif event_name == "on_chain_end" and node_name in ("router", "finance", "rag", "synth"):
                    output = event.get("data", {}).get("output", {})
                    if not isinstance(output, dict):
                        output = {}
                    log_entries = output.get("execution_log", [])
                    if log_entries:
                        latest = log_entries[-1]
                        sse_event = {
                            "type": latest.get("type", "tool_call"),
                            "node": node_name,
                            "data": latest.get("data", {})
                        }
                        yield f"data: {json.dumps(sse_event)}\n\n"

                    # Extract final answer from synth node
                    if node_name == "synth":
                        messages = output.get("messages", [])
                        if messages:
                            final_answer = messages[-1].content if hasattr(messages[-1], "content") else str(messages[-1])

        except Exception as e:
            error_event = {"type": "error", "node": None, "data": {"message": str(e)}}
            yield f"data: {json.dumps(error_event)}\n\n"

        # Always send the final answer + done signal
        if final_answer:
            yield f"data: {json.dumps({'type': 'final_answer', 'node': 'synth', 'data': {'answer': final_answer}})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'node': None, 'data': {}})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
