local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local Watcher = RR.ZombakRaids
local state = RR.State.ZombakRaid
local activeAnnouncement
local serial = 0
local searchTimer
local resultTimer
local applicationTimer
local nextRecoveryAt = 0
local pendingNotifications = {}
local recoveryInitialized = false
local latestRecords
local trackedApplications = {}

local function IsSecret(value)
  return issecretvalue and issecretvalue(value)
end

local function ReadGroupMemberKey(unit, rosterName)
  if IsSecret(rosterName) then return nil end
  local name, realm = GetUnitNameAndRealm(unit, rosterName)
  if IsSecret(name) or IsSecret(realm) or type(name) ~= "string" or name == "" or
    type(realm) ~= "string" or realm == "" then return nil end
  return NormalizeZombakCharacterName(BuildCharacterKey(name, realm))
end

local function ReadAnnouncedGroupMembership(notice)
  if NormalizeZombakCharacterName(GetPlayerCharacterKey()) == notice.leaderKey then return true end
  if not IsInGroup(LE_PARTY_CATEGORY_HOME) and not IsInGroup(LE_PARTY_CATEGORY_INSTANCE) then return false end

  -- Use the real sender name, including realm, for both simultaneous group categories.
  -- The display alias ("-рф") is not a unit name understood by the native APIs.
  if notice.sender then
    for _, category in ipairs({ LE_PARTY_CATEGORY_HOME, LE_PARTY_CATEGORY_INSTANCE }) do
      local inParty = UnitInParty and UnitInParty(notice.sender, category)
      local raidIndex = UnitInRaid and UnitInRaid(notice.sender, category)
      if (not IsSecret(inParty) and inParty) or (not IsSecret(raidIndex) and raidIndex) then return true end
    end
  end

  local count = GetNumGroupMembers and GetNumGroupMembers()
  if IsSecret(count) or type(count) ~= "number" or count < 2 or count > 40 then return nil end
  local inRaid, complete = IsInRaid(), true
  for index = 1, (inRaid and count or count - 1) do
    local unit = (inRaid and "raid" or "party") .. index
    local rosterName = inRaid and GetRaidRosterInfo and GetRaidRosterInfo(index) or nil
    local ok, memberKey = pcall(ReadGroupMemberKey, unit, rosterName)
    if ok and memberKey == notice.leaderKey then return true end
    if not ok or not memberKey then complete = false end
  end
  if complete then return false end
  -- Rosters can be incomplete during login, zoning or joining. Retry on the next
  -- roster event/maintenance tick instead of showing a possibly redundant notice.
  return nil
end

local function IsInAnnouncedGroup(notice)
  if not notice or notice.isTest or not notice.leaderKey then return false end
  local ok, result = pcall(ReadAnnouncedGroupMembership, notice)
  if ok then return result end
  return nil
end

local function CancelTimers()
  for _, timer in pairs({ searchTimer, resultTimer, applicationTimer }) do
    timer:Cancel()
  end
  searchTimer, resultTimer, applicationTimer = nil, nil, nil
end

local function ReadActivityIDs(values)
  if IsSecret(values) or type(values) ~= "table" or #values == 0 or #values > ZOMBAK_RAID_MAX_ACTIVITIES then
    return nil
  end
  local ids, seen = {}, {}
  for _, id in ipairs(values) do
    if IsSecret(id) or type(id) ~= "number" or id < 1 or id > 10000000 or id ~= math.floor(id) then
      return nil
    end
    if not seen[id] then
      ids[#ids + 1] = id
      seen[id] = true
    end
  end
  return ids
end

local function GetRaidActivity(activityIDs)
  if not C_LFGList or not C_LFGList.GetActivityInfoTable then
    return nil, "unavailable"
  end
  local unavailable = false
  for _, id in ipairs(activityIDs) do
    local info = C_LFGList.GetActivityInfoTable(id)
    if not info or IsSecret(info) or IsSecret(info.categoryID) then
      unavailable = true
    elseif info.categoryID == ZOMBAK_RAID_CATEGORY_ID then
      return info
    end
  end
  return nil, unavailable and "unavailable" or "not a raid"
end

local function ActivitiesIntersect(actual, expected)
  if IsSecret(actual) or type(actual) ~= "table" then
    return false
  end
  for _, actualID in ipairs(actual) do
    if not IsSecret(actualID) then
      for _, expectedID in ipairs(expected) do
        if actualID == expectedID then
          return true
        end
      end
    end
  end
  return false
end

local function SetStatus(phase, statusKey, action)
  state.phase, state.statusKey, state.action = phase, statusKey, action
  RR.Diagnostics.Record("UI_STATE", { phase = phase, status = statusKey, action = action,
    nonce = state.announcement and state.announcement.nonce, resultID = state.currentZombakResultID,
    test = state.announcement and state.announcement.isTest or false })
  Watcher.RefreshPopup()
end

local function Retry(statusKey)
  CancelTimers()
  state.pendingSearch = nil
  state.searchResults = nil
  state.currentZombakResultID = nil
  state.resultFoundAt = nil
  state.partyGUID = nil
  state.numMembers = nil
  SetStatus("retry", statusKey, "search")
end

function Watcher.Clear(reason)
  if state.announcement then
    RR.Diagnostics.Record("POPUP_CLOSED", { nonce = state.announcement.nonce,
      reason = reason or "cleared", phase = state.phase, test = state.announcement.isTest or false })
  end
  CancelTimers()
  state.announcement = nil
  state.pendingSearch = nil
  state.searchResults = nil
  state.currentZombakResultID = nil
  state.resultFoundAt = nil
  state.partyGUID = nil
  state.numMembers = nil
  state.phase, state.statusKey, state.action = nil, nil, nil
  RR.UI.ZombakRaidPopup.Hide()
end

local function DismissGroupedAnnouncement()
  if IsInAnnouncedGroup(state.announcement) then
    Watcher.Clear("already_in_announced_group")
    return true
  end
  return false
end

function Watcher.RefreshPopup()
  if not RR.Options.IsZombakEnabled() or not state.announcement then
    return
  end
  local announcement = state.announcement
  local activity = announcement.activity
  local activityName = activity and activity.fullName or InterfaceText("zombakActivityUnknown")
  local difficulty = activity and activity.difficultyID and GetDifficultyInfo(activity.difficultyID)
  if difficulty and not activityName:find(difficulty, 1, true) then
    activityName = activityName .. " — " .. difficulty
  end
  local memberText = ""
  if state.numMembers then
    local maximum = activity and activity.maxNumPlayers
    memberText = maximum and maximum > 0 and (state.numMembers .. " / " .. maximum) or tostring(state.numMembers)
  end
  local inCombat = InCombatLockdown()
  local titleKey = state.phase == "found" and "zombakFoundTitle" or "zombakTitle"
  local buttonKey = state.action == "apply" and "zombakApply" or "zombakFind"
  if state.phase == "retry" then
    buttonKey = "zombakFindAgain"
  elseif state.phase == "searching" then
    buttonKey = "zombakSearchingButton"
  elseif not state.action then
    buttonKey = "zombakApplicationButton"
  end
  RR.UI.ZombakRaidPopup.Render({
    title = (announcement.isTest and InterfaceText("zombakTestPrefix") or "") .. InterfaceText(titleKey),
    leader = announcement.leader,
    activity = activityName,
    members = memberText,
    status = InterfaceText(inCombat and "zombakCombat" or state.statusKey or "zombakCreated"),
    button = InterfaceText(buttonKey),
    enabled = state.action ~= nil and not inCombat,
  })
end

local function ListingStatus(message)
  if RR.State.zombakListingStatus ~= message then
    RR.State.zombakListingStatus = message
    RR.Diagnostics.Record("LISTING_STATE", { reason = message, nonce = activeAnnouncement and activeAnnouncement.nonce })
    ZombakDebug("Zombak listing: " .. message)
  end
end

local function PruneSeen()
  local now, count = GetServerTime(), 0
  for key, expires in pairs(state.seen) do
    if type(key) ~= "string" or type(expires) ~= "number" or expires < now or
      expires ~= expires or expires > now + ZOMBAK_RAID_SEEN_LIFETIME + 15 then
      state.seen[key] = nil
    else
      count = count + 1
    end
  end
  while count > 256 do
    local oldestKey, oldestTime
    for key, expires in pairs(state.seen) do
      if not oldestTime or expires < oldestTime then oldestKey, oldestTime = key, expires end
    end
    state.seen[oldestKey] = nil
    count = count - 1
  end
end

function Watcher.InitializeRecovery()
  if recoveryInitialized or not RR.DB then return end
  local character = NormalizeZombakCharacterName(GetPlayerCharacterKey())
  if not character then return end
  recoveryInitialized = true
  if type(RR.DB.zombakSeenByCharacter) ~= "table" then RR.DB.zombakSeenByCharacter = {} end
  local seen = RR.DB.zombakSeenByCharacter[character]
  if type(seen) ~= "table" then seen = {} end
  RR.DB.zombakSeenByCharacter[character] = seen
  state.seen = seen
  PruneSeen()
  if type(RR.DB.zombakLatestByCharacter) ~= "table" then RR.DB.zombakLatestByCharacter = {} end
  latestRecords = RR.DB.zombakLatestByCharacter[character]
  if type(latestRecords) ~= "table" then latestRecords = {} end
  RR.DB.zombakLatestByCharacter[character] = latestRecords
  local now = GetServerTime()
  for key, record in pairs(latestRecords) do
    if IsZombakCharacter(key) and type(record) == "table" and type(record.timestamp) == "number" and
      record.timestamp == math.floor(record.timestamp) and record.timestamp > 0 and record.timestamp <= now + 15 and
      type(record.expires) == "number" and record.expires >= now and record.expires <= now + ZOMBAK_RAID_SEEN_LIFETIME + 15 and
      type(record.nonce) == "string" and #record.nonce <= 48 then
      state.latest[key], state.latestNonce[key] = record.timestamp, record.nonce
    else
      latestRecords[key] = nil
    end
  end
  if type(RR.DB.zombakBroadcasts) ~= "table" then RR.DB.zombakBroadcasts = {} end
  local savedSerial = RR.DB.zombakBroadcastSerial
  serial = type(savedSerial) == "number" and savedSerial >= 0 and savedSerial < 1000000000 and
    math.floor(savedSerial) or 0
end

local function Fingerprint(ids)
  local sorted = {}
  for index, id in ipairs(ids) do sorted[index] = id end
  table.sort(sorted)
  return table.concat(sorted, ",")
end

-- nil means temporarily unreadable; false is a confirmed ineligible/absent listing.
local function ReadListing()
  if not IsZombakCharacter(GetPlayerCharacterKey()) then return false, "character is not in ZombakCharacters" end
  if IsZombakLFGRestricted() then return nil, "deferred by InChatMessagingLockdown" end
  if not C_LFGList or not C_LFGList.GetActiveEntryInfo then return nil, "waiting for LFG API" end
  local entry = C_LFGList.GetActiveEntryInfo()
  if IsSecret(entry) then return nil, "waiting for public listing data" end
  if not entry then
    if C_LFGList.HasActiveEntryInfo and C_LFGList.HasActiveEntryInfo() then
      return nil, "waiting for active listing data"
    end
    return false, "no active listing"
  end
  if IsSecret(entry.privateGroup) then return nil, "waiting for listing visibility" end
  if entry.privateGroup then return false, "private listing" end
  if IsInGroup(LE_PARTY_CATEGORY_HOME) and not UnitIsGroupLeader("player", LE_PARTY_CATEGORY_HOME) then
    return false, "current character is not the group leader"
  end
  local ids = ReadActivityIDs(entry.activityIDs)
  if not ids then return nil, "waiting for activityIDs" end
  local activity, reason = GetRaidActivity(ids)
  if not activity then
    if reason == "unavailable" then return nil, "waiting for activity metadata" end
    return false, "category is not Raids (3)"
  end
  return { activityIDs = ids, activity = activity, fingerprint = Fingerprint(ids) }
end

local function ForgetListing()
  if activeAnnouncement then
    RR.Diagnostics.Record("LISTING_FORGOTTEN", { nonce = activeAnnouncement.nonce })
  end
  activeAnnouncement = nil
  RR.Comm.ClearZombakBroadcast()
  local key = NormalizeZombakCharacterName(GetPlayerCharacterKey())
  if RR.DB and RR.DB.zombakBroadcasts then RR.DB.zombakBroadcasts[key] = nil end
end

local function ReconcileListing()
  if not IsZombakCharacter(GetPlayerCharacterKey()) then return end
  local listing, reason = ReadListing()
  if not listing then
    ListingStatus(reason)
    if listing == false then ForgetListing() end
    return
  end
  Watcher.InitializeRecovery()
  local now = GetServerTime()
  local key = NormalizeZombakCharacterName(GetPlayerCharacterKey())
  if not activeAnnouncement or activeAnnouncement.fingerprint ~= listing.fingerprint then
    local saved = RR.DB.zombakBroadcasts[key]
    local resume = type(saved) == "table" and saved.fingerprint == listing.fingerprint and
      type(saved.lastSeen) == "number" and now - saved.lastSeen <= ZOMBAK_RAID_RESUME_WINDOW and
      saved.lastSeen <= now + 15 and type(saved.timestamp) == "number" and saved.timestamp > 0 and
      saved.timestamp == math.floor(saved.timestamp) and saved.timestamp <= now + 15 and
      type(saved.nonce) == "string" and #saved.nonce <= 48 and saved.nonce:match("^[%w%-_]+$")
    serial = (serial + 1) % 1000000000
    RR.DB.zombakBroadcastSerial = serial
    activeAnnouncement = {
      leader = RR.Realm.GetZombakDisplayName(GetPlayerCharacterKey()),
      activityIDs = listing.activityIDs, activity = listing.activity, categoryID = listing.activity.categoryID,
      fingerprint = listing.fingerprint, timestamp = resume and saved.timestamp or now,
      nonce = resume and saved.nonce or (now .. "-" .. math.floor(GetTime() * 1000) .. "-" .. serial),
    }
    nextRecoveryAt = GetTime() + ZOMBAK_RAID_RECOVERY_INTERVAL
    -- Store identity before the transport runs: reload resumes the same logical notice.
    RR.DB.zombakBroadcasts[key] = {
      fingerprint = listing.fingerprint, timestamp = activeAnnouncement.timestamp,
      nonce = activeAnnouncement.nonce, lastSeen = now,
    }
    ListingStatus((resume and "resumed listing: " or "public raid detected: ") .. listing.fingerprint)
    RR.Diagnostics.Record("LISTING_DETECTED", { nonce = activeAnnouncement.nonce, leader = activeAnnouncement.leader,
      activities = listing.fingerprint, difficulty = listing.activity.difficultyID, resumed = resume or false,
      createdAt = activeAnnouncement.timestamp })
    RR.Comm.BroadcastZombakRaid(activeAnnouncement, now - activeAnnouncement.timestamp > ZOMBAK_RAID_EVENT_MAX_AGE)
  else
    RR.DB.zombakBroadcasts[key].lastSeen = now
    if GetTime() >= nextRecoveryAt and not RR.Comm.HasZombakBroadcast() then
      nextRecoveryAt = GetTime() + ZOMBAK_RAID_RECOVERY_INTERVAL
      RR.Comm.BroadcastZombakRaid(activeAnnouncement, true)
    end
  end
end

function Watcher.HandleActiveEntryUpdate(created)
  if not IsZombakCharacter(GetPlayerCharacterKey()) then return end
  -- A new creation invalidates the old identity even while its data is locked.
  -- Updates are reconciled too: public/private changes, activities and leadership can change.
  if created == true then ForgetListing() end
  Watcher.Maintain()
end

function Watcher.IsAnnouncementActive(announcement)
  if not announcement or announcement ~= activeAnnouncement then return false end
  local listing = ReadListing()
  if listing == nil then return nil end
  return listing ~= false and listing.fingerprint == announcement.fingerprint
end

function Watcher.GetActiveAnnouncement()
  -- Direct subscribers must never get a stale/private listing, including while
  -- Blizzard temporarily hides the active-entry data.
  if Watcher.IsAnnouncementActive(activeAnnouncement) then return activeAnnouncement end
end

function Watcher.ClearPendingNotifications()
  for _, notice in pairs(pendingNotifications) do
    RR.Diagnostics.Record("RX_DROPPED", { nonce = notice.nonce, leader = notice.leaderKey, reason = "setting_disabled" })
  end
  pendingNotifications = {}
end

function Watcher.HasPendingNotifications()
  return next(pendingNotifications) ~= nil
end

local function Deferred(notice, reason, err)
  RR.Diagnostics.Change("pending:" .. notice.leaderKey, "POPUP_WAIT", {
    nonce = notice.nonce, leader = notice.leaderKey, reason = reason, error = err,
  })
end

function Watcher.FlushPendingNotifications()
  if not RR.Options.IsZombakEnabled() then return end
  DismissGroupedAnnouncement()
  local now = GetServerTime()
  for senderKey, notice in pairs(pendingNotifications) do
    local key = senderKey .. ":" .. notice.nonce
    local inAnnouncedGroup = IsInAnnouncedGroup(notice)
    if now - notice.receivedAt > ZOMBAK_RAID_EVENT_MAX_AGE or state.seen[key] then
      RR.Diagnostics.Record("RX_DROPPED", { nonce = notice.nonce, leader = senderKey,
        reason = state.seen[key] and "already_shown" or "queue_expired", queuedFor = GetTime() - notice.firstReceivedAt })
      pendingNotifications[senderKey] = nil
    elseif inAnnouncedGroup then
      RR.Diagnostics.Record("RX_DROPPED", { nonce = notice.nonce, leader = senderKey,
        reason = "already_in_announced_group", queuedFor = GetTime() - notice.firstReceivedAt })
      RR.Comm.RecordZombakReceive("ignored: already in announced group of " .. notice.leader)
      -- Do not mark it as shown: a fresh broadcast after leaving can be useful.
      pendingNotifications[senderKey] = nil
    elseif inAnnouncedGroup == nil then
      Deferred(notice, "group_roster_unavailable")
    elseif IsZombakLFGRestricted() then
      Deferred(notice, "chat_lockdown")
    elseif not RR.UI.ZombakRaidPopup.CanNotify() then
      Deferred(notice, RR.UI.ZombakRaidPopup.GetBlockReason())
    elseif state.announcement and state.announcement.leaderKey and state.announcement.leaderKey ~= senderKey then
      Deferred(notice, "another_leader_popup")
    else
      local readable, activity, reason = pcall(GetRaidActivity, notice.activityIDs)
      if not readable then
        Deferred(notice, "activity_metadata_error", activity)
        RR.Comm.RecordZombakReceive("deferred: activity metadata error: " .. tostring(activity))
      elseif not activity then
        if reason ~= "unavailable" then pendingNotifications[senderKey] = nil end
        if reason == "unavailable" then
          Deferred(notice, "activity_metadata_unavailable")
        else
          RR.Diagnostics.Record("RX_DROPPED", { nonce = notice.nonce, leader = senderKey, reason = "not_a_raid" })
        end
        RR.Comm.RecordZombakReceive("deferred: activity metadata " .. reason)
      else
        notice.activity, notice.categoryID = activity, activity.categoryID
        local ok, err = pcall(function()
          Watcher.Clear("replaced_by_announcement")
          state.announcement = notice
          SetStatus("ready", "zombakCreated", "search")
          RR.UI.ZombakRaidPopup.Show()
        end)
        if ok then
          -- Commit deduplication only after the window has actually been displayed.
          state.seen[key] = now + ZOMBAK_RAID_SEEN_LIFETIME
          PruneSeen()
          pendingNotifications[senderKey] = nil
          RR.State.zombakLastPopupAt = now
          RR.Diagnostics.Record("POPUP_SHOWN", { nonce = notice.nonce, leader = senderKey,
            firstReceivedAt = notice.firstReceivedServerTime, queuedFor = GetTime() - notice.firstReceivedAt,
            listingAge = now - notice.timestamp, position = RR.UI.ZombakRaidPopup.GetPositionSummary() })
          pcall(PlayRaidReminderSound, "READY_CHECK")
          RR.Comm.RecordZombakReceive("accepted from " .. notice.leader .. "; popup shown")
        else
          pcall(Watcher.Clear, "popup_error")
          Deferred(notice, "popup_error", err)
          RR.Comm.RecordZombakReceive("deferred: popup error: " .. tostring(err))
        end
      end
    end
  end
end

function Watcher.Maintain()
  Watcher.InitializeRecovery()
  local ok, err = pcall(ReconcileListing)
  if not ok then ListingStatus("deferred after listing error: " .. tostring(err)) end
  ok, err = pcall(Watcher.FlushPendingNotifications)
  if not ok then
    RR.Comm.RecordZombakReceive("deferred after notification error: " .. tostring(err))
    RR.Diagnostics.Change("notification_error", "RX_ERROR", { error = err })
  end
end

local function NonceSequence(nonce)
  return type(nonce) == "string" and tonumber(nonce:match("^%d+%-%d+%-(%d+)$")) or nil
end

local function RememberLatest(senderKey, timestamp, nonce)
  state.latest[senderKey], state.latestNonce[senderKey] = timestamp, nonce
  if latestRecords then
    latestRecords[senderKey] = { timestamp = timestamp, nonce = nonce, expires = GetServerTime() + ZOMBAK_RAID_SEEN_LIFETIME }
  end
end

function Watcher.Receive(parts, sender, distribution, ...)
  local _, _, channelID, channelName = ...
  local recovery = parts[1] == ZOMBAK_RAID_ACTIVE_EVENT
  local timestamp = tonumber(parts[5])
  local snapshotAt = recovery and tonumber(parts[7]) or nil
  RR.Diagnostics.Record("RX_PACKET", { leader = sender, nonce = parts[6], version = parts[2],
    kind = recovery and "ACTIVE" or "CREATED", channel = channelID, channelName = channelName,
    distribution = distribution, createdAt = parts[5], snapshotAt = snapshotAt,
    listingAge = timestamp and GetServerTime() - timestamp, snapshotAge = snapshotAt and GetServerTime() - snapshotAt })
  local function rejected(reason)
    RR.Diagnostics.Record("RX_IGNORED", { leader = sender, nonce = parts[6], reason = reason })
    RR.Comm.RecordZombakReceive("ignored from " .. tostring(sender) .. ": " .. reason)
  end
  if not RR.Options.IsZombakEnabled() then rejected("receiving is disabled"); return end
  if IsZombakLFGRestricted() then rejected("InChatMessagingLockdown"); return end
  if distribution ~= "WHISPER" and not RR.Comm.IsZombakChannel(distribution, ...) then
    rejected("unexpected channel"); return
  end
  if not IsZombakCharacter(sender) then rejected("sender is not in ZombakCharacters"); return end
  if #parts ~= (recovery and 7 or 6) or parts[2] ~= ZOMBAK_RAID_PROTOCOL_VERSION then
    rejected("invalid format or protocol version"); return
  end
  local senderKey = NormalizeZombakCharacterName(sender)
  if senderKey ~= NormalizeZombakCharacterName(parts[3]) then rejected("sender does not match leader"); return end
  local timestamp, nonce = tonumber(parts[5]), parts[6]
  local sentAt = timestamp
  if recovery then sentAt = tonumber(parts[7]) end
  local now = GetServerTime()
  if not timestamp or timestamp ~= math.floor(timestamp) or timestamp > now + 15 or
    not sentAt or sentAt ~= math.floor(sentAt) or now - sentAt > ZOMBAK_RAID_EVENT_MAX_AGE or
    sentAt > now + 15 or sentAt < timestamp or #nonce > 48 or not nonce:match("^[%w%-_]+$") then
    rejected("expired message, clock mismatch or invalid nonce"); return
  end
  local sequence, previous = NonceSequence(nonce), NonceSequence(state.latestNonce[senderKey])
  if state.latest[senderKey] and (timestamp < state.latest[senderKey] or
    (timestamp == state.latest[senderKey] and sequence and previous and sequence < previous)) then
    rejected("older than the last listing"); return
  end
  PruneSeen()
  local key = senderKey .. ":" .. nonce
  if state.seen[key] then
    state.seen[key] = now + ZOMBAK_RAID_SEEN_LIFETIME
    RememberLatest(senderKey, timestamp, nonce)
    rejected("duplicate listing"); return
  end
  if not parts[4]:match("^%d[%d,]*$") or parts[4]:find(",,") or parts[4]:sub(-1) == "," then
    rejected("invalid activityIDs"); return
  end
  local rawIDs = {}
  for value in parts[4]:gmatch("%d+") do rawIDs[#rawIDs + 1] = tonumber(value) end
  local ids = ReadActivityIDs(rawIDs)
  if not ids then rejected("invalid activityIDs"); return end
  local ok, activity, reason = pcall(GetRaidActivity, ids)
  if not ok then activity, reason = nil, "unavailable" end
  if not activity and reason ~= "unavailable" then rejected("category is not Raids (3)"); return end
  RememberLatest(senderKey, timestamp, nonce)
  local notice = pendingNotifications[senderKey]
  if notice and notice.nonce == nonce then
    -- Retransmissions refresh freshness, but must not erase the original local arrival time.
    notice.receivedAt = math.max(notice.receivedAt, sentAt)
  else
    if notice then
      RR.Diagnostics.Record("RX_DROPPED", { leader = senderKey, nonce = notice.nonce, reason = "superseded" })
    end
    pendingNotifications[senderKey] = {
      leader = RR.Realm.GetZombakDisplayName(sender), leaderKey = senderKey, sender = sender,
      activityIDs = ids, timestamp = timestamp, nonce = nonce, receivedAt = sentAt,
      firstReceivedAt = GetTime(), firstReceivedServerTime = now,
    }
    RR.Diagnostics.Record("RX_QUEUED", { nonce = nonce, leader = senderKey })
  end
  RR.Comm.RecordZombakReceive("queued from " .. sender .. "; waiting for data or visible UI")
  local ok, err = pcall(Watcher.FlushPendingNotifications)
  if not ok then
    RR.Comm.RecordZombakReceive("deferred after notification error: " .. tostring(err))
    RR.Diagnostics.Change("notification_error", "RX_ERROR", { error = err })
  end
end


local function ResultMatches(info)
  local announcement = state.announcement
  return announcement and info and not IsSecret(info.isDelisted) and info.isDelisted ~= true and
    IsZombakCharacter(info.leaderName) and NormalizeZombakCharacterName(info.leaderName) == announcement.leaderKey and
    ActivitiesIntersect(info.activityIDs, announcement.activityIDs)
end

local function ShowExistingApplication(resultID)
  local _, status, pending = C_LFGList.GetApplicationInfo(resultID)
  if pending and pending ~= "none" then
    SetStatus("applying", "zombakApplicationPending", nil)
    return true
  elseif status == "applied" then
    SetStatus("applied", "zombakAlreadyApplied", nil)
    return true
  elseif status == "invited" then
    SetStatus("invited", "zombakInvited", nil)
    return true
  elseif status == "inviteaccepted" then
    SetStatus("done", "zombakJoined", nil)
    return true
  end
  return false
end

local function IsResultFull(info)
  local activity = state.announcement.activity
  return activity and activity.maxNumPlayers and activity.maxNumPlayers > 0 and
    not IsSecret(info.numMembers) and info.numMembers and info.numMembers >= activity.maxNumPlayers
end

local function FoundResult(resultID, info)
  if DismissGroupedAnnouncement() then return end
  if not IsSecret(info.hasSelf) and info.hasSelf then
    Watcher.Clear("already_in_announced_group")
    return
  end
  if searchTimer then
    searchTimer:Cancel()
    searchTimer = nil
  end
  state.pendingSearch, state.searchResults = nil, nil
  state.currentZombakResultID = resultID
  state.resultFoundAt = GetTime()
  state.partyGUID = not IsSecret(info.partyGUID) and info.partyGUID or nil
  state.numMembers = not IsSecret(info.numMembers) and info.numMembers or nil
  ZombakDebug("Found Zombak result: " .. resultID)
  if ShowExistingApplication(resultID) then
    return
  elseif IsResultFull(info) then
    Retry("zombakFull")
    return
  end
  SetStatus("found", "zombakFound", "apply")
  resultTimer = C_Timer.NewTimer(ZOMBAK_RAID_RESULT_TIMEOUT, function()
    resultTimer = nil
    if state.phase == "found" then
      Retry("zombakChanged")
    end
  end)
end

local function ScanSearchResults()
  local awaitingLeader = false
  for resultID in pairs(state.searchResults or {}) do
    local info = C_LFGList.GetSearchResultInfo(resultID)
    if ResultMatches(info) then
      FoundResult(resultID, info)
      return
    elseif info and not IsSecret(info.leaderName) and not info.leaderName then
      -- leaderName can arrive later via LFG_LIST_SEARCH_RESULT_UPDATED.
      awaitingLeader = true
    end
  end
  if not awaitingLeader then
    Retry("zombakNotFound")
  end
end

function Watcher.HandleSearchResults()
  if not RR.Options.IsZombakEnabled() or not state.announcement or IsZombakLFGRestricted() then
    return
  end
  if not state.pendingSearch then
    -- Blizzard and other addons share the result cache; another search invalidates our selection.
    if state.phase == "found" then
      Retry("zombakChanged")
    end
    return
  end
  local _, results = C_LFGList.GetSearchResults()
  RR.Diagnostics.Record("LFG_RESULTS", { nonce = state.announcement.nonce, count = results and #results or 0 })
  state.searchResults = {}
  for _, resultID in ipairs(results or {}) do
    state.searchResults[resultID] = true
  end
  ScanSearchResults()
end

function Watcher.HandleSearchFailed(reason)
  if state.pendingSearch and RR.Options.IsZombakEnabled() then
    RR.Diagnostics.Record("LFG_SEARCH_FAILED", { nonce = state.announcement and state.announcement.nonce, reason = reason })
    Retry("zombakSearchFailed")
  end
end

function Watcher.HandleResultUpdated(resultID)
  if not RR.Options.IsZombakEnabled() or IsZombakLFGRestricted() then
    return
  end
  if state.pendingSearch and state.searchResults and state.searchResults[resultID] then
    ScanSearchResults()
  elseif resultID == state.currentZombakResultID and state.phase ~= "invited" and state.phase ~= "done" then
    local info = C_LFGList.GetSearchResultInfo(resultID)
    if not ResultMatches(info) then
      Retry("zombakChanged")
    elseif not IsSecret(info.hasSelf) and info.hasSelf then
      Watcher.Clear("already_in_announced_group")
    elseif not ShowExistingApplication(resultID) then
      if IsResultFull(info) then
        Retry("zombakFull")
      else
        state.numMembers = not IsSecret(info.numMembers) and info.numMembers or nil
        Watcher.RefreshPopup()
      end
    end
  end
end

local applicationStatuses = {
  applied = { "applied", "zombakApplied" },
  invited = { "invited", "zombakInvited" },
  inviteaccepted = { "done", "zombakJoined" },
  cancelled = { "retry", "zombakCancelled" },
  declined = { "retry", "zombakDeclined" },
  declined_full = { "retry", "zombakFull" },
  declined_delisted = { "retry", "zombakNotFound" },
  invitedeclined = { "retry", "zombakCancelled" },
  timedout = { "retry", "zombakApplicationExpired" },
  failed = { "retry", "zombakApplyFailed" },
  none = { "retry", "zombakCancelled" },
}

function Watcher.HandleApplicationStatus(resultID, newStatus)
  if IsSecret(resultID) or IsSecret(newStatus) then
    RR.Diagnostics.Record("LFG_APPLICATION_UNREADABLE")
    return
  end
  local tracked = trackedApplications[resultID]
  if tracked and GetTime() - tracked.at > 900 then trackedApplications[resultID] = nil; tracked = nil end
  if tracked or resultID == state.currentZombakResultID then
    RR.Diagnostics.Record("LFG_APPLICATION", { nonce = tracked and tracked.nonce or (state.announcement and state.announcement.nonce),
      resultID = resultID, status = newStatus })
  end
  if not RR.Options.IsZombakEnabled() or resultID ~= state.currentZombakResultID then
    return
  end
  local status = applicationStatuses[newStatus]
  if not status then
    return
  end
  if applicationTimer then
    applicationTimer:Cancel()
    applicationTimer = nil
  end
  if status[1] == "retry" then
    Retry(status[2])
  else
    SetStatus(status[1], status[2], nil)
  end
end

-- Assigned directly as the popup button's OnClick. These are the ONLY call
-- sites for Search and ApplyToGroup: no timer, event or secure UI hook calls them.
function Watcher.OnActionClick()
  if not RR.Options.IsZombakEnabled() or not state.announcement or not state.action then
    return
  end
  if DismissGroupedAnnouncement() then return end
  RR.Diagnostics.Record("ACTION_CLICK", { nonce = state.announcement.nonce, action = state.action,
    test = state.announcement.isTest or false, combat = InCombatLockdown() or false,
    lockdown = IsZombakLFGRestricted() or false })
  if InCombatLockdown() then
    Watcher.RefreshPopup()
    return
  end
  if IsZombakLFGRestricted() then
    SetStatus(state.phase, "zombakRestricted", state.action)
    return
  end
  RR.UI.ZombakRaidPopup.ResetTimeout()

  if state.announcement.isTest then
    if state.action == "search" then
      SetStatus("found", "zombakTestFound", "apply")
    else
      SetStatus("applied", "zombakTestApplied", nil)
    end
    return
  end

  if state.action == "search" then
    local activity = GetRaidActivity(state.announcement.activityIDs)
    if not activity then
      Retry("zombakActivityUnavailable")
      return
    end
    local panel = LFGListFrame and LFGListFrame.SearchPanel
    if panel and panel.searching then
      Retry("zombakSearchBusy")
      return
    end
    -- The search text belongs to Blizzard's protected editbox. Do not clear or
    -- restore it through addon code, since that would taint the normal finder.
    local searchText = panel and panel.SearchBox and panel.SearchBox:GetText()
    if IsSecret(searchText) or (searchText and searchText ~= "") then
      Retry("zombakSearchText")
      return
    end

    CancelTimers()
    state.currentZombakResultID = nil
    state.pendingSearch = true
    state.searchResults = nil
    state.announcement.activity = activity
    SetStatus("searching", "zombakSearching", nil)
    searchTimer = C_Timer.NewTimer(ZOMBAK_RAID_SEARCH_TIMEOUT, function()
      searchTimer = nil
      if state.pendingSearch then
        Retry("zombakNotFound")
      end
    end)
    -- A fresh table makes this a per-request filter; saved language/advanced
    -- filters and all Blizzard frame fields remain untouched.
    local languages = {}
    for locale, enabled in pairs(C_LFGList.GetLanguageSearchFilter() or {}) do
      languages[locale] = enabled
    end
    languages.ruRU = true
    ZombakDebug("Searching LFG...")
    RR.Diagnostics.Record("LFG_SEARCH_CALL", { nonce = state.announcement.nonce })
    C_LFGList.Search(activity.categoryID, 0, 0, languages, true, nil, state.announcement.activityIDs)
    return
  end

  local resultID = state.currentZombakResultID
  local info = resultID and C_LFGList.GetSearchResultInfo(resultID)
  if not resultID or not state.resultFoundAt or GetTime() - state.resultFoundAt >= ZOMBAK_RAID_RESULT_TIMEOUT or
    not ResultMatches(info) or (state.partyGUID and state.partyGUID ~= info.partyGUID) then
    Retry("zombakChanged")
    return
  end
  if not IsSecret(info.hasSelf) and info.hasSelf then
    Watcher.Clear("already_in_announced_group")
    return
  elseif ShowExistingApplication(resultID) then
    return
  elseif IsResultFull(info) then
    Retry("zombakFull")
    return
  elseif C_LFGList.HasActiveEntryInfo() then
    SetStatus("found", "zombakOwnListing", "apply")
    return
  elseif IsInGroup(LE_PARTY_CATEGORY_HOME) and not UnitIsGroupLeader("player", LE_PARTY_CATEGORY_HOME) then
    SetStatus("found", "zombakNotLeader", "apply")
    return
  end
  local _, isTank, isHealer, isDPS = GetLFGRoles()
  if not isTank and not isHealer and not isDPS then
    SetStatus("found", "zombakChooseRoles", "apply")
    return
  end
  SetStatus("applying", "zombakApplying", nil)
  applicationTimer = C_Timer.NewTimer(10, function()
    applicationTimer = nil
    if state.currentZombakResultID == resultID and state.phase == "applying" then
      if IsZombakLFGRestricted() then
        Retry("zombakRestricted")
      elseif not ShowExistingApplication(resultID) then
        Retry("zombakApplyFailed")
      end
    end
  end)
  ZombakDebug("Applying to Zombak raid: " .. resultID)
  RR.Diagnostics.Record("LFG_APPLY_CALL", { nonce = state.announcement.nonce, resultID = resultID })
  local count, oldestID, oldestAt = 0, nil, nil
  for id, tracked in pairs(trackedApplications) do
    count = count + 1
    if not oldestAt or tracked.at < oldestAt then oldestID, oldestAt = id, tracked.at end
  end
  if count >= 5 then trackedApplications[oldestID] = nil end
  trackedApplications[resultID] = { nonce = state.announcement.nonce, at = GetTime() }
  C_LFGList.ApplyToGroup(resultID, isTank, isHealer, isDPS)
end

function Watcher.TestPopup()
  if not RR.Options.IsZombakEnabled() then
    print("[RR] " .. InterfaceText("zombakEnableForTest"))
    return
  end
  Watcher.Clear()
  state.announcement = {
    leader = RR.ZombakCharacters[1],
    activity = { fullName = InterfaceText("zombakTestActivity") },
    isTest = true,
  }
  SetStatus("ready", "zombakTestReady", "search")
  RR.UI.ZombakRaidPopup.Show()
end

RR.Comm.RegisterHandler(ZOMBAK_RAID_EVENT, Watcher.Receive)
RR.Comm.RegisterHandler(ZOMBAK_RAID_ACTIVE_EVENT, Watcher.Receive)
