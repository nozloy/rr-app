local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

-- Communities have no addon broadcast channel. Shared character-community or
-- guild membership can make native cross-faction WHISPER delivery possible.
-- Never relay a notice: only the allowlisted leader sends their own live listing.
local Community = {}
RR.Community = Community
local COMMAND, VERSION = "ZOMBAK_RAID_SUBSCRIBE", "1"
local SUBSCRIBE_INTERVAL, SUBSCRIBER_LIFETIME, SNAPSHOT_INTERVAL = 60, 180, 30
local MAX_SUBSCRIBERS, MAX_QUEUE, MAX_CLUBS, MAX_MEMBERS = 256, 256, 20, 1000
local DISCOVERY_SLICE, SEND_INTERVAL = 100, 0.5
local subscribers, leaders, lastSubscriptions, rosterRequests = {}, {}, {}, {}
local queue, queued = {}, {}
local timer, discovery
local dirty, requestRosters, receiving = true, true, false
local nextDiscoveryAt, lastAttemptAt, nextOutboundAt = 0, -1, 0
local status, lastSend = "not checked", "not attempted"
local clubCount, leaderCount = 0, 0
local ArmTimer

local function IsSecret(value)
  return issecretvalue and issecretvalue(value)
end

local function Record(event, fields)
  if RR.Diagnostics and RR.Diagnostics.Record then RR.Diagnostics.Record(event, fields) end
end

local function SetStatus(value)
  status = value
  if RR.Diagnostics and RR.Diagnostics.Change then
    RR.Diagnostics.Change("community", "COMMUNITY", { reason = value, clubs = clubCount, leaders = leaderCount })
  end
end

-- Every public entry and timer is isolated so unavailable club APIs cannot
-- interrupt the existing channel transport.
local function Guard(callback, ...)
  local ok, result = pcall(callback, ...)
  if not ok then
    SetStatus("temporarily unavailable: community API error")
    Record("COMMUNITY_ERROR", { reason = "guarded API failure", error = result })
  end
  return ok and result or nil
end

local function IsRestricted()
  local value = IsZombakLFGRestricted()
  return IsSecret(value) or value
end

local function IsLeader()
  return IsZombakCharacter(GetPlayerCharacterKey())
end

local function IsEnabled()
  return RR.Options and RR.Options.IsZombakEnabled and RR.Options.IsZombakEnabled()
end

local function NativeName(value)
  if IsSecret(value) or type(value) ~= "string" or #value > 160 or value:find("[%c|]") then return nil end
  -- Require the actual native full name; display aliases such as '-рф' must
  -- never be synthesized as whisper addresses.
  local name, realm = value:match("^([^- ]+)%-([^%c]+)$")
  if not name or not realm or realm == "" then return nil end
  return value
end

local function RosterName(value)
  if IsSecret(value) or type(value) ~= "string" then return nil end
  if value:find("-", 1, true) then return NativeName(value) end
  -- Character rosters may omit the realm for a local character. Complete it
  -- only with the native current realm, never the '-рф' display abbreviation.
  local realm = GetNormalizedRealmName and GetNormalizedRealmName()
  if IsSecret(realm) or type(realm) ~= "string" or realm == "" then return nil end
  return NativeName(value .. "-" .. realm)
end

local function Count(values)
  local count = 0
  for _ in pairs(values) do count = count + 1 end
  return count
end

local function ExpireSubscribers(now)
  for key, peer in pairs(subscribers) do
    if now >= peer.expires then subscribers[key] = nil end
  end
end

local function ActiveAnnouncement()
  if not IsLeader() or not RR.ZombakRaids.GetActiveAnnouncement then return nil end
  local announcement = RR.ZombakRaids.GetActiveAnnouncement()
  if IsSecret(announcement) or type(announcement) ~= "table" or
    IsSecret(announcement.nonce) or type(announcement.nonce) ~= "string" then return nil end
  return announcement
end

local function Queue(kind, target, key)
  local id = kind .. ":" .. key
  if queued[id] then return true end
  if #queue >= MAX_QUEUE then return false end
  local item = { kind = kind, target = target, key = key, id = id, expires = GetTime() + SUBSCRIBER_LIFETIME }
  queue[#queue + 1], queued[id] = item, item
  ArmTimer()
  return true
end

local function QueueSubscriptions()
  local now = GetTime()
  for key, target in pairs(leaders) do
    if not lastSubscriptions[key] or now - lastSubscriptions[key] >= SUBSCRIBE_INTERVAL then
      Queue("SUBSCRIBE", target, key)
    end
  end
end

local function IsOnline(info)
  local presence, remote = info.presence, info.isRemoteChat
  if IsSecret(presence) or IsSecret(remote) or remote then return false end
  local values = Enum and Enum.ClubMemberPresence
  return values and ((values.Online ~= nil and presence == values.Online) or
    (values.Away ~= nil and presence == values.Away) or (values.Busy ~= nil and presence == values.Busy))
end

local function StartDiscovery()
  if not C_Club or not C_Club.GetSubscribedClubs or not C_Club.GetClubMembers or not C_Club.GetMemberInfo then
    SetStatus("unavailable: community API missing")
    nextDiscoveryAt = GetTime() + SUBSCRIBE_INTERVAL
    dirty, requestRosters = false, false
    return
  end
  local clubs = C_Club.GetSubscribedClubs()
  if IsSecret(clubs) or type(clubs) ~= "table" then
    dirty, leaders, leaderCount = true, {}, 0
    SetStatus("waiting for readable community memberships")
    return
  end
  local types = Enum and Enum.ClubType
  if not types or types.Character == nil then
    SetStatus("unavailable: community types missing")
    nextDiscoveryAt = GetTime() + SUBSCRIBE_INTERVAL
    dirty, requestRosters = false, false
    return
  end
  discovery = { clubs = {}, found = {}, club = 1, member = 1 }
  local now, seenClubs = GetTime(), {}
  local function AddClub(id)
    if IsSecret(id) or (type(id) ~= "number" and type(id) ~= "string") or
      seenClubs[id] or #discovery.clubs >= MAX_CLUBS then return end
    seenClubs[id] = true
    -- FocusMembers requests a missing roster, as in Blizzard's member UI.
    -- Never use SetClubPresenceSubscription: that is a singleton owned by UI.
    if requestRosters and C_Club.AreMembersReady and C_Club.FocusMembers then
      local readyOK, ready = pcall(C_Club.AreMembersReady, id)
      if readyOK and not IsSecret(ready) and ready == false and
        (not rosterRequests[id] or now - rosterRequests[id] >= SUBSCRIBE_INTERVAL) then
        rosterRequests[id] = now
        pcall(C_Club.FocusMembers, id)
      end
    end
    local ok, members = pcall(C_Club.GetClubMembers, id)
    if ok and not IsSecret(members) and type(members) == "table" then
      discovery.clubs[#discovery.clubs + 1] = { id = id, members = members }
    end
  end
  -- The own guild may be absent from GetSubscribedClubs during initialization.
  if C_Club.GetGuildClubId then
    local ok, id = pcall(C_Club.GetGuildClubId)
    if ok then AddClub(id) end
  end
  for index = 1, math.min(#clubs, MAX_CLUBS) do
    local club = clubs[index]
    if not IsSecret(club) and type(club) == "table" and not IsSecret(club.clubType) and
      (club.clubType == types.Character or (types.Guild ~= nil and club.clubType == types.Guild)) then
      AddClub(club.clubId)
    end
  end
  for id in pairs(rosterRequests) do if not seenClubs[id] then rosterRequests[id] = nil end end
  clubCount = #discovery.clubs
  nextDiscoveryAt = now + SUBSCRIBE_INTERVAL
  dirty, requestRosters = false, false
  SetStatus("checking shared community and guild rosters")
  ArmTimer()
end

local function ScanDiscovery()
  local work = discovery
  if not work then return end
  local checked = 0
  while checked < DISCOVERY_SLICE do
    local club = work.clubs[work.club]
    if not club then
      leaders, discovery = work.found, nil
      leaderCount = Count(leaders)
      -- Keep cooldowns across offline/online and roster churn. Keys are bounded
      -- by the fixed allowlist, so forgetting a roster cannot create a burst.
      SetStatus(leaderCount > 0 and "subscribing to online leaders in shared communities/guild" or
        "no online allowlisted leader in shared communities/guild")
      QueueSubscriptions()
      return
    end
    if work.member > math.min(#club.members, MAX_MEMBERS) then
      work.club, work.member = work.club + 1, 1
    else
      local memberID = club.members[work.member]
      work.member, checked = work.member + 1, checked + 1
      if not IsSecret(memberID) and (type(memberID) == "number" or type(memberID) == "string") then
        local ok, info = pcall(C_Club.GetMemberInfo, club.id, memberID)
        if ok and not IsSecret(info) and type(info) == "table" and IsOnline(info) then
          local target = RosterName(info.name)
          if target and IsZombakCharacter(target) and
            NormalizeZombakCharacterName(target) ~= NormalizeZombakCharacterName(GetPlayerCharacterKey()) then
            work.found[NormalizeZombakCharacterName(target)] = target
          end
        end
      end
    end
  end
end

local function DescribeResult(value)
  if IsSecret(value) then return "unreadable result" end
  for name, code in pairs(Enum and Enum.SendAddonMessageResult or {}) do
    if value == code then return name .. " (" .. tostring(value) .. ")" end
  end
  return tostring(value)
end

local function FlushOne()
  local now = GetTime()
  if now < nextOutboundAt or now - lastAttemptAt < SEND_INTERVAL then return end
  local item = table.remove(queue, 1)
  if not item then return end
  queued[item.id] = nil
  if item.expires <= now then return end
  local message, announcement
  if item.kind == "SUBSCRIBE" then
    -- Use the last completed roster while a coalesced refresh is in flight.
    -- Presence churn must not prevent every sliced scan from ever delivering.
    if not IsEnabled() or leaders[item.key] ~= item.target then return end
    if lastSubscriptions[item.key] and now - lastSubscriptions[item.key] < SUBSCRIBE_INTERVAL then return end
    message = BuildAddonMessage(COMMAND, VERSION)
    lastSubscriptions[item.key] = now
  else
    local peer = subscribers[item.key]
    if not peer or peer.expires <= now then return end
    announcement = ActiveAnnouncement()
    if not announcement or not RR.Comm.BuildZombakRaidMessage then return end
    if peer.nonce == announcement.nonce and peer.lastAttemptAt and
      now - peer.lastAttemptAt < SNAPSHOT_INTERVAL then return end
    message = RR.Comm.BuildZombakRaidMessage(announcement, true)
    if IsSecret(message) or type(message) ~= "string" then return end
    peer.nonce, peer.lastAttemptAt = announcement.nonce, now
  end
  lastAttemptAt = now
  local ok, result = pcall(SendRaidReminderAddonMessage, message, "WHISPER", item.target)
  lastSend = ok and DescribeResult(result) or "API error"
  local codes = Enum and Enum.SendAddonMessageResult
  local accepted = ok and not IsSecret(result) and (result == true or (codes and result == codes.Success))
  -- Prefix/realm throttles and lockdown affect every peer, not just the target
  -- which happened to hit the gate. Pause the whole direct queue after failure.
  if not accepted then
    local lockdown = ok and not IsSecret(result) and codes and codes.AddOnMessageLockdown ~= nil and
      result == codes.AddOnMessageLockdown
    nextOutboundAt = now + (lockdown and 30 or 5)
  end
  Record("TX", { route = "WHISPER", target = item.target, kind = item.kind == "SUBSCRIBE" and "SUBSCRIBE" or "ACTIVE",
    nonce = announcement and announcement.nonce, createdAt = announcement and announcement.timestamp,
    leader = announcement and announcement.leader, result = lastSend, retryAfter = not accepted and nextOutboundAt - now or nil })
end

ArmTimer = function()
  if timer or (not discovery and #queue == 0) or not C_Timer or not C_Timer.NewTimer then return end
  local delay = discovery and SEND_INTERVAL or math.max(SEND_INTERVAL, nextOutboundAt - GetTime())
  timer = C_Timer.NewTimer(delay, function()
    timer = nil
    Guard(function()
      if IsRestricted() then SetStatus("deferred by chat messaging lockdown"); return end
      if discovery and IsEnabled() then ScanDiscovery() end
      FlushOne()
      ArmTimer()
    end)
  end)
end

local function QueueSnapshots()
  local announcement = ActiveAnnouncement()
  if not announcement then return end
  local now = GetTime()
  for key, peer in pairs(subscribers) do
    if peer.nonce ~= announcement.nonce or not peer.lastAttemptAt or now - peer.lastAttemptAt >= SNAPSHOT_INTERVAL then
      Queue("ACTIVE", peer.target, key)
    end
  end
end

local function HandleSubscribe(parts, sender, distribution)
  if IsSecret(distribution) or distribution ~= "WHISPER" or IsRestricted() or not IsLeader() or
    IsSecret(parts) or type(parts) ~= "table" or IsSecret(parts[2]) or IsSecret(parts[3]) or parts[2] ~= VERSION or
    parts[3] ~= nil then return end
  local target = NativeName(sender)
  if not target then return end
  local key = NormalizeZombakCharacterName(target)
  if not key or key == NormalizeZombakCharacterName(GetPlayerCharacterKey()) then return end
  local now = GetTime()
  ExpireSubscribers(now)
  local peer = subscribers[key]
  if not peer then
    if Count(subscribers) >= MAX_SUBSCRIBERS then return end
    peer = { target = target }
    subscribers[key] = peer
    Record("SUBSCRIBE", { route = "WHISPER", sender = target, accepted = true })
  end
  peer.target, peer.expires = target, now + SUBSCRIBER_LIFETIME
  QueueSnapshots()
end

function Community.Maintain()
  Guard(function()
    local now = GetTime()
    ExpireSubscribers(now)
    if IsRestricted() then SetStatus("deferred by chat messaging lockdown"); return end
    local enabled = IsEnabled()
    if enabled and not receiving then dirty, requestRosters = true, true end
    receiving = enabled
    if enabled then
      if not discovery and (dirty or now >= nextDiscoveryAt) then StartDiscovery() end
      if not dirty and not discovery then QueueSubscriptions() end
    elseif discovery or leaderCount > 0 then
      discovery, leaders, leaderCount = nil, {}, 0
    end
    if IsLeader() then QueueSnapshots() else subscribers = {} end
    ArmTimer()
  end)
end

function Community.HandleClubUpdate()
  Guard(function()
    dirty, requestRosters = true, true
    -- Preserve a running bounded scan. Frequent presence events (including
    -- unrelated guild members) otherwise continually restart it at member 1.
    -- A completed scan replaces leaders atomically; dirty schedules one refresh.
    Community.Maintain()
  end)
end

function Community.Reset()
  Guard(function()
    discovery, leaders, lastSubscriptions, rosterRequests = nil, {}, {}, {}
    dirty, requestRosters, receiving, leaderCount, clubCount = true, true, false, 0, 0
    nextDiscoveryAt = 0
    local retained = {}
    for _, item in ipairs(queue) do
      if IsLeader() and item.kind == "ACTIVE" then retained[#retained + 1] = item end
    end
    queue, queued = retained, {}
    for _, item in ipairs(queue) do queued[item.id] = item end
    if not IsLeader() then subscribers = {} end
    if timer then timer:Cancel(); timer = nil end
    SetStatus("receiving disabled")
    ArmTimer()
  end)
end

function Community.GetStatusLines()
  return {
    "communityRoute=" .. status,
    "communityClubs=" .. clubCount .. " onlineLeaders=" .. leaderCount .. " subscribers=" .. Count(subscribers) ..
      " queued=" .. #queue .. " lastSend=" .. lastSend,
    "Community WHISPER requires a shared WoW community/guild; API success does not confirm delivery.",
  }
end

RR.Comm.RegisterHandler(COMMAND, function(...) Guard(HandleSubscribe, ...) end)
