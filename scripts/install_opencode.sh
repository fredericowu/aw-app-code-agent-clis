#!/usr/bin/env bash
# Installs OpenCode 1 (the opencode-ai release line) with its official
# installer. That installer resolves the latest version from npm and fetches
# the matching native binary; opencode-ai's npm postinstall fails while
# probing incompatible optional platform packages on this workspace image.
# Symlinks the resulting `opencode` binary into /usr/local/bin (regular
# system PATH — needs sudo since the container's default user is non-root).
# Tracks the latest published version: on every reconcile pass it compares the
# installed version against the npm registry and upgrades only when they
# differ. Idempotent — safe to re-run.
set -euo pipefail

AW_BIN_DIR="${AW_BIN_DIR:-/usr/local/bin}"
AW_HOME="${AW_WORKSPACE_HOME:-$HOME/.aw-workspace}"
OPENCODE_HOME="$AW_HOME/opencode-cli"
OPENCODE_BIN="$OPENCODE_HOME/.opencode/bin/opencode"
mkdir -p "$OPENCODE_HOME"

link_binary() {
  if [ -w "$AW_BIN_DIR" ]; then
    ln -sf "$OPENCODE_BIN" "$AW_BIN_DIR/opencode"
  else
    sudo ln -sf "$OPENCODE_BIN" "$AW_BIN_DIR/opencode"
  fi
}

installed=""
if [ -x "$OPENCODE_BIN" ]; then
  installed="$(HOME="$OPENCODE_HOME" "$OPENCODE_BIN" --version 2>/dev/null || true)"
fi
# Registry lookup failure must not break a working install: fall back to
# "whatever is installed is good enough".
latest="$(curl -fsSL --max-time 10 https://registry.npmjs.org/opencode-ai/latest 2>/dev/null | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' || true)"

if [ -n "$installed" ] && { [ -z "$latest" ] || [ "$installed" = "$latest" ]; }; then
  link_binary
  echo "opencode already installed: $installed"
  exit 0
fi

curl -fsSL https://opencode.ai/install \
  | HOME="$OPENCODE_HOME" bash -s -- --no-modify-path
link_binary

HOME="$OPENCODE_HOME" "$AW_BIN_DIR/opencode" --version
