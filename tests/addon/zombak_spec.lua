-- These tests load the actual .toc modules, event dispatcher and popup OnClick.
-- The fake Blizzard boundary rejects protected calls without a hardware click.
local tests = 0
local function eq(actual, expected, message)
  assert(actual == expected, (message or "unexpected value") .. ": " .. tostring(actual) .. " ~= " .. tostring(expected))
end
local function test(name, callback)
  local ok, message = pcall(callback)
  assert(ok, name .. ": " .. tostring(message))
  tests = tests + 1
  print("PASS " .. name)
end

local function newClient(options)
  options = options or {}
  local c = {
    now = 100, frames = {}, timers = {}, searches = {}, applications = {}, sent = {}, messages = {},
    results = {}, resultIDs = {}, appStatus = {}, channels = {}, joins = 0, reads = 0,
    player = options.player or "Латтэ", realm = options.realm or "Ревущий Фьорд",
    roles = { false, false, false, true }, registerResult = 0, sendResult = 0,
  }
  local env = setmetatable({}, { __index = _G })
  c.env = env
  env._G = env
  env.RaidReminderDB = options.db
  env.SlashCmdList = {}
  env.UISpecialFrames = {}
  env.SOUNDKIT = { READY_CHECK = 1 }
  env.Enum = {
    RegisterAddonMessagePrefixResult = { Success = 0, DuplicatePrefix = 1, InvalidPrefix = 2, MaxPrefixes = 3 },
    SendAddonMessageResult = { Success = 0, ChannelThrottle = 8, AddOnMessageLockdown = 11 },
  }
  env.LE_PARTY_CATEGORY_HOME = 1
  env.LE_PARTY_CATEGORY_INSTANCE = 2
  env.GetLocale = function() return "ruRU" end
  env.GetTime = function() return c.now end
  env.GetServerTime = function() return 1800000000 + math.floor(c.now) end
  env.GetRealmName = function() return c.realm end
  env.GetNormalizedRealmName = function() return c.realm:gsub(" ", "") end
  env.UnitFullName = function() return c.player, c.realm end
  env.UnitName = function() return c.player end
  env.IsInGroup = function() return c.inGroup or false end
  env.IsInRaid = function() return false end
  env.UnitIsGroupLeader = function() return c.isLeader or false end
  env.InCombatLockdown = function() return c.combat or false end
  env.GetLFGRoles = function() return unpack(c.roles) end
  env.GetDifficultyInfo = function(id) return id == 15 and "Героический" or nil end
  env.issecretvalue = function(value) return value == c.secret and value ~= nil end
  env.print = function(message) c.messages[#c.messages + 1] = message end
  env.PlaySound = function() c.sounds = (c.sounds or 0) + 1 end
  env.SendChatMessage = function() error("must not use ordinary chat") end
  env.CreateColor = function(...) return { ... } end
  env.GameFontHighlightSmall = {}
  env.EventRegistry = { callbacks = {} }
  function env.EventRegistry:RegisterCallback(event, callback, owner)
    self.callbacks[event] = self.callbacks[event] or {}
    self.callbacks[event][owner] = callback
  end
  function c:editEvent(event)
    for owner, callback in pairs(env.EventRegistry.callbacks[event] or {}) do callback(owner) end
  end
  if options.noEditMode then env.EventRegistry = nil end

  local methods = {}
  function methods:SetScript(name, callback) self.scripts[name] = callback end
  function methods:RegisterEvent(name) self.events[name] = true end
  function methods:Show() self.shown = true end
  function methods:Hide()
    local wasShown = self.shown
    self.shown = false
    if wasShown and self.scripts.OnHide then self.scripts.OnHide(self) end
  end
  function methods:IsShown() return self.shown end
  function methods:SetEnabled(value)
    local changed = self.enabled ~= value
    self.enabled = value
    local callback = self.scripts[value and "OnEnable" or "OnDisable"]
    if changed and callback then callback(self) end
  end
  function methods:IsEnabled() return self.enabled end
  function methods:SetText(value) self.text = value end
  function methods:GetText() return self.text or "" end
  local function frame(name)
    local result = setmetatable({ scripts = {}, events = {}, shown = true, enabled = true }, { __index = methods })
    c.frames[#c.frames + 1] = result
    if name then env[name] = result end
    return result
  end
  function methods:CreateFontString() return frame() end
  function methods:CreateTexture() return frame() end
  function methods:GetFontString()
    self.fontString = self.fontString or frame()
    return self.fontString
  end
  function methods:SetFontString(value) self.fontString = value end
  function methods:GetStringHeight() return self.stringHeight or 14 end
  function methods:SetSize(width, height) self.width, self.height = width, height end
  function methods:SetWidth(width) self.width = width end
  function methods:SetHeight(height) self.height = height end
  function methods:GetWidth() return self.width or 0 end
  function methods:GetHeight() return self.height or 0 end
  function methods:SetPoint(point, relativeTo, relativePoint, x, y)
    self.point = { point, relativeTo, relativePoint, x, y }
    if point == "CENTER" and relativeTo == env.UIParent then
      local parentX, parentY = relativeTo:GetCenter()
      self.centerX, self.centerY = parentX + x, parentY + y
    end
  end
  function methods:ClearAllPoints() self.point = nil end
  function methods:GetCenter() return self.centerX, self.centerY end
  function methods:SetFrameLevel(level) self.frameLevel = level end
  function methods:GetFrameLevel() return self.frameLevel or 1 end
  function methods:SetMovable(value) self.movable = value end
  function methods:SetClampedToScreen(value) self.clamped = value end
  function methods:SetUserPlaced(value) self.userPlaced = value end
  function methods:StartMoving() assert(self.movable and not c.combat); self.moving = true end
  function methods:StopMovingOrSizing() self.moving = false end
  function methods:SetAlpha(value) self.alpha = value end
  function methods:CreateAnimationGroup() return frame() end
  function methods:CreateAnimation() return frame() end
  function methods:Play() self.playing = true end
  function methods:Stop() self.playing = false end
  for _, name in ipairs({ "SetFrameStrata", "SetToplevel", "SetJustifyH", "SetJustifyV", "SetWordWrap",
    "EnableMouse", "SetBackdrop", "SetBackdropColor", "SetBackdropBorderColor", "SetTextColor", "RegisterForClicks",
    "SetNormalFontObject", "SetHighlightFontObject", "SetDisabledFontObject", "Raise", "RegisterForDrag",
    "SetTexture", "SetGradient", "SetFromAlpha", "SetToAlpha", "SetDuration", "SetOrder" }) do
    methods[name] = function() end
  end
  env.CreateFrame = function(_, name) return frame(name) end
  env.UIParent = frame()
  env.UIParent:SetSize(1920, 1080)
  env.UIParent.centerX, env.UIParent.centerY = 960, 540
  env.C_Timer = { NewTimer = function(delay, callback)
    local timer = { at = c.now + delay, callback = callback }
    function timer:Cancel() self.cancelled = true end
    c.timers[#c.timers + 1] = timer
    return timer
  end }
  function c:advance(seconds)
    local deadline = self.now + seconds
    while true do
      local nextTimer
      for _, timer in ipairs(self.timers) do
        if not timer.cancelled and timer.at <= deadline and (not nextTimer or timer.at < nextTimer.at) then
          nextTimer = timer
        end
      end
      if not nextTimer then break end
      self.now = nextTimer.at
      nextTimer.cancelled = true
      nextTimer.callback()
    end
    self.now = deadline
  end
  function c:dispatch(event, ...)
    for _, item in ipairs(self.frames) do
      if item.events[event] and item.scripts.OnEvent then item.scripts.OnEvent(item, event, ...) end
    end
  end
  env.GetChannelName = function(name) return c.channels[name] or 0 end
  env.JoinTemporaryChannel = function(name)
    c.joins = c.joins + 1
    if not c.asyncJoin then c.channels[name] = 7 end
  end
  env.LeaveChannelByName = function(name) c.channels[name] = nil end
  env.C_ChatInfo = {
    RegisterAddonMessagePrefix = function(prefix) assert(#prefix <= 16); return c.registerResult end,
    InChatMessagingLockdown = function() return c.restricted or false end,
    AreOutgoingAddonChatMessagesRestricted = function() return c.outgoingRestricted or false end,
    SendAddonMessage = function(prefix, message, distribution, target)
      assert(#message <= 255)
      c.sent[#c.sent + 1] = { prefix, message, distribution, target }
      return c.sendResult
    end,
  }
  env.Settings = { VarType = { Boolean = "boolean" } }
  function env.Settings.RegisterVerticalLayoutCategory(name)
    eq(name, "Raid Reminder")
    return { GetID = function() return 123 end }
  end
  function env.Settings.RegisterAddOnSetting(category, variable, key, db, kind, label, default)
    eq(key, "autoSearchZombakRaids"); eq(db, env.RaidReminderDB); eq(kind, "boolean"); eq(default, false)
    eq(variable, "RaidReminder_autoSearchZombakRaids")
    c.setting = {}
    function c.setting:SetValueChangedCallback(callback) self.callback = callback end
    function c.setting:SetValue(value) db[key] = value; self.callback(self, value) end
    return c.setting
  end
  function env.Settings.CreateCheckbox(_, setting, tooltip) eq(setting, c.setting); assert(#tooltip > 0) end
  function env.Settings.RegisterAddOnCategory(category) c.category = category end
  function env.Settings.OpenToCategory(id) c.openedSettings = id end

  local activity = { fullName = "Шпиль Бездны", categoryID = 3, difficultyID = 15, maxNumPlayers = 30 }
  c.activities = { [101] = activity, [102] = activity, [201] = { categoryID = 2, fullName = "Dungeon" } }
  c.languageFilter = { enUS = true }
  env.C_LFGList = {
    GetActiveEntryInfo = function() return c.entry end,
    HasActiveEntryInfo = function() return c.entry ~= nil end,
    GetActivityInfoTable = function(id) return c.activities[id] end,
    GetLanguageSearchFilter = function() return c.languageFilter end,
    Search = function(category, filters, preferred, languages, crossFaction, advanced, ids)
      assert(c.hardware and not c.combat, "Search requires a non-combat hardware event")
      c.searches[#c.searches + 1] = { category, filters, preferred, languages, crossFaction, advanced, ids }
    end,
    GetSearchResults = function() return #c.resultIDs, c.resultIDs end,
    GetSearchResultInfo = function(id) c.reads = c.reads + 1; return c.results[id] end,
    GetApplicationInfo = function(id)
      local status = c.appStatus[id] or {}
      return id, status[1] or "none", status[2]
    end,
    ApplyToGroup = function(id, tank, healer, dps)
      assert(c.hardware and not c.combat, "ApplyToGroup requires a non-combat hardware event")
      c.applications[#c.applications + 1] = { id, tank, healer, dps }
      c.appStatus[id] = { "none", "applied" }
    end,
  }
  local rr = {}
  for _, file in ipairs(ADDON_FILES) do
    local chunk = assert(loadstring(ADDON_SOURCES[file], "@" .. file))
    setfenv(chunk, env)("RaidReminder", rr)
  end
  c.rr, c.state = rr, rr.State.ZombakRaid
  c:dispatch("ADDON_LOADED", "RaidReminder")
  c:dispatch("PLAYER_LOGIN")
  function c:enable(value) self.setting:SetValue(value) end
  function c:popup() return self.env.RaidReminderZombakRaidPopup end
  function c:click()
    local button = self:popup().action
    if not button.enabled then return end
    self.hardware = true
    button.scripts.OnClick(button, "LeftButton")
    self.hardware = false
  end
  function c:message(fields)
    fields = fields or {}
    local leader = fields.leader or "Зомбак-рф"
    local message = rr.Env.BuildAddonMessage("ZOMBAK_RAID_CREATED", fields.version or "1", leader,
      fields.ids or "101", fields.timestamp or self.env.GetServerTime(), fields.nonce or "test-1")
    self:dispatch("CHAT_MSG_ADDON", "RaidReminder", message, fields.distribution or "CHANNEL",
      fields.sender or "Зомбак-РевущийФьорд", "", 0, fields.channelID or 7,
      fields.channelName or "RaidReminderZombak", 0)
  end
  function c:found()
    self:enable(true)
    self:message()
    self:click()
    self.results[42] = { leaderName = "Зомбак-Ревущий Фьорд", activityIDs = { 101 }, numMembers = 17, partyGUID = "party-1" }
    self.resultIDs = { 42 }
    self:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
    eq(self.state.phase, "found")
  end
  return c
end

test("Cyrillic names, all aliases and local realm fallback", function()
  local c = newClient()
  for _, name in ipairs(c.rr.ZombakCharacters) do assert(c.rr.IsZombakCharacter(name)) end
  for _, name in ipairs({ "ЗОМБАК-РФ", "Зомбак-Ревущийфьорд", "Зомбак-Ревущий Фьорд", "Зомбак-HowlingFjord", "Зомбак" }) do
    assert(c.rr.IsZombakCharacter(name), name)
  end
  assert(not c.rr.IsZombakCharacter("Зомбак-Гордунни"))
  assert(not c.rr.IsZombakCharacter("Зомбаккк-рф"))
  c.realm = "Гордунни"
  assert(not c.rr.IsZombakCharacter("Зомбак"))
  eq(c.env.RaidReminder, c.rr)
end)

test("SavedVariables default, preservation and native settings binding", function()
  local c = newClient()
  eq(c.env.RaidReminderDB.autoSearchZombakRaids, false)
  eq(c.joins, 0)
  c = newClient({ db = { autoSearchZombakRaids = true, keepMe = 9 } })
  eq(c.joins, 1); eq(c.env.RaidReminderDB.keepMe, 9)
  c.env.SlashCmdList.RAIDREMINDER("settings")
  eq(c.openedSettings, 123)
end)

test("Zombak broadcasts independently of opt-in and once per listing", function()
  local c = newClient({ player = "Зомбак" })
  eq(c.rr.Options.IsZombakEnabled(), false); eq(c.joins, 1)
  c.entry = { activityIDs = { 101, 102 } }
  c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#c.sent, 1); eq(c.sent[1][3], "CHANNEL"); eq(c.sent[1][4], "7")
  assert(c.sent[1][2]:find("101,102", 1, true))
  c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  eq(#c.sent, 1)
  c.entry = nil; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE")
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#c.sent, 2)
  c:enable(false); eq(c.channels.RaidReminderZombak, 7)
end)

test("Other characters, assistants, private listings and dungeons do not broadcast", function()
  for _, config in ipairs({ {}, { player = "Зомбак", assistant = true }, { player = "Зомбак", private = true },
    { player = "Зомбак", dungeon = true } }) do
    local c = newClient(config)
    c.inGroup = config.assistant
    c.entry = { activityIDs = { config.dungeon and 201 or 101 }, privateGroup = config.private }
    c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
    eq(#c.sent, 0)
  end
end)

test("Authenticate sender, channel, version, age and activity before showing UI", function()
  local c = newClient(); c:enable(true)
  local cases = {
    { sender = "Другой-рф" }, { leader = "Зомбакк-рф" }, { sender = "Зомбак-Гордунни" },
    { distribution = "RAID" }, { channelID = 8, channelName = "WrongChannel" }, { version = "2" },
    { ids = "201" }, { ids = "101,,102" }, { ids = "101,0" }, { ids = "101,-1" },
    { ids = "101," }, { timestamp = c.env.GetServerTime() - 181 }, { timestamp = c.env.GetServerTime() + 16 },
    { nonce = "bad nonce" },
  }
  for _, fields in ipairs(cases) do c:message(fields); eq(c.state.announcement, nil) end
  eq(c:popup(), nil); eq(#c.searches, 0)
  c:message(); assert(c:popup():IsShown())
end)

test("Deduplication, ordering and single popup reuse", function()
  local c = newClient(); c:enable(true); c:message()
  local popup = c:popup()
  c:advance(2); c:message(); eq(c.sounds, 1)
  c.rr.ZombakRaids.Clear(); c:message(); assert(not popup:IsShown())
  c:message({ nonce = "new" }); eq(c:popup(), popup); assert(popup:IsShown())
  c:message({ nonce = "old", timestamp = c.env.GetServerTime() - 1 }); eq(c.state.announcement.nonce, "new")
end)

test("Two-client flow: event, first click search, exact result, second click native application", function()
  local leader = newClient({ player = "Зомбак" })
  local c = newClient(); c:enable(true)
  leader.entry = { activityIDs = { 101 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  local wire = leader.sent[1]
  c:dispatch("CHAT_MSG_ADDON", wire[1], wire[2], "CHANNEL", "Зомбак-РевущийФьорд", "", 0, 7, "RaidReminderZombak", 0)
  eq(#c.searches, 0); eq(#c.applications, 0)
  c:click(); eq(#c.searches, 1); eq(c.state.phase, "searching")
  eq(c.searches[1][1], 3); eq(c.searches[1][7][1], 101)
  eq(c.languageFilter.ruRU, nil); eq(c.searches[1][4].ruRU, true)
  c.results = {
    [11] = { leaderName = "Зомбакк-рф", activityIDs = { 101 } },
    [12] = { leaderName = "Зомбак-рф", activityIDs = { 102 } },
    [42] = { leaderName = "Зомбак-РевущийФьорд", activityIDs = { 101 }, numMembers = 17, partyGUID = "one" },
  }
  c.resultIDs = { 11, 12, 42 }; c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
  eq(c.state.currentZombakResultID, 42); eq(#c.applications, 0); eq(c:popup().members.text, "17 / 30")
  c.roles = { false, true, false, true }
  c:click(); eq(#c.applications, 1)
  eq(c.applications[1][1], 42); eq(c.applications[1][2], true); eq(c.applications[1][3], false); eq(c.applications[1][4], true)
  eq(c.state.phase, "applying")
  c.appStatus[42] = { "applied" }; c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, "applied", "none")
  eq(c.state.statusKey, "zombakApplied")
  c:click(); eq(#c.applications, 1)
  c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 77, "cancelled", "applied")
  eq(c.state.phase, "applied")
  c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, "invited", "applied")
  eq(c.state.phase, "invited")
end)

test("Delayed leaderName is resolved through result updates", function()
  local c = newClient(); c:enable(true); c:message(); c:click()
  c.results[42] = { activityIDs = { 101 } }; c.resultIDs = { 42 }
  c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED"); eq(c.state.pendingSearch, true)
  c.results[42].leaderName = "Зомбак-рф"; c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42)
  eq(c.state.currentZombakResultID, 42); eq(#c.applications, 0)
end)

test("Revalidate delisted, missing, changed leader/activity, reused ID and full results", function()
  local changes = {
    function(c) c.results[42].isDelisted = true end,
    function(c) c.results[42] = nil end,
    function(c) c.results[42].leaderName = "Зомбакк-рф" end,
    function(c) c.results[42].activityIDs = { 102 } end,
    function(c) c.results[42].partyGUID = "reused" end,
    function(c) c.results[42].numMembers = 30 end,
  }
  for _, change in ipairs(changes) do
    local c = newClient(); c:found(); change(c); c:click()
    eq(#c.applications, 0); eq(c.state.phase, "retry"); eq(c.state.currentZombakResultID, nil)
  end
end)

test("Result lifetime and other searches invalidate selections", function()
  local c = newClient(); c:found(); c:advance(60)
  eq(c.state.currentZombakResultID, nil); eq(c.state.phase, "retry"); eq(#c.searches, 1)
  c = newClient(); c:found(); c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
  eq(c.state.phase, "retry"); eq(#c.applications, 0)
end)

test("Existing and pending applications suppress duplicate applications", function()
  for _, status in ipairs({ { "applied" }, { "invited" }, { "inviteaccepted" }, { "none", "applied" }, { "applied", "cancelled" } }) do
    local c = newClient(); c:found(); c.appStatus[42] = status; c:click()
    eq(#c.applications, 0); eq(c.state.action, nil)
  end
end)

test("Application cancellation/failure/full/delisted and expiry allow manual retry", function()
  for _, status in ipairs({ "cancelled", "failed", "declined", "declined_full", "declined_delisted", "timedout", "invitedeclined" }) do
    local c = newClient(); c:found(); c:click()
    c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, status, "applied")
    eq(c.state.phase, "retry"); eq(c.state.currentZombakResultID, nil); eq(#c.searches, 1)
  end
end)

test("No roles, own listing and non-leader never apply", function()
  for _, mode in ipairs({ "roles", "listing", "leader" }) do
    local c = newClient(); c:found()
    if mode == "roles" then c.roles = { false, false, false, false }
    elseif mode == "listing" then c.entry = { activityIDs = { 101 } }
    else c.inGroup = true end
    c:click(); eq(#c.applications, 0); eq(c.state.action, "apply")
  end
end)

test("Combat disables actions and leaving combat never executes them", function()
  local c = newClient(); c:enable(true); c.combat = true; c:message()
  eq(c:popup().action.enabled, false); c:click(); eq(#c.searches, 0)
  c.combat = false; c:dispatch("PLAYER_REGEN_ENABLED"); eq(#c.searches, 0); eq(c:popup().action.enabled, true)
  c:click(); eq(#c.searches, 1)
  c.results[42] = { leaderName = "Зомбак-рф", activityIDs = { 101 } }; c.resultIDs = { 42 }
  c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
  c.combat = true; c:dispatch("PLAYER_REGEN_DISABLED"); c:click(); eq(#c.applications, 0)
  c.combat = false; c:dispatch("PLAYER_REGEN_ENABLED"); eq(#c.applications, 0)
  c:click(); eq(#c.applications, 1)
end)

test("Turning off clears in-flight work, suppresses late events and re-enables without reload", function()
  local c = newClient(); c:message(); eq(c:popup(), nil)
  c:enable(true); c:message(); c:click(); c:enable(false)
  eq(c.state.pendingSearch, nil); eq(c.state.currentZombakResultID, nil); assert(not c:popup():IsShown())
  local reads = c.reads
  c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED"); c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42)
  c:message({ nonce = "disabled" }); c:advance(100)
  eq(c.reads, reads); eq(c.state.announcement, nil)
  c:enable(true); c:message({ nonce = "enabled" }); assert(c:popup():IsShown())
end)

test("Close, auto-hide, failed search and missing results clean transient state", function()
  local c = newClient(); c:enable(true); c:message(); c:advance(90)
  eq(c.state.announcement, nil); assert(not c:popup():IsShown())
  c = newClient(); c:found(); c:popup():Hide(); eq(c.state.currentZombakResultID, nil)
  c = newClient(); c:enable(true); c:message(); c:click(); c:dispatch("LFG_LIST_SEARCH_FAILED")
  eq(c.state.phase, "retry"); eq(#c.searches, 1)
  c:click(); c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED"); eq(c.state.statusKey, "zombakNotFound")
  c:click(); c:advance(15); eq(c.state.phase, "retry"); eq(#c.searches, 3)
end)

test("Blizzard search text and active search remain untouched", function()
  local c = newClient(); c:enable(true); c:message()
  c.env.LFGListFrame = { SearchPanel = { SearchBox = { GetText = function() return "old search" end } } }
  c:click(); eq(#c.searches, 0); eq(c.state.statusKey, "zombakSearchText")
  c.env.LFGListFrame.SearchPanel.searching = true
  c:click(); eq(#c.searches, 0); eq(c.state.statusKey, "zombakSearchBusy")
end)

test("Chat lockdown and secret values stop processing without a bypass", function()
  local c = newClient({ player = "Зомбак" }); c.restricted = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); eq(#c.sent, 0)
  c = newClient(); c:enable(true); c:message(); c.restricted = true; c:click(); eq(#c.searches, 0)
  c:enable(false); c:enable(true); c:message({ nonce = "restricted" }); eq(c.state.announcement, nil)
  c.restricted = false; c.secret = {}
  c:dispatch("CHAT_MSG_ADDON", "RaidReminder", c.secret, "CHANNEL", "Зомбак-рф")
  eq(c.state.announcement, nil)
end)

test("Transport handles asynchronous join, channel renumbering and bounded failure", function()
  local c = newClient({ player = "Зомбак" }); c.channels = {}; c.asyncJoin = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); eq(#c.sent, 0)
  c:advance(5); c.channels.RaidReminderZombak = 12; c:dispatch("CHANNEL_UI_UPDATE")
  eq(#c.sent, 1); eq(c.sent[1][4], "12"); c:advance(10); eq(#c.sent, 1)
  c = newClient({ player = "Зомбак" }); c.channels = {}; c.asyncJoin = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c.entry = nil; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE"); c.channels.RaidReminderZombak = 7
  c:advance(40); eq(#c.sent, 0)
  c = newClient(); c.asyncJoin = true; c:enable(true); c:advance(60); eq(c.joins, 5)
  c = newClient(); c.channels.RaidReminderZombak = 7; c:enable(true); c:enable(false)
  eq(c.channels.RaidReminderZombak, 7, "preserve a channel the addon did not join")
end)

test("Prefix registration distinguishes numeric success from failure", function()
  local c = newClient(); c.rr.Env.addonMessagePrefixRegistered = false; c.registerResult = 3
  c.rr.Comm.RegisterAddonMessages(); eq(c.rr.Env.addonMessagePrefixRegistered, false)
  c.registerResult = 1; c.rr.Comm.RegisterAddonMessages(); eq(c.rr.Env.addonMessagePrefixRegistered, true)
end)

test("Restricted channel join and failed sends stop retrying within a bounded window", function()
  local c = newClient(); c.restricted = true; c:enable(true); c:advance(60)
  eq(c.joins, 0)
  for _, timer in ipairs(c.timers) do assert(timer.cancelled, "unbounded restricted join retry") end
  c = newClient({ player = "Зомбак" }); c.sendResult = 8
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); c:advance(60)
  assert(#c.sent <= 7)
  for _, timer in ipairs(c.timers) do assert(timer.cancelled, "unbounded send retry") end
end)

test("Removal after applying and rejection without a status event remain recoverable", function()
  local c = newClient(); c:found(); c:click()
  c.results[42].isDelisted = true; c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42)
  eq(c.state.phase, "retry"); eq(c.state.currentZombakResultID, nil)
  c = newClient(); c:found(); c:click(); c.appStatus[42] = { "none" }; c:advance(10)
  eq(c.state.statusKey, "zombakApplyFailed"); eq(#c.applications, 1)
end)

test("Local test command exercises popup without creating a listing/result/application", function()
  local c = newClient(); c.env.SlashCmdList.RAIDREMINDER("testzombak"); eq(c:popup(), nil)
  c:enable(true); c.env.SlashCmdList.RAIDREMINDER("testzombak")
  eq(c.state.phase, "ready"); c:click(); eq(c.state.phase, "found"); c:click(); eq(c.state.phase, "applied")
  eq(#c.searches, 0); eq(#c.applications, 0); eq(c.state.currentZombakResultID, nil); eq(#c.sent, 0)
  c.env.SlashCmdList.RAIDREMINDER("debug"); eq(c.rr.State.debugZombak, true)
  c.env.SlashCmdList.RAIDREMINDER("debug"); eq(c.rr.State.debugZombak, false)
  local opened = false
  c.rr.UI.ShowExportFrame = function() opened = true end
  c.env.SlashCmdList.RAIDREMINDER(""); assert(opened)
end)

test("Existing raid-readiness communication still uses the shared dispatcher", function()
  local c = newClient()
  local received
  c.rr.Env.HandleRaidCheckRequest = function(sender, parts) received = { sender, parts[2] } end
  c:dispatch("CHAT_MSG_ADDON", "RaidReminder", "REQ\trequest-1", "RAID", "Рейдлидер-рф")
  eq(received[1], "Рейдлидер-рф"); eq(received[2], "request-1")
  c.rr.Env.SendRaidReminderAddonMessage("RSP\trequest-1", "WHISPER", "Рейдлидер-рф")
  eq(c.sent[1][3], "WHISPER"); eq(c.sent[1][4], "Рейдлидер-рф")
end)

test("Status command exposes transport state without sending or searching", function()
  local c = newClient(); c:enable(true); c:message({ leader = "Зомбакк-рф" })
  c.env.SlashCmdList.RAIDREMINDER("zombakstatus")
  local report = table.concat(c.messages, "\n")
  assert(report:find("receiveEnabled: true", 1, true))
  assert(report:find("channelID (0 = not joined): 7", 1, true))
  assert(report:find("prefixRegistered: true", 1, true))
  assert(report:find("sender does not match leader", 1, true))
  eq(#c.sent, 0); eq(#c.searches, 0); eq(#c.applications, 0)
end)

test("Realm policy true outside lockdown does not suppress a valid raid broadcast", function()
  local c = newClient({ player = "Зомбак" }); c.outgoingRestricted = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c.env.SlashCmdList.RAIDREMINDER("zombakstatus")
  assert(table.concat(c.messages, "\n"):find("SendAddonMessage: Success (0); channel=7", 1, true))
  assert(table.concat(c.messages, "\n"):find("outgoingRealmPolicy: true", 1, true))
  eq(#c.sent, 1)
  local recipient = newClient(); recipient.outgoingRestricted = true; recipient:enable(true)
  recipient:dispatch("CHAT_MSG_ADDON", c.sent[1][1], c.sent[1][2], "CHANNEL", "Зомбак-РевущийФьорд", "", 0, 7, "RaidReminderZombak", 0)
  eq(recipient.state.phase, "ready"); assert(recipient:popup():IsShown())
  eq(#recipient.searches, 0); eq(#recipient.applications, 0)
end)

test("Actual Blizzard lockdown blocks sending and explicit API refusal is not retried", function()
  local c = newClient({ player = "Зомбак" }); c.outgoingRestricted = true; c.restricted = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#c.sent, 0)
  c = newClient({ player = "Зомбак" }); c.outgoingRestricted = true; c.sendResult = 11
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c:advance(40); c.env.SlashCmdList.RAIDREMINDER("zombakstatus")
  eq(#c.sent, 1)
  assert(table.concat(c.messages, "\n"):find("AddOnMessageLockdown (11)", 1, true))
end)

test("Edit Mode shows a persistent preview even with notifications disabled and never calls LFG", function()
  local c = newClient()
  c:editEvent("EditMode.Enter")
  local popup, selection = c:popup(), c.env.RaidReminderZombakBannerSelection
  assert(popup:IsShown() and selection:IsShown())
  eq(popup.action.enabled, false); eq(popup.dismiss.enabled, false); eq(popup.close.enabled, false)
  eq(c.state.announcement, nil); eq(c.rr.DB.autoSearchZombakRaids, false)
  c:click(); c:advance(120)
  assert(popup:IsShown()); eq(#c.searches, 0); eq(#c.applications, 0); eq(#c.sent, 0)
  c:editEvent("EditMode.Exit")
  assert(not popup:IsShown() and not selection:IsShown())
end)

test("Dragging in Edit Mode persists a UIParent-relative position across reload and supports reset", function()
  local c = newClient(); c:editEvent("EditMode.Enter")
  local popup, selection = c:popup(), c.env.RaidReminderZombakBannerSelection
  selection.scripts.OnDragStart(); assert(popup.moving)
  popup.centerX, popup.centerY = 1160, 440
  selection.scripts.OnDragStop(); assert(not popup.moving)
  eq(c.rr.DB.zombakBannerPosition.x, 200); eq(c.rr.DB.zombakBannerPosition.y, -100)
  eq(popup.point[2], c.env.UIParent); eq(popup.userPlaced, false)
  c:editEvent("EditMode.Exit")
  selection.scripts.OnDragStart(); assert(not popup.moving)
  local reloaded = newClient({ db = c.rr.DB }); reloaded:editEvent("EditMode.Enter")
  eq(reloaded:popup().point[4], 200); eq(reloaded:popup().point[5], -100)
  reloaded.env.RaidReminderZombakBannerSelection.scripts.OnClick(nil, "RightButton")
  eq(reloaded.rr.DB.zombakBannerPosition, nil); eq(reloaded:popup().point[4], 0); eq(reloaded:popup().point[5], 90)
  c.env.SlashCmdList.RAIDREMINDER("resetbanner")
  eq(c.rr.DB.zombakBannerPosition, nil); eq(popup.point[5], 90)
end)

test("Invalid and off-screen saved positions are recoverable after resolution changes", function()
  for _, position in ipairs({ "broken", { x = "bad", y = 1 }, { x = 0/0, y = 1 }, { x = math.huge, y = 1 } }) do
    local c = newClient({ db = { zombakBannerPosition = position } }); c:editEvent("EditMode.Enter")
    eq(c:popup().point[4], 0); eq(c:popup().point[5], 90)
  end
  local c = newClient({ db = { zombakBannerPosition = { x = 5000, y = -5000 } } })
  c:editEvent("EditMode.Enter")
  local popup = c:popup()
  eq(popup.clamped, true)
  assert(math.abs(popup.point[4]) + popup:GetWidth()/2 < c.env.UIParent:GetWidth()/2)
  c.env.UIParent:SetSize(800, 600); c:dispatch("DISPLAY_SIZE_CHANGED")
  assert(math.abs(popup.point[4]) + popup:GetWidth()/2 < 400)
  assert(math.abs(popup.point[5]) + popup:GetHeight()/2 < 300)
end)

test("Editing restores a live notification without extending its lifetime or restarting search", function()
  local c = newClient(); c:found(); c:advance(10); c:editEvent("EditMode.Enter")
  c:click(); eq(#c.applications, 0)
  c:advance(10); c:editEvent("EditMode.Exit")
  eq(c.state.currentZombakResultID, 42); eq(c:popup().action.enabled, true)
  eq(c:popup().members.text, "17 / 30"); eq(#c.searches, 1)
  c:advance(70); assert(not c:popup():IsShown()); eq(c.state.announcement, nil)
end)

test("Incoming and expired notifications cannot replace or close the Edit Mode preview", function()
  local c = newClient(); c:enable(true); c:editEvent("EditMode.Enter")
  local previewText = c:popup().activity.text
  c:message(); eq(c:popup().activity.text, previewText); eq(c:popup().action.enabled, false)
  c:editEvent("EditMode.Exit"); assert(c:popup():IsShown())
  assert(c:popup().activity.text ~= previewText); eq(c:popup().action.enabled, true)
  c:editEvent("EditMode.Enter"); c:advance(90)
  assert(c:popup():IsShown()); eq(c.state.announcement, nil)
  c:editEvent("EditMode.Exit"); assert(not c:popup():IsShown())
  c:editEvent("EditMode.Enter"); c:message({ nonce = "disabled-in-edit" }); c:enable(false)
  assert(c:popup():IsShown()); c:editEvent("EditMode.Exit"); assert(not c:popup():IsShown())
end)

test("Combat ends dragging and Edit Mode preview without sending protected requests", function()
  local c = newClient(); c:editEvent("EditMode.Enter")
  c.env.RaidReminderZombakBannerSelection.scripts.OnDragStart(); assert(c:popup().moving)
  c.combat = true; c:dispatch("PLAYER_REGEN_DISABLED")
  assert(not c:popup().moving and not c:popup():IsShown())
  c:editEvent("EditMode.Enter"); assert(not c:popup():IsShown())
  eq(#c.searches, 0); eq(#c.applications, 0)
end)

test("Closing the compact banner stops its animations and pending work", function()
  local c = newClient(); c:enable(true); c:message()
  assert(c:popup().appear.playing and c:popup().glowAnimation.playing)
  c:popup().dismiss.scripts.OnClick()
  assert(not c:popup():IsShown() and not c:popup().appear.playing and not c:popup().glowAnimation.playing)
  eq(c.state.announcement, nil)
  c:advance(100); eq(#c.searches, 0); eq(#c.applications, 0)
end)

test("Missing Edit Mode callbacks do not break normal notifications", function()
  local c = newClient({ noEditMode = true }); c:found()
  assert(c:popup():IsShown()); c:click(); eq(#c.applications, 1)
end)

print(string.format("%d targeted addon scenarios passed", tests))
