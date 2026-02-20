import os
import shutil
from typing import List, Optional
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.config import API_KEY, BASE_URL

# Configuration
VECTOR_DB_DIR = os.path.join(os.getcwd(), "chroma_db")
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize Embeddings
# Using the same Gemini/OpenAI adapter configuration
# Note: Google's OpenAI adapter might not support embeddings strictly compatible with this class
# If this fails, we might switch to a local embedding model like 'all-MiniLM-L6-v2' via HuggingFace
embedding_function = OpenAIEmbeddings(
    api_key=API_KEY,
    base_url=BASE_URL,
    model="text-embedding-004", # Google's embedding model
    check_embedding_ctx_length=False
)

def get_vector_store():
    """Get or create the Chroma vector store."""
    return Chroma(
        persist_directory=VECTOR_DB_DIR,
        embedding_function=embedding_function,
        collection_name="knowledge_base"
    )

def ingest_file(file_path: str):
    """
    Ingest a file (PDF or Text) into the vector store.
    """
    # 1. Load Document
    if file_path.lower().endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)
    
    docs = loader.load()
    
    # 2. Split Text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        add_start_index=True
    )
    splits = text_splitter.split_documents(docs)
    
    # 3. Add to Vector Store
    vectorstore = get_vector_store()
    vectorstore.add_documents(documents=splits)
    # Chroma validates/persists automatically in newer versions, but explicit persist calls are sometimes needed depending on version
    # vectorstore.persist() # Deprecated in newer Chroma, auto-persists
    
    return len(splits)

def query_knowledge_base(query: str, k: int = 4) -> List[str]:
    """
    Search the knowledge base for relevant context.
    """
    vectorstore = get_vector_store()
    results = vectorstore.similarity_search(query, k=k)
    return [doc.page_content for doc in results]

def clear_knowledge_base():
    """Clear the vector database."""
    if os.path.exists(VECTOR_DB_DIR):
        shutil.rmtree(VECTOR_DB_DIR)
    # Re-initialize empty
    get_vector_store()
