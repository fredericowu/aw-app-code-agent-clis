function ye({ apiUrl: e, fetchImpl: r = fetch }) {
  async function d() {
    const o = await r(e("/clis"));
    if (!o.ok) throw new Error(`GET /clis -> ${o.status}`);
    const i = await o.json();
    return Array.isArray(i) ? i : [];
  }
  async function E(o) {
    const i = await r(e("/build-command"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o || {})
    });
    if (!i.ok) throw new Error(`POST /build-command -> ${i.status}`);
    return i.json();
  }
  async function m(o, { limit: i, before: y } = {}) {
    let $ = `type=${encodeURIComponent(o)}`;
    i != null && ($ += `&limit=${encodeURIComponent(i)}`), y != null && ($ += `&before=${encodeURIComponent(y)}`);
    const I = await r(e(`/agent-sessions?${$}`));
    if (!I.ok) throw new Error(`GET /agent-sessions -> ${I.status}`);
    const p = await I.json();
    return i == null ? Array.isArray(p) ? p : [] : {
      sessions: Array.isArray(p == null ? void 0 : p.sessions) ? p.sessions : [],
      total: typeof (p == null ? void 0 : p.total) == "number" ? p.total : 0,
      hasMore: !!(p != null && p.has_more)
    };
  }
  async function N(o, i, { restore: y = !1 } = {}) {
    const $ = `type=${encodeURIComponent(o)}${y ? "&restore=1" : ""}`, I = await r(e(`/agent-sessions/${encodeURIComponent(i)}?${$}`), {
      method: "DELETE"
    });
    if (!I.ok) throw new Error(`DELETE /agent-sessions/${i} -> ${I.status}`);
    return I.json();
  }
  return { listClis: d, buildCommand: E, listSessions: m, hideSession: N };
}
const Y = {
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
}, ce = [
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
  Y
], ue = new Map(ce.map((e) => [e.type, e]));
function z(e) {
  return ue.get(e) || null;
}
function ie(e = []) {
  const r = (e || []).filter((d) => d && d.type && d.type !== "terminal").map((d) => {
    const E = ue.get(d.type);
    return E ? { ...E, ...d } : d;
  });
  return r.some((d) => d.type === Y.type) || r.push({ ...Y }), r;
}
function we(e) {
  if (e === "gemini") return !0;
  const r = z(e);
  return !!(r && r.supportsInsecure && r.insecureFlag);
}
function xe(e, r = !1) {
  return r ? "Insecure mode ON — click to disable" : e === "codex" ? "Click to enable insecure mode (--dangerously-bypass-approvals-and-sandbox)" : e === "gemini" ? "Click to enable insecure mode (--yolo — auto-approve all tools)" : e === "cursor" ? "Click to enable insecure mode (--approve-mcps --yolo)" : e === "copilot" ? "Click to enable insecure mode (--allow-all)" : e === "antigravity" ? "Click to enable insecure mode (--dangerously-skip-permissions)" : "Click to enable insecure mode (skip all permission checks)";
}
function ae() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
function te(e, r = null, d = !1, E = null, m = null, N = null) {
  if (e === "gemini") {
    let y = "gemini";
    if (r)
      y += ` --resume ${r}`;
    else {
      const $ = m || ae();
      y += ` --session-id ${$}`;
    }
    return d && (y += " --yolo"), y;
  }
  const o = z(e);
  if (!o)
    return N || e;
  let i = N || o.command;
  if (r)
    o.resumeSubcommand ? i += ` ${o.resumeSubcommand} ${r}` : o.resumeFlag && (i += ` ${o.resumeFlag} ${r}`);
  else if (o.supportsSessionId) {
    const y = m || ae();
    i += ` --session-id ${y}`;
  }
  return d && o.insecureFlag && (i += ` ${o.insecureFlag}`), i;
}
const ve = "code-agent-clis", be = /* @__PURE__ */ new Set(["claude", "codex", "copilot", "cursor", "antigravity"]), le = 50;
function Ce(e) {
  const r = ye({
    apiUrl: e.app.apiUrl,
    fetchImpl: e.sdk.api.fetch
  });
  function d() {
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
  async function E(t, a = null, f = null, b = {}) {
    var c;
    const l = (b.aiAgents || []).find((T) => T.type === t) || z(t) || (t === "antigravity" ? { label: "Antigravity", command: "agy" } : null), w = (l == null ? void 0 : l.label) || t, g = typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`;
    let x, v;
    if (a)
      x = f ? f.length > 60 ? f.slice(0, 57) + "…" : f : w, v = te(t, a, !!b.isInsecure, x, null, l == null ? void 0 : l.command);
    else {
      x = `${w} - ${g.slice(-4)}`;
      const T = b.isInsecure !== void 0 ? !!b.isInsecure : !!((c = z(t)) != null && c.defaultInsecureOnCreate);
      v = te(t, null, T, x, g, l == null ? void 0 : l.command);
    }
    const R = d(), M = await R.createTerminal({ name: x, command: v, type: t });
    return M != null && M.id && b.openWindow !== !1 && R.openTerminal(M.id), { ...M, name: x, command: v, agentSessionId: a || g };
  }
  if (typeof window < "u") {
    const t = {
      slug: ve,
      clis: ce,
      antigravityAgent: Y,
      getCli: z,
      withManagedAgentClis: ie,
      supportsInsecureMode: we,
      getInsecureTooltip: xe,
      buildAgentCommand: te,
      launchAgentTerminal: E,
      listClis: r.listClis,
      buildCommandRemote: r.buildCommand,
      listSessions: r.listSessions,
      hideSession: r.hideSession
    };
    window.__awCodeAgentClis = t, window.dispatchEvent(new CustomEvent("aw-code-agent-clis-ready", { detail: t })), typeof e.onDispose == "function" && e.onDispose(() => {
      window.__awCodeAgentClis === t && delete window.__awCodeAgentClis;
    });
  }
  const { useState: m, useRef: N, useCallback: o, useEffect: i } = e.React, { createPortal: y } = e.ReactDOM, $ = {
    bolt: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" })),
    copilot: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" })),
    cursor: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M4 0l16 12.279-6.985 1.205 2.854 10.516L4 0z" })),
    codex: (t) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { color: t } }, /* @__PURE__ */ e.h("path", { d: "M12 3l7.5 4.25v8.5L12 20l-7.5-4.25v-8.5L12 3z" }), /* @__PURE__ */ e.h("path", { d: "M8.5 9.5L12 7.5l3.5 2v5L12 16.5l-3.5-2v-5z" })),
    antigravity: () => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ e.h("path", { d: "M12 2.5c.7 5.3 4.2 8.8 9.5 9.5-5.3.7-8.8 4.2-9.5 9.5-.7-5.3-4.2-8.8-9.5-9.5 5.3-.7 8.8-4.2 9.5-9.5Z", fill: "#4285F4" }), /* @__PURE__ */ e.h("path", { d: "M12 2.5c.7 5.3 4.2 8.8 9.5 9.5H12V2.5Z", fill: "#34A853" }), /* @__PURE__ */ e.h("path", { d: "M12 12h9.5c-5.3.7-8.8 4.2-9.5 9.5V12Z", fill: "#FBBC04" }), /* @__PURE__ */ e.h("path", { d: "M2.5 12H12v9.5c-.7-5.3-4.2-8.8-9.5-9.5Z", fill: "#EA4335" }))
  };
  function I({ iconName: t, color: a }) {
    const f = $[t];
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
    onResume: D,
    onOpenRunningAgentSession: l,
    onFlyoutEnter: w,
    onFlyoutLeave: g
  }) {
    const [x, v] = m(!1), [R, M] = m({ top: 0, left: 0 }), [c, T] = m(null), [j, P] = m(0), [L, H] = m(!1), [O, W] = m(!1), [s, h] = m(!1), [_, G] = m(null), ne = N(null), q = N(null), Z = N(!1), V = be.has(t.key), oe = o(() => {
      Z.current || (Z.current = !0, w == null || w());
    }, [w]), U = o(() => {
      Z.current && (Z.current = !1, g == null || g());
    }, [g]), F = o(() => {
      clearTimeout(q.current);
    }, []), re = o(() => {
      F(), q.current = setTimeout(() => {
        v(!1), U();
      }, 150);
    }, [F, U]);
    i(() => () => {
      clearTimeout(q.current), U();
    }, [U]);
    const J = o(() => {
      F(), v(!1), U();
    }, [F, U]), pe = o(() => {
      var u;
      if (!V) return;
      F();
      const n = (u = ne.current) == null ? void 0 : u.getBoundingClientRect();
      n && M({ top: n.top, left: n.right + 4 }), v(!0), oe(), s || (h(!0), G(null), r.listSessions(t.key, { limit: le }).then(({ sessions: C, total: A, hasMore: k }) => {
        T(C), P(A), H(k);
      }).catch((C) => G(C.message || "Failed to load")).finally(() => h(!1)));
    }, [V, F, oe, s]), K = o(() => {
      if (O || !L || !c || c.length === 0) return;
      W(!0);
      const n = c[c.length - 1].updated_at;
      r.listSessions(t.key, { limit: le, before: n }).then(({ sessions: u, total: C, hasMore: A }) => {
        T((k) => {
          const B = new Set((k || []).map((S) => S.session_id));
          return [...k || [], ...u.filter((S) => !B.has(S.session_id))];
        }), P(C), H(A);
      }).catch(() => {
      }).finally(() => W(!1));
    }, [O, L, c, t.key]), me = o((n) => {
      if (!L || O) return;
      const u = n.currentTarget;
      u.scrollHeight - u.scrollTop - u.clientHeight < 120 && K();
    }, [L, O, K]), fe = new Set((c || []).map((n) => n.session_id)), se = (f || []).filter(
      (n) => n.type === t.key && n.alive && (!n.agent_session_id || !fe.has(n.agent_session_id))
    ), ge = [...c || []].sort((n, u) => {
      const C = !!a[`${t.key}:${n.session_id}`], A = !!a[`${t.key}:${u.session_id}`];
      if (C !== A) return C ? -1 : 1;
      const k = (n.updated_at || n.created_at || 0) * 1e3, B = (u.updated_at || u.created_at || 0) * 1e3;
      if (k !== B) return B - k;
      const S = (n.name || "(untitled)").toLowerCase(), Q = (u.name || "(untitled)").toLowerCase();
      return S.localeCompare(Q);
    });
    return /* @__PURE__ */ e.h(e.React.Fragment, null, /* @__PURE__ */ e.h(
      "button",
      {
        ref: ne,
        onMouseEnter: pe,
        onMouseLeave: re,
        onClick: (n) => {
          n.stopPropagation(), J(), b();
        },
        className: "w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-left"
      },
      /* @__PURE__ */ e.h(I, { iconName: t.icon, color: t.color }),
      /* @__PURE__ */ e.h("span", { className: "flex-1 text-[13px] text-[var(--color-text-primary)]" }, t.label),
      V ? /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 text-[var(--color-text-muted)] opacity-60", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M9 6l6 6-6 6" })) : /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 text-[var(--color-accent)] opacity-60", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M12 5v14M5 12h14" }))
    ), x && V && y(
      /* @__PURE__ */ e.h(
        "div",
        {
          onMouseEnter: F,
          onMouseLeave: re,
          onScroll: me,
          className: "fixed bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl shadow-black/60",
          style: {
            top: R.top - 5,
            left: R.left,
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
        _ && !s && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-danger)]" }, "Failed to load: ", _),
        !s && !_ && c && c.length === 0 && se.length === 0 && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-text-muted)]" }, "No previous sessions for this project."),
        se.map((n) => /* @__PURE__ */ e.h(
          "div",
          {
            key: n.id,
            className: "group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
          },
          /* @__PURE__ */ e.h(
            "button",
            {
              onClick: (u) => {
                u.stopPropagation(), J(), l(n.id);
              },
              className: "w-full text-left px-3 py-2 pr-9",
              title: `Open running session "${n.name}" (session ID not yet detected)`
            },
            /* @__PURE__ */ e.h("div", { className: "text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2" }, /* @__PURE__ */ e.h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0" }), /* @__PURE__ */ e.h("span", { className: "truncate" }, n.name)),
            /* @__PURE__ */ e.h("div", { className: "text-[10px] text-[var(--color-text-muted)] mt-0.5" }, "starting…")
          )
        )),
        !s && !_ && c && ge.map((n) => {
          const u = n.session_id ? `${n.session_id.slice(0, 8)}-${n.session_id.slice(9, 13)}…` : "", C = n.name || u || "(untitled)";
          let A = "";
          const k = n.updated_at ? new Date(n.updated_at * 1e3) : n.created_at ? new Date(n.created_at * 1e3) : null;
          k && !isNaN(k) && (A = `${k.toLocaleDateString()} ${k.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
          const B = [u, A].filter(Boolean).join(" · "), S = a[`${t.key}:${n.session_id}`], Q = (X) => {
            X.stopPropagation(), T((ee) => (ee || []).filter((he) => he.session_id !== n.session_id)), P((ee) => Math.max(0, ee - 1)), r.hideSession(t.key, n.session_id).catch(() => {
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
                onClick: (X) => {
                  X.stopPropagation(), J(), S ? l(S) : D(t.key, n.session_id, C);
                },
                className: "w-full text-left px-3 py-2 pr-9",
                title: `${S ? "Open" : "Resume"} "${C}" (${n.session_id})`
              },
              /* @__PURE__ */ e.h("div", { className: "text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2" }, S && /* @__PURE__ */ e.h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0" }), /* @__PURE__ */ e.h("span", { className: "truncate" }, C)),
              /* @__PURE__ */ e.h("div", { className: "text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" }, B)
            ),
            /* @__PURE__ */ e.h(
              "button",
              {
                onClick: Q,
                className: "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-danger)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-opacity cursor-pointer",
                title: "Hide from picker (transcript kept on disk)"
              },
              /* @__PURE__ */ e.h("svg", { className: "w-3 h-3", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ e.h("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }), /* @__PURE__ */ e.h("path", { d: "M10 11v6M14 11v6" }), /* @__PURE__ */ e.h("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" }))
            )
          );
        }),
        !s && !_ && L && /* @__PURE__ */ e.h(
          "button",
          {
            onClick: (n) => {
              n.stopPropagation(), K();
            },
            disabled: O,
            className: "w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-white/5 disabled:opacity-60"
          },
          O ? "Loading…" : `Load more (${Math.max(0, j - ((c == null ? void 0 : c.length) || 0))} remaining)`
        )
      ),
      document.body
    ));
  }
  function de({
    aiAgents: t,
    agentSessions: a,
    onCreateAgent: f,
    onToggleAgent: b
  }) {
    const [D, l] = m(!1), w = N(null), g = N(0), x = N(!1), v = o(() => {
      clearTimeout(w.current), w.current = setTimeout(() => {
        !x.current && g.current === 0 && l(!1);
      }, 150);
    }, []), R = o(() => {
      x.current = !0, clearTimeout(w.current), l(!0);
    }, []), M = o(() => {
      x.current = !1, v();
    }, [v]), c = o(() => {
      g.current += 1, clearTimeout(w.current);
    }, []), T = o(() => {
      g.current = Math.max(0, g.current - 1), g.current === 0 && !x.current && v();
    }, [v]);
    i(() => () => clearTimeout(w.current), []);
    const j = (a == null ? void 0 : a.length) || 0, P = o((s, h = null, _ = null) => {
      if (typeof f == "function") {
        f(s, h, _);
        return;
      }
      E(s, h, _, { aiAgents: t }).catch(() => {
      });
    }, [f, t]), L = o((s) => {
      if (typeof b == "function") {
        b(s);
        return;
      }
      d().openTerminal(s);
    }, [b]), H = ie(t || []).map((h) => ({
      key: h.type,
      label: h.label || h.type,
      icon: h.icon,
      color: h.color,
      action: () => P(h.type)
    })), O = {};
    (a || []).forEach((s) => {
      s.type && s.agent_session_id && (O[`${s.type}:${s.agent_session_id}`] = s.id);
    });
    const W = {
      runningAgentSessionMap: O,
      liveAgentSessions: a,
      onOpenRunningAgentSession: (s) => {
        l(!1), L(s);
      },
      onFlyoutEnter: c,
      onFlyoutLeave: T
    };
    return /* @__PURE__ */ e.h("div", { className: "relative", onMouseEnter: R, onMouseLeave: M }, /* @__PURE__ */ e.h(
      "button",
      {
        onClick: () => l((s) => !s),
        className: "px-3 py-1 text-xs rounded transition-colors cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
      },
      "Agents",
      j > 0 && /* @__PURE__ */ e.h("span", { className: "ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold px-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)]" }, j)
    ), D && /* @__PURE__ */ e.h(
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
          onResume: (h, _, G) => {
            l(!1), P(h, _, G);
          },
          ...W
        }
      ))
    ));
  }
  e.registerSlot("core.nav", de);
}
export {
  Ce as default,
  Ce as register
};
