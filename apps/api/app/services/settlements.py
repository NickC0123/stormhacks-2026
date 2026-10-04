from typing import Annotated, Any

from fastapi import Depends

from app.db.supabase import get_supabase

Row = dict[str, Any]


class SettlementsRepo:
    def __init__(self):
        self.db = get_supabase()

    def list_for_user(self, user_id: str, event_id: str | None = None) -> list[Row]:
        """Payments the user made or received, optionally only those recorded for one event."""
        query = (
            self.db.table("settlements")
            .select("*")
            .or_(f"from_user_id.eq.{user_id},to_user_id.eq.{user_id}")
        )
        if event_id is not None:
            query = query.eq("event_id", event_id)
        return query.order("created_at").execute().data

    def create(self, row: Row) -> Row:
        return self.db.table("settlements").insert(row).execute().data[0]


SettlementsRepoDep = Annotated[SettlementsRepo, Depends(SettlementsRepo)]
