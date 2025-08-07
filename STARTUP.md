# === Firecrawl LLaMA App Full Startup ===

cd ~/Desktop/firecrawl_llama_app
source /Users/drew/WebUI/openwebui-env/bin/activate
export PYTHONPATH="$PWD"
export $(grep -v '^#' .env | xargs)

# 1) Start MongoDB in background

brew services start mongodb/brew/mongodb-community@7.0

# 2) Start Ollama in background + ensure model

nohup ollama serve >/tmp/ollama.log 2>&1 &
ollama pull gemma:2b || true
ollama list

# 3) Start API server (FastAPI/Uvicorn) in background

nohup uvicorn backend.api:app \
 --host 0.0.0.0 \
 --port 8000 \
 --timeout-keep-alive 600 \

> /tmp/api.log 2>&1 &

# 4) Start Streamlit UI in background

nohup python -m streamlit run backend/streamlit_app.py \
 --server.port 8501 \
 --server.address 0.0.0.0 \

> /tmp/streamlit.log 2>&1 &

# === Sanity checks ===

echo "Checking Ollama..."
curl -s http://localhost:11434/api/tags | head
echo "Checking API..."
curl -s http://localhost:8000/health
curl -s http://localhost:8000/docs_count

> Integrate these into my readme when its prod and not local
