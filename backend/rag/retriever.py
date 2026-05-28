from pathlib import Path
from rank_bm25 import BM25Okapi

DOCS_DIR = Path(__file__).parent / "docs"

# Module-level cache — invalidated whenever a session doc is added
_session_docs: list[tuple[str, str]] = []  # (display_name, text)
_cached_index: tuple | None = None          # (BM25Okapi, metadata)


def _build_index() -> tuple:
    global _cached_index
    if _cached_index is not None:
        return _cached_index

    chunks: list[list[str]] = []
    metadata: list[tuple[str, str]] = []

    for txt_file in sorted(DOCS_DIR.glob("*.txt")):
        text = txt_file.read_text(encoding="utf-8")
        for para in text.split("\n\n"):
            para = para.strip()
            if len(para) > 40:
                chunks.append(para.lower().split())
                metadata.append((txt_file.stem, para))

    for name, text in _session_docs:
        for para in text.split("\n\n"):
            para = para.strip()
            if len(para) > 40:
                chunks.append(para.lower().split())
                metadata.append((name, para))

    _cached_index = (BM25Okapi(chunks), metadata)
    return _cached_index


def add_session_doc(name: str, text: str) -> None:
    global _cached_index
    _session_docs.append((name, text))
    _cached_index = None  # invalidate so next query rebuilds with the new doc


def list_docs() -> dict:
    static = sorted(f.stem for f in DOCS_DIR.glob("*.txt"))
    session = [name for name, _ in _session_docs]
    return {"static": static, "session": session}


def search_docs(query: str, k: int = 3) -> list[str]:
    if not DOCS_DIR.exists() and not _session_docs:
        return ["[RAG] No documents found."]

    bm25, metadata = _build_index()
    scores = bm25.get_scores(query.lower().split())
    top_k = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]

    results = [
        f"[Source: {metadata[i][0]}]\n{metadata[i][1]}"
        for i in top_k
        if scores[i] > 0
    ]
    return results or ["No relevant documents found for this query."]
