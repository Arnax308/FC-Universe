"""Common API schemas and responses."""

from typing import TypeVar, Generic
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    data: T | None = None
    message: str | None = None


class BaseSchema(BaseModel):
    """Base schema for all models with ORM mode."""
    model_config = ConfigDict(from_attributes=True)
