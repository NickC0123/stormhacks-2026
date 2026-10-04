import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile

from app.core.auth import CurrentUserDep
from app.core.config import get_settings
from app.schemas.receipt import ParsedReceipt, Receipt
from app.schemas.split import SplitRequest
from app.services.receipt_parser import (
    ReceiptParseError,
    ReceiptParserNotConfiguredError,
    parse_receipt,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["receipts"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024
HEIF_BRANDS = {b"heic", b"heix", b"heim", b"heis", b"hevc", b"mif1", b"msf1"}


def detect_image_type(data: bytes) -> str | None:
    """Identify the image format from its leading bytes; clients don't always send a type."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[4:8] == b"ftyp" and data[8:12] in HEIF_BRANDS:
        return "image/heic"
    return None


# Room for the multipart boundary and headers around the image itself.
MULTIPART_OVERHEAD_BYTES = 64 * 1024


@router.post("/receipts/scan", response_model=ParsedReceipt)
async def scan_receipt(request: Request, user: CurrentUserDep) -> ParsedReceipt:
    """Parse a receipt image with Gemini and return items for the user to review."""
    # Cheap checks first, before the upload is read: nothing is spent on a scan that can't run.
    if not get_settings().gemini_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Receipt scanning is not configured. Set GEMINI_API_KEY in "
            "apps/api/.env.cloud and restart the API.",
        )
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Images must be 10 MB or smaller."
        )

    file = (await request.form()).get("file")
    if not isinstance(file, UploadFile):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Attach the receipt image as 'file'.")
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded image is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Images must be 10 MB or smaller."
        )
    mime_type = detect_image_type(data)
    if mime_type is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Unsupported file. Upload a JPEG, PNG, WebP, or HEIC image.",
        )

    try:
        return await run_in_threadpool(parse_receipt, data, mime_type)
    except ReceiptParserNotConfiguredError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Receipt scanning is not configured. Set GEMINI_API_KEY in "
            "apps/api/.env.cloud and restart the API.",
        ) from exc
    except ReceiptParseError as exc:
        logger.warning("Receipt scan failed: %s", exc)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Could not read the receipt. Try a clearer photo."
        ) from exc


@router.get("/events/{event_id}/receipts", response_model=list[Receipt])
def list_receipts(event_id: UUID, user: CurrentUserDep) -> list[Receipt]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.put("/receipts/{receipt_id}/splits", status_code=status.HTTP_204_NO_CONTENT)
def set_splits(receipt_id: UUID, body: SplitRequest, user: CurrentUserDep) -> None:
    """Assign receipt items to friends."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
