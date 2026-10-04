from functools import lru_cache

import httpx
from supabase import Client, ClientOptions, create_client

from app.core.config import get_settings

# Matches supabase-py's default PostgREST timeout.
TIMEOUT_SECONDS = 120


class RetryOnDisconnectTransport(httpx.BaseTransport):
    """Retries a request once when Supabase drops the connection before responding.

    Supabase sometimes closes a pooled connection that the client still thinks is open,
    which surfaces as `RemoteProtocolError: Server disconnected` on the next request.
    """

    def __init__(self, inner: httpx.BaseTransport) -> None:
        self.inner = inner

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        try:
            return self.inner.handle_request(request)
        except httpx.RemoteProtocolError:
            return self.inner.handle_request(request)

    def close(self) -> None:
        self.inner.close()


@lru_cache
def get_supabase() -> Client:
    """Service-role client. Bypasses RLS — always scope queries to the current user."""
    settings = get_settings()
    # HTTP/1.1 gives each request thread its own connection instead of multiplexing
    # them over one HTTP/2 connection that Supabase can close mid-request.
    http_client = httpx.Client(
        transport=RetryOnDisconnectTransport(httpx.HTTPTransport()),
        timeout=TIMEOUT_SECONDS,
        follow_redirects=True,
    )
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=ClientOptions(httpx_client=http_client),
    )
