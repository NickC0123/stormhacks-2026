import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.event_invites import EventInvitesRepo
from app.services.event_photos import EventPhotosRepo
from tests.test_event_invites import FakePeopleRepo

client = TestClient(app)
ALICE, BOB, MALLORY = [str(uuid.uuid4()) for _ in range(3)]
JPEG = b"\xff\xd8\xff\xe0" + b"\0" * 16


class FakePhotosRepo(EventPhotosRepo):
    def __init__(self):
        self.rows = []
        self.files = {}
        self.fail_insert = False

    def list_photos(self, event_id):
        rows = [r for r in self.rows if r["event_id"] == event_id and r["photo_path"]]
        return sorted(rows, key=lambda r: r["created_at"], reverse=True)

    def add_photo(self, event_id, author_id, path):
        if self.fail_insert:
            raise RuntimeError("Database write failed")
        row = {
            "id": str(uuid.uuid4()),
            "event_id": event_id,
            "author_id": author_id,
            "photo_path": path,
            "note": None,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.rows.append(row)
        return row

    def get_photo(self, event_id, photo_id):
        return next(
            (r for r in self.rows if r["id"] == photo_id and r["event_id"] == event_id), None
        )

    def delete_photo(self, photo_id):
        self.rows = [r for r in self.rows if r["id"] != photo_id]

    def upload(self, path, data, content_type):
        self.files[path] = (data, content_type)

    def remove(self, path):
        self.files.pop(path, None)

    def signed_urls(self, paths):
        return {p: f"https://signed/{p}" for p in paths if p in self.files}


@pytest.fixture
def setup():
    events = FakePeopleRepo("event")
    photos = FakePhotosRepo()
    event_id = events.add_resource(ALICE)
    events.add_member(event_id, BOB)
    app.dependency_overrides[EventInvitesRepo] = lambda: events
    app.dependency_overrides[EventPhotosRepo] = lambda: photos
    yield event_id, photos
    app.dependency_overrides.clear()


def sign_in(user_id):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=user_id)


def upload(event_id, data=JPEG):
    return client.post(
        f"/api/v1/events/{event_id}/photos", files={"file": ("photo", data, "image/jpeg")}
    )


def test_members_add_photos_and_everyone_in_the_event_sees_them(setup):
    event_id, photos = setup
    sign_in(ALICE)
    first = upload(event_id)
    assert first.status_code == 201
    assert first.json()["author_id"] == ALICE
    assert first.json()["url"].startswith(f"https://signed/{event_id}/")
    assert first.json()["url"].endswith(".jpg")

    sign_in(BOB)
    assert upload(event_id).status_code == 201

    listed = client.get(f"/api/v1/events/{event_id}/photos").json()
    assert [p["author_id"] for p in listed] == [BOB, ALICE]
    assert all(p["url"] for p in listed)


def test_non_members_cannot_see_or_add_photos(setup):
    event_id, photos = setup
    sign_in(MALLORY)
    assert client.get(f"/api/v1/events/{event_id}/photos").status_code == 404
    assert upload(event_id).status_code == 404
    assert photos.files == {}


def test_rejects_empty_and_non_image_uploads(setup):
    event_id, photos = setup
    sign_in(ALICE)
    assert upload(event_id, b"").status_code == 400
    assert upload(event_id, b"not an image").status_code == 415
    assert photos.files == {} and photos.rows == []


def test_uploaded_file_removed_when_saving_the_row_fails(setup):
    event_id, photos = setup
    photos.fail_insert = True
    sign_in(ALICE)
    with pytest.raises(RuntimeError):
        upload(event_id)
    assert photos.files == {}


def test_photo_missing_from_storage_is_skipped(setup):
    event_id, photos = setup
    sign_in(ALICE)
    upload(event_id)
    photos.files.clear()
    assert client.get(f"/api/v1/events/{event_id}/photos").json() == []


def test_uploader_or_host_can_delete_a_photo(setup):
    event_id, photos = setup
    sign_in(BOB)
    bobs = upload(event_id).json()["id"]
    sign_in(ALICE)
    alices = upload(event_id).json()["id"]

    sign_in(BOB)
    assert client.delete(f"/api/v1/events/{event_id}/photos/{alices}").status_code == 403
    assert client.delete(f"/api/v1/events/{event_id}/photos/{bobs}").status_code == 204
    sign_in(ALICE)
    upload_again = upload(event_id).json()["id"]
    sign_in(BOB)
    bobs_second = upload(event_id).json()["id"]
    sign_in(ALICE)
    assert client.delete(f"/api/v1/events/{event_id}/photos/{bobs_second}").status_code == 204
    assert {r["id"] for r in photos.rows} == {alices, upload_again}
    assert len(photos.files) == 2


def test_photo_delete_hidden_from_non_members_and_other_events(setup):
    event_id, photos = setup
    sign_in(ALICE)
    photo = upload(event_id).json()["id"]
    sign_in(MALLORY)
    assert client.delete(f"/api/v1/events/{event_id}/photos/{photo}").status_code == 404
    sign_in(ALICE)
    assert client.delete(f"/api/v1/events/{event_id}/photos/{uuid.uuid4()}").status_code == 404
    assert len(photos.rows) == 1

