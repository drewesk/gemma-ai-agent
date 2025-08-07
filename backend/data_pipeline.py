from __future__ import annotations

import os
from typing import Any, Dict, List, Iterable

from pymongo import MongoClient
from llama_index.core import VectorStoreIndex
from llama_index.core.schema import Document

from backend.llm_utils import get_embed_model

# -----------------------
# Firecrawl support
# -----------------------
try:
    from llama_index.readers.web import FireCrawlWebReader
    HAVE_FIRECRAWL = True
except ImportError:
    HAVE_FIRECRAWL = False


# -----------------------
# Settings & Mongo helpers
# -----------------------
def _get_settings() -> Dict[str, Any]:
    """Load settings from env vars with defaults."""
    return {
        "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        "mongo_db": os.getenv("MONGO_DB", "firecrawl_db"),
        "mongo_collection": os.getenv("MONGO_COLLECTION", "documents"),
        "firecrawl_api_key": os.getenv("FIRECRAWL_API_KEY", ""),
        "firecrawl_mode": os.getenv("FIRECRAWL_MODE", "scrape"),  # or "crawl"
    }


def _get_mongo_collection():
    """Get a MongoDB collection handle."""
    s = _get_settings()
    client = MongoClient(s["mongo_uri"])
    db = client[s["mongo_db"]]
    return db[s["mongo_collection"]]


def get_mongo_collection():
    """Public wrapper for external imports."""
    return _get_mongo_collection()


# -----------------------
# URL helpers
# -----------------------
def _iter_urls(urls_or_csv: Iterable[str]) -> Iterable[str]:
    """Yield individual URLs from CSV strings or lists."""
    for u in urls_or_csv:
        u = (u or "").strip()
        if not u:
            continue
        if "," in u:
            for x in u.split(","):
                x = x.strip()
                if x:
                    yield x
        else:
            yield u


# -----------------------
# Scrape & Store
# -----------------------
def scrape_and_store(urls: Iterable[str]) -> int:
    """
    Use FireCrawl to extract content from given URLs and store into MongoDB.
    Returns number of docs inserted.
    """
    if not HAVE_FIRECRAWL:
        raise RuntimeError(
            "FireCrawlWebReader not available. Install it via: "
            "pip install llama-index-readers-web firecrawl-py"
        )

    s = _get_settings()
    api_key = s["firecrawl_api_key"]
    if not api_key:
        raise RuntimeError("Missing FIRECRAWL_API_KEY in environment")

    mode = s["firecrawl_mode"]
    reader = FireCrawlWebReader(api_key=api_key, mode=mode)
    col = _get_mongo_collection()

    inserted = 0
    for url in _iter_urls(urls):
        docs = reader.load_data(url=url)  # List[Document]
        payloads: List[Dict[str, Any]] = []
        for d in docs:
            text = (getattr(d, "text", "") or "").strip()
            if not text:
                continue
            payloads.append({"content": text, "url": url})
        if payloads:
            res = col.insert_many(payloads)
            inserted += len(res.inserted_ids)

    return inserted


# -----------------------
# Index Building / Loading
# -----------------------
def load_or_build_index(settings: Dict[str, Any] | None = None) -> VectorStoreIndex:
    """Load docs from Mongo and create a VectorStoreIndex."""
    col = _get_mongo_collection()
    docs: List[Document] = []

    for d in col.find({}, {"content": 1, "url": 1}):
        content = (d.get("content") or "").strip()
        if not content:
            continue
        metadata: Dict[str, Any] = {}
        if d.get("url"):
            metadata["source"] = d["url"]
        docs.append(Document(text=content, metadata=metadata))

    embed_model = get_embed_model()  # always use local model

    if not docs:
        # Empty index but still initialize with embed model
        return VectorStoreIndex.from_documents([], embed_model=embed_model)

    return VectorStoreIndex.from_documents(docs, embed_model=embed_model)


def build_index(save: bool = False, path: str | None = None) -> VectorStoreIndex:
    """Streamlit expects this — just wraps load_or_build_index."""
    idx = load_or_build_index(None)
    # Add persistence here if needed:
    # if save and path:
    #     StorageContext.from_defaults().persist(path)
    return idx
