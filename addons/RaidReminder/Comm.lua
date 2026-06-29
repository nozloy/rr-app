local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Comm.lua
function CleanAddonMessageField(value)
  value = tostring(value or "")
  return value:gsub(ADDON_MESSAGE_SEPARATOR, " ")
end

function BuildAddonMessage(...)
  local parts = {}
  for index = 1, select("#", ...) do
    parts[index] = CleanAddonMessageField(select(index, ...))
  end

  return table.concat(parts, ADDON_MESSAGE_SEPARATOR)
end

function SplitAddonMessage(message)
  local parts = {}
  message = tostring(message or "") .. ADDON_MESSAGE_SEPARATOR

  for part in message:gmatch("([^" .. ADDON_MESSAGE_SEPARATOR .. "]*)" .. ADDON_MESSAGE_SEPARATOR) do
    table.insert(parts, part)
  end

  return parts
end

function RegisterAddonMessages()
  if addonMessagePrefixRegistered then
    return
  end

  if C_ChatInfo and C_ChatInfo.RegisterAddonMessagePrefix then
    addonMessagePrefixRegistered = C_ChatInfo.RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX) ~= false
  elseif RegisterAddonMessagePrefix then
    addonMessagePrefixRegistered = RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX) ~= false
  end
end

function SendRaidReminderAddonMessage(message, distribution, target)
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

function GetGroupAddonDistribution()
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

function SendRaidCheckResponse(sender, requestId, raidName, difficultyId)
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

function SendRaidCheckRequest(state)
  if not state or not state.target then
    return
  end

  SendRaidReminderAddonMessage(
    BuildAddonMessage("REQ", state.requestId, state.target.raidName, state.target.difficultyId or ""),
    GetGroupAddonDistribution()
  )
end

function MarkMissingRaidCheckAddons(requestId)
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

function RefreshRaidCheck(fields, scanMode)
  if not raidCheckContent or not raidCheckStatus then
    return
  end

  local groupType = GetRaidCheckGroupType()
  if not groupType then
    raidCheckState = nil
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
  local requestId = tostring(math.floor((GetTime and GetTime() or 0) * 1000)) .. "-" .. raidCheckRequestSerial
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
    if scanMode ~= GEAR_SCAN_MODE.full then
      CopyGearResult(entry, FindRaidCheckEntryInState(previousState, entry))
    end

    AddRaidCheckEntryAlias(state, entry, entry.key)
    AddRaidCheckEntryAlias(state, entry, entry.name)
    AddRaidCheckEntryAlias(state, entry, BuildCharacterKey(entry.name, entry.realm))

    if checksLockout and not target then
      entry.status = RAID_CHECK_STATUS.unavailable
    end

    if entry.key == GetPlayerCharacterKey() or entry.name == (UnitName and UnitName("player") or nil) then
      state.localEntry = entry
      entry.hasAddon = true
    end
  end

  raidCheckState = state
  RenderRaidCheckRows()
  StartRaidInspectScan(state, scanMode)

  if not checksLockout or not target then
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

function HandleRaidCheckResponse(sender, parts)
  if not raidCheckState or not raidCheckState.checksLockout or parts[2] ~= raidCheckState.requestId then
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

function HandleRaidCheckBoss(sender, parts)
  if not raidCheckState or not raidCheckState.checksLockout or parts[2] ~= raidCheckState.requestId then
    return
  end

  local entry = FindRaidCheckEntry(sender)
  if not entry then
    return
  end

  entry.hasAddon = true
  table.insert(entry.killedBosses, parts[4] or InterfaceText("unknown"))
  if #entry.killedBosses > 0 then
    entry.status = RAID_CHECK_STATUS.hasLockout
  end

  RenderRaidCheckRows()
end

function HandleRaidCheckRequest(sender, parts)
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

function HandleRaidCheckAddonMessage(prefix, message, _, sender)
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

RR.Comm.RegisterAddonMessages = RegisterAddonMessages
RR.Comm.HandleAddonMessage = HandleRaidCheckAddonMessage
RR.Readiness.Refresh = RefreshRaidCheck
RR.Readiness.UpdateSummary = UpdateRaidCheckSummary
RR.Readiness.SendWhisper = SendRaidReminderWhisper
