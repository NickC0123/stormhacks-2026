from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.schemas.profile import Profile, UsernameUpdate
from app.services.friends import FriendsRepoDep, UsernameTakenError, normalize_username

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=Profile)
def get_me(user: CurrentUserDep, repo: FriendsRepoDep) -> Profile:
    """The signed-in user's profile. `username` is null until they pick one."""
    profile = repo.get_profile(user.id)
    if profile is None:
        return Profile(id=user.id, username=None, display_name=user.email or "")
    return Profile(**profile)


@router.put("/username", response_model=Profile)
def set_username(body: UsernameUpdate, user: CurrentUserDep, repo: FriendsRepoDep) -> Profile:
    try:
        username = normalize_username(body.username)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    try:
        return Profile(**repo.save_username(user.id, username))
    except UsernameTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, f"@{username} is already taken.") from exc
