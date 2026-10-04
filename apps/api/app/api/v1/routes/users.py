from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.schemas.profile import PublicProfile
from app.services.contacts import shown_contacts
from app.services.friends import FriendsRepoDep

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=PublicProfile)
def get_user(user_id: UUID, user: CurrentUserDep, repo: FriendsRepoDep) -> PublicProfile:
    """Someone's profile and the contacts they chose to show.

    Only friends and people who share an event can see it.
    """
    other_id = str(user_id)
    profile = repo.get_profile(other_id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if other_id != user.id:
        friendship = repo.find_friendship(user.id, other_id)
        is_friend = friendship is not None and friendship["status"] == "accepted"
        if not is_friend and not repo.shares_event(user.id, other_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return PublicProfile(
        id=profile["id"], username=profile.get("username"), contacts=shown_contacts(profile)
    )
