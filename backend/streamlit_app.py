# backend/streamlit_app.py
from __future__ import annotations

import os
import sys
from typing import List

import streamlit as st
from dotenv import load_dotenv

from backend.config import get_settings
from backend.data_pipeline import scrape_and_store, build_index, get_mongo_collection
from backend.llm_utils import get_llm

load_dotenv()

st.set_page_config(page_title="Firecrawl LlamaIndex App", page_icon="🦙")
st.title("🌐 Firecrawl + LlamaIndex + Gemma 🌐")

settings = get_settings()

def get_doc_count() -> int:
    return get_mongo_collection().count_documents({})

with st.sidebar:
    st.header("Configuration")
    st.write("MongoDB URI:", settings["mongo_uri"])
    st.write("Database:", settings["mongo_db"])
    st.write("Collection:", settings["mongo_collection"])
    st.write("Embedding model:", settings["embedding_model"])
    st.write("LLM model:", os.getenv("GEMMA_MODEL", "gemma:2b"))
    st.write("Documents in DB:", get_doc_count())

st.subheader("Step 1: Scrape or crawl URLs")
url_input = st.text_area(
    "Enter one or more URLs (separated by new lines)",
    placeholder="https://example.com\nhttps://another.com",
)

if st.button("Scrape URLs"):
    print("SCRAPE button clicked")  # shows up in your Streamlit terminal
    urls = [u.strip() for u in url_input.splitlines() if u.strip()]

    if not urls:
        st.warning("Please enter at least one URL")
    else:
        # Normalize schemes so Firecrawl doesn’t ignore bare domains
        urls = [u if u.startswith(("http://", "https://")) else f"https://{u}" for u in urls]

        with st.spinner("Scraping with Firecrawl..."):
            try:
                inserted = scrape_and_store(urls)
            except Exception as exc:
                st.error(f"Error while scraping: {exc}")
            else:
                if inserted > 0:
                    st.success(f"Inserted {inserted} documents into MongoDB")
                else:
                    st.warning("No content was extracted from the provided URLs.")

        # Show the UPDATED count immediately (no rerun required)
        st.info(f"Documents in DB now: {get_doc_count()}")

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
            from backend.data_pipeline import load_or_build_index
            idx = load_or_build_index(settings)
            llm = get_llm()
            qe = idx.as_query_engine(llm=llm)
            with st.spinner("Generating answer..."):
                response = qe.query(query)
            st.write(str(response))
        except Exception as exc:
            st.error(f"Error: {exc}")
