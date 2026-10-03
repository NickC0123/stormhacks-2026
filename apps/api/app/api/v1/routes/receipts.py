from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.core.auth import CurrentUserDep
from app.schemas.receipt import ParsedReceipt, Receipt
from app.schemas.split import SplitRequest

router = APIRouter(tags=["receipts"])


@router.post("/receipts/scan", response_model=ParsedReceipt)
async def scan_receipt(file: UploadFile, user: CurrentUserDep) -> ParsedReceipt:
    """Parse a receipt image with Gemini and return items for the user to review."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/events/{event_id}/receipts", response_model=list[Receipt])
def list_receipts(event_id: UUID, user: CurrentUserDep) -> list[Receipt]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.put("/receipts/{receipt_id}/splits", status_code=status.HTTP_204_NO_CONTENT)
def set_splits(receipt_id: UUID, body: SplitRequest, user: CurrentUserDep) -> None:
    """Assign receipt items to friends."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
