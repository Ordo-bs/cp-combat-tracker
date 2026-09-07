# CPxObsidian Combat Tracker — Progress Note

**Last updated:** 2026-09-07  
**Architecture spec:** `C:\Users\ordob\Documents\Sync_vault\Cyberpunk\CPxObsidian Plug-in v2\Architecture.md`  
**Dev repo:** `C:\CPxObsidian Plug-in v2`  
**GitHub:** https://github.com/Ordo-bs/cp-combat-tracker  
**Vault plugin junction:** `C:\Users\ordob\Documents\Sync_vault\.obsidian\plugins\cp-combat-tracker` → dev folder  

**Build:** `npm run build`  
**Test:** `npm test` (25 tests passing at time of writing)  
**Node path (if shell lacks npm):** `C:\Program Files\nodejs`

---

## Implementation roadmap (Architecture §396)

| Step | Item | Status |
|------|------|--------|
| 1 | Project scaffolding and plugin registration | ✅ Done |
| 2 | Domain model and repositories | ✅ Done |
| 3 | Event dispatcher and service container | ✅ Done |
| 4 | Application services | ✅ Done |
| 5 | React sidebar shell | ✅ Done |
| 6 | Initiative Tracker UI | ✅ Done |
| 7 | Combat Sheet Editor | ✅ Done |
| 8 | Markdown parser and template system | ✅ Done |
| 9 | Runtime actions | ✅ Done |
| 10 | Integration tests | ⬜ **Next** |
| 11 | UI polishing | ⬜ Pending |
| 12 | Hit/Damage Calculator | ✅ Implemented — see [`docs/hit-damage-calculator-implementation-plan.md`](docs/hit-damage-calculator-implementation-plan.md) |

---

## What is complete (Steps 1–9)

### Core platform
- TypeScript + React + esbuild Obsidian plugin (`cp-combat-tracker`)
- Domain: `CombatSheet`, `CombatEncounter`, initiative queue, statuses, rule tables
- `EncounterRepository` via `plugin.loadData()` / `saveData()`
- `PluginContext` DI container wiring all services

### Services
- `CombatService`, `InitiativeService`, `EncounterService`, `CombatSheetFactory`
- `ValidationService`, `DamageThresholdService`, `DiceService`, `TemplateService`

### Initiative Tracker (sidebar)
- Toolbar: **+ Add**, **From Note**, **Previous**, **Next**, **Clear**
- Combat cards with initiative inline edit, status bar, NPC ammo controls
- **Initiative reorders only at round wrap** (last combatant → Next); mid-round Next keeps order
- Ammo **-1 / -3 / -10** disabled when insufficient shots (same as Reload)
- **Clear** removes NPCs/Vehicles, retains PCs, resets PC initiative to 0

### Combat Sheet Editor
- Workspace tab view (`cp-combat-tracker-combat-sheet-editor`)
- **+ Add** → draft (Confirm/Cancel); **Edit** → immediate save (Close)
- Sections for PC / NPC / Vehicle; view state persisted via `getState()` / `setState()`

### Templates (Step 8)
- ` ```combat-sheet ` YAML blocks in notes (one per note)
- Parser pipeline: extract fence → YAML → validate → `CombatTemplate` → factory
- **From Note** button + command **Add combatant from current note**
- **Clickable template cards** in Reading/Live Preview via markdown code-block processor (**Add to Combat**)
- Template conveniences added after initial step 8:
  - **`baseDeathSave` removed from templates** — only `baseStunSave`; death save copied at instantiation
  - **Flat body keys** (no indentation): `body.head.sp: 2`, `body.leftArm.cybernetic: true`, etc.
  - **Tab indentation** normalized to spaces in nested `body:` blocks

### Runtime actions (Step 9)
- `CombatAction` + `CombatActionExecutor` + `ActionRegistry`
- Actions: `ConsumeAmmo`, `ReloadWeapon`, `PerformStunSave`, `PerformDeathSave`, `OpenHitCalculator`
- Placeholder `IStunResolver` / `IDeathResolver` (+ other resolver seams in `placeholders.ts`)
- NPC card buttons route through executor (not direct `CombatService` calls)
- **Hit** expands card and scrolls to placeholder; **Stun/Death** roll d10 vs modified save, apply status on failure

### Tests (unit level — not yet full integration)
- `smoke.test.ts`, `initiative.test.ts`, `editor-validation.test.ts`
- `template-parser.test.ts` (11 cases)
- `actions.test.ts` (7 cases)

---

## Remaining work

### Step 10 — Integration tests ⬜ NEXT

**Goal (Architecture §387):** Test subsystems working together without UI.

**Planned scope:**

| Area | What to test |
|------|----------------|
| Repository | Load/save round-trip, `replace()` atomicity, corrupt/missing data handling |
| Event dispatcher | Subscribers fire after mutations; failed actions emit no domain events |
| Action execution | Full flows: consume → reload → stun/death save → status on sheet in repo |
| Queue rebuilding | Round-wrap reorder with dirty initiative; remove combatant repairs queue |
| End-to-end creation | Template parse → factory → draft confirm → appears in queue with rolled initiative |
| Clear encounter | NPCs/Vehicles removed, PCs kept, queue repaired |

**Suggested files:**
- `src/tests/integration/repository.test.ts`
- `src/tests/integration/action-flow.test.ts`
- `src/tests/integration/encounter-lifecycle.test.ts`

**Pattern:** Reuse `MemoryRepository` from `initiative.test.ts` / `actions.test.ts`; wire real services + dispatcher; assert on repository state and event side effects.

**Not in step 10:** UI/React tests (architecture lists them separately as behaviour-focused smoke tests).

---

### Step 11 — UI polishing ⬜

**Goal:** Meet acceptance criteria in Architecture Parts 6–7 (§267, §325) and general UX polish.

**Likely tasks:**

1. **Visual polish**
   - Active card highlighting, spacing, responsive toolbar wrapping
   - Template block card styling refinements
   - Editor validation banner / field-level errors

2. **Behaviour gaps to verify against spec**
   - Sidebar responsive with many combatants (architecture target: 100+; virtualisation is explicitly deferred)
   - Disabled button tooltips consistently applied
   - Expanded/collapsed state purely UI-local (already intended — verify)

3. **Optional (Release 1 — architecture says optional)**
   - Keyboard shortcuts beyond focus navigation (§268)

4. **Manual test checklist** (Architecture §397)
   - Full combat flow: manual add, template add, edit, copy, delete, clear
   - PC, NPC, Vehicle each through editor and sidebar
   - Round-wrap initiative behaviour
   - Template block button in Reading + Live Preview

---

### Step 12 — Hit/Damage Calculator ✅ IMPLEMENTED

**Goal:** Replace placeholders with real Cyberpunk 2020 NPC/Vehicle hit and damage resolution.

**Working plan:** [`docs/hit-damage-calculator-implementation-plan.md`](docs/hit-damage-calculator-implementation-plan.md)

The Damage Engine spec is an **extension** of the existing architecture, not a replacement. Encounter persistence, CombatSheet components, `RuleTables` / `IDamageThresholdService`, `CombatAction` / `CombatActionExecutor`, and round-wrap initiative stay as they are. The engine adds hit resolution, cybernetics, Acid/Fire `OngoingEffect`s, pending-effect `Next` gating, and the inline calculator UI.

**Implementation phases (see the plan for details):**

0. Domain extensions + persistence migration (`isDead`, Hard SP, `ongoingEffects`; drop `AcidTracker` / `FireTracker`)
1. Canonical Regular-hit pipeline + transactional commit
2. Damage-type registry and remaining types
3. Cybernetics + Vehicles
4. Stun / Death / Pain Editor / Taser
5. Ongoing effects + combined `Next` workflow
6. Calculator / menus / result messages / compact status
7. Wiring, events, logging

**Integration points already reserved:**

| Seam | Current | Planned |
|------|---------|--------|
| `OpenHitCalculatorAction` | Expand card + placeholder | Keep as UI-only expand; add `ResolveHitAction` for Apply |
| `IHitResolver` | Placeholder | Leave unused (attack rolls are out of scope) |
| `IDamageResolver` / `IDamageEngine` | Placeholder | Real engine under `src/services/damage/` |
| `IArmourResolver`, `IBodyLocationResolver` | Placeholder | Used inside the canonical pipeline |
| `IStunResolver`, `IDeathResolver` | Minimal d10 vs save | Shared `SaveResolver` (`roll > save` ⇒ failure) |
| Expanded card panel | “Coming in next milestone” | `HitCalculator`, Stun/Death menus, pending effects |
| `CombatAction` layer | 5 actions | Add `ResolveHit`, `ApplyOngoingEffects`; extend Stun/Death |

**Explicitly out of scope:** attack rolls, PC damage, weapon inventory, combat-log persistence, undo/redo, full critical tables, EMP/Sandevistan/Adrenal Booster mechanics.

---

## Architectural invariants (do not break)

1. `CombatSheet` is the single source of truth  
2. Templates are immutable; runtime never writes back to Markdown  
3. UI invokes actions/services — no business logic in React  
4. Rules/resolvers do not mutate state; services apply results  
5. Events fire after successful transactions only  
6. Initiative queue rebuilds at **round wrap only** when dirty  

---

## Key source locations

```
src/
  main.ts                          Plugin entry, views, commands, block processor
  plugin/PluginContext.ts          DI container (+ actionExecutor)
  domain/                          combat, sheets, status, rules, initiative
  actions/                         CombatAction*, executor, registry
  services/                        Combat, Initiative, Encounter, Template, …
  infrastructure/
    parser/                        Template parser
    obsidian/                      Views, block processor, editor open helpers
    repository/                    Encounter persistence
  ui/                              sidebar, cards, editor, context
  tests/                           Unit tests (integration folder TBD)
```

---

## Suggested resume prompt

> Continue CPxObsidian Combat Tracker from `PROGRESS.md`. Steps 1–9 are done. For the Hit/Damage Calculator, follow [`docs/hit-damage-calculator-implementation-plan.md`](docs/hit-damage-calculator-implementation-plan.md) starting at Phase 0.

---

## Release 1 definition of done (Architecture §397)

Still outstanding after steps 10–11:

- [ ] Integration tests for repository, actions, queue rebuild, encounter lifecycle  
- [ ] Manual testing confirms stable combat flow for PCs, NPCs, Vehicles  
- [ ] All practical acceptance criteria have automated tests  

Step 12 (Hit/Damage Calculator) is a **separate milestone**. Implement it from [`docs/hit-damage-calculator-implementation-plan.md`](docs/hit-damage-calculator-implementation-plan.md); it is not required for a functional tracker without combat resolution.
