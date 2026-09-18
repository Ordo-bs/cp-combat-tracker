# CP Combat Tracker

Track Cyberpunk 2020 combat inside your vault: initiative, combat sheets, hit/damage resolution, status effects, and reusable templates.

This is an unofficial fan tool. It is not affiliated with R. Talsorian Games or CD Projekt.

## Install

1. In Obsidian, open **Settings → Community plugins**.
2. Turn on community plugins if they are disabled.
3. Choose **Browse**, search for **CP Combat Tracker**, and install it.
4. Enable the plugin.

Until the plugin is listed in the community directory, you can also install it from this repository: download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub release](https://github.com/Ordo-bs/cp-combat-tracker/releases) into `.obsidian/plugins/cp-combat-tracker/`, then enable it under **Installed plugins**.

Requires Obsidian 1.7.2 or later. The plugin does not use Node or Electron APIs, so it can run on mobile. Phone layouts are cramped; a tablet or desktop is recommended.

## Use

1. Open the **combat tracker** from the swords ribbon icon, or run the command **Open combat tracker sidebar**.
2. Choose **+ Add** to create a PC, NPC, or vehicle combat sheet.
3. Roll or edit initiative, then use **Next** / **Previous** to walk the round.
4. On a combatant's card, apply hits, stun/death saves, ammo, and speedware (Sandevistan, adrenal booster).
5. Click **Edit** on a card to change the sheet. **Clear** removes NPCs and vehicles and keeps player characters.

Encounter state is stored in plugin data for the current vault. Nothing is sent over the network.

### Combat sheet templates

Put a `combat-sheet` fenced block in a note. In Reading or Live Preview, the block becomes a card with **Add to combat** and **Edit and add to combat**.

```combat-sheet
version: 1
sheetType: NPC
name: Boosterganger
initiativeModifier: 0
btm: -2
baseStunSave: 8
maximumShots: 30
body.head.sp: 0
body.torso.sp: 4
```

From the sheet editor, **Copy template** writes a block to the clipboard so you can paste it into a note.

## Privacy

- Combat data stays in the vault (plugin `data.json` and your notes).
- There is no telemetry and no network use.
- **Copy template** uses the system clipboard (`navigator.clipboard`) only when you click that button.

## Support

Issues and feature requests: [github.com/Ordo-bs/cp-combat-tracker](https://github.com/Ordo-bs/cp-combat-tracker).

Developers: see [CONTRIBUTING.md](CONTRIBUTING.md).
