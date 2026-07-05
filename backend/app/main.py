import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes import router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="SlideInjectr",
        version="0.1.0",
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api")
    
    # Mount static files (frontend) - support multiple locations for different deployments
    dist_paths = []
    
    # PyInstaller bundled mode: sys._MEIPASS is set
    if hasattr(sys, '_MEIPASS'):
        dist_paths.append(Path(sys._MEIPASS) / "frontend" / "dist")
    
    # Development mode: frontend/dist relative to backend
    dist_paths.append(Path(__file__).parent.parent.parent / "frontend" / "dist")
    
    # Docker mode: /app/frontend/dist
    dist_paths.append(Path("/app/frontend/dist"))
    
    dist_found = False
    for dist_path in dist_paths:
        if dist_path.exists():
            print(f"✓ Found frontend dist at: {dist_path}")
            
            # Mount assets
            try:
                app.mount("/assets", StaticFiles(directory=dist_path / "assets", check_dir=False), name="assets")
            except Exception as e:
                print(f"Warning: Could not mount assets: {e}")
            
            # Serve SPA - catch-all route that returns index.html for any non-existent routes
            @app.get("/{full_path:path}")
            async def serve_spa(full_path: str):
                # Try to serve the file directly
                file_path = dist_path / full_path
                if file_path.exists() and file_path.is_file():
                    return FileResponse(file_path)
                # For any non-existent routes, return index.html (SPA fallback)
                return FileResponse(dist_path / "index.html")
            
            @app.get("/")
            async def serve_index():
                return FileResponse(dist_path / "index.html")
            
            dist_found = True
            break
    
    if not dist_found:
        print("⚠️  WARNING: Frontend dist folder not found. UI will not be available.")
        print(f"Checked paths:")
        for p in dist_paths:
            print(f"  - {p}")
    
    return app


app = create_app()
