function xe({ apiUrl: e, fetchImpl: r = fetch }) {
  async function c() {
    const o = await r(e("/clis"));
    if (!o.ok) throw new Error(`GET /clis -> ${o.status}`);
    const i = await o.json();
    return Array.isArray(i) ? i : [];
  }
  async function _(o) {
    const i = await r(e("/build-command"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o || {})
    });
    if (!i.ok) throw new Error(`POST /build-command -> ${i.status}`);
    return i.json();
  }
  async function m(o, { limit: i, before: y } = {}) {
    let I = `type=${encodeURIComponent(o)}`;
    i != null && (I += `&limit=${encodeURIComponent(i)}`), y != null && (I += `&before=${encodeURIComponent(y)}`);
    const M = await r(e(`/agent-sessions?${I}`));
    if (!M.ok) throw new Error(`GET /agent-sessions -> ${M.status}`);
    const p = await M.json();
    return i == null ? Array.isArray(p) ? p : [] : {
      sessions: Array.isArray(p == null ? void 0 : p.sessions) ? p.sessions : [],
      total: typeof (p == null ? void 0 : p.total) == "number" ? p.total : 0,
      hasMore: !!(p != null && p.has_more)
    };
  }
  async function N(o, i, { restore: y = !1 } = {}) {
    const I = `type=${encodeURIComponent(o)}${y ? "&restore=1" : ""}`, M = await r(e(`/agent-sessions/${encodeURIComponent(i)}?${I}`), {
      method: "DELETE"
    });
    if (!M.ok) throw new Error(`DELETE /agent-sessions/${i} -> ${M.status}`);
    return M.json();
  }
  return { listClis: c, buildCommand: _, listSessions: m, hideSession: N };
}
const te = {
  type: "antigravity",
  label: "Antigravity",
  command: "agy",
  color: "#4285f4",
  icon: "antigravity",
  insecureFlag: "--dangerously-skip-permissions",
  supportsInsecure: !0,
  resumeFlag: "--conversation",
  resumeSubcommand: null,
  supportsSessionId: !1,
  defaultInsecureOnCreate: !1
}, ne = {
  type: "opencode",
  label: "OpenCode",
  command: "opencode",
  color: "#14b8a6",
  icon: "opencode",
  insecureFlag: "--auto",
  supportsInsecure: !0,
  resumeFlag: "--session",
  resumeSubcommand: null,
  supportsSessionId: !1,
  defaultInsecureOnCreate: !1
}, ue = [
  {
    type: "claude",
    label: "Claude",
    command: "claude",
    color: "#d97706",
    icon: "bolt",
    insecureFlag: "--dangerously-skip-permissions",
    supportsInsecure: !0,
    resumeFlag: "--resume",
    resumeSubcommand: null,
    supportsSessionId: !0,
    defaultInsecureOnCreate: !0
  },
  {
    type: "codex",
    label: "Codex",
    command: "codex",
    color: "#0ea5e9",
    icon: "codex",
    insecureFlag: "--dangerously-bypass-approvals-and-sandbox",
    supportsInsecure: !0,
    resumeFlag: null,
    resumeSubcommand: "resume",
    supportsSessionId: !1,
    defaultInsecureOnCreate: !1
  },
  {
    type: "copilot",
    label: "Copilot",
    command: "copilot",
    color: "#2ea043",
    icon: "copilot",
    insecureFlag: "--allow-all",
    supportsInsecure: !0,
    resumeFlag: "--resume",
    resumeSubcommand: null,
    supportsSessionId: !1,
    defaultInsecureOnCreate: !1
  },
  {
    type: "cursor",
    label: "Cursor",
    command: "cursor-agent",
    color: "#7c3aed",
    icon: "cursor",
    insecureFlag: "--approve-mcps --yolo",
    supportsInsecure: !0,
    resumeFlag: "--resume",
    resumeSubcommand: null,
    supportsSessionId: !1,
    defaultInsecureOnCreate: !1
  },
  te,
  ne
], de = new Map(ue.map((e) => [e.type, e]));
function D(e) {
  return de.get(e) || null;
}
function ae(e = []) {
  const r = (e || []).filter((c) => c && c.type && c.type !== "terminal").map((c) => {
    const _ = de.get(c.type);
    return _ ? { ..._, ...c } : c;
  });
  for (const c of [te, ne])
    r.some((_) => _.type === c.type) || r.push({ ...c });
  return r;
}
function we(e) {
  if (e === "gemini") return !0;
  const r = D(e);
  return !!(r && r.supportsInsecure && r.insecureFlag);
}
function ve(e, r = !1) {
  return r ? "Insecure mode ON — click to disable" : e === "codex" ? "Click to enable insecure mode (--dangerously-bypass-approvals-and-sandbox)" : e === "gemini" ? "Click to enable insecure mode (--yolo — auto-approve all tools)" : e === "cursor" ? "Click to enable insecure mode (--approve-mcps --yolo)" : e === "copilot" ? "Click to enable insecure mode (--allow-all)" : e === "antigravity" ? "Click to enable insecure mode (--dangerously-skip-permissions)" : e === "opencode" ? "Click to enable insecure mode (--auto — auto-approve permissions not explicitly denied)" : "Click to enable insecure mode (skip all permission checks)";
}
function le() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
function ee(e, r = null, c = !1, _ = null, m = null, N = null) {
  if (e === "gemini") {
    let y = "gemini";
    if (r)
      y += ` --resume ${r}`;
    else {
      const I = m || le();
      y += ` --session-id ${I}`;
    }
    return c && (y += " --yolo"), y;
  }
  const o = D(e);
  if (!o)
    return N || e;
  let i = N || o.command;
  if (r)
    o.resumeSubcommand ? i += ` ${o.resumeSubcommand} ${r}` : o.resumeFlag && (i += ` ${o.resumeFlag} ${r}`);
  else if (o.supportsSessionId) {
    const y = m || le();
    i += ` --session-id ${y}`;
  }
  return c && o.insecureFlag && (i += ` ${o.insecureFlag}`), i;
}
const be = "code-agent-clis", Ce = /* @__PURE__ */ new Set(["claude", "codex", "copilot", "cursor", "antigravity", "opencode"]), ce = 50;
function ke(e) {
  const r = xe({
    apiUrl: e.app.apiUrl,
    fetchImpl: e.sdk.api.fetch
  });
  function c() {
    return typeof window < "u" && window.__awTerminal ? window.__awTerminal : {
      async createTerminal(t) {
        return (await e.sdk.api.fetch("/api/terminals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t || {})
        })).json();
      },
      async restartTerminal(t, a) {
        return (await e.sdk.api.fetch(`/api/terminals/${encodeURIComponent(t)}/restart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(a || {})
        })).json();
      },
      openTerminal(t) {
        return typeof window < "u" && window.__awOpenTerminal ? (window.__awOpenTerminal(t), !0) : !1;
      }
    };
  }
  async function _(t, a = null, f = null, b = {}) {
    var u;
    const l = (b.aiAgents || []).find((T) => T.type === t) || D(t) || (t === "antigravity" ? { label: "Antigravity", command: "agy" } : null), x = (l == null ? void 0 : l.label) || t, g = typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`;
    let w, v;
    if (a)
      w = f ? f.length > 60 ? f.slice(0, 57) + "…" : f : x, v = ee(t, a, !!b.isInsecure, w, null, l == null ? void 0 : l.command);
    else {
      w = `${x} - ${g.slice(-4)}`;
      const T = b.isInsecure !== void 0 ? !!b.isInsecure : !!((u = D(t)) != null && u.defaultInsecureOnCreate);
      v = ee(t, null, T, w, g, l == null ? void 0 : l.command);
    }
    const L = c(), O = await L.createTerminal({ name: w, command: v, type: t });
    return O != null && O.id && b.openWindow !== !1 && L.openTerminal(O.id), { ...O, name: w, command: v, agentSessionId: a || g };
  }
  if (typeof window < "u") {
    const t = {
      slug: be,
      clis: ue,
      antigravityAgent: te,
      opencodeAgent: ne,
      getCli: D,
      withManagedAgentClis: ae,
      supportsInsecureMode: we,
      getInsecureTooltip: ve,
      buildAgentCommand: ee,
      launchAgentTerminal: _,
      listClis: r.listClis,
      buildCommandRemote: r.buildCommand,
      listSessions: r.listSessions,
      hideSession: r.hideSession
    };
    window.__awCodeAgentClis = t, window.dispatchEvent(new CustomEvent("aw-code-agent-clis-ready", { detail: t })), typeof e.onDispose == "function" && e.onDispose(() => {
      window.__awCodeAgentClis === t && delete window.__awCodeAgentClis;
    });
  }
  const { useState: m, useRef: N, useCallback: o, useEffect: i } = e.React, { createPortal: y } = e.ReactDOM, I = {
    bolt: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" })),
    copilot: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" })),
    cursor: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M4 0l16 12.279-6.985 1.205 2.854 10.516L4 0z" })),
    codex: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M12 3l7.5 4.25v8.5L12 20l-7.5-4.25v-8.5L12 3z" }), /* @__PURE__ */ e.h("path", { d: "M8.5 9.5L12 7.5l3.5 2v5L12 16.5l-3.5-2v-5z" })),
    opencode: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M8 7l-5 5 5 5" }), /* @__PURE__ */ e.h("path", { d: "M16 7l5 5-5 5" })),
    antigravity: () => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ e.h("path", { d: "M12 2.5c.7 5.3 4.2 8.8 9.5 9.5-5.3.7-8.8 4.2-9.5 9.5-.7-5.3-4.2-8.8-9.5-9.5 5.3-.7 8.8-4.2 9.5-9.5Z", fill: "#4285F4" }), /* @__PURE__ */ e.h("path", { d: "M12 2.5c.7 5.3 4.2 8.8 9.5 9.5H12V2.5Z", fill: "#34A853" }), /* @__PURE__ */ e.h("path", { d: "M12 12h9.5c-5.3.7-8.8 4.2-9.5 9.5V12Z", fill: "#FBBC04" }), /* @__PURE__ */ e.h("path", { d: "M2.5 12H12v9.5c-.7-5.3-4.2-8.8-9.5-9.5Z", fill: "#EA4335" }))
  };
  function M({ iconName: t, color: a }) {
    const f = I[t];
    return f ? f(a) : /* @__PURE__ */ e.h(
      "span",
      {
        className: "w-3 h-3 shrink-0 rounded-sm text-[8px] font-bold flex items-center justify-center leading-none",
        style: { backgroundColor: a || "#888", color: "#fff" }
      },
      (t || "?")[0].toUpperCase()
    );
  }
  function p({
    launcher: t,
    runningAgentSessionMap: a,
    liveAgentSessions: f,
    onLaunch: b,
    onResume: z,
    onOpenRunningAgentSession: l,
    onFlyoutEnter: x,
    onFlyoutLeave: g
  }) {
    const [w, v] = m(!1), [L, O] = m({ top: 0, left: 0 }), [u, T] = m(null), [j, P] = m(0), [R, H] = m(!1), [E, W] = m(!1), [s, h] = m(!1), [S, G] = m(null), oe = N(null), Y = N(null), Z = N(!1), V = Ce.has(t.key), re = o(() => {
      Z.current || (Z.current = !0, x == null || x());
    }, [x]), U = o(() => {
      Z.current && (Z.current = !1, g == null || g());
    }, [g]), F = o(() => {
      clearTimeout(Y.current);
    }, []), se = o(() => {
      F(), Y.current = setTimeout(() => {
        v(!1), U();
      }, 150);
    }, [F, U]);
    i(() => () => {
      clearTimeout(Y.current), U();
    }, [U]);
    const J = o(() => {
      F(), v(!1), U();
    }, [F, U]), me = o(() => {
      var d;
      if (!V) return;
      F();
      const n = (d = oe.current) == null ? void 0 : d.getBoundingClientRect();
      n && O({ top: n.top, left: n.right + 4 }), v(!0), re(), s || (h(!0), G(null), r.listSessions(t.key, { limit: ce }).then(({ sessions: C, total: A, hasMore: k }) => {
        T(C), P(A), H(k);
      }).catch((C) => G(C.message || "Failed to load")).finally(() => h(!1)));
    }, [V, F, re, s]), q = o(() => {
      if (E || !R || !u || u.length === 0) return;
      W(!0);
      const n = u[u.length - 1].updated_at;
      r.listSessions(t.key, { limit: ce, before: n }).then(({ sessions: d, total: C, hasMore: A }) => {
        T((k) => {
          const B = new Set((k || []).map(($) => $.session_id));
          return [...k || [], ...d.filter(($) => !B.has($.session_id))];
        }), P(C), H(A);
      }).catch(() => {
      }).finally(() => W(!1));
    }, [E, R, u, t.key]), fe = o((n) => {
      if (!R || E) return;
      const d = n.currentTarget;
      d.scrollHeight - d.scrollTop - d.clientHeight < 120 && q();
    }, [R, E, q]), ge = new Set((u || []).map((n) => n.session_id)), ie = (f || []).filter(
      (n) => n.type === t.key && n.alive && (!n.agent_session_id || !ge.has(n.agent_session_id))
    ), he = [...u || []].sort((n, d) => {
      const C = !!a[`${t.key}:${n.session_id}`], A = !!a[`${t.key}:${d.session_id}`];
      if (C !== A) return C ? -1 : 1;
      const k = (n.updated_at || n.created_at || 0) * 1e3, B = (d.updated_at || d.created_at || 0) * 1e3;
      if (k !== B) return B - k;
      const $ = (n.name || "(untitled)").toLowerCase(), K = (d.name || "(untitled)").toLowerCase();
      return $.localeCompare(K);
    });
    return /* @__PURE__ */ e.h(e.React.Fragment, null, /* @__PURE__ */ e.h(
      "button",
      {
        ref: oe,
        onMouseEnter: me,
        onMouseLeave: se,
        onClick: (n) => {
          n.stopPropagation(), J(), b();
        },
        className: "w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-left"
      },
      /* @__PURE__ */ e.h(M, { iconName: t.icon, color: t.color }),
      /* @__PURE__ */ e.h("span", { className: "flex-1 text-[13px] text-[var(--color-text-primary)]" }, t.label),
      V ? /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 text-[var(--color-text-muted)] opacity-60", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M9 6l6 6-6 6" })) : /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 text-[var(--color-accent)] opacity-60", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M12 5v14M5 12h14" }))
    ), w && V && y(
      /* @__PURE__ */ e.h(
        "div",
        {
          onMouseEnter: F,
          onMouseLeave: se,
          onScroll: fe,
          className: "fixed bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl shadow-black/60",
          style: {
            top: L.top - 5,
            left: L.left,
            zIndex: 99999,
            width: 320,
            maxHeight: "70vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ e.h(
          "button",
          {
            onClick: (n) => {
              n.stopPropagation(), J(), b();
            },
            title: "New session",
            "aria-label": `Start new ${t.label} session`,
            className: "w-full text-left px-3 py-2 text-xs text-[var(--color-accent)] hover:bg-white/5 border-b border-[var(--color-border)] flex items-center gap-1.5"
          },
          /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M12 5v14M5 12h14" })),
          /* @__PURE__ */ e.h("span", { className: "font-medium" }, "New Session"),
          /* @__PURE__ */ e.h("span", { className: "ml-auto text-[10px] text-[var(--color-text-muted)]" }, j)
        ),
        s && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-text-muted)]" }, "Loading…"),
        S && !s && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-danger)]" }, "Failed to load: ", S),
        !s && !S && u && u.length === 0 && ie.length === 0 && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-text-muted)]" }, "No previous sessions for this project."),
        ie.map((n) => /* @__PURE__ */ e.h(
          "div",
          {
            key: n.id,
            className: "group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
          },
          /* @__PURE__ */ e.h(
            "button",
            {
              onClick: (d) => {
                d.stopPropagation(), J(), l(n.id);
              },
              className: "w-full text-left px-3 py-2 pr-9",
              title: `Open running session "${n.name}" (session ID not yet detected)`
            },
            /* @__PURE__ */ e.h("div", { className: "text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2" }, /* @__PURE__ */ e.h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0" }), /* @__PURE__ */ e.h("span", { className: "truncate" }, n.name)),
            /* @__PURE__ */ e.h("div", { className: "text-[10px] text-[var(--color-text-muted)] mt-0.5" }, "starting…")
          )
        )),
        !s && !S && u && he.map((n) => {
          const d = n.session_id ? `${n.session_id.slice(0, 8)}-${n.session_id.slice(9, 13)}…` : "", C = n.name || d || "(untitled)";
          let A = "";
          const k = n.updated_at ? new Date(n.updated_at * 1e3) : n.created_at ? new Date(n.created_at * 1e3) : null;
          k && !isNaN(k) && (A = `${k.toLocaleDateString()} ${k.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
          const B = [d, A].filter(Boolean).join(" · "), $ = a[`${t.key}:${n.session_id}`], K = (Q) => {
            Q.stopPropagation(), T((X) => (X || []).filter((ye) => ye.session_id !== n.session_id)), P((X) => Math.max(0, X - 1)), r.hideSession(t.key, n.session_id).catch(() => {
            });
          };
          return /* @__PURE__ */ e.h(
            "div",
            {
              key: n.session_id,
              className: "group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
            },
            /* @__PURE__ */ e.h(
              "button",
              {
                onClick: (Q) => {
                  Q.stopPropagation(), J(), $ ? l($) : z(t.key, n.session_id, C);
                },
                className: "w-full text-left px-3 py-2 pr-9",
                title: `${$ ? "Open" : "Resume"} "${C}" (${n.session_id})`
              },
              /* @__PURE__ */ e.h("div", { className: "text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2" }, $ && /* @__PURE__ */ e.h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0" }), /* @__PURE__ */ e.h("span", { className: "truncate" }, C)),
              /* @__PURE__ */ e.h("div", { className: "text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" }, B)
            ),
            /* @__PURE__ */ e.h(
              "button",
              {
                onClick: K,
                className: "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-danger)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-opacity cursor-pointer",
                title: "Hide from picker (transcript kept on disk)"
              },
              /* @__PURE__ */ e.h("svg", { className: "w-3 h-3", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ e.h("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }), /* @__PURE__ */ e.h("path", { d: "M10 11v6M14 11v6" }), /* @__PURE__ */ e.h("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" }))
            )
          );
        }),
        !s && !S && R && /* @__PURE__ */ e.h(
          "button",
          {
            onClick: (n) => {
              n.stopPropagation(), q();
            },
            disabled: E,
            className: "w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-white/5 disabled:opacity-60"
          },
          E ? "Loading…" : `Load more (${Math.max(0, j - ((u == null ? void 0 : u.length) || 0))} remaining)`
        )
      ),
      document.body
    ));
  }
  function pe({
    aiAgents: t,
    agentSessions: a,
    onCreateAgent: f,
    onToggleAgent: b
  }) {
    const [z, l] = m(!1), x = N(null), g = N(0), w = N(!1), v = o(() => {
      clearTimeout(x.current), x.current = setTimeout(() => {
        !w.current && g.current === 0 && l(!1);
      }, 150);
    }, []), L = o(() => {
      w.current = !0, clearTimeout(x.current), l(!0);
    }, []), O = o(() => {
      w.current = !1, v();
    }, [v]), u = o(() => {
      g.current += 1, clearTimeout(x.current);
    }, []), T = o(() => {
      g.current = Math.max(0, g.current - 1), g.current === 0 && !w.current && v();
    }, [v]);
    i(() => () => clearTimeout(x.current), []);
    const j = (a == null ? void 0 : a.length) || 0, P = o((s, h = null, S = null) => {
      if (typeof f == "function") {
        f(s, h, S);
        return;
      }
      _(s, h, S, { aiAgents: t }).catch(() => {
      });
    }, [f, t]), R = o((s) => {
      if (typeof b == "function") {
        b(s);
        return;
      }
      c().openTerminal(s);
    }, [b]), H = ae(t || []).map((h) => ({
      key: h.type,
      label: h.label || h.type,
      icon: h.icon,
      color: h.color,
      action: () => P(h.type)
    })), E = {};
    (a || []).forEach((s) => {
      s.type && s.agent_session_id && (E[`${s.type}:${s.agent_session_id}`] = s.id);
    });
    const W = {
      runningAgentSessionMap: E,
      liveAgentSessions: a,
      onOpenRunningAgentSession: (s) => {
        l(!1), R(s);
      },
      onFlyoutEnter: u,
      onFlyoutLeave: T
    };
    return /* @__PURE__ */ e.h("div", { className: "relative", onMouseEnter: L, onMouseLeave: O }, /* @__PURE__ */ e.h(
      "button",
      {
        onClick: () => l((s) => !s),
        className: "px-3 py-1 text-xs rounded transition-colors cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
      },
      "Agents",
      j > 0 && /* @__PURE__ */ e.h("span", { className: "ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold px-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)]" }, j)
    ), z && /* @__PURE__ */ e.h(
      "div",
      {
        className: "absolute left-0 top-full mt-2 z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl p-2",
        style: { minWidth: 280, maxWidth: 360 }
      },
      H.map((s) => /* @__PURE__ */ e.h(
        p,
        {
          key: s.key,
          launcher: s,
          onLaunch: () => {
            l(!1), s.action();
          },
          onResume: (h, S, G) => {
            l(!1), P(h, S, G);
          },
          ...W
        }
      ))
    ));
  }
  e.registerSlot("core.nav", pe);
}
export {
  ke as default,
  ke as register
};
