from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

from chunker import chunk_context
from embedder import get_embedder
from index_builder import build_index
from retriever import retrieve_top_k

app = FastAPI(title="DriverPulse RAG Service")

# Initialize embedder globally so it's only loaded once
print("Loading embedding model...")
embedder = get_embedder()
print("Model loaded.")

class RagRequest(BaseModel):
    question: str
    contextData: dict

@app.post("/api/rag/retrieve")
def retrieve_context(req: RagRequest):
    """
    Given a question and a driver's raw context data, chunks the data,
    builds an in-memory FAISS index, retrieves the top K most relevant
    chunks for the question, and returns them formatted.
    """
    docs = chunk_context(req.contextData)
    vectorstore = build_index(docs, embedder)
    
    driver_id = req.contextData.get("mlDriverId")
    filter_dict = {"driver_id": driver_id} if driver_id else None
    
    # Retrieve top 5 chunks with metadata filtering
    results = retrieve_top_k(vectorstore, req.question, k=5, filter=filter_dict)
    
    # Format chunks into a single string for Gemini
    formatted_context = "=== RETRIEVED CONTEXT ===\n"
    for r in results:
        formatted_context += f"---\n[Source: {r['metadata'].get('source', 'Unknown')}]\n{r['content']}\n"
    
    return {
        "success": True,
        "formatted_context": formatted_context,
        "results": results
    }

@app.post("/api/rag/debug")
def debug_retrieval(req: RagRequest):
    """
    Same as /retrieve, but returns raw chunks and scores without any 
    pre-formatting, useful for inspecting the RAG pipeline.
    """
    docs = chunk_context(req.contextData)
    vectorstore = build_index(docs, embedder)
    
    driver_id = req.contextData.get("mlDriverId")
    filter_dict = {"driver_id": driver_id} if driver_id else None
    
    results = retrieve_top_k(vectorstore, req.question, k=5, filter=filter_dict)
    
    return {
        "success": True,
        "query": req.question,
        "total_chunks_created": len(docs),
        "retrieved_chunks": results
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
