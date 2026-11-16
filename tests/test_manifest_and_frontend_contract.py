"""Release-contract regressions for every CLI managed by this app."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def test_manifest_declares_all_supported_clis_and_real_installers():
    manifest = json.loads((ROOT / "aw-app.json").read_text())
    declared = {
        item["name"]: item["installer"]
        for item in manifest["contributes"]["system_clis"]
    }
    assert declared == {
        "claude": "scripts/install_claude.sh",
        "codex": "scripts/install_codex.sh",
        "copilot": "scripts/install_copilot.sh",
        "cursor-agent": "scripts/install_cursor.sh",
        "agy": "scripts/install_antigravity.sh",
    }
    assert all((ROOT / path).is_file() for path in declared.values())


def test_the_terminal_launcher_is_not_contributed_here_any_more():
    """The plain-terminal row lives in aw-app-terminal now (card 4185bf3b).

    Asserted against the BUILT bundle, not the source: the source still
    *mentions* core's terminal props in comments explaining why it ignores
    them, and comments are what a source-level grep would trip over. The
    bundle is also what actually ships.
    """
    bundle = (ROOT / "ui" / "dist" / "code-agent-clis.js").read_text()
    for gone in ("New Terminal", "No running terminals.", "onCreateTerminal",
                 "onToggleTerminal", "onCloseTerminal", "Close terminal"):
        assert gone not in bundle, f"{gone!r} is still in the shipped bundle"


def test_the_agents_badge_counts_agent_sessions_only():
    # The badge used to be agentSessions + terminals, so "Agents 3" could mean
    # two CLI sessions and a shell. Terminals are aw-app-terminal's row now.
    source = (ROOT / "ui" / "src" / "plugin.jsx").read_text()
    assert "const totalCount = agentSessions?.length || 0;" in source
    assert "(terminals?.length || 0)" not in source


def test_manifest_requires_the_terminal_app():
    manifest = json.loads((ROOT / "aw-app.json").read_text())
    deps = manifest["dependencies"]["apps"]
    terminal = next((d for d in deps if d["id"] == "terminal"), None)
    assert terminal is not None, "the Terminal launcher moved to aw-app-terminal — declare it"
    # required: a workspace that installs this app must still get a terminal
    # launcher. The reconciler installs required deps first and keeps them
    # loaded (src/apps/reconciler.py).
    assert terminal["required"] is True
    assert terminal["version"].startswith(">=")
    assert terminal.get("reason")


def test_frontend_bundle_keeps_existing_agents_and_adds_antigravity():
    source = (ROOT / "ui" / "src" / "plugin.jsx").read_text()
    bundle = (ROOT / "ui" / "dist" / "code-agent-clis.js").read_text()
    for agent_type in ("claude", "codex", "copilot", "cursor", "antigravity"):
        assert f"'{agent_type}'" in source
        assert agent_type in bundle
    assert "Antigravity" in source
    assert "Antigravity" in bundle
    assert "agy" in source
    assert "agy" in bundle
    assert "__awCodeAgentClis" in bundle
    assert "__awTerminal" in bundle
    assert "--dangerously-skip-permissions" in bundle
    assert "--conversation" in bundle
