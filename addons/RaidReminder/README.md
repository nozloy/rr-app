# RaidReminder AddOn

## Installation

1. Download `RaidReminder.zip`.
2. Extract the archive.
3. Place the `RaidReminder` folder in:

```text
World of Warcraft\_retail_\Interface\AddOns\RaidReminder
```

4. Confirm that `RaidReminder.toc` is inside the `RaidReminder` folder.
5. Restart the game or run `/reload`.

## Commands

In game, run `/rr` or `/raidreminder`, press `Ctrl+C` in the export field, then paste the `RR2?...` string into RaidReminder.pro.
The add-on falls back to the legacy `RR1?...` format when the current region or realm cannot be encoded.

The same window checks raid readiness:

- boss lockouts for players who also have RaidReminder installed;
- enchants and empty gem sockets through the WoW inspect API, even when the inspected player does not have the add-on;
- quick filters for problem rows and players with the add-on;
- a whisper button that asks a player to fix missing enchants or empty gem sockets.

Players who cannot be inspected because of range, phase, connection, or API limits are shown as not checked instead of being counted as failed.

Run `/rraid` to open a small raid lockout table for the current character. Raid, difficulty, and boss names come from the game client locale.

The add-on list icon is `Media/RaidReminderIcon.tga`, generated from the web mark at `public/home/raid-reminder-mark.png`.

## CurseForge

Correct CurseForge archive structure:

```text
RaidReminder.zip
└─ RaidReminder/
   ├─ RaidReminder.toc
   ├─ RealmCodes.lua
   ├─ RaidReminder.lua
   ├─ Media/
   │  └─ RaidReminderIcon.tga
   └─ README.md
```
