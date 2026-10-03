"""Helpers for Supabase Storage (receipt images, memory photos)."""

from app.db.supabase import get_supabase


def upload_file(bucket: str, path: str, data: bytes, content_type: str) -> str:
    get_supabase().storage.from_(bucket).upload(path, data, {"content-type": content_type})
    return path


def signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    res = get_supabase().storage.from_(bucket).create_signed_url(path, expires_in)
    return res["signedURL"]
