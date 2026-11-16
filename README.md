# Code Agent CLIs

Code Agent CLIs installs popular coding-agent command-line tools in an AW Workspace and adds a workspace menu for launching and resuming agent sessions.

## What It Does

- Installs Claude Code, Codex, GitHub Copilot CLI, Cursor agent, Google Antigravity CLI (`agy`), and OpenCode (`opencode`, latest `opencode-ai` from npm — kept current on every reconcile).
- Adds an Agents menu to the workspace navigation.
- Tracks agent session history so sessions can be resumed.
- Keeps the installed tools available across workspace restarts.

## Why Use It

Use this app when the workspace should support multiple coding agents from a terminal or from the workspace UI. It is useful for switching between tools, keeping past sessions discoverable, and standardizing the agent CLI setup for a workspace.

## How To Use It

Install the app, then authenticate each CLI from a workspace terminal using that tool's normal login flow. Antigravity supports Google OAuth/keyring sign-in, or a Gemini API key after setting `modelProvider` to `gemini` in `~/.gemini/antigravity-cli/settings.json`. OpenCode: run `opencode auth login` (or `/connect` inside the TUI) to add a provider; its insecure toggle passes `--auto`. After login, use the Agents menu or a terminal to launch and resume sessions.

## What It Delivers

The app turns the workspace into a ready environment for coding-agent work. It removes repeated CLI installation steps and gives users a single place to start or return to agent sessions.
