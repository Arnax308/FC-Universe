"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Check if the API is running."""
    return {"status": "ok", "service": "fc-universe-api"}
