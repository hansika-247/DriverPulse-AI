import json
import sys
sys.path.append('server/src/rag')
from chunker import chunk_context
from embedder import get_embedder
from index_builder import build_index
from retriever import retrieve_top_k

def main():
    # Load the context data
    with open('context.json', 'r') as f:
        context_data = json.load(f)

    print("\n--- RAG PIPELINE DIAGNOSTICS ---")
    
    # 1. Chunking
    docs = chunk_context(context_data)
    print(f"1. Number of chunks created: {len(docs)}")

    # 2 & 3. Embedding
    print("Loading embedder (sentence-transformers/all-MiniLM-L6-v2)...")
    embedder = get_embedder()
    print("2. Number of embeddings generated: (same as chunks)") # Embeddings are generated during index building
    print(f"3. Dimension of embeddings: 384 (standard for all-MiniLM-L6-v2)")

    # 4. Indexing
    print("Building FAISS index...")
    vectorstore = build_index(docs, embedder)
    print(f"4. Total vectors stored in FAISS: {vectorstore.index.ntotal if vectorstore else 0}")

    # 5. Retrieval
    query = "Why am I high risk?"
    
    driver_id = context_data.get("mlDriverId")
    filter_dict = {"driver_id": driver_id} if driver_id else None
    
    print(f"\n5. Retrieving for query: '{query}' (filter: {filter_dict})")
    results = retrieve_top_k(vectorstore, query, k=3, filter=filter_dict)
    
    print("\nSample retrieved chunks:")
    for idx, res in enumerate(results):
        print(f"\n--- Chunk {idx+1} (Score: {res['score']:.4f}) ---")
        print(f"Metadata: {res['metadata']}")
        print(res['content'])

if __name__ == "__main__":
    main()
