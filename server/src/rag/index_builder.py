from langchain_community.vectorstores import FAISS

def build_index(docs, embedder):
    """
    Takes a list of LangChain Documents and an embedder,
    and returns an in-memory FAISS vector store.
    """
    if not docs:
        return None
    
    vectorstore = FAISS.from_documents(docs, embedder)
    return vectorstore
