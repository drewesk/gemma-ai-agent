"""Configuration module.

Provide centralised access to secrets and configuration values.  Values are read
from environment variables with sensible defaults.  Update these variables in
your `.env` file or system environment before running the app.
"""

import os
from functools import lru_cache


@lru_cache()
def get_settings() -> dict:
    """Return a dictionary of configuration values.

    The settings are cached on first access.  See `.env.example` for the list
    of environment variables you can set.
    """
    return {
        # MongoDB connection URI.  Example: "mongodb://localhost:27017" or
        # "mongodb+srv://user:pass@cluster.mongodb.net/dbname".
        "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        # Database and collection names.
        "mongo_db": os.getenv("MONGO_DB", "firecrawl_db"),
        "mongo_collection": os.getenv("MONGO_COLLECTION", "documents"),
        # Firecrawl API key for scraping/crawling.
        "firecrawl_api_key": os.getenv("FIRECRAWL_API_KEY", ""),
        # Default mode for Firecrawl reader ("crawl" or "scrape").
        "firecrawl_mode": os.getenv("FIRECRAWL_MODE", "scrape"),
        # Additional parameters for Firecrawl reader (comma separated k=v pairs).
        "firecrawl_params": os.getenv("FIRECRAWL_PARAMS", ""),
        # Path on disk where the LlamaIndex will be saved.
        "index_path": os.getenv("INDEX_PATH", "backend/index.json"),
        # Name of the embedding model used by LlamaIndex.  When using HuggingFace,
        # choose a model that fits in memory (e.g. "sentence-transformers/all-MiniLM-L6-v2").
        "embedding_model": os.getenv(
            "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        ),
        # Name of the language model (LLM) used for answering questions.  For
        # Gemma 2B via HuggingFace you can use "google/gemma-2b".  When using an
        # external endpoint (Ollama/Cloud Run), leave this empty and set
        # GEMMA_API_URL.
        "llm_model": os.getenv("LLM_MODEL", "google/gemma-2b"),
        # Base URL of a hosted Gemma service.  If provided, the `ExternalLLM`
        # class will send requests to this endpoint instead of loading the
        # model locally.
        "gemma_api_url": os.getenv("GEMMA_API_URL", ""),
        # Maximum number of new tokens to generate when using the LLM.
        "max_new_tokens": int(os.getenv("MAX_NEW_TOKENS", "256")),
    }