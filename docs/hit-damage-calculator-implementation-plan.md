# Hit / Damage Calculator — Implementation Plan

**Status:** Ready for implementation  
**Milestone:** Step 12 (replaces the current Hit/Damage placeholder)  
**Sources:** `Architecture - damage-engine.md` (gameplay/rules), Architecture Reconciliation Decision Sheet (integration decisions), current `src/` codebase  
**Authoritative foundation:** existing Combat Tracker architecture (CombatSheet aggregate, components, `CombatAction` / `CombatActionExecutor`, `EncounterRepository` persistence, `RuleTables` lookup, initiative/round-wrap)

This plan tells a coding agent **what to build, where to put it, and which existing seams to reuse**. It does not redesign the plugin.

---

## 0. Non-negotiable contract

```
The Damage Engine determines what should happen.
The Combat Service commits what happened.
The Repository stores the resulting state.
Events announce what happened.
React displays what happened.
```

Never reverse these responsibilities.

| Keep from the current solution | Accept from the Damage Engine |
|---|---|
| Encounter persistence via `EncounterRepository` / `plugin.saveData()` | Full NPC + Vehicle hit/damage resolution |
| `CombatSheet` + component structure (`ammo`, `body`, `damage`, `trackers`) | Generic `OngoingEffect` (replaces `AcidTracker` / `FireTracker`) |
| Derived Stun/Death saves (not independently persisted) | Explicit NPC `isDead` gameplay state |
| `RuleTables.ts` / `IDamageThresholdService` as threshold lookup | Cybernetic SDP / disabled / destroyed thresholds |
| `CombatAction` + `CombatActionExecutor` | Pending-effect GM workflow |
| Initiative reorder **only at round wrap** | Vehicle damage + destruction |
| Events after successful commit only | Structured `ResolutionResult` + message builder |
| React is presentation-only | Damage-type registry + canonical pipeline |

**Do not:**

- Flatten `NpcCombatSheet` into the Damage Engine’s conceptual top-level interface.
- Create a second damage/action/event pipeline beside the existing one.
- Put game rules in React.
- Use event subscribers to sequence armour → BTM → stun → death → fire.
- Implement attack-hit determination (`IHitResolver` stays unused; a hit is an established fact).
- Persist independently editable `modified` stun/death saves.
- Make encounters non-persistent. “Combat remains ephemeral” means the engine does not add campaign/session/combat-log persistence — it does **not** remove `EncounterRepository`.

---

## 1. Current solution — integration map

The placeholder milestone is already wired. Replace implementations; do not invent parallel entry points.

| Existing seam | File | What to do |
|---|---|---|
| Hit button expands card | `src/ui/cards/CombatCard.tsx` | Replace placeholder panel with `HitCalculator` |
| `OpenHitCalculatorAction` | `src/actions/actions/OpenHitCalculatorAction.ts` | Keep as UI-only expand action |
| Stun / Death buttons | `src/ui/cards/CombatCardParts.tsx` | Open inline menus; pass optional stun penalty |
| `PerformStunSaveAction` / `PerformDeathSaveAction` | `src/actions/actions/` | Implement full rules; keep `CombatAction` shape |
| `IStunResolver` / `IDeathResolver` | `src/domain/rules/resolvers/` | Replace placeholders with real `SaveResolver` |
| `IDamageEngine` and other stubs | `src/domain/rules/placeholders.ts` | Retire unused hit-roll stubs; real engine lives under `src/services/damage/` |
| `DamageThresholdService` | `src/services/DamageThresholdService.ts` | Keep; resolvers must call it / `RuleTables` |
| `DiceService` | `src/services/DiceService.ts` | Extend with `roll` / `rollMany`; keep `d10()` |
| `CombatService` | `src/services/CombatService.ts` | Own the transaction: validate → resolve → apply state changes → persist → events |
| `InitiativeService.nextTurn()` | `src/services/InitiativeService.ts` | Extend with pending-effect gate; do not change round-wrap semantics |
| `PluginContext` | `src/plugin/PluginContext.ts` | Wire Damage Engine, registry, new actions |
| Editor placeholder | `src/ui/editor/CombatSheetEditor.tsx` | Add Hard SP, Dead, Destroyed, drop Acid/Fire tracker editors |
| Template schema | `src/infrastructure/parser/templateSchema.ts` | Optional `isHardSp`; no runtime-only fields |
| Persistence | `src/infrastructure/repository/` | Keep; bump schema version + migrate missing fields |

`IHitResolver` in `placeholders.ts` is **attack roll** resolution. That is explicitly out of scope. Do not implement it as the Damage Engine.

---

## 2. Decisions already made (do not re-litigate)

From the reconciliation sheet:

1. **Persistence — KEEP BASELINE.** Continue `loadData` / `saveData`. New fields persist as part of the encounter.
2. **Acid/Fire — ACCEPT `OngoingEffect`.** Delete `AcidTracker` / `FireTracker` rather than running both.
3. **NPC structure — KEEP BASELINE components.** Map Damage Engine fields onto `DamageComponent`, `BodyComponent` / `BodyPart`, `CyberneticProperties`, `TrackerComponent`.
4. **Thresholds — RECONCILE.** `WoundResolver` / `StunResolver` / `DeathResolver` orchestrate; they must not copy tables. Update `RuleTables.ts` **values** to match the Damage Engine tables (see §4.3).
5. **Modified saves — KEEP BASELINE.** Compute via `DamageThresholdService.derive()`.
6. **Actions — RECONCILE.** New work uses existing `CombatAction<TData>` + `CombatActionContext`. Request data lives on the action instance (same pattern as `ConsumeAmmoAction`).
7. **Next + pending effects — ACCEPT + RECONCILE.** One combined `Next` sequence (see §8).
8. **`isDead` — ACCEPT.** Gameplay flag on `DamageComponent`, not an encounter lifecycle state. Dead NPCs stay in the queue until the GM deletes them.
9. **Cybernetics — RECONCILE.** Extend `CyberneticProperties`; do not add a second `CyberneticState` tree.
10. **Vehicle ongoing effects — ACCEPT.** Vehicles use `ongoingEffects`, not a dedicated acid tracker.

### Ambiguities resolved for implementation

These were not fully specified by both documents together. Use these defaults:

| Topic | Decision |
|---|---|
| Stun penalty above 40, death penalty above 56 | `RuleTables` lookup returns a **rules error**; do not invent extra rows. Wound state for 13+ remains Mortal. |
| `RuleTables` 13–16 death penalty currently `-1` | Change to `0` to match the Damage Engine (death penalty starts at 17–20). |
| Vehicle `isHardSp` | Constant `true`. Do not persist a user-editable flag. |
| Cybernetic `sdp` | Remaining SDP (current editor/template meaning). Add `sdpDamageTaken` for threshold checks. Applying `n` damage: `sdp -= n` (floor at 0), `sdpDamageTaken += n`. |
| `BodyPart.acid` | Keep as a **derived/synced** display flag: true when any Acid effect is attached to that location. Source of truth is `ongoingEffects`. |
| PC Acid/Fire trackers | Replace with `ongoingEffects` for model unity. **Do not** implement PC hit resolution (still out of scope). PC editor loses the old tracker fields. |
| `StatusType.DEAD` vs `damage.isDead` | `damage.isDead` is source of truth. Sync `StatusType.DEAD` when committing so `StatusBar` keeps working. Same pattern: vehicle `isDestroyed` ↔ `StatusType.DESTROYED`. |
| `StatusType.ON_FIRE` / `ACID` | Sync from presence of Fire/Acid effects on commit. Do not let the editor independently toggle them once effects exist (optional later: editor can add/remove effects). |
| Molotov | One-shot whole-body Fire resolved **immediately** on Apply (spec gives no multi-activation schedule). |
| Other Fire sources / Acid | Create `OngoingEffect`s whose **first application is the target’s next activation** (tests: “effect begins next activation”). API’s extra fire is the same. |
| Flamethrower “Activation 1/2/3” | Count target activations after the hit, not the attacker’s. |
| Shotgun concussion REF DV 10 | Reminder message only. CombatSheet has no REF. |
| Stun button on already-stunned NPC | Allowed. Success **clears** Stunned. |
| Stun/Death on dead NPC | Both buttons disabled. |
| Vehicle Hit | Add Hit on vehicle cards (not only NPC). Stun/Taser/Death remain invalid for vehicles. |
| `IDamageResolver` placeholder | Replace with the real pipeline; do not keep a second resolver that returns `{ damage, location }`. |

---

## 3. Target architecture (as integrated, not as a greenfield sketch)

```
React Combat Card
        │  user action (Hit / Stun / Death / Apply Effects / Next)
        ▼
CombatAction  (existing CombatAction + CombatActionExecutor)
        │
        ▼
CombatService transaction
        │  load sheet → validate → DamageEngine.resolve* → apply StateChanges
        │  → derived saves/wounds → repository.replace → publish events
        ▼
DamageEngine  (pure; no React, no Obsidian, no repository)
        ├── DamageValidationService
        ├── DamageTypeRegistry + DamageTypeRule
        ├── HitLocationResolver
        ├── ArmourResolver
        ├── BtmResolver
        ├── WoundResolver          → IDamageThresholdService
        ├── SaveResolver           → shared roll > save ⇒ failure
        ├── CyberneticResolver
        ├── OngoingEffectService
        ├── TaserHistoryService
        └── DiceService
        ▼
ResolutionResult + StateChanges
        ▼
ResolutionMessageBuilder → Notice / inline message (presentation only)
```

Dependency direction (must hold):

```
UI → Actions → Application services → Domain services/rules → Domain
```

Forbidden: Domain → React / Obsidian; Rule → repository; Rule → UI.

---

## 4. Phase 0 — Domain model extensions (no rules yet)

Goal: CombatSheet can represent everything the engine needs, old encounters still load, tests/factory/editor still compile.

### 4.1 Map conceptual types onto existing components

Do **not** add `NpcCombatSheet.btm` / `.totalDamage` / `.bodyParts` as new top-level fields. Use:

| Damage Engine concept | Existing home |
|---|---|
| `btm`, `totalDamage`, `stunSave.base`, `deathSave.base` | `DamageComponent` |
| `stunSave.modified`, `deathSave.modified`, wound state | `DamageThresholdService.derive()` — never stored |
| `isDead` | **Add** `DamageComponent.isDead: boolean` (default `false`) |
| `bodyParts` | `BodyComponent` (`BodyPart[]`) |
| `sp`, `damageTaken`, `isDestroyed` | `BodyPart.sp`, `.damage`, `.destroyed` |
| `isHardSp` | **Add** `BodyPart.isHardSp: boolean` (default `false`) |
| `isCybernetic` + `CyberneticState` | `BodyPart.cybernetic` + `CyberneticProperties` |
| `sdp`, `isDisabled`, cyberware flags | `CyberneticProperties` (existing) |
| `sdpDamageTaken` | **Add** `CyberneticProperties.sdpDamageTaken: number` (default `0`) |
| `hasSandevistan` / Pain Editor / Adrenal Booster | `TrackerComponent` (Pain Editor is used; others stored, no engine behaviour) |
| `ongoingEffects` | **Add** `ongoingEffects: OngoingEffect[]` on NPC `DamageComponent`, Vehicle sheet, and PC sheet |
| Vehicle `sp` / `sdp` / `isDestroyed` | Vehicle sheet; **add** `isDestroyed: boolean` (default `false`) |
| Activation sequence / taser window | `RuntimeMetadata` (not displayed) |

### 4.2 Replace AcidTracker / FireTracker

Remove:

- `AcidTracker` / `FireTracker` types and factories
- `DamageComponent.acidTracker` / `fireTracker`
- `BodyPart.acidTracker`
- `PcCombatSheet.acidTracker` / `fireTracker`
- `VehicleCombatSheet.acidTracker`
- Editor “Trackers” / “Acid Tracker” sections that edit those fields
- Factory initializers

Add domain types in `src/domain/damage/` (or `src/domain/sheets/ongoingEffects.ts` if you prefer to keep sheet types together):

```ts
type OngoingEffectType = "acid" | "fire";

interface OngoingEffectBase {
  id: string;
  type: OngoingEffectType;
  targetId: string;
  location?: BodyLocation;          // omitted = whole body
  createdAtActivation: number;
  nextApplicationActivation: number;
  applicationsRemaining: number;
  lastProcessedActivation?: number;
}

interface AcidEffect extends OngoingEffectBase {
  type: "acid";
}

interface FireEffect extends OngoingEffectBase {
  type: "fire";
  source: FireSource;
  locations?: BodyLocation[];       // Kendachi Dragon: two parts
}

type OngoingEffect = AcidEffect | FireEffect;
```

PC damage resolution stays out of scope; PCs still get the collection so the model is one shape.

### 4.3 Runtime metadata

Extend `RuntimeMetadata`:

```ts
activationSequence: number;          // incremented when this combatant becomes active
taserHitActivations: number[];       // target activations that received Taser/Stun-N (keep last 3+)
```

Defaults: `0` and `[]`. Not shown in UI.

### 4.4 Persistence migration

Keep `EncounterRepository`. Bump `PersistedEncounterData.version` to `2`.

On `load()`, if a sheet is missing new fields, fill defaults:

- `isHardSp: false`
- `isDead: false`
- `isDestroyed: false`
- `ongoingEffects: []`
- `sdpDamageTaken: 0`
- `activationSequence: 0`
- `taserHitActivations: []`

Drop unknown legacy tracker objects. Do not fail plugin load because an old encounter lacks Damage Engine fields.

### 4.5 Templates and editor

Templates remain immutable and must not grow runtime-only state (`isDead`, effects, activation, taser history).

Allowed template additions:

- `body.*.isHardSp` (and flat `body.head.isHardSp`) — default false
- Vehicle templates unchanged except they already have `sp` / `sdp`

Editor (`CombatSheetEditor` + `BodyPartEditor`):

- Hard SP checkbox per body part
- NPC Dead checkbox bound to `damage.isDead` (or keep it action-only and show read-only; prefer editable so GM can correct state)
- Vehicle Destroyed checkbox bound to `isDestroyed`
- Remove Acid/Fire tracker editors
- Keep cybernetic SDP / flags; add read-only or editable `sdpDamageTaken` (editable is useful for GM correction)

### 4.6 Factory

`CombatSheetFactory.createDraft` / `clone` / `instantiateFromTemplate` / `bodyFromTemplate` must initialize every new field. Clone copies effects and damage state as-is (clone is a new instance id).

### 4.7 Phase 0 tests

- Factory drafts include new defaults
- Template parse: `isHardSp` round-trip; missing key → false
- Repository load of a version-1 fixture gains defaults and still has participants
- Existing unit tests still pass

---

## 5. Phase 1 — Core pipeline (Regular hits only)

Goal: one canonical resolver that can apply a Regular biological hit, absorbed hit, BTM, Head ×2, massive damage, and commit atomically.

### 5.1 DiceService

Extend without breaking initiative rolling:

```ts
interface IDiceService {
  d10(): number;                     // keep; implement as roll(10).total
  coin(): boolean;
  roll(sides: number): DiceRollResult;
  rollMany(count: number, sides: number): DiceRollResult;
}

interface DiceRollResult {
  notation: string;
  rolls: number[];
  total: number;
}
```

For `1d6/2`: roll 1d6, then `floorDamage(total / 2)`. Never divide individual dice. No `Math.random()` in rule code.

### 5.2 Helpers

- `floorDamage(value: number): number` — `Math.floor`; no implicit coercion
- `mapHitLocation(n: 1–10): BodyLocation` — 1 head, 2–4 torso, 5 right arm, 6 left arm, 7–8 right leg, 9–10 left leg
- Display helper: `"1 — Head"`, `"2–4 — Torso"`, etc.

### 5.3 RuleTables alignment

Keep **one** table in `src/domain/rules/RuleTables.ts`. Update values:

| Total damage | Wound | Stun penalty | Death penalty |
|---:|---|---:|---:|
| 0 | None | 0 | 0 |
| 1–4 | Light | 0 | 0 |
| 5–8 | Serious | -1 | 0 |
| 9–12 | Critical | -2 | 0 |
| 13–16 | Mortal | -3 | **0** (was -1) |
| 17–20 | Mortal | -4 | -1 |
| 21–24 | Mortal | -5 | -2 |
| 25–28 | Mortal | -6 | -3 |
| 29–32 | Mortal | -7 | -4 |
| 33–36 | Mortal | -8 | -5 |
| 37–40 | Mortal | -9 | -6 |
| 41–44 | Mortal | **error** | -7 |
| 45–48 | Mortal | **error** | -8 |
| 49–52 | Mortal | **error** | -9 |
| 53–56 | Mortal | **error** | -10 |
| 57+ | Mortal | **error** | **error** |

Implementation options (pick one, keep lookup centralized):

- Split stun/death lookup so wound can still be derived when stun penalty is undefined, **or**
- `lookupDamageRule` returns `{ wound, stunPenalty?: number, deathPenalty?: number }` and `DamageThresholdService.derive()` fails validation when a required penalty is missing.

Automatic Hit-workflow Stun/Death must surface that error rather than inventing `-9` forever.

Extend existing `src/tests/initiative.test.ts` RuleTables cases (or move them to `src/tests/rule-tables.test.ts`).

### 5.4 Typed request / result

Put types in `src/domain/damage/`:

```ts
interface DamageRequest {
  targetId: string;
  damageType: DamageType;
  rawDamage?: number;
  hitLocation?: BodyLocation;
  additionalPenalty?: number;
  damageReduction?: number;
  fireSource?: FireSource;
  fireLocations?: BodyLocation[];    // Kendachi Dragon: two parts
}

interface ResolutionResult {
  success: boolean;
  summary: string;
  events: /* domain event descriptors, published only after commit */;
  stateChanges: StateChange[];
  diceRolls: DiceRollResult[];
  damage?: DamageOutcome;
  stun?: StunOutcome;
  death?: DeathOutcome;
  disabledBodyParts: BodyLocation[];
  destroyedBodyParts: BodyLocation[];
  massiveDamage?: MassiveDamageOutcome;
  pendingEffects?: string[];
  errors: string[];
}
```

`StateChange` should be a discriminated union the CombatService can apply (`setTotalDamage`, `setBodyPart`, `setStatus`, `addOngoingEffect`, `setVehicleSdp`, …). The engine **returns** changes; it does not mutate the repository.

### 5.5 Canonical biological pipeline (Regular)

Implement in `src/services/damage/DamageResolver.ts`:

```
rawDamage
→ location (required)
→ effective SP (Hard/Soft from that part; Regular: unmodified)
→ penetrate iff rawDamage > effectiveSP     // equal SP = absorbed
→ damageThroughArmor = raw - effectiveSP
→ type modifiers (none for Regular)
→ BTM: damageAfterBtm = throughArmor + btm
→ finalDamage = max(1, damageAfterBtm) if penetrated else 0
→ Head biological: finalDamage = floor(finalDamage * 2)  // after BTM
→ apply to bodyPart.damage and damage.totalDamage
→ if penetrated: SP -= 1 (Hard and Soft)
→ massive damage (non-cybernetic):
    finalDamage >= 8 → part.destroyed
      Head → isDead = true (no Death Save)
      other → automatic Death Save vs **base** death save (roll > save ⇒ dead)
    cumulative part.damage >= 12 → part.destroyed (no extra save)
→ if penetrated and not Pain Editor: Stun Save vs **modified** stun save
→ Death Save from Hit workflow only when massive-damage rule says so
→ derived wound / modified saves from RuleTables
```

Absorbed hit: 0 damage, no BTM, no stun, no massive, no ablation.

All of the above is **one** resolution object, then **one** `repository.replace`.

### 5.6 DamageEngine + CombatService transaction

```ts
interface DamageEngine {
  resolveHit(sheet, request, activationContext): ResolutionResult;
  resolveStun(sheet, request): ResolutionResult;
  resolveDeath(sheet, request): ResolutionResult;
  resolveOngoingEffect(sheet, effectId, activation): ResolutionResult;
}
```

`CombatService.applyResolution(targetId, result)` (name flexible):

1. If `!result.success` → no mutation, no events
2. Apply `stateChanges` to a cloned encounter
3. Re-derive wound display values (they are not stored)
4. Sync statuses (`DEAD`, `STUNNED`, `ON_FIRE`, `ACID`, `DESTROYED`)
5. `repository.replace`
6. Publish listed events + `CombatSheetUpdated` / `EncounterChanged`

### 5.7 Actions

Add `ActionType.ResolveHit` and `ResolveHitAction`. `OpenHitCalculatorAction` stays UI-only.

Phase 1 may only accept `damageType: "regular"` for NPCs; other types fail validation.

### 5.8 Phase 1 tests (`src/tests/damage/`)

Must cover Damage Engine §§77.1–77.5 and §81:

- Absorbed (`damage == SP`), penetrate (`SP+1`), ablation only on penetrate
- BTM 0 / -1 / -5, min 1 on penetrate, BTM ignored if absorbed
- `floorDamage`: 7/2=3, 5×1.5=7
- Head ×2 after BTM; 4 pre-head → 8; 8+ head → dead, no save
- Massive: 7 no destroy; 8 destroy; 8 torso → death save vs **base**; cumulative 12 destroy without save
- Example §86: 12 vs SP 8, BTM -2 → 2 damage, SP 7
- Example §87: 12 vs SP 15 → absorbed
- Invariants: totals ≥ 0, SP ≥ 0, dead cannot be revived by stun, destroyed stays destroyed
- Failed validation: no repo change, no events

Use a fake `DiceService` with scripted rolls.

---

## 6. Phase 2 — Damage-type registry

Goal: one pipeline, many `DamageTypeRule`s. Adding a type = rule + metadata + tests, not a new resolver class tree.

### 6.1 Contract

```ts
interface DamageTypeRule {
  modifyArmour(ctx: ArmourContext): ArmourContext;
  modifyDamageThroughArmor(ctx: DamageThroughArmorContext): DamageThroughArmorContext;
  modifyFinalDamage(ctx: FinalDamageContext): FinalDamageContext;
  getSpecialEffects(ctx: DamageContext): DamageEffect[];
}

interface DamageTypeDefinition {
  id: DamageType;
  label: string;
  requiresDamage: boolean;
  requiresHitLocation: boolean;
  requiresAdditionalPenalty: boolean;
  requiresDamageReduction: boolean;
  requiresFireSource: boolean;
  requiresTwoFireLocations?: boolean;  // Kendachi Dragon
  supportedTargets: Array<"NPC" | "Vehicle">;
}
```

UI reads `DamageTypeDefinition`. Do not encode field visibility as a large React switch.

Register all types even if some rules are stubbed until their phase — better: implement rules in this phase for types that share the standard pipeline, and leave Acid/Fire/Taser/Stun-damage/Explosive special paths to Phase 2b/4/5 as listed below.

### 6.2 Standard-pipeline types (implement here)

| Type | Armour | Through-armour | Notes |
|---|---|---|---|
| Regular | — | — | Already in Phase 1 |
| Edged | Soft `/2`; Hard unchanged | — | |
| Mono | Soft `/3`; Hard `*2/3` | — | |
| AP | `/2` | `/2` | |
| Shotgun slug | `/2` | Soft `/2`; Hard unchanged | |
| Shotgun flechette | `/4` | `/4` | |
| Hollow point | `*2` | `*1.5` | |
| Dual-purpose | SP>0: `/2` then through `/2`; SP==0: through `*1.5` | | |
| Arrow broadhead | Soft `/2`; Hard normal | Soft `*2` | |
| Arrow spinner | Soft `/2`; Hard normal | Soft `*3` | |
| Bypass | Treat SP as 0 | BTM still applies; Head ×2 still applies | Safety still wins |
| API | same as AP | plus pending Fire effect if penetrate | Fire application in Phase 5; this phase can attach the effect |

Rounding: every division/multiply uses `floorDamage`.

### 6.3 Special-path types (still this phase, dedicated branches inside resolver)

These skip or wrap the standard pipeline; they must **not** each reimplement BTM/head/ablation independently — call shared steps.

**Explosive**

- No hit location, no body-part SP, no body-part massive
- Inputs: `rawDamage`, `damageReduction`
- `damage = floor(raw - reduction)` applied to `totalDamage` only
- Wound / save penalties update; automatic Stun Save unless Pain Editor

**Stun (damage type)**

- Run full hypothetical calculation (SP, type mods, BTM, Head ×2)
- Use hypothetical total for stun penalty
- Roll Stun Save; set/clear Stunned
- **Do not** change `totalDamage` or body-part damage
- Pain Editor suppresses this automatic stun (same as Hit workflow)

**Half-and-half**

- Full calculation for stun (use full final damage)
- Apply `floor(full / 2)` as actual damage

**Safety**

- If location Hard SP ≥ 10 **or** cybernetic/vehicle SDP ≥ 30 → completely ineffective (no calc). Precedence over Bypass.
- Else `effectiveSP = SP * 2`, `damageThroughArmor = damage * 3`, then normal BTM/final

**Shotgun concussion**

- Soft: cannot reduce more than 50% → `through = max(floor(raw/2), raw - softSP)` (Hard reduces to 0)
- Reminder: DV 10 REF save vs knockdown (message only)

**Bypass** — standard pipeline with SP forced to 0; not a skip of BTM/Head.

### 6.4 Phase 2 tests

Per type, at least: Soft SP, Hard SP, absorbed, penetrating, rounding, ablation. Plus type-specific cases from the spec (Safety vs Bypass, dual-purpose SP==0, half-and-half stun vs applied, stun type does not mutate damage, explosive no location).

---

## 7. Phase 3 — Cybernetics and Vehicles

### 7.1 Cybernetic pipeline

If `BodyPart.cybernetic`:

```
raw → effective SP (type mods apply) → through armour
→ NO BTM, NO Head ×2, NO massive, NO totalDamage, NO wound/stun/death
→ apply through-armour to SDP (remaining) + sdpDamageTaken
→ disabled if sdpDamageTaken >= 20 + rams*10 + joints*5 + myomar*5
→ destroyed if sdpDamageTaken >= 30 + same bonuses
→ destroyed implies disabled; do not clear disabled
→ normal SP ablation on penetrate only
```

Thresholds stack. EMP shielding is stored, unused.

Taser immediate disable (1–2) is Phase 4.

Example §88: 20 vs SP 10, SDP 25, BTM -3 → SDP 15, no totalDamage change.

### 7.2 Vehicles

- No locations, no BTM, no stun/death/wounds
- SP always Hard
- Supported: all types except `stun` and `taserStunN` (reject those)
- `damage → SP handling → type mods → SDP`; `SDP <= 0` → `isDestroyed = true` (remain in encounter)
- Bypass: ignore SP, apply raw to SDP
- Acid/Fire in Phase 5

Hit UI on vehicle cards: no location field; types that require location are hidden via `supportedTargets`.

### 7.3 Phase 3 tests

§77.6 and §77.8. Include stacked cyberware thresholds and “cybernetic head does not ×2”.

---

## 8. Phase 4 — Stun, Death, Pain Editor, Taser

### 8.1 Shared SaveResolver

One comparison, reused everywhere:

```
roll > saveValue  → failure
roll <= saveValue → success
```

Replace `PlaceholderStunResolver` / `PlaceholderDeathResolver` with this. Existing action tests that mock `d10() = 10` vs default save 8 still fail the save.

### 8.2 Explicit Stun action

Extend `PerformStunSaveAction` with optional `additionalPenalty: number` (default 0).

```
target = modifiedStunSave + additionalPenalty
roll d10
failure → Stunned = true
success → Stunned = false   // clears if already stunned
```

Pain Editor does **not** suppress this action. Disabled if `isDead`. Available to living NPCs including already-stunned.

UI: Stun button opens inline `StunMenu` (optional penalty + Apply), not an immediate roll.

### 8.3 Explicit Death action

```
target = modifiedDeathSave
roll d10
failure → isDead = true
success → isDead unchanged
```

Button disabled if already dead. UI: inline `DeathMenu` (confirm/apply).

### 8.4 Automatic Hit-workflow saves

- Penetrating biological damage (and Explosive, Half-and-half actual path’s stun using full damage, Stun damage type): Stun Save vs modified, unless Pain Editor
- Massive non-head: Death Save vs **base** only
- Massive head: dead, no save
- Cybernetic / absorbed / vehicle: no auto stun/death

### 8.5 Taser / Stun-N

Unsupported for vehicles.

Biological location:

```
modifiedStunSave + additionalPenalty + consecutiveTaserPenalty
→ d10 vs that target
```

Consecutive penalty from **target** activations (not global rounds):

| Pattern | Penalty |
|---|---|
| First taser in window | 0 |
| Taser on consecutive next activation | -2 |
| Third consecutive | -4 |
| Gap (activation with no taser) then taser | -2 (window restarts as “second in a new streak” per spec example: act4 none, act5 → -2) |

Store enough history to evaluate a three-activation window. Success/fail does **not** reset the penalty. Record the activation when the hit is applied.

Cybernetic location: no Stun Save; d10; on 1 or 2 set `disabled = true` immediately (bypass SDP threshold). No totalDamage.

### 8.6 Phase 4 tests

- Save comparison once
- Pain Editor: auto stun skipped; explicit Stun still rolls
- Dead: Death/Stun actions rejected; no events
- Taser history example in spec §79
- Taser cybernetic 1–2 disable

---

## 9. Phase 5 — Ongoing effects and Next

### 9.1 Combined Next sequence (canonical)

Preserve round-wrap reorder. Insert pending-effect checks; do not create a second workflow.

```
Next requested
  → if current active combatant has unresolved effects for this activation
       → reject (Next stays disabled / Notice)
  → if wrapping to new round AND queue.dirty
       → commit pending initiatives, sort, dirty=false   // existing behaviour
  → select next combatant (existing wrap/advance)
  → increment THAT combatant’s runtimeMetadata.activationSequence
  → persist + TurnAdvanced
  → if the new active combatant has effects with nextApplicationActivation <= their sequence
       → UI shows pending indicators; Next disabled until Apply Effects
```

Previous is unchanged (no effect auto-resolve). Do not apply damage merely because a card highlighted.

`InitiativeService.nextTurn()` should take (or call) a pending-effect query; keep sort/commit code as-is.

### 9.2 Apply Effects action

`ApplyOngoingEffectsAction`:

For each pending effect on the active combatant, in a **single** transaction batch:

1. Skip if already processed this activation
2. If target dead → remove remaining effects, stop batch
3. Roll and resolve (Acid / Fire)
4. `lastProcessedActivation = current`
5. Decrement `applicationsRemaining`; remove if 0

GM must click Apply. No silent subscriber.

### 9.3 Acid

Hit UI: type + location, **no** damage input. Creates an Acid effect: 1d6 for **3** target activations, first on next activation. Multiple effects may stack on the same part.

Each application:

```
acidRemaining = roll 1d6
spLoss = min(acidRemaining, currentSP)
SP -= spLoss
acidRemaining -= spLoss
if remaining > 0:
  NPC biological: remaining + BTM, min 1 if it would be 0, apply as normal body damage
  Vehicle: remaining → SDP (no BTM)
```

Hard and Soft SP treated the same. No normal “penetrate then -1 SP” ablation — Acid eats SP directly.

Death cancels all effects on the target. Destroyed part: only remove effects **attached to that part**.

### 9.4 Fire

`FireSource`: `flamethrower` | `cyberFlamethrower` | `molotov` | `flare` | `incendiaryGrenade` | `kendachiDragon`

| Source | Dice schedule | Scope | Soft SP protect | Soft ablation on penetrate |
|---|---|---|---|---|
| Flamethrower | 2d10, then 1d10, then 1d6 | Whole body | Soft SP ≥ 15 else no protection | -2 |
| Cyber flamethrower | 2d6, then floor(1d6/2) twice | Whole body | ≥ 15 | -2 |
| Incendiary grenade | 4d6 × 3 activations | Whole body | (use same ≥15 unless later spec says otherwise) | -2 |
| Kendachi Dragon | Act1: 2d6 both selected parts; Act2: 1d6 one random of those two | Two parts required | ≥ 15 | -2 |
| Molotov | 2d10 once, immediate | Whole body | (same whole-body rules) | per Fire ablation |
| Flare | floor(1d6/2) × 3 | Selected part | — | per Fire ablation |

**Whole-body Fire**

1. Roll damage **once**
2. Average current SP of all six parts (include cybernetic), `floorDamage`
3. Penetrate iff damage > average SP
4. If not: no damage, no ablation
5. If yes: through average SP → NPC BTM → add to `totalDamage` only (not six body-part damage records)
6. Ablate **all** parts: Hard -1, Soft -2 when the source uses Fire ablation 2; otherwise Hard -1 / Soft -1
7. Vehicle: apply to SDP, SP stays Hard

**Specific-part Fire** (Kendachi, Flare): resolve vs that part’s SP; biological penetrate → totalDamage; cybernetic → SDP; Fire ablation only on penetrate.

API (Phase 2) attaches a Fire-like effect: next act 1d6, following `floor(1d6/2)`, armour bypassed, applied to the hit biological part.

### 9.5 Pending-effects UI

On the **active** card:

```
🔥 Fire × n   🧪 Acid × m
[ Apply Effects ]
```

Next disabled until resolved. After apply, the button is unavailable for this activation.

Collapsed cards stay compact; expanded cards can list effect details.

### 9.6 Phase 5 tests

§78: next-activation start, no double apply, three Acid apps, Acid stack, Fire stack, separate part Fire, whole-body Fire (example §91 average 8, roll 10 penetrates), death removes effects, Next rejected while pending, Apply then Next allowed.

---

## 10. Phase 6 — UI

Presentation only. No damage math in React.

### 10.1 Cards

**NPC:** Hit / Stun / Death as now, plus pending-effects strip when active.

**Vehicle:** Hit (calculator). No Stun/Death/Taser. Show Destroyed. Optional pending Acid/Fire.

**PC:** still no Hit calculator.

Hit expands the card inline (existing behaviour). Editor pane remains CombatSheet editing only.

### 10.2 HitCalculator

Render fields from `DamageTypeDefinition`:

| Type | Fields |
|---|---|
| Regular and most | Damage type, Hit location, Hit damage |
| Explosive | Type, Hit damage, Damage reduction |
| Acid | Type, Hit location |
| Fire | Type, Fire source; location(s) only for Kendachi/Flare |
| Taser/Stun-N | Type, Hit location, Additional stun penalty |
| Vehicle | Hide location; hide unsupported types |

Hit location control: accept `1`–`10` **or** named part; convert via helper before `DamageRequest`.

Apply → `ResolveHitAction` → show `ResolutionMessage` from `ResolutionResult` (already computed).

### 10.3 StunMenu / DeathMenu

Inline on the card, not a modal editor. Notices may still summarize rolls.

Disable Death (and Stun) when `isDead`. Vehicle: no menus.

### 10.4 Status display

Collapsed: compact badges — Stunned, On Fire, Dead, Destroyed, wound abbreviation, compact body-part Disabled/Destroyed indicators (e.g. “RA dest”).

Wound tooltip (NPC):

- Serious: `-2 REF`
- Critical: `REF, INT, COOL / 2`
- Mortal: `REF, INT, COOL / 3`

Do not modify stats (they are not on CombatSheet).

### 10.5 ResolutionMessageBuilder

Pure function: `ResolutionResult → string`. Examples in spec §62. No recalculation of SP/BTM/saves.

### 10.6 Next button

`SidebarToolbar` Next: disabled when the active combatant has unresolved pending effects (in addition to “no combatants”).

### 10.7 Styles

Add classes for calculator fields, pending-effect chips, compact body-part flags. Follow existing `cp-card__*` / `cp-editor__*` patterns in `styles.css`.

### 10.8 UI tests

Dynamic field presence per damage type (can be unit tests of a `getVisibleFields(definition)` helper so we do not need a React renderer in Vitest). Optional smoke: Apply with invalid input shows error and does not call persist.

---

## 11. Phase 7 — Wiring, events, logging, docs

### 11.1 PluginContext

Construct:

- `DamageTypeRegistry` with all rules
- `DamageEngine`
- `DamageValidationService`
- Pass engine into `CombatActionContext` / `CombatService`

Remove placeholder stun/death classes from production wiring.

### 11.2 Events (after commit only)

Add as needed (names may match existing style):

`CombatantDamaged`, `BodyPartDamaged`, `BodyPartDisabled`, `BodyPartDestroyed`, `ArmorAblated`, `StunStateChanged`, `DeathStateChanged`, `WoundStateChanged`, `OngoingEffectAdded`, `OngoingEffectResolved`, `OngoingEffectRemoved`, `VehicleDestroyed`

Do **not** subscribe these to run more rules.

### 11.3 Logging

Debug via existing `ILogger`, gated, e.g.:

```
[DamageEngine] target=… type=Regular location=TORSO raw=12 sp=8 penetrated=true throughArmor=4 btm=-2 final=2
```

No debug dumps in the card UI.

### 11.4 Docs

- Update `PROGRESS.md` Step 12 to in progress / done as phases land
- Update `README.md` “Next implementation steps” when the calculator ships
- Keep this plan as the working checklist

---

## 12. Suggested file layout

Exact names may vary; dependency direction must not.

```
src/domain/damage/
  DamageTypes.ts
  DamageRequest.ts
  DamageResult.ts
  OngoingEffect.ts
  FireSource.ts
  HitLocation.ts              # 1–10 mapping + labels
  StateChange.ts
  floorDamage.ts

src/services/damage/
  DamageEngine.ts
  DamageResolver.ts
  ArmourResolver.ts
  BtmResolver.ts
  WoundResolver.ts            # wraps DamageThresholdService
  SaveResolver.ts
  CyberneticResolver.ts
  OngoingEffectService.ts
  TaserHistoryService.ts
  DamageValidationService.ts
  DamageTypeRegistry.ts
  ResolutionMessageBuilder.ts
  rules/
    RegularRule.ts
    EdgedRule.ts
    MonoRule.ts
    ApRule.ts
    SlugRule.ts
    ExplosiveRule.ts
    StunRule.ts
    ApiRule.ts
    DualPurposeRule.ts
    HollowPointRule.ts
    HalfAndHalfRule.ts
    SafetyRule.ts
    FlechetteRule.ts
    ConcussionRule.ts
    BroadheadRule.ts
    SpinnerRule.ts
    AcidRule.ts
    FireRule.ts
    TaserStunNRule.ts
    BypassRule.ts

src/actions/actions/
  ResolveHitAction.ts
  ApplyOngoingEffectsAction.ts
  PerformStunSaveAction.ts    # extend
  PerformDeathSaveAction.ts   # extend

src/ui/cards/
  HitCalculator.tsx
  StunMenu.tsx
  DeathMenu.tsx
  PendingEffects.tsx
  ResolutionMessage.tsx
  BodyPartStatusStrip.tsx     # compact disabled/destroyed

src/tests/damage/
  armour.test.ts
  btm.test.ts
  rounding.test.ts
  head.test.ts
  massive-damage.test.ts
  cybernetic.test.ts
  vehicle.test.ts
  <each-damage-type>.test.ts
  ongoing-effects.test.ts
  taser-history.test.ts
  next-pending-effects.test.ts
  validation.test.ts
  message-builder.test.ts
```

---

## 13. Validation rules (before any mutation)

- Integers: damage, reduction, penalties — non-negative where specified; penalties may be negative
- Hit location required iff definition says so
- Fire source required for Fire; Kendachi needs **two** distinct parts; Flare needs one
- Stun/Taser invalid for Vehicle
- Death invalid if `isDead`
- Unsupported type for target → error
- Stun penalty table miss (damage > 40) → rules error on any path that needs a stun penalty

Invalid request: no state changes, no events.

---

## 14. Implementation order for a coding agent

Work in PRs/commits that match phases so tests stay green:

0. Domain + migration + editor/factory/template (`isHardSp`, `isDead`, `ongoingEffects`, drop trackers)
1. DiceService + floorDamage + RuleTables fix + Regular NPC pipeline + ResolveHitAction + fake dice tests
2. Registry + remaining damage types except Acid/Fire/Taser application details
3. Cybernetic + Vehicle
4. Stun/Death menus + Pain Editor + Taser history
5. Ongoing effects + Next gate + Apply Effects
6. HitCalculator / messages / compact status / vehicle Hit
7. Wire PluginContext, events, logging, update PROGRESS.md

Do not start UI until Phase 1 tests pass. Do not implement Fire UI before the effect model exists.

Each phase: unit tests first or with the code; `npm test` and `npm run build` must pass before moving on.

---

## 15. Acceptance criteria (Definition of Done)

Copied from the Damage Engine spec, applied to this codebase:

- [ ] NPC Hit works for all defined damage types
- [ ] Vehicle Hit works for all supported types; Stun/Taser rejected
- [ ] Hit location accepts numeric 1–10 and names
- [ ] Hard/Soft SP per body part
- [ ] BTM applied; absorbed hits stay 0; penetrating min 1
- [ ] All fractions round down via `floorDamage`
- [ ] SP ablation only after penetration (Fire/Acid follow their own ablation rules)
- [ ] Head ×2 biological only; cybernetic head excluded
- [ ] Massive damage + cumulative 12
- [ ] Cybernetic SDP, stacked modifiers, no totalDamage/stun/death
- [ ] `isDead` explicit; dead NPCs remain until removed
- [ ] Wound and save penalties from `RuleTables` only
- [ ] Pain Editor suppresses automatic Hit stun only
- [ ] Explicit Stun always rolls; clears stun on success
- [ ] Death disabled when dead
- [ ] Acid and Fire stack; GM must Apply; Next blocked while pending
- [ ] Taser history uses target activations; cybernetic 1–2 disable
- [ ] Results report penetration, damage, stun, death, disabled, destroyed, massive when relevant
- [ ] No game-rule calculations in React
- [ ] Mutations transactional; events after commit
- [ ] Encounter persistence unchanged in mechanism; new fields migrate
- [ ] Initiative still reorders only at round wrap
- [ ] Component architecture preserved (no flattened NpcCombatSheet)

---

## 16. Out of scope (do not sneak in)

- Attack rolls / whether the attack hits
- PC damage resolution
- Weapon inventory
- Full REF/INT/COOL modification
- Critical injury tables beyond specified destruction
- Combat log persistence, undo/redo
- Network sync, multi-encounter
- EMP shielding / Sandevistan / Adrenal Booster mechanics
- Automatic GM decisions

---

## 17. Risk notes

- **Transactional apply:** today `PerformStunSaveAction` calls `setCombatantStatus` which persists immediately. Hit resolution must not do stun-save persist then death-save persist. Prefer one `CombatService` method that applies the full `StateChange[]`.
- **Mutable encounter objects:** services currently mutate `repository.get()` in place then `replace`. Keep that pattern **or** clone-then-replace, but never persist an in-between Hit.
- **Next + dirty queue:** pending-effect reject must happen **before** wrap-commit so a blocked Next does not consume the round-wrap reorder.
- **Fake dice in tests:** script `roll` / `rollMany`, not only `d10`, once Fire/Acid exist.
- **Message builder:** easy to accidentally recompute damage in the UI — keep it formatting-only and unit-test strings from fixture results.
