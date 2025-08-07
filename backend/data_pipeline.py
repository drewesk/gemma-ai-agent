from __future__ import annotations

from typing import Dict, Any, List, Iterable
import os

from pymongo import MongoClient
from llama_index.core import VectorStoreIndex
from llama_index.core.schema import Document

# FireCrawl reader via LlamaIndex
try:
    from llama_index.readers.web import FireCrawlWebReader
    HAVE_FIRECRAWL = True
except Exception:
    HAVE_FIRECRAWL = False


# -----------------------
# Settings & Mongo helpers
# -----------------------
def _get_settings() -> Dict[str, Any]:
    return {
        "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        "mongo_db": os.getenv("MONGO_DB", "firecrawl_db"),
        "mongo_collection": os.getenv("MONGO_COLLECTION", "documents"),
        "firecrawl_api_key": os.getenv("FIRECRAWL_API_KEY", ""),
        "firecrawl_mode": os.getenv("FIRECRAWL_MODE", "scrape"),  # "scrape" or "crawl"
    }

def _get_mongo_collection():
    s = _get_settings()
    client = MongoClient(s["mongo_uri"])
    db = client[s["mongo_db"]]
    return db[s["mongo_collection"]]

# Exported for Streamlit
def get_mongo_collection():
    return _get_mongo_collection()


# -----------------------
# Ingestion (scrape + store)
# -----------------------
def _iter_urls(urls_or_csv: Iterable[str]) -> Iterable[str]:
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

def scrape_and_store(urls: Iterable[str]) -> int:
    """
    Use FireCrawl to extract content from given URLs and store into Mongo.
    Each inserted doc has fields: {"content": <markdown/text>, "url": <url>}
    Returns number of docs inserted.
    """
    if not HAVE_FIRECRAWL:
        raise RuntimeError(
            "FireCrawlWebReader not available. Install: "
            "pip install llama-index-readers-web firecrawl-py"
        )

    s = _get_settings()
    api_key = s["firecrawl_api_key"]
    mode = s["firecrawl_mode"]

    reader = FireCrawlWebReader(api_key=api_key, mode=mode)
    col = _get_mongo_collection()

    inserted = 0
    for url in _iter_urls(urls):
        docs = reader.load_data(url=url)  # list[Document]
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
# Index building / loading
# -----------------------
def load_or_build_index(settings: Dict[str, Any] | None = None) -> VectorStoreIndex:
    """
    Build a VectorStoreIndex from documents in MongoDB, or return an empty index if none exist.
    """
    col = _get_mongo_collection()

    docs: List[Document] = []
    for d in col.find({}, {"content": 1, "url": 1}):
        content = (d.get("content") or "").strip()
        if not content:
            continue
        md: Dict[str, Any] = {}
        if d.get("url"):
            md["source"] = d["url"]
        docs.append(Document(text=content, metadata=md))

    if not docs:
        return VectorStoreIndex.from_documents([])

    return VectorStoreIndex.from_documents(docs)

# For Streamlit backward-compat: build_index() just calls load_or_build_index()
def build_index(save: bool = False, path: str | None = None) -> VectorStoreIndex:
    """
    Build and (optionally) persist an index. (Persist not implemented here.)
    """
    idx = load_or_build_index(None)
    # If you want disk persistence, wire StorageContext().persist(path) here.
    return idx