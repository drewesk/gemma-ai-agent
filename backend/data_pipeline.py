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
def _node_text(node: Any) -> str:
    """Robustly extract text from Firecrawl nodes or documents."""
    text = getattr(node, "text", None)
    if not text:
        text = getattr(node, "page_content", None)
    if not text and hasattr(node, "get_content"):
        try:
            text = node.get_content(metadata_mode=None)
        except Exception:
            text = None
    return (text or "").strip()


def scrape_and_store(urls: Iterable[str]) -> int:
    """
    Use Firecrawl to extract content from given URLs and store into Mongo.
    Each inserted doc has fields: {"content": <markdown/text>, "url": <url>}
    Returns number of docs inserted.
    """
    if not HAVE_FIRECRAWL:
        raise RuntimeError(
            "FireCrawlWebReader not available. Install: pip install llama-index-readers-web firecrawl-py"
        )

    s = _get_settings()
    api_key = s["firecrawl_api_key"]
    mode = s["firecrawl_mode"]

    # Ask FireCrawlWebReader for markdown and plain text
    reader = FireCrawlWebReader(
        api_key=api_key,
        mode=mode,
        params={"formats": ["markdown", "text"]},
    )
    col = _get_mongo_collection()

    inserted = 0
    for url in _iter_urls(urls):
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        try:
            # IMPORTANT: use the plural form 'urls=[...]' here
            docs = reader.load_data(urls=[url]) or []
        except Exception:
            docs = []

        payloads: List[Dict[str, Any]] = []

        # primary path: reader returned Documents
        for d in docs:
            content = _node_text(d)
            if content:
                payloads.append({"content": content, "url": url})

        # optional fallback using official client if reader gave nothing
        if not payloads:
            try:
                from firecrawl import FirecrawlApp
                app = FirecrawlApp(api_key=api_key)
                res = app.scrape_url(url, params={"formats": ["markdown", "text"]}) or {}
                md = (res.get("markdown") or res.get("text") or "").strip()
                if md:
                    payloads.append({"content": md, "url": url})
            except Exception:
                pass

        if payloads:
            result = col.insert_many(payloads)
            inserted += len(result.inserted_ids)

    return inserted


# -----------------------
# Index Building / Loading
# -----------------------
def load_or_build_index(settings: Dict[str, Any] | None = None) -> VectorStoreIndex:
    """Load docs from Mongo and create a VectorStoreIndex."""
    col = _get_mongo_collection()
    docs: List[Document] = []

    for rec in col.find({}, {"content": 1, "url": 1}):
        content = (rec.get("content") or "").strip()
        if not content:
            continue
        metadata: Dict[str, Any] = {}
        if rec.get("url"):
            metadata["source"] = rec["url"]
        docs.append(Document(text=content, metadata=metadata))

    embed_model = get_embed_model()

    if not docs:
        return VectorStoreIndex.from_documents([], embed_model=embed_model)

    return VectorStoreIndex.from_documents(docs, embed_model=embed_model)


def build_index(save: bool = False, path: str | None = None) -> VectorStoreIndex:
    """Streamlit expects this — just wraps load_or_build_index."""
    idx = load_or_build_index(None)
    return idx