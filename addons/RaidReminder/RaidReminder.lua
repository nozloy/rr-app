local ADDON_NAME = ...
local EXPORT_PREFIX = "RR1?"
local QR_EXPORT_PREFIX = "RRQ1?"
local QR_BOX_SIZE = 340
local QR_QUIET_ZONE = 4
local WINDOW_FRAME_STRATA = "FULLSCREEN_DIALOG"
local WINDOW_FRAME_LEVEL = 1000
local RAID_LOCKOUT_ROW_HEIGHT = 22

local frame
local editBox
local qrContainer
local qrBackground
local qrStatus
local qrTextures = {}
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

local ADDON_LOCALE = GetLocale and GetLocale() or "enUS"
local ADDON_TEXT = {
  enGB = {
    boss = "Boss",
    close = "Close",
    difficulty = "Difficulty",
    killed = "Killed",
    loading = "Loading...",
    noRaidLockouts = "No current raid lockouts were found.",
    raid = "Raid",
    refresh = "Refresh",
    rowCount = "%d boss rows from current raid lockouts.",
    status = "Status",
    unknown = "Unknown",
    unlocked = "Not killed",
    unavailable = "Raid lockout API is unavailable in this client.",
  },
  enUS = {
    boss = "Boss",
    close = "Close",
    difficulty = "Difficulty",
    killed = "Killed",
    loading = "Loading...",
    noRaidLockouts = "No current raid lockouts were found.",
    raid = "Raid",
    refresh = "Refresh",
    rowCount = "%d boss rows from current raid lockouts.",
    status = "Status",
    unknown = "Unknown",
    unlocked = "Not killed",
    unavailable = "Raid lockout API is unavailable in this client.",
  },
  ruRU = {
    boss = "Босс",
    close = "Закрыть",
    difficulty = "Сложность",
    killed = "Убит",
    loading = "Загрузка...",
    noRaidLockouts = "Текущие рейдовые сохранения не найдены.",
    raid = "Рейд",
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

local function BuildQrExportString(fields)
  fields = fields or GetExportFields()

  local params = {}
  AddParam(params, "n", fields.playerName)
  AddParam(params, "l", fields.raidLeaderName)
  AddParam(params, "r", fields.realmName)
  AddParam(params, "c", CompactClass(fields.classFile))
  AddParam(params, "cl", fields.localizedClass)
  AddParam(params, "s", fields.specName)
  AddParam(params, "i", fields.itemLevel)
  AddParam(params, "g", CompactGroupType(fields.groupType))
  AddParam(params, "z", fields.groupSize)
  AddParam(params, "m", fields.compactMembers)
  AddParam(params, "t", CompactInstanceType(fields.instanceType))
  AddParam(params, "in", fields.instanceName)
  AddParam(params, "di", fields.difficultyID)
  AddParam(params, "dn", fields.difficultyName)
  AddParam(params, "sr", fields.selectedRaidDifficultyID)
  AddParam(params, "sn", fields.selectedRaidDifficultyName)
  AddParam(params, "kl", fields.keyLevel)
  AddParam(params, "km", fields.keyChallengeMapID)
  AddParam(params, "kn", fields.keyMapName)

  return QR_EXPORT_PREFIX .. table.concat(params, "&")
end

local function HideQrTexturesFrom(startIndex)
  for index = startIndex, #qrTextures do
    qrTextures[index]:Hide()
  end
end

local function GetQrTexture(index)
  local texture = qrTextures[index]
  if not texture then
    texture = qrContainer:CreateTexture(nil, "ARTWORK")
    texture:SetColorTexture(0, 0, 0, 1)
    qrTextures[index] = texture
  end

  texture:Show()
  return texture
end

local function DrawQrCode(text)
  if not qrContainer or not qrBackground or not qrStatus then
    return
  end

  if not RaidReminderQr or type(RaidReminderQr.qrcode) ~= "function" then
    HideQrTexturesFrom(1)
    qrBackground:Hide()
    qrStatus:SetText("QR encoder is not loaded.")
    return
  end

  local ok, qrOk, matrix = pcall(RaidReminderQr.qrcode, text, 1)
  if not ok or not qrOk or type(matrix) ~= "table" then
    HideQrTexturesFrom(1)
    qrBackground:Hide()
    qrStatus:SetText("QR could not be generated. Copy the text export instead.")
    return
  end

  local matrixSize = #matrix
  if matrixSize == 0 then
    HideQrTexturesFrom(1)
    qrBackground:Hide()
    qrStatus:SetText("QR payload is empty.")
    return
  end

  local fullSize = matrixSize + QR_QUIET_ZONE * 2
  local moduleSize = math.floor(QR_BOX_SIZE / fullSize)
  if moduleSize < 1 then
    moduleSize = 1
  end

  local drawnSize = fullSize * moduleSize
  qrContainer:SetSize(drawnSize, drawnSize)
  qrBackground:ClearAllPoints()
  qrBackground:SetAllPoints(qrContainer)
  qrBackground:SetColorTexture(1, 1, 1, 1)
  qrBackground:Show()

  local textureIndex = 0
  for y = 1, matrixSize do
    local x = 1
    while x <= matrixSize do
      while x <= matrixSize and (not matrix[x] or not matrix[x][y] or matrix[x][y] <= 0) do
        x = x + 1
      end

      local startX = x
      while x <= matrixSize and matrix[x] and matrix[x][y] and matrix[x][y] > 0 do
        x = x + 1
      end

      if startX <= matrixSize then
        textureIndex = textureIndex + 1
        local texture = GetQrTexture(textureIndex)
        texture:ClearAllPoints()
        texture:SetPoint(
          "TOPLEFT",
          qrContainer,
          "TOPLEFT",
          (startX - 1 + QR_QUIET_ZONE) * moduleSize,
          -((y - 1 + QR_QUIET_ZONE) * moduleSize)
        )
        texture:SetSize((x - startX) * moduleSize, moduleSize)
      end
    end
  end

  HideQrTexturesFrom(textureIndex + 1)
  qrStatus:SetText("Scan this QR on /banners/import, or copy the RR1 string above.")
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
  DrawQrCode(BuildQrExportString(fields))
  SelectExportText()
end

local function CreateExportFrame()
  if frame then
    return
  end

  frame = CreateFrame("Frame", "RaidReminderExportFrame", UIParent, "BasicFrameTemplateWithInset")
  frame:SetSize(700, 560)
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

  local qrLabel = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  qrLabel:SetPoint("TOP", editBox, "BOTTOM", 0, -18)
  qrLabel:SetText("Mobile QR import")

  qrContainer = CreateFrame("Frame", nil, frame)
  qrContainer:SetSize(QR_BOX_SIZE, QR_BOX_SIZE)
  qrContainer:SetPoint("TOP", editBox, "BOTTOM", 0, -40)

  qrBackground = qrContainer:CreateTexture(nil, "BACKGROUND")
  qrBackground:SetColorTexture(1, 1, 1, 1)
  qrBackground:SetAllPoints(qrContainer)

  qrStatus = frame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  qrStatus:SetPoint("TOP", qrContainer, "BOTTOM", 0, -8)
  qrStatus:SetWidth(650)
  qrStatus:SetJustifyH("CENTER")
  qrStatus:SetText("QR will update with the export string.")

  local refreshButton = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
  refreshButton:SetSize(120, 24)
  refreshButton:SetPoint("BOTTOMLEFT", 220, 18)
  refreshButton:SetText("Update")
  refreshButton:SetScript("OnClick", RefreshExport)

  local closeButton = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
  closeButton:SetSize(120, 24)
  closeButton:SetPoint("BOTTOMRIGHT", -220, 18)
  closeButton:SetText("Close")
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

SLASH_RAIDREMINDER1 = "/rr"
SLASH_RAIDREMINDER2 = "/raidreminder"
SlashCmdList.RAIDREMINDER = ShowExportFrame

SLASH_RAIDREMINDER_RAIDS1 = "/rraid"
SlashCmdList.RAIDREMINDER_RAIDS = ShowRaidLockoutFrame

print(ADDON_NAME .. " loaded. Type /rr to export your setup or /rraid to view raid lockouts.")
