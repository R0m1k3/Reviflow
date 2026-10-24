import uuid

import pytest
from fastapi import HTTPException

from app.config import Settings, settings
from app.core.api_key import get_effective_api_key
from app.core.db import async_session_maker
from app.modules.auth.models import LearnerProfile, User
from app.modules.quiz.models import Revision

pytestmark = pytest.mark.anyio


async def _register_and_login(client, email, password="pass1234", **extra):
    r = await client.post("/api/auth/register", json={"email": email, "password": password, **extra})
    assert r.status_code == 201, r.text
    r = await client.post("/api/auth/jwt/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _login(client, username, password):
    r = await client.post("/api/auth/jwt/login", data={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _add_revision(learner_id=None, owner_user_id=None):
    async with async_session_maker() as s:
        rev = Revision(learner_id=learner_id, owner_user_id=owner_user_id, topic="t", text_content="secret lesson")
        s.add(rev)
        await s.commit()
        return rev.id


def test_secret_key_required():
    with pytest.raises(ValueError):
        Settings(SECRET_KEY="SECRET_KEY_CHANGE_ME_IN_PROD")
    with pytest.raises(ValueError):
        Settings(SECRET_KEY="short")


async def test_register_cannot_choose_role_or_parent(client):
    other = uuid.uuid4()
    h = await _register_and_login(client, "evil@x.io", role="learner", parent_id=str(other))
    me = (await client.get("/api/auth/users/me", headers=h)).json()
    assert me["role"] == "parent"
    assert me["parent_id"] is None

    r = await client.patch("/api/auth/users/me", json={"role": "learner", "parent_id": str(other)}, headers=h)
    assert r.status_code == 200
    me = (await client.get("/api/auth/users/me", headers=h)).json()
    assert me["role"] == "parent"
    assert me["parent_id"] is None


async def test_revision_idor(client):
    ha = await _register_and_login(client, "parent-a@x.io")
    hb = await _register_and_login(client, "parent-b@x.io")

    # Parent A creates a child account (server-side role/parent assignment)
    r = await client.post("/api/auth/profiles", json={"username": "kid-a", "password": "4321", "first_name": "Kid"}, headers=ha)
    assert r.status_code == 200, r.text
    learner_id = uuid.UUID(r.json()["user"]["profile_id"])
    async with async_session_maker() as s:
        kid = await s.get(User, uuid.UUID(r.json()["user"]["id"]))
        assert kid.role == "learner" and kid.parent_id is not None
    hk = await _login(client, "kid-a", "4321")

    rev_id = await _add_revision(learner_id=learner_id)

    # Parent A and the child can read it, parent B cannot
    assert (await client.get(f"/api/quiz/review/{rev_id}", headers=ha)).status_code == 200
    assert (await client.get(f"/api/quiz/review/{rev_id}", headers=hk)).status_code == 200
    assert (await client.get(f"/api/quiz/review/{rev_id}", headers=hb)).status_code == 404
    assert (await client.delete(f"/api/quiz/revision/{rev_id}", headers=hb)).status_code == 404
    r = await client.post(
        "/api/quiz/progress/save",
        json={"revision_id": str(rev_id), "current_index": 0, "answers": [], "score": 0},
        headers=hb,
    )
    assert r.status_code == 404

    for path in [
        f"/api/quiz/revisions?learner_id={learner_id}",
        f"/api/quiz/stats/activity?learner_id={learner_id}",
        f"/api/quiz/stats/mastery?learner_id={learner_id}",
        f"/api/quiz/remediation/count?learner_id={learner_id}",
    ]:
        assert (await client.get(path, headers=hb)).status_code == 404, path
        assert (await client.get(path, headers=ha)).status_code == 200, path

    score = {"topic": "t", "score": 1, "total_questions": 2, "learner_id": str(learner_id)}
    assert (await client.post("/api/quiz/score", json=score, headers=hb)).status_code == 404
    assert (await client.post("/api/quiz/score", json={**score, "learner_id": None, "revision_id": str(rev_id)}, headers=hb)).status_code == 404
    assert (await client.post("/api/quiz/score", json=score, headers=hk)).status_code == 200

    # Revisions without learner: only visible to their owner; legacy (no owner) to nobody
    me_b = (await client.get("/api/auth/users/me", headers=hb)).json()
    own_id = await _add_revision(owner_user_id=uuid.UUID(me_b["id"]))
    legacy_id = await _add_revision()
    assert (await client.get(f"/api/quiz/review/{own_id}", headers=hb)).status_code == 200
    assert (await client.get(f"/api/quiz/review/{own_id}", headers=ha)).status_code == 404
    assert (await client.get(f"/api/quiz/review/{legacy_id}", headers=ha)).status_code == 404
    listed = (await client.get("/api/quiz/revisions", headers=ha)).json()
    assert all(r["id"] not in (str(own_id), str(legacy_id)) for r in listed)


async def test_spa_path_traversal(client):
    for path in ["/..%2Fapp%2Fconfig.py", "/%2E%2E/app/config.py", "/assets/..%2F..%2Fapp%2Fconfig.py"]:
        r = await client.get(path)
        assert "SECRET_KEY" not in r.text


async def test_global_key_daily_quota(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "global-key")
    monkeypatch.setattr(settings, "GLOBAL_API_KEY_DAILY_QUOTA", 2)
    async with async_session_maker() as s:
        user = User(email=f"{uuid.uuid4()}@x.io", hashed_password="x")
        s.add(user)
        await s.commit()
        assert await get_effective_api_key(user, s) == "global-key"
        assert await get_effective_api_key(user, s) == "global-key"
        with pytest.raises(HTTPException) as exc:
            await get_effective_api_key(user, s)
        assert exc.value.status_code == 429

        # Own key: never limited
        user.openrouter_api_key = "own"
        assert await get_effective_api_key(user, s) == "own"
