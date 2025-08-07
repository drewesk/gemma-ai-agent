"""FastAPI app for answering questions over the Firecrawl index."""

import asyncio
import logging
import traceback
from typing import Any, Dict, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from llama_index.core import VectorStoreIndex

from backend.config import get_settings
from backend.data_pipeline import load_or_build_index
from backend.llm_utils import get_llm


logger = logging.getLogger(__name__)

app = FastAPI(title="Firecrawl LlamaIndex Gemma API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_index: Optional[VectorStoreIndex] = None

def get_index() -> VectorStoreIndex:
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
        # run blocking LLM call off the event loop
        response = await asyncio.to_thread(query_engine.query, question)
        return {"answer": str(response)}
    except Exception as exc:
        tb = traceback.format_exc()
        logger.exception("Query failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {exc}\n{tb}"
        )