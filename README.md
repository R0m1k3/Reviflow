# Reviflow

Application de Révision Éducative pour enfants dyslexiques (et leurs parents).

## Architecture

**Unified Monolith** : Single Docker Container deployment for maximum simplicity and portability.
*   **Backend**: Python 3.11 (FastAPI)
*   **Frontend**: React + TypeScript (Vite)
*   **Database**: SQLite (`reviflow.db`)
*   **AI**: OpenRouter (GPT-4o / Gemini Flash)

## Getting Started (Dev)

### Prerequisites
*   Docker & Docker Compose
*   Node.js 20+ (optional, if running frontend locally)
*   Python 3.11+ (optional, if running backend locally)

### One-Click Start (Docker)
This is the recommended way to run the full stack:

```bash
# Create .env file with your API Key
echo "OPENROUTER_API_KEY=your_key_here" > .env

# Start everything
docker-compose up --build
```
Access the app at: http://localhost:8000

### Manual Setup (Hybrid)

**Backend:**
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
