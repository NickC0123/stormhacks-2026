from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EventPhoto(BaseModel):
    id: UUID
    event_id: UUID
    author_id: UUID
    url: str
    created_at: datetime
