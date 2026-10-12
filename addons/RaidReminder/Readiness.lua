local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Readiness.lua
function RaidNamesMatch(left, right)
  return type(left) == "string" and type(right) == "string" and left ~= "" and right ~= "" and left == right
end

function RaidDifficultiesMatch(savedDifficultyId, targetDifficultyId)
  targetDifficultyId = tonumber(targetDifficultyId)
  if not targetDifficultyId or targetDifficultyId == 0 then
    return true
  end

  return tonumber(savedDifficultyId) == targetDifficultyId
end

local function ReadKilledBossesForRaid(raidName, difficultyId, instanceID)
  local killedBosses = {}

  if not GetNumSavedInstances or not GetSavedInstanceInfo or not GetSavedInstanceEncounterInfo then
    return nil, InterfaceText("unavailable")
  end

  local savedInstanceCount = GetNumSavedInstances()
  for instanceIndex = 1, savedInstanceCount do
    local name, _, _, savedDifficultyId, locked, _, _, isRaid, _, _, numEncounters, _, _, savedInstanceID =
      GetSavedInstanceInfo(instanceIndex)

    local sameRaid = RaidNamesMatch(name, raidName)
    if tonumber(instanceID) and tonumber(instanceID) > 0 and tonumber(savedInstanceID) and tonumber(savedInstanceID) > 0 then
      sameRaid = tonumber(instanceID) == tonumber(savedInstanceID)
    end

    if
      isRaid
      and locked
      and sameRaid
      and RaidDifficultiesMatch(savedDifficultyId, difficultyId)
    then
      if not numEncounters or numEncounters < 1 then return nil, InterfaceText("lockoutUnavailable") end
      for encounterIndex = 1, numEncounters do
        local bossName, _, isKilled = GetSavedInstanceEncounterInfo(instanceIndex, encounterIndex)
        if isKilled == nil then return nil, InterfaceText("lockoutUnavailable") end
        if isKilled then
          table.insert(killedBosses, bossName and bossName ~= "" and bossName or InterfaceText("unknown"))
        end
      end
    end
  end

  return killedBosses
end

function GetKilledBossesForRaid(raidName, difficultyId, instanceID)
  local ok, bosses, errorText = pcall(ReadKilledBossesForRaid, raidName, difficultyId, instanceID)
  if not ok then return nil, InterfaceText("lockoutUnavailable") end
  return bosses, errorText
end

function GetRaidCheckTarget(fields)
  fields = fields or GetExportFields()
  if fields.instanceType ~= "raid" or not fields.instanceName or fields.instanceName == "" then
    return raidCheckSelectedTarget
  end

  return {
    difficultyId = fields.difficultyID or fields.selectedRaidDifficultyID,
    difficultyName = fields.difficultyName or fields.selectedRaidDifficultyName,
    raidName = fields.instanceName,
    instanceID = fields.instanceID,
  }
end

function GetRaidCheckTargetLabel(target)
  if not target then
    return InterfaceText("unknown")
  end

  if target.difficultyName and target.difficultyName ~= "" then
    return target.raidName .. " - " .. target.difficultyName
  end

  return target.raidName
end

function RaidCheckTargetsMatch(left, right)
  if not left or not right then
    return false
  end

  local sameRaid = left.raidName == right.raidName
  if left.instanceID and right.instanceID then sameRaid = left.instanceID == right.instanceID end
  return sameRaid and tostring(left.difficultyId or "") == tostring(right.difficultyId or "")
end

function AddRaidCheckEntryAlias(state, entry, key)
  if not state or not state.entryByKey or not entry or not key or key == "" then
    return
  end

  state.entryByKey[key] = entry
end

function CopyArray(list)
  local copied = {}
  if type(list) ~= "table" then
    return copied
  end

  for index, value in ipairs(list) do
    if type(value) == "table" then
      local item = {}
      for key, itemValue in pairs(value) do
        item[key] = itemValue
      end
      copied[index] = item
    else
      copied[index] = value
    end
  end

  return copied
end

function FindRaidCheckEntryInState(state, entry)
  if not state or not state.entryByKey or not entry then
    return nil
  end

  return state.entryByKey[entry.key]
    or state.entryByKey[BuildCharacterKey(entry.name, entry.realm)]
end

function CopyGearResult(entry, previousEntry)
  if not entry or not previousEntry then
    return false
  end

  entry.emptyGemSlots = CopyArray(previousEntry.emptyGemSlots)
  entry.enchantStatus = previousEntry.enchantStatus or GEAR_CHECK_STATUS.pending
  entry.gearResultPreserved = true
  entry.gemStatus = previousEntry.gemStatus or GEAR_CHECK_STATUS.pending
  entry.itemLevel = previousEntry.itemLevel
  entry.missingEnchantSlotKeys = CopyArray(previousEntry.missingEnchantSlotKeys)
  entry.missingEnchants = CopyArray(previousEntry.missingEnchants)
  return true
end

function HasGearIssue(entry)
  return entry and (entry.enchantStatus == GEAR_CHECK_STATUS.issue or entry.gemStatus == GEAR_CHECK_STATUS.issue)
end

function HasPendingGear(entry)
  return entry and (entry.enchantStatus == GEAR_CHECK_STATUS.pending or entry.gemStatus == GEAR_CHECK_STATUS.pending)
end

function ShouldInspectGear(entry, scanMode)
  if scanMode == GEAR_SCAN_MODE.manual then
    return entry and entry.gearResultPreserved and HasGearIssue(entry)
  end

  if scanMode == GEAR_SCAN_MODE.roster then
    return entry and (not entry.gearResultPreserved or HasPendingGear(entry))
  end

  return entry ~= nil
end

function GetRaidCheckGroupType()
  if IsInRaid and IsInRaid() then
    return "raid"
  end

  if IsInGroup and IsInGroup() then
    return "party"
  end

  return nil
end

function AddRaidCheckRosterEntry(entries, groupType, unit, rosterName, rank)
  local name, realm = GetUnitNameAndRealm(unit, rosterName)
  if not name or name == "" then
    name, realm = SplitFullName(rosterName)
  end

  local key = BuildCharacterKey(name, realm)
  if not key then
    return
  end

  local isLeader = rank == 2
  if UnitExists(unit) and UnitIsGroupLeader and UnitIsGroupLeader(unit) then
    isLeader = true
  end

  local _, classFile = UnitClass(unit)
  table.insert(entries, {
    checksLockout = groupType == "raid",
    classFile = classFile,
    displayName = GetDisplayCharacterName(name, realm),
    emptyGemSlots = {},
    enchantStatus = GEAR_CHECK_STATUS.pending,
    gemStatus = GEAR_CHECK_STATUS.pending,
    groupType = groupType,
    hasAddon = false,
    isLeader = isLeader,
    itemLevel = nil,
    key = key,
    killedBosses = {},
    missingEnchantSlotKeys = {},
    missingEnchants = {},
    name = name,
    realm = realm,
    status = RAID_CHECK_STATUS.pending,
    unit = unit,
  })
end

function BuildRaidRosterEntries(groupType)
  local entries = {}

  if groupType == "raid" then
    local raidMembers = GetNumGroupMembers and GetNumGroupMembers() or 0
    for index = 1, raidMembers do
      local rosterName, rank = nil, nil
      if GetRaidRosterInfo then
        rosterName, rank = GetRaidRosterInfo(index)
      end

      AddRaidCheckRosterEntry(entries, groupType, "raid" .. index, rosterName, rank)
    end

    return entries
  end

  if groupType == "party" then
    AddRaidCheckRosterEntry(entries, groupType, "player")

    local partyMembers = GetNumSubgroupMembers and GetNumSubgroupMembers() or 0
    for index = 1, partyMembers do
      AddRaidCheckRosterEntry(entries, groupType, "party" .. index)
    end
  end

  return entries
end

function FindRaidCheckEntry(sender)
  if not raidCheckState or not raidCheckState.entryByKey then
    return nil
  end

  local name, realm = SplitFullName(sender)
  local entry = raidCheckState.entryByKey[BuildCharacterKey(name, realm or GetRealmName())]
  if entry then return entry end
  local unresolved = raidCheckState.entryByKey[name]
  if unresolved and not CompactRealmName(unresolved.realm) then return unresolved end
end

function GetRaidCheckStatusText(entry)
  if entry.status == RAID_CHECK_STATUS.clean then
    return InterfaceText("cleanLockout")
  end

  if entry.status == RAID_CHECK_STATUS.hasLockout then
    return InterfaceText("hasLockout")
  end

  if entry.status == RAID_CHECK_STATUS.noAddon then
    return InterfaceText("noResponse")
  end

  if entry.status == RAID_CHECK_STATUS.unavailable then
    if raidCheckState and not raidCheckState.target then
      return InterfaceText("notChecked")
    end

    return InterfaceText("lockoutUnavailable")
  end

  return InterfaceText("checking")
end

function SetRaidCheckStatusColor(fontString, status)
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

function GetEnchantStatusText(entry)
  if entry.enchantStatus == GEAR_CHECK_STATUS.ready then
    return InterfaceText("enchantOk")
  end

  if entry.enchantStatus == GEAR_CHECK_STATUS.issue then
    return InterfaceText("missingEnchants")
  end

  if entry.enchantStatus == GEAR_CHECK_STATUS.notChecked then
    return InterfaceText("notChecked")
  end

  return InterfaceText("checking")
end

function GetGemStatusText(entry)
  if entry.gemStatus == GEAR_CHECK_STATUS.ready then
    return InterfaceText("gemsOk")
  end

  if entry.gemStatus == GEAR_CHECK_STATUS.issue then
    return InterfaceText("missingGems")
  end

  if entry.gemStatus == GEAR_CHECK_STATUS.notChecked then
    return InterfaceText("notChecked")
  end

  return InterfaceText("checking")
end

function SetGearStatusColor(fontString, status)
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

function GetEntryReadiness(entry)
  local hardIssues = 0
  local softIssues = 0

  if entry.checksLockout then
    if entry.status == RAID_CHECK_STATUS.clean then
      -- clean
    elseif entry.status == RAID_CHECK_STATUS.hasLockout then
      hardIssues = hardIssues + 1
    else
      softIssues = softIssues + 1
    end
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

function GetReadinessStatusText(entry)
  local readinessStatus = GetEntryReadiness(entry)
  if readinessStatus == READINESS_STATUS.ready then
    return InterfaceText("readyStatus")
  end

  if readinessStatus == READINESS_STATUS.notReady then
    return InterfaceText("notReadyStatus")
  end

  return InterfaceText("partialStatus")
end

function SetReadinessStatusColor(fontString, entry)
  local readinessStatus = GetEntryReadiness(entry)
  if readinessStatus == READINESS_STATUS.ready then
    SetTextColor(fontString, "green")
  elseif readinessStatus == READINESS_STATUS.notReady then
    SetTextColor(fontString, "red")
  else
    SetTextColor(fontString, "gold")
  end
end

function GetRaidCheckSortWeight(entry)
  local readinessStatus = GetEntryReadiness(entry)
  if readinessStatus == READINESS_STATUS.notReady then
    return 1
  end

  if readinessStatus == READINESS_STATUS.partial then
    return 2
  end

  return 5
end

function FormatGemIssues(entry, locale)
  local formatted = {}
  for _, issue in ipairs(entry.emptyGemSlots or {}) do
    local slotName = issue.slotName
    if locale and issue.textKey then
      slotName = WhisperTextForLocale(locale, issue.textKey)
    end

    if issue.count and issue.count > 1 then
      table.insert(formatted, slotName .. " x" .. issue.count)
    else
      table.insert(formatted, slotName)
    end
  end

  return formatted
end

function FormatEnchantIssues(entry, locale)
  local formatted = {}

  for _, slotKey in ipairs(entry.missingEnchantSlotKeys or {}) do
    table.insert(formatted, WhisperTextForLocale(locale, slotKey))
  end

  if #formatted > 0 then
    return formatted
  end

  return entry.missingEnchants or {}
end

function ShowRaidCheckTooltip(owner, entry)
  if not GameTooltip or not entry then
    return
  end

  GameTooltip:SetOwner(owner, "ANCHOR_RIGHT")
  GameTooltip:SetText(entry.displayName)

  if raidCheckState and raidCheckState.target then
    GameTooltip:AddLine(GetRaidCheckTargetLabel(raidCheckState.target), 0.78, 0.78, 0.78)
  end

  if entry.checksLockout and entry.status == RAID_CHECK_STATUS.hasLockout then
    GameTooltip:AddLine(InterfaceText("bossesKilled") .. ":", 1, 0.82, 0)
    for _, bossName in ipairs(entry.killedBosses or {}) do
      GameTooltip:AddLine(bossName, 1, 1, 1)
    end
  elseif entry.checksLockout then
    GameTooltip:AddLine(GetRaidCheckStatusText(entry), 1, 1, 1)
  end

  if CountList(entry.missingEnchants) > 0 then
    GameTooltip:AddLine(InterfaceText("whisperMissingEnchants") .. ":", 1, 0.82, 0)
    for _, slotName in ipairs(entry.missingEnchants) do
      GameTooltip:AddLine(slotName, 1, 1, 1)
    end
  elseif entry.enchantStatus == GEAR_CHECK_STATUS.notChecked then
    GameTooltip:AddLine(InterfaceText("enchants") .. ": " .. InterfaceText("notChecked"), 1, 0.82, 0)
  end

  if CountList(entry.emptyGemSlots) > 0 then
    GameTooltip:AddLine(InterfaceText("whisperMissingGems") .. ":", 1, 0.82, 0)
    for _, issueText in ipairs(FormatGemIssues(entry)) do
      GameTooltip:AddLine(issueText, 1, 1, 1)
    end
  elseif entry.gemStatus == GEAR_CHECK_STATUS.notChecked then
    GameTooltip:AddLine(InterfaceText("gems") .. ": " .. InterfaceText("notChecked"), 1, 0.82, 0)
  end

  GameTooltip:Show()
end

function HideRaidCheckRowsFrom(startIndex)
  for index = startIndex, #raidCheckRows do
    raidCheckRows[index]:Hide()
  end
end

function SetRaidCheckTableVisible(isVisible)
  SetFrameShown(raidCheckTablePanel, isVisible)
  SetFrameShown(raidCheckHeader, isVisible)
  SetFrameShown(raidCheckScrollFrame, isVisible)
end

function SetExportFrameMode(mode)
  if not frame then
    return
  end

  local showFullRaidCheck = raidCheckState and raidCheckState.entries and #raidCheckState.entries > 0
  local checksLockout = raidCheckState and raidCheckState.checksLockout
  frame:SetSize(EXPORT_FRAME_WIDTH, showFullRaidCheck and EXPORT_FRAME_FULL_HEIGHT or EXPORT_FRAME_COMPACT_HEIGHT)
  SetFrameShown(raidCheckLabel, true)
  SetFrameShown(raidCheckTargetText, true)
  SetFrameShown(raidCheckStatus, false)
  SetFrameShown(raidCheckProblemFilter, showFullRaidCheck)
  SetFrameShown(raidCheckAddonFilter, showFullRaidCheck and checksLockout)
  SetFrameShown(raidCheckTargetButton, showFullRaidCheck and checksLockout)
  if raidCheckTargetButton then
    raidCheckTargetButton:SetEnabled(select(2, GetInstanceFields()) ~= "raid")
  end
  SetFrameShown(raidCheckSummary.panel, showFullRaidCheck)
  SetFrameShown(raidCheckSummary.addonCard, showFullRaidCheck and checksLockout)
  if raidCheckSummary.cleanCard then
    raidCheckSummary.cleanCard:ClearAllPoints()
    if checksLockout then
      raidCheckSummary.cleanCard:SetPoint("LEFT", raidCheckSummary.addonCard, "RIGHT", 10, 0)
      raidCheckSummary.cleanCard.label:SetText(InterfaceText("cleanSummary"))
    else
      raidCheckSummary.cleanCard:SetPoint("LEFT", raidCheckSummary.panel, "LEFT", 14, 0)
      raidCheckSummary.cleanCard.label:SetText(InterfaceText("readySummary"))
    end
  end
  SetRaidCheckTableVisible(showFullRaidCheck)
end

function GetActiveTableColumns()
  if raidCheckState and raidCheckState.groupType == "party" then
    return TABLE_COLUMNS.party
  end

  return TABLE_COLUMNS
end

function GetTableColumnOffset(columns, columnIndex)
  if type(columns) == "number" then
    columnIndex = columns
    columns = GetActiveTableColumns()
  end

  local offset = 0
  for index = 1, columnIndex - 1 do
    offset = offset + columns[index].width
  end

  return offset
end

function GetTableColumn(columns, key)
  for index, column in ipairs(columns) do
    if column.key == key then
      return column, index
    end
  end

  return nil, nil
end

function SetTableFontStringColumn(fontString, anchorFrame, columns, key, leftPadding, widthPadding)
  if not fontString then
    return
  end

  local column, columnIndex = GetTableColumn(columns, key)
  if not column then
    fontString:Hide()
    return
  end

  fontString:ClearAllPoints()
  fontString:SetPoint(
    "LEFT",
    anchorFrame,
    "LEFT",
    GetTableColumnOffset(columns, columnIndex) + (leftPadding or 0),
    0
  )
  fontString:SetWidth(column.width + (widthPadding or 0))
  fontString:Show()
end

SendRaidReminderWhisper = nil
UpdateRaidCheckSummary = nil
ApplyButtonTextures = nil

function ApplyRaidCheckRowLayout(row, columns)
  if not row or not row.nameText then
    return
  end

  columns = columns or GetActiveTableColumns()
  SetTableFontStringColumn(row.nameText, row, columns, "character", 20, -24)
  SetTableFontStringColumn(row.itemLevelText, row, columns, "itemLevel")
  SetTableFontStringColumn(row.lockoutText, row, columns, "lockout")
  SetTableFontStringColumn(row.enchantText, row, columns, "enchants")
  SetTableFontStringColumn(row.gemText, row, columns, "gems")
  SetTableFontStringColumn(row.resultText, row, columns, "result")
  SetTableFontStringColumn(row.actionText, row, columns, "action")

  if row.leaderIcon then
    row.leaderIcon:ClearAllPoints()
    row.leaderIcon:SetPoint("RIGHT", row.nameText, "LEFT", -2, 0)
  end

  if row.whisperButton and row.actionText then
    row.whisperButton:ClearAllPoints()
    row.whisperButton:SetPoint("CENTER", row.actionText, "CENTER", 0, 0)
  end
end

function ApplyRaidCheckTableLayout()
  local columns = GetActiveTableColumns()
  local headerLabels = raidCheckSummary.headerLabels or {}

  if raidCheckHeader then
    for _, label in pairs(headerLabels) do
      label:Hide()
    end

    for index, column in ipairs(columns) do
      local label = headerLabels[column.key]
      if label then
        label:ClearAllPoints()
        label:SetPoint("LEFT", raidCheckHeader, "LEFT", GetTableColumnOffset(columns, index), 0)
        label:SetWidth(column.width)
        label:Show()
      end
    end
  end

  for _, row in ipairs(raidCheckRows) do
    ApplyRaidCheckRowLayout(row, columns)
  end
end

function GetRaidCheckRow(index)
  local row = raidCheckRows[index]
  if row then
    row:Show()
    ApplyRaidCheckRowLayout(row)
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

  ApplyRaidCheckRowLayout(row)
  raidCheckRows[index] = row
  return row
end

function RenderRaidCheckRows(statusText)
  if not raidCheckContent or not raidCheckStatus then
    return
  end

  if not raidCheckState or not raidCheckState.entries then
    HideRaidCheckRowsFrom(1)
    raidCheckContent:SetHeight(1)
    if raidCheckLabel then
      raidCheckLabel:SetText(InterfaceText("raidReadinessTitle"))
    end
    raidCheckStatus:SetText(statusText or InterfaceText("groupReadinessNoGroup"))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(statusText or InterfaceText("groupReadinessNoGroup"))
    end
    SetExportFrameMode("raidCheck")
    ApplyRaidCheckTableLayout()
    UpdateRaidCheckSummary()
    return
  end

  local checksLockout = raidCheckState.checksLockout
  if raidCheckLabel then
    raidCheckLabel:SetText(InterfaceText(checksLockout and "raidReadinessTitle" or "partyReadinessTitle"))
  end

  local entries = {}
  for _, entry in ipairs(raidCheckState.entries) do
    local readinessStatus = GetEntryReadiness(entry)
    local includeEntry = true
    if raidCheckShowProblemsOnly and readinessStatus == READINESS_STATUS.ready then
      includeEntry = false
    end

    if checksLockout and raidCheckShowAddonOnly and not entry.hasAddon then
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
  ApplyRaidCheckTableLayout()

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
  if checksLockout and raidCheckState.target then
    local targetLabel = GetRaidCheckTargetLabel(raidCheckState.target)
    raidCheckStatus:SetText(string.format(InterfaceText("raidTarget"), targetLabel))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(InterfaceText("raid") .. ": " .. targetLabel)
    end
  elseif checksLockout then
    raidCheckStatus:SetText(InterfaceText("noRaidTarget"))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(InterfaceText("noRaidTarget"))
    end
  else
    raidCheckStatus:SetText(InterfaceText("partyReadinessStatus"))
    if raidCheckTargetText then
      raidCheckTargetText:SetText(InterfaceText("partyReadinessStatus"))
    end
  end
  UpdateRaidCheckSummary()
end

-- Readiness orchestration
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

      if entry.checksLockout and entry.status == RAID_CHECK_STATUS.clean then
        cleanCount = cleanCount + 1
      elseif not entry.checksLockout and GetEntryReadiness(entry) == READINESS_STATUS.ready then
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

  local whisperLocale = GetWhisperLocale(entry)
  local parts = {}
  if CountList(entry.missingEnchants) > 0 then
    local enchantIssues = FormatEnchantIssues(entry, whisperLocale)
    table.insert(
      parts,
      WhisperTextForLocale(whisperLocale, "whisperMissingEnchants") .. ": " .. JoinList(enchantIssues, ", ")
    )
  end

  local gemIssues = FormatGemIssues(entry, whisperLocale)
  if CountList(gemIssues) > 0 then
    table.insert(
      parts,
      WhisperTextForLocale(whisperLocale, "whisperMissingGems") .. ": " .. JoinList(gemIssues, ", ")
    )
  end

  local message
  if #parts == 0 then
    message = WhisperTextForLocale(whisperLocale, "whisperNoIssues")
  else
    message = WhisperTextForLocale(whisperLocale, "whisperPrefix") .. " " .. table.concat(parts, "; ")
  end

  if SendChatMessage then
    SendChatMessage(message, "WHISPER", nil, entry.displayName)
  end
end

function RefreshRaidCheck(fields, scanMode)
  if not raidCheckContent or not raidCheckStatus then
    return
  end

  local groupType = GetRaidCheckGroupType()
  if not groupType then
    raidCheckState = nil
    raidCheckSelectedTarget = nil
    ResetInspectQueue(nil)
    RenderRaidCheckRows(InterfaceText("groupReadinessNoGroup"))
    return
  end

  local checksLockout = groupType == "raid"
  local target = checksLockout and GetRaidCheckTarget(fields) or nil
  local previousState = raidCheckState
  local isKnownScanMode = scanMode == GEAR_SCAN_MODE.manual
    or scanMode == GEAR_SCAN_MODE.roster
    or scanMode == GEAR_SCAN_MODE.full
  local groupTypeChanged = previousState and previousState.groupType ~= groupType
  local targetChanged = previousState
    and (previousState.target or target)
    and not RaidCheckTargetsMatch(previousState.target, target)

  if not isKnownScanMode then
    scanMode = GEAR_SCAN_MODE.full
  end
  if not previousState then
    scanMode = GEAR_SCAN_MODE.full
  elseif groupTypeChanged then
    scanMode = GEAR_SCAN_MODE.full
  elseif scanMode ~= GEAR_SCAN_MODE.full and targetChanged then
    scanMode = GEAR_SCAN_MODE.full
  end

  raidCheckRequestSerial = raidCheckRequestSerial + 1
  local playerKey = GetPlayerCharacterKey() or ""
  local playerHash = 0
  for index = 1, #playerKey do playerHash = (playerHash * 33 + playerKey:byte(index)) % 2147483647 end
  local requestId = playerHash .. ":" .. tostring(math.floor((GetTime and GetTime() or 0) * 1000)) .. "-" .. raidCheckRequestSerial
  local preserveLockouts = previousState and scanMode == GEAR_SCAN_MODE.roster and not groupTypeChanged and not targetChanged
  if preserveLockouts then requestId = previousState.requestId end
  local entries = BuildRaidRosterEntries(groupType)
  local state = {
    checksLockout = checksLockout,
    entries = entries,
    entryByKey = {},
    groupType = groupType,
    requestId = requestId,
    target = target,
  }

  for _, entry in ipairs(entries) do
    local previousEntry = FindRaidCheckEntryInState(previousState, entry)
    if scanMode ~= GEAR_SCAN_MODE.full then
      CopyGearResult(entry, previousEntry)
    end
    if previousEntry then
      entry.hasAddon = previousEntry.hasAddon
      entry.addonVersion = previousEntry.addonVersion
      if preserveLockouts and previousEntry.lockoutReply then
        entry.status = previousEntry.status
        entry.killedBosses = CopyArray(previousEntry.killedBosses)
        entry.bossesByIndex = previousEntry.bossesByIndex
        entry.expectedBosses = previousEntry.expectedBosses
        entry.lockoutReply = true
      end
    end

    AddRaidCheckEntryAlias(state, entry, entry.key)
    AddRaidCheckEntryAlias(state, entry, entry.name)
    AddRaidCheckEntryAlias(state, entry, BuildCharacterKey(entry.name, entry.realm))

    if checksLockout and not target then
      entry.status = RAID_CHECK_STATUS.unavailable
    end

    if entry.key == GetPlayerCharacterKey() or (UnitIsUnit and UnitIsUnit(entry.unit, "player")) then
      state.localEntry = entry
      entry.hasAddon = true
      entry.addonVersion = C_AddOns and C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "unknown"
    end
  end

  raidCheckState = state
  RenderRaidCheckRows()
  RR.Gear.StartInspectScan(state, scanMode)

  StartRaidCheckSync(state, preserveLockouts)
end

RR.Readiness.Refresh = RefreshRaidCheck
RR.Readiness.UpdateSummary = UpdateRaidCheckSummary
RR.Readiness.SendWhisper = SendRaidReminderWhisper
