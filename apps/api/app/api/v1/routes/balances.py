from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.schemas.balance import Balance

router = APIRouter(tags=["balances"])


@router.get("/balances", response_model=list[Balance])
def my_balances(user: CurrentUserDep) -> list[Balance]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/events/{event_id}/balances", response_model=list[Balance])
def event_balances(event_id: UUID, user: CurrentUserDep) -> list[Balance]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
