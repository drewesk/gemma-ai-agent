"""FastAPI app for answering questions over the Firecrawl index."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Keep VectorStoreIndex only for typing (optional)
from llama_index.core import VectorStoreIndex  # type: ignore

from backend.config import get_settings
from backend.data_pipeline import load_or_build_index
from backend.llm_utils import get_llm

logger = logging.getLogger(__name__)

app = FastAPI(title="Firecrawl LlamaIndex Gemma API")

# CORS for the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_index: Optional[VectorStoreIndex] = None


def get_index() -> VectorStoreIndex:
    """Load the vector index from disk or build it if necessary."""
    global _index
    if _index is not None:
        return _index
    settings = get_settings()
    logger.info("Loading or building index…")
    _index = load_or_build_index(settings)
    return _index


@app.post("/query")
async def query(payload: Dict[str, Any]) -> Dict[str, str]:
    """Answer a question using the indexed content and Gemma LLM."""
    question = payload.get("query")
    if not question:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body")

    index = get_index()
    llm = get_llm()
    query_engine = index.as_query_engine(llm=llm)

    try:
        response = query_engine.query(question)
        return {"answer": str(response)}
    except Exception as exc:
        logger.exception("Error answering query: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate answer")
