from typing import Annotated, Any

from fastapi import Depends
from postgrest.exceptions import APIError

from app.db.supabase import get_supabase
from app.services.friends import UNIQUE_VIOLATION

Row = dict[str, Any]


class DuplicateInviteError(Exception):
    pass


class EventInvitesRepo:
    """Supabase access for events, members, and invites. Uses the service-role client."""

    def __init__(self) -> None:
        self.db = get_supabase()

    def get_event(self, event_id: str) -> Row | None:
        rows = self.db.table("events").select("*").eq("id", event_id).limit(1).execute().data
        return rows[0] if rows else None

    def get_events(self, event_ids: list[str]) -> list[Row]:
        if not event_ids:
            return []
        return self.db.table("events").select("*").in_("id", event_ids).execute().data

    def list_member_ids(self, event_id: str) -> list[str]:
        rows = (
            self.db.table("event_members")
            .select("user_id")
            .eq("event_id", event_id)
            .order("joined_at")
            .execute()
            .data
        )
        return [row["user_id"] for row in rows]

    def is_member(self, event_id: str, user_id: str) -> bool:
        rows = (
            self.db.table("event_members")
            .select("user_id")
            .eq("event_id", event_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        return bool(rows)

    def add_member(self, event_id: str, user_id: str) -> None:
        self.db.table("event_members").upsert(
            {"event_id": event_id, "user_id": user_id},
            on_conflict="event_id,user_id",
            ignore_duplicates=True,
        ).execute()

    def get_invite(self, invite_id: str) -> Row | None:
        rows = (
            self.db.table("event_invites").select("*").eq("id", invite_id).limit(1).execute().data
        )
        return rows[0] if rows else None

    def list_event_invites(self, event_id: str) -> list[Row]:
        return (
            self.db.table("event_invites")
            .select("*")
            .eq("event_id", event_id)
            .order("created_at")
            .execute()
            .data
        )

    def list_incoming_invites(self, user_id: str) -> list[Row]:
        return (
            self.db.table("event_invites")
            .select("*")
            .eq("invitee_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def create_invite(self, event_id: str, inviter_id: str, invitee_id: str) -> Row:
        try:
            return (
                self.db.table("event_invites")
                .insert({"event_id": event_id, "inviter_id": inviter_id, "invitee_id": invitee_id})
                .execute()
                .data[0]
            )
        except APIError as exc:
            if exc.code == UNIQUE_VIOLATION:
                raise DuplicateInviteError from exc
            raise

    def delete_invite(self, invite_id: str) -> None:
        self.db.table("event_invites").delete().eq("id", invite_id).execute()


EventInvitesRepoDep = Annotated[EventInvitesRepo, Depends(EventInvitesRepo)]
