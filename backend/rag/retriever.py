from pathlib import Path
from functools import lru_cache
from rank_bm25 import BM25Okapi

DOCS_DIR = Path(__file__).parent / "docs"


@lru_cache(maxsize=1)
def _build_index():
    """
    Load all .txt docs, split into paragraphs, and build a BM25 index.
    Called once on first query; result is cached for the process lifetime.
    Replaces sentence-transformers + ChromaDB to stay within Render free-tier
    512 MB RAM limit (PyTorch alone consumed ~300 MB).
    """
    chunks = []   # tokenised word lists for BM25
    metadata = [] # (source_name, raw_text) for each chunk

    for txt_file in sorted(DOCS_DIR.glob("*.txt")):
        text = txt_file.read_text(encoding="utf-8")
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 40]
        for para in paragraphs:
            chunks.append(para.lower().split())
            metadata.append((txt_file.stem, para))

    return BM25Okapi(chunks), metadata


def search_docs(query: str, k: int = 3) -> list[str]:
    if not DOCS_DIR.exists():
        return ["[RAG] No documents directory found."]

    bm25, metadata = _build_index()
    scores = bm25.get_scores(query.lower().split())

    top_k = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
    results = [
        f"[Source: {metadata[i][0]}]\n{metadata[i][1]}"
        for i in top_k
        if scores[i] > 0
    ]
    return results or ["No relevant regulatory documents found for this query."]
