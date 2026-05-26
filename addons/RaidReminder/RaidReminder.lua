local ADDON_NAME = ...
local EXPORT_PREFIX = "RR1?"
local ADDON_MESSAGE_PREFIX = "RaidReminder"
local ADDON_MESSAGE_SEPARATOR = "\t"
local WINDOW_FRAME_STRATA = "FULLSCREEN_DIALOG"
local WINDOW_FRAME_LEVEL = 1000
local EXPORT_FRAME_WIDTH = 700
local EXPORT_FRAME_COMPACT_HEIGHT = 150
local EXPORT_FRAME_RAID_CHECK_HEIGHT = 560
local RAID_CHECK_ROW_HEIGHT = 24
local RAID_CHECK_WIDTH = 650
local RAID_CHECK_REPLY_DELAY = 1
local RAID_CHECK_REPLY_TIMEOUT = 3
local RAID_LOCKOUT_ROW_HEIGHT = 22

local frame
local editBox
local raidCheckLabel
local raidCheckHeader
local raidCheckContent
local raidCheckScrollFrame
local raidCheckStatus
local raidCheckRows = {}
local raidCheckState
local raidCheckRequestSerial = 0
local addonMessagePrefixRegistered = false
local raidLockoutFrame
local raidLockoutContent
local raidLockoutStatus
local raidLockoutRows = {}
local raidLockoutEventFrame
local raidCheckEventFrame

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

local ADDON_LOCALE = GetLocale and GetLocale() or "enUS"
local ADDON_TEXT = {
  enGB = {
    boss = "Boss",
    bossesKilled = "Killed bosses",
    character = "Character",
    checking = "Checking...",
    cleanLockout = "Clean lockout",
    close = "Close",
    difficulty = "Difficulty",
    hasLockout = "Has lockout",
    killed = "Killed",
    loading = "Loading...",
    noAddon = "No add-on",
    noRaidGroup = "Join a raid group to check raid members.",
    noRaidLockouts = "No current raid lockouts were found.",
    noRaidTarget = "Stand inside the raid instance as the raid leader to check this raid.",
    raid = "Raid",
    raidCheckTitle = "Raid lockout check",
    raidLeaderMark = "RL",
    raidTarget = "Checking %s.",
    refresh = "Refresh",
    rowCount = "%d boss rows from current raid lockouts.",
    status = "Status",
    unknown = "Unknown",
    unlocked = "Not killed",
    unavailable = "Raid lockout API is unavailable in this client.",
  },
  enUS = {
    boss = "Boss",
    bossesKilled = "Killed bosses",
    character = "Character",
    checking = "Checking...",
    cleanLockout = "Clean lockout",
    close = "Close",
    difficulty = "Difficulty",
    hasLockout = "Has lockout",
    killed = "Killed",
    loading = "Loading...",
    noAddon = "No add-on",
    noRaidGroup = "Join a raid group to check raid members.",
    noRaidLockouts = "No current raid lockouts were found.",
    noRaidTarget = "Stand inside the raid instance as the raid leader to check this raid.",
    raid = "Raid",
    raidCheckTitle = "Raid lockout check",
    raidLeaderMark = "RL",
    raidTarget = "Checking %s.",
    refresh = "Refresh",
    rowCount = "%d boss rows from current raid lockouts.",
    status = "Status",
    unknown = "Unknown",
    unlocked = "Not killed",
    unavailable = "Raid lockout API is unavailable in this client.",
  },
  ruRU = {
    boss = "Босс",
    bossesKilled = "Убитые боссы",
    character = "Участник",
    checking = "Проверка...",
    cleanLockout = "Чистое кд",
    close = "Закрыть",
    difficulty = "Сложность",
    hasLockout = "Есть кд",
    killed = "Убит",
    loading = "Загрузка...",
    noAddon = "Нет аддона",
    noRaidGroup = "Вступите в рейдовую группу, чтобы проверить участников.",
    noRaidLockouts = "Текущие рейдовые сохранения не найдены.",
    noRaidTarget = "Встаньте рейдлидером внутри рейда, чтобы проверить это кд.",
    raid = "Рейд",
    raidCheckTitle = "Проверка кд рейда",
    raidLeaderMark = "РЛ",
    raidTarget = "Проверяем %s.",
    refresh = "Обновить",
    rowCount = "Строк боссов из текущих рейдовых сохранений: %d.",
    status = "Статус",
    unknown = "Неизвестно",
    unlocked = "Не убит",
    unavailable = "API рейдовых сохранений недоступен в этом клиенте.",
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

      table.insert(entries, {
        displayName = GetDisplayCharacterName(name, realm),
        isLeader = isLeader,
        key = key,
        killedBosses = {},
        name = name,
        realm = realm,
        status = RAID_CHECK_STATUS.pending,
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
    return AddonText("unavailable")
  end

  return AddonText("checking")
end

local function SetRaidCheckStatusColor(fontString, entry)
  if entry.status == RAID_CHECK_STATUS.clean then
    fontString:SetTextColor(0.36, 0.86, 0.45)
  elseif entry.status == RAID_CHECK_STATUS.hasLockout then
    fontString:SetTextColor(1, 0.38, 0.32)
  elseif entry.status == RAID_CHECK_STATUS.noAddon or entry.status == RAID_CHECK_STATUS.unavailable then
    fontString:SetTextColor(1, 0.73, 0.28)
  else
    fontString:SetTextColor(0.78, 0.78, 0.78)
  end
end

local function GetRaidCheckSortWeight(entry)
  if entry.status == RAID_CHECK_STATUS.hasLockout then
    return 1
  end

  if entry.status == RAID_CHECK_STATUS.noAddon then
    return 2
  end

  if entry.status == RAID_CHECK_STATUS.unavailable then
    return 3
  end

  if entry.status == RAID_CHECK_STATUS.pending then
    return 4
  end

  return 5
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

  GameTooltip:Show()
end

local function HideRaidCheckRowsFrom(startIndex)
  for index = startIndex, #raidCheckRows do
    raidCheckRows[index]:Hide()
  end
end

local function SetRaidCheckTableVisible(isVisible)
  if raidCheckHeader then
    if isVisible then
      raidCheckHeader:Show()
    else
      raidCheckHeader:Hide()
    end
  end

  if raidCheckScrollFrame then
    if isVisible then
      raidCheckScrollFrame:Show()
    else
      raidCheckScrollFrame:Hide()
    end
  end
end

local function SetExportFrameMode(mode)
  if not frame then
    return
  end

  local showRaidCheck = mode == "raidCheck"
  frame:SetSize(EXPORT_FRAME_WIDTH, showRaidCheck and EXPORT_FRAME_RAID_CHECK_HEIGHT or EXPORT_FRAME_COMPACT_HEIGHT)

  if raidCheckLabel then
    if showRaidCheck then
      raidCheckLabel:Show()
    else
      raidCheckLabel:Hide()
    end
  end

  if raidCheckStatus then
    if showRaidCheck then
      raidCheckStatus:Show()
    else
      raidCheckStatus:SetText("")
      raidCheckStatus:Hide()
    end
  end

  SetRaidCheckTableVisible(showRaidCheck)

  if not showRaidCheck then
    HideRaidCheckRowsFrom(1)
    if raidCheckContent then
      raidCheckContent:SetHeight(1)
    end
  end
end

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
  row.background:SetColorTexture(1, 1, 1, index % 2 == 0 and 0.04 or 0.02)

  row.nameText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.nameText:SetPoint("LEFT", 6, 0)
  row.nameText:SetWidth(390)
  row.nameText:SetJustifyH("LEFT")
  row.nameText:SetWordWrap(false)

  row.statusText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.statusText:SetPoint("LEFT", row.nameText, "RIGHT", 18, 0)
  row.statusText:SetWidth(210)
  row.statusText:SetJustifyH("LEFT")
  row.statusText:SetWordWrap(false)

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

  if statusText then
    HideRaidCheckRowsFrom(1)
    raidCheckContent:SetHeight(1)
    raidCheckStatus:SetText("")
    SetExportFrameMode("compact")
    return
  end

  if not raidCheckState or not raidCheckState.entries then
    HideRaidCheckRowsFrom(1)
    raidCheckContent:SetHeight(1)
    raidCheckStatus:SetText("")
    SetExportFrameMode("compact")
    return
  end

  local entries = {}
  for index, entry in ipairs(raidCheckState.entries) do
    entries[index] = entry
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
    if entry.isLeader then
      displayName = displayName .. " (" .. AddonText("raidLeaderMark") .. ")"
    end

    row.nameText:SetText(displayName)
    row.statusText:SetText(GetRaidCheckStatusText(entry))
    SetRaidCheckStatusColor(row.statusText, entry)
  end

  HideRaidCheckRowsFrom(#entries + 1)
  raidCheckStatus:SetText(string.format(AddonText("raidTarget"), GetRaidCheckTargetLabel(raidCheckState.target)))
end

local function ApplyRaidCheckResult(entry, killedBosses, errorText)
  if not entry then
    return
  end

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

  local target = GetRaidCheckTarget(fields)
  if not target then
    raidCheckState = nil
    RenderRaidCheckRows()
    return
  end

  if not IsInRaid or not IsInRaid() then
    raidCheckState = nil
    RenderRaidCheckRows()
    return
  end

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

    if entry.key == GetPlayerCharacterKey() or entry.name == (UnitName and UnitName("player") or nil) then
      state.localEntry = entry
    end
  end

  raidCheckState = state
  RenderRaidCheckRows()

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

  local title = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  title:SetPoint("TOP", 0, -7)
  title:SetText("RaidReminder Export")

  local hint = frame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  hint:SetPoint("TOPLEFT", 24, -34)
  hint:SetText("Press Ctrl+C to copy the selected string, then paste it into RaidReminder.")

  editBox = CreateFrame("EditBox", nil, frame, "InputBoxTemplate")
  editBox:SetSize(650, 28)
  editBox:SetPoint("TOPLEFT", 24, -56)
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

  raidCheckLabel = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  raidCheckLabel:SetPoint("TOPLEFT", editBox, "BOTTOMLEFT", 0, -18)
  raidCheckLabel:SetText(AddonText("raidCheckTitle"))

  raidCheckHeader = CreateFrame("Frame", nil, frame)
  raidCheckHeader:SetSize(RAID_CHECK_WIDTH, RAID_CHECK_ROW_HEIGHT)
  raidCheckHeader:SetPoint("TOPLEFT", editBox, "BOTTOMLEFT", 0, -40)

  local raidCheckHeaderBackground = raidCheckHeader:CreateTexture(nil, "BACKGROUND")
  raidCheckHeaderBackground:SetAllPoints(raidCheckHeader)
  raidCheckHeaderBackground:SetColorTexture(1, 1, 1, 0.08)

  local characterHeader = raidCheckHeader:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  characterHeader:SetPoint("LEFT", 6, 0)
  characterHeader:SetWidth(390)
  characterHeader:SetJustifyH("LEFT")
  characterHeader:SetText(AddonText("character"))

  local statusHeader = raidCheckHeader:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  statusHeader:SetPoint("LEFT", characterHeader, "RIGHT", 18, 0)
  statusHeader:SetWidth(210)
  statusHeader:SetJustifyH("LEFT")
  statusHeader:SetText(AddonText("status"))

  raidCheckScrollFrame = CreateFrame("ScrollFrame", nil, frame, "UIPanelScrollFrameTemplate")
  raidCheckScrollFrame:SetPoint("TOPLEFT", raidCheckHeader, "BOTTOMLEFT", 0, -4)
  raidCheckScrollFrame:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", -42, 58)

  raidCheckContent = CreateFrame("Frame", nil, raidCheckScrollFrame)
  raidCheckContent:SetSize(RAID_CHECK_WIDTH, 1)
  raidCheckScrollFrame:SetScrollChild(raidCheckContent)

  raidCheckStatus = frame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  raidCheckStatus:SetPoint("BOTTOM", 0, 42)
  raidCheckStatus:SetWidth(RAID_CHECK_WIDTH)
  raidCheckStatus:SetJustifyH("CENTER")
  raidCheckStatus:SetText("")
  SetExportFrameMode("compact")

  local refreshButton = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
  refreshButton:SetSize(120, 24)
  refreshButton:SetPoint("BOTTOMLEFT", 220, 18)
  refreshButton:SetText(AddonText("refresh"))
  refreshButton:SetScript("OnClick", RefreshExport)

  local closeButton = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
  closeButton:SetSize(120, 24)
  closeButton:SetPoint("BOTTOMRIGHT", -220, 18)
  closeButton:SetText(AddonText("close"))
  closeButton:SetScript("OnClick", function()
    frame:Hide()
  end)
end

local function ShowExportFrame()
  CreateExportFrame()
  BringExportFrameToFront()
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
  raidLockoutFrame:Show()
  RefreshRaidLockoutFrame()
end

raidCheckEventFrame = CreateFrame("Frame")
raidCheckEventFrame:RegisterEvent("PLAYER_LOGIN")
raidCheckEventFrame:RegisterEvent("CHAT_MSG_ADDON")
raidCheckEventFrame:RegisterEvent("GROUP_ROSTER_UPDATE")
raidCheckEventFrame:RegisterEvent("UPDATE_INSTANCE_INFO")
raidCheckEventFrame:SetScript("OnEvent", function(_, event, ...)
  if event == "PLAYER_LOGIN" then
    RegisterAddonMessages()
  elseif event == "CHAT_MSG_ADDON" then
    HandleRaidCheckAddonMessage(...)
  elseif event == "GROUP_ROSTER_UPDATE" then
    if frame and frame:IsShown() then
      RefreshRaidCheck(GetExportFields())
    end
  elseif event == "UPDATE_INSTANCE_INFO" then
    if frame and frame:IsShown() then
      local fields = GetExportFields()
      local target = GetRaidCheckTarget(fields)
      if not target or not IsInRaid or not IsInRaid() then
        raidCheckState = nil
        RenderRaidCheckRows()
      elseif not raidCheckState or not RaidCheckTargetsMatch(raidCheckState.target, target) then
        RefreshRaidCheck(fields)
      else
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
