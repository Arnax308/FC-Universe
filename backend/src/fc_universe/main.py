"""FastAPI application entry point."""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fc_universe.config import settings
from fc_universe.database import create_tables
from fc_universe.api import health, careers, players, clubs, images, transfers, timeline, career_profile


# Show the app's own INFO logs (e.g. save syncing) next to uvicorn's
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(levelname)s:     [fc_universe] %(message)s"))
_app_logger = logging.getLogger("fc_universe")
if not _app_logger.handlers:
    _app_logger.addHandler(_handler)
    _app_logger.setLevel(logging.INFO)


def auto_sync_saves():
    """On app launch, import (in a background thread) every career save that is new or has
    been saved again since its last import. Imports are idempotent, so this is always safe."""
    import threading

    def _bg_import():
        logger = logging.getLogger("fc_universe.auto_import")
        try:
            from datetime import datetime
            from fc_universe.database import SessionLocal
            from fc_universe.models import Career
            from fc_universe.parser.fbchunks import FbChunksParser, apply_team_offset_overrides
            from fc_universe.services.import_service import ImportService

            save_dir = settings.save_directory
            if not save_dir.exists():
                logger.info(f"Save directory not found: {save_dir}")
                return

            apply_team_offset_overrides(settings.team_id_offset)
            parser = FbChunksParser()
            # Oldest first, so the most recently played career ends up first in the list
            for save_file in sorted(save_dir.glob("CmMgrC*"), key=lambda p: p.stat().st_mtime):
                db = SessionLocal()
                try:
                    header = parser.read_header(save_file)
                    career = db.query(Career).filter(Career.save_identifier == header.save_identifier).first()
                    modified = datetime.utcfromtimestamp(save_file.stat().st_mtime)
                    if career and career.updated_at and career.updated_at >= modified:
                        continue
                    logger.info(f"Syncing save {save_file.name} ({header.career_name})...")
                    career = ImportService(db).import_save(parser.parse(save_file))
                    logger.info(f"Synced career ID={career.id} ('{career.name}')")
                except Exception:
                    logger.exception(f"Auto-import of {save_file.name} failed")
                finally:
                    db.close()
        except Exception:
            logger.exception("Auto-import on startup failed")

    thread = threading.Thread(target=_bg_import, daemon=True)
    thread.start()


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

    # Bring every career up to date with its save file
    auto_sync_saves()

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
