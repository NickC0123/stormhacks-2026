import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, UploadFile, status

from app.api.v1.routes.receipts import MAX_IMAGE_BYTES, detect_image_type
from app.core.auth import CurrentUserDep
from app.core.config import get_settings
from app.db.supabase import get_supabase
from app.schemas.expense import Expense, ExpenseWrite, ReceiptImage
from app.services.storage import signed_url, upload_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/expenses", tags=["expenses"])


def require_expense(expense_id: UUID, user_id: str) -> dict:
    rows = (
        get_supabase()
        .table("expenses")
        .select("*")
        .eq("id", str(expense_id))
        .eq("created_by", user_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return rows[0]


def check_event(event_id: UUID | None, user_id: str) -> None:
    if event_id is None:
        return
    db = get_supabase()
    events = db.table("events").select("id,created_by").eq("id", str(event_id)).execute().data
    if not events:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    if events[0]["created_by"] == user_id:
        return
    members = (
        db.table("event_members")
        .select("user_id")
        .eq("event_id", str(event_id))
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not members:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a member of this event")


@router.get("", response_model=list[Expense])
def list_expenses(
    user: CurrentUserDep,
    event_id: UUID | None = None,
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[Expense]:
    query = get_supabase().table("expenses").select("*").eq("created_by", user.id)
    if event_id is not None:
        query = query.eq("event_id", str(event_id))
    rows = (
        query.order("date", desc=True)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
        .data
    )
    return [Expense.model_validate(row) for row in rows]


@router.post("", response_model=Expense, status_code=status.HTTP_201_CREATED)
def create_expense(body: ExpenseWrite, user: CurrentUserDep) -> Expense:
    check_event(body.event_id, user.id)
    values = body.model_dump(mode="json")
    # JSON items, decimal amounts and receipt metadata are persisted together.
    row = (
        get_supabase().table("expenses").insert({**values, "created_by": user.id}).execute().data[0]
    )
    return Expense.model_validate(row)


@router.get("/{expense_id}", response_model=Expense)
def get_expense(expense_id: UUID, user: CurrentUserDep) -> Expense:
    return Expense.model_validate(require_expense(expense_id, user.id))


@router.put("/{expense_id}", response_model=Expense)
def update_expense(expense_id: UUID, body: ExpenseWrite, user: CurrentUserDep) -> Expense:
    require_expense(expense_id, user.id)
    check_event(body.event_id, user.id)
    rows = (
        get_supabase()
        .table("expenses")
        .update(body.model_dump(mode="json"))
        .eq("id", str(expense_id))
        .eq("created_by", user.id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return Expense.model_validate(rows[0])


def remove_image(path: str) -> None:
    try:
        get_supabase().storage.from_(get_settings().supabase_storage_bucket_receipts).remove([path])
    except Exception:
        logger.warning("Could not remove unused receipt image %s", path, exc_info=True)


@router.post("/{expense_id}/receipt", response_model=Expense)
def attach_receipt(expense_id: UUID, file: UploadFile, user: CurrentUserDep) -> Expense:
    expense = require_expense(expense_id, user.id)
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded image is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Images must be 10 MB or smaller.")
    mime = detect_image_type(data)
    if mime is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG, PNG, WebP or HEIC image."
        )
    extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
    }[mime]
    path = f"{user.id}/{expense_id}/{uuid4()}.{extension}"
    bucket = get_settings().supabase_storage_bucket_receipts
    upload_file(bucket, path, data, mime)
    try:
        rows = (
            get_supabase()
            .table("expenses")
            .update({"receipt_image_path": path})
            .eq("id", str(expense_id))
            .eq("created_by", user.id)
            .execute()
            .data
        )
        if not rows:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    except Exception:
        remove_image(path)
        raise
    if expense.get("receipt_image_path"):
        remove_image(expense["receipt_image_path"])
    return Expense.model_validate(rows[0])


@router.get("/{expense_id}/receipt", response_model=ReceiptImage)
def get_receipt_image(expense_id: UUID, user: CurrentUserDep) -> ReceiptImage:
    expense = require_expense(expense_id, user.id)
    if not expense.get("receipt_image_path"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This expense has no receipt image")
    return ReceiptImage(
        url=signed_url(
            get_settings().supabase_storage_bucket_receipts, expense["receipt_image_path"]
        )
    )
