# Local install and happy-path testing

Use this if you do **not** already have CP Combat Tracker loaded in Obsidian on this machine. It covers a first-time install from GitHub, then a set of **happy-path** journeys (the intended success flow for each feature). It does not try to cover every edge case.

**Plugin id:** `cp-combat-tracker`  
**Branch to test:** `cursor/implement-hit-damage-calculator-62ae` (PR #2)  
**Repo:** https://github.com/Ordo-bs/cp-combat-tracker

---

## A. Install locally

### A1. Prerequisites

1. Install **Node.js 18+** ([nodejs.org](https://nodejs.org/)). Confirm:

   ```bash
   node -v
   npm -v
   ```

2. Install **Obsidian 1.5+**.

3. Have an Obsidian **vault** you can open (an existing vault is fine). You need the **vault root** — the folder Obsidian opens — not a notes subfolder.

   Examples of vault roots:

   - Windows: `C:\Users\<you>\Documents\Sync_vault`
   - macOS: `~/Documents/Sync_vault`
   - Linux: `~/Documents/Sync_vault`

   If `.obsidian` is not visible inside that folder, you have the wrong directory.

### A2. Get the plugin source

In a terminal (PowerShell on Windows, Terminal on macOS/Linux):

```bash
git clone https://github.com/Ordo-bs/cp-combat-tracker.git
cd cp-combat-tracker
git fetch origin cursor/implement-hit-damage-calculator-62ae
git checkout cursor/implement-hit-damage-calculator-62ae
npm install
npm run build
```

Confirm these files exist in the project folder:

- `manifest.json`
- `main.js`
- `styles.css`

### A3. Put the plugin where Obsidian can load it

Obsidian loads community plugins from:

```text
<vault-root>/.obsidian/plugins/cp-combat-tracker/
```

That folder must contain `manifest.json`, `main.js`, and `styles.css`.

Pick **one** option.

#### Option 1 — Junction (Windows, best for development)

From the project folder in PowerShell, replace the vault path with yours:

```powershell
.\scripts\link-to-vault.ps1 -VaultPath "C:\Users\<you>\Documents\Sync_vault"
```

This makes `.obsidian/plugins/cp-combat-tracker` point at the git checkout, so rebuilds show up without copying.

If the target folder already exists and is a real directory (not a junction), rename or delete it first.

#### Option 2 — Symlink (macOS / Linux)

```bash
VAULT="$HOME/Documents/Sync_vault"   # your vault root
mkdir -p "$VAULT/.obsidian/plugins"
ln -s "$(pwd)" "$VAULT/.obsidian/plugins/cp-combat-tracker"
```

`$(pwd)` must be the plugin repo root (the folder that contains `manifest.json`).

#### Option 3 — Copy (any OS, no live rebuild)

Copy `manifest.json`, `main.js`, and `styles.css` into:

```text
<vault-root>/.obsidian/plugins/cp-combat-tracker/
```

Re-copy after every `npm run build`.

### A4. Enable in Obsidian

1. Open **that same vault root** in Obsidian (File → Open folder as vault).
2. **Settings → Community plugins**.
3. Turn **Restricted mode off**.
4. Under **Installed plugins** (not Browse), enable **CP Combat Tracker**.
5. If it does not appear: quit and reopen Obsidian, or **Ctrl/Cmd+R** to reload.
6. Click the **swords** ribbon icon, or Command palette → **Open Combat Tracker sidebar**.

You should see a right sidebar titled **Combat Tracker** with `+ Add`, `From Note`, `Previous`, `Next`, `Clear`, and an empty-encounter message.

### A5. Optional: live rebuild while testing

From the project folder:

```bash
npm run dev
```

Leave that running. After code changes, reload Obsidian (**Ctrl/Cmd+R**).

### A6. If it does not appear

- You opened a **subfolder** of the vault (e.g. `Sync_vault/Cyberpunk`) instead of the vault root.
- The plugin folder is not named exactly `cp-combat-tracker`.
- `main.js` is missing — run `npm run build` again.
- You looked under **Browse** (community catalog). Local plugins only show under **Installed plugins**.
- Restricted mode is still on.

---

## B. One-time test notes

Create these three notes in the vault. They are used by Journey 3.

### Note: `NPC - Maelstrom Ganger.md`

````markdown
# Maelstrom Ganger

```combat-sheet
type: npc
name: Maelstrom Ganger
initiativeModifier: 2
btm: -2
maximumShots: 30
remainingShots: 30
remainingMagazines: 3
baseStunSave: 8
body.head.sp: 4
body.torso.sp: 10
body.torso.isHardSp: true
body.rightArm.sp: 6
body.leftArm.cybernetic: true
body.leftArm.sdp: 25
```
````

### Note: `PC - V.md`

````markdown
# V

```combat-sheet
type: pc
name: V
initiativeModifier: 0
```
````

### Note: `Vehicle - Thorton.md`

````markdown
# Thorton

```combat-sheet
type: vehicle
name: Thorton Colby
sp: 12
sdp: 40
```
````

After saving, open **Reading view** or **Live Preview**. You should see a template card with **Add to Combat**.

---

## C. How to use these journeys

- Start from an empty encounter unless a journey says otherwise (**Clear** if needed).
- Tick the **Expected** line as you go.
- Record failures as: journey id, step, what you saw, screenshot if useful.
- Notices (toast messages at the top) are part of the expected UI.

Suggested combatants for later journeys (after Journey 2): one NPC, one PC, one Vehicle, all in the sidebar.

---

## Journey 1 — Plugin loads

**Goal:** The plugin is installed and the sidebar opens.

1. Reload Obsidian (**Ctrl/Cmd+R**).
2. Click the **swords** ribbon icon.
3. Command palette → **Open Combat Tracker sidebar**.

**Expected**

- Sidebar title is Combat Tracker.
- Buttons: `+ Add`, `From Note`, `Previous`, `Next`, `Clear`.
- Empty state is visible (no combatant cards).
- No red errors in DevTools console (**Ctrl/Cmd+Shift+I**).

---

## Journey 2 — Manual add (PC, NPC, Vehicle)

**Goal:** Create each sheet type from **+ Add** and see it in the queue.

### 2a. NPC

1. Click **+ Add**.
2. Type = **NPC**, name = `Ganger`.
3. Set BTM = `-2`, Total Damage = `0`, Base Stun Save = `8`.
4. Torso SP = `10`, check **Hard SP** on torso.
5. Click **Confirm**.

**Expected:** A card named Ganger appears. Ammo summary is visible (`Shots` / `Mags`). Buttons **Hit**, **Stun**, **Death**, `-1` / `-3` / `-10`, **Reload**.

### 2b. PC

1. **+ Add** → type **PC**, name = `V` → Confirm.

**Expected:** Card named V. **No** Hit / Stun / Death / ammo buttons.

### 2c. Vehicle

1. **+ Add** → type **Vehicle**, name = `Thorton`, SP = `12`, SDP = `40` → Confirm.

**Expected:** Card shows `SP 12 · SDP 40` and a **Hit** button. No Stun/Death/ammo.

### 2d. Edit

1. On Ganger, click **Edit**.
2. Change name to `Ganger Prime`. Close the editor.

**Expected:** Sidebar card title updates immediately.

---

## Journey 3 — Templates (From Note + note card)

**Goal:** Instantiate combatants from markdown.

### 3a. From Note button

1. Open `NPC - Maelstrom Ganger.md`.
2. In the Combat Tracker sidebar, click **From Note**.

**Expected:** A draft editor opens, already filled (name, BTM `-2`, torso SP 10, left arm cybernetic). Confirm. Card appears with a rolled initiative (not zero).

### 3b. Command

1. Keep that NPC note active.
2. Command palette → **Add combatant from current note**.

**Expected:** Another draft editor (clone from the same template). Cancel this one.

### 3c. Reading-view card

1. Open the NPC note in Reading or Live Preview.
2. Click **Add to Combat** on the template card.
3. Confirm the draft.

**Expected:** A third Ganger-style NPC is added.

### 3d. PC and Vehicle notes

Repeat **From Note** for `PC - V.md` and `Vehicle - Thorton.md`.

**Expected:** PC and Vehicle cards match the template stats (vehicle SP 12 / SDP 40).

---

## Journey 4 — Initiative, Next, Previous, round wrap

**Goal:** Queue order and deferred initiative.

Use at least two combatants (call them Alpha with high init, Bravo with lower).

1. Click each card’s **Init N** value and set:
   - Alpha pending = `20`
   - Bravo pending = `5`
2. Watch for **Initiative updates pending**.

**Expected:** Card order does **not** change yet. Values show an asterisk (e.g. `20*`).

3. Click **Next** until the last combatant is active, then **Next** once more (round wrap).

**Expected:** Queue reorders (20 before 5). Asterisks clear. First card of the new round is highlighted (`cp-card--active` / accent border).

4. Click **Previous**.

**Expected:** Highlight moves to the previous card. Order stays the new order.

---

## Journey 5 — Ammo (NPC only)

**Goal:** Consume and reload.

On an NPC with 30/30 shots and 3 mags:

1. Click **-1**, then **-3**, then **-10**.

**Expected:** Remaining shots drop 30 → 29 → 26 → 16.

2. Click **-10** until shots would go below 10; confirm **-10** disables when shots &lt; 10 (same for **-3** / **-1** when insufficient).
3. Click **Reload**.

**Expected:** Shots return to maximum; magazines decrease by 1. Reload disables at 0 magazines.

---

## Journey 6 — Regular Hit (NPC, penetrating)

**Goal:** Happy-path Hit calculator.

On Ganger: Torso SP `10`, Hard SP **on**, BTM `-2`, Total Damage `0`.

1. Click **Hit**. The card expands to the calculator.
2. Damage Type = **Regular**, Hit Location = **2–4 — Torso**, Hit Damage = `15`.
3. Click **Apply**.

**Expected**

- Notice and inline result: damage penetrates (15 &gt; 10).
- After SP: `5`, after BTM: `3` (or similar: `max(1, 5 + -2)`).
- Torso SP becomes `9` (ablated by 1).
- Total Damage increases; wound badge may change (e.g. Lightly wounded).
- A Stun Save line appears unless Pain Editor is on (`Stun Save: N vs T`).

Open **Edit** and confirm Total Damage and Torso SP / damage match the result.

---

## Journey 7 — Absorbed Hit

**Goal:** Damage that does not beat SP.

Same NPC, Torso SP now `9` (or set SP to `20` in Edit).

1. Hit → Regular → Torso → damage `5` (≤ SP) → Apply.

**Expected**

- Result says absorbed; **0** damage.
- SP **unchanged**.
- No stun line.
- Total Damage unchanged.

---

## Journey 8 — Head Hit and massive damage

**Goal:** Head ×2 and destruction.

1. Edit NPC: Head SP = `0`, BTM = `0`.
2. Hit → Regular → **1 — Head** → damage `4` → Apply.

**Expected:** Final damage `8` (head ×2). If the engine treats 8 as massive head damage, the NPC is **Dead** with no Death Save. If your BTM is not 0, use raw damage so that **after BTM and ×2** the result is at least 8.

3. On a **new living NPC**, Torso SP `0`, BTM `0`, Hit Regular Torso damage `8`.

**Expected:** Torso **destroyed** compact flag; a **Death Save vs base** is rolled; failure marks Dead.

---

## Journey 9 — Damage-type happy paths (one each)

Use a living NPC with Torso SP `10`, Soft (Hard SP **off**), BTM `0`, unless noted. Reset SP/damage in Edit between cases if needed.

| # | Type | Inputs | Expected (happy path) |
|---|---|---|---|
| 9a | Edged | Torso, 12 | Soft SP counts as 5; likely penetrates; SP −1 |
| 9b | AP | Torso, 16 | Effective SP 5; through-armor halved |
| 9c | Bypass | Torso, 8 | Ignores SP; BTM still applies |
| 9d | Explosive | Damage 12, Reduction 2 (no location) | +10 Total Damage only; no body-part SP change |
| 9e | Safety | Torso **Hard SP ≥ 10**, damage 40 | Completely ineffective |
| 9f | Hollow Point | Torso, 20 | Effective SP doubled; through ×1.5 if it penetrates |
| 9g | Half-and-Half | Torso SP 0, damage 9 | About **4** actual Total Damage; stun uses the **full** 9 |
| 9h | Stun (damage type) | Torso, 8 | Stun Save rolled; **Total Damage unchanged** |

**Expected:** Apply never errors; result text matches the type; Edit sheet matches applied numbers.

---

## Journey 10 — Stun and Death actions

**Goal:** Explicit saves, not Hit-auto saves.

1. On a living NPC, click **Stun**. Enter additional penalty `0`. Click **Roll Stun**.

**Expected:** Notice with roll vs modified save. Fail → **Stun** badge. Roll again until you **succeed** → Stun badge **clears**.

2. Click **Death** → **Roll Death Save**.

**Expected:** Fail → **Dead** badge; Hit/Stun/Death: Death (and Stun) **disabled**. Success → still alive.

3. Click **Death** on an already-dead NPC.

**Expected:** Button disabled; cannot roll.

---

## Journey 11 — Pain Editor

1. Edit NPC: enable **Pain Editor**. Total Damage `0`, Torso SP `0`.
2. Hit Regular Torso damage `6`.

**Expected:** Damage applies. **No** automatic Stun Save line.
3. Click **Stun** and roll.

**Expected:** Explicit Stun **still** runs.

---

## Journey 12 — Taser / Stun-N

1. Living biological NPC, Hit → type **Taser / Stun-N**, location Torso, extra penalty `0`. Apply.

**Expected:** Stun Save (no HP damage). Consecutive tasers on later activations of **that** NPC get a worse penalty (0, then −2, then −4).

2. Edit left arm **Cybernetic**, Hit Taser on **Left Arm**.

**Expected:** d10; on 1 or 2 the arm shows **disabled**. No Stun Save.

3. Vehicle **Hit** → Taser.

**Expected:** Error / validation; vehicle unchanged.

---

## Journey 13 — Acid, pending effects, Next blocked

**Goal:** Ongoing Acid is GM-applied, not silent.

1. Make the NPC **active** (Next/Previous until highlighted).
2. Hit → **Acid** → Torso → Apply.

**Expected:** Message that Acid starts on upcoming activations. No immediate SP eat.
3. Click **Next** around the table until this NPC is active again.

**Expected:** **Fire/Acid chips** and **Apply Effects**. **Next is disabled** (or Notice: resolve pending effects).
4. Click **Apply Effects**.

**Expected:** 1d6 Acid vs Torso SP; leftover can become body damage. Apply Effects goes away for this activation. **Next** works again.
5. Repeat activations until three Acid applications complete.

**Expected:** Effect expires; no more pending chip.

---

## Journey 14 — Fire

1. Active NPC, Hit → **Fire** → source **Molotov** → Apply.

**Expected:** Immediate whole-body resolution (dice shown); Total Damage and/or SP ablation if it penetrates average SP.

2. Hit → Fire → **Flamethrower** (no location) → Apply, then cycle **Next** until that NPC is active.

**Expected:** Pending Fire chip; Next blocked; **Apply Effects** rolls the first flamethrower pulse.

3. Hit → Fire → **Kendachi Dragon**, pick two different body parts → Apply, then Apply Effects on their turn.

**Expected:** First application hits **both** parts; later application hits **one** of them.

---

## Journey 15 — Vehicle Hit

On Thorton (SP 12, SDP 40):

1. Hit → Regular, damage `20` → Apply.

**Expected:** Penetrates Hard SP; SDP drops; SP −1. Card shows new SP/SDP.

2. Keep hitting (or Edit SDP to `2` then Hit Regular `20`) until SDP hits 0.

**Expected:** **Destroyed** badge; vehicle **stays** in the list.

3. Hit → Stun or Taser.

**Expected:** Rejected.

4. Hit → Acid (no location required for vehicle) → later Apply Effects on its turn.

**Expected:** Acid reduces SP then leftover SDP.

---

## Journey 16 — Copy, delete, Clear

1. **Copy** on an NPC.

**Expected:** Duplicate card, new id, initiative re-rolled.
2. **Delete** the copy; confirm the dialog.

**Expected:** Card gone; others remain.
3. **Clear**.

**Expected:** NPCs and Vehicles removed; **PCs remain**, PC initiative reset to 0.

---

## Journey 17 — Editor fields used by the calculator

1. Edit NPC: toggle **Hard SP** per location, **Dead**, cybernetic **SDP damage taken**.
2. Edit Vehicle: **Destroyed**.
3. Confirm PC editor has **no** old Acid/Fire round trackers.

**Expected:** Values persist when you close and reopen Edit. Dead NPC has Stun/Death disabled on the card.

---

## Journey 18 — Persistence across reload

1. Leave at least one NPC (with damage) and one PC in the encounter.
2. Reload Obsidian (**Ctrl/Cmd+R**).
3. Open Combat Tracker again.

**Expected:** Same combatants, damage, SP, initiative, and active highlight as before reload (encounter is saved with the plugin data).

---

## Suggested order (full pass)

Do these in one sitting after install:

1. Journey 1 (load)  
2. Journey 2 (manual add)  
3. Journey 3 (templates)  
4. Journey 4 (initiative)  
5. Journey 5 (ammo)  
6. Journeys 6–9 (Hit calculator)  
7. Journeys 10–12 (saves / taser)  
8. Journeys 13–14 (Acid / Fire / Next)  
9. Journey 15 (vehicle)  
10. Journeys 16–18 (lifecycle + persistence)

That sequence hits every user-facing happy path: install, three sheet types, templates, initiative, ammo, Hit types, Stun/Death, Pain Editor, Taser, pending effects, vehicles, copy/delete/clear, editor flags, and save/reload.
