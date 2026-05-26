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

In game, run `/rr` or `/raidreminder`, press `Ctrl+C` in the export field, then paste the `RR1?...` string into `/banners/import`. The same window also renders a compact `RRQ1?...` QR code for mobile import.

Run `/rraid` to open a small raid lockout table for the current character. Raid, difficulty, and boss names come from the game client locale.

The add-on list icon is `Media/RaidReminderIcon.tga`, generated from the web mark at `public/home/raid-reminder-mark.png`.

## CurseForge

Correct CurseForge archive structure:

```text
RaidReminder.zip
└─ RaidReminder/
   ├─ RaidReminder.toc
   ├─ RaidReminder.lua
   ├─ RaidReminderQr.lua
   ├─ Media/
   │  └─ RaidReminderIcon.tga
   └─ README.md
```
