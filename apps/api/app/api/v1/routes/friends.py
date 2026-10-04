from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.core.auth import CurrentUserDep
from app.schemas.friend import FriendRequestCreate, Friendship, FriendsOverview, FriendUser
from app.services.friends import (
    DuplicateFriendshipError,
    FriendsRepo,
    FriendsRepoDep,
    normalize_username,
)

router = APIRouter(prefix="/friends", tags=["friends"])


def other_user_id(row: dict[str, Any], user_id: str) -> str:
    return row["addressee_id"] if row["requester_id"] == user_id else row["requester_id"]


def to_friendship(row: dict[str, Any], other: dict[str, Any]) -> Friendship:
    return Friendship(
        id=row["id"],
        user=FriendUser(id=other["id"], username=other["username"]),
        status=row["status"],
        created_at=row["created_at"],
        accepted_at=row.get("accepted_at"),
    )


def get_own_friendship(repo: FriendsRepo, friendship_id: UUID, user_id: str) -> dict[str, Any]:
    row = repo.get_friendship(str(friendship_id))
    if row is None or user_id not in (row["requester_id"], row["addressee_id"]):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friend request not found.")
    return row


@router.get("", response_model=FriendsOverview)
def list_friends(user: CurrentUserDep, repo: FriendsRepoDep) -> FriendsOverview:
    """Accepted friends plus pending requests in both directions."""
    rows = repo.list_friendships(user.id)
    profiles = {p["id"]: p for p in repo.get_profiles([other_user_id(r, user.id) for r in rows])}
    overview = FriendsOverview(friends=[], incoming=[], outgoing=[])
    for row in rows:
        other = profiles.get(other_user_id(row, user.id))
        if other is None or not other.get("username"):
            continue
        friendship = to_friendship(row, other)
        if row["status"] == "accepted":
            overview.friends.append(friendship)
        elif row["addressee_id"] == user.id:
            overview.incoming.append(friendship)
        else:
            overview.outgoing.append(friendship)
    overview.friends.sort(key=lambda f: f.user.username)
    return overview


@router.post("/requests", response_model=Friendship, status_code=status.HTTP_201_CREATED)
def send_request(
    body: FriendRequestCreate, user: CurrentUserDep, repo: FriendsRepoDep
) -> Friendship:
    """Send a request by username. If they already asked you, this accepts theirs."""
    me = repo.get_profile(user.id)
    if me is None or not me.get("username"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Pick a username before adding friends.")
    try:
        username = normalize_username(body.username)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    target = repo.get_profile_by_username(username)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No one has the username @{username}.")
    if target["id"] == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't add yourself as a friend.")

    existing = repo.find_friendship(user.id, target["id"])
    if existing is not None:
        if existing["status"] == "accepted":
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"You're already friends with @{username}."
            )
        if existing["requester_id"] == user.id:
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"You already sent @{username} a friend request."
            )
        return to_friendship(repo.accept_friendship(existing["id"]), target)

    try:
        row = repo.create_friendship(user.id, target["id"])
    except DuplicateFriendshipError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"There's already a request between you and @{username}."
        ) from exc
    return to_friendship(row, target)


@router.post("/requests/{friendship_id}/accept", response_model=Friendship)
def accept_request(friendship_id: UUID, user: CurrentUserDep, repo: FriendsRepoDep) -> Friendship:
    row = get_own_friendship(repo, friendship_id, user.id)
    if row["status"] == "pending":
        if row["addressee_id"] != user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Only the person you sent this request to can accept it."
            )
        row = repo.accept_friendship(row["id"])
    other = repo.get_profiles([other_user_id(row, user.id)])
    if not other:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friend request not found.")
    return to_friendship(row, other[0])


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(friendship_id: UUID, user: CurrentUserDep, repo: FriendsRepoDep) -> Response:
    """Decline an incoming request, cancel an outgoing one, or remove a friend."""
    row = get_own_friendship(repo, friendship_id, user.id)
    repo.delete_friendship(row["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)
