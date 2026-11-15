// Integrated-mode entrypoint — dynamic-imported by aw-workspace-ui's
// loadComponentPlugin() (src/apps/loadPlugin.js) once this app is installed
// with "ui:code" granted. Built by `npm run build` -> ui/dist/code-agent-clis.js,
// referenced from aw-app.json's contributes.frontend.bundle.
//
// register(host) is the ONE required export. `host` is the APP-SCOPED handle
// from aw-workspace-ui's hostForApp() (src/apps/pluginHost.js) — host.React /
// host.h are the shared instances (never import your own React), host.app.*
// are this app's own `/api/apps/code-agent-clis/...` helpers, host.registerSlot
// is how this fills the `core.nav` slot aw-workspace-ui renders (see App.jsx).
//
// JSX in this file compiles to host.h(...)/host.React.Fragment calls, not
// react's own createElement — see vite.config.js's esbuild.jsxFactory. Every
// component below is a plain function DECLARED INSIDE register(host) so it
// closes over `host` without importing react itself (ADR "one shared React
// instance" — external: ['react','react-dom'] in vite.config.js).
//
// This app owns both the Agents nav menu (launch/resume a claude/codex/
// copilot/cursor/antigravity session) and the agent CLI command/session/
// insecure-mode management layer (`window.__awCodeAgentClis`), using the
// terminal management API exposed by `aw-app-terminal` (`window.__awTerminal`).

import { createClient } from './client.js';
import {
  AGENT_CLIS,
  ANTIGRAVITY_AGENT,
  buildAgentCommand,
  getAgentCli,
  getInsecureTooltip,
  supportsInsecureMode,
  withManagedAgentClis,
} from './clis.js';

const SLUG = 'code-agent-clis'; // must match aw-app.json's "id"

// The CLI types this app installs and can discover on-disk sessions for
// (routes.py/sessions.py AGENT_TYPES) — kept in sync manually; gemini isn't
// one of them (this app never installed/managed a gemini CLI).
const AGENT_TYPES_WITH_SESSIONS = new Set(['claude', 'codex', 'copilot', 'cursor', 'antigravity']);

// Keeps the expensive per-page name resolution bounded (sessions.py's
// _first_user_message read) regardless of how many sessions exist on disk
// — see Kanban card 4025bf3b-9510-8124-9a9c-f8bdb1f9ae47.
const PAGE_SIZE = 50;

export function register(host) {
  // client.js composes these itself as fetchImpl(apiUrl(path)) — apiUrl
  // already returns the fully `/api/apps/<slug>`-prefixed path, so fetchImpl
  // must be the RAW fetch (host.sdk.api.fetch), not host.app.fetch.
  const client = createClient({
    apiUrl: host.app.apiUrl,
    fetchImpl: host.sdk.api.fetch,
  });

  // Terminal management bridge: prefers `window.__awTerminal` contributed by
  // aw-app-terminal (a required dependency of this app), falling back to
  // direct `/api/terminals` calls if aw-app-terminal hasn't registered yet.
  function getTerminalBridge() {
    if (typeof window !== 'undefined' && window.__awTerminal) {
      return window.__awTerminal;
    }
    return {
      async createTerminal(options) {
        const res = await host.sdk.api.fetch('/api/terminals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options || {}),
        });
        return res.json();
      },
      async restartTerminal(id, options) {
        const res = await host.sdk.api.fetch(`/api/terminals/${encodeURIComponent(id)}/restart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options || {}),
        });
        return res.json();
      },
      openTerminal(id) {
        if (typeof window !== 'undefined' && window.__awOpenTerminal) {
          window.__awOpenTerminal(id);
          return true;
        }
        return false;
      },
    };
  }

  async function launchAgentTerminal(agentType, resumeSessionId = null, resumeLabel = null, options = {}) {
    const configured = options.aiAgents || [];
    const agentDef = configured.find((a) => a.type === agentType) || getAgentCli(agentType) || (
      agentType === 'antigravity' ? { label: 'Antigravity', command: 'agy' } : null
    );
    const label = agentDef?.label || agentType;
    const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `sess-${Date.now()}`;
    let name;
    let command;
    if (resumeSessionId) {
      name = resumeLabel
        ? (resumeLabel.length > 60 ? resumeLabel.slice(0, 57) + '…' : resumeLabel)
        : label;
      command = buildAgentCommand(agentType, resumeSessionId, !!options.isInsecure, name, null, agentDef?.command);
    } else {
      name = `${label} - ${sessionId.slice(-4)}`;
      const defaultInsecure = options.isInsecure !== undefined
        ? !!options.isInsecure
        : !!(getAgentCli(agentType)?.defaultInsecureOnCreate);
      command = buildAgentCommand(agentType, null, defaultInsecure, name, sessionId, agentDef?.command);
    }
    const bridge = getTerminalBridge();
    const created = await bridge.createTerminal({ name, command, type: agentType });
    if (created?.id && options.openWindow !== false) {
      bridge.openTerminal(created.id);
    }
    return { ...created, name, command, agentSessionId: resumeSessionId || sessionId };
  }

  if (typeof window !== 'undefined') {
    const api = {
      slug: SLUG,
      clis: AGENT_CLIS,
      antigravityAgent: ANTIGRAVITY_AGENT,
      getCli: getAgentCli,
      withManagedAgentClis,
      supportsInsecureMode,
      getInsecureTooltip,
      buildAgentCommand,
      launchAgentTerminal,
      listClis: client.listClis,
      buildCommandRemote: client.buildCommand,
      listSessions: client.listSessions,
      hideSession: client.hideSession,
    };
    window.__awCodeAgentClis = api;
    window.dispatchEvent(new CustomEvent('aw-code-agent-clis-ready', { detail: api }));
    if (typeof host.onDispose === 'function') {
      host.onDispose(() => {
        if (window.__awCodeAgentClis === api) delete window.__awCodeAgentClis;
      });
    }
  }

  const { useState, useRef, useCallback, useEffect } = host.React;
  const { createPortal } = host.ReactDOM;

  const ICONS = {
    bolt: (color) => (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
      </svg>
    ),
    copilot: (color) => (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
      </svg>
    ),
    cursor: (color) => (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
        <path d="M4 0l16 12.279-6.985 1.205 2.854 10.516L4 0z" />
      </svg>
    ),
    codex: (color) => (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color }}>
        <path d="M12 3l7.5 4.25v8.5L12 20l-7.5-4.25v-8.5L12 3z" />
        <path d="M8.5 9.5L12 7.5l3.5 2v5L12 16.5l-3.5-2v-5z" />
      </svg>
    ),
    antigravity: () => (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.5c.7 5.3 4.2 8.8 9.5 9.5-5.3.7-8.8 4.2-9.5 9.5-.7-5.3-4.2-8.8-9.5-9.5 5.3-.7 8.8-4.2 9.5-9.5Z" fill="#4285F4" />
        <path d="M12 2.5c.7 5.3 4.2 8.8 9.5 9.5H12V2.5Z" fill="#34A853" />
        <path d="M12 12h9.5c-5.3.7-8.8 4.2-9.5 9.5V12Z" fill="#FBBC04" />
        <path d="M2.5 12H12v9.5c-.7-5.3-4.2-8.8-9.5-9.5Z" fill="#EA4335" />
      </svg>
    ),
  };

  function AgentIcon({ iconName, color }) {
    const render = ICONS[iconName];
    if (render) return render(color);
    return (
      <span
        className="w-3 h-3 shrink-0 rounded-sm text-[8px] font-bold flex items-center justify-center leading-none"
        style={{ backgroundColor: color || '#888', color: '#fff' }}
      >
        {(iconName || '?')[0].toUpperCase()}
      </span>
    );
  }

  function LauncherRow({
    launcher,
    runningAgentSessionMap,
    liveAgentSessions,
    onLaunch,
    onResume,
    onOpenRunningAgentSession,
    onFlyoutEnter,
    onFlyoutLeave,
  }) {
    const [flyoutOpen, setFlyoutOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [sessions, setSessions] = useState(null);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const rowRef = useRef(null);
    const closeTimer = useRef(null);
    const reportedOpenRef = useRef(false);

    const supportsFlyout = AGENT_TYPES_WITH_SESSIONS.has(launcher.key);

    const flyoutOpenRef = useRef(false);

    const reportOpen = useCallback(() => {
      if (reportedOpenRef.current) return;
      reportedOpenRef.current = true;
      onFlyoutEnter?.();
    }, [onFlyoutEnter]);

    const reportClose = useCallback(() => {
      if (!reportedOpenRef.current) return;
      reportedOpenRef.current = false;
      onFlyoutLeave?.();
    }, [onFlyoutLeave]);

    const cancelClose = useCallback(() => {
      clearTimeout(closeTimer.current);
    }, []);

    const scheduleClose = useCallback(() => {
      cancelClose();
      closeTimer.current = setTimeout(() => {
        flyoutOpenRef.current = false;
        setFlyoutOpen(false);
        reportClose();
      }, 150);
    }, [cancelClose, reportClose]);

    useEffect(() => () => {
      clearTimeout(closeTimer.current);
      reportClose();
    }, [reportClose]);

    const closeFlyout = useCallback(() => {
      cancelClose();
      flyoutOpenRef.current = false;
      setFlyoutOpen(false);
      reportClose();
    }, [cancelClose, reportClose]);

    const openFlyout = useCallback(() => {
      if (!supportsFlyout) return;
      cancelClose();
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.top, left: rect.right + 4 });
      flyoutOpenRef.current = true;
      setFlyoutOpen(true);
      reportOpen();
      if (!loading) {
        setLoading(true);
        setError(null);
        client.listSessions(launcher.key, { limit: PAGE_SIZE })
          .then(({ sessions: page, total: t, hasMore: hm }) => {
            setSessions(page);
            setTotal(t);
            setHasMore(hm);
          })
          .catch((e) => setError(e.message || 'Failed to load'))
          .finally(() => setLoading(false));
      }
    }, [supportsFlyout, cancelClose, reportOpen, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadMore = useCallback(() => {
      if (loadingMore || !hasMore || !sessions || sessions.length === 0) return;
      setLoadingMore(true);
      const cursor = sessions[sessions.length - 1].updated_at;
      client.listSessions(launcher.key, { limit: PAGE_SIZE, before: cursor })
        .then(({ sessions: page, total: t, hasMore: hm }) => {
          setSessions((prev) => {
            const seen = new Set((prev || []).map((s) => s.session_id));
            return [...(prev || []), ...page.filter((s) => !seen.has(s.session_id))];
          });
          setTotal(t);
          setHasMore(hm);
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false));
    }, [loadingMore, hasMore, sessions, launcher.key]); // eslint-disable-line react-hooks/exhaustive-deps

    const onSessionsScroll = useCallback((e) => {
      if (!hasMore || loadingMore) return;
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadMore();
    }, [hasMore, loadingMore, loadMore]);

    const knownSessionIds = new Set((sessions || []).map(s => s.session_id));
    const undetectedLive = (liveAgentSessions || []).filter(s =>
      s.type === launcher.key && s.alive &&
      (!s.agent_session_id || !knownSessionIds.has(s.agent_session_id))
    );

    const sortedSessions = [...(sessions || [])].sort((a, b) => {
      const aRunning = !!runningAgentSessionMap[`${launcher.key}:${a.session_id}`];
      const bRunning = !!runningAgentSessionMap[`${launcher.key}:${b.session_id}`];
      if (aRunning !== bRunning) return aRunning ? -1 : 1;

      const aTs = (a.updated_at || a.created_at || 0) * 1000;
      const bTs = (b.updated_at || b.created_at || 0) * 1000;
      if (aTs !== bTs) return bTs - aTs;

      const aName = (a.name || '(untitled)').toLowerCase();
      const bName = (b.name || '(untitled)').toLowerCase();
      return aName.localeCompare(bName);
    });

    return (
      <>
        <button
          ref={rowRef}
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleClose}
          onClick={(e) => {
            e.stopPropagation();
            closeFlyout();
            onLaunch();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-left"
        >
          <AgentIcon iconName={launcher.icon} color={launcher.color} />
          <span className="flex-1 text-[13px] text-[var(--color-text-primary)]">{launcher.label}</span>
          {supportsFlyout ? (
            <svg className="w-3 h-3 text-[var(--color-text-muted)] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-[var(--color-accent)] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </button>

        {flyoutOpen && supportsFlyout && createPortal(
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onScroll={onSessionsScroll}
            className="fixed bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl shadow-black/60"
            style={{
              top: pos.top - 5,
              left: pos.left,
              zIndex: 99999,
              width: 320,
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFlyout();
                onLaunch();
              }}
              title="New session"
              aria-label={`Start new ${launcher.label} session`}
              className="w-full text-left px-3 py-2 text-xs text-[var(--color-accent)] hover:bg-white/5 border-b border-[var(--color-border)] flex items-center gap-1.5"
            >
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              <span className="font-medium">New Session</span>
              <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">{total}</span>
            </button>

            {loading && (
              <div className="px-3 py-3 text-xs text-[var(--color-text-muted)]">Loading…</div>
            )}
            {error && !loading && (
              <div className="px-3 py-3 text-xs text-[var(--color-danger)]">Failed to load: {error}</div>
            )}
            {!loading && !error && sessions && sessions.length === 0 && undetectedLive.length === 0 && (
              <div className="px-3 py-3 text-xs text-[var(--color-text-muted)]">No previous sessions for this project.</div>
            )}
            {undetectedLive.map((t) => (
              <div
                key={t.id}
                className="group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFlyout();
                    onOpenRunningAgentSession(t.id);
                  }}
                  className="w-full text-left px-3 py-2 pr-9"
                  title={`Open running session "${t.name}" (session ID not yet detected)`}
                >
                  <div className="text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">starting…</div>
                </button>
              </div>
            ))}
            {!loading && !error && sessions && sortedSessions.map((s) => {
              const idSlice = s.session_id ? `${s.session_id.slice(0, 8)}-${s.session_id.slice(9, 13)}…` : '';
              const display = s.name || idSlice || '(untitled)';
              let when = '';
              const tsSrc = s.updated_at
                ? new Date(s.updated_at * 1000)
                : (s.created_at ? new Date(s.created_at * 1000) : null);
              if (tsSrc && !isNaN(tsSrc)) {
                when = `${tsSrc.toLocaleDateString()} ${tsSrc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              }
              const sub = [idSlice, when].filter(Boolean).join(' · ');
              const runningTerminalId = runningAgentSessionMap[`${launcher.key}:${s.session_id}`];
              const hideSession = (e) => {
                e.stopPropagation();
                setSessions((prev) => (prev || []).filter((x) => x.session_id !== s.session_id));
                setTotal((prev) => Math.max(0, prev - 1));
                client.hideSession(launcher.key, s.session_id).catch(() => {});
              };
              return (
                <div
                  key={s.session_id}
                  className="group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFlyout();
                      if (runningTerminalId) {
                        onOpenRunningAgentSession(runningTerminalId);
                      } else {
                        onResume(launcher.key, s.session_id, display);
                      }
                    }}
                    className="w-full text-left px-3 py-2 pr-9"
                    title={`${runningTerminalId ? 'Open' : 'Resume'} "${display}" (${s.session_id})`}
                  >
                    <div className="text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2">
                      {runningTerminalId && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      )}
                      <span className="truncate">{display}</span>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{sub}</div>
                  </button>
                  <button
                    onClick={hideSession}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-danger)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-opacity cursor-pointer"
                    title="Hide from picker (transcript kept on disk)"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {!loading && !error && hasMore && (
              <button
                onClick={(e) => { e.stopPropagation(); loadMore(); }}
                disabled={loadingMore}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-white/5 disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : `Load more (${Math.max(0, total - (sessions?.length || 0))} remaining)`}
              </button>
            )}
          </div>,
          document.body
        )}
      </>
    );
  }

  function AgentsNavSlot({
    aiAgents,
    agentSessions,
    onCreateAgent,
    onToggleAgent,
  }) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef(null);
    const flyoutCountRef = useRef(0);
    const mouseInsideRef = useRef(false);

    const scheduleClose = useCallback(() => {
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        if (!mouseInsideRef.current && flyoutCountRef.current === 0) {
          setOpen(false);
        }
      }, 150);
    }, []);

    const handleEnter = useCallback(() => {
      mouseInsideRef.current = true;
      clearTimeout(closeTimer.current);
      setOpen(true);
    }, []);

    const handleLeave = useCallback(() => {
      mouseInsideRef.current = false;
      scheduleClose();
    }, [scheduleClose]);

    const onFlyoutEnter = useCallback(() => {
      flyoutCountRef.current += 1;
      clearTimeout(closeTimer.current);
    }, []);

    const onFlyoutLeave = useCallback(() => {
      flyoutCountRef.current = Math.max(0, flyoutCountRef.current - 1);
      if (flyoutCountRef.current === 0 && !mouseInsideRef.current) {
        scheduleClose();
      }
    }, [scheduleClose]);

    useEffect(() => () => clearTimeout(closeTimer.current), []);

    // Agent sessions only.
    const totalCount = agentSessions?.length || 0;

    const handleLaunchOrResume = useCallback((type, sessionId = null, label = null) => {
      if (typeof onCreateAgent === 'function') {
        onCreateAgent(type, sessionId, label);
        return;
      }
      launchAgentTerminal(type, sessionId, label, { aiAgents }).catch(() => {});
    }, [onCreateAgent, aiAgents]);

    const handleOpenSession = useCallback((sessionId) => {
      if (typeof onToggleAgent === 'function') {
        onToggleAgent(sessionId);
        return;
      }
      getTerminalBridge().openTerminal(sessionId);
    }, [onToggleAgent]);

    const agentLaunchers = (() => {
      const configured = withManagedAgentClis(aiAgents || []);
      return configured.map((a) => ({
        key: a.type,
        label: a.label || a.type,
        icon: a.icon,
        color: a.color,
        action: () => handleLaunchOrResume(a.type),
      }));
    })();

    const runningAgentSessionMap = {};
    (agentSessions || []).forEach((s) => {
      if (s.type && s.agent_session_id) {
        runningAgentSessionMap[`${s.type}:${s.agent_session_id}`] = s.id;
      }
    });

    const sharedLauncherProps = {
      runningAgentSessionMap,
      liveAgentSessions: agentSessions,
      onOpenRunningAgentSession: (sessionId) => {
        setOpen(false);
        handleOpenSession(sessionId);
      },
      onFlyoutEnter,
      onFlyoutLeave,
    };

    return (
      <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1 text-xs rounded transition-colors cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
        >
          Agents
          {totalCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold px-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
              {totalCount}
            </span>
          )}
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-2 z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl p-2"
            style={{ minWidth: 280, maxWidth: 360 }}
          >
            {agentLaunchers.map((opt) => (
              <LauncherRow
                key={opt.key}
                launcher={opt}
                onLaunch={() => { setOpen(false); opt.action(); }}
                onResume={(type, sessionId, label) => {
                  setOpen(false);
                  handleLaunchOrResume(type, sessionId, label);
                }}
                {...sharedLauncherProps}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  host.registerSlot('core.nav', AgentsNavSlot);
}

export default register;
