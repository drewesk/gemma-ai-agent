from __future__ import annotations
import sys
import os
from typing import List
import streamlit as st
from dotenv import load_dotenv

from backend.config import get_settings
from backend.data_pipeline import scrape_and_store, build_index, get_mongo_collection
from backend.llm_utils import get_llm

load_dotenv()

st.set_page_config(page_title="Firecrawl LlamaIndex App", page_icon="🦙")
st.title("🌐 Firecrawl + LlamaIndex + Gemma Demo")

settings = get_settings()

def get_doc_count() -> int:
    return get_mongo_collection().count_documents({})

with st.sidebar:
    st.header("Configuration")
    st.write("MongoDB URI: ", settings["mongo_uri"])
    st.write("Database: ", settings["mongo_db"])
    st.write("Collection: ", settings["mongo_collection"])
    st.write("Documents in DB: ", get_doc_count())

st.subheader("Step 1: Scrape or crawl URLs")
url_input = st.text_area("Enter one or more URLs", placeholder="https://example.com")
if st.button("Scrape URLs"):
    urls: List[str] = [u.strip() for u in url_input.splitlines() if u.strip()]
    if urls:
        try:
            count = scrape_and_store(urls)
            st.success(f"Inserted {count} documents into MongoDB")
        except Exception as exc:
            st.error(f"Error while scraping: {exc}")
    else:
        st.warning("Please enter at least one URL")
    st.rerun()

st.markdown("---")

st.subheader("Step 2: Build or update the vector index")
if st.button("Build Index"):
    try:
        build_index()
        st.success("Index built")
    except Exception as exc:
        st.error(f"Failed to build index: {exc}")

st.markdown("---")

st.subheader("Step 3: Ask a question")
query = st.text_input("Enter your question")
if st.button("Ask"):
    if not query:
        st.warning("Please enter a question")
    else:
        try:
            from llama_index.core import VectorStoreIndex
            try:
                index = VectorStoreIndex.load_from_disk(settings["index_path"])
            except Exception:
                index = build_index()
            llm = get_llm()
            query_engine = index.as_query_engine(llm=llm, streaming=True)
            with st.spinner("Generating answer..."):
                response = query_engine.query(query)
            st.write(response)
        except Exception as exc:
            st.error(f"Error: {exc}")
