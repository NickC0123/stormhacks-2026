from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MemoryCreate(BaseModel):
    note: str | None = None
    photo_path: str | None = None


class Memory(MemoryCreate):
    id: UUID
    event_id: UUID
    author_id: UUID
    created_at: datetime
