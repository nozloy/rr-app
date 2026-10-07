local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Comm.lua
local handlers = {}
local channelWanted = false
local channelJoinedByUs = false
local channelTimer
local joinAttempts = 0
local pendingBroadcast
local transportStatus = { lastSend = "not attempted", lastReceive = "none", prefixResult = "not attempted" }

local function DescribeResult(value, codes)
  for name, code in pairs(codes or {}) do
    if value == code then
      return name .. " (" .. tostring(value) .. ")"
    end
  end
  return tostring(value)
end

local function SetSendStatus(message)
  if transportStatus.lastSend ~= message then
    transportStatus.lastSend = message
    ZombakDebug("Zombak transport: " .. message)
  end
end

function RR.Comm.RecordZombakReceive(message)
  transportStatus.lastReceive = message
  ZombakDebug("Zombak receive: " .. message)
end

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
    local result = C_ChatInfo.RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX)
    local codes = Enum and Enum.RegisterAddonMessagePrefixResult
    transportStatus.prefixResult = DescribeResult(result, codes)
    addonMessagePrefixRegistered = result == true or (codes and
      (result == codes.Success or result == codes.DuplicatePrefix)) or false
  end
end

function SendRaidReminderAddonMessage(message, distribution, target)
  RegisterAddonMessages()

  if not distribution or not addonMessagePrefixRegistered then
    return false
  end

  if C_ChatInfo and C_ChatInfo.SendAddonMessage then
    return C_ChatInfo.SendAddonMessage(ADDON_MESSAGE_PREFIX, message, distribution, target)
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

function HandleRaidCheckAddonMessage(prefix, message, distribution, sender, ...)
  if IsZombakLFGRestricted() or (issecretvalue and
    (issecretvalue(prefix) or issecretvalue(message) or issecretvalue(sender))) then
    return
  end
  if prefix ~= ADDON_MESSAGE_PREFIX or type(message) ~= "string" or not sender then
    return
  end

  RegisterAddonMessages()

  local parts = SplitAddonMessage(message)
  local command = parts[1]
  if command == ZOMBAK_RAID_EVENT then
    RR.Comm.RecordZombakReceive("received from " .. sender .. " via " .. tostring(distribution))
  end
  if command == "REQ" then
    HandleRaidCheckRequest(sender, parts)
  elseif command == "RSP" and not IsSenderPlayer(sender) then
    HandleRaidCheckResponse(sender, parts)
  elseif command == "BOS" and not IsSenderPlayer(sender) then
    HandleRaidCheckBoss(sender, parts)
  elseif handlers[command] then
    handlers[command](parts, sender, distribution, ...)
  end
end

function RR.Comm.RegisterHandler(command, handler)
  handlers[command] = handler
end

local function GetZombakChannelID()
  local channelID = GetChannelName and GetChannelName(ZOMBAK_RAID_CHANNEL)
  return channelID and channelID > 0 and channelID or nil
end

function RR.Comm.IsZombakChannel(distribution, _, _, localID, channelName)
  return distribution == "CHANNEL" and
    (channelName == ZOMBAK_RAID_CHANNEL or (localID ~= nil and localID == GetZombakChannelID()))
end

function RR.Comm.ClearZombakBroadcast()
  pendingBroadcast = nil
end

local function FlushZombakBroadcast()
  if not pendingBroadcast then
    return
  end
  if GetTime() > pendingBroadcast.expires then
    SetSendStatus("expired after 30 seconds; previous status: " .. transportStatus.lastSend)
    pendingBroadcast = nil
    return
  end

  local channelID = GetZombakChannelID()
  if not channelID then
    SetSendStatus("waiting for channel " .. ZOMBAK_RAID_CHANNEL)
    return
  elseif IsZombakLFGRestricted() then
    SetSendStatus("blocked by InChatMessagingLockdown")
    return
  end

  -- AreOutgoingAddonChatMessagesRestricted describes the realm's restriction
  -- policy and can stay true outside lockdown. It is not a standalone live
  -- send gate. Respect the current lockdown above and the actual API result.
  local result = SendRaidReminderAddonMessage(pendingBroadcast.message, "CHANNEL", tostring(channelID))
  local codes = Enum and Enum.SendAddonMessageResult
  SetSendStatus("SendAddonMessage: " .. DescribeResult(result, codes) .. "; channel=" .. channelID)
  if result == true or (codes and result == codes.Success) then
    pendingBroadcast = nil
    ZombakDebug("Zombak raid broadcast accepted by the API (delivery not confirmed)")
  elseif codes and result == codes.AddOnMessageLockdown then
    -- An explicit server refusal is terminal for this announcement.
    pendingBroadcast = nil
  end
end

local function MaintainZombakChannel()
  if not channelWanted then
    return
  end

  if not GetZombakChannelID() and joinAttempts < 5 then
    joinAttempts = joinAttempts + 1
    if not IsZombakLFGRestricted() then
      channelJoinedByUs = true
      JoinTemporaryChannel(ZOMBAK_RAID_CHANNEL)
      ZombakDebug("Joining " .. ZOMBAK_RAID_CHANNEL .. ", attempt " .. joinAttempts)
    end
  end
  FlushZombakBroadcast()

  -- Bounded retries cover asynchronous channel joins and transient throttling.
  -- No LFG search/application is ever scheduled here.
  if not channelTimer and ((not GetZombakChannelID() and joinAttempts < 5) or pendingBroadcast) then
    channelTimer = C_Timer.NewTimer(5, function()
      channelTimer = nil
      MaintainZombakChannel()
    end)
  end
end

function RR.Comm.UpdateZombakSubscription()
  channelWanted = RR.Options.IsZombakEnabled() or IsZombakCharacter(GetPlayerCharacterKey())
  if channelWanted then
    joinAttempts = 0
    MaintainZombakChannel()
  else
    if channelTimer then
      channelTimer:Cancel()
      channelTimer = nil
    end
    pendingBroadcast = nil
    if channelJoinedByUs then
      channelJoinedByUs = false
      LeaveChannelByName(ZOMBAK_RAID_CHANNEL)
    end
  end
end

function RR.Comm.HandleChannelUpdate()
  -- Channel IDs may change after zoning or after another channel is joined.
  -- Resolve the ID by name for every send instead of caching an index.
  if channelWanted then
    if not channelTimer then
      MaintainZombakChannel()
    else
      FlushZombakBroadcast()
    end
  end
end

function RR.Comm.BroadcastZombakRaid(announcement)
  local message = BuildAddonMessage(
    ZOMBAK_RAID_EVENT, ZOMBAK_RAID_PROTOCOL_VERSION, announcement.leader,
    table.concat(announcement.activityIDs, ","), announcement.timestamp, announcement.nonce
  )
  if #message > 255 then
    ZombakDebug("Zombak raid broadcast exceeds the addon message limit")
    return
  end

  pendingBroadcast = { message = message, expires = GetTime() + 30 }
  RR.Comm.UpdateZombakSubscription()
end

function RR.Comm.PrintZombakStatus()
  local player = GetPlayerCharacterKey()
  local version = C_AddOns and C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "unknown"
  local function line(label, value)
    print("[RR] " .. label .. ": " .. tostring(value))
  end
  line("Raid Reminder", version)
  line("player", player)
  line("faction", UnitFactionGroup and UnitFactionGroup("player") or "unknown")
  line("isZombak", IsZombakCharacter(player))
  line("receiveEnabled", RR.Options.IsZombakEnabled())
  line("channelID (0 = not joined)", GetZombakChannelID() or 0)
  line("channelWanted / joinAttempts", tostring(channelWanted) .. " / " .. joinAttempts)
  line("prefixRegistered", addonMessagePrefixRegistered)
  line("prefixResult", transportStatus.prefixResult)
  line("chatLockdown", IsZombakLFGRestricted() or false)
  line("outgoingRealmPolicy", C_ChatInfo.AreOutgoingAddonChatMessagesRestricted and
    C_ChatInfo.AreOutgoingAddonChatMessagesRestricted() or false)
  line("lastSend", transportStatus.lastSend)
  line("lastReceive", transportStatus.lastReceive)
  line("lastListingEvent", RR.State.zombakListingStatus or "none")
end

RR.Comm.RegisterAddonMessages = RegisterAddonMessages
RR.Comm.HandleAddonMessage = HandleRaidCheckAddonMessage
