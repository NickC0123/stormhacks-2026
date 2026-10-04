from typing import Annotated, Any

from fastapi import Depends

from app.core.config import get_settings
from app.db.supabase import get_supabase
from app.services import storage

Row = dict[str, Any]


class EventPhotosRepo:
    """Event photos, stored as memories rows with a photo in the memories bucket."""

    def __init__(self) -> None:
        self.db = get_supabase()
        self.bucket = get_settings().supabase_storage_bucket_memories

    def list_photos(self, event_id: str) -> list[Row]:
        return (
            self.db.table("memories")
            .select("*")
            .eq("event_id", event_id)
            .not_.is_("photo_path", "null")
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def list_photos_for_events(self, event_ids: list[str]) -> list[Row]:
        if not event_ids:
            return []
        return (
            self.db.table("memories")
            .select("id,event_id,photo_path,created_at")
            .in_("event_id", event_ids)
            .not_.is_("photo_path", "null")
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def add_photo(self, event_id: str, author_id: str, path: str) -> Row:
        return (
            self.db.table("memories")
            .insert({"event_id": event_id, "author_id": author_id, "photo_path": path})
            .execute()
            .data[0]
        )

    def get_photo(self, event_id: str, photo_id: str) -> Row | None:
        rows = (
            self.db.table("memories")
            .select("*")
            .eq("id", photo_id)
            .eq("event_id", event_id)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def delete_photo(self, photo_id: str) -> None:
        self.db.table("memories").delete().eq("id", photo_id).execute()

    def upload(self, path: str, data: bytes, content_type: str) -> None:
        storage.upload_file(self.bucket, path, data, content_type)

    def remove(self, path: str) -> None:
        storage.remove_files(self.bucket, [path])

    def signed_urls(self, paths: list[str]) -> dict[str, str]:
        return storage.signed_urls(self.bucket, paths)


EventPhotosRepoDep = Annotated[EventPhotosRepo, Depends(EventPhotosRepo)]
