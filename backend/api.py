# backend/api.py
from __future__ import annotations

import asyncio
import traceback
import logging
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from llama_index.core import VectorStoreIndex  # typing hint only

from backend.config import get_settings
from backend.data_pipeline import load_or_build_index, get_mongo_collection
from backend.llm_utils import get_llm

load_dotenv()
logger = logging.getLogger(__name__)

app = FastAPI(title="Firecrawl LlamaIndex Gemma API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_index: Optional[VectorStoreIndex] = None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/docs_count")
async def docs_count():
    return {"count": get_mongo_collection().count_documents({})}


def get_index() -> VectorStoreIndex:
    global _index
    if _index is not None:
        return _index
    logger.info("Loading or building index…")
    _index = load_or_build_index(get_settings())
    return _index


@app.post("/query")
async def query(payload: Dict[str, Any]) -> Dict[str, str]:
    question = payload.get("query")
    if not question:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body")

    if get_mongo_collection().count_documents({}) == 0:
        raise HTTPException(status_code=400, detail="No documents in DB. Scrape first.")

    index = get_index()
    llm = get_llm()
    query_engine = index.as_query_engine(llm=llm)

    try:
        # run the blocking call in a thread so FastAPI doesn't hang
        response = await asyncio.to_thread(query_engine.query, question)
        return {"answer": str(response)}
    except Exception:
        tb = traceback.format_exc()
        logger.exception("Error answering query:\n%s", tb)
        raise HTTPException(status_code=500, detail=f"Query failed: {tb}")
