from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import get_settings
from app.db.supabase import get_supabase

bearer = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    id: str
    email: str | None = None


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> CurrentUser:
    """Validate the Supabase access token sent by the mobile app."""
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        res = get_supabase().auth.get_user(creds.credentials)
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    if res is None or res.user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return CurrentUser(id=res.user.id, email=res.user.email)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def get_current_user_or_dev(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> CurrentUser | None:
    """Like get_current_user, but allows requests without a token when ENVIRONMENT=development."""
    if creds is None and get_settings().environment == "development":
        return None
    return get_current_user(creds)


CurrentUserOrDevDep = Annotated[CurrentUser | None, Depends(get_current_user_or_dev)]
