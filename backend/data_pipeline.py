# backend/data_pipeline.py
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
        "firecrawl_mode": (os.getenv("FIRECRAWL_MODE", "scrape") or "scrape").lower(),  # "scrape" or "crawl"
    }


def _get_mongo_collection():
    """Get a MongoDB collection handle."""
    s = _get_settings()
    client = MongoClient(s["mongo_uri"])
    db = client[s["mongo_db"]]
    return db[s["mongo_collection"]]


def get_mongo_collection():
    """Public wrapper for external imports (Streamlit/API)."""
    return _get_mongo_collection()


# -----------------------
# URL / text helpers
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


def _local_html_extract(url: str) -> str:
    """Last-ditch extractor: plain HTTP + BeautifulSoup, for SPA/minimal HTML."""
    try:
        import requests
        from bs4 import BeautifulSoup  # pip install beautifulsoup4
    except Exception:
        return ""

    try:
        r = requests.get(
            url,
            timeout=25,
            headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"},
        )
        if r.status_code != 200 or not r.text:
            return ""
        soup = BeautifulSoup(r.text, "html.parser")

        # Drop obvious junk
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        # Prefer main/article if present; otherwise use body
        root = soup.select_one("main, article") or soup.body or soup
        parts: List[str] = []
        for sel in ["h1", "h2", "h3", "h4", "p", "li"]:
            for node in root.select(sel):
                text = (node.get_text(separator=" ", strip=True) or "").strip()
                if text:
                    parts.append(text)
        return "\n".join(parts).strip()
    except Exception:
        return ""


# -----------------------
# Scrape & Store
# -----------------------
def scrape_and_store(urls: Iterable[str]) -> int:
    """
    Use Firecrawl to extract content and store into Mongo.

    Order:
      1) LlamaIndex FireCrawlWebReader (mode-aware: url= for scrape, urls=[...] for crawl)
      2) Firecrawl SDK fallback (markdown/text)
      3) Local HTML fallback (requests + BeautifulSoup)
    """
    if not HAVE_FIRECRAWL:
        raise RuntimeError(
            "FireCrawlWebReader not available. Install: pip install llama-index-readers-web firecrawl-py"
        )

    s = _get_settings()
    api_key = s["firecrawl_api_key"]
    mode = s["firecrawl_mode"]

    reader = FireCrawlWebReader(
        api_key=api_key,
        mode=mode,
        params={"formats": ["markdown", "text"]},
    )
    col = _get_mongo_collection()

    inserted = 0
    for raw in _iter_urls(urls):
        url = raw if raw.startswith(("http://", "https://")) else f"https://{raw}"
        print(f"[scrape] URL: {url} | mode={mode}")

        # 1) Reader
        try:
            if mode == "crawl":
                docs = reader.load_data(urls=[url]) or []
            else:  # "scrape"
                docs = reader.load_data(url=url) or []
            print(f"[scrape] reader docs: {len(docs)}")
        except Exception as e:
            print("[scrape] reader error:", repr(e))
            docs = []

        payloads: List[Dict[str, Any]] = []
        for i, d in enumerate(docs):
            content = _node_text(d)
            print(f"[scrape] node {i} content len:", len(content))
            if content:
                payloads.append({"content": content, "url": url})

        # 2) SDK fallback
        if not payloads:
            try:
                from firecrawl import FirecrawlApp
                app = FirecrawlApp(api_key=api_key)
                res = app.scrape_url(url, params={"formats": ["markdown", "text"]}) or {}
                md = (res.get("markdown") or res.get("text") or "").strip()
                print("[scrape] SDK markdown len:", len(md))
                if md:
                    payloads.append({"content": md, "url": url})
            except Exception as e:
                print("[scrape] SDK error:", repr(e))

        # 3) Local HTML fallback
        if not payloads:
            local_text = _local_html_extract(url)
            print("[scrape] local extracted len:", len(local_text))
            if local_text:
                payloads.append({"content": local_text, "url": url})

        if payloads:
            res = col.insert_many(payloads)
            print(f"[scrape] inserted {len(res.inserted_ids)} docs")
            inserted += len(res.inserted_ids)
        else:
            print("[scrape] nothing extracted")

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
    # If you want persistence later, wire StorageContext().persist(path) here.
    return idx
