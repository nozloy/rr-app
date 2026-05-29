local ADDON_NAME = ...
local EXPORT_PREFIX = "RR1?"
local ADDON_MESSAGE_PREFIX = "RaidReminder"
local ADDON_MESSAGE_SEPARATOR = "\t"
local MEDIA_PATH = "Interface\\AddOns\\RaidReminder\\Media\\"
local WINDOW_FRAME_STRATA = "FULLSCREEN_DIALOG"
local WINDOW_FRAME_LEVEL = 1000
local EXPORT_FRAME_WIDTH = 900
local EXPORT_FRAME_COMPACT_HEIGHT = 250
local EXPORT_FRAME_FULL_HEIGHT = 730
local RAID_CHECK_ROW_HEIGHT = 28
local RAID_CHECK_WIDTH = 820
local RAID_CHECK_REPLY_DELAY = 1
local RAID_CHECK_REPLY_TIMEOUT = 3
local RAID_LOCKOUT_ROW_HEIGHT = 22
local INSPECT_TIMEOUT = 2.8
local INSPECT_DELAY = 0.25
local INSPECT_MAX_ATTEMPTS = 2

local frame
local editBox
local raidCheckLabel
local raidCheckTargetText
local raidCheckHeader
local raidCheckContent
local raidCheckScrollFrame
local raidCheckStatus
local raidCheckRows = {}
local raidCheckState
local raidCheckRequestSerial = 0
local addonMessagePrefixRegistered = false
local raidCheckShowProblemsOnly = false
local raidCheckShowAddonOnly = false
local raidCheckProblemFilter
local raidCheckAddonFilter
local raidCheckNoRaidPanel
local raidCheckSummary = {}
local raidCheckExportPanel
local raidCheckTablePanel
local raidCheckEventFrame
local inspectTooltip
local inspectQueue = {
  active = nil,
  queue = {},
  token = nil,
}
local raidLockoutFrame
local raidLockoutContent
local raidLockoutStatus
local raidLockoutRows = {}
local raidLockoutEventFrame

local CLASS_CODES = {
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

local GROUP_CODES = {
  solo = "s",
  party = "p",
  raid = "r",
}

local INSTANCE_CODES = {
  arena = "a",
  none = "n",
  party = "p",
  pvp = "v",
  raid = "r",
  scenario = "s",
}

local ROLE_CODES = {
  DAMAGER = "D",
  HEALER = "H",
  NONE = "N",
  TANK = "T",
}

local RAID_CHECK_STATUS = {
  clean = "clean",
  hasLockout = "hasLockout",
  noAddon = "noAddon",
  pending = "pending",
  unavailable = "unavailable",
}

local GEAR_CHECK_STATUS = {
  issue = "issue",
  notChecked = "notChecked",
  pending = "pending",
  ready = "ready",
}

local READINESS_STATUS = {
  partial = "partial",
  ready = "ready",
  notReady = "notReady",
}

local STATUS_COLORS = {
  gold = { 1, 0.82, 0 },
  gray = { 0.72, 0.72, 0.68 },
  green = { 0.34, 1, 0.32 },
  red = { 1, 0.28, 0.22 },
  white = { 0.92, 0.88, 0.78 },
}

local TABLE_COLUMNS = {
  { key = "character", width = 190 },
  { key = "itemLevel", width = 70 },
  { key = "lockout", width = 105 },
  { key = "enchants", width = 105 },
  { key = "gems", width = 105 },
  { key = "result", width = 135 },
  { key = "action", width = 110 },
}

local ENCHANT_SLOTS = {
  { slotId = 5, textKey = "slotChest" },
  { slotId = 7, textKey = "slotLegs" },
  { slotId = 8, textKey = "slotFeet" },
  { slotId = 11, textKey = "slotFinger1" },
  { slotId = 12, textKey = "slotFinger2" },
  { slotId = 16, textKey = "slotMainHand" },
  { slotId = 17, textKey = "slotOffHand", weaponOnly = true },
}

local GEM_SCAN_SLOTS = {
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

local ITEM_LEVEL_SLOTS = {
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

local ADDON_LOCALE = GetLocale and GetLocale() or "enUS"
local ADDON_TEXT = {
  enGB = {
    action = "Action",
    addonPlayers = "With add-on",
    addonSummary = "Players with add-on",
    boss = "Boss",
    bossesKilled = "Killed bosses",
    character = "Character",
    checking = "Checking...",
    cleanLockout = "Clean lockout",
    cleanSummary = "Clean lockout",
    close = "Close",
    copy = "Copy",
    difficulty = "Difficulty",
    emptySocket = "Empty Socket",
    enchantOk = "OK",
    enchants = "Enchants",
    enchantSummary = "Missing enchants",
    export = "Export",
    exportHint = "Press Ctrl+C to copy the selected string, then paste it into RaidReminder.pro.",
    exportTitle = "Service export",
    filterAddon = "Only players with add-on",
    filterProblems = "Only problems",
    gems = "Gems",
    gemsOk = "OK",
    gemSummary = "Missing gems",
    hasLockout = "Has lockout",
    itemLevel = "iLVL",
    killed = "Killed",
    loading = "Loading...",
    lockout = "Lockout",
    missingEnchants = "Missing enchants",
    missingGems = "Missing gems",
    noAddon = "No add-on",
    noRaidGroup = "Join a raid group to check raid members.",
    noRaidLockouts = "No current raid lockouts were found.",
    noRaidTarget = "Stand inside the raid instance as the raid leader to check this raid.",
    notChecked = "Not checked",
    notReadyStatus = "Not ready",
    partialStatus = "Partial readiness",
    raid = "Raid",
    raidCheckTitle = "Raid lockout check",
    raidLeaderMark = "RL",
    raidReadinessNoRaid = "Export is available. Join a raid group to check readiness.",
    raidReadinessTitle = "Raid readiness check",
    raidTarget = "Checking %s.",
    readyStatus = "Ready",
    refresh = "Refresh",
    result = "Result",
    rowCount = "%d boss rows from current raid lockouts.",
    slotBack = "Back",
    slotChest = "Chest",
    slotFeet = "Feet",
    slotFinger1 = "Ring 1",
    slotFinger2 = "Ring 2",
    slotHands = "Hands",
    slotHead = "Head",
    slotLegs = "Legs",
    slotMainHand = "Main hand",
    slotNeck = "Neck",
    slotOffHand = "Off hand",
    slotShoulder = "Shoulder",
    slotTrinket1 = "Trinket 1",
    slotTrinket2 = "Trinket 2",
    slotWaist = "Waist",
    slotWrist = "Wrist",
    status = "Status",
    unknown = "Unknown",
    unlocked = "Not killed",
    unavailable = "Raid lockout API is unavailable in this client.",
    whisper = "Whisper",
    whisperMissingEnchants = "Missing enchants",
    whisperMissingGems = "Empty gem sockets",
    whisperNoIssues = "No missing enchants or gems were found.",
    whisperPrefix = "RaidReminder check:",
  },
  enUS = {
    action = "Action",
    addonPlayers = "With add-on",
    addonSummary = "Players with add-on",
    boss = "Boss",
    bossesKilled = "Killed bosses",
    character = "Character",
    checking = "Checking...",
    cleanLockout = "Clean lockout",
    cleanSummary = "Clean lockout",
    close = "Close",
    copy = "Copy",
    difficulty = "Difficulty",
    emptySocket = "Empty Socket",
    enchantOk = "OK",
    enchants = "Enchants",
    enchantSummary = "Missing enchants",
    export = "Export",
    exportHint = "Press Ctrl+C to copy the selected string, then paste it into RaidReminder.pro.",
    exportTitle = "Service export",
    filterAddon = "Only players with add-on",
    filterProblems = "Only problems",
    gems = "Gems",
    gemsOk = "OK",
    gemSummary = "Missing gems",
    hasLockout = "Has lockout",
    itemLevel = "iLVL",
    killed = "Killed",
    loading = "Loading...",
    lockout = "Lockout",
    missingEnchants = "Missing enchants",
    missingGems = "Missing gems",
    noAddon = "No add-on",
    noRaidGroup = "Join a raid group to check raid members.",
    noRaidLockouts = "No current raid lockouts were found.",
    noRaidTarget = "Stand inside the raid instance as the raid leader to check this raid.",
    notChecked = "Not checked",
    notReadyStatus = "Not ready",
    partialStatus = "Partial readiness",
    raid = "Raid",
    raidCheckTitle = "Raid lockout check",
    raidLeaderMark = "RL",
    raidReadinessNoRaid = "Export is available. Join a raid group to check readiness.",
    raidReadinessTitle = "Raid readiness check",
    raidTarget = "Checking %s.",
    readyStatus = "Ready",
    refresh = "Refresh",
    result = "Result",
    rowCount = "%d boss rows from current raid lockouts.",
    slotBack = "Back",
    slotChest = "Chest",
    slotFeet = "Feet",
    slotFinger1 = "Ring 1",
    slotFinger2 = "Ring 2",
    slotHands = "Hands",
    slotHead = "Head",
    slotLegs = "Legs",
    slotMainHand = "Main hand",
    slotNeck = "Neck",
    slotOffHand = "Off hand",
    slotShoulder = "Shoulder",
    slotTrinket1 = "Trinket 1",
    slotTrinket2 = "Trinket 2",
    slotWaist = "Waist",
    slotWrist = "Wrist",
    status = "Status",
    unknown = "Unknown",
    unlocked = "Not killed",
    unavailable = "Raid lockout API is unavailable in this client.",
    whisper = "Whisper",
    whisperMissingEnchants = "Missing enchants",
    whisperMissingGems = "Empty gem sockets",
    whisperNoIssues = "No missing enchants or gems were found.",
    whisperPrefix = "RaidReminder check:",
  },
  ruRU = {
    action = "Действие",
    addonPlayers = "С аддоном",
    addonSummary = "Участников с аддоном",
    boss = "Босс",
    bossesKilled = "Убитые боссы",
    character = "Участник",
    checking = "Проверка...",
    cleanLockout = "Чистое кд",
    cleanSummary = "Чистое КД",
    close = "Закрыть",
    copy = "Копировать",
    difficulty = "Сложность",
    emptySocket = "Пустое гнездо",
    enchantOk = "OK",
    enchants = "Чанты",
    enchantSummary = "Без чантов",
    export = "Экспорт",
    exportHint = "Нажмите Ctrl+C, чтобы скопировать выделенную строку для RaidReminder.pro.",
    exportTitle = "Экспорт для сервиса",
    filterAddon = "Только игроки с аддоном",
    filterProblems = "Только проблемы",
    gems = "Камни",
    gemsOk = "OK",
    gemSummary = "Без камней",
    hasLockout = "Есть кд",
    itemLevel = "iLVL",
    killed = "Убит",
    loading = "Загрузка...",
    lockout = "КД",
    missingEnchants = "Без чантов",
    missingGems = "Нет камней",
    noAddon = "Нет аддона",
    noRaidGroup = "Вступите в рейдовую группу, чтобы проверить участников.",
    noRaidLockouts = "Текущие рейдовые сохранения не найдены.",
    noRaidTarget = "Встаньте рейдлидером внутри рейда, чтобы проверить это кд.",
    notChecked = "Не проверен",
    notReadyStatus = "Не готов",
    partialStatus = "Неполная готовность",
    raid = "Рейд",
    raidCheckTitle = "Проверка кд рейда",
    raidLeaderMark = "РЛ",
    raidReadinessNoRaid = "Экспорт доступен. Для проверки готовности вступите в рейд.",
    raidReadinessTitle = "Проверка готовности рейда",
    raidTarget = "Проверяем %s.",
    readyStatus = "Готов",
    refresh = "Обновить",
    result = "Итог",
    rowCount = "Строк боссов из текущих рейдовых сохранений: %d.",
    slotBack = "Спина",
    slotChest = "Грудь",
    slotFeet = "Ступни",
    slotFinger1 = "Кольцо 1",
    slotFinger2 = "Кольцо 2",
    slotHands = "Кисти рук",
    slotHead = "Голова",
    slotLegs = "Ноги",
    slotMainHand = "Правая рука",
    slotNeck = "Шея",
    slotOffHand = "Левая рука",
    slotShoulder = "Плечи",
    slotTrinket1 = "Аксессуар 1",
    slotTrinket2 = "Аксессуар 2",
    slotWaist = "Пояс",
    slotWrist = "Запястья",
    status = "Статус",
    unknown = "Неизвестно",
    unlocked = "Не убит",
    unavailable = "API рейдовых сохранений недоступен в этом клиенте.",
    whisper = "Шепнуть",
    whisperMissingEnchants = "Нет чантов",
    whisperMissingGems = "Пустые гнезда",
    whisperNoIssues = "Не найдено проблем с чантами или камнями.",
    whisperPrefix = "Проверка RaidReminder:",
  },
}

local function BringExportFrameToFront()
  if not frame then
    return
  end

  frame:SetFrameStrata(WINDOW_FRAME_STRATA)
  frame:SetFrameLevel(WINDOW_FRAME_LEVEL)

  if frame.SetToplevel then
    frame:SetToplevel(true)
  end

  if frame.Raise then
    frame:Raise()
  end
end

local function UrlEncode(value)
  value = tostring(value or "")
  value = value:gsub("\n", "\r\n")
  value = value:gsub("([^%w%-_%.~])", function(character)
    return string.format("%%%02X", string.byte(character))
  end)

  return value
end

local function AddParam(params, key, value)
  if value == nil or value == "" then
    return
  end

  table.insert(params, key .. "=" .. UrlEncode(value))
end

local function SafeCall(callback)
  if type(callback) ~= "function" then
    return nil
  end

  local ok, result = pcall(callback)
  if ok then
    return result
  end

  return nil
end

local function LocalText(key, fallback)
  local value = _G[key]
  if type(value) == "string" and value ~= "" then
    return value
  end

  return fallback
end

local function AddonText(key)
  local localeText = ADDON_TEXT[ADDON_LOCALE] or ADDON_TEXT.enUS
  return localeText[key] or ADDON_TEXT.enUS[key] or key
end

local function SetTextColor(fontString, colorName)
  local color = STATUS_COLORS[colorName] or STATUS_COLORS.white
  fontString:SetTextColor(color[1], color[2], color[3])
end

local function GetClassColor(classFile)
  local color = RAID_CLASS_COLORS and RAID_CLASS_COLORS[classFile]
  if color then
    return color.r or 1, color.g or 1, color.b or 1
  end

  return 0.92, 0.88, 0.78
end

local function JoinList(values, separator)
  if not values or #values == 0 then
    return ""
  end

  return table.concat(values, separator or ", ")
end

local function CountList(values)
  if type(values) ~= "table" then
    return 0
  end

  return #values
end

local function SetFrameShown(frameToSet, isShown)
  if not frameToSet then
    return
  end

  if isShown then
    frameToSet:Show()
  else
    frameToSet:Hide()
  end
end

local function PlayRaidReminderSound(soundName)
  if not PlaySound or not SOUNDKIT then
    return
  end

  local sound = SOUNDKIT[soundName]
  if sound then
    PlaySound(sound)
  end
end

local function RegisterSpecialFrame(frameName)
  if type(frameName) ~= "string" or frameName == "" or not UISpecialFrames then
    return
  end

  for _, existingFrameName in ipairs(UISpecialFrames) do
    if existingFrameName == frameName then
      return
    end
  end

  table.insert(UISpecialFrames, frameName)
end

local function BringRaidLockoutFrameToFront()
  if not raidLockoutFrame then
    return
  end

  raidLockoutFrame:SetFrameStrata(WINDOW_FRAME_STRATA)
  raidLockoutFrame:SetFrameLevel(WINDOW_FRAME_LEVEL)

  if raidLockoutFrame.SetToplevel then
    raidLockoutFrame:SetToplevel(true)
  end

  if raidLockoutFrame.Raise then
    raidLockoutFrame:Raise()
  end
end

local function GetPlayerSpec()
  if not GetSpecialization or not GetSpecializationInfo then
    return nil, nil
  end

  local specializationIndex = GetSpecialization()
  if not specializationIndex then
    return nil, nil
  end

  local _, specName, _, _, specRole = GetSpecializationInfo(specializationIndex)
  return specName, specRole
end

local function NormalizeRole(role)
  if role == "TANK" or role == "HEALER" or role == "DAMAGER" then
    return role
  end

  return "NONE"
end

local function CompactClass(classFile)
  return CLASS_CODES[classFile] or classFile
end

local function CompactRole(role)
  return ROLE_CODES[NormalizeRole(role)] or "N"
end

local function CompactGroupType(groupType)
  return GROUP_CODES[groupType] or "s"
end

local function CompactInstanceType(instanceType)
  return INSTANCE_CODES[instanceType] or instanceType
end

local function GetUnitRole(unit, playerSpecRole)
  local role = UnitGroupRolesAssigned and UnitGroupRolesAssigned(unit) or "NONE"

  if (not role or role == "NONE") and UnitIsUnit and UnitIsUnit(unit, "player") then
    role = playerSpecRole
  end

  return NormalizeRole(role)
end

local function SplitFullName(fullName)
  if type(fullName) ~= "string" or fullName == "" then
    return nil, nil
  end

  local name, realm = fullName:match("^([^-]+)%-(.+)$")
  if name and name ~= "" then
    return name, realm
  end

  return fullName, nil
end

local function GetUnitNameAndRealm(unit, rosterName)
  local guid = UnitGUID and UnitGUID(unit)
  if guid and GetPlayerInfoByGUID then
    local _, _, _, _, _, guidName, guidRealm = GetPlayerInfoByGUID(guid)
    if guidName and guidName ~= "" then
      local parsedGuidName, parsedGuidRealm = SplitFullName(guidName)
      guidName = parsedGuidName or guidName
      guidRealm = guidRealm and guidRealm ~= "" and guidRealm or parsedGuidRealm
      if guidRealm then
        return guidName, guidRealm
      end
    end
  end

  local rosterPlayerName, rosterRealm = SplitFullName(rosterName)
  if rosterPlayerName and rosterPlayerName ~= "" then
    rosterRealm = rosterRealm and rosterRealm ~= "" and rosterRealm or nil
    if rosterRealm then
      return rosterPlayerName, rosterRealm
    end
  end

  local unitName, unitRealm
  if UnitFullName then
    unitName, unitRealm = UnitFullName(unit)
  end

  if (not unitName or unitName == "") and UnitName then
    unitName, unitRealm = UnitName(unit)
  end

  local parsedName, parsedRealm = SplitFullName(unitName)
  local name = parsedName or unitName
  local realm = unitRealm and unitRealm ~= "" and unitRealm or parsedRealm

  if name and name ~= "" and (not realm or realm == "") then
    local isLocalRealm = UnitIsUnit and UnitIsUnit(unit, "player")
    if (not isLocalRealm) and UnitRealmRelationship and LE_REALM_RELATION_SAME then
      isLocalRealm = UnitRealmRelationship(unit) == LE_REALM_RELATION_SAME
    end

    if isLocalRealm then
      realm = GetRealmName and GetRealmName() or nil
    end
  end

  return name, realm
end

local function CompactRealmName(realm)
  if type(realm) ~= "string" then
    return nil
  end

  realm = realm:gsub("%s+", "")
  if realm == "" then
    return nil
  end

  return realm
end

local function BuildCharacterKey(name, realm)
  if type(name) ~= "string" or name == "" then
    return nil
  end

  realm = CompactRealmName(realm)
  if realm then
    return name .. "-" .. realm
  end

  return name
end

local function BuildCharacterKeyFromFullName(fullName)
  local name, realm = SplitFullName(fullName)
  return BuildCharacterKey(name, realm)
end

local function GetPlayerCharacterKey()
  local name, realm
  if UnitFullName then
    name, realm = UnitFullName("player")
  end

  if not name or name == "" then
    name = UnitName and UnitName("player") or nil
  end

  return BuildCharacterKey(name, realm)
end

local function IsSenderPlayer(sender)
  local senderKey = BuildCharacterKeyFromFullName(sender)
  local playerKey = GetPlayerCharacterKey()

  if senderKey and playerKey and senderKey == playerKey then
    return true
  end

  local senderName = SplitFullName(sender)
  local playerName = UnitName and UnitName("player") or nil
  return senderName and playerName and senderName == playerName
end

local function GetDisplayCharacterName(name, realm)
  if type(name) ~= "string" or name == "" then
    return AddonText("unknown")
  end

  realm = CompactRealmName(realm)
  if realm then
    return name .. "-" .. realm
  end

  return name
end

local function CleanAddonMessageField(value)
  value = tostring(value or "")
  return value:gsub(ADDON_MESSAGE_SEPARATOR, " ")
end

local function BuildAddonMessage(...)
  local parts = {}
  for index = 1, select("#", ...) do
    parts[index] = CleanAddonMessageField(select(index, ...))
  end

  return table.concat(parts, ADDON_MESSAGE_SEPARATOR)
end

local function SplitAddonMessage(message)
  local parts = {}
  message = tostring(message or "") .. ADDON_MESSAGE_SEPARATOR

  for part in message:gmatch("([^" .. ADDON_MESSAGE_SEPARATOR .. "]*)" .. ADDON_MESSAGE_SEPARATOR) do
    table.insert(parts, part)
  end

  return parts
end

local function RegisterAddonMessages()
  if addonMessagePrefixRegistered then
    return
  end

  if C_ChatInfo and C_ChatInfo.RegisterAddonMessagePrefix then
    addonMessagePrefixRegistered = C_ChatInfo.RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX) ~= false
  elseif RegisterAddonMessagePrefix then
    addonMessagePrefixRegistered = RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX) ~= false
  end
end

local function SendRaidReminderAddonMessage(message, distribution, target)
  RegisterAddonMessages()

  if not distribution then
    return false
  end

  if C_ChatInfo and C_ChatInfo.SendAddonMessage then
    return C_ChatInfo.SendAddonMessage(ADDON_MESSAGE_PREFIX, message, distribution, target)
  end

  if SendAddonMessage then
    return SendAddonMessage(ADDON_MESSAGE_PREFIX, message, distribution, target)
  end

  return false
end

local function GetGroupAddonDistribution()
  if IsInGroup and LE_PARTY_CATEGORY_INSTANCE and IsInGroup(LE_PARTY_CATEGORY_INSTANCE) then
    return "INSTANCE_CHAT"
  end

  if IsInRaid and IsInRaid() then
    return "RAID"
  end

  if IsInGroup and IsInGroup() then
    return "PARTY"
  end

  return nil
end

local function AddMember(members, compactMembers, rosterMembers, unit, playerSpecRole, rosterName)
  if not UnitExists(unit) then
    return
  end

  local _, classFile = UnitClass(unit)
  if not classFile then
    return
  end

  local role = GetUnitRole(unit, playerSpecRole)
  table.insert(members, classFile .. ":" .. role)
  table.insert(compactMembers, CompactClass(classFile) .. ":" .. CompactRole(role))

  if rosterMembers then
    local name, realm = GetUnitNameAndRealm(unit, rosterName)
    if name and name ~= "" and realm and realm ~= "" then
      table.insert(rosterMembers, name .. ":" .. realm .. ":" .. classFile .. ":" .. role)
    end
  end
end

local function GetGroupInfo(playerSpecRole)
  local members = {}
  local compactMembers = {}
  local rosterMembers = {}
  local groupType = "solo"

  if IsInRaid and IsInRaid() then
    groupType = "raid"
    for index = 1, GetNumGroupMembers() do
      local rosterName = GetRaidRosterInfo and GetRaidRosterInfo(index)
      AddMember(members, compactMembers, rosterMembers, "raid" .. index, playerSpecRole, rosterName)
    end
  elseif IsInGroup and IsInGroup() then
    groupType = "party"
    AddMember(members, compactMembers, rosterMembers, "player", playerSpecRole)

    local partyMembers = GetNumSubgroupMembers and GetNumSubgroupMembers() or 0
    for index = 1, partyMembers do
      AddMember(members, compactMembers, rosterMembers, "party" .. index, playerSpecRole)
    end
  else
    AddMember(members, compactMembers, rosterMembers, "player", playerSpecRole)
  end

  local groupSize = #members
  if groupType ~= "solo" and GetNumGroupMembers then
    groupSize = math.max(groupSize, GetNumGroupMembers())
  end

  return groupType, groupSize, table.concat(members, ","), table.concat(compactMembers, ","), table.concat(rosterMembers, ",")
end

local function GetRaidLeaderName()
  if not IsInRaid or not IsInRaid() or not UnitIsGroupLeader then
    return nil
  end

  local raidMembers = GetNumGroupMembers and GetNumGroupMembers() or 0
  for index = 1, raidMembers do
    local unit = "raid" .. index
    if UnitExists(unit) and UnitIsGroupLeader(unit) then
      return UnitName(unit)
    end
  end

  if UnitIsGroupLeader("player") then
    return UnitName("player")
  end

  return nil
end

local function GetInstanceFields()
  if not GetInstanceInfo then
    return nil, nil, nil, nil
  end

  local name, instanceType, difficultyID, difficultyName = GetInstanceInfo()
  return name, instanceType, difficultyID, difficultyName
end

local function GetSelectedRaidDifficulty()
  if not GetRaidDifficultyID then
    return nil, nil
  end

  local difficultyID = GetRaidDifficultyID()
  if not difficultyID or difficultyID == 0 then
    return nil, nil
  end

  local difficultyName
  if GetDifficultyInfo then
    difficultyName = GetDifficultyInfo(difficultyID)
  end

  return difficultyID, difficultyName
end

local function GetOwnedKeystone()
  if not C_MythicPlus then
    return nil, nil, nil
  end

  local keyLevel = SafeCall(C_MythicPlus.GetOwnedKeystoneLevel)
  local challengeMapID = SafeCall(C_MythicPlus.GetOwnedKeystoneChallengeMapID)
  local mapName

  if challengeMapID and C_ChallengeMode and C_ChallengeMode.GetMapUIInfo then
    mapName = SafeCall(function()
      local name = C_ChallengeMode.GetMapUIInfo(challengeMapID)
      return name
    end)
  end

  return keyLevel, challengeMapID, mapName
end

local function GetEquippedItemLevel()
  if not GetAverageItemLevel then
    return nil
  end

  local _, equippedItemLevel = GetAverageItemLevel()
  if not equippedItemLevel then
    return nil
  end

  return math.floor(equippedItemLevel + 0.5)
end

local function GetExportFields()
  local playerName = UnitName("player")
  local raidLeaderName = GetRaidLeaderName()
  local realmName = GetRealmName and GetRealmName() or ""
  local localizedClass, classFile = UnitClass("player")
  local specName, specRole = GetPlayerSpec()
  local groupType, groupSize, members, compactMembers, roster = GetGroupInfo(specRole)
  local instanceName, instanceType, difficultyID, difficultyName = GetInstanceFields()
  local selectedRaidDifficultyID, selectedRaidDifficultyName = GetSelectedRaidDifficulty()
  local keyLevel, keyChallengeMapID, keyMapName = GetOwnedKeystone()

  return {
    classFile = classFile,
    compactMembers = compactMembers,
    difficultyID = difficultyID,
    difficultyName = difficultyName,
    groupSize = groupSize,
    groupType = groupType,
    instanceName = instanceName,
    instanceType = instanceType,
    itemLevel = GetEquippedItemLevel(),
    keyChallengeMapID = keyChallengeMapID,
    keyLevel = keyLevel,
    keyMapName = keyMapName,
    localizedClass = localizedClass,
    members = members,
    playerName = playerName,
    raidLeaderName = raidLeaderName,
    realmName = realmName,
    roster = roster,
    selectedRaidDifficultyID = selectedRaidDifficultyID,
    selectedRaidDifficultyName = selectedRaidDifficultyName,
    specName = specName,
  }
end

local function BuildExportString(fields)
  fields = fields or GetExportFields()

  local params = {}
  AddParam(params, "name", fields.playerName)
  AddParam(params, "raidLeaderName", fields.raidLeaderName)
  AddParam(params, "realm", fields.realmName)
  AddParam(params, "classFile", fields.classFile)
  AddParam(params, "className", fields.localizedClass)
  AddParam(params, "spec", fields.specName)
  AddParam(params, "ilvl", fields.itemLevel)
  AddParam(params, "groupType", fields.groupType)
  AddParam(params, "groupSize", fields.groupSize)
  AddParam(params, "members", fields.members)
  AddParam(params, "roster", fields.roster)
  AddParam(params, "instanceType", fields.instanceType)
  AddParam(params, "instanceName", fields.instanceName)
  AddParam(params, "difficultyID", fields.difficultyID)
  AddParam(params, "difficultyName", fields.difficultyName)
  AddParam(params, "selectedRaidDifficultyID", fields.selectedRaidDifficultyID)
  AddParam(params, "selectedRaidDifficultyName", fields.selectedRaidDifficultyName)
  AddParam(params, "keyLevel", fields.keyLevel)
  AddParam(params, "keyChallengeMapID", fields.keyChallengeMapID)
  AddParam(params, "keyMapName", fields.keyMapName)

  return EXPORT_PREFIX .. table.concat(params, "&")
end

local function RaidNamesMatch(left, right)
  return type(left) == "string" and type(right) == "string" and left ~= "" and right ~= "" and left == right
end

local function RaidDifficultiesMatch(savedDifficultyId, targetDifficultyId)
  targetDifficultyId = tonumber(targetDifficultyId)
  if not targetDifficultyId or targetDifficultyId == 0 then
    return true
  end

  return tonumber(savedDifficultyId) == targetDifficultyId
end

local function GetKilledBossesForRaid(raidName, difficultyId)
  local killedBosses = {}

  if not GetNumSavedInstances or not GetSavedInstanceInfo or not GetSavedInstanceEncounterInfo then
    return nil, AddonText("unavailable")
  end

  local savedInstanceCount = GetNumSavedInstances()
  for instanceIndex = 1, savedInstanceCount do
    local name, _, _, savedDifficultyId, locked, _, _, isRaid, _, _, numEncounters =
      GetSavedInstanceInfo(instanceIndex)

    if
      isRaid
      and locked
      and numEncounters
      and numEncounters > 0
      and RaidNamesMatch(name, raidName)
      and RaidDifficultiesMatch(savedDifficultyId, difficultyId)
    then
      for encounterIndex = 1, numEncounters do
        local bossName, _, isKilled = GetSavedInstanceEncounterInfo(instanceIndex, encounterIndex)
        if isKilled and bossName and bossName ~= "" then
          table.insert(killedBosses, bossName)
        end
      end
    end
  end

  return killedBosses
end

local function GetRaidCheckTarget(fields)
  fields = fields or GetExportFields()
  if fields.instanceType ~= "raid" or not fields.instanceName or fields.instanceName == "" then
    return nil
  end

  return {
    difficultyId = fields.difficultyID or fields.selectedRaidDifficultyID,
    difficultyName = fields.difficultyName or fields.selectedRaidDifficultyName,
    raidName = fields.instanceName,
  }
end

local function GetRaidCheckTargetLabel(target)
  if not target then
    return AddonText("unknown")
  end

  if target.difficultyName and target.difficultyName ~= "" then
    return target.raidName .. " - " .. target.difficultyName
  end

  return target.raidName
end

local function RaidCheckTargetsMatch(left, right)
  if not left or not right then
    return false
  end

  return left.raidName == right.raidName and tostring(left.difficultyId or "") == tostring(right.difficultyId or "")
end

local function AddRaidCheckEntryAlias(state, entry, key)
  if not state or not state.entryByKey or not entry or not key or key == "" then
    return
  end

  state.entryByKey[key] = entry
end

local function BuildRaidRosterEntries()
  local entries = {}

  if not IsInRaid or not IsInRaid() then
    return entries
  end

  local raidMembers = GetNumGroupMembers and GetNumGroupMembers() or 0
  for index = 1, raidMembers do
    local rosterName, rank = nil, nil
    if GetRaidRosterInfo then
      rosterName, rank = GetRaidRosterInfo(index)
    end

    local unit = "raid" .. index
    local name, realm = GetUnitNameAndRealm(unit, rosterName)
    if not name or name == "" then
      name, realm = SplitFullName(rosterName)
    end

    local key = BuildCharacterKey(name, realm)
    if key then
      local isLeader = rank == 2
      if UnitExists(unit) and UnitIsGroupLeader and UnitIsGroupLeader(unit) then
        isLeader = true
      end

      local _, classFile = UnitClass(unit)
      table.insert(entries, {
        classFile = classFile,
        displayName = GetDisplayCharacterName(name, realm),
        emptyGemSlots = {},
        enchantStatus = GEAR_CHECK_STATUS.pending,
        gemStatus = GEAR_CHECK_STATUS.pending,
        hasAddon = false,
        isLeader = isLeader,
        itemLevel = nil,
        key = key,
        killedBosses = {},
        missingEnchants = {},
        name = name,
        realm = realm,
        status = RAID_CHECK_STATUS.pending,
        unit = unit,
      })
    end
  end

  return entries
end

local function FindRaidCheckEntry(sender)
  if not raidCheckState or not raidCheckState.entryByKey then
    return nil
  end

  return raidCheckState.entryByKey[BuildCharacterKeyFromFullName(sender)] or raidCheckState.entryByKey[sender]
end

local function GetRaidCheckStatusText(entry)
  if entry.status == RAID_CHECK_STATUS.clean then
    return AddonText("cleanLockout")
  end

  if entry.status == RAID_CHECK_STATUS.hasLockout then
    return AddonText("hasLockout")
  end

  if entry.status == RAID_CHECK_STATUS.noAddon then
    return AddonText("noAddon")
  end

  if entry.status == RAID_CHECK_STATUS.unavailable then
    if raidCheckState and not raidCheckState.target then
      return AddonText("notChecked")
    end

    return AddonText("unavailable")
  end

  return AddonText("checking")
end

local function SetRaidCheckStatusColor(fontString, status)
  if status == RAID_CHECK_STATUS.clean then
    SetTextColor(fontString, "green")
  elseif status == RAID_CHECK_STATUS.hasLockout then
    SetTextColor(fontString, "red")
  elseif status == RAID_CHECK_STATUS.noAddon or status == RAID_CHECK_STATUS.unavailable then
    SetTextColor(fontString, "gold")
  else
    SetTextColor(fontString, "gray")
  end
end

local function GetEnchantStatusText(entry)
  if entry.enchantStatus == GEAR_CHECK_STATUS.ready then
    return AddonText("enchantOk")
  end

  if entry.enchantStatus == GEAR_CHECK_STATUS.issue then
    return AddonText("missingEnchants")
  end

  if entry.enchantStatus == GEAR_CHECK_STATUS.notChecked then
    return AddonText("notChecked")
  end

  return AddonText("checking")
end

local function GetGemStatusText(entry)
  if entry.gemStatus == GEAR_CHECK_STATUS.ready then
    return AddonText("gemsOk")
  end

  if entry.gemStatus == GEAR_CHECK_STATUS.issue then
    return AddonText("missingGems")
  end

  if entry.gemStatus == GEAR_CHECK_STATUS.notChecked then
    return AddonText("notChecked")
  end

  return AddonText("checking")
end

local function SetGearStatusColor(fontString, status)
  if status == GEAR_CHECK_STATUS.ready then
    SetTextColor(fontString, "green")
  elseif status == GEAR_CHECK_STATUS.issue then
    SetTextColor(fontString, "red")
  elseif status == GEAR_CHECK_STATUS.notChecked then
    SetTextColor(fontString, "gold")
  else
    SetTextColor(fontString, "gray")
  end
end

local function GetEntryReadiness(entry)
  local hardIssues = 0
  local softIssues = 0

  if entry.status == RAID_CHECK_STATUS.clean then
    -- clean
  elseif entry.status == RAID_CHECK_STATUS.hasLockout then
    hardIssues = hardIssues + 1
  else
    softIssues = softIssues + 1
  end

  if entry.enchantStatus == GEAR_CHECK_STATUS.issue then
    hardIssues = hardIssues + 1
  elseif entry.enchantStatus ~= GEAR_CHECK_STATUS.ready then
    softIssues = softIssues + 1
  end

  if entry.gemStatus == GEAR_CHECK_STATUS.issue then
    hardIssues = hardIssues + 1
  elseif entry.gemStatus ~= GEAR_CHECK_STATUS.ready then
    softIssues = softIssues + 1
  end

  if hardIssues >= 2 then
    return READINESS_STATUS.notReady, hardIssues, softIssues
  end

  if hardIssues > 0 or softIssues > 0 then
    return READINESS_STATUS.partial, hardIssues, softIssues
  end

  return READINESS_STATUS.ready, hardIssues, softIssues
end

local function GetReadinessStatusText(entry)
  local readinessStatus = GetEntryReadiness(entry)
  if readinessStatus == READINESS_STATUS.ready then
    return AddonText("readyStatus")
  end

  if readinessStatus == READINESS_STATUS.notReady then
    return AddonText("notReadyStatus")
  end

  return AddonText("partialStatus")
end

local function SetReadinessStatusColor(fontString, entry)
  local readinessStatus = GetEntryReadiness(entry)
  if readinessStatus == READINESS_STATUS.ready then
    SetTextColor(fontString, "green")
  elseif readinessStatus == READINESS_STATUS.notReady then
    SetTextColor(fontString, "red")
  else
    SetTextColor(fontString, "gold")
  end
end

local function GetRaidCheckSortWeight(entry)
  local readinessStatus = GetEntryReadiness(entry)
  if readinessStatus == READINESS_STATUS.notReady then
    return 1
  end

  if readinessStatus == READINESS_STATUS.partial then
    return 2
  end

  return 5
end

local function FormatGemIssues(entry)
  local formatted = {}
  for _, issue in ipairs(entry.emptyGemSlots or {}) do
    if issue.count and issue.count > 1 then
      table.insert(formatted, issue.slotName .. " x" .. issue.count)
    else
      table.insert(formatted, issue.slotName)
    end
  end

  return formatted
end

local function ShowRaidCheckTooltip(owner, entry)
  if not GameTooltip or not entry then
    return
  end

  GameTooltip:SetOwner(owner, "ANCHOR_RIGHT")
  GameTooltip:SetText(entry.displayName)

  if raidCheckState and raidCheckState.target then
    GameTooltip:AddLine(GetRaidCheckTargetLabel(raidCheckState.target), 0.78, 0.78, 0.78)
  end

  if entry.status == RAID_CHECK_STATUS.hasLockout then
    GameTooltip:AddLine(AddonText("bossesKilled") .. ":", 1, 0.82, 0)
    for _, bossName in ipairs(entry.killedBosses or {}) do
      GameTooltip:AddLine(bossName, 1, 1, 1)
    end
  else
    GameTooltip:AddLine(GetRaidCheckStatusText(entry), 1, 1, 1)
  end

  if CountList(entry.missingEnchants) > 0 then
    GameTooltip:AddLine(AddonText("whisperMissingEnchants") .. ":", 1, 0.82, 0)
    for _, slotName in ipairs(entry.missingEnchants) do
      GameTooltip:AddLine(slotName, 1, 1, 1)
    end
  elseif entry.enchantStatus == GEAR_CHECK_STATUS.notChecked then
    GameTooltip:AddLine(AddonText("enchants") .. ": " .. AddonText("notChecked"), 1, 0.82, 0)
  end

  if CountList(entry.emptyGemSlots) > 0 then
    GameTooltip:AddLine(AddonText("whisperMissingGems") .. ":", 1, 0.82, 0)
    for _, issueText in ipairs(FormatGemIssues(entry)) do
      GameTooltip:AddLine(issueText, 1, 1, 1)
    end
  elseif entry.gemStatus == GEAR_CHECK_STATUS.notChecked then
    GameTooltip:AddLine(AddonText("gems") .. ": " .. AddonText("notChecked"), 1, 0.82, 0)
  end

  GameTooltip:Show()
end

local function HideRaidCheckRowsFrom(startIndex)
  for index = startIndex, #raidCheckRows do
    raidCheckRows[index]:Hide()
  end
end

local function SetRaidCheckTableVisible(isVisible)
  SetFrameShown(raidCheckTablePanel, isVisible)
  SetFrameShown(raidCheckHeader, isVisible)
  SetFrameShown(raidCheckScrollFrame, isVisible)
end

local function SetExportFrameMode(mode)
  if not frame then
    return
  end

  local showFullRaidCheck = raidCheckState and raidCheckState.entries and #raidCheckState.entries > 0
  frame:SetSize(EXPORT_FRAME_WIDTH, showFullRaidCheck and EXPORT_FRAME_FULL_HEIGHT or EXPORT_FRAME_COMPACT_HEIGHT)
  SetFrameShown(raidCheckLabel, true)
  SetFrameShown(raidCheckTargetText, true)
  SetFrameShown(raidCheckStatus, false)
  SetFrameShown(raidCheckProblemFilter, showFullRaidCheck)
  SetFrameShown(raidCheckAddonFilter, showFullRaidCheck)
  SetFrameShown(raidCheckSummary.panel, showFullRaidCheck)
  SetRaidCheckTableVisible(showFullRaidCheck)
end

local function GetTableColumnOffset(columnIndex)
  local offset = 0
  for index = 1, columnIndex - 1 do
    offset = offset + TABLE_COLUMNS[index].width
  end

  return offset
end

local SendRaidReminderWhisper
local UpdateRaidCheckSummary
local ApplyButtonTextures

local function GetRaidCheckRow(index)
  local row = raidCheckRows[index]
  if row then
    row:Show()
    return row
  end

  row = CreateFrame("Frame", nil, raidCheckContent)
  row:SetHeight(RAID_CHECK_ROW_HEIGHT)
  row:SetPoint("TOPLEFT", 0, -((index - 1) * RAID_CHECK_ROW_HEIGHT))
  row:SetPoint("RIGHT", raidCheckContent, "RIGHT", 0, 0)
  row:EnableMouse(true)

  row.background = row:CreateTexture(nil, "BACKGROUND")
  row.background:SetAllPoints(row)
  row.background:SetColorTexture(0, 0, 0, index % 2 == 0 and 0.2 or 0.32)

  row.nameText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.nameText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(1) + 20, 0)
  row.nameText:SetWidth(TABLE_COLUMNS[1].width - 24)
  row.nameText:SetJustifyH("CENTER")
  row.nameText:SetWordWrap(false)

  row.leaderIcon = row:CreateTexture(nil, "ARTWORK")
  row.leaderIcon:SetSize(16, 16)
  row.leaderIcon:SetPoint("RIGHT", row.nameText, "LEFT", -2, 0)
  row.leaderIcon:SetTexture("Interface\\GroupFrame\\UI-Group-LeaderIcon")

  row.itemLevelText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.itemLevelText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(2), 0)
  row.itemLevelText:SetWidth(TABLE_COLUMNS[2].width)
  row.itemLevelText:SetJustifyH("CENTER")
  row.itemLevelText:SetWordWrap(false)

  row.lockoutText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.lockoutText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(3), 0)
  row.lockoutText:SetWidth(TABLE_COLUMNS[3].width)
  row.lockoutText:SetJustifyH("CENTER")
  row.lockoutText:SetWordWrap(false)

  row.enchantText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.enchantText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(4), 0)
  row.enchantText:SetWidth(TABLE_COLUMNS[4].width)
  row.enchantText:SetJustifyH("CENTER")
  row.enchantText:SetWordWrap(false)

  row.gemText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.gemText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(5), 0)
  row.gemText:SetWidth(TABLE_COLUMNS[5].width)
  row.gemText:SetJustifyH("CENTER")
  row.gemText:SetWordWrap(false)

  row.resultText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.resultText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(6), 0)
  row.resultText:SetWidth(TABLE_COLUMNS[6].width)
  row.resultText:SetJustifyH("CENTER")
  row.resultText:SetWordWrap(false)

  row.actionText = row:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  row.actionText:SetPoint("LEFT", row, "LEFT", GetTableColumnOffset(7), 0)
  row.actionText:SetWidth(TABLE_COLUMNS[7].width)
  row.actionText:SetJustifyH("CENTER")
  row.actionText:SetText("-")

  row.whisperButton = CreateFrame("Button", nil, row, "UIPanelButtonTemplate")
  row.whisperButton:SetSize(28, 22)
  row.whisperButton:SetPoint("CENTER", row.actionText, "CENTER", 0, 0)
  row.whisperButton:SetText("")
  ApplyButtonTextures(row.whisperButton)
  row.whisperButton.icon = row.whisperButton:CreateTexture(nil, "ARTWORK")
  row.whisperButton.icon:SetSize(16, 16)
  row.whisperButton.icon:SetPoint("CENTER")
  row.whisperButton.icon:SetTexture("Interface\\ChatFrame\\UI-ChatIcon-Chat-Up")
  row.whisperButton:SetScript("OnClick", function(self)
    if self.entry then
      SendRaidReminderWhisper(self.entry)
    end
  end)
  row.whisperButton:SetScript("OnEnter", function(self)
    ShowRaidCheckTooltip(self:GetParent(), self.entry)
  end)
  row.whisperButton:SetScript("OnLeave", function()
    if GameTooltip then
      GameTooltip:Hide()
    end
  end)

  row:SetScript("OnEnter", function(self)
    ShowRaidCheckTooltip(self, self.entry)
  end)
  row:SetScript("OnLeave", function()
    if GameTooltip then
      GameTooltip:Hide()
    end
  end)

  raidCheckRows[index] = row
  return row
end

local function RenderRaidCheckRows(statusText)
  if not raidCheckContent or not raidCheckStatus then
    return
  end

  if not raidCheckState or not raidCheckState.entries then
    HideRaidCheckRowsFrom(1)
    raidCheckContent:SetHeight(1)
    raidCheckStatus:SetText(statusText or AddonText("raidReadinessNoRaid"))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(statusText or AddonText("raidReadinessNoRaid"))
    end
    SetExportFrameMode("raidCheck")
    UpdateRaidCheckSummary()
    return
  end

  local entries = {}
  for _, entry in ipairs(raidCheckState.entries) do
    local readinessStatus = GetEntryReadiness(entry)
    local includeEntry = true
    if raidCheckShowProblemsOnly and readinessStatus == READINESS_STATUS.ready then
      includeEntry = false
    end

    if raidCheckShowAddonOnly and not entry.hasAddon then
      includeEntry = false
    end

    if includeEntry then
      table.insert(entries, entry)
    end
  end

  table.sort(entries, function(left, right)
    local leftWeight = GetRaidCheckSortWeight(left)
    local rightWeight = GetRaidCheckSortWeight(right)
    if leftWeight ~= rightWeight then
      return leftWeight < rightWeight
    end

    if left.isLeader ~= right.isLeader then
      return left.isLeader
    end

    return left.displayName < right.displayName
  end)

  raidCheckContent:SetHeight(math.max(#entries * RAID_CHECK_ROW_HEIGHT, 1))
  SetExportFrameMode("raidCheck")

  for index, entry in ipairs(entries) do
    local row = GetRaidCheckRow(index)
    row.entry = entry

    local displayName = entry.displayName

    row.nameText:SetText(displayName)
    row.nameText:SetTextColor(GetClassColor(entry.classFile))
    SetFrameShown(row.leaderIcon, entry.isLeader)

    row.itemLevelText:SetText(entry.itemLevel or "-")
    SetTextColor(row.itemLevelText, entry.itemLevel and "white" or "gray")

    row.lockoutText:SetText(GetRaidCheckStatusText(entry))
    SetRaidCheckStatusColor(row.lockoutText, entry.status)

    row.enchantText:SetText(GetEnchantStatusText(entry))
    SetGearStatusColor(row.enchantText, entry.enchantStatus)

    row.gemText:SetText(GetGemStatusText(entry))
    SetGearStatusColor(row.gemText, entry.gemStatus)

    row.resultText:SetText(GetReadinessStatusText(entry))
    SetReadinessStatusColor(row.resultText, entry)

    local canWhisper = CountList(entry.missingEnchants) > 0 or CountList(entry.emptyGemSlots) > 0
    row.whisperButton.entry = entry
    SetFrameShown(row.whisperButton, canWhisper)
    SetFrameShown(row.actionText, not canWhisper)
  end

  HideRaidCheckRowsFrom(#entries + 1)
  if raidCheckState.target then
    local targetLabel = GetRaidCheckTargetLabel(raidCheckState.target)
    raidCheckStatus:SetText(string.format(AddonText("raidTarget"), targetLabel))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(AddonText("raid") .. ": " .. targetLabel)
    end
  else
    raidCheckStatus:SetText(AddonText("noRaidTarget"))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(AddonText("noRaidTarget"))
    end
  end
  UpdateRaidCheckSummary()
end

local function ApplyRaidCheckResult(entry, killedBosses, errorText)
  if not entry then
    return
  end

  entry.hasAddon = true
  entry.killedBosses = killedBosses or {}

  if errorText then
    entry.status = RAID_CHECK_STATUS.unavailable
  elseif #entry.killedBosses > 0 then
    entry.status = RAID_CHECK_STATUS.hasLockout
  else
    entry.status = RAID_CHECK_STATUS.clean
  end
end

local function ApplyLocalRaidCheckResult(requestId)
  if not raidCheckState or raidCheckState.requestId ~= requestId then
    return
  end

  local entry = raidCheckState.localEntry
  if not entry then
    return
  end

  local killedBosses, errorText = GetKilledBossesForRaid(
    raidCheckState.target.raidName,
    raidCheckState.target.difficultyId
  )
  ApplyRaidCheckResult(entry, killedBosses, errorText)
  RenderRaidCheckRows()
end

local function GetItemLinkFields(itemLink)
  local itemString = type(itemLink) == "string" and itemLink:match("item:([^|]+)") or nil
  if not itemString then
    return {}
  end

  local fields = {}
  for value in (itemString .. ":"):gmatch("([^:]*):") do
    table.insert(fields, value)
    if #fields >= 8 then
      break
    end
  end

  return fields
end

local function HasPermanentEnchant(itemLink)
  local fields = GetItemLinkFields(itemLink)
  local enchantId = tonumber(fields[2])
  return enchantId and enchantId > 0
end

local function CountFilledGemFields(itemLink)
  local fields = GetItemLinkFields(itemLink)
  local count = 0
  for fieldIndex = 3, 6 do
    local gemId = tonumber(fields[fieldIndex])
    if gemId and gemId > 0 then
      count = count + 1
    end
  end

  return count
end

local function IsWeaponItemLink(itemLink)
  if not itemLink then
    return false
  end

  if not GetItemInfoInstant then
    return true
  end

  local _, _, _, equipLoc, _, classId = GetItemInfoInstant(itemLink)
  local weaponClass = Enum and Enum.ItemClass and Enum.ItemClass.Weapon or LE_ITEM_CLASS_WEAPON or 2
  return classId == weaponClass or equipLoc == "INVTYPE_WEAPON" or equipLoc == "INVTYPE_WEAPONOFFHAND"
end

local function GetItemStatsTable(itemLink)
  if not itemLink then
    return nil
  end

  if C_Item and C_Item.GetItemStats then
    return SafeCall(function()
      return C_Item.GetItemStats(itemLink)
    end)
  end

  if GetItemStats then
    return SafeCall(function()
      return GetItemStats(itemLink)
    end)
  end

  return nil
end

local function GetSocketCountFromStats(itemLink)
  local count = 0
  local stats = GetItemStatsTable(itemLink)
  if type(stats) == "table" then
    for statName, statValue in pairs(stats) do
      if type(statName) == "string" and statName:find("EMPTY_SOCKET_", 1, true) then
        count = count + (tonumber(statValue) or 1)
      end
    end
  end

  return count
end

local function GetTooltipEmptySocketCount(itemLink)
  if not itemLink or not GameTooltip then
    return 0
  end

  if not inspectTooltip then
    inspectTooltip = CreateFrame("GameTooltip", "RaidReminderInspectTooltip", nil, "GameTooltipTemplate")
  end

  inspectTooltip:SetOwner(UIParent, "ANCHOR_NONE")
  inspectTooltip:ClearLines()
  inspectTooltip:SetHyperlink(itemLink)

  local emptySocketText = LocalText("EMPTY_SOCKET", AddonText("emptySocket"))
  local count = 0
  for lineIndex = 1, inspectTooltip:NumLines() do
    local line = _G["RaidReminderInspectTooltipTextLeft" .. lineIndex]
    local text = line and line:GetText()
    if text and emptySocketText and text:find(emptySocketText, 1, true) then
      count = count + 1
    end
  end

  inspectTooltip:Hide()
  return count
end

local function GetEmptySocketCount(itemLink)
  local tooltipEmptySockets = GetTooltipEmptySocketCount(itemLink)
  if tooltipEmptySockets > 0 then
    return tooltipEmptySockets
  end

  local socketCount = GetSocketCountFromStats(itemLink)
  return math.max(socketCount - CountFilledGemFields(itemLink), 0)
end

local function GetGearSlotLabel(slotInfo)
  return AddonText(slotInfo.textKey)
end

local function GetDetailedItemLevel(itemLink)
  if not itemLink then
    return nil
  end

  local itemLevel
  if C_Item and C_Item.GetDetailedItemLevelInfo then
    itemLevel = SafeCall(function()
      return C_Item.GetDetailedItemLevelInfo(itemLink)
    end)
  elseif GetDetailedItemLevelInfo then
    itemLevel = SafeCall(function()
      return GetDetailedItemLevelInfo(itemLink)
    end)
  end

  itemLevel = tonumber(itemLevel)
  if itemLevel and itemLevel > 0 then
    return itemLevel
  end

  return nil
end

local function CalculateUnitItemLevel(unit)
  if not GetInventoryItemLink then
    return nil
  end

  local total = 0
  local count = 0
  for _, slotId in ipairs(ITEM_LEVEL_SLOTS) do
    local itemLink = GetInventoryItemLink(unit, slotId)
    local itemLevel = GetDetailedItemLevel(itemLink)
    if itemLevel then
      total = total + itemLevel
      count = count + 1
    end
  end

  if count == 0 then
    return nil
  end

  return math.floor((total / count) + 0.5)
end

local function ApplyUninspectableGearResult(entry)
  if not entry then
    return
  end

  entry.missingEnchants = {}
  entry.emptyGemSlots = {}
  entry.enchantStatus = GEAR_CHECK_STATUS.notChecked
  entry.gemStatus = GEAR_CHECK_STATUS.notChecked
end

local function AnalyzeUnitGear(unit)
  local missingEnchants = {}
  local emptyGemSlots = {}
  local seenItemLinks = 0

  for _, slotInfo in ipairs(ENCHANT_SLOTS) do
    local itemLink = GetInventoryItemLink and GetInventoryItemLink(unit, slotInfo.slotId)
    if itemLink then
      seenItemLinks = seenItemLinks + 1
      local shouldRequireEnchant = true
      if slotInfo.weaponOnly then
        shouldRequireEnchant = IsWeaponItemLink(itemLink)
      end

      if shouldRequireEnchant and not HasPermanentEnchant(itemLink) then
        table.insert(missingEnchants, GetGearSlotLabel(slotInfo))
      end
    end
  end

  for _, slotInfo in ipairs(GEM_SCAN_SLOTS) do
    local itemLink = GetInventoryItemLink and GetInventoryItemLink(unit, slotInfo.slotId)
    if itemLink then
      seenItemLinks = seenItemLinks + 1
      local emptySocketCount = GetEmptySocketCount(itemLink)
      if emptySocketCount > 0 then
        table.insert(emptyGemSlots, {
          count = emptySocketCount,
          slotName = GetGearSlotLabel(slotInfo),
        })
      end
    end
  end

  return {
    emptyGemSlots = emptyGemSlots,
    missingEnchants = missingEnchants,
    seenItemLinks = seenItemLinks,
  }
end

local function ApplyGearResult(entry, unit)
  if not entry then
    return
  end

  entry.itemLevel = CalculateUnitItemLevel(unit)
  if UnitIsUnit and UnitIsUnit(unit, "player") and GetEquippedItemLevel then
    entry.itemLevel = GetEquippedItemLevel() or entry.itemLevel
  end

  local result = AnalyzeUnitGear(unit)
  if result.seenItemLinks == 0 then
    ApplyUninspectableGearResult(entry)
    return
  end

  entry.missingEnchants = result.missingEnchants
  entry.emptyGemSlots = result.emptyGemSlots
  entry.enchantStatus = CountList(entry.missingEnchants) > 0 and GEAR_CHECK_STATUS.issue or GEAR_CHECK_STATUS.ready
  entry.gemStatus = CountList(entry.emptyGemSlots) > 0 and GEAR_CHECK_STATUS.issue or GEAR_CHECK_STATUS.ready
end

local function ResetInspectQueue(token)
  if inspectQueue.active and ClearInspectPlayer then
    ClearInspectPlayer()
  end

  inspectQueue.token = token
  inspectQueue.queue = {}
  inspectQueue.active = nil
end

local function FinishActiveInspect()
  if ClearInspectPlayer then
    ClearInspectPlayer()
  end

  inspectQueue.active = nil
end

local ProcessNextInspect

local function ScheduleNextInspect()
  if C_Timer and C_Timer.After then
    C_Timer.After(INSPECT_DELAY, ProcessNextInspect)
  else
    ProcessNextInspect()
  end
end

local function RetryOrFailInspect(active)
  if not active or not active.entry then
    FinishActiveInspect()
    ScheduleNextInspect()
    return
  end

  local entry = active.entry
  FinishActiveInspect()

  if active.attempt < INSPECT_MAX_ATTEMPTS then
    entry.inspectAttempt = active.attempt + 1
    table.insert(inspectQueue.queue, 1, entry)
  else
    ApplyUninspectableGearResult(entry)
    RenderRaidCheckRows()
  end

  ScheduleNextInspect()
end

local function HandleInspectTimeout(token, guid)
  local active = inspectQueue.active
  if not active or inspectQueue.token ~= token then
    return
  end

  if guid and active.guid and active.guid ~= guid then
    return
  end

  RetryOrFailInspect(active)
end

ProcessNextInspect = function()
  if inspectQueue.active or not raidCheckState or inspectQueue.token ~= raidCheckState.requestId then
    return
  end

  local entry = table.remove(inspectQueue.queue, 1)
  if not entry then
    return
  end

  local unit = entry.unit
  if not UnitExists or not UnitExists(unit) or (UnitIsConnected and not UnitIsConnected(unit)) then
    ApplyUninspectableGearResult(entry)
    RenderRaidCheckRows()
    ScheduleNextInspect()
    return
  end

  if not CanInspect or not NotifyInspect or not CanInspect(unit, false) then
    ApplyUninspectableGearResult(entry)
    RenderRaidCheckRows()
    ScheduleNextInspect()
    return
  end

  local guid = UnitGUID and UnitGUID(unit)
  local token = inspectQueue.token
  inspectQueue.active = {
    attempt = entry.inspectAttempt or 1,
    entry = entry,
    guid = guid,
    token = token,
    unit = unit,
  }

  NotifyInspect(unit)

  if C_Timer and C_Timer.After then
    C_Timer.After(INSPECT_TIMEOUT, function()
      HandleInspectTimeout(token, guid)
    end)
  end
end

local function StartRaidInspectScan(state)
  ResetInspectQueue(state and state.requestId or nil)
  if not state or not state.entries then
    return
  end

  local playerKey = GetPlayerCharacterKey()
  for _, entry in ipairs(state.entries) do
    entry.inspectAttempt = 1
    if entry.key == playerKey or (UnitIsUnit and entry.unit and UnitIsUnit(entry.unit, "player")) then
      ApplyGearResult(entry, "player")
    else
      entry.enchantStatus = GEAR_CHECK_STATUS.pending
      entry.gemStatus = GEAR_CHECK_STATUS.pending
      table.insert(inspectQueue.queue, entry)
    end
  end

  RenderRaidCheckRows()
  ScheduleNextInspect()
end

local function HandleInspectReady(guid)
  local active = inspectQueue.active
  if not active or not raidCheckState or active.token ~= raidCheckState.requestId then
    return
  end

  if guid and active.guid and active.guid ~= guid then
    return
  end

  ApplyGearResult(active.entry, active.unit)
  FinishActiveInspect()
  RenderRaidCheckRows()
  ScheduleNextInspect()
end

function UpdateRaidCheckSummary()
  if not raidCheckSummary or not raidCheckSummary.addonValue then
    return
  end

  local total = 0
  local addonCount = 0
  local cleanCount = 0
  local enchantIssueCount = 0
  local gemIssueCount = 0

  if raidCheckState and raidCheckState.entries then
    total = #raidCheckState.entries
    for _, entry in ipairs(raidCheckState.entries) do
      if entry.hasAddon then
        addonCount = addonCount + 1
      end

      if entry.status == RAID_CHECK_STATUS.clean then
        cleanCount = cleanCount + 1
      end

      if CountList(entry.missingEnchants) > 0 then
        enchantIssueCount = enchantIssueCount + 1
      end

      if CountList(entry.emptyGemSlots) > 0 then
        gemIssueCount = gemIssueCount + 1
      end
    end
  end

  raidCheckSummary.addonValue:SetText(addonCount .. " / " .. total)
  raidCheckSummary.cleanValue:SetText(cleanCount)
  raidCheckSummary.enchantValue:SetText(enchantIssueCount)
  raidCheckSummary.gemValue:SetText(gemIssueCount)
end

function SendRaidReminderWhisper(entry)
  if not entry then
    return
  end

  local parts = {}
  if CountList(entry.missingEnchants) > 0 then
    table.insert(parts, AddonText("whisperMissingEnchants") .. ": " .. JoinList(entry.missingEnchants, ", "))
  end

  local gemIssues = FormatGemIssues(entry)
  if CountList(gemIssues) > 0 then
    table.insert(parts, AddonText("whisperMissingGems") .. ": " .. JoinList(gemIssues, ", "))
  end

  local message
  if #parts == 0 then
    message = AddonText("whisperNoIssues")
  else
    message = AddonText("whisperPrefix") .. " " .. table.concat(parts, "; ")
  end

  if SendChatMessage then
    SendChatMessage(message, "WHISPER", nil, entry.displayName)
  end
end

local function SendRaidCheckResponse(sender, requestId, raidName, difficultyId)
  if RequestRaidInfo then
    RequestRaidInfo()
  end

  local function sendResponse()
    local killedBosses, errorText = GetKilledBossesForRaid(raidName, difficultyId)
    local status = RAID_CHECK_STATUS.clean
    if errorText then
      status = RAID_CHECK_STATUS.unavailable
      killedBosses = {}
    elseif killedBosses and #killedBosses > 0 then
      status = RAID_CHECK_STATUS.hasLockout
    end

    SendRaidReminderAddonMessage(
      BuildAddonMessage("RSP", requestId, status, killedBosses and #killedBosses or 0),
      "WHISPER",
      sender
    )

    for index, bossName in ipairs(killedBosses or {}) do
      SendRaidReminderAddonMessage(BuildAddonMessage("BOS", requestId, index, bossName), "WHISPER", sender)
    end
  end

  if C_Timer and C_Timer.After then
    C_Timer.After(RAID_CHECK_REPLY_DELAY, sendResponse)
  else
    sendResponse()
  end
end

local function SendRaidCheckRequest(state)
  if not state or not state.target then
    return
  end

  SendRaidReminderAddonMessage(
    BuildAddonMessage("REQ", state.requestId, state.target.raidName, state.target.difficultyId or ""),
    GetGroupAddonDistribution()
  )
end

local function MarkMissingRaidCheckAddons(requestId)
  if not raidCheckState or raidCheckState.requestId ~= requestId then
    return
  end

  for _, entry in ipairs(raidCheckState.entries) do
    if entry.status == RAID_CHECK_STATUS.pending then
      entry.status = RAID_CHECK_STATUS.noAddon
    end
  end

  RenderRaidCheckRows()
end

local function RefreshRaidCheck(fields)
  if not raidCheckContent or not raidCheckStatus then
    return
  end

  if not IsInRaid or not IsInRaid() then
    raidCheckState = nil
    ResetInspectQueue(nil)
    RenderRaidCheckRows(AddonText("raidReadinessNoRaid"))
    return
  end

  local target = GetRaidCheckTarget(fields)
  raidCheckRequestSerial = raidCheckRequestSerial + 1
  local requestId = tostring(math.floor((GetTime and GetTime() or 0) * 1000)) .. "-" .. raidCheckRequestSerial
  local entries = BuildRaidRosterEntries()
  local state = {
    entries = entries,
    entryByKey = {},
    requestId = requestId,
    target = target,
  }

  for _, entry in ipairs(entries) do
    AddRaidCheckEntryAlias(state, entry, entry.key)
    AddRaidCheckEntryAlias(state, entry, entry.name)
    AddRaidCheckEntryAlias(state, entry, BuildCharacterKey(entry.name, entry.realm))

    if not target then
      entry.status = RAID_CHECK_STATUS.unavailable
    end

    if entry.key == GetPlayerCharacterKey() or entry.name == (UnitName and UnitName("player") or nil) then
      state.localEntry = entry
      entry.hasAddon = true
    end
  end

  raidCheckState = state
  RenderRaidCheckRows()
  StartRaidInspectScan(state)

  if not target then
    return
  end

  if RequestRaidInfo then
    RequestRaidInfo()
  end

  if C_Timer and C_Timer.After then
    C_Timer.After(RAID_CHECK_REPLY_DELAY, function()
      ApplyLocalRaidCheckResult(requestId)
    end)
    C_Timer.After(RAID_CHECK_REPLY_TIMEOUT, function()
      MarkMissingRaidCheckAddons(requestId)
    end)
  else
    ApplyLocalRaidCheckResult(requestId)
    MarkMissingRaidCheckAddons(requestId)
  end

  SendRaidCheckRequest(state)
end

local function HandleRaidCheckResponse(sender, parts)
  if not raidCheckState or parts[2] ~= raidCheckState.requestId then
    return
  end

  local entry = FindRaidCheckEntry(sender)
  if not entry then
    return
  end

  local status = parts[3]
  entry.hasAddon = true
  entry.killedBosses = {}

  if status == RAID_CHECK_STATUS.hasLockout then
    entry.status = RAID_CHECK_STATUS.hasLockout
  elseif status == RAID_CHECK_STATUS.unavailable then
    entry.status = RAID_CHECK_STATUS.unavailable
  else
    entry.status = RAID_CHECK_STATUS.clean
  end

  RenderRaidCheckRows()
end

local function HandleRaidCheckBoss(sender, parts)
  if not raidCheckState or parts[2] ~= raidCheckState.requestId then
    return
  end

  local entry = FindRaidCheckEntry(sender)
  if not entry then
    return
  end

  entry.hasAddon = true
  table.insert(entry.killedBosses, parts[4] or AddonText("unknown"))
  if #entry.killedBosses > 0 then
    entry.status = RAID_CHECK_STATUS.hasLockout
  end

  RenderRaidCheckRows()
end

local function HandleRaidCheckRequest(sender, parts)
  if IsSenderPlayer(sender) then
    return
  end

  local requestId = parts[2]
  local raidName = parts[3]
  local difficultyId = tonumber(parts[4])
  if not requestId or requestId == "" or not raidName or raidName == "" then
    return
  end

  SendRaidCheckResponse(sender, requestId, raidName, difficultyId)
end

local function HandleRaidCheckAddonMessage(prefix, message, _, sender)
  if prefix ~= ADDON_MESSAGE_PREFIX or type(message) ~= "string" or not sender then
    return
  end

  RegisterAddonMessages()

  local parts = SplitAddonMessage(message)
  local command = parts[1]
  if command == "REQ" then
    HandleRaidCheckRequest(sender, parts)
  elseif command == "RSP" and not IsSenderPlayer(sender) then
    HandleRaidCheckResponse(sender, parts)
  elseif command == "BOS" and not IsSenderPlayer(sender) then
    HandleRaidCheckBoss(sender, parts)
  end
end

local function SelectExportText()
  if not editBox then
    return
  end

  editBox:SetFocus()
  editBox:HighlightText()
end

local function RefreshExport()
  if not editBox then
    return
  end

  local fields = GetExportFields()
  editBox:SetText(BuildExportString(fields))
  RefreshRaidCheck(fields)
  SelectExportText()
end

local function ApplyPanelBackdrop(panel, alpha)
  if panel.SetBackdrop then
    panel:SetBackdrop({
      bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background-Dark",
      edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
      tile = true,
      tileSize = 16,
      edgeSize = 14,
      insets = { left = 4, right = 4, top = 4, bottom = 4 },
    })
    panel:SetBackdropColor(0.02, 0.018, 0.014, alpha or 0.94)
    panel:SetBackdropBorderColor(0.72, 0.58, 0.28, 0.9)
    return
  end

  local background = panel:CreateTexture(nil, "BACKGROUND")
  background:SetAllPoints(panel)
  background:SetColorTexture(0.02, 0.018, 0.014, alpha or 0.94)
end

local function CreateBorderedPanel(parent, width, height, point, relativeTo, relativePoint, x, y)
  local panel = CreateFrame("Frame", nil, parent, "BackdropTemplate")
  panel:SetSize(width, height)
  panel:SetPoint(point, relativeTo, relativePoint, x, y)
  ApplyPanelBackdrop(panel)
  return panel
end

function ApplyButtonTextures(button)
  if button.SetNormalFontObject then
    if GameFontNormalSmall then
      button:SetNormalFontObject(GameFontNormalSmall)
    end
    if GameFontHighlightSmall then
      button:SetHighlightFontObject(GameFontHighlightSmall)
    end
    if GameFontDisableSmall then
      button:SetDisabledFontObject(GameFontDisableSmall)
    end
  end
end

local function CreateStyledButton(parent, width, height, text)
  local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
  button:SetSize(width, height)
  ApplyButtonTextures(button)
  button:SetText(text)
  return button
end

local function CreateFilterCheckbox(parent, text, checked, onClick)
  local checkbox = CreateFrame("CheckButton", nil, parent, "UICheckButtonTemplate")
  checkbox:SetSize(24, 24)
  checkbox:SetChecked(checked)
  checkbox.label = checkbox:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  checkbox.label:SetPoint("LEFT", checkbox, "RIGHT", 6, 1)
  checkbox.label:SetText(text)
  checkbox:SetScript("OnClick", onClick)
  return checkbox
end

local function CreateSummaryCard(parent, iconPath, label, colorName)
  local card = CreateFrame("Frame", nil, parent, "BackdropTemplate")
  card:SetSize(198, 58)
  ApplyPanelBackdrop(card, 0.78)

  card.icon = card:CreateTexture(nil, "ARTWORK")
  card.icon:SetSize(34, 34)
  card.icon:SetPoint("LEFT", 10, 0)
  card.icon:SetTexture(iconPath)

  card.label = card:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  card.label:SetPoint("TOPLEFT", card.icon, "TOPRIGHT", 10, -3)
  card.label:SetWidth(136)
  card.label:SetJustifyH("LEFT")
  card.label:SetText(label)

  card.value = card:CreateFontString(nil, "OVERLAY", "GameFontHighlightLarge")
  card.value:SetPoint("TOPLEFT", card.label, "BOTTOMLEFT", 0, -2)
  card.value:SetText("0")
  SetTextColor(card.value, colorName or "white")

  return card
end

local function CreateTableHeader(parent)
  raidCheckHeader = CreateFrame("Frame", nil, parent)
  raidCheckHeader:SetSize(RAID_CHECK_WIDTH, RAID_CHECK_ROW_HEIGHT)
  raidCheckHeader:SetPoint("TOPLEFT", parent, "TOPLEFT", 16, -16)

  local background = raidCheckHeader:CreateTexture(nil, "BACKGROUND")
  background:SetAllPoints(raidCheckHeader)
  background:SetColorTexture(0.12, 0.09, 0.05, 0.86)

  for index, column in ipairs(TABLE_COLUMNS) do
    local label = raidCheckHeader:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    label:SetPoint("LEFT", raidCheckHeader, "LEFT", GetTableColumnOffset(index), 0)
    label:SetWidth(column.width)
    label:SetJustifyH("CENTER")
    label:SetText(AddonText(column.key))
  end
end

local function CreateExportFrame()
  if frame then
    return
  end

  frame = CreateFrame("Frame", "RaidReminderExportFrame", UIParent, "BasicFrameTemplateWithInset")
  frame:SetSize(EXPORT_FRAME_WIDTH, EXPORT_FRAME_COMPACT_HEIGHT)
  frame:SetPoint("CENTER")
  BringExportFrameToFront()
  frame:SetMovable(true)
  frame:EnableMouse(true)
  frame:RegisterForDrag("LeftButton")
  frame:SetScript("OnMouseDown", BringExportFrameToFront)
  frame:SetScript("OnDragStart", frame.StartMoving)
  frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
  frame:Hide()
  frame:SetScript("OnHide", function()
    PlayRaidReminderSound("IG_CHARACTER_INFO_CLOSE")
  end)
  RegisterSpecialFrame("RaidReminderExportFrame")

  if frame.TitleText then
    frame.TitleText:SetText("RaidReminder")
    frame.TitleText:SetTextColor(1, 0.82, 0)
  else
    local title = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightLarge")
    title:SetPoint("TOP", 0, -8)
    title:SetText("RaidReminder")
    title:SetTextColor(1, 0.82, 0)
  end

  raidCheckExportPanel = CreateBorderedPanel(frame, 820, 92, "TOP", frame, "TOP", 0, -38)

  local exportTitle = raidCheckExportPanel:CreateFontString(nil, "OVERLAY", "GameFontNormal")
  exportTitle:SetPoint("TOPLEFT", 18, -14)
  exportTitle:SetText(AddonText("exportTitle"))
  exportTitle:SetTextColor(1, 0.82, 0)

  local hint = raidCheckExportPanel:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  hint:SetPoint("TOPLEFT", 18, -62)
  hint:SetText(AddonText("exportHint"))

  editBox = CreateFrame("EditBox", nil, raidCheckExportPanel, "InputBoxTemplate")
  editBox:SetSize(740, 28)
  editBox:SetPoint("TOPLEFT", 18, -36)
  editBox:SetAutoFocus(false)
  editBox:SetFontObject(ChatFontNormal)
  editBox:SetScript("OnEditFocusGained", function(self)
    self:HighlightText()
  end)
  editBox:SetScript("OnMouseUp", function(self)
    self:HighlightText()
  end)
  editBox:SetScript("OnEscapePressed", function(self)
    self:ClearFocus()
  end)

  raidCheckLabel = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
  raidCheckLabel:SetPoint("TOPLEFT", frame, "TOPLEFT", 60, -150)
  raidCheckLabel:SetText(AddonText("raidReadinessTitle"))
  raidCheckLabel:SetTextColor(1, 0.82, 0)

  raidCheckTargetText = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  raidCheckTargetText:SetPoint("TOPLEFT", raidCheckLabel, "BOTTOMLEFT", 0, -12)
  raidCheckTargetText:SetWidth(520)
  raidCheckTargetText:SetJustifyH("LEFT")
  raidCheckTargetText:SetText(AddonText("raidReadinessNoRaid"))

  raidCheckProblemFilter = CreateFilterCheckbox(frame, AddonText("filterProblems"), raidCheckShowProblemsOnly, function(self)
    raidCheckShowProblemsOnly = self:GetChecked() and true or false
    RenderRaidCheckRows()
  end)
  raidCheckProblemFilter:SetPoint("TOPLEFT", frame, "TOPLEFT", 560, -168)

  raidCheckAddonFilter = CreateFilterCheckbox(frame, AddonText("filterAddon"), raidCheckShowAddonOnly, function(self)
    raidCheckShowAddonOnly = self:GetChecked() and true or false
    RenderRaidCheckRows()
  end)
  raidCheckAddonFilter:SetPoint("LEFT", raidCheckProblemFilter.label, "RIGHT", 28, 0)

  local summaryPanel = CreateBorderedPanel(frame, 850, 74, "TOP", frame, "TOP", 0, -214)
  local addonCard = CreateSummaryCard(summaryPanel, "Interface\\Icons\\INV_Misc_GroupNeedMore", AddonText("addonSummary"), "white")
  addonCard:SetPoint("LEFT", summaryPanel, "LEFT", 14, 0)
  local cleanCard = CreateSummaryCard(summaryPanel, "Interface\\RaidFrame\\ReadyCheck-Ready", AddonText("cleanSummary"), "green")
  cleanCard:SetPoint("LEFT", addonCard, "RIGHT", 10, 0)
  local enchantCard = CreateSummaryCard(summaryPanel, "Interface\\Icons\\INV_Misc_EnchantedScroll", AddonText("enchantSummary"), "gold")
  enchantCard:SetPoint("LEFT", cleanCard, "RIGHT", 10, 0)
  local gemCard = CreateSummaryCard(summaryPanel, "Interface\\Icons\\INV_Misc_Gem_X4_MetaGem_Cut", AddonText("gemSummary"), "gold")
  gemCard:SetPoint("LEFT", enchantCard, "RIGHT", 10, 0)

  raidCheckSummary.addonValue = addonCard.value
  raidCheckSummary.cleanValue = cleanCard.value
  raidCheckSummary.enchantValue = enchantCard.value
  raidCheckSummary.gemValue = gemCard.value
  raidCheckSummary.panel = summaryPanel

  raidCheckTablePanel = CreateBorderedPanel(frame, 850, 350, "TOP", frame, "TOP", 0, -302)
  CreateTableHeader(raidCheckTablePanel)

  raidCheckScrollFrame = CreateFrame("ScrollFrame", nil, raidCheckTablePanel, "UIPanelScrollFrameTemplate")
  raidCheckScrollFrame:SetPoint("TOPLEFT", raidCheckHeader, "BOTTOMLEFT", 0, -4)
  raidCheckScrollFrame:SetPoint("BOTTOMRIGHT", raidCheckTablePanel, "BOTTOMRIGHT", -34, 20)

  raidCheckContent = CreateFrame("Frame", nil, raidCheckScrollFrame)
  raidCheckContent:SetSize(RAID_CHECK_WIDTH, 1)
  raidCheckScrollFrame:SetScrollChild(raidCheckContent)

  raidCheckStatus = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  raidCheckStatus:SetPoint("BOTTOMLEFT", raidCheckTablePanel, "BOTTOMLEFT", 18, 12)
  raidCheckStatus:SetWidth(620)
  raidCheckStatus:SetJustifyH("LEFT")
  raidCheckStatus:SetText("")
  raidCheckStatus:SetTextColor(0.82, 0.78, 0.68)

  local refreshButton = CreateStyledButton(frame, 150, 28, AddonText("refresh"))
  refreshButton:SetPoint("BOTTOM", frame, "BOTTOM", -95, 24)
  refreshButton:SetScript("OnClick", RefreshExport)

  local closeButton = CreateStyledButton(frame, 150, 28, AddonText("close"))
  closeButton:SetPoint("LEFT", refreshButton, "RIGHT", 40, 0)
  closeButton:SetScript("OnClick", function()
    frame:Hide()
  end)

  SetExportFrameMode("raidCheck")
end

local function ShowExportFrame()
  CreateExportFrame()
  BringExportFrameToFront()
  PlayRaidReminderSound("IG_CHARACTER_INFO_OPEN")
  frame:Show()
  RefreshExport()

  if C_Timer and C_Timer.After then
    C_Timer.After(0, SelectExportText)
  end
end

local function FormatRaidLockoutReset(seconds)
  seconds = tonumber(seconds)
  if not seconds or seconds <= 0 then
    return nil
  end

  local days = math.floor(seconds / 86400)
  local hours = math.floor((seconds % 86400) / 3600)
  local minutes = math.floor((seconds % 3600) / 60)

  if days > 0 then
    return string.format("%dd %dh", days, hours)
  end

  if hours > 0 then
    return string.format("%dh %dm", hours, minutes)
  end

  return string.format("%dm", minutes)
end

local function BuildRaidLockoutRows()
  local rows = {}

  if not GetNumSavedInstances or not GetSavedInstanceInfo or not GetSavedInstanceEncounterInfo then
    return rows
  end

  local savedInstanceCount = GetNumSavedInstances()
  for instanceIndex = 1, savedInstanceCount do
    local name, _, reset, difficultyId, locked, extended, _, isRaid, _, difficultyName, numEncounters =
      GetSavedInstanceInfo(instanceIndex)

    if isRaid and locked and numEncounters and numEncounters > 0 then
      local resetText = FormatRaidLockoutReset(reset)
      local difficultyLabel = difficultyName or AddonText("unknown")
      if resetText then
        difficultyLabel = difficultyLabel .. " (" .. resetText .. ")"
      end

      if extended then
        difficultyLabel = difficultyLabel .. " +"
      end

      for encounterIndex = 1, numEncounters do
        local bossName, fileDataID, isKilled = GetSavedInstanceEncounterInfo(instanceIndex, encounterIndex)
        if bossName and bossName ~= "" then
          table.insert(rows, {
            bossName = bossName,
            difficultyId = difficultyId or 0,
            difficultyName = difficultyLabel,
            encounterIndex = encounterIndex,
            isKilled = isKilled and true or false,
            raidName = name or AddonText("unknown"),
          })
        end
      end
    end
  end

  table.sort(rows, function(left, right)
    if left.raidName ~= right.raidName then
      return left.raidName < right.raidName
    end

    if left.difficultyId ~= right.difficultyId then
      return left.difficultyId < right.difficultyId
    end

    return left.encounterIndex < right.encounterIndex
  end)

  return rows
end

local function GetRaidLockoutRow(index)
  local row = raidLockoutRows[index]
  if row then
    row:Show()
    return row
  end

  row = CreateFrame("Frame", nil, raidLockoutContent)
  row:SetHeight(RAID_LOCKOUT_ROW_HEIGHT)
  row:SetPoint("TOPLEFT", 0, -((index - 1) * RAID_LOCKOUT_ROW_HEIGHT))
  row:SetPoint("RIGHT", raidLockoutContent, "RIGHT", 0, 0)

  row.background = row:CreateTexture(nil, "BACKGROUND")
  row.background:SetAllPoints(row)
  row.background:SetColorTexture(1, 1, 1, index % 2 == 0 and 0.04 or 0.02)

  row.raidText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.raidText:SetPoint("LEFT", 6, 0)
  row.raidText:SetWidth(190)
  row.raidText:SetJustifyH("LEFT")
  row.raidText:SetWordWrap(false)

  row.difficultyText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.difficultyText:SetPoint("LEFT", row.raidText, "RIGHT", 12, 0)
  row.difficultyText:SetWidth(150)
  row.difficultyText:SetJustifyH("LEFT")
  row.difficultyText:SetWordWrap(false)

  row.bossText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.bossText:SetPoint("LEFT", row.difficultyText, "RIGHT", 12, 0)
  row.bossText:SetWidth(230)
  row.bossText:SetJustifyH("LEFT")
  row.bossText:SetWordWrap(false)

  row.statusText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.statusText:SetPoint("LEFT", row.bossText, "RIGHT", 12, 0)
  row.statusText:SetWidth(90)
  row.statusText:SetJustifyH("LEFT")
  row.statusText:SetWordWrap(false)

  raidLockoutRows[index] = row
  return row
end

local function HideRaidLockoutRowsFrom(startIndex)
  for index = startIndex, #raidLockoutRows do
    raidLockoutRows[index]:Hide()
  end
end

local function RenderRaidLockoutRows(statusText)
  if not raidLockoutContent or not raidLockoutStatus then
    return
  end

  if statusText then
    HideRaidLockoutRowsFrom(1)
    raidLockoutContent:SetHeight(1)
    raidLockoutStatus:SetText(statusText)
    return
  end

  local rows = BuildRaidLockoutRows()
  raidLockoutContent:SetHeight(math.max(#rows * RAID_LOCKOUT_ROW_HEIGHT, 1))

  for index, rowData in ipairs(rows) do
    local row = GetRaidLockoutRow(index)
    row.raidText:SetText(rowData.raidName)
    row.difficultyText:SetText(rowData.difficultyName)
    row.bossText:SetText(rowData.bossName)

    if rowData.isKilled then
      row.statusText:SetText(AddonText("killed"))
      row.statusText:SetTextColor(0.36, 0.86, 0.45)
    else
      row.statusText:SetText(AddonText("unlocked"))
      row.statusText:SetTextColor(0.78, 0.78, 0.78)
    end
  end

  HideRaidLockoutRowsFrom(#rows + 1)

  if #rows == 0 then
    raidLockoutStatus:SetText(AddonText("noRaidLockouts"))
  else
    raidLockoutStatus:SetText(string.format(AddonText("rowCount"), #rows))
  end
end

local function RefreshRaidLockoutFrame()
  RenderRaidLockoutRows(AddonText("loading"))

  if RequestRaidInfo then
    RequestRaidInfo()
  else
    RenderRaidLockoutRows(AddonText("unavailable"))
    return
  end

  if C_Timer and C_Timer.After then
    C_Timer.After(1, function()
      if raidLockoutFrame and raidLockoutFrame:IsShown() then
        RenderRaidLockoutRows()
      end
    end)
  end
end

local function CreateRaidLockoutFrame()
  if raidLockoutFrame then
    return
  end

  raidLockoutFrame = CreateFrame("Frame", "RaidReminderRaidLockoutFrame", UIParent, "BasicFrameTemplateWithInset")
  raidLockoutFrame:SetSize(760, 520)
  raidLockoutFrame:SetPoint("CENTER")
  BringRaidLockoutFrameToFront()
  raidLockoutFrame:SetMovable(true)
  raidLockoutFrame:EnableMouse(true)
  raidLockoutFrame:RegisterForDrag("LeftButton")
  raidLockoutFrame:SetScript("OnMouseDown", BringRaidLockoutFrameToFront)
  raidLockoutFrame:SetScript("OnDragStart", raidLockoutFrame.StartMoving)
  raidLockoutFrame:SetScript("OnDragStop", raidLockoutFrame.StopMovingOrSizing)
  raidLockoutFrame:Hide()
  raidLockoutFrame:SetScript("OnHide", function()
    PlayRaidReminderSound("IG_CHARACTER_INFO_CLOSE")
  end)
  RegisterSpecialFrame("RaidReminderRaidLockoutFrame")

  local title = raidLockoutFrame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  title:SetPoint("TOP", 0, -7)
  title:SetText("RaidReminder Raid Lockouts")

  local header = CreateFrame("Frame", nil, raidLockoutFrame)
  header:SetSize(700, RAID_LOCKOUT_ROW_HEIGHT)
  header:SetPoint("TOPLEFT", 24, -38)

  local headerBackground = header:CreateTexture(nil, "BACKGROUND")
  headerBackground:SetAllPoints(header)
  headerBackground:SetColorTexture(1, 1, 1, 0.08)

  local raidHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  raidHeader:SetPoint("LEFT", 6, 0)
  raidHeader:SetWidth(190)
  raidHeader:SetJustifyH("LEFT")
  raidHeader:SetText(AddonText("raid"))

  local difficultyHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  difficultyHeader:SetPoint("LEFT", raidHeader, "RIGHT", 12, 0)
  difficultyHeader:SetWidth(150)
  difficultyHeader:SetJustifyH("LEFT")
  difficultyHeader:SetText(AddonText("difficulty"))

  local bossHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  bossHeader:SetPoint("LEFT", difficultyHeader, "RIGHT", 12, 0)
  bossHeader:SetWidth(230)
  bossHeader:SetJustifyH("LEFT")
  bossHeader:SetText(AddonText("boss"))

  local statusHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  statusHeader:SetPoint("LEFT", bossHeader, "RIGHT", 12, 0)
  statusHeader:SetWidth(90)
  statusHeader:SetJustifyH("LEFT")
  statusHeader:SetText(AddonText("status"))

  local scrollFrame = CreateFrame("ScrollFrame", nil, raidLockoutFrame, "UIPanelScrollFrameTemplate")
  scrollFrame:SetPoint("TOPLEFT", header, "BOTTOMLEFT", 0, -4)
  scrollFrame:SetPoint("BOTTOMRIGHT", raidLockoutFrame, "BOTTOMRIGHT", -42, 58)

  raidLockoutContent = CreateFrame("Frame", nil, scrollFrame)
  raidLockoutContent:SetSize(700, 1)
  scrollFrame:SetScrollChild(raidLockoutContent)

  raidLockoutStatus = raidLockoutFrame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  raidLockoutStatus:SetPoint("BOTTOM", 0, 42)
  raidLockoutStatus:SetWidth(700)
  raidLockoutStatus:SetJustifyH("CENTER")
  raidLockoutStatus:SetText("")

  local refreshButton = CreateFrame("Button", nil, raidLockoutFrame, "UIPanelButtonTemplate")
  refreshButton:SetSize(120, 24)
  refreshButton:SetPoint("BOTTOMLEFT", 250, 18)
  refreshButton:SetText(AddonText("refresh"))
  refreshButton:SetScript("OnClick", RefreshRaidLockoutFrame)

  local closeButton = CreateFrame("Button", nil, raidLockoutFrame, "UIPanelButtonTemplate")
  closeButton:SetSize(120, 24)
  closeButton:SetPoint("BOTTOMRIGHT", -250, 18)
  closeButton:SetText(AddonText("close"))
  closeButton:SetScript("OnClick", function()
    raidLockoutFrame:Hide()
  end)

  raidLockoutEventFrame = CreateFrame("Frame")
  raidLockoutEventFrame:RegisterEvent("UPDATE_INSTANCE_INFO")
  raidLockoutEventFrame:SetScript("OnEvent", function()
    if raidLockoutFrame and raidLockoutFrame:IsShown() then
      RenderRaidLockoutRows()
    end
  end)
end

local function ShowRaidLockoutFrame()
  CreateRaidLockoutFrame()
  BringRaidLockoutFrameToFront()
  PlayRaidReminderSound("IG_CHARACTER_INFO_OPEN")
  raidLockoutFrame:Show()
  RefreshRaidLockoutFrame()
end

raidCheckEventFrame = CreateFrame("Frame")
raidCheckEventFrame:RegisterEvent("PLAYER_LOGIN")
raidCheckEventFrame:RegisterEvent("CHAT_MSG_ADDON")
raidCheckEventFrame:RegisterEvent("GROUP_ROSTER_UPDATE")
raidCheckEventFrame:RegisterEvent("UPDATE_INSTANCE_INFO")
raidCheckEventFrame:RegisterEvent("INSPECT_READY")
raidCheckEventFrame:SetScript("OnEvent", function(_, event, ...)
  if event == "PLAYER_LOGIN" then
    RegisterAddonMessages()
  elseif event == "CHAT_MSG_ADDON" then
    HandleRaidCheckAddonMessage(...)
  elseif event == "INSPECT_READY" then
    HandleInspectReady(...)
  elseif event == "GROUP_ROSTER_UPDATE" then
    if frame and frame:IsShown() then
      RefreshRaidCheck(GetExportFields())
    end
  elseif event == "UPDATE_INSTANCE_INFO" then
    if frame and frame:IsShown() then
      local fields = GetExportFields()
      local target = GetRaidCheckTarget(fields)
      if not IsInRaid or not IsInRaid() then
        raidCheckState = nil
        ResetInspectQueue(nil)
        RenderRaidCheckRows()
      elseif (target and (not raidCheckState or not RaidCheckTargetsMatch(raidCheckState.target, target))) then
        RefreshRaidCheck(fields)
      elseif raidCheckState and raidCheckState.target then
        ApplyLocalRaidCheckResult(raidCheckState.requestId)
      end
    end
  end
end)

RegisterAddonMessages()

SLASH_RAIDREMINDER1 = "/rr"
SLASH_RAIDREMINDER2 = "/raidreminder"
SlashCmdList.RAIDREMINDER = ShowExportFrame

SLASH_RAIDREMINDER_RAIDS1 = "/rraid"
SlashCmdList.RAIDREMINDER_RAIDS = ShowRaidLockoutFrame

print(ADDON_NAME .. " loaded. Type /rr to export your setup or /rraid to view raid lockouts.")
