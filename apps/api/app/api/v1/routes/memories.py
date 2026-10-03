from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.schemas.memory import Memory, MemoryCreate

router = APIRouter(tags=["memories"])


@router.get("/events/{event_id}/memories", response_model=list[Memory])
def list_memories(event_id: UUID, user: CurrentUserDep) -> list[Memory]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.post(
    "/events/{event_id}/memories", response_model=Memory, status_code=status.HTTP_201_CREATED
)
def create_memory(event_id: UUID, body: MemoryCreate, user: CurrentUserDep) -> Memory:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/timeline", response_model=list[Memory])
def timeline(user: CurrentUserDep) -> list[Memory]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
