from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.modules.auth.router import router as auth_router
from app.modules.ingest.router import router as ingest_router
from app.modules.quiz.router import router as quiz_router
from app.core.db import create_db_and_tables

app = FastAPI(title="Reviflow API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG REQ: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"DEBUG RES: {request.method} {request.url.path} -> {response.status_code}")
    return response

@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()
    # Debug: Check static files location
    static_path = os.path.join(os.path.dirname(__file__), "..", "static")
    print(f"Startup: Static dir check -> {os.path.abspath(static_path)} (Exists: {os.path.exists(static_path)})")

app.include_router(auth_router, prefix="/api/auth")
app.include_router(ingest_router, prefix="/api/ingest")
app.include_router(quiz_router, prefix="/api/quiz")

# Health Check
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "reviflow-backend"}

# Mount Static Files (React) - Only if directory exists (Production/Monolith mode)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    # Mount assets directory for JS, CSS, images
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Serve static files (favicon, etc.)
    @app.get("/vite.svg")
    async def vite_svg():
        return FileResponse(os.path.join(static_dir, "vite.svg"))
    
    @app.get("/favicon.ico")
    async def favicon():
        # Fallback to vite.svg if no favicon.ico exists
        favicon_path = os.path.join(static_dir, "favicon.ico")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        return FileResponse(os.path.join(static_dir, "vite.svg"), media_type="image/svg+xml")
    
    # SPA Catch-all: Serve index.html for all non-API routes (React Router)
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't catch API routes or missing static assets
        # We check for common static directories to avoid serving index.html for missing assets
        static_prefixes = ["api/", "assets/", "static/"]
        if any(full_path.startswith(prefix) for prefix in static_prefixes):
            return {"error": "Not found"}, 404
            
        # Check if file exists in static directory (e.g. logo.png, favicon.png)
        # This allows serving root-level static files that are not in /assets
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Also check for file extensions to avoid catching missing .png, .js, etc.
        # If it has an extension and wasn't found above, it's a 404.
        if "." in full_path.split("/")[-1]:
             return {"error": "Not found"}, 404

        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    print(f"Warning: Static directory {static_dir} not found. Running in API-only mode.")
