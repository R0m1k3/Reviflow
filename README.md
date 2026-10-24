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
# Create .env from the template, then edit the values
cp .env.example .env

# Start everything
docker-compose up --build
```
Access the app at: http://localhost:8000

### Sécurité / variables obligatoires

À définir dans `.env` (voir `.env.example`) — `docker compose` refuse de démarrer sans elles, et l'application refuse de démarrer sans `SECRET_KEY` :

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Secret de signature des JWT, au moins 32 caractères (`openssl rand -hex 32`). Le changer déconnecte les utilisateurs. |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL. **Installation existante** : la base a été initialisée avec `reviflow` ; gardez cette valeur ou changez d'abord le mot de passe : `docker compose exec db psql -U reviflow -c "ALTER USER reviflow PASSWORD '...';"` |
| `OPENROUTER_API_KEY` | Optionnelle — clé globale utilisée quand l'utilisateur (ou son parent) n'a pas sa propre clé |
| `ALLOW_REGISTRATION` | `true` (défaut, comportement actuel) ou `false` pour fermer l'inscription publique — recommandé si une clé globale est configurée |
| `GLOBAL_API_KEY_DAILY_QUOTA` | Nombre de requêtes IA par jour et par famille avec la clé globale (défaut 30, `0` = illimité) |

PostgreSQL n'est plus exposé sur l'hôte (port 5460 supprimé).

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
