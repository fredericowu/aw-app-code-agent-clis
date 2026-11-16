"""Canonical coding-agent CLI catalog and command/flag management.

Decouples CLI-specific launch commands, session-resume flags, and
``secure``/``insecure`` permission-bypass flags out of ``aw-workspace`` core
into ``aw-app-code-agent-clis``.
"""

from __future__ import annotations

import shlex
import uuid

CLI_DEFINITIONS: tuple[dict, ...] = (
    {
        "type": "claude",
        "label": "Claude",
        "command": "claude",
        "color": "#d97706",
        "icon": "bolt",
        "insecure_flag": "--dangerously-skip-permissions",
        "supports_insecure": True,
        "resume_flag": "--resume",
        "resume_subcommand": None,
        "supports_session_id": True,
        "default_insecure_on_create": True,
    },
    {
        "type": "codex",
        "label": "Codex",
        "command": "codex",
        "color": "#0ea5e9",
        "icon": "codex",
        "insecure_flag": "--dangerously-bypass-approvals-and-sandbox",
        "supports_insecure": True,
        "resume_flag": None,
        "resume_subcommand": "resume",
        "supports_session_id": False,
        "default_insecure_on_create": False,
    },
    {
        "type": "copilot",
        "label": "Copilot",
        "command": "copilot",
        "color": "#2ea043",
        "icon": "copilot",
        "insecure_flag": "--allow-all",
        "supports_insecure": True,
        "resume_flag": "--resume",
        "resume_subcommand": None,
        "supports_session_id": False,
        "default_insecure_on_create": False,
    },
    {
        "type": "cursor",
        "label": "Cursor",
        "command": "cursor-agent",
        "color": "#7c3aed",
        "icon": "cursor",
        "insecure_flag": "--approve-mcps --yolo",
        "supports_insecure": True,
        "resume_flag": "--resume",
        "resume_subcommand": None,
        "supports_session_id": False,
        "default_insecure_on_create": False,
    },
    {
        "type": "antigravity",
        "label": "Antigravity",
        "command": "agy",
        "color": "#4285f4",
        "icon": "antigravity",
        "insecure_flag": "--dangerously-skip-permissions",
        "supports_insecure": True,
        "resume_flag": "--conversation",
        "resume_subcommand": None,
        "supports_session_id": False,
        "default_insecure_on_create": False,
    },
    {
        "type": "opencode",
        "label": "OpenCode",
        "command": "opencode",
        "color": "#14b8a6",
        "icon": "opencode",
        "insecure_flag": "--auto",
        "supports_insecure": True,
        "resume_flag": "--session",
        "resume_subcommand": None,
        "supports_session_id": False,
        "default_insecure_on_create": False,
    },
)

_CLI_BY_TYPE: dict[str, dict] = {cli["type"]: cli for cli in CLI_DEFINITIONS}

# Includes legacy "gemini" flag for compatibility with existing terminal commands.
_INSECURE_FLAGS: dict[str, str] = {
    **{cli["type"]: cli["insecure_flag"] for cli in CLI_DEFINITIONS if cli.get("insecure_flag")},
    "gemini": "--yolo",
}


def list_clis() -> list[dict]:
    """Return a copy of all managed coding-agent CLI definitions."""
    return [dict(cli) for cli in CLI_DEFINITIONS]


def get_cli(agent_type: str) -> dict | None:
    cli = _CLI_BY_TYPE.get(agent_type)
    return dict(cli) if cli is not None else None


def insecure_flags() -> dict[str, str]:
    return dict(_INSECURE_FLAGS)


def is_insecure_command(command: str | None, session_type: str) -> bool:
    flag = _INSECURE_FLAGS.get(session_type)
    return bool(command and flag and flag in command)


def set_command_insecure(command: str | None, session_type: str, insecure: bool) -> str | None:
    """Add or remove ``session_type``'s insecure flag from ``command``."""
    flag = _INSECURE_FLAGS.get(session_type)
    if not command or not flag:
        return command
    has_flag = flag in command
    if insecure and not has_flag:
        return f"{command} {flag}"
    if not insecure and has_flag:
        return " ".join(command.replace(flag, "").split())
    return command


def extract_resume_argument(command: str | None) -> str | None:
    """Extract a CLI's explicit resume/conversation id from a command."""
    if not command:
        return None
    try:
        parts = shlex.split(command)
    except ValueError:
        parts = command.split()
    for i, part in enumerate(parts):
        if part in ("--resume", "--conversation", "--session") and i + 1 < len(parts):
            return parts[i + 1]
        if part == "resume" and i > 0 and parts[i - 1] == "codex" and i + 1 < len(parts):
            return parts[i + 1]
    return None


def extract_agent_session_id(command: str | None) -> str | None:
    """Extract an agent conversation id from resume/start command syntax."""
    resume_arg = extract_resume_argument(command)
    if resume_arg:
        return resume_arg
    if not command:
        return None
    try:
        parts = shlex.split(command)
    except ValueError:
        parts = command.split()
    for i, part in enumerate(parts):
        if part == "--session-id" and i + 1 < len(parts):
            return parts[i + 1]
    return None


def build_agent_command(
    agent_type: str,
    resume_session_id: str | None = None,
    is_insecure: bool = False,
    session_id: str | None = None,
) -> tuple[str, str | None]:
    """Build the launch or resume command for ``agent_type``.

    Returns ``(command, resolved_session_id)``.
    """
    cli = _CLI_BY_TYPE.get(agent_type)
    if cli is None:
        if agent_type == "gemini":
            cmd = "gemini"
            resolved_id = resume_session_id or session_id or str(uuid.uuid4())
            if resume_session_id:
                cmd += f" --resume {resume_session_id}"
            else:
                cmd += f" --session-id {resolved_id}"
            if is_insecure:
                cmd += " --yolo"
            return cmd, resolved_id
        return agent_type, resume_session_id or session_id

    cmd = cli["command"]
    resolved_id = resume_session_id
    if resume_session_id:
        if cli.get("resume_subcommand"):
            cmd += f" {cli['resume_subcommand']} {resume_session_id}"
        elif cli.get("resume_flag"):
            cmd += f" {cli['resume_flag']} {resume_session_id}"
    elif cli.get("supports_session_id"):
        resolved_id = session_id or str(uuid.uuid4())
        cmd += f" --session-id {resolved_id}"

    if is_insecure and cli.get("insecure_flag"):
        cmd += f" {cli['insecure_flag']}"
    return cmd, resolved_id
