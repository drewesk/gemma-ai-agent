import os
from typing import Optional

from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

_DEFAULT_EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

def get_llm() -> Ollama:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("GEMMA_MODEL", "gemma:2b")
    return Ollama(model=model, base_url=base_url, request_timeout=9999999)

def get_embed_model(name: Optional[str] = None):
    model_name = name or _DEFAULT_EMBED_MODEL
    return HuggingFaceEmbedding(model_name=model_name)
