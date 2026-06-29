local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Constants.lua
ADDON_NAME = ...
EXPORT_PREFIX = "RR1?"
RR2_EXPORT_PREFIX = "RR2?"
ADDON_MESSAGE_PREFIX = "RaidReminder"
ADDON_MESSAGE_SEPARATOR = "\t"
MEDIA_PATH = "Interface\\AddOns\\RaidReminder\\Media\\"
WINDOW_FRAME_STRATA = "FULLSCREEN_DIALOG"
WINDOW_FRAME_LEVEL = 1000
EXPORT_FRAME_WIDTH = 900
EXPORT_FRAME_COMPACT_HEIGHT = 250
EXPORT_FRAME_FULL_HEIGHT = 730
RAID_CHECK_ROW_HEIGHT = 28
RAID_CHECK_WIDTH = 820
RAID_CHECK_REPLY_DELAY = 1
RAID_CHECK_REPLY_TIMEOUT = 3
RAID_LOCKOUT_ROW_HEIGHT = 22
INSPECT_TIMEOUT = 2.8
INSPECT_DELAY = 0.25
INSPECT_MAX_ATTEMPTS = 2

CLASS_CODES = {
  DEATHKNIGHT = "DK",
  DEMONHUNTER = "DH",
  DRUID = "D",
  EVOKER = "EV",
  HUNTER = "H",
  MAGE = "M",
  MONK = "MO",
  PALADIN = "P",
  PRIEST = "PR",
  ROGUE = "R",
  SHAMAN = "S",
  WARLOCK = "WL",
  WARRIOR = "WR",
}

GROUP_CODES = {
  solo = "s",
  party = "p",
  raid = "r",
}

INSTANCE_CODES = {
  arena = "a",
  none = "n",
  party = "p",
  pvp = "v",
  raid = "r",
  scenario = "s",
}

ROLE_CODES = {
  DAMAGER = "D",
  HEALER = "H",
  NONE = "N",
  TANK = "T",
}

RAID_CHECK_STATUS = {
  clean = "clean",
  hasLockout = "hasLockout",
  noAddon = "noAddon",
  pending = "pending",
  unavailable = "unavailable",
}

GEAR_CHECK_STATUS = {
  issue = "issue",
  notChecked = "notChecked",
  pending = "pending",
  ready = "ready",
}

GEAR_SCAN_MODE = {
  full = "full",
  manual = "manual",
  roster = "roster",
}

READINESS_STATUS = {
  partial = "partial",
  ready = "ready",
  notReady = "notReady",
}

STATUS_COLORS = {
  gold = { 1, 0.82, 0 },
  gray = { 0.72, 0.72, 0.68 },
  green = { 0.34, 1, 0.32 },
  red = { 1, 0.28, 0.22 },
  white = { 0.92, 0.88, 0.78 },
}

TABLE_COLUMNS = {
  { key = "character", width = 190 },
  { key = "itemLevel", width = 70 },
  { key = "lockout", width = 105 },
  { key = "enchants", width = 105 },
  { key = "gems", width = 105 },
  { key = "result", width = 135 },
  { key = "action", width = 110 },
  party = {
    { key = "character", width = 220 },
    { key = "itemLevel", width = 80 },
    { key = "enchants", width = 130 },
    { key = "gems", width = 130 },
    { key = "result", width = 150 },
    { key = "action", width = 110 },
  },
}

ENCHANT_SLOTS = {
  { slotId = 5, textKey = "slotChest" },
  { slotId = 7, textKey = "slotLegs" },
  { slotId = 8, textKey = "slotFeet" },
  { slotId = 11, textKey = "slotFinger1" },
  { slotId = 12, textKey = "slotFinger2" },
  { slotId = 16, textKey = "slotMainHand" },
  { slotId = 17, textKey = "slotOffHand", weaponOnly = true },
}

GEM_SCAN_SLOTS = {
  { slotId = 1, textKey = "slotHead" },
  { slotId = 2, textKey = "slotNeck" },
  { slotId = 3, textKey = "slotShoulder" },
  { slotId = 5, textKey = "slotChest" },
  { slotId = 6, textKey = "slotWaist" },
  { slotId = 7, textKey = "slotLegs" },
  { slotId = 8, textKey = "slotFeet" },
  { slotId = 9, textKey = "slotWrist" },
  { slotId = 10, textKey = "slotHands" },
  { slotId = 11, textKey = "slotFinger1" },
  { slotId = 12, textKey = "slotFinger2" },
  { slotId = 13, textKey = "slotTrinket1" },
  { slotId = 14, textKey = "slotTrinket2" },
  { slotId = 15, textKey = "slotBack" },
  { slotId = 16, textKey = "slotMainHand" },
  { slotId = 17, textKey = "slotOffHand" },
}

ITEM_LEVEL_SLOTS = {
  1,
  2,
  3,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
}

ADDON_LOCALE = GetLocale and GetLocale() or "enUS"
