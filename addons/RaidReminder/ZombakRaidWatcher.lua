local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local Watcher = RR.ZombakRaids
local state = RR.State.ZombakRaid
local activeAnnouncement
local serial = 0
local searchTimer
local resultTimer
local applicationTimer

local function IsSecret(value)
  return issecretvalue and issecretvalue(value)
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
    return nil
  end
  for _, id in ipairs(activityIDs) do
    local info = C_LFGList.GetActivityInfoTable(id)
    if info and info.categoryID == ZOMBAK_RAID_CATEGORY_ID then
      return info
    end
  end
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

function Watcher.Clear()
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

function Watcher.HandleActiveEntryUpdate(created)
  local function status(message)
    RR.State.zombakListingStatus = message
    ZombakDebug("Zombak listing: " .. message)
  end
  status("LFG_LIST_ACTIVE_ENTRY_UPDATE created=" .. tostring(created))
  if not IsZombakCharacter(GetPlayerCharacterKey()) then
    status("current character is not in ZombakCharacters")
    return
  elseif IsZombakLFGRestricted() then
    status("blocked by InChatMessagingLockdown")
    return
  end
  local entry = C_LFGList.GetActiveEntryInfo()
  if not entry then
    status("GetActiveEntryInfo returned no listing")
    activeAnnouncement = nil
    RR.Comm.ClearZombakBroadcast()
    return
  end
  if created ~= true then
    status("listing update, not a new listing")
    return
  elseif activeAnnouncement then
    status("listing was already announced")
    return
  elseif IsSecret(entry.privateGroup) or entry.privateGroup then
    status("private or restricted listing")
    return
  end
  -- Assistants also see entry updates, but the notification must name its leader.
  if IsInGroup(LE_PARTY_CATEGORY_HOME) and not UnitIsGroupLeader("player", LE_PARTY_CATEGORY_HOME) then
    status("current character is not the group leader")
    return
  end
  local ids = ReadActivityIDs(entry.activityIDs)
  local activity = ids and GetRaidActivity(ids)
  if not activity then
    status("activityIDs unavailable or category is not Raids (3)")
    return
  end

  serial = serial + 1
  local timestamp = GetServerTime()
  activeAnnouncement = {
    leader = RR.Realm.GetZombakDisplayName(GetPlayerCharacterKey()),
    activityIDs = ids,
    categoryID = activity.categoryID,
    activity = activity,
    timestamp = timestamp,
    nonce = timestamp .. "-" .. math.floor(GetTime() * 1000) .. "-" .. serial,
  }
  -- The recipient preference never gates broadcasting on Zombak's client.
  status("raid detected; sending " .. table.concat(ids, ","))
  RR.Comm.BroadcastZombakRaid(activeAnnouncement)
end

function Watcher.Receive(parts, sender, distribution, ...)
  local function rejected(reason)
    RR.Comm.RecordZombakReceive("ignored from " .. tostring(sender) .. ": " .. reason)
  end
  if not RR.Options.IsZombakEnabled() then
    rejected("receiving is disabled")
    return
  elseif IsZombakLFGRestricted() then
    rejected("InChatMessagingLockdown")
    return
  elseif not RR.Comm.IsZombakChannel(distribution, ...) then
    rejected("unexpected channel")
    return
  elseif not IsZombakCharacter(sender) then
    rejected("sender is not in ZombakCharacters")
    return
  end
  if #parts ~= 6 or parts[2] ~= ZOMBAK_RAID_PROTOCOL_VERSION then
    rejected("invalid format or protocol version")
    return
  end
  local senderKey = NormalizeZombakCharacterName(sender)
  if senderKey ~= NormalizeZombakCharacterName(parts[3]) then
    rejected("sender does not match leader")
    return
  end
  local timestamp, nonce = tonumber(parts[5]), parts[6]
  local now = GetServerTime()
  if not timestamp or timestamp ~= math.floor(timestamp) or now - timestamp > ZOMBAK_RAID_EVENT_MAX_AGE or
    timestamp > now + 15 or #nonce > 48 or not nonce:match("^[%w%-_]+$") then
    rejected("expired message, clock mismatch or invalid nonce")
    return
  end
  if state.latest[senderKey] and timestamp < state.latest[senderKey] then
    rejected("older than the last listing")
    return
  end
  local key = senderKey .. ":" .. nonce
  for seenKey, expires in pairs(state.seen) do
    if expires < now then
      state.seen[seenKey] = nil
    end
  end
  if state.seen[key] then
    rejected("duplicate listing")
    return
  end
  if not parts[4]:match("^%d[%d,]*$") or parts[4]:find(",,") or parts[4]:sub(-1) == "," then
    rejected("invalid activityIDs")
    return
  end
  local rawIDs = {}
  for value in parts[4]:gmatch("%d+") do
    rawIDs[#rawIDs + 1] = tonumber(value)
  end
  local ids = ReadActivityIDs(rawIDs)
  local activity = ids and GetRaidActivity(ids)
  if not activity then
    rejected("activityIDs unavailable or category is not Raids (3)")
    return
  end

  state.seen[key] = timestamp + ZOMBAK_RAID_EVENT_MAX_AGE + 15
  state.latest[senderKey] = timestamp
  Watcher.Clear()
  state.announcement = {
    leader = RR.Realm.GetZombakDisplayName(sender),
    leaderKey = senderKey,
    activityIDs = ids,
    categoryID = activity.categoryID,
    activity = activity,
    timestamp = timestamp,
    nonce = nonce,
  }
  SetStatus("ready", "zombakCreated", "search")
  RR.UI.ZombakRaidPopup.Show()
  PlayRaidReminderSound("READY_CHECK")
  RR.Comm.RecordZombakReceive("accepted from " .. sender .. "; popup shown")
  ZombakDebug("Zombak raid event received")
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
  elseif not IsSecret(info.hasSelf) and info.hasSelf then
    SetStatus("done", "zombakJoined", nil)
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
  state.searchResults = {}
  for _, resultID in ipairs(results or {}) do
    state.searchResults[resultID] = true
  end
  ScanSearchResults()
end

function Watcher.HandleSearchFailed()
  if state.pendingSearch and RR.Options.IsZombakEnabled() then
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
  if ShowExistingApplication(resultID) then
    return
  elseif not IsSecret(info.hasSelf) and info.hasSelf then
    SetStatus("done", "zombakJoined", nil)
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
