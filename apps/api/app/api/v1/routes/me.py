from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.core.avatar_color import coerce_avatar_color
from app.schemas.profile import ContactSettings, Profile, UsernameUpdate
from app.services.contacts import own_contacts, to_columns
from app.services.friends import FriendsRepoDep, UsernameTakenError, normalize_username

router = APIRouter(prefix="/me", tags=["me"])


def to_profile(row: dict, *, user_id: str, display_name: str | None = None) -> Profile:
    return Profile(
        id=row.get("id", user_id),
        username=row.get("username"),
        display_name=display_name if display_name is not None else row.get("display_name") or "",
        avatar_color=coerce_avatar_color(row.get("avatar_color"), user_id=user_id),
    )


@router.get("", response_model=Profile)
def get_me(user: CurrentUserDep, repo: FriendsRepoDep) -> Profile:
    """The signed-in user's profile. `username` is null until they pick one."""
    profile = repo.get_profile(user.id)
    if profile is None:
        return to_profile({}, user_id=user.id, display_name=user.email or "")
    return to_profile(profile, user_id=user.id)


@router.put("/username", response_model=Profile)
def set_username(body: UsernameUpdate, user: CurrentUserDep, repo: FriendsRepoDep) -> Profile:
    try:
        username = normalize_username(body.username)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    try:
        return to_profile(repo.save_username(user.id, username), user_id=user.id)
    except UsernameTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, f"@{username} is already taken.") from exc


@router.get("/contacts", response_model=ContactSettings)
def get_contacts(user: CurrentUserDep, repo: FriendsRepoDep) -> ContactSettings:
    """Every contact field, filled in or not, with whether others can see it."""
    return own_contacts(repo.get_profile(user.id))


@router.put("/contacts", response_model=ContactSettings)
def set_contacts(
    body: ContactSettings, user: CurrentUserDep, repo: FriendsRepoDep
) -> ContactSettings:
    """Replace all contact fields. Kinds left out are cleared; empty values are never shown."""
    try:
        columns = to_columns(body)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    profile = repo.save_contacts(user.id, columns)
    if profile is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Pick a username first.")
    return own_contacts(profile)
