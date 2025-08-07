# backend/llm_utils.py
import os
from typing import Optional
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

_DEFAULT_EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

def get_llm() -> Ollama:
    """Return an Ollama-backed LLM client (Gemma by default).
    Respects:
      - OLLAMA_BASE_URL (default http://localhost:11434)
      - GEMMA_MODEL (default gemma:2b)
    Uses a long timeout so local models have time to answer.
    """
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("GEMMA_MODEL", "gemma:2b")
    # numeric seconds; long to avoid premature timeouts
    return Ollama(model=model, base_url=base_url, request_timeout=600.0)

def get_embed_model(name: Optional[str] = None):
    """Return a HuggingFace embedding model for LlamaIndex."""
    model_name = name or _DEFAULT_EMBED_MODEL
    return HuggingFaceEmbedding(model_name=model_name)
