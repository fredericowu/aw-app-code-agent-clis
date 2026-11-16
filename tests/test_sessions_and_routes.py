"""End-to-end test of sessions.py + routes.py against a real FastAPI
TestClient, with ``ctx.db`` faked by an in-memory sqlite3 connection (same
pattern as aw-app-presentations' test_storage_and_routes.py) and on-disk
discovery monkeypatched so this doesn't depend on real CLI session files
being present on the test machine.

Run: .venv/aw/bin/python -m pytest tests/test_sessions_and_routes.py
"""
from __future__ import annotations

import sqlite3
import sys
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from code_agent_clis_app import clis as clis_mod  # noqa: E402
from code_agent_clis_app import routes as routes_mod  # noqa: E402
from code_agent_clis_app import sessions as sessions_mod  # noqa: E402
from code_agent_clis_app.sessions import SessionStore  # noqa: E402


class FakeDb:
    def __init__(self):
        self.conn = sqlite3.connect(":memory:", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

    def create(self, name, columns_sql):
        # Real DbTables._qualified() double-quotes the table name (see
        # aw-workspace's src/apps/db_tables.py) — table names carry the
        # app id, which may contain hyphens (e.g. "app__code-agent-clis__
        # sessions"), invalid as a bare sqlite/postgres identifier. Mirror
        # that quoting here so this fake matches the real backend.
        self.conn.execute(f'CREATE TABLE IF NOT EXISTS "{name}" ({columns_sql})')
        self.conn.commit()
        return name

    def execute(self, name, sql, params=None):
        stmt = sql.replace("{table}", f'"{name}"')
        cur = self.conn.execute(stmt, params or {})
        self.conn.commit()
        if stmt.strip().lower().startswith("select"):
            return [_Row(dict(r)) for r in cur.fetchall()]
        return cur


class _Row:
    """Mimics SQLAlchemy Row's ``._mapping`` access used by sessions.py."""

    def __init__(self, d):
        self._mapping = d


class FakeCtx:
    def __init__(self):
        self.db = FakeDb()


FAKE_CLAUDE_SESSIONS = [
    {"session_id": "aaa-1", "name": "fix the bug", "created_at": 100.0, "updated_at": 300.0},
    {"session_id": "bbb-2", "name": "add feature", "created_at": 100.0, "updated_at": 200.0},
]


@pytest.fixture(autouse=True)
def fake_discovery(monkeypatch):
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(FAKE_CLAUDE_SESSIONS))
    monkeypatch.setitem(sessions_mod._DISCOVER, "codex", lambda: [])


@pytest.fixture
def store():
    return SessionStore(FakeCtx())


@pytest.fixture
def client(store):
    app = routes_mod.build_routes(store)
    return TestClient(app)


def test_list_sessions_sorted_by_updated_at_desc(client):
    resp = client.get("/agent-sessions", params={"type": "claude"})
    assert resp.status_code == 200
    ids = [s["session_id"] for s in resp.json()]
    assert ids == ["aaa-1", "bbb-2"]


def test_list_sessions_unknown_type_returns_empty(client):
    resp = client.get("/agent-sessions", params={"type": "gemini"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_hide_session_removes_it_from_listing(client):
    resp = client.delete("/agent-sessions/aaa-1", params={"type": "claude"})
    assert resp.status_code == 200
    assert resp.json() == {"success": True, "id": "aaa-1", "visible": False}

    remaining = client.get("/agent-sessions", params={"type": "claude"}).json()
    assert [s["session_id"] for s in remaining] == ["bbb-2"]


def test_restore_hidden_session_brings_it_back(client):
    client.delete("/agent-sessions/aaa-1", params={"type": "claude"})
    resp = client.delete("/agent-sessions/aaa-1", params={"type": "claude", "restore": 1})
    assert resp.json()["visible"] is True

    remaining = client.get("/agent-sessions", params={"type": "claude"}).json()
    assert {s["session_id"] for s in remaining} == {"aaa-1", "bbb-2"}


def test_hidden_session_scoped_per_type(store):
    # Hiding "aaa-1" under claude must not affect a same-id session of another type.
    store.hide_session("claude", "aaa-1")
    sessions_mod._DISCOVER["codex"] = lambda: [
        {"session_id": "aaa-1", "name": None, "created_at": 1.0, "updated_at": 1.0},
    ]
    assert [s["session_id"] for s in store.list_sessions("codex")] == ["aaa-1"]


def test_rename_overrides_the_transcript_derived_name(client):
    resp = client.put("/agent-sessions/aaa-1", params={"type": "claude"}, json={"name": "Rotacao de chaves"})
    assert resp.status_code == 200
    assert resp.json() == {"success": True, "id": "aaa-1", "name": "Rotacao de chaves"}

    sessions = client.get("/agent-sessions", params={"type": "claude"}).json()
    renamed = next(s for s in sessions if s["session_id"] == "aaa-1")
    assert renamed["name"] == "Rotacao de chaves"
    # The other session, never renamed, still shows its transcript-derived name.
    other = next(s for s in sessions if s["session_id"] == "bbb-2")
    assert other["name"] == "add feature"


def test_rename_survives_repeated_discovery_calls(client, store):
    # Regression for the reported bug: the transcript-derived name must not
    # win back the slot on a later re-fetch (e.g. the flyout re-opening).
    store.rename_session("claude", "aaa-1", "Rotacao de chaves")
    for _ in range(3):
        sessions = client.get("/agent-sessions", params={"type": "claude"}).json()
        renamed = next(s for s in sessions if s["session_id"] == "aaa-1")
        assert renamed["name"] == "Rotacao de chaves"


def test_rename_scoped_per_type(store):
    sessions_mod._DISCOVER["codex"] = lambda: [
        {"session_id": "aaa-1", "name": "codex transcript name", "created_at": 1.0, "updated_at": 1.0},
    ]
    store.rename_session("claude", "aaa-1", "Rotacao de chaves")
    assert store.list_sessions("claude")[0]["name"] == "Rotacao de chaves"
    assert store.list_sessions("codex")[0]["name"] == "codex transcript name"


def test_rename_unknown_type_rejected(client):
    resp = client.put("/agent-sessions/aaa-1", params={"type": "gemini"}, json={"name": "x"})
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_rename_empty_name_rejected(client):
    resp = client.put("/agent-sessions/aaa-1", params={"type": "claude"}, json={"name": "   "})
    assert resp.status_code == 200
    assert resp.json()["success"] is False
    sessions = client.get("/agent-sessions", params={"type": "claude"}).json()
    renamed = next(s for s in sessions if s["session_id"] == "aaa-1")
    assert renamed["name"] == "fix the bug"


def test_rename_does_not_unhide_a_hidden_session(client):
    client.delete("/agent-sessions/aaa-1", params={"type": "claude"})
    client.put("/agent-sessions/aaa-1", params={"type": "claude"}, json={"name": "Rotacao de chaves"})
    remaining = client.get("/agent-sessions", params={"type": "claude"}).json()
    assert [s["session_id"] for s in remaining] == ["bbb-2"]


# --- pagination envelope (GET /agent-sessions?limit=...) ----------------
# Kanban card 4025bf3b-9510-8124-9a9c-f8bdb1f9ae47: without ``limit`` the
# response MUST stay the bare array above (byte-compatible with today's
# TerminalWindow.jsx/MobileApp.jsx callers) — ``limit`` opts into the new
# {sessions, total, has_more} envelope.

PAGINATION_SESSIONS = [
    {"session_id": f"s-{i}", "name": f"session {i}", "created_at": float(i), "updated_at": float(100 - i)}
    for i in range(10)
]


def test_no_limit_still_returns_a_bare_array(client):
    resp = client.get("/agent-sessions", params={"type": "claude"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_limit_returns_envelope_with_total_and_has_more(client, store, monkeypatch):
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(PAGINATION_SESSIONS))
    resp = client.get("/agent-sessions", params={"type": "claude", "limit": 3})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"sessions", "total", "has_more"}
    assert body["total"] == 10
    assert body["has_more"] is True
    assert len(body["sessions"]) == 3
    # Sorted by updated_at desc: session 0 has the highest updated_at (100).
    assert [s["session_id"] for s in body["sessions"]] == ["s-0", "s-1", "s-2"]


def test_limit_last_page_has_more_false(client, monkeypatch):
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(PAGINATION_SESSIONS))
    resp = client.get("/agent-sessions", params={"type": "claude", "limit": 20})
    body = resp.json()
    assert body["total"] == 10
    assert body["has_more"] is False
    assert len(body["sessions"]) == 10


def test_before_cursor_pages_through_without_overlap(client, monkeypatch):
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(PAGINATION_SESSIONS))
    page1 = client.get("/agent-sessions", params={"type": "claude", "limit": 4}).json()
    assert [s["session_id"] for s in page1["sessions"]] == ["s-0", "s-1", "s-2", "s-3"]

    last_updated_at = page1["sessions"][-1]["updated_at"]
    page2 = client.get(
        "/agent-sessions",
        params={"type": "claude", "limit": 4, "before": last_updated_at},
    ).json()
    assert [s["session_id"] for s in page2["sessions"]] == ["s-4", "s-5", "s-6", "s-7"]
    assert page2["has_more"] is True

    page3 = client.get(
        "/agent-sessions",
        params={"type": "claude", "limit": 4, "before": page2["sessions"][-1]["updated_at"]},
    ).json()
    assert [s["session_id"] for s in page3["sessions"]] == ["s-8", "s-9"]
    assert page3["has_more"] is False


def test_hidden_sessions_are_dropped_before_slicing_not_after(client, store, monkeypatch):
    # Hiding one session must not shrink the page below `limit` just
    # because a hidden row would otherwise have occupied a slot in it.
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(PAGINATION_SESSIONS))
    store.hide_session("claude", "s-1")
    resp = client.get("/agent-sessions", params={"type": "claude", "limit": 3})
    body = resp.json()
    assert len(body["sessions"]) == 3
    assert "s-1" not in [s["session_id"] for s in body["sessions"]]
    assert body["total"] == 9


def test_override_name_wins_even_though_it_is_applied_after_slicing(client, store, monkeypatch):
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(PAGINATION_SESSIONS))
    store.rename_session("claude", "s-0", "Rotacao de chaves")
    resp = client.get("/agent-sessions", params={"type": "claude", "limit": 2})
    renamed = next(s for s in resp.json()["sessions"] if s["session_id"] == "s-0")
    assert renamed["name"] == "Rotacao de chaves"


def test_name_resolution_call_count_equals_page_size_not_total(store, monkeypatch):
    # The whole point of this fix: paginate the EXPENSIVE name resolution,
    # not just the response. A page of 3 must resolve exactly 3 names, even
    # when there are 10 claude sessions carrying a `path` to resolve from.
    discovered = [
        {"session_id": f"c-{i}", "name": None, "created_at": float(i),
         "updated_at": float(100 - i), "path": f"/fake/c-{i}.jsonl"}
        for i in range(10)
    ]
    monkeypatch.setitem(sessions_mod._DISCOVER, "claude", lambda: list(discovered))

    calls = []

    def fake_first_user_message(path, max_len=60):
        calls.append(path)
        return f"name for {path}"

    monkeypatch.setattr(sessions_mod, "_first_user_message", fake_first_user_message)
    sessions_mod._name_cache.clear()

    page, total, has_more = store.list_sessions("claude", limit=3)
    assert total == 10
    assert has_more is True
    assert len(calls) == 3
    assert len(page) == 3


def test_antigravity_discovers_documented_last_conversation_cache(tmp_path, monkeypatch):
    cache_dir = tmp_path / ".gemini" / "antigravity-cli" / "cache"
    cache_dir.mkdir(parents=True)
    (cache_dir / "last_conversations.json").write_text(json.dumps({
        "/work/alpha": "conv-alpha",
        "/work/beta": "conv-beta",
        "/other/alpha-clone": "conv-alpha",
        "/work/invalid": 123,
    }))
    monkeypatch.setenv("HOME", str(tmp_path))

    discovered = sessions_mod._antigravity_sessions()

    assert [(s["session_id"], s["name"]) for s in discovered] == [
        ("conv-alpha", "alpha"),
        ("conv-beta", "beta"),
    ]


def test_antigravity_invalid_or_missing_cache_is_empty(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    assert sessions_mod._antigravity_sessions() == []
    cache_dir = tmp_path / ".gemini" / "antigravity-cli" / "cache"
    cache_dir.mkdir(parents=True)
    (cache_dir / "last_conversations.json").write_text("not-json")
    assert sessions_mod._antigravity_sessions() == []


def test_get_clis_returns_all_six_managed_clis_with_insecure_flags(client):
    resp = client.get("/clis")
    assert resp.status_code == 200
    items = {c["type"]: c for c in resp.json()}
    assert set(items.keys()) == {"claude", "codex", "copilot", "cursor", "antigravity", "opencode"}
    assert items["antigravity"]["command"] == "agy"
    assert items["antigravity"]["insecure_flag"] == "--dangerously-skip-permissions"
    assert items["antigravity"]["resume_flag"] == "--conversation"
    assert items["antigravity"]["supports_insecure"] is True
    assert items["opencode"]["command"] == "opencode"
    assert items["opencode"]["insecure_flag"] == "--auto"
    assert items["opencode"]["resume_flag"] == "--session"
    assert items["opencode"]["supports_insecure"] is True


def test_build_command_route_supports_antigravity_and_claude(client):
    resp = client.post("/build-command", json={
        "type": "antigravity",
        "resume_session_id": "conv-123",
        "is_insecure": True,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["command"] == "agy --conversation conv-123 --dangerously-skip-permissions"
    assert body["session_id"] == "conv-123"
    assert body["insecure"] is True

    resp_secure = client.post("/build-command", json={
        "type": "antigravity",
        "resume_session_id": "conv-123",
        "is_insecure": False,
    })
    assert resp_secure.json()["command"] == "agy --conversation conv-123"
    assert resp_secure.json()["insecure"] is False


def test_clis_command_helpers_toggle_and_extract_session_id():
    cmd = clis_mod.set_command_insecure("agy --conversation conv-1", "antigravity", True)
    assert cmd == "agy --conversation conv-1 --dangerously-skip-permissions"
    assert clis_mod.is_insecure_command(cmd, "antigravity") is True
    assert clis_mod.extract_agent_session_id(cmd) == "conv-1"

    secure = clis_mod.set_command_insecure(cmd, "antigravity", False)
    assert secure == "agy --conversation conv-1"
    assert clis_mod.is_insecure_command(secure, "antigravity") is False


def _make_opencode_db(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE session (id text PRIMARY KEY, parent_id text, title text NOT NULL, "
        "time_created integer NOT NULL, time_updated integer NOT NULL, time_archived integer)"
    )
    conn.executemany("INSERT INTO session VALUES (?,?,?,?,?,?)", rows)
    conn.commit()
    conn.close()


def test_opencode_discovers_sessions_from_sqlite_skipping_children_and_archived(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path))
    _make_opencode_db(tmp_path / "opencode" / "opencode.db", [
        ("ses_top", None, "Fix the bug", 1_700_000_000_000, 1_700_000_500_000, None),
        ("ses_child", "ses_top", "subagent run", 1_700_000_100_000, 1_700_000_200_000, None),
        ("ses_archived", None, "old", 1_600_000_000_000, 1_600_000_000_000, 1_600_000_100_000),
    ])
    discovered = sessions_mod._opencode_sessions()
    assert discovered == [{
        "session_id": "ses_top",
        "name": "Fix the bug",
        "created_at": 1_700_000_000.0,
        "updated_at": 1_700_000_500.0,
    }]


def test_opencode_missing_db_or_data_home_default_is_empty(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path))
    assert sessions_mod._opencode_sessions() == []
    monkeypatch.delenv("XDG_DATA_HOME")
    monkeypatch.setenv("HOME", str(tmp_path))
    _make_opencode_db(tmp_path / ".local" / "share" / "opencode" / "opencode.db", [
        ("ses_home", None, "from HOME", 1_000, 2_000, None),
    ])
    assert [s["session_id"] for s in sessions_mod._opencode_sessions()] == ["ses_home"]
    assert "opencode" in sessions_mod.AGENT_TYPES


def test_build_command_supports_opencode(client):
    resp = client.post("/build-command", json={
        "type": "opencode", "resume_session_id": "ses_abc", "is_insecure": True,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["command"] == "opencode --session ses_abc --auto"
    assert body["insecure"] is True
    assert body["session_id"] == "ses_abc"
    fresh = client.post("/build-command", json={"type": "opencode"}).json()
    assert fresh["command"] == "opencode"
    assert clis_mod.extract_agent_session_id("opencode --session ses_abc --auto") == "ses_abc"
    secure = clis_mod.set_command_insecure("opencode --session ses_abc --auto", "opencode", False)
    assert secure == "opencode --session ses_abc"
