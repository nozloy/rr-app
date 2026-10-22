local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Comm.lua
local handlers = {}
local channelWanted = false
local channelJoinedByUs = false
local channelTimer
local joinAttempts = 0
local nextJoinAt = 0
local maintaining = false
local pendingBroadcast
local channelOrderPending = false
local channelOrderReadyAt, channelOrderDeadline, channelOrderSignature
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
    RR.Diagnostics.Record("SEND_STATE", { reason = message,
      nonce = pendingBroadcast and pendingBroadcast.announcement.nonce })
    ZombakDebug("Zombak transport: " .. message)
  end
end

function RR.Comm.RecordZombakReceive(message)
  if transportStatus.lastReceive ~= message then
    transportStatus.lastReceive = message
    ZombakDebug("Zombak receive: " .. message)
  end
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
    if not C_ChatInfo or not C_ChatInfo.IsAddonMessagePrefixRegistered or
      C_ChatInfo.IsAddonMessagePrefixRegistered(ADDON_MESSAGE_PREFIX) then return end
    addonMessagePrefixRegistered = false
  end

  if C_ChatInfo and C_ChatInfo.RegisterAddonMessagePrefix then
    local ok, result = pcall(C_ChatInfo.RegisterAddonMessagePrefix, ADDON_MESSAGE_PREFIX)
    if not ok then
      transportStatus.prefixResult = "registration error: " .. tostring(result)
      addonMessagePrefixRegistered = false
      RR.Diagnostics.Change("prefix", "PREFIX", { result = transportStatus.prefixResult, registered = false })
      return
    end
    local codes = Enum and Enum.RegisterAddonMessagePrefixResult
    transportStatus.prefixResult = DescribeResult(result, codes)
    addonMessagePrefixRegistered = result == true or (codes and
      (result == codes.Success or result == codes.DuplicatePrefix)) or false
    RR.Diagnostics.Change("prefix", "PREFIX", { result = transportStatus.prefixResult, registered = addonMessagePrefixRegistered })
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
    RR.Comm.RecordZombakReceive("deferred: chat lockdown or secret data; waiting for a fresh announcement")
    RR.Diagnostics.Change("unreadable", "RX_UNREADABLE", { reason = "lockdown_or_secret; addon/source cannot be identified safely" })
    return
  end
  if prefix ~= ADDON_MESSAGE_PREFIX or type(message) ~= "string" or not sender then
    return
  end

  RegisterAddonMessages()

  local parts = SplitAddonMessage(message)
  local command = parts[1]
  if command == ZOMBAK_RAID_EVENT or command == ZOMBAK_RAID_ACTIVE_EVENT then
    transportStatus.lastReceiveAt = GetServerTime()
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

local function ResetChannelOrder()
  channelOrderPending = true
  channelOrderReadyAt, channelOrderDeadline, channelOrderSignature = nil, nil, nil
end

local function ChannelOrderStatus(result, from, to)
  transportStatus.channelOrder = result
  RR.Diagnostics.Change("channel_order", "CHANNEL_ORDER", { result = result, from = from, to = to })
end

local function MoveZombakChannelLast()
  if not channelOrderPending then return end
  if InCombatLockdown() or IsZombakLFGRestricted() then
    ChannelOrderStatus("deferred: combat or chat lockdown")
    return
  end
  if not GetChannelList or not C_ChatInfo or not C_ChatInfo.SwapChatChannelsByChannelIndex then
    channelOrderPending = false
    ChannelOrderStatus("unavailable: channel order API")
    return
  end
  local current = GetZombakChannelID()
  if not current then return end
  local raw = { GetChannelList() }
  local channels, seen = {}, {}
  for i = 1, #raw, 3 do
    local id, name = raw[i], raw[i + 1]
    if (issecretvalue and (issecretvalue(id) or issecretvalue(name))) or
      type(id) ~= "number" or id < 1 or id ~= math.floor(id) or type(name) ~= "string" or seen[id] then
      ChannelOrderStatus("deferred: channel list unavailable")
      return
    end
    seen[id] = true
    -- Include disabled zone channels: their reserved numbers still belong to the user.
    channels[#channels + 1] = { id = id, name = name }
  end
  if not seen[current] then
    ChannelOrderStatus("deferred: waiting for channel list")
    return
  end
  table.sort(channels, function(a, b) return a.id < b.id end)
  local layout = {}
  for i, channel in ipairs(channels) do layout[i] = channel.id .. ":" .. channel.name end
  local signature, now = table.concat(layout, "\t"), GetTime()
  if not channelOrderDeadline then
    -- PLAYER_LOGIN can precede General/Trade restoring their slots. Keep delivery
    -- active while allowing the initial channel list to settle before moving once.
    channelOrderDeadline, channelOrderReadyAt = now + 15, now + 5
  elseif signature ~= channelOrderSignature then
    channelOrderReadyAt = math.min(channelOrderDeadline, math.max(channelOrderReadyAt, now + 2))
  end
  channelOrderSignature = signature
  if now < channelOrderReadyAt then
    ChannelOrderStatus("waiting for channel list to settle")
    return
  end

  -- One move per subscription/reconnection, not a permanent sorting rule that
  -- would fight manual reordering or other addons that also prefer the last slot.
  channelOrderPending = false
  local first = current
  for _, channel in ipairs(channels) do
    if channel.id > current then
      if InCombatLockdown() or IsZombakLFGRestricted() then
        channelOrderPending = true
        ChannelOrderStatus("deferred: combat or chat lockdown", first, current)
        return
      end
      if GetZombakChannelID() ~= current then
        ChannelOrderStatus("stopped: channel order changed concurrently", first, GetZombakChannelID())
        return
      end
      -- Use the native API only. The ChatConfig Lua helper writes ChatTypeInfo
      -- and can taint the normal chat UI when invoked from addon code.
      C_ChatInfo.SwapChatChannelsByChannelIndex(current, channel.id)
      if GetZombakChannelID() ~= channel.id then
        ChannelOrderStatus("stopped: channel move not applied", first, GetZombakChannelID())
        return
      end
      current = channel.id
    end
  end
  ChannelOrderStatus(first == current and "already last" or "moved to last", first, current)
end

function RR.Comm.IsZombakChannel(distribution, _, _, localID, channelName)
  return distribution == "CHANNEL" and
    (channelName == ZOMBAK_RAID_CHANNEL or (localID ~= nil and localID == GetZombakChannelID()))
end

function RR.Comm.ClearZombakBroadcast()
  pendingBroadcast = nil
end

function RR.Comm.HasZombakBroadcast()
  return pendingBroadcast ~= nil
end

local function FlushZombakBroadcast()
  local broadcast = pendingBroadcast
  if not broadcast then
    return
  end
  local now = GetTime()
  if now >= broadcast.expires then
    SetSendStatus("expired after " .. ZOMBAK_RAID_BROADCAST_TIMEOUT .. " seconds; previous status: " .. transportStatus.lastSend)
    pendingBroadcast = nil
    return
  elseif now < broadcast.nextAttemptAt then
    return
  end

  if IsZombakLFGRestricted() then
    SetSendStatus("blocked by InChatMessagingLockdown")
    return
  end
  local active = RR.ZombakRaids.IsAnnouncementActive(broadcast.announcement)
  if active == nil then
    SetSendStatus("deferred: current listing data unavailable")
    return
  elseif not active then
    SetSendStatus("cancelled: listing removed, changed, private or no longer led by this character")
    pendingBroadcast = nil
    return
  end
  local channelID = GetZombakChannelID()
  if not channelID then
    SetSendStatus("waiting for channel " .. ZOMBAK_RAID_CHANNEL)
    return
  end

  -- AreOutgoingAddonChatMessagesRestricted describes the realm's restriction
  -- policy and can stay true outside lockdown. It is not a standalone live
  -- send gate. Respect the current lockdown above and the actual API result.
  -- Channel events must not accelerate repeats or retries after throttling.
  broadcast.nextAttemptAt = now + 5
  local message = broadcast.message
  if broadcast.recovery then
    -- The original creation time orders listings; the seventh field dates this fresh snapshot.
    message = RR.Comm.BuildZombakRaidMessage(broadcast.announcement, true)
  end
  local ok, result = pcall(SendRaidReminderAddonMessage, message, "CHANNEL", tostring(channelID))
  transportStatus.lastSendAt = GetServerTime()
  RR.Diagnostics.Record("TX", {
    nonce = broadcast.announcement.nonce, leader = broadcast.announcement.leader,
    kind = broadcast.recovery and "ACTIVE" or "CREATED", createdAt = broadcast.announcement.timestamp,
    channel = channelID, result = ok and DescribeResult(result, Enum and Enum.SendAddonMessageResult) or "error",
    error = not ok and result or nil,
  })
  if not ok then
    SetSendStatus("SendAddonMessage error: " .. tostring(result))
    return
  end
  if pendingBroadcast ~= broadcast then return end
  local codes = Enum and Enum.SendAddonMessageResult
  if result == true or (codes and result == codes.Success) then
    broadcast.acceptedSends = broadcast.acceptedSends + 1
    local delay = not broadcast.recovery and ZOMBAK_RAID_BROADCAST_DELAYS[broadcast.acceptedSends]
    if delay then
      broadcast.nextAttemptAt = now + delay
    else
      pendingBroadcast = nil
    end
    ZombakDebug("Zombak raid broadcast accepted by the API (delivery not confirmed)")
  elseif codes and result == codes.AddOnMessageLockdown then
    -- Stop this burst. A later, revalidated snapshot may retry after the recovery interval.
    pendingBroadcast = nil
  end
  SetSendStatus("SendAddonMessage: " .. DescribeResult(result, codes) .. "; channel=" .. channelID ..
    "; accepted=" .. broadcast.acceptedSends .. "/" .. (broadcast.recovery and 1 or (#ZOMBAK_RAID_BROADCAST_DELAYS + 1)))
end

local function MaintainZombakChannel()
  if not channelWanted or maintaining then
    return
  end
  maintaining = true
  local now = GetTime()
  local ok, err = pcall(function()
    RegisterAddonMessages()
    RR.ZombakRaids.Maintain()
    if GetZombakChannelID() then
      joinAttempts, nextJoinAt = 0, 0
    else
      ResetChannelOrder()
      if not IsZombakLFGRestricted() and now >= nextJoinAt then
        joinAttempts = joinAttempts + 1
        nextJoinAt = now + math.min(60, 5 * 2 ^ math.min(joinAttempts - 1, 4))
        channelJoinedByUs = true
        RR.Diagnostics.Record("CHANNEL_JOIN", { attempt = joinAttempts, retryIn = nextJoinAt - now })
        JoinTemporaryChannel(ZOMBAK_RAID_CHANNEL)
        ZombakDebug("Joining " .. ZOMBAK_RAID_CHANNEL .. ", attempt " .. joinAttempts)
      end
    end
    -- Sorting is cosmetic: an API failure must not prevent announcement delivery.
    local orderOK, orderError = pcall(MoveZombakChannelLast)
    if not orderOK then
      channelOrderPending = false
      ChannelOrderStatus("error: " .. RR.Diagnostics.Safe(orderError))
    end
    FlushZombakBroadcast()
  end)
  -- The optional community route must keep working even when joining the
  -- local channel fails (for example, when all channel slots are occupied).
  if RR.Community then
    local communityOK, communityError = pcall(RR.Community.Maintain)
    if not communityOK then
      RR.Diagnostics.Change("community_error", "COMMUNITY_ERROR", { error = communityError })
    end
  end
  maintaining = false
  if not ok then SetSendStatus("maintenance deferred after error: " .. tostring(err)) end
  RR.Diagnostics.SampleHealth()

  -- A single lightweight reconciliation timer also catches missed events and channel losses.
  -- Recipients never search LFG automatically. Community subscriptions have a
  -- separate, slower refresh interval within this maintenance tick.
  if not channelTimer and channelWanted then
    local delay = ZOMBAK_RAID_MAINTENANCE_INTERVAL
    if pendingBroadcast and pendingBroadcast.nextAttemptAt > now then
      delay = math.min(delay, pendingBroadcast.nextAttemptAt - now)
    end
    channelTimer = C_Timer.NewTimer(delay, function()
      channelTimer = nil
      MaintainZombakChannel()
    end)
  end
end

function RR.Comm.UpdateZombakSubscription()
  local wasWanted = channelWanted
  channelWanted = RR.Options.IsZombakEnabled() or IsZombakCharacter(GetPlayerCharacterKey())
  RR.Diagnostics.Change("subscription", "SUBSCRIPTION", { wanted = channelWanted, receiveEnabled = RR.Options.IsZombakEnabled() })
  if RR.Community and not RR.Options.IsZombakEnabled() then RR.Community.Reset() end
  if channelWanted then
    if not wasWanted then
      joinAttempts, nextJoinAt = 0, 0
      ResetChannelOrder()
    end
    MaintainZombakChannel()
  else
    channelOrderPending = false
    if channelTimer then
      channelTimer:Cancel()
      channelTimer = nil
    end
    pendingBroadcast = nil
    if channelJoinedByUs then
      channelJoinedByUs = false
      LeaveChannelByName(ZOMBAK_RAID_CHANNEL)
      RR.Diagnostics.Record("CHANNEL_LEAVE", { reason = "subscription_disabled" })
    end
  end
end

function RR.Comm.HandleChannelUpdate()
  -- Channel IDs may change after zoning or after another channel is joined.
  -- Resolve the ID by name for every send instead of caching an index.
  if channelWanted then
    MaintainZombakChannel()
  end
end

function RR.Comm.BuildZombakRaidMessage(announcement, recovery)
  local message = BuildAddonMessage(
    recovery and ZOMBAK_RAID_ACTIVE_EVENT or ZOMBAK_RAID_EVENT, ZOMBAK_RAID_PROTOCOL_VERSION, announcement.leader,
    table.concat(announcement.activityIDs, ","), announcement.timestamp, announcement.nonce
  )
  if #message + (recovery and 11 or 0) > 255 then
    SetSendStatus("announcement exceeds the addon message limit")
    ZombakDebug("Zombak raid broadcast exceeds the addon message limit")
    return
  end
  if recovery then message = message .. ADDON_MESSAGE_SEPARATOR .. GetServerTime() end
  return message
end

function RR.Comm.BroadcastZombakRaid(announcement, recovery)
  local message = RR.Comm.BuildZombakRaidMessage(announcement, recovery)
  if not message then return end

  -- Reuse the exact payload (including timestamp and nonce) for receiver deduplication.
  pendingBroadcast = {
    message = message, announcement = announcement, acceptedSends = 0, recovery = recovery,
    nextAttemptAt = GetTime(), expires = GetTime() + ZOMBAK_RAID_BROADCAST_TIMEOUT,
  }
  RR.Diagnostics.Record("TX_QUEUED", { nonce = announcement.nonce, leader = announcement.leader,
    kind = recovery and "ACTIVE" or "CREATED", createdAt = announcement.timestamp })
  RR.Comm.UpdateZombakSubscription()
end

function RR.Comm.GetZombakStatusLines()
  local player = GetPlayerCharacterKey()
  local version = C_AddOns and C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "unknown"
  local lines = {}
  local function line(label, value)
    lines[#lines + 1] = label .. ": " .. RR.Diagnostics.Safe(value)
  end
  line("Raid Reminder", version)
  line("player", player)
  line("locale", ADDON_LOCALE)
  line("faction", UnitFactionGroup and UnitFactionGroup("player") or "unknown")
  line("channelScope", "same faction and realm/connected realms; API success does not confirm delivery")
  line("isZombak", IsZombakCharacter(player))
  line("receiveEnabled", RR.Options.IsZombakEnabled())
  line("channelID (0 = not joined)", GetZombakChannelID() or 0)
  line("channelWanted / joinAttempts", tostring(channelWanted) .. " / " .. joinAttempts)
  line("channelOrder", transportStatus.channelOrder or "not attempted")
  line("nextJoinIn", math.max(0, math.ceil(nextJoinAt - GetTime())))
  line("prefixRegistered", addonMessagePrefixRegistered)
  line("prefixResult", transportStatus.prefixResult)
  line("chatLockdown", IsZombakLFGRestricted() or false)
  line("outgoingRealmPolicy", C_ChatInfo and C_ChatInfo.AreOutgoingAddonChatMessagesRestricted and
    C_ChatInfo.AreOutgoingAddonChatMessagesRestricted() or false)
  line("lastSend", transportStatus.lastSend)
  line("lastSendAt", transportStatus.lastSendAt or "none this session")
  line("lastReceive", transportStatus.lastReceive)
  line("lastReceiveAt", transportStatus.lastReceiveAt or "none this session")
  line("lastListingEvent", RR.State.zombakListingStatus or "none")
  line("pendingNotification", RR.ZombakRaids.HasPendingNotifications())
  line("popupBlock", RR.UI.ZombakRaidPopup.GetBlockReason() or "none")
  line("combat", InCombatLockdown() or false)
  line("lastPopupAt", RR.State.zombakLastPopupAt or "none this session")
  line("currentNonce", RR.State.ZombakRaid.announcement and RR.State.ZombakRaid.announcement.nonce or "none")
  line("currentPhase", RR.State.ZombakRaid.phase or "none")
  line("currentStatus", RR.State.ZombakRaid.statusKey or "none")
  line("bannerPosition", RR.UI.ZombakRaidPopup.GetPositionSummary())
  if RR.Community then
    for _, value in ipairs(RR.Community.GetStatusLines()) do lines[#lines + 1] = value end
  end
  return lines
end

function RR.Comm.PrintZombakStatus()
  for _, line in ipairs(RR.Comm.GetZombakStatusLines()) do print("[RR] " .. line) end
end

RR.Comm.RegisterAddonMessages = RegisterAddonMessages
RR.Comm.HandleAddonMessage = HandleRaidCheckAddonMessage
