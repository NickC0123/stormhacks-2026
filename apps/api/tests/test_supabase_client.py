import httpx
import pytest

from app.db.supabase import RetryOnDisconnectTransport


def flaky_transport(failures: int) -> tuple[httpx.MockTransport, list[int]]:
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) <= failures:
            raise httpx.RemoteProtocolError("Server disconnected without sending a response.")
        return httpx.Response(200, json={"ok": True})

    return httpx.MockTransport(handler), calls


def test_retries_once_after_server_disconnect() -> None:
    inner, calls = flaky_transport(failures=1)
    client = httpx.Client(transport=RetryOnDisconnectTransport(inner))
    assert client.post("https://example.test/rest", json={"a": 1}).json() == {"ok": True}
    assert len(calls) == 2


def test_gives_up_after_second_disconnect() -> None:
    inner, calls = flaky_transport(failures=2)
    client = httpx.Client(transport=RetryOnDisconnectTransport(inner))
    with pytest.raises(httpx.RemoteProtocolError):
        client.get("https://example.test/rest")
    assert len(calls) == 2
