"""FastAPI application entry point."""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fc_universe.config import settings
from fc_universe.database import create_tables
from fc_universe.api import health, careers, players, clubs, images, transfers, timeline, career_profile


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API for FC Universe - EA Sports FC 26 Career Mode history tracking",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize database
    create_tables()

    # Include routers
    app.include_router(health.router, prefix=settings.api_prefix)
    app.include_router(careers.router, prefix=settings.api_prefix)
    app.include_router(players.router, prefix=settings.api_prefix)
    app.include_router(clubs.router, prefix=settings.api_prefix)
    app.include_router(images.router, prefix=settings.api_prefix)
    app.include_router(transfers.router, prefix=settings.api_prefix)
    app.include_router(timeline.router, prefix=settings.api_prefix)
    app.include_router(career_profile.router, prefix=settings.api_prefix)

    # Serve React SPA static files if the frontend build exists
    import os
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/dist"))
    if os.path.exists(frontend_dist):
        # Mount assets folder
        assets_dir = os.path.join(frontend_dist, "assets")
        if os.path.exists(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
            
        # Fallback route to serve index.html for SPA routes
        @app.get("/{fallback_path:path}")
        def spa_fallback(fallback_path: str):
            if fallback_path.startswith("api/") or fallback_path.startswith("docs") or fallback_path.startswith("redoc") or fallback_path.startswith("openapi.json"):
                raise HTTPException(status_code=404)
            index_path = os.path.join(frontend_dist, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            raise HTTPException(status_code=404)

    return app


app = create_app()
