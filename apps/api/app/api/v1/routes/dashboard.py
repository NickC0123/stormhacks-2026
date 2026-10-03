from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.schemas.dashboard import SpendingSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/spending", response_model=SpendingSummary)
def spending(user: CurrentUserDep) -> SpendingSummary:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
