local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

-- Presence uses the existing REQ/RSP envelope so 0.2.8 and older clients can
-- answer too. A reply to the sentinel is NEVER interpreted as a clean lockout.
local pendingReplies, cachedReplies = {}, {}
local infoTimer
local cycle = 0
local lastRequestAt = -math.huge
local lastRequestId
local syncTimers = {}

local function CancelSyncTimers()
  for _, timer in ipairs(syncTimers) do timer:Cancel() end
  syncTimers = {}
end

local function Send(message, distribution, recipient)
  if IsZombakLFGRestricted() then return false end
  local ok, result = pcall(SendRaidReminderAddonMessage, message, distribution, recipient)
  local accepted = ok and (result == true or
    (Enum and Enum.SendAddonMessageResult and result == Enum.SendAddonMessageResult.Success))
  RR.Diagnostics.Record("CHECK_TX", { command = message:match("^[^\t]+"),
    request = message:match("^[^\t]+\t([^\t]+)"),
    recipient = recipient or distribution, accepted = accepted or false,
    result = ok and result or "error" })
  return accepted
end

local function IsGroupSender(sender)
  local key = BuildCharacterKeyFromFullName(sender)
  local name, realm = SplitFullName(sender)
  if not realm then key = BuildCharacterKey(name, GetRealmName()) end
  for _, entry in ipairs(BuildRaidRosterEntries(GetRaidCheckGroupType())) do
    if entry.key == key then return true end
  end
  return false
end

local function Reply(result)
  if not IsGroupSender(result.sender) then return end
  Send(BuildAddonMessage("RSP", result.requestId, result.status, #result.bosses), "WHISPER", result.sender)
  for index, boss in ipairs(result.bosses) do
    Send(BuildAddonMessage("BOS", result.requestId, index, boss), "WHISPER", result.sender)
  end
end

local function CompleteRaidInfo(ready)
  if infoTimer then infoTimer:Cancel(); infoTimer = nil end
  if raidCheckState and raidCheckState.target and raidCheckState.awaitingRaidInfo then
    raidCheckState.awaitingRaidInfo = nil
    if ready then
      ApplyLocalRaidCheckResult(raidCheckState.requestId)
    else
      ApplyRaidCheckResult(raidCheckState.localEntry, nil, InterfaceText("lockoutUnavailable"))
      RenderRaidCheckRows()
    end
  end
  local replies = pendingReplies
  pendingReplies = {}
  for sender, result in pairs(replies) do
    local bosses, errorText
    if ready then bosses, errorText = GetKilledBossesForRaid(result.raidName, result.difficultyId, result.instanceID) end
    result.bosses = bosses or {}
    result.status = (not ready or errorText) and RAID_CHECK_STATUS.unavailable or
      (#result.bosses > 0 and RAID_CHECK_STATUS.hasLockout or RAID_CHECK_STATUS.clean)
    if ready and not errorText then
      result.expires = GetTime() + RAID_CHECK_REPLY_TIMEOUT
      cachedReplies[sender] = result
    end
    Reply(result)
  end
  RR.Diagnostics.Record("CHECK_RAID_INFO", { ready = ready })
end

function RequestFreshRaidCheckInfo()
  if infoTimer then return end
  if not RequestRaidInfo or not C_Timer or not C_Timer.NewTimer then
    CompleteRaidInfo(false)
    return
  end
  -- Install the timeout before the request: the game may answer synchronously.
  infoTimer = C_Timer.NewTimer(RAID_CHECK_INFO_TIMEOUT, function() CompleteRaidInfo(false) end)
  local ok = pcall(RequestRaidInfo)
  if not ok then CompleteRaidInfo(false) end
end

function RR.Readiness.HandleInstanceInfo()
  CompleteRaidInfo(true)
  -- Also accept a late event after the timeout for our own lockout.
  if raidCheckState and raidCheckState.target then ApplyLocalRaidCheckResult(raidCheckState.requestId) end
end

function SendRaidCheckRequest(state)
  if not state or not state.checksLockout or GetRaidCheckGroupType() ~= "raid" then return end
  -- Roster events can arrive in a burst. The scheduled retries cover a deferred send.
  if state.requestId == lastRequestId and GetTime() - lastRequestAt < 1 then return end
  lastRequestAt = GetTime()
  lastRequestId = state.requestId
  local target = state.target
  Send(BuildAddonMessage("REQ", state.requestId, target and target.raidName or RAID_CHECK_PRESENCE_TARGET,
    target and target.difficultyId or 0, target and target.instanceID or ""), GetGroupAddonDistribution())
end

function MarkMissingRaidCheckAddons(requestId)
  if not raidCheckState or raidCheckState.requestId ~= requestId then return end
  local unanswered, unknownLockouts = 0, 0
  for _, entry in ipairs(raidCheckState.entries) do
    if not entry.hasAddon then
      entry.status = RAID_CHECK_STATUS.noAddon
      unanswered = unanswered + 1
    elseif entry.status == RAID_CHECK_STATUS.pending then
      entry.status = RAID_CHECK_STATUS.unavailable
      unknownLockouts = unknownLockouts + 1
    end
  end
  RR.Diagnostics.Record("CHECK_TIMEOUT", { request = requestId, unanswered = unanswered, unknownLockouts = unknownLockouts })
  RenderRaidCheckRows()
end

local function NeedsReply(state)
  for _, entry in ipairs(state.entries) do
    if not entry.hasAddon or (state.target and entry ~= state.localEntry and not entry.lockoutReply) then return true end
  end
  return false
end

function StartRaidCheckSync(state, preserveLockouts)
  CancelSyncTimers()
  cycle = cycle + 1
  local currentCycle = cycle
  if not state.checksLockout then return end
  RR.Diagnostics.Record("CHECK_START", { request = state.requestId, raid = state.target and state.target.raidName,
    difficulty = state.target and state.target.difficultyId, presenceOnly = not state.target })
  if state.target and state.localEntry and state.localEntry.status == RAID_CHECK_STATUS.pending then
    state.awaitingRaidInfo = true
    RequestFreshRaidCheckInfo()
  end
  if preserveLockouts and not NeedsReply(state) then return end
  SendRaidCheckRequest(state)
  if not C_Timer or not C_Timer.NewTimer then return end
  for _, delay in ipairs({ 3, 8, RAID_CHECK_REPLY_TIMEOUT }) do
    syncTimers[#syncTimers + 1] = C_Timer.NewTimer(delay, function()
      if cycle ~= currentCycle or raidCheckState ~= state or not frame or not frame:IsShown() then return end
      if delay == RAID_CHECK_REPLY_TIMEOUT then
        MarkMissingRaidCheckAddons(state.requestId)
      elseif NeedsReply(state) then
        SendRaidCheckRequest(state)
      end
    end)
  end
end

local function ReplyEntry(sender, parts)
  if not raidCheckState or not raidCheckState.checksLockout or parts[2] ~= raidCheckState.requestId then return end
  return FindRaidCheckEntry(sender)
end

RR.Comm.RegisterHandler("RRP", function(parts, sender)
  local entry = ReplyEntry(sender, parts)
  if not entry then return end
  entry.hasAddon = true
  entry.addonVersion = parts[3]
  if not raidCheckState.target then entry.status = RAID_CHECK_STATUS.unavailable end
  RR.Diagnostics.Record("CHECK_PRESENCE", { sender = sender, request = parts[2], version = parts[3] })
  RenderRaidCheckRows()
end)

function HandleRaidCheckResponse(sender, parts)
  local entry = ReplyEntry(sender, parts)
  if not entry then return end
  local status = parts[3]
  if status ~= RAID_CHECK_STATUS.clean and status ~= RAID_CHECK_STATUS.hasLockout and
    status ~= RAID_CHECK_STATUS.unavailable then return end
  entry.hasAddon = true
  if not raidCheckState.target then
    entry.status = RAID_CHECK_STATUS.unavailable
    entry.killedBosses = {}
  else
    entry.status = status
    entry.lockoutReply = status ~= RAID_CHECK_STATUS.unavailable
    if status ~= RAID_CHECK_STATUS.hasLockout then
      entry.killedBosses, entry.bossesByIndex = {}, {}
    else
      -- Repeated headers must not erase boss packets already received.
      entry.expectedBosses = tonumber(parts[4]) or 0
      entry.lockoutReply = #entry.killedBosses >= entry.expectedBosses
    end
  end
  RR.Diagnostics.Record("CHECK_REPLY", { sender = sender, request = parts[2], status = status,
    presenceOnly = not raidCheckState.target })
  RenderRaidCheckRows()
end

function HandleRaidCheckBoss(sender, parts)
  local entry = ReplyEntry(sender, parts)
  local index = tonumber(parts[3])
  if not entry or not raidCheckState.target or not index or index < 1 or index > 100 or index ~= math.floor(index)
    or not parts[4] or parts[4] == "" then return end
  entry.hasAddon = true
  entry.bossesByIndex = entry.bossesByIndex or {}
  entry.bossesByIndex[index] = parts[4]
  entry.killedBosses = {}
  for bossIndex = 1, 100 do
    if entry.bossesByIndex[bossIndex] then table.insert(entry.killedBosses, entry.bossesByIndex[bossIndex]) end
  end
  entry.status = RAID_CHECK_STATUS.hasLockout
  entry.lockoutReply = entry.expectedBosses and #entry.killedBosses >= entry.expectedBosses
  RenderRaidCheckRows()
end

function HandleRaidCheckRequest(sender, parts)
  if IsSenderPlayer(sender) or not IsGroupSender(sender) then return end
  local requestId, raidName, difficultyId = parts[2], parts[3], tonumber(parts[4])
  if not requestId or requestId == "" or not raidName or raidName == "" then return end
  local version = C_AddOns and C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "unknown"
  Send(BuildAddonMessage("RRP", requestId, version), "WHISPER", sender)
  RR.Diagnostics.Record("CHECK_REQUEST", { sender = sender, request = requestId, raid = raidName,
    difficulty = difficultyId, instanceID = parts[5] })
  if raidName == RAID_CHECK_PRESENCE_TARGET then return end
  local now = GetTime()
  for key, cached in pairs(cachedReplies) do
    if now > cached.expires then cachedReplies[key] = nil end
  end
  local cached = cachedReplies[sender]
  if cached and cached.requestId == requestId and cached.raidName == raidName and
    cached.difficultyId == difficultyId and cached.instanceID == tonumber(parts[5]) then Reply(cached); return end
  pendingReplies[sender] = { sender = sender, requestId = requestId, raidName = raidName,
    difficultyId = difficultyId, instanceID = tonumber(parts[5]) }
  RequestFreshRaidCheckInfo()
end

function RR.Readiness.HandleGroupChange()
  if GetRaidCheckGroupType() ~= "raid" then
    raidCheckSelectedTarget = nil
    pendingReplies, cachedReplies = {}, {}
    CancelSyncTimers()
    if infoTimer then infoTimer:Cancel(); infoTimer = nil end
    if raidCheckState and raidCheckState.checksLockout then raidCheckState = nil end
    cycle = cycle + 1
  end
  if frame and frame:IsShown() then RR.Readiness.Refresh(GetExportFields(), GEAR_SCAN_MODE.roster) end
end

function RR.Readiness.Resume()
  if frame and frame:IsShown() then RR.Readiness.Refresh(GetExportFields(), GEAR_SCAN_MODE.roster) end
end

function RR.Readiness.GetStatusLines()
  local lines = { "readinessGroup=" .. (GetRaidCheckGroupType() or "solo") }
  if not raidCheckState then lines[#lines + 1] = "readinessCheck=not started"; return lines end
  local state = raidCheckState
  lines[#lines + 1] = "readinessRequest=" .. state.requestId
  lines[#lines + 1] = "readinessTarget=" .. (state.target and GetRaidCheckTargetLabel(state.target) or "presence only")
  for _, entry in ipairs(state.entries) do
    lines[#lines + 1] = "readinessPlayer=" .. entry.displayName .. " addon=" .. (entry.hasAddon and "confirmed" or "unconfirmed") ..
      " version=" .. (entry.addonVersion or "unknown") .. " lockout=" .. entry.status
  end
  return lines
end
