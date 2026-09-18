# Contributing

Local development for the CP Combat Tracker Obsidian plugin.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Obsidian](https://obsidian.md/) 1.7.2+
- A vault with community plugins enabled

## Setup

```powershell
npm install
npm run dev
```

Production build (typecheck + minified `main.js`):

```powershell
npm run build
```

Tests and the same ESLint ruleset the community directory scanner uses:

```powershell
npm test
npm run lint
```

## Link into a vault

Obsidian loads plugins from `<vault>/.obsidian/plugins/cp-combat-tracker/`. That folder must contain `manifest.json`, `main.js`, and `styles.css`.

### Junction (recommended)

```powershell
.\scripts\link-to-vault.ps1 -VaultPath "C:\path\to\your\vault"
```

Use the vault root you open in Obsidian, not a notes subfolder.

### Manual copy

Copy this project folder to `<vault>/.obsidian/plugins/cp-combat-tracker/` and rebuild after changes.

Then **Settings → Community plugins → Installed plugins** and enable **CP Combat Tracker**. Local plugins do not appear under **Browse**. Reload Obsidian (**Ctrl+R**) after the first build.

## Layout

```
src/
  main.ts                 # Plugin entry, view registration
  plugin/                 # DI / plugin context
  domain/                 # Combat sheets, initiative, rules (no React)
  services/               # Application services
  infrastructure/         # Vault integration, parser, repository
  ui/                     # React components
  events/                 # Event dispatcher
  util/                   # Shared utilities
  constants/              # View types, enums
  tests/                  # Vitest unit tests
```

## Release

1. Bump `version` in `manifest.json` and `package.json` (semver `x.y.z` only).
2. Update `versions.json` with `"x.y.z": "minAppVersion"`.
3. Run `npm run build`, `npm test`, and `npm run lint`.
4. Tag the commit to match `manifest.json` `version` and publish a GitHub release attaching `main.js`, `manifest.json`, and `styles.css`.
