import re
from pathlib import Path
import chromadb


_client = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Get a singleton ChromaDB persistent client."""
    global _client
    if _client is None:
        persist_dir = str(Path(__file__).resolve().parent / "chroma_data")
        _client = chromadb.PersistentClient(path=persist_dir)
    return _client


def get_knowledge_collection() -> chromadb.Collection:
    """Get the knowledge collection (creates if not exists)."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="knowledge",
        metadata={"hnsw:space": "cosine"},
    )


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks, preferring sentence boundaries."""
    if not text or not text.strip():
        return []

    text = text.strip()
    if len(text) <= chunk_size:
        return [text]

    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if not sentence.strip():
            continue

        if len(current_chunk) + len(sentence) + 1 <= chunk_size:
            current_chunk = (current_chunk + " " + sentence).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
                # Build overlap from end of current chunk
                words = current_chunk.split()
                overlap_text = ""
                for word in reversed(words):
                    candidate = (word + " " + overlap_text).strip()
                    if len(candidate) > overlap:
                        break
                    overlap_text = candidate
                current_chunk = (overlap_text + " " + sentence).strip()
            else:
                # Single sentence longer than chunk_size — force-split by characters
                for i in range(0, len(sentence), chunk_size - overlap):
                    chunks.append(sentence[i:i + chunk_size])
                current_chunk = ""

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def add_knowledge_chunks(substrate_id: str, knowledge_id: str, chunks: list[str]) -> int:
    """Add text chunks to ChromaDB with metadata. Returns chunk count."""
    if not chunks:
        return 0

    collection = get_knowledge_collection()
    ids = [f"{knowledge_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"substrate_id": substrate_id, "knowledge_id": knowledge_id, "chunk_index": i}
        for i in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        documents=chunks,
        metadatas=metadatas,
    )

    return len(chunks)


def query_knowledge(substrate_id: str, query_text: str, k: int = 5) -> list[str]:
    """Query ChromaDB for relevant chunks filtered by substrate_id."""
    collection = get_knowledge_collection()

    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[query_text],
        n_results=k,
        where={"substrate_id": substrate_id},
    )

    documents = results.get("documents", [[]])[0]
    return documents


def delete_knowledge_chunks(knowledge_id: str) -> None:
    """Delete all chunks for a knowledge entry."""
    collection = get_knowledge_collection()

    if collection.count() == 0:
        return

    # Get all chunk IDs for this knowledge entry
    results = collection.get(
        where={"knowledge_id": knowledge_id},
    )

    if results["ids"]:
        collection.delete(ids=results["ids"])
