import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.v1.routes.events import get_member_event
from app.api.v1.routes.receipts import MAX_IMAGE_BYTES, detect_image_type
from app.core.auth import CurrentUserDep
from app.schemas.photo import EventPhoto
from app.services.event_invites import EventInvitesRepoDep
from app.services.event_photos import EventPhotosRepoDep

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events/{event_id}/photos", tags=["photos"])

EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}


def to_photo(row: dict, url: str) -> EventPhoto:
    return EventPhoto(
        id=row["id"],
        event_id=row["event_id"],
        author_id=row["author_id"],
        url=url,
        created_at=row["created_at"],
    )


@router.get("", response_model=list[EventPhoto])
def list_photos(
    event_id: UUID, user: CurrentUserDep, events: EventInvitesRepoDep, photos: EventPhotosRepoDep
) -> list[EventPhoto]:
    """Photos for an event, newest first. Members only."""
    event = get_member_event(events, event_id, user.id)
    rows = photos.list_photos(event["id"])
    urls = photos.signed_urls([row["photo_path"] for row in rows])
    # A file missing from storage gets no URL; skip it rather than fail the whole list.
    return [to_photo(row, urls[row["photo_path"]]) for row in rows if row["photo_path"] in urls]


@router.post("", response_model=EventPhoto, status_code=status.HTTP_201_CREATED)
def add_photo(
    event_id: UUID,
    file: UploadFile,
    user: CurrentUserDep,
    events: EventInvitesRepoDep,
    photos: EventPhotosRepoDep,
) -> EventPhoto:
    """Upload one photo to an event. Members only."""
    event = get_member_event(events, event_id, user.id)
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded image is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Images must be 10 MB or smaller."
        )
    mime = detect_image_type(data)
    if mime is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG, PNG, WebP or HEIC image."
        )

    path = f"{event['id']}/{uuid4()}.{EXTENSIONS[mime]}"
    photos.upload(path, data, mime)
    try:
        row = photos.add_photo(event["id"], user.id, path)
    except Exception:
        try:
            photos.remove(path)
        except Exception:
            logger.warning("Could not remove orphaned event photo %s", path, exc_info=True)
        raise
    return to_photo(row, photos.signed_urls([path]).get(path, ""))
