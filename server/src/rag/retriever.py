def retrieve_top_k(vectorstore, query: str, k: int = 5, filter: dict = None):
    """
    Given a FAISS vector store and a query,
    returns the top K chunks with their similarity scores.
    Applies metadata filtering if provided.
    """
    if not vectorstore:
        return []
        
    # Fetch more candidates for re-ranking
    fetch_k = max(20, k * 3)
    results = vectorstore.similarity_search_with_score(query, k=fetch_k, filter=filter)
    
    # FAISS returns L2 distance by default. Lower score = more similar.
    # Re-rank based on feedback
    formatted_results = []
    for doc, score in results:
        fb_type = doc.metadata.get("feedback_type")
        
        # 1. NOT_RELEVANT: Exclude entirely
        if fb_type == "NOT_RELEVANT":
            continue
            
        # 2. CORRECT: Boost weight (lower the L2 distance)
        if fb_type == "CORRECT":
            score = score * 0.7
            
        # 3. INCORRECT: Penalise weight (increase the L2 distance)
        elif fb_type == "INCORRECT":
            score = score * 1.5
            
        formatted_results.append({
            "content": doc.page_content,
            "metadata": doc.metadata,
            "score": float(score)
        })
        
    # Re-sort by modified score ascending (lower is better)
    formatted_results.sort(key=lambda x: x["score"])
    
    # Return exactly top k
    return formatted_results[:k]
