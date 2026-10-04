import re
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends
from postgrest.exceptions import APIError

from app.core.avatar_color import random_avatar_color
from app.db.supabase import get_supabase

USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,20}$")
UNIQUE_VIOLATION = "23505"

Row = dict[str, Any]


class UsernameTakenError(Exception):
    pass


class DuplicateFriendshipError(Exception):
    pass


def normalize_username(raw: str) -> str:
    """Lowercase and strip a leading @. Raises ValueError with a user-facing message."""
    username = raw.strip().removeprefix("@").lower()
    if not USERNAME_PATTERN.fullmatch(username):
        raise ValueError(
            "Usernames are 3-20 characters: lowercase letters, numbers, and underscores."
        )
    return username


class FriendsRepo:
    """Supabase access for profiles and friendships. Uses the service-role client."""

    def __init__(self) -> None:
        self.db = get_supabase()

    def get_profile(self, user_id: str) -> Row | None:
        rows = self.db.table("profiles").select("*").eq("id", user_id).limit(1).execute().data
        return rows[0] if rows else None

    def get_profile_by_username(self, username: str) -> Row | None:
        rows = (
            self.db.table("profiles").select("*").eq("username", username).limit(1).execute().data
        )
        return rows[0] if rows else None

    def get_profiles(self, user_ids: list[str]) -> list[Row]:
        if not user_ids:
            return []
        return self.db.table("profiles").select("*").in_("id", user_ids).execute().data

    def save_username(self, user_id: str, username: str) -> Row:
        try:
            updated = (
                self.db.table("profiles")
                .update({"username": username})
                .eq("id", user_id)
                .execute()
                .data
            )
            if updated:
                return updated[0]
            return (
                self.db.table("profiles")
                .insert(
                    {
                        "id": user_id,
                        "username": username,
                        "display_name": username,
                        "avatar_color": random_avatar_color(),
                    }
                )
                .execute()
                .data[0]
            )
        except APIError as exc:
            if exc.code == UNIQUE_VIOLATION:
                raise UsernameTakenError from exc
            raise

    def save_contacts(self, user_id: str, columns: Row) -> Row | None:
        updated = self.db.table("profiles").update(columns).eq("id", user_id).execute().data
        return updated[0] if updated else None

    def shares_event(self, user_a: str, user_b: str) -> bool:
        events = self.db.table("event_members").select("event_id").eq("user_id", user_a).execute()
        event_ids = [row["event_id"] for row in events.data]
        if not event_ids:
            return False
        rows = (
            self.db.table("event_members")
            .select("event_id")
            .eq("user_id", user_b)
            .in_("event_id", event_ids)
            .limit(1)
            .execute()
            .data
        )
        return bool(rows)

    def get_friendship(self, friendship_id: str) -> Row | None:
        rows = (
            self.db.table("friendships").select("*").eq("id", friendship_id).limit(1).execute()
        ).data
        return rows[0] if rows else None

    def find_friendship(self, user_a: str, user_b: str) -> Row | None:
        rows = (
            self.db.table("friendships")
            .select("*")
            .or_(
                f"and(requester_id.eq.{user_a},addressee_id.eq.{user_b}),"
                f"and(requester_id.eq.{user_b},addressee_id.eq.{user_a})"
            )
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def list_friendships(self, user_id: str) -> list[Row]:
        return (
            self.db.table("friendships")
            .select("*")
            .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def create_friendship(self, requester_id: str, addressee_id: str) -> Row:
        try:
            return (
                self.db.table("friendships")
                .insert({"requester_id": requester_id, "addressee_id": addressee_id})
                .execute()
                .data[0]
            )
        except APIError as exc:
            if exc.code == UNIQUE_VIOLATION:
                raise DuplicateFriendshipError from exc
            raise

    def accept_friendship(self, friendship_id: str) -> Row:
        return (
            self.db.table("friendships")
            .update({"status": "accepted", "accepted_at": datetime.now(UTC).isoformat()})
            .eq("id", friendship_id)
            .execute()
            .data[0]
        )

    def delete_friendship(self, friendship_id: str) -> None:
        self.db.table("friendships").delete().eq("id", friendship_id).execute()


FriendsRepoDep = Annotated[FriendsRepo, Depends(FriendsRepo)]
