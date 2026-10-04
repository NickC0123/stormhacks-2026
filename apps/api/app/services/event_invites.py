from typing import Annotated, Any

from fastapi import Depends
from postgrest.exceptions import APIError

from app.db.supabase import get_supabase
from app.services.friends import UNIQUE_VIOLATION

Row = dict[str, Any]


class DuplicateInviteError(Exception):
    pass


class PeopleRepo:
    """Membership and pending invitations, scoped to one resource type."""

    resource_table = "events"
    member_table = "event_members"
    invite_table = "event_invites"
    resource_key = "event_id"

    def __init__(self) -> None:
        self.db = get_supabase()

    def get_resource(self, resource_id: str) -> Row | None:
        rows = (
            self.db.table(self.resource_table)
            .select("*")
            .eq("id", resource_id)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def get_resources(self, resource_ids: list[str]) -> list[Row]:
        if not resource_ids:
            return []
        return self.db.table(self.resource_table).select("*").in_("id", resource_ids).execute().data

    def list_member_ids(self, resource_id: str) -> list[str]:
        rows = (
            self.db.table(self.member_table)
            .select("user_id")
            .eq(self.resource_key, resource_id)
            .order("joined_at")
            .execute()
            .data
        )
        return [row["user_id"] for row in rows]

    def is_member(self, resource_id: str, user_id: str) -> bool:
        rows = (
            self.db.table(self.member_table)
            .select("user_id")
            .eq(self.resource_key, resource_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        return bool(rows)

    def add_member(self, resource_id: str, user_id: str) -> None:
        self.db.table(self.member_table).upsert(
            {self.resource_key: resource_id, "user_id": user_id},
            on_conflict=f"{self.resource_key},user_id",
            ignore_duplicates=True,
        ).execute()

    def get_invite(self, invite_id: str) -> Row | None:
        rows = (
            self.db.table(self.invite_table).select("*").eq("id", invite_id).limit(1).execute().data
        )
        return rows[0] if rows else None

    def list_resource_invites(self, resource_id: str) -> list[Row]:
        return (
            self.db.table(self.invite_table)
            .select("*")
            .eq(self.resource_key, resource_id)
            .order("created_at")
            .execute()
            .data
        )

    def list_incoming_invites(self, user_id: str) -> list[Row]:
        return (
            self.db.table(self.invite_table)
            .select("*")
            .eq("invitee_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def create_invite(self, resource_id: str, inviter_id: str, invitee_id: str) -> Row:
        try:
            return (
                self.db.table(self.invite_table)
                .insert(
                    {
                        self.resource_key: resource_id,
                        "inviter_id": inviter_id,
                        "invitee_id": invitee_id,
                    }
                )
                .execute()
                .data[0]
            )
        except APIError as exc:
            if exc.code == UNIQUE_VIOLATION:
                raise DuplicateInviteError from exc
            raise

    def delete_invite(self, invite_id: str) -> None:
        self.db.table(self.invite_table).delete().eq("id", invite_id).execute()

    def remove_member(self, resource_id: str, user_id: str) -> None:
        self.db.table(self.member_table).delete().eq(self.resource_key, resource_id).eq(
            "user_id", user_id
        ).execute()


class EventInvitesRepo(PeopleRepo):
    pass


class ExpensePeopleRepo(PeopleRepo):
    resource_table = "expenses"
    member_table = "expense_members"
    invite_table = "expense_invites"
    resource_key = "expense_id"


ExpensePeopleRepoDep = Annotated[ExpensePeopleRepo, Depends(ExpensePeopleRepo)]
EventInvitesRepoDep = Annotated[EventInvitesRepo, Depends(EventInvitesRepo)]
