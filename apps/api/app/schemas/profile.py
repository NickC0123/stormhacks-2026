from uuid import UUID

from pydantic import BaseModel


class Profile(BaseModel):
    id: UUID
    username: str | None = None
    display_name: str


class UsernameUpdate(BaseModel):
    username: str
