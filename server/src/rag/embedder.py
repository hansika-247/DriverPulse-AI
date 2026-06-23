from langchain_huggingface import HuggingFaceEmbeddings

def get_embedder():
    """
    Returns the HuggingFaceEmbeddings instance for all-MiniLM-L6-v2.
    Downloads the model if not already present.
    """
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    model_kwargs = {'device': 'cpu'}
    encode_kwargs = {'normalize_embeddings': False}
    return HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
