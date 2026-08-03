# CP Combat Tracker (Obsidian Plugin)

Cyberpunk 2020 combat tracker for Obsidian. This repository contains the plugin source; architecture is defined in `Architecture.md` (see your vault copy).

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Obsidian](https://obsidian.md/) 1.5+
- A vault with **Community plugins** enabled

## Quick start

### 1. Install dependencies

```powershell
cd "C:\CPxObsidian Plug-in v2"
npm install
```

### 2. Build (or watch)

Development with auto-rebuild:

```powershell
npm run dev
```

One-off production build:

```powershell
npm run build
```

### 3. Link the plugin into your vault

Obsidian loads plugins from:

```
<your-vault>/.obsidian/plugins/<plugin-id>/
```

This plugin id is **`cp-combat-tracker`**. The folder must contain at least:

- `manifest.json`
- `main.js`
- `styles.css`

#### Option A — Junction (recommended for development)

Run once from an elevated or normal PowerShell session:

```powershell
.\scripts\link-to-vault.ps1 -VaultPath "C:\Users\ordob\Documents\Sync_vault"
```

Use your **vault root** — the folder you open in Obsidian — not a subfolder like `Cyberpunk/`.
If `Cyberpunk` is just a notes folder inside `Sync_vault`, the link target must still be `Sync_vault`.

This creates a directory junction so Obsidian reads directly from this project folder. Edits rebuild into the same location Obsidian uses.

#### Option B — Manual copy

Copy the entire project folder to:

```
C:\Users\ordob\Documents\Sync_vault\.obsidian\plugins\cp-combat-tracker\
```

Re-copy (or rebuild in place) after changes if not using a junction.

### 4. Enable in Obsidian

1. Open your **Sync_vault** vault in Obsidian (not a subfolder path).
2. **Settings → Community plugins → Turn off Restricted mode** / turn on community plugins.
3. On the same page, scroll to **Installed plugins** — **CP Combat Tracker** appears here.
   Local dev plugins do **not** appear under **Browse** (that list is only for the community catalog).
4. Enable **CP Combat Tracker**.
5. Click the **swords** ribbon icon, or run command **Open Combat Tracker sidebar**.

You should see the Combat Tracker sidebar with placeholder toolbar buttons and an empty encounter message.

## Project layout

Matches the architecture specification (implementation fills these in over time):

```
src/
  main.ts                 # Plugin entry, view registration
  plugin/                 # DI / plugin context
  domain/                 # Combat sheets, initiative, rules (no React)
  services/               # Application services
  infrastructure/         # Obsidian integration, parser, repository
  ui/                     # React components
  events/                 # Event dispatcher
  util/                   # Shared utilities
  constants/              # View types, enums
  tests/                  # Vitest unit tests
```

## Scripts

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `npm run dev`  | Watch build → `main.js`              |
| `npm run build`| Typecheck + production bundle        |
| `npm test`     | Run unit tests                       |

## Troubleshooting

**Plugin does not appear**

- Confirm you linked to the **vault root** (e.g. `Sync_vault`), not a subfolder like `Sync_vault/Cyberpunk`.
- Look under **Installed plugins**, not **Browse**.
- Turn off **Restricted mode** in Community plugins settings.
- Confirm the folder name under `.obsidian/plugins/` matches manifest id: `cp-combat-tracker`.
- Confirm `main.js` exists (run `npm run build`).
- Reload Obsidian (**Ctrl+R**) after the first build.

**Sidebar is blank**

- Open DevTools: **Ctrl+Shift+I** → Console for React/runtime errors.
- Reload Obsidian: **Ctrl+R** (or disable/re-enable the plugin).

**Changes not showing**

- Ensure `npm run dev` is running, or run `npm run build` after edits.
- Reload Obsidian after the first build.

## Progress

See [`PROGRESS.md`](PROGRESS.md) for implementation status (steps 1–9 complete; integration tests and UI polish remaining).

## Next implementation steps

Per `Architecture.md` §396:

1. Integration tests
2. UI polishing
3. Hit/Damage Calculator (future milestone; requires `damage-engine.md` spec)
