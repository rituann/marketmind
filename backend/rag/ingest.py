"""
ingest.py — no longer needed.

The project previously used sentence-transformers + ChromaDB for RAG. This
required building a vector index offline and committing the chroma_db/ directory
to the repo. It was replaced with BM25 (rank-bm25) after the Render free-tier
instance (512 MB RAM) OOM-crashed: PyTorch, the dependency pulled in by
sentence-transformers, consumed ~300 MB on its own.

BM25 builds its index in-memory at first query from the raw .txt files in
rag/docs/. No pre-build step required. See retriever.py.
"""
