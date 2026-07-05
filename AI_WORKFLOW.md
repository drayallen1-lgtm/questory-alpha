# Questory AI Workflow

> Mandatory workflow for every AI coding session on Questory.

**Related documents:** [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) · [ROADMAP.md](./ROADMAP.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [ENGINE_INDEX.md](./ENGINE_INDEX.md) · [KNOWN_PATTERNS.md](./KNOWN_PATTERNS.md)

---

## Table of Contents

1. [Session Start](#session-start)
2. [Before Writing Code](#before-writing-code)
3. [Implementation](#implementation)
4. [Commit Protocol](#commit-protocol)
5. [What Not To Do](#what-not-to-do)
6. [Quick Checklist](#quick-checklist)

---

## Session Start

Every AI session **must begin** by reading these documents in order:

1. [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) — vision, philosophy, rules
2. [ROADMAP.md](./ROADMAP.md) — what is done, what is next
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — engine boundaries
4. [ENGINE_INDEX.md](./ENGINE_INDEX.md) — lookup for existing modules
5. [KNOWN_PATTERNS.md](./KNOWN_PATTERNS.md) — how Questory is built

Optional context:
- [QUESTORY_HISTORY.md](./QUESTORY_HISTORY.md) — why phases exist
- [QUALITY.md](./QUALITY.md) — tests, lint, Dev Dashboard (Phase 14.5+)

---

## Before Writing Code

1. **Review existing architecture** — grep for related engines before creating files.
2. **Check the roadmap** — confirm the work matches the current phase. Do not skip ahead or invent phases.
3. **Explain the implementation plan** — describe what will change, which engines are reused, and commit boundaries.
4. **Wait for internal consistency** — the plan must not duplicate engines or contradict [ARCHITECTURE.md](./ARCHITECTURE.md).

### Plan template

```
Goal: [one sentence]
Engines reused: [list]
New files (if any): [list with justification]
State changes: [seed.js slices]
UI integration: [panel / map layer / claim hook]
Commits: [1. engine  2. UI  3. wiring]
```

---

## Implementation

### Reuse engines

- Extend existing exports — do not fork parallel logic.
- Add snapshot functions for new read paths.
- Add pure state transition functions for new write paths.
- Wire into `claimFlow.js` only for victory/completion effects.

### Build incrementally

- Small, buildable commits.
- Each commit should leave the app in a working state.
- Prefer: engine → seed → UI → integration hooks.

### UI conventions

- Engine snapshot → `useMemo` → panel component.
- Match existing CSS patterns (`*.css` per feature area).
- Mobile-first, card-based panels.
- Vault tabs live in `SweepUI.jsx` → `QuestoryPassport`.

---

## Commit Protocol

```
1. npm run build          # must pass
2. npm run test:unit      # before engine/claim changes (Phase 14.5+)
3. git add src/ ...       # source only
4. git commit -m "..."    # descriptive message
5. Never git add dist/
```

| Rule | Detail |
|------|--------|
| Build before commit | Always run `npm run build` |
| Test before engine changes | Run `npm run test:unit`; E2E when UI flows change — see [QUALITY.md](./QUALITY.md) |
| Source only | Commit `src/`, config, docs — never `dist/` |
| No empty commits | Skip if nothing changed |
| No git config changes | Never modify user git config |
| No force push | Unless explicitly requested |

---

## What Not To Do

| Forbidden | Why |
|-----------|-----|
| Invent new roadmap phases | [ROADMAP.md](./ROADMAP.md) is canonical |
| Duplicate engine responsibilities | See [ARCHITECTURE.md § Responsibility Matrix](./ARCHITECTURE.md#responsibility-matrix) |
| Rewrite stable systems | Extend, don't replace |
| Commit `dist/` | Build artifacts are generated |
| Skip `npm run build` | Broken builds must not land |
| Create overlapping currency/progression systems | Use `economy.js` + `explorerEconomyEngine.js` + `playerProgressionEngine.js` |
| Put business logic in React components | Logic belongs in engines |

---

## Quick Checklist

Before ending a session:

- [ ] Read constitution, roadmap, architecture
- [ ] Reused existing engines (checked ENGINE_INDEX)
- [ ] No duplicate responsibilities
- [ ] State normalized in `seed.js` if new slices added
- [ ] `npm run build` passes
- [ ] `npm run test:unit` passes when engines or claim flow changed
- [ ] Only source files committed
- [ ] Roadmap updated if phase completed
- [ ] No gameplay changes unless that was the task

---

*This workflow replaces long chat history. The repository is the source of truth.*
