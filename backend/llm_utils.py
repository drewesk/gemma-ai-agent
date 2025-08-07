# backend/llm_utils.py
import os
from typing import Optional

# ✅ Use concrete integrations (no legacy base-class import)
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# You can swap this to any small embedding model you prefer
_DEFAULT_EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

def get_llm() -> Ollama:
    """
    Return an Ollama-backed LLM client.
    Requires an Ollama server (local or remote).
    Set OLLAMA_BASE_URL if it's not on http://localhost:11434.
    Set GEMMA_MODEL (e.g., 'gemma2:2b', 'gemma:2b', 'llama3.1:8b', etc.)
    """
    base_url = os.getenv("OLLAMA_BASE_URL")  # e.g. http://localhost:11434
    model = os.getenv("GEMMA_MODEL", "gemma2:2b")
    # request_timeout added to avoid long-running timeouts on first load
    return Ollama(model=model, base_url=base_url, request_timeout=120.0)

def get_embed_model(name: Optional[str] = None):
    """
    Return a HuggingFace embedding model for LlamaIndex.
    """
    model_name = name or _DEFAULT_EMBED_MODEL
    return HuggingFaceEmbedding(model_name=model_name)
