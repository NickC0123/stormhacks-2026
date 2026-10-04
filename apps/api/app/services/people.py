from typing import Any

from fastapi import HTTPException

from app.schemas.invite import EventInvite, EventUser, InviteCreate, PersonAdded
from app.services.event_invites import DuplicateInviteError, PeopleRepo
from app.services.friends import FriendsRepo, normalize_username


def accepted_friend(friends: FriendsRepo, user_id: str, target_id: str) -> bool:
    friendship = friends.find_friendship(user_id, target_id)
    return friendship is not None and friendship["status"] == "accepted"


def resolve_person(body: InviteCreate, friends: FriendsRepo) -> dict[str, Any]:
    if body.username is not None:
        try:
            username = normalize_username(body.username)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        profile = friends.get_profile_by_username(username)
    else:
        profile = friends.get_profile(str(body.user_id))
    if profile is None:
        raise HTTPException(404, "Person not found.")
    return profile


def add_person(
    resource_id: str, body: InviteCreate, user_id: str, repo: PeopleRepo, friends: FriendsRepo
) -> PersonAdded:
    target = resolve_person(body, friends)
    target_id = target["id"]
    resource = repo.get_resource(resource_id)
    if target_id == user_id:
        raise HTTPException(400, "You're already a member.")
    if repo.is_member(resource_id, target_id) or (
        resource is not None and resource["created_by"] == target_id
    ):
        raise HTTPException(409, "This person is already a member.")
    person = EventUser.from_profile(target)
    if accepted_friend(friends, user_id, target_id):
        repo.add_member(resource_id, target_id)
        # A previous invitation must not remain after a friend is added directly.
        for invite in repo.list_resource_invites(resource_id):
            if invite["invitee_id"] == target_id:
                repo.delete_invite(invite["id"])
        return PersonAdded(status="added", user=person)
    try:
        row = repo.create_invite(resource_id, user_id, target_id)
    except DuplicateInviteError as exc:
        raise HTTPException(409, "This person already has a pending invitation.") from exc
    inviter = friends.get_profile(user_id)
    return PersonAdded(
        status="invited",
        user=person,
        invite=EventInvite(
            id=row["id"],
            user=person,
            invited_by=(
                EventUser.from_profile(inviter)
                if inviter
                else EventUser.lookup({}, user_id)
            ),
            created_at=row["created_at"],
        ),
    )


def remove_person(
    resource: dict[str, Any],
    target_id: str,
    user_id: str,
    repo: PeopleRepo,
    friends: FriendsRepo,
) -> None:
    if target_id == resource["created_by"]:
        raise HTTPException(403, "The creator cannot be removed.")
    if target_id == user_id:
        raise HTTPException(400, "You cannot remove yourself here.")
    if not repo.is_member(resource["id"], target_id):
        raise HTTPException(404, "Member not found.")
    if not accepted_friend(friends, user_id, target_id):
        raise HTTPException(403, "You can only remove your accepted friends.")
    repo.remove_member(resource["id"], target_id)
