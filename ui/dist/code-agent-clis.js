function de({ apiUrl: e, fetchImpl: $ = fetch }) {
  async function p(s, { limit: v, before: S } = {}) {
    let _ = `type=${encodeURIComponent(s)}`;
    v != null && (_ += `&limit=${encodeURIComponent(v)}`), S != null && (_ += `&before=${encodeURIComponent(S)}`);
    const g = await $(e(`/agent-sessions?${_}`));
    if (!g.ok) throw new Error(`GET /agent-sessions -> ${g.status}`);
    const a = await g.json();
    return v == null ? Array.isArray(a) ? a : [] : {
      sessions: Array.isArray(a == null ? void 0 : a.sessions) ? a.sessions : [],
      total: typeof (a == null ? void 0 : a.total) == "number" ? a.total : 0,
      hasMore: !!(a != null && a.has_more)
    };
  }
  async function h(s, v, { restore: S = !1 } = {}) {
    const _ = `type=${encodeURIComponent(s)}${S ? "&restore=1" : ""}`, g = await $(e(`/agent-sessions/${encodeURIComponent(v)}?${_}`), {
      method: "DELETE"
    });
    if (!g.ok) throw new Error(`DELETE /agent-sessions/${v} -> ${g.status}`);
    return g.json();
  }
  return { listSessions: p, hideSession: h };
}
const ue = /* @__PURE__ */ new Set(["claude", "codex", "copilot", "cursor", "antigravity"]), re = {
  type: "antigravity",
  label: "Antigravity",
  command: "agy",
  color: "#4285f4",
  icon: "antigravity"
}, oe = 50;
function pe(e) {
  const $ = de({
    apiUrl: e.app.apiUrl,
    fetchImpl: e.sdk.api.fetch
  }), { useState: p, useRef: h, useCallback: s, useEffect: v } = e.React, { createPortal: S } = e.ReactDOM, _ = {
    bolt: (r) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: r } }, /* @__PURE__ */ e.h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" })),
    copilot: (r) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: r } }, /* @__PURE__ */ e.h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" })),
    cursor: (r) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", style: { color: r } }, /* @__PURE__ */ e.h("path", { d: "M4 0l16 12.279-6.985 1.205 2.854 10.516L4 0z" })),
    codex: (r) => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { color: r } }, /* @__PURE__ */ e.h("path", { d: "M12 3l7.5 4.25v8.5L12 20l-7.5-4.25v-8.5L12 3z" }), /* @__PURE__ */ e.h("path", { d: "M8.5 9.5L12 7.5l3.5 2v5L12 16.5l-3.5-2v-5z" })),
    antigravity: () => /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ e.h("path", { d: "M12 2.5c.7 5.3 4.2 8.8 9.5 9.5-5.3.7-8.8 4.2-9.5 9.5-.7-5.3-4.2-8.8-9.5-9.5 5.3-.7 8.8-4.2 9.5-9.5Z", fill: "#4285F4" }), /* @__PURE__ */ e.h("path", { d: "M12 2.5c.7 5.3 4.2 8.8 9.5 9.5H12V2.5Z", fill: "#34A853" }), /* @__PURE__ */ e.h("path", { d: "M12 12h9.5c-5.3.7-8.8 4.2-9.5 9.5V12Z", fill: "#FBBC04" }), /* @__PURE__ */ e.h("path", { d: "M2.5 12H12v9.5c-.7-5.3-4.2-8.8-9.5-9.5Z", fill: "#EA4335" }))
  };
  function g({ iconName: r, color: c }) {
    const C = _[r];
    return C ? C(c) : /* @__PURE__ */ e.h(
      "span",
      {
        className: "w-3 h-3 shrink-0 rounded-sm text-[8px] font-bold flex items-center justify-center leading-none",
        style: { backgroundColor: c || "#888", color: "#fff" }
      },
      (r || "?")[0].toUpperCase()
    );
  }
  function a({
    launcher: r,
    runningAgentSessionMap: c,
    liveAgentSessions: C,
    onLaunch: O,
    onResume: j,
    onOpenRunningAgentSession: y,
    onFlyoutEnter: f,
    onFlyoutLeave: m
  }) {
    const [T, w] = p(!1), [P, G] = p({ top: 0, left: 0 }), [l, E] = p(null), [I, A] = p(0), [k, z] = p(!1), [o, i] = p(!1), [b, H] = p(!1), [B, K] = p(null), Q = h(null), Z = h(null), W = h(!1), D = ue.has(r.key), V = h(!1), X = s(() => {
      W.current || (W.current = !0, f == null || f());
    }, [f]), L = s(() => {
      W.current && (W.current = !1, m == null || m());
    }, [m]), M = s(() => {
      clearTimeout(Z.current);
    }, []), ee = s(() => {
      M(), Z.current = setTimeout(() => {
        V.current = !1, w(!1), L();
      }, 150);
    }, [M, L]);
    v(() => () => {
      clearTimeout(Z.current), L();
    }, [L]);
    const U = s(() => {
      M(), V.current = !1, w(!1), L();
    }, [M, L]), se = s(() => {
      var n;
      if (!D) return;
      M();
      const t = (n = Q.current) == null ? void 0 : n.getBoundingClientRect();
      t && G({ top: t.top, left: t.right + 4 }), V.current = !0, w(!0), X(), b || (H(!0), K(null), $.listSessions(r.key, { limit: oe }).then(({ sessions: d, total: N, hasMore: u }) => {
        E(d), A(N), z(u);
      }).catch((d) => K(d.message || "Failed to load")).finally(() => H(!1)));
    }, [D, M, X, b]), Y = s(() => {
      if (o || !k || !l || l.length === 0) return;
      i(!0);
      const t = l[l.length - 1].updated_at;
      $.listSessions(r.key, { limit: oe, before: t }).then(({ sessions: n, total: d, hasMore: N }) => {
        E((u) => {
          const R = new Set((u || []).map((x) => x.session_id));
          return [...u || [], ...n.filter((x) => !R.has(x.session_id))];
        }), A(d), z(N);
      }).catch(() => {
      }).finally(() => i(!1));
    }, [o, k, l, r.key]), ae = s((t) => {
      if (!k || o) return;
      const n = t.currentTarget;
      n.scrollHeight - n.scrollTop - n.clientHeight < 120 && Y();
    }, [k, o, Y]), le = new Set((l || []).map((t) => t.session_id)), te = (C || []).filter(
      (t) => t.type === r.key && t.alive && (!t.agent_session_id || !le.has(t.agent_session_id))
    ), ie = [...l || []].sort((t, n) => {
      const d = !!c[`${r.key}:${t.session_id}`], N = !!c[`${r.key}:${n.session_id}`];
      if (d !== N) return d ? -1 : 1;
      const u = (t.updated_at || t.created_at || 0) * 1e3, R = (n.updated_at || n.created_at || 0) * 1e3;
      if (u !== R) return R - u;
      const x = (t.name || "(untitled)").toLowerCase(), q = (n.name || "(untitled)").toLowerCase();
      return x.localeCompare(q);
    });
    return /* @__PURE__ */ e.h(e.React.Fragment, null, /* @__PURE__ */ e.h(
      "button",
      {
        ref: Q,
        onMouseEnter: se,
        onMouseLeave: ee,
        onClick: (t) => {
          t.stopPropagation(), U(), O();
        },
        className: "w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-left"
      },
      /* @__PURE__ */ e.h(g, { iconName: r.icon, color: r.color }),
      /* @__PURE__ */ e.h("span", { className: "flex-1 text-[13px] text-[var(--color-text-primary)]" }, r.label),
      D ? /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 text-[var(--color-text-muted)] opacity-60", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M9 6l6 6-6 6" })) : /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 text-[var(--color-accent)] opacity-60", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M12 5v14M5 12h14" }))
    ), T && D && S(
      /* @__PURE__ */ e.h(
        "div",
        {
          onMouseEnter: M,
          onMouseLeave: ee,
          onScroll: ae,
          className: "fixed bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl shadow-black/60",
          style: {
            top: P.top - 5,
            left: P.left,
            zIndex: 99999,
            width: 320,
            maxHeight: "70vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ e.h(
          "button",
          {
            onClick: (t) => {
              t.stopPropagation(), U(), O();
            },
            title: "New session",
            "aria-label": `Start new ${r.label} session`,
            className: "w-full text-left px-3 py-2 text-xs text-[var(--color-accent)] hover:bg-white/5 border-b border-[var(--color-border)] flex items-center gap-1.5"
          },
          /* @__PURE__ */ e.h("svg", { className: "w-3 h-3 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("path", { d: "M12 5v14M5 12h14" })),
          /* @__PURE__ */ e.h("span", { className: "font-medium" }, "New Session"),
          /* @__PURE__ */ e.h("span", { className: "ml-auto text-[10px] text-[var(--color-text-muted)]" }, I)
        ),
        b && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-text-muted)]" }, "Loading…"),
        B && !b && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-danger)]" }, "Failed to load: ", B),
        !b && !B && l && l.length === 0 && te.length === 0 && /* @__PURE__ */ e.h("div", { className: "px-3 py-3 text-xs text-[var(--color-text-muted)]" }, "No previous sessions for this project."),
        te.map((t) => /* @__PURE__ */ e.h(
          "div",
          {
            key: t.id,
            className: "group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
          },
          /* @__PURE__ */ e.h(
            "button",
            {
              onClick: (n) => {
                n.stopPropagation(), U(), y(t.id);
              },
              className: "w-full text-left px-3 py-2 pr-9",
              title: `Open running session "${t.name}" (session ID not yet detected)`
            },
            /* @__PURE__ */ e.h("div", { className: "text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2" }, /* @__PURE__ */ e.h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0" }), /* @__PURE__ */ e.h("span", { className: "truncate" }, t.name)),
            /* @__PURE__ */ e.h("div", { className: "text-[10px] text-[var(--color-text-muted)] mt-0.5" }, "starting…")
          )
        )),
        !b && !B && l && ie.map((t) => {
          const n = t.session_id ? `${t.session_id.slice(0, 8)}-${t.session_id.slice(9, 13)}…` : "", d = t.name || n || "(untitled)";
          let N = "";
          const u = t.updated_at ? new Date(t.updated_at * 1e3) : t.created_at ? new Date(t.created_at * 1e3) : null;
          u && !isNaN(u) && (N = `${u.toLocaleDateString()} ${u.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
          const R = [n, N].filter(Boolean).join(" · "), x = c[`${r.key}:${t.session_id}`], q = (F) => {
            F.stopPropagation(), E((J) => (J || []).filter((ce) => ce.session_id !== t.session_id)), A((J) => Math.max(0, J - 1)), $.hideSession(r.key, t.session_id).catch(() => {
            });
          };
          return /* @__PURE__ */ e.h(
            "div",
            {
              key: t.session_id,
              className: "group relative w-full hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
            },
            /* @__PURE__ */ e.h(
              "button",
              {
                onClick: (F) => {
                  F.stopPropagation(), U(), x ? y(x) : j(r.key, t.session_id, d);
                },
                className: "w-full text-left px-3 py-2 pr-9",
                title: `${x ? "Open" : "Resume"} "${d}" (${t.session_id})`
              },
              /* @__PURE__ */ e.h("div", { className: "text-xs font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2" }, x && /* @__PURE__ */ e.h("span", { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0" }), /* @__PURE__ */ e.h("span", { className: "truncate" }, d)),
              /* @__PURE__ */ e.h("div", { className: "text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate" }, R)
            ),
            /* @__PURE__ */ e.h(
              "button",
              {
                onClick: q,
                className: "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-danger)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-opacity cursor-pointer",
                title: "Hide from picker (transcript kept on disk)"
              },
              /* @__PURE__ */ e.h("svg", { className: "w-3 h-3", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ e.h("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ e.h("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }), /* @__PURE__ */ e.h("path", { d: "M10 11v6M14 11v6" }), /* @__PURE__ */ e.h("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" }))
            )
          );
        }),
        !b && !B && k && // Terminal fallback row for when 50 rows don't overflow
        // the flyout's own scrollbar (no scroll event ever fires
        // then, so page 2 would otherwise be unreachable).
        /* @__PURE__ */ e.h(
          "button",
          {
            onClick: (t) => {
              t.stopPropagation(), Y();
            },
            disabled: o,
            className: "w-full text-left px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-white/5 disabled:opacity-60"
          },
          o ? "Loading…" : `Load more (${Math.max(0, I - ((l == null ? void 0 : l.length) || 0))} remaining)`
        )
      ),
      document.body
    ));
  }
  function ne({
    aiAgents: r,
    agentSessions: c,
    onCreateAgent: C,
    onToggleAgent: O
  }) {
    const [j, y] = p(!1), f = h(null), m = h(0), T = h(!1), w = s(() => {
      clearTimeout(f.current), f.current = setTimeout(() => {
        !T.current && m.current === 0 && y(!1);
      }, 150);
    }, []), P = s(() => {
      T.current = !0, clearTimeout(f.current), y(!0);
    }, []), G = s(() => {
      T.current = !1, w();
    }, [w]), l = s(() => {
      m.current += 1, clearTimeout(f.current);
    }, []), E = s(() => {
      m.current = Math.max(0, m.current - 1), m.current === 0 && !T.current && w();
    }, [w]);
    v(() => () => clearTimeout(f.current), []);
    const I = (c == null ? void 0 : c.length) || 0, A = (() => {
      const o = [...r || []].filter((i) => i.type !== "terminal");
      return o.some((i) => i.type === re.type) || o.push(re), o.map((i) => ({
        key: i.type,
        label: i.label || i.type,
        icon: i.icon,
        color: i.color,
        action: () => C(i.type)
      }));
    })(), k = {};
    (c || []).forEach((o) => {
      o.type && o.agent_session_id && (k[`${o.type}:${o.agent_session_id}`] = o.id);
    });
    const z = {
      runningAgentSessionMap: k,
      liveAgentSessions: c,
      onOpenRunningAgentSession: (o) => {
        y(!1), O(o);
      },
      onFlyoutEnter: l,
      onFlyoutLeave: E
    };
    return /* @__PURE__ */ e.h("div", { className: "relative", onMouseEnter: P, onMouseLeave: G }, /* @__PURE__ */ e.h(
      "button",
      {
        onClick: () => y((o) => !o),
        className: "px-3 py-1 text-xs rounded transition-colors cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
      },
      "Agents",
      I > 0 && /* @__PURE__ */ e.h("span", { className: "ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold px-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)]" }, I)
    ), j && /* @__PURE__ */ e.h(
      "div",
      {
        className: "absolute left-0 top-full mt-2 z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl p-2",
        style: { minWidth: 280, maxWidth: 360 }
      },
      A.map((o) => /* @__PURE__ */ e.h(
        a,
        {
          key: o.key,
          launcher: o,
          onLaunch: () => {
            y(!1), o.action();
          },
          onResume: (i, b, H) => {
            y(!1), C(i, b, H);
          },
          ...z
        }
      ))
    ));
  }
  e.registerSlot("core.nav", ne);
}
export {
  pe as default,
  pe as register
};
