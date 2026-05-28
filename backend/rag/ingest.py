"""
Run once to build the ChromaDB vector index from regulatory docs.
Usage: python -m rag.ingest  (from the backend/ directory)
"""
import os
from pathlib import Path

DOCS_DIR = Path(__file__).parent / "docs"
CHROMA_DIR = Path(__file__).parent / "chroma_db"


def ingest():
    from langchain_community.document_loaders import TextLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_chroma import Chroma

    print("Loading documents...")
    docs = []
    for txt_file in sorted(DOCS_DIR.glob("*.txt")):
        loader = TextLoader(str(txt_file), encoding="utf-8")
        loaded = loader.load()
        for doc in loaded:
            doc.metadata["source"] = txt_file.stem
        docs.extend(loaded)
        print(f"  Loaded: {txt_file.name} ({len(loaded[0].page_content)} chars)")

    print(f"\nSplitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)
    print(f"  {len(chunks)} chunks created")

    print("\nLoading embedding model (all-MiniLM-L6-v2)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    print("Building ChromaDB index...")
    if CHROMA_DIR.exists():
        import shutil
        shutil.rmtree(CHROMA_DIR)

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(CHROMA_DIR),
    )
    print(f"\nDone. Index saved to {CHROMA_DIR}")
    print(f"Total vectors: {vectorstore._collection.count()}")


if __name__ == "__main__":
    ingest()
