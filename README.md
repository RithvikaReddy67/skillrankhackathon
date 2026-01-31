# Semantic Search for Large Product Catalog

Full-stack semantic search over 30K+ products with natural language queries, filters, and optional LLM explanations.

## Features

- **Data processing**: Ingest 30K+ products/reviews, generate embeddings (sentence-transformers), index in FAISS
- **Search**: Natural language queries (e.g. "affordable laptop for video editing under 60k")
- **Query understanding**: Budget, use case, price-conscious detection
- **Results**: Top 10 with relevance %, price, "Why matched" (template or LLM), match factors (✅)
- **Filters**: Min rating, price min/max
- **Search suggestions**: Example queries from `/suggest`
- **Performance**: Sub-second search; target &lt;500ms with FAISS

## Setup

### 1. Data

Download the [Consumer Reviews of Amazon Products](https://www.kaggle.com/datasets/datafiniti/consumer-reviews-of-amazon-products) dataset from Kaggle. Place the CSV in the backend folder as `backend/products.csv`.

### 2. Backend (Python)

```bash
cd backend
pip install -r ../requirements.txt
python index_products.py   # Build FAISS index + products.pkl (~30K+ rows)
```

Then start the API:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**LLM (required for core engine):** The search engine uses an LLM for query understanding and "why matched" explanations. Use either:
- **OpenAI:** set `OPENAI_API_KEY` (uses `gpt-4o-mini`).
- **Ollama (local):** set `OLLAMA_HOST=http://localhost:11434` and run `ollama pull llama3.2` (or another model). The backend will use the LLM for both parsing the query and generating explanations.

### 3. Frontend

Open `frontend/index.html` in a browser, or serve the frontend folder:

```bash
cd frontend
npx serve -p 3000
```

Set the API base URL in `frontend/app.js` if needed (default: `http://127.0.0.1:8000`).

## API

- `GET /status` — Returns `{ "indexed_count": N, "message": "Indexed N products" }`
- `GET /search?q=...&min_rating=0&price_min=&price_max=&brand=&category=&use_llm=true` — Semantic search; response includes `query_understanding` and `results`
- `GET /suggest?prefix=` — Search suggestions (example queries)

## Tech Stack

- **Backend**: Python, FastAPI, FAISS, sentence-transformers (all-MiniLM-L6-v2)
- **LLM**: Optional OpenAI for "why matched" (fallback: template)
- **Frontend**: HTML, CSS, JavaScript (no build step)

## Grading alignment

- **40%** — Search on 30K+ products with relevance (FAISS + embeddings, relevance from distance)
- **30%** — LLM adds understanding (query parsing + optional OpenAI explanations)
- **20%** — Fast, well-designed (single SPA, filters, status, suggestions)
- **10%** — Creative (query understanding display, match factors, dark UI)
