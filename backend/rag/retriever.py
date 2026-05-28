from pathlib import Path
from functools import lru_cache

CHROMA_DIR = Path(__file__).parent / "chroma_db"


@lru_cache(maxsize=1)
def _get_vectorstore():
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_chroma import Chroma

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    return Chroma(
        persist_directory=str(CHROMA_DIR),
        embedding_function=embeddings,
    )


def search_docs(query: str, k: int = 3) -> list[str]:
    if not CHROMA_DIR.exists():
        return ["[RAG] No vector index found. Run rag/ingest.py first."]
    vs = _get_vectorstore()
    results = vs.similarity_search_with_score(query, k=k)
    # Filter out low-relevance results (cosine distance > 1.2)
    filtered = [
        f"[Source: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}"
        for doc, score in results
        if score < 1.2
    ]
    return filtered if filtered else ["No relevant regulatory documents found for this query."]
