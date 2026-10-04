"""Helpers for Supabase Storage (receipt images, memory photos)."""

from app.db.supabase import get_supabase


def upload_file(bucket: str, path: str, data: bytes, content_type: str) -> str:
    get_supabase().storage.from_(bucket).upload(path, data, {"content-type": content_type})
    return path


def signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    res = get_supabase().storage.from_(bucket).create_signed_url(path, expires_in)
    return res["signedURL"]


def signed_urls(bucket: str, paths: list[str], expires_in: int = 3600) -> dict[str, str]:
    """Signed URLs for many files in one request, keyed by path."""
    if not paths:
        return {}
    res = get_supabase().storage.from_(bucket).create_signed_urls(paths, expires_in)
    return {item["path"]: item["signedURL"] for item in res if item.get("signedURL")}


def remove_files(bucket: str, paths: list[str]) -> None:
    get_supabase().storage.from_(bucket).remove(paths)
