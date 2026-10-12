-- These tests load the actual .toc modules, event dispatcher and popup OnClick.
-- The fake Blizzard boundary rejects protected calls without a hardware click.
local tests = 0
local failures = {}
local function eq(actual, expected, message)
  assert(actual == expected, (message or "unexpected value") .. ": " .. tostring(actual) .. " ~= " .. tostring(expected))
end
local function test(name, callback)
  local ok, message = pcall(callback)
  if not ok then
    failures[#failures + 1] = name .. ": " .. tostring(message)
    print("FAIL " .. failures[#failures])
    return
  end
  tests = tests + 1
  print("PASS " .. name)
end

local function newClient(options)
  options = options or {}
  local c = {
    now = options.now or 100, frames = {}, timers = {}, searches = {}, applications = {}, sent = {}, messages = {},
    results = {}, resultIDs = {}, appStatus = {}, channels = options.channels or {}, joins = 0, reads = 0,
    channelSwaps = {}, asyncJoin = options.asyncJoin, joinChannelID = options.joinChannelID or 7,
    player = options.player or "Латтэ", realm = options.realm or "Ревущий Фьорд",
    roles = { false, false, false, true }, registerResult = options.registerResult or 0, sendResult = 0,
    entry = options.entry, inGroup = options.inGroup, isLeader = options.isLeader, restricted = options.restricted,
    prefixError = options.prefixError,
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
  env.date = os.date
  env.C_AddOns = { GetAddOnMetadata = function() return "0.2.10" end }
  env.UnitFactionGroup = function() return "Horde" end
  env.GetRealmName = function() return c.realm end
  env.GetNormalizedRealmName = function() return c.realm:gsub(" ", "") end
  env.UnitFullName = function() return c.player, c.realm end
  env.UnitName = function() return c.player end
  env.IsInGroup = function() return c.inGroup or false end
  env.IsInRaid = function() return false end
  env.UnitIsGroupLeader = function() return c.isLeader or false end
  env.InCombatLockdown = function() return c.combat or false end
  env.GetLFGRoles = function() return unpack(c.roles) end
  env.GetDifficultyInfo = function(id) return ({ [15] = "Героический", [16] = "Эпохальный" })[id] end
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
  function methods:HighlightText() self.highlighted = true end
  function methods:SetFocus() self.focused = true end
  function methods:ClearFocus() self.focused = false end
  function methods:SetScrollChild(child) self.scrollChild = child end
  function methods:SetChecked(value) self.checked = value end
  function methods:GetChecked() return self.checked end
  function methods:SetVerticalScroll(value) self.scroll = value end
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
  function methods:SetUserPlaced(value)
    assert(self.movable or self.resizable, "SetUserPlaced(): Frame is not movable or resizable")
    self.userPlaced = value
  end
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
    "SetTexture", "SetGradient", "SetFromAlpha", "SetToAlpha", "SetDuration", "SetOrder",
    "SetMultiLine", "SetAutoFocus", "SetFontObject", "SetMaxLetters", "SetAllPoints", "SetColorTexture",
    "SetTexCoord", "SetVertexColor" }) do
    methods[name] = function() end
  end
  env.CreateFrame = function(_, name) return frame(name) end
  env.UIParent = frame()
  env.UIParent:SetSize(1920, 1080)
  env.UIParent.centerX, env.UIParent.centerY = 960, 540
  env.SettingsPanel = frame()
  env.SettingsPanel:Hide()
  function env.SettingsPanel:HasUnappliedSettings() return c.unappliedSettings or false end
  function env.SettingsPanel:Close(skipTransitionBackToOpeningPanel)
    eq(skipTransitionBackToOpeningPanel, true)
    assert(not self:HasUnappliedSettings(), "must preserve pending game settings")
    c.settingsClosed = (c.settingsClosed or 0) + 1
    self:Hide()
  end
  env.EditModeManagerFrame = frame()
  env.EditModeManagerFrame:Hide()
  function env.EditModeManagerFrame:IsEditModeActive() return self.editModeActive or false end
  function env.EditModeManagerFrame:CanEnterEditMode() return not c.editModeBlocked end
  env.ShowUIPanel = function(target)
    eq(target, env.EditModeManagerFrame)
    assert(c.hardware and not c.combat, "editor must open from the settings click outside combat")
    assert(not env.SettingsPanel:IsShown(), "close settings before opening the editor")
    c.editorOpens = (c.editorOpens or 0) + 1
    if c.preventEditorShow then return end
    local alreadyActive = target:IsEditModeActive()
    target:Show()
    target.editModeActive = true
    if not alreadyActive then c:editEvent("EditMode.Enter") end
  end
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
  env.GetChannelList = function()
    local ordered, result = {}, {}
    for name, id in pairs(c.channels) do ordered[#ordered + 1] = { id, name } end
    table.sort(ordered, function(a, b) return a[1] < b[1] end)
    for _, item in ipairs(ordered) do
      result[#result + 1] = item[1]
      result[#result + 1] = item[2]
      result[#result + 1] = c.disabledChannels and c.disabledChannels[item[2]] or false
    end
    return unpack(result)
  end
  env.ChatConfigChannelSettings_SwapChannelsByIndex = function()
    error("must not call the Lua chat helper that writes ChatTypeInfo")
  end
  env.JoinTemporaryChannel = function(name)
    assert(not c.restricted, "must never attempt a join during chat lockdown")
    c.joins = c.joins + 1
    if not c.asyncJoin then c.channels[name] = c.joinChannelID end
  end
  env.LeaveChannelByName = function(name) c.channels[name] = nil end
  env.C_ChatInfo = {
    SwapChatChannelsByChannelIndex = function(first, second)
      assert(not c.combat and not c.restricted, "never reorder channels during combat or chat lockdown")
      if c.swapError then error("temporary channel swap failure") end
      c.channelSwaps[#c.channelSwaps + 1] = { first, second }
      if c.swapNoOp then return end
      local firstName, secondName
      for name, id in pairs(c.channels) do
        if id == first then firstName = name elseif id == second then secondName = name end
      end
      eq(firstName, "RaidReminderZombak", "every swap must move only the service channel")
      assert(secondName, "must use the next occupied slot")
      c.channels[firstName], c.channels[secondName] = second, first
      c:dispatch("CHANNEL_UI_UPDATE")
    end,
    RegisterAddonMessagePrefix = function(prefix)
      if c.prefixError then error("temporary prefix failure") end
      assert(#prefix <= 16); return c.registerResult
    end,
    InChatMessagingLockdown = function() return c.restricted or false end,
    AreOutgoingAddonChatMessagesRestricted = function() return c.outgoingRestricted or false end,
    SendAddonMessage = function(prefix, message, distribution, target)
      assert(not c.restricted, "must never send during chat lockdown")
      if c.sendError then error("temporary send failure") end
      assert(#message <= 255)
      c.sent[#c.sent + 1] = { prefix, message, distribution, target, c.now }
      return c.sendResult
    end,
  }
  env.Settings = { VarType = { Boolean = "boolean" } }
  function env.Settings.RegisterVerticalLayoutCategory(name)
    eq(name, "Raid Reminder")
    c.settingsLayout = { initializers = {} }
    function c.settingsLayout:AddInitializer(initializer)
      self.initializers[#self.initializers + 1] = initializer
    end
    return { GetID = function() return 123 end }, c.settingsLayout
  end
  env.CreateSettingsButtonInitializer = function(name, text, callback, tooltip, addSearchTags)
    assert(#name > 0 and #tooltip > 0); eq(addSearchTags, true)
    c.editPositionButton = { text = text, callback = callback }
    return c.editPositionButton
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
  function env.Settings.OpenToCategory(id) c.openedSettings = id; env.SettingsPanel:Show() end

  local activity = { fullName = "Шпиль Бездны", categoryID = 3, difficultyID = 15, maxNumPlayers = 30 }
  c.activities = {
    [101] = activity, [102] = activity, [201] = { categoryID = 2, fullName = "Dungeon" },
    [301] = { fullName = "Другой рейд", categoryID = 3, difficultyID = 16, maxNumPlayers = 20 },
  }
  c.languageFilter = { enUS = true }
  env.C_LFGList = {
    GetActiveEntryInfo = function()
      assert(not c.restricted, "must never read a restricted listing")
      if c.listingError then error("temporary listing failure") end
      return c.entry
    end,
    HasActiveEntryInfo = function() return c.entryExists or c.entry ~= nil end,
    GetActivityInfoTable = function(id)
      if c.activityError then error("temporary metadata failure") end
      return c.activities[id]
    end,
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
  function c:clickEditPosition()
    self.hardware = true
    self.editPositionButton.callback()
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
  function c:deliverTo(recipient, index)
    local wire = assert(self.sent[index or #self.sent])
    local channelID = assert(recipient.channels.RaidReminderZombak, "recipient must join before delivery")
    recipient:dispatch("CHAT_MSG_ADDON", wire[1], wire[2], "CHANNEL", self.player .. "-" .. self.realm,
      "", 0, channelID, "RaidReminderZombak", 0)
  end
  function c:sentCount(command)
    local count = 0
    for _, packet in ipairs(self.sent) do
      if packet[2]:match("^([^\t]+)") == command then count = count + 1 end
    end
    return count
  end
  function c:timerCount()
    local count = 0
    for _, timer in ipairs(self.timers) do if not timer.cancelled then count = count + 1 end end
    return count
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

test("Zombak broadcasts independently of opt-in with one series per listing", function()
  local c = newClient({ player = "Зомбак" })
  eq(c.rr.Options.IsZombakEnabled(), false); eq(c.joins, 1)
  c.entry = { activityIDs = { 101, 102 } }
  c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#c.sent, 1); eq(c.sent[1][3], "CHANNEL"); eq(c.sent[1][4], "7")
  assert(c.sent[1][2]:find("101,102", 1, true))
  c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  eq(#c.sent, 1)
  c.entry = nil; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE")
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#c.sent, 2)
  c:enable(false); eq(c.channels.RaidReminderZombak, 7)
end)

test("A mythic listing sends three identical packets at 0, 5 and 15 seconds with one popup", function()
  local leader, recipient = newClient({ player = "Зомбак" }), newClient()
  leader.inGroup, leader.isLeader = true, true
  recipient:enable(true)
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#leader.sent, 1); leader:deliverTo(recipient)
  local announcement = recipient.state.announcement
  eq(announcement.activity.difficultyID, 16); assert(recipient:popup():IsShown())
  assert(recipient:popup().activity.text:find("Эпохальный", 1, true))
  leader:advance(4); recipient:advance(4)
  leader:dispatch("CHANNEL_UI_UPDATE"); leader:enable(true); leader:enable(false)
  eq(#leader.sent, 1)
  leader:advance(1); recipient:advance(1); eq(#leader.sent, 2); leader:deliverTo(recipient)
  leader:advance(9); recipient:advance(9); leader:dispatch("CHANNEL_UI_UPDATE"); eq(#leader.sent, 2)
  leader:advance(1); recipient:advance(1); eq(#leader.sent, 3); leader:deliverTo(recipient)
  for index, time in ipairs({ 100, 105, 115 }) do
    eq(leader.sent[index][5], time); eq(leader.sent[index][2], leader.sent[1][2])
  end
  eq(recipient.state.announcement, announcement); eq(recipient.sounds, 1)
  eq(#recipient.searches, 0); eq(#recipient.applications, 0)
  recipient:advance(75); assert(not recipient:popup():IsShown(), "repeats must not reset the 90 second timeout")
  leader.env.SlashCmdList.RAIDREMINDER("zombakstatus")
  assert(table.concat(leader.messages, "\n"):find("accepted=3/3", 1, true))
  leader:advance(120); leader:dispatch("CHANNEL_UI_UPDATE")
  eq(leader:sentCount("ZOMBAK_RAID_CREATED"), 3); eq(leader:sentCount("ZOMBAK_RAID_ACTIVE"), 4)
  eq(leader:timerCount(), 1)
end)

test("A repeat reaches late subscribers or receivers leaving lockdown without reopening dismissed UI", function()
  for _, missed in ipairs({ "late subscription", "lockdown" }) do
    local leader, recipient = newClient({ player = "Зомбак" }), newClient()
    leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
    if missed == "lockdown" then
      recipient:enable(true); recipient.restricted = true; leader:deliverTo(recipient)
    end
    eq(recipient.state.announcement, nil); eq(recipient:popup(), nil)
    recipient.restricted = false; recipient:enable(true)
    leader:advance(5); recipient:advance(5); leader:deliverTo(recipient)
    eq(recipient.state.phase, "ready"); eq(recipient.sounds, 1)
    recipient.rr.ZombakRaids.Clear()
    leader:advance(10); recipient:advance(10); leader:deliverTo(recipient)
    eq(recipient.state.announcement, nil); assert(not recipient:popup():IsShown()); eq(recipient.sounds, 1)
  end
end)

test("Repeated packets preserve an active search and an already submitted application", function()
  local leader, recipient = newClient({ player = "Зомбак" }), newClient()
  recipient:enable(true)
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader:deliverTo(recipient); recipient:click(); eq(recipient.state.phase, "searching")
  leader:advance(5); recipient:advance(5); leader:deliverTo(recipient)
  eq(recipient.state.phase, "searching"); eq(recipient.state.pendingSearch, true); eq(#recipient.searches, 1)
  recipient.results[42] = { leaderName = "Зомбак-рф", activityIDs = { 301 }, numMembers = 17, partyGUID = "mythic" }
  recipient.resultIDs = { 42 }; recipient:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
  eq(recipient:popup().members.text, "17 / 20")
  recipient:click(); eq(#recipient.applications, 1)
  recipient.appStatus[42] = { "applied" }
  recipient:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, "applied", "none")
  leader:advance(10); recipient:advance(10); leader:deliverTo(recipient)
  eq(recipient.state.phase, "applied"); eq(recipient.state.currentZombakResultID, 42)
  eq(#recipient.searches, 1); eq(#recipient.applications, 1); eq(recipient.sounds, 1)
end)

test("Announcements stop while the listing is removed, private, secret or no longer led by Zombak", function()
  for _, invalidate in ipairs({
    function(c) c.entry = nil; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE") end,
    function(c) c.entry = nil end,
    function(c) c.entry.privateGroup = true end,
    function(c) c.secret = {}; c.entry.privateGroup = c.secret end,
    function(c) c.isLeader = false end,
    function(c) c.player = "Другой" end,
  }) do
    local leader = newClient({ player = "Зомбак" })
    leader.inGroup, leader.isLeader = true, true
    leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
    eq(#leader.sent, 1); invalidate(leader); leader:advance(60)
    eq(#leader.sent, 1)
    eq(leader:timerCount(), 1, "one reconciliation timer remains, without stale sends")
  end
end)

test("Delayed first sends also revalidate the listing before delivery", function()
  local leader = newClient({ player = "Зомбак" }); leader.channels = {}; leader.asyncJoin = true
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#leader.sent, 0)
  leader.entry.privateGroup = true; leader.channels.RaidReminderZombak = 7
  leader:dispatch("CHANNEL_UI_UPDATE"); leader:advance(60); eq(#leader.sent, 0)
end)

test("Activity order changes do not cancel repeats of the same listing", function()
  local leader = newClient({ player = "Зомбак" })
  leader.entry = { activityIDs = { 301, 101 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader.entry.activityIDs = { 101, 301 }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  leader:advance(60); eq(leader:sentCount("ZOMBAK_RAID_CREATED"), 3)
  eq(leader.sent[2][2], leader.sent[1][2]); eq(leader.sent[3][2], leader.sent[1][2])
end)

test("Recreating a listing replaces old repeats and keeps the new series timing", function()
  local leader = newClient({ player = "Зомбак" })
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader:advance(2); leader.entry = nil; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE")
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#leader.sent, 2); assert(leader.sent[2][2] ~= leader.sent[1][2], "new listing needs a new nonce")
  leader:advance(3); eq(#leader.sent, 2)
  leader:advance(2); eq(#leader.sent, 3); eq(leader.sent[3][5], 107)
  leader:advance(10); eq(#leader.sent, 4); eq(leader.sent[4][5], 117)
  eq(leader.sent[3][2], leader.sent[2][2]); eq(leader.sent[4][2], leader.sent[2][2])
  leader:advance(60); eq(leader:sentCount("ZOMBAK_RAID_CREATED"), 4)
end)

test("Sender lockdown pauses repeats within the original 30 second window", function()
  local leader = newClient({ player = "Зомбак" })
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader.restricted = true; leader:advance(10); eq(#leader.sent, 1)
  leader.restricted = false; leader:dispatch("CHANNEL_UI_UPDATE"); eq(#leader.sent, 2)
  leader:advance(10); eq(#leader.sent, 3)
  eq(leader.sent[2][5], 110); eq(leader.sent[3][5], 120)
  local expired = newClient({ player = "Зомбак" })
  expired.entry = { activityIDs = { 301 } }; expired:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  expired.restricted = true; expired:advance(40); expired.restricted = false
  expired:dispatch("CHANNEL_UI_UPDATE"); expired:advance(60)
  eq(expired:sentCount("ZOMBAK_RAID_CREATED"), 1)
  assert(expired:sentCount("ZOMBAK_RAID_ACTIVE") >= 1, "long lockdown recovers with a fresh snapshot")
end)

test("Channel events cannot accelerate throttled retries or renew the broadcast window", function()
  local leader = newClient({ player = "Зомбак" }); leader.sendResult = 8
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  for _ = 1, 10 do leader:dispatch("CHANNEL_UI_UPDATE") end
  eq(#leader.sent, 1); leader:advance(5); eq(#leader.sent, 2)
  leader.sendResult = 0; leader:advance(5); eq(#leader.sent, 3)
  for _ = 1, 10 do leader:dispatch("CHANNEL_UI_UPDATE") end
  eq(#leader.sent, 3); leader:advance(5); eq(#leader.sent, 4)
  leader:advance(10); eq(#leader.sent, 5); leader:advance(60); eq(leader:sentCount("ZOMBAK_RAID_CREATED"), 5)
  for index, time in ipairs({ 100, 105, 110, 115, 125 }) do eq(leader.sent[index][5], time) end
  local expired = newClient({ player = "Зомбак" }); expired.sendResult = 8
  expired.entry = { activityIDs = { 301 } }; expired:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  expired:advance(24); expired.sendResult = 0; expired:advance(1)
  eq(#expired.sent, 6); expired:advance(60); eq(expired:sentCount("ZOMBAK_RAID_CREATED"), 6)
end)

test("An explicit API lockdown refusal stops the burst and recovers via slower snapshots", function()
  local leader = newClient({ player = "Зомбак" })
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader.sendResult = 11; leader:advance(5); eq(#leader.sent, 2)
  leader.sendResult = 0; leader:dispatch("CHANNEL_UI_UPDATE"); eq(#leader.sent, 2)
  leader:advance(24); eq(#leader.sent, 2); leader:advance(1); eq(#leader.sent, 3)
  eq(leader:sentCount("ZOMBAK_RAID_CREATED"), 2); eq(leader:sentCount("ZOMBAK_RAID_ACTIVE"), 1)
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
  eq(c:popup(), nil); assert(c.rr.ZombakRaids.HasPendingNotifications()); eq(#c.searches, 0)
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
  eq(#c.sent, 1); eq(c.sent[1][4], "12")
  c.channels.RaidReminderZombak = 13; c:dispatch("CHANNEL_UI_UPDATE"); eq(#c.sent, 1)
  c:advance(10); eq(#c.sent, 2); eq(c.sent[2][4], "13")
  c:advance(5); eq(#c.sent, 3); eq(c.sent[3][4], "13")
  c:advance(60); eq(c:sentCount("ZOMBAK_RAID_CREATED"), 3)
  c = newClient({ player = "Зомбак" }); c.channels = {}; c.asyncJoin = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c.entry = nil; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE"); c.channels.RaidReminderZombak = 7
  c:advance(40); eq(#c.sent, 0)
  c = newClient(); c.asyncJoin = true; c:enable(true); c:advance(60); eq(c.joins, 4)
  c = newClient(); c.channels.RaidReminderZombak = 7; c:enable(true); c:enable(false)
  eq(c.channels.RaidReminderZombak, 7, "preserve a channel the addon did not join")
end)

test("Prefix registration distinguishes numeric success from failure", function()
  local c = newClient(); c.rr.Env.addonMessagePrefixRegistered = false; c.registerResult = 3
  c.rr.Comm.RegisterAddonMessages(); eq(c.rr.Env.addonMessagePrefixRegistered, false)
  c.registerResult = 1; c.rr.Comm.RegisterAddonMessages(); eq(c.rr.Env.addonMessagePrefixRegistered, true)
end)

test("Channel recovery does not consume join attempts under lockdown and has bounded send frequency", function()
  local c = newClient(); c.restricted = true; c:enable(true); c:advance(60)
  eq(c.joins, 0)
  eq(c:timerCount(), 1)
  c.restricted = false; c:advance(5); eq(c.joins, 1)
  c:enable(false); eq(c:timerCount(), 0)
  c = newClient({ player = "Зомбак" }); c.sendResult = 8
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); c:advance(60)
  assert(#c.sent <= 12); eq(c:sentCount("ZOMBAK_RAID_CREATED"), 6)
  eq(c:timerCount(), 1)
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

test("Actual Blizzard lockdown blocks sending and explicit API refusal waits for a fresh snapshot", function()
  local c = newClient({ player = "Зомбак" }); c.outgoingRestricted = true; c.restricted = true
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  eq(#c.sent, 0)
  c = newClient({ player = "Зомбак" }); c.outgoingRestricted = true; c.sendResult = 11
  c.entry = { activityIDs = { 101 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c:advance(40); c.env.SlashCmdList.RAIDREMINDER("zombakstatus")
  eq(#c.sent, 2); eq(c.sent[2][5] - c.sent[1][5], 30)
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

test("Settings button opens the native editor and preview without enabling notifications", function()
  local c = newClient()
  eq(c.editPositionButton.text, "Редактировать положение")
  eq(c.settingsLayout.initializers[1], c.editPositionButton)
  c.env.SlashCmdList.RAIDREMINDER("settings"); c:clickEditPosition()
  eq(c.settingsClosed, 1); eq(c.editorOpens, 1)
  assert(c.env.EditModeManagerFrame:IsShown() and c:popup():IsShown())
  assert(c.env.RaidReminderZombakBannerSelection:IsShown())
  eq(c:popup().action.enabled, false); eq(c.rr.DB.autoSearchZombakRaids, false)
  eq(c.state.announcement, nil); eq(c.joins, 0)
  c:advance(120); assert(c:popup():IsShown())
  c:editEvent("EditMode.Exit"); assert(not c:popup():IsShown())
  eq(#c.searches, 0); eq(#c.applications, 0); eq(#c.sent, 0)
end)

test("First preview after login can close and reopen without a prior real or test notification", function()
  local c = newClient()
  eq(c:popup(), nil)
  for _ = 1, 3 do
    c.env.SlashCmdList.RAIDREMINDER("settings"); c:clickEditPosition()
    assert(c:popup():IsShown())
    assert(c.env.RaidReminderZombakBannerSelection:IsShown())
    c:editEvent("EditMode.Exit")
    c.env.EditModeManagerFrame.editModeActive = false
    c.env.EditModeManagerFrame:Hide()
    assert(not c:popup():IsShown())
    assert(not c.env.RaidReminderZombakBannerSelection:IsShown())
  end
  eq(c.state.announcement, nil); eq(#c.searches, 0); eq(#c.applications, 0)
end)

test("Settings entry preserves a live raid and restores preview when resuming an active editor", function()
  local c = newClient(); c:found()
  c.env.SlashCmdList.RAIDREMINDER("settings"); c:clickEditPosition()
  eq(c.state.currentZombakResultID, 42); c:click(); eq(#c.applications, 0)
  c:editEvent("EditMode.Exit")
  eq(c:popup().action.enabled, true); eq(c.state.currentZombakResultID, 42)
  -- Native edit mode may remain active while its window is temporarily hidden by Settings.
  c.env.EditModeManagerFrame:Hide()
  c.env.SlashCmdList.RAIDREMINDER("settings"); c:clickEditPosition()
  assert(c.env.RaidReminderZombakBannerSelection:IsShown()); eq(c:popup().action.enabled, false)
  c:editEvent("EditMode.Exit"); eq(c:popup().action.enabled, true)
  eq(#c.searches, 1); eq(#c.applications, 0)
end)

test("Unavailable native editing keeps settings intact and never leaves a stranded preview", function()
  for _, condition in ipairs({ "combat", "editModeBlocked", "missingEditor", "preventEditorShow" }) do
    local c = newClient(); c.env.SlashCmdList.RAIDREMINDER("settings")
    if condition == "missingEditor" then c.env.EditModeManagerFrame = nil else c[condition] = true end
    c:clickEditPosition()
    eq(c:popup(), nil); eq(#c.searches, 0); eq(#c.applications, 0)
    if condition ~= "preventEditorShow" then
      assert(c.env.SettingsPanel:IsShown()); eq(c.settingsClosed, nil); eq(c.editorOpens, nil)
    end
    assert(#c.messages > 1, "explain why editing is unavailable")
  end
end)

test("Settings button preserves unapplied game changes and works after the user resolves them", function()
  local c = newClient(); c.env.SlashCmdList.RAIDREMINDER("settings")
  c.unappliedSettings = true; c:clickEditPosition()
  assert(c.env.SettingsPanel:IsShown()); eq(c.settingsClosed, nil); eq(c.editorOpens, nil); eq(c:popup(), nil)
  assert(c.messages[#c.messages]:find("Примените или отмените", 1, true))
  c.unappliedSettings = false; c:clickEditPosition()
  eq(c.settingsClosed, 1); assert(c:popup():IsShown())
end)

test("Creation during a long chat lockdown is reconciled without another LFG event", function()
  local c = newClient({ player = "Зомбак", restricted = true })
  c.entry = { activityIDs = { 301 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c:advance(240); eq(#c.sent, 0); eq(c.joins, 0)
  c.restricted = false; c:advance(5)
  eq(c.joins, 1); eq(#c.sent, 1); assert(c.sent[1][2]:find("301", 1, true))
end)

test("A missed delisting during lockdown cannot suppress a new listing with identical activities", function()
  local c = newClient({ player = "Зомбак" })
  c.entry = { activityIDs = { 301 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  local old = c.sent[1][2]
  c.restricted = true; c.entry = nil; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE")
  c.entry = { activityIDs = { 301 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c:advance(60); eq(#c.sent, 1)
  c.restricted = false; c:dispatch("PLAYER_REGEN_ENABLED")
  eq(#c.sent, 2); assert(c.sent[2][2] ~= old)
end)

test("Unavailable entry, IDs and metadata at creation recover as the API data arrives", function()
  for _, missing in ipairs({ "entry", "ids", "metadata" }) do
    local c = newClient({ player = "Зомбак" })
    local activity = c.activities[301]
    c.entry = missing ~= "entry" and { activityIDs = { 301 } } or nil
    c.entryExists = true
    if missing == "ids" then c.entry.activityIDs = nil end
    if missing == "metadata" then c.activities[301] = nil end
    c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); c:advance(40); eq(#c.sent, 0)
    c.entry = { activityIDs = { 301 } }; c.activities[301] = activity
    c:advance(5); eq(#c.sent, 1)
  end
end)

test("Transiently missing active entry data preserves listing identity instead of cancelling it", function()
  local c = newClient({ player = "Зомбак" })
  c.entry = { activityIDs = { 301 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  c.entry = nil; c.entryExists = true; c:advance(10); eq(#c.sent, 1)
  c.entry = { activityIDs = { 301 } }; c:advance(5)
  eq(#c.sent, 2); eq(c.sent[2][2], c.sent[1][2])
end)

test("A listing already active at login is announced, and reload preserves its identity", function()
  local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  eq(#c.sent, 1); c:advance(10)
  local reloaded = newClient({ player = "Зомбак", now = c.now, db = c.rr.DB, entry = c.entry })
  eq(#reloaded.sent, 1); eq(reloaded.sent[1][2], c.sent[1][2])
  c:advance(240)
  reloaded = newClient({ player = "Зомбак", now = c.now, db = c.rr.DB, entry = c.entry })
  eq(reloaded:sentCount("ZOMBAK_RAID_ACTIVE"), 1)
  local receiver = newClient({ now = c.now }); receiver:enable(true)
  reloaded:deliverTo(receiver); eq(receiver.state.phase, "ready")
end)

test("Changing heroic to mythic emits a new notice and rejects older same-second packets", function()
  local leader, recipient = newClient({ player = "Зомбак" }), newClient()
  recipient:enable(true)
  leader.entry = { activityIDs = { 101 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader.entry.activityIDs = { 301 }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  eq(#leader.sent, 2); leader:deliverTo(recipient, 2)
  local notice = recipient.state.announcement
  eq(notice.activity.difficultyID, 16)
  leader:deliverTo(recipient, 1); eq(recipient.state.announcement, notice); eq(recipient.sounds, 1)
  local reloaded = newClient({ db = recipient.rr.DB })
  leader:deliverTo(reloaded, 1); eq(reloaded.state.announcement, nil)
end)

test("Private-to-public and assistant-to-leader transitions are detected without a creation event", function()
  for _, reason in ipairs({ "private", "assistant" }) do
    local c = newClient({ player = "Зомбак", inGroup = true, isLeader = reason ~= "assistant" })
    c.entry = { activityIDs = { 301 }, privateGroup = reason == "private" }
    c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); eq(#c.sent, 0)
    c.entry.privateGroup = false; c.isLeader = true
    c:advance(5); eq(#c.sent, 1)
  end
end)

test("Long-delayed subscriptions receive fresh active snapshots without a message storm", function()
  local leader = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  leader:advance(240)
  local recipient = newClient({ now = leader.now }); recipient:enable(true)
  leader:deliverTo(recipient); eq(recipient.state.phase, "ready"); eq(recipient.sounds, 1)
  recipient.rr.ZombakRaids.Clear()
  for _ = 1, 12 do
    leader:advance(30); recipient:advance(30); leader:deliverTo(recipient)
    eq(recipient.state.announcement, nil); eq(recipient.sounds, 1)
  end
  eq(leader:sentCount("ZOMBAK_RAID_CREATED"), 3)
  eq(leader:sentCount("ZOMBAK_RAID_ACTIVE"), 20)
  eq(#recipient.sent, 0); eq(#recipient.searches, 0); eq(#recipient.applications, 0)
end)

test("A receiver leaving a long chat lockdown receives a later snapshot", function()
  local leader, recipient = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } }), newClient()
  recipient:enable(true); recipient.restricted = true
  leader:deliverTo(recipient); eq(recipient.state.announcement, nil)
  leader:advance(240); recipient:advance(240); leader:deliverTo(recipient)
  eq(recipient.state.announcement, nil)
  recipient.restricted = false; recipient:dispatch("PLAYER_REGEN_ENABLED")
  leader:advance(30); recipient:advance(30); leader:deliverTo(recipient)
  eq(recipient.state.phase, "ready"); eq(recipient.sounds, 1)
end)

test("Channel joins recover beyond five failures with capped exponential backoff", function()
  local c = newClient(); c.asyncJoin = true; c:enable(true)
  c:advance(400); assert(c.joins > 5 and c.joins <= 11); eq(#c.sent, 0)
  c.asyncJoin = false; c:advance(60); eq(c.channels.RaidReminderZombak, 7)
  c:enable(false); eq(c:timerCount(), 0)
  local joins = c.joins; c:advance(300); eq(c.joins, joins)
end)

test("Silent channel loss and transient prefix-registration failures recover automatically", function()
  local c = newClient({ registerResult = 3, db = { autoSearchZombakRaids = true } })
  eq(c.rr.Env.addonMessagePrefixRegistered, false)
  c.registerResult = 0; c:advance(5); eq(c.rr.Env.addonMessagePrefixRegistered, true)
  local registered = false
  c.env.C_ChatInfo.IsAddonMessagePrefixRegistered = function() return registered end
  c.env.C_ChatInfo.RegisterAddonMessagePrefix = function() registered = true; return 0 end
  c:advance(5); assert(registered, "restore a prefix removed externally")
  c.channels = {}; local joins = c.joins
  c:advance(5); eq(c.joins, joins + 1); eq(c.channels.RaidReminderZombak, 7)
end)

test("Unavailable receiver metadata is retried locally without requiring another packet", function()
  for _, failure in ipairs({ "missing", "exception" }) do
    local c = newClient(); c:enable(true)
    local activity = c.activities[301]
    if failure == "missing" then c.activities[301] = nil else c.activityError = true end
    c:message({ ids = "301" }); eq(c.state.announcement, nil); assert(c.rr.ZombakRaids.HasPendingNotifications())
    c.activities[301] = activity; c.activityError = false; c:advance(5)
    eq(c.state.phase, "ready"); eq(c.state.announcement.activity.difficultyID, 16); eq(c.sounds, 1)
  end
end)

test("Hidden UI, combat and editing defer the first popup and preserve its full visible lifetime", function()
  for _, hidden in ipairs({ "combat", "parent", "editor" }) do
    local c = newClient(); c:enable(true)
    if hidden == "combat" then c.combat = true
    elseif hidden == "parent" then c.env.UIParent:Hide()
    else c:editEvent("EditMode.Enter") end
    c:message(); c:advance(120); eq(c.state.announcement, nil); eq(c.sounds, nil)
    assert(c.rr.ZombakRaids.HasPendingNotifications())
    c.combat = false; c.env.UIParent:Show()
    if hidden == "editor" then c:editEvent("EditMode.Exit") else c:dispatch("PLAYER_REGEN_ENABLED") end
    eq(c.state.phase, "ready"); eq(c.sounds, 1)
    c:advance(89); assert(c:popup():IsShown()); c:advance(1); assert(not c:popup():IsShown())
  end
end)

test("Fresh snapshots keep an unseen notice recoverable through a long encounter", function()
  local leader, recipient = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } }), newClient()
  recipient:enable(true); recipient.combat = true
  for _ = 1, 10 do
    leader:advance(30); recipient:advance(30); leader:deliverTo(recipient)
  end
  eq(recipient.state.announcement, nil); eq(recipient.sounds, nil)
  recipient.combat = false; recipient:dispatch("PLAYER_REGEN_ENABLED")
  eq(recipient.state.phase, "ready"); eq(recipient.sounds, 1)
  eq(#recipient.searches, 0); eq(#recipient.applications, 0)
end)

test("Expired deferred notifications disappear and disabling clears the queue", function()
  local c = newClient(); c:enable(true); c.combat = true; c:message(); c:advance(190)
  c.combat = false; c:dispatch("PLAYER_REGEN_ENABLED"); eq(c:popup(), nil)
  eq(c.rr.ZombakRaids.HasPendingNotifications(), false)
  c.combat = true; c:message({ nonce = "another" }); c:enable(false)
  eq(c.rr.ZombakRaids.HasPendingNotifications(), false); eq(c:timerCount(), 0)
  c.combat = false; c:enable(true); c:advance(10); eq(c:popup(), nil)
end)

test("Popup construction errors do not mark notices as seen or poison later construction", function()
  local c = newClient(); c:enable(true)
  local createColor = c.env.CreateColor
  c.env.CreateColor = function() error("temporary UI failure") end
  c:message(); eq(c.state.announcement, nil); eq(next(c.state.seen), nil)
  assert(c.rr.ZombakRaids.HasPendingNotifications())
  c.env.CreateColor = createColor; c:advance(5)
  eq(c.state.phase, "ready"); assert(c:popup():IsShown()); eq(c.sounds, 1)
end)

test("Dismissed notices remain deduplicated across reload and are separate for different recipients", function()
  local c = newClient(); c:enable(true); c:message(); c.rr.ZombakRaids.Clear()
  local reloaded = newClient({ db = c.rr.DB }); reloaded:message()
  eq(reloaded:popup(), nil); eq(reloaded.sounds, nil)
  local alt = newClient({ player = "Другойперсонаж", db = c.rr.DB }); alt:message()
  eq(alt.state.phase, "ready"); eq(alt.sounds, 1)
end)

test("Fresh snapshots authenticate the sender, creation time, freshness and wire shape", function()
  local c = newClient(); c:enable(true)
  local function snapshot(fields)
    c:dispatch("CHAT_MSG_ADDON", "RaidReminder", c.rr.Env.BuildAddonMessage(unpack(fields)),
      "CHANNEL", "Зомбак-РевущийФьорд", "", 0, 7, "RaidReminderZombak", 0)
  end
  local now = c.env.GetServerTime()
  for _, fields in ipairs({
    { "ZOMBAK_RAID_ACTIVE", "1", "Другой-рф", "301", now, "one", now },
    { "ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "301", now, "one" },
    { "ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "301", now - 300, "one", now - 181 },
    { "ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "301", now, "one", now + 16 },
    { "ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "301", now, "one", now - 1 },
    { "ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "301", now, "one", "not-a-timestamp" },
  }) do snapshot(fields); eq(c.state.announcement, nil); eq(c.rr.ZombakRaids.HasPendingNotifications(), false) end
  snapshot({ "ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "301", now - 300, "one", now })
  eq(c.state.phase, "ready")
end)

test("Temporary listing, send and join exceptions cannot strand the recovery timer", function()
  local startup = newClient({ player = "Зомбак", prefixError = true, entry = { activityIDs = { 301 } } })
  eq(#startup.sent, 0); eq(startup:timerCount(), 1)
  startup.prefixError = false; startup:advance(5); eq(#startup.sent, 1)
  for _, failure in ipairs({ "listing", "send", "join" }) do
    local c = newClient({ player = "Зомбак" })
    local join = c.env.JoinTemporaryChannel
    if failure == "listing" then c.listingError = true
    elseif failure == "send" then c.sendError = true
    else c.channels = {}; c.env.JoinTemporaryChannel = function() error("temporary join failure") end end
    c.entry = { activityIDs = { 301 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
    eq(#c.sent, 0); eq(c:timerCount(), 1)
    c.listingError, c.sendError = false, false; c.env.JoinTemporaryChannel = join
    c:advance(10); assert(#c.sent >= 1); eq(c:timerCount(), 1)
  end
end)

test("Repeated lifecycle events do not multiply timers, join attempts or announcement bursts", function()
  local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  for _ = 1, 50 do
    c:dispatch("PLAYER_ENTERING_WORLD"); c:dispatch("CHANNEL_UI_UPDATE")
    c:dispatch("GROUP_ROSTER_UPDATE"); c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  end
  eq(#c.sent, 1); eq(c:timerCount(), 1)
  c:advance(360); eq(c:sentCount("ZOMBAK_RAID_CREATED"), 3)
  eq(c:sentCount("ZOMBAK_RAID_ACTIVE"), 12); eq(c:timerCount(), 1)
  c.entry = nil; c:advance(120); eq(#c.sent, 15)
end)

test("Bad saved recovery data is discarded instead of suppressing live notices", function()
  local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } }, db = {
    zombakBroadcastSerial = "bad",
    zombakBroadcasts = { ["зомбак-рф"] = { fingerprint = "301", timestamp = 1800000100.5,
      lastSeen = 1800000100, nonce = "bad-cache" } },
    zombakSeenByCharacter = { ["зомбак-рф"] = { bad = "bad", future = 9999999999 } },
    zombakLatestByCharacter = { ["зомбак-рф"] = { ["зомбак-рф"] = { timestamp = "bad" } } },
  } })
  eq(#c.sent, 1); assert(not c.sent[1][2]:find("bad-cache", 1, true)); eq(next(c.state.seen), nil)
end)

test("Different leaders cannot overwrite a queued notice before it can be read", function()
  local c = newClient(); c:enable(true); c.combat = true
  c:message(); c:message({ leader = "Зомбакк-рф", sender = "Зомбакк-РевущийФьорд", nonce = "other" })
  c.combat = false; c:dispatch("PLAYER_REGEN_ENABLED")
  eq(c.sounds, 1); local first = c.state.announcement.leader
  c.rr.ZombakRaids.Clear(); c:advance(5)
  eq(c.sounds, 2); assert(c.state.announcement.leader ~= first)
end)

local function records(c, event)
  local result = {}
  for _, line in ipairs(c.rr.DB.zombakDiagnostics.entries) do
    if line:find(" " .. event .. " ", 1, true) then result[#result + 1] = line end
  end
  return result
end

local function includes(text, part)
  assert(text and text:find(part, 1, true), "missing " .. part .. " in " .. tostring(text))
end

test("Diagnostic reports correlate sender and receiver without adding network traffic", function()
  local leader = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  local recipient = newClient(); recipient:enable(true)
  leader:advance(5); recipient:advance(5); leader:deliverTo(recipient)
  local nonce = recipient.state.announcement.nonce
  includes(records(leader, "LISTING_DETECTED")[1], "difficulty=16")
  includes(records(leader, "TX")[2], "nonce=" .. nonce)
  includes(records(recipient, "RX_PACKET")[1], "nonce=" .. nonce)
  includes(records(recipient, "RX_PACKET")[1], "listingAge=5")
  includes(records(recipient, "POPUP_SHOWN")[1], "queuedFor=0")
  includes(records(recipient, "SESSION")[1], "version=0.2.10")
  includes(records(recipient, "POPUP_SHOWN")[1], "Z")
  eq(#leader.sent, 2); eq(#recipient.sent, 0); eq(#recipient.searches, 0)
  eq(recipient.rr.State.debugZombak, false)
  includes(recipient.rr.Diagnostics.BuildReport(), "diagnosticErrors=0")
end)

test("Retransmissions do not erase first arrival or hide a long local popup delay", function()
  local leader = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  local recipient = newClient(); recipient:enable(true); recipient.combat = true
  leader:deliverTo(recipient)
  for _ = 1, 10 do
    leader:advance(30); recipient:advance(30); leader:deliverTo(recipient)
  end
  eq(#records(recipient, "POPUP_WAIT"), 1)
  includes(records(recipient, "POPUP_WAIT")[1], "reason=combat")
  recipient.combat = false; recipient:dispatch("PLAYER_REGEN_ENABLED")
  includes(records(recipient, "POPUP_SHOWN")[1], "firstReceivedAt=1800000100")
  includes(records(recipient, "POPUP_SHOWN")[1], "queuedFor=300")
  eq(#records(recipient, "RX_QUEUED"), 1); eq(recipient.sounds, 1)
end)

test("Recovery report separates listing age from snapshot age and local delay", function()
  local leader = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  leader:advance(240)
  local recipient = newClient({ now = leader.now + 2 }); recipient:enable(true)
  leader:deliverTo(recipient)
  local packet = records(recipient, "RX_PACKET")[1]
  includes(packet, "kind=ACTIVE"); includes(packet, "listingAge=242"); includes(packet, "snapshotAge=2")
  includes(records(recipient, "POPUP_SHOWN")[1], "queuedFor=0")
end)

test("Diagnostics name UI and metadata blockers and suppress unchanged wait spam", function()
  local c = newClient(); c:enable(true); c.env.UIParent:Hide(); c:message()
  includes(records(c, "POPUP_WAIT")[1], "reason=UIParent_hidden")
  c:advance(15); eq(#records(c, "POPUP_WAIT"), 1)
  c.env.UIParent:Show(); c:editEvent("EditMode.Enter"); c:advance(5)
  includes(records(c, "POPUP_WAIT")[2], "reason=banner_editor")
  c.activities[101] = nil; c:editEvent("EditMode.Exit")
  includes(records(c, "POPUP_WAIT")[3], "reason=activity_metadata_unavailable")
  c.activityError = true; c:advance(5)
  includes(records(c, "POPUP_WAIT")[4], "reason=activity_metadata_error")
  c.activityError = false; c.activities[101] = c.activities[301]; c:advance(5)
  eq(c.state.phase, "ready"); eq(#records(c, "POPUP_SHOWN"), 1)
end)

test("Reports retain exact rejection and popup expiry or dismissal reasons", function()
  local c = newClient(); c:enable(true)
  c:message({ nonce = "wrong-channel", channelID = 99, channelName = "Elsewhere" })
  includes(records(c, "RX_IGNORED")[1], "reason=unexpected channel")
  c:message({ nonce = "shown" }); c:message({ nonce = "shown" })
  includes(records(c, "RX_IGNORED")[2], "reason=duplicate listing")
  c:popup().dismiss.scripts.OnClick()
  includes(records(c, "POPUP_CLOSED")[1], "reason=dismiss_button")
  c:message({ nonce = "timeout" }); c:advance(90)
  includes(records(c, "POPUP_CLOSED")[2], "reason=timeout")
  c.combat = true; c:message({ nonce = "expired" }); c:advance(185)
  includes(records(c, "RX_DROPPED")[1], "reason=queue_expired")
end)

test("Reports explain missing channel, prefix refusal and send throttling", function()
  local c = newClient({ player = "Зомбак", registerResult = 3 })
  c.channels = {}; c.asyncJoin = true
  c.entry = { activityIDs = { 301 } }; c:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  includes(records(c, "PREFIX")[1], "MaxPrefixes")
  includes(records(c, "SEND_STATE")[1], "waiting for channel")
  includes(records(c, "HEALTH")[#records(c, "HEALTH")], "channel=0")
  c:advance(5); assert(#records(c, "CHANNEL_JOIN") >= 2)
  c.channels.RaidReminderZombak = 7; c.registerResult = 0; c.sendResult = 8
  c:advance(5)
  includes(records(c, "TX")[1], "result=ChannelThrottle (8)")
  c.sendResult = 0; c:advance(5)
  includes(records(c, "TX")[2], "result=Success (0)")
end)

test("Channel notices log only the addon channel and do not expose secret or player data", function()
  local c = newClient(); local count = #c.rr.DB.zombakDiagnostics.entries
  c:dispatch("CHAT_MSG_CHANNEL_NOTICE", "YOU_LEFT", "private-player", "", "General", "", "", 0, 1, "General")
  eq(#c.rr.DB.zombakDiagnostics.entries, count)
  c:dispatch("CHAT_MSG_CHANNEL_NOTICE", "WRONG_PASSWORD", "private-player", "", "1. raidreminderzombak", "", "", 0, 1, "raidreminderzombak")
  includes(records(c, "CHANNEL_NOTICE")[1], "notice=WRONG_PASSWORD")
  c.secret = setmetatable({}, { __tostring = function() error("secret was inspected") end })
  c:dispatch("CHAT_MSG_CHANNEL_NOTICE_USER", c.secret, c.secret, "", "1. RaidReminderZombak", "", "", 0, 1, "RaidReminderZombak")
  includes(records(c, "CHANNEL_NOTICE")[2], "notice=<secret>")
  assert(not c.rr.Diagnostics.BuildReport():find("private-player", 1, true))
end)

test("Copy report is a stable selectable snapshot and never searches, sends or applies", function()
  local c = newClient(); c:enable(true); c:message()
  local timers, messages = c:timerCount(), #c.messages
  c.env.SlashCmdList.RAIDREMINDER("zombakreport")
  local panel = c.env.RaidReminderZombakDiagnosticsFrame
  assert(panel:IsShown() and panel.text.focused and panel.text.highlighted)
  eq(panel.scroll.scrollChild, panel.text); eq(panel.text:GetText(), panel.report)
  includes(panel.report, "POPUP_SHOWN"); includes(panel.report, "receiveEnabled: true")
  local snapshot = panel.report
  c.rr.Diagnostics.Record("AFTER_SNAPSHOT")
  eq(panel.text:GetText(), snapshot)
  panel.text:SetText("accidental edit"); panel.text.scripts.OnTextChanged(panel.text, true)
  eq(panel.text:GetText(), snapshot)
  panel.text.scripts.OnEscapePressed(); assert(not panel:IsShown()); eq(panel.text.focused, false)
  c.env.SlashCmdList.RAIDREMINDER("zombakreport")
  eq(c.env.RaidReminderZombakDiagnosticsFrame, panel); includes(panel.report, "AFTER_SNAPSHOT")
  eq(#c.sent, 0); eq(#c.searches, 0); eq(#c.applications, 0); eq(c:timerCount(), timers); eq(#c.messages, messages)
end)

test("Journal survives reload and remains bounded with character attribution", function()
  local c = newClient(); c:enable(true); c:message()
  local nextClient = newClient({ player = "Другойперсонаж", now = 105, db = c.rr.DB })
  local report = nextClient.rr.Diagnostics.BuildReport()
  includes(report, "POPUP_SHOWN"); includes(report, "p=Латтэ"); includes(report, "p=Другойперсонаж")
  for i = 1, 1200 do nextClient.rr.Diagnostics.Record("BOUNDED", { index = i }) end
  eq(#nextClient.rr.DB.zombakDiagnostics.entries, 600)
  includes(nextClient.rr.DB.zombakDiagnostics.entries[1], "index=601")
  includes(nextClient.rr.DB.zombakDiagnostics.entries[600], "index=1200")
  local reloaded = newClient({ db = nextClient.rr.DB })
  eq(#reloaded.rr.DB.zombakDiagnostics.entries, 600)
  includes(reloaded.rr.Diagnostics.BuildReport(), "index=1200")
end)

test("Malformed saved diagnostics and log formatting failures do not break notification delivery", function()
  for _, saved in ipairs({ "bad", { version = 1, entries = "bad", sequence = 0/0 },
    { version = 1, entries = { false, "old\n|line", {} }, sequence = "bad" } }) do
    local c = newClient({ db = { autoSearchZombakRaids = true, zombakDiagnostics = saved } })
    c:message(); eq(c.state.phase, "ready"); includes(c.rr.Diagnostics.BuildReport(), "diagnosticErrors=0")
    for _, line in ipairs(c.rr.DB.zombakDiagnostics.entries) do assert(not line:find("[\n|]")) end
  end
  local c = newClient(); c:enable(true)
  c.env.date = function() error("date unavailable") end
  c:message(); eq(c.state.phase, "ready"); eq(c.sounds, 1)
  assert(not c.rr.Diagnostics.BuildReport():find("diagnosticErrors=0", 1, true))
end)

test("Diagnostics never stringify secrets or retain unrelated addon message contents", function()
  local c = newClient(); c:enable(true)
  c.secret = setmetatable({}, { __tostring = function() error("must never stringify a secret") end })
  c.rr.Diagnostics.Record("SAFE", { value = c.secret, text = "a\n|cff00ff00b" })
  includes(records(c, "SAFE")[1], "value=<secret>")
  c:dispatch("CHAT_MSG_ADDON", c.secret, c.secret, "CHANNEL", c.secret)
  includes(records(c, "RX_UNREADABLE")[1], "cannot be identified safely")
  local count = #c.rr.DB.zombakDiagnostics.entries
  c:dispatch("CHAT_MSG_ADDON", "Unrelated", "private contents", "CHANNEL", "Another")
  eq(#c.rr.DB.zombakDiagnostics.entries, count)
  assert(not c.rr.Diagnostics.BuildReport():find("private contents", 1, true))
end)

test("LFG diagnostics distinguish applying, server confirmation and invitation after popup closes", function()
  local c = newClient(); c:found(); c:click()
  eq(#records(c, "LFG_APPLY_CALL"), 1); eq(#records(c, "LFG_APPLICATION"), 0)
  c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, "applied")
  includes(records(c, "LFG_APPLICATION")[1], "status=applied")
  c.rr.ZombakRaids.Clear("dismiss_button")
  c:advance(95); c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, "invited")
  includes(records(c, "LFG_APPLICATION")[2], "status=invited")
  includes(records(c, "LFG_APPLICATION")[2], "nonce=test-1")
  eq(c.state.announcement, nil); eq(#c.applications, 1)
  c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 999, "invited")
  eq(#records(c, "LFG_APPLICATION"), 2)
end)

test("Service channel moves from first to last while other channels retain relative order", function()
  local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } }, channels = {
    RaidReminderZombak = 1, General = 2, Trade = 3, LocalDefense = 4, Services = 5, CraftScan = 6,
  } })
  eq(c.channels.RaidReminderZombak, 1); eq(c.joins, 0)
  eq(c.sent[1][4], "1", "channel ordering must not delay delivery")
  c:advance(5)
  eq(c.channels.RaidReminderZombak, 6)
  eq(c.channels.General, 1); eq(c.channels.Trade, 2); eq(c.channels.LocalDefense, 3)
  eq(c.channels.Services, 4); eq(c.channels.CraftScan, 5)
  eq(#c.channelSwaps, 5); eq(c.sent[2][4], "6"); eq(c:timerCount(), 1)
  includes(records(c, "CHANNEL_ORDER")[#records(c, "CHANNEL_ORDER")], "result=moved to last")
  c:advance(30); eq(c.sent[#c.sent][4], "6")
  eq(#c.channelSwaps, 5, "do not repeatedly reorder a settled list")
end)

test("Channel order waits for standard chats arriving after login", function()
  local c = newClient({ player = "Зомбак", joinChannelID = 1 })
  c:advance(2)
  c.channels.General, c.channels.Trade = 2, 3
  c:dispatch("CHANNEL_UI_UPDATE")
  c:advance(2); c.channels.CraftScan = 4; c:dispatch("CHANNEL_UI_UPDATE")
  c:advance(1); eq(#c.channelSwaps, 0, "wait for the last layout change to settle")
  c:advance(5)
  eq(c.channels.General, 1); eq(c.channels.Trade, 2)
  eq(c.channels.CraftScan, 3); eq(c.channels.RaidReminderZombak, 4)
  eq(c.joins, 1); eq(c:timerCount(), 1)
end)

test("Asynchronous channel joins are reordered only after membership is confirmed", function()
  local c = newClient({ asyncJoin = true }); c:enable(true)
  c.channels.General, c.channels.Trade = 2, 3
  c:advance(20); eq(#c.channelSwaps, 0)
  c.channels.RaidReminderZombak = 1; c:dispatch("CHANNEL_UI_UPDATE")
  c:advance(5)
  eq(c.channels.RaidReminderZombak, 3); eq(c.channels.General, 1); eq(c.channels.Trade, 2)
  eq(#c.channelSwaps, 2)
  c:message({ channelID = 3 }); eq(c.state.phase, "ready")
end)

test("Channel ordering respects disabled reserved slots and gaps", function()
  local c = newClient({ channels = { RaidReminderZombak = 1, General = 3, Trade = 7, CraftScan = 9 } })
  c.disabledChannels = { General = true }; c:enable(true); c:advance(5)
  eq(c.channels.RaidReminderZombak, 9); eq(c.channels.General, 1)
  eq(c.channels.Trade, 3); eq(c.channels.CraftScan, 7)
  eq(#c.channelSwaps, 3)
  eq(c.channelSwaps[1][2], 3); eq(c.channelSwaps[2][2], 7); eq(c.channelSwaps[3][2], 9)
end)

test("Already last channels and channels on unsubscribed clients are not moved", function()
  local c = newClient({ channels = { General = 1, Trade = 2, RaidReminderZombak = 3 } })
  c:enable(true); c:advance(120); eq(#c.channelSwaps, 0); eq(c.joins, 0)
  includes(c.rr.Diagnostics.BuildReport(), "channelOrder: already last")
  c = newClient({ channels = { RaidReminderZombak = 1, General = 2 } })
  c:dispatch("CHANNEL_UI_UPDATE"); c:advance(60)
  eq(#c.channelSwaps, 0); eq(c.channels.General, 2)
end)

test("Channel order defers through combat and chat lockdown without blocking sends", function()
  for _, restriction in ipairs({ "combat", "restricted" }) do
    local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } },
      channels = { RaidReminderZombak = 1, General = 2, Trade = 3 } })
    c[restriction] = true; c:advance(10); eq(#c.channelSwaps, 0)
    if restriction == "combat" then eq(#c.sent, 2) end
    c[restriction] = false; c:dispatch("PLAYER_REGEN_ENABLED")
    eq(c.channels.RaidReminderZombak, 3); eq(#c.channelSwaps, 2)
    c:advance(5); eq(c.sent[#c.sent][4], "3")
  end
end)

test("Unavailable or failing reorder APIs never interrupt notification transport", function()
  for _, problem in ipairs({ "missing", "error", "no_op", "list_error" }) do
    local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } },
      channels = { RaidReminderZombak = 1, General = 2 } })
    if problem == "missing" then c.env.C_ChatInfo.SwapChatChannelsByChannelIndex = nil
    elseif problem == "error" then c.swapError = true
    elseif problem == "no_op" then c.swapNoOp = true
    else c.env.GetChannelList = function() error("channel list not available") end end
    c:advance(35)
    eq(c.channels.RaidReminderZombak, 1)
    eq(c:sentCount("ZOMBAK_RAID_CREATED"), 3); eq(c:sentCount("ZOMBAK_RAID_ACTIVE"), 1)
    eq(c:timerCount(), 1); assert(#c.channelSwaps <= 1)
  end
end)

test("Manual reordering is preserved after the initial move and reconnects move only once", function()
  local c = newClient({ player = "Зомбак", joinChannelID = 1,
    channels = { RaidReminderZombak = 1, General = 2, Trade = 3 } })
  c:advance(5); eq(#c.channelSwaps, 2)
  c.channels = { RaidReminderZombak = 1, General = 2, Trade = 3, CraftScan = 4 }
  for _ = 1, 10 do c:dispatch("CHANNEL_UI_UPDATE") end
  c:advance(20)
  eq(#c.channelSwaps, 2); eq(c.channels.RaidReminderZombak, 1)
  c.channels.RaidReminderZombak = nil; c:dispatch("CHANNEL_UI_UPDATE")
  c:advance(5); eq(c.channels.RaidReminderZombak, 4); eq(#c.channelSwaps, 5)
  c:advance(60); eq(#c.channelSwaps, 5); eq(c:timerCount(), 1)
end)

test("Unreadable channel lists postpone cosmetic ordering while delivery continues", function()
  local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } },
    channels = { RaidReminderZombak = 1, General = 2 } })
  local read = c.env.GetChannelList
  c.secret = setmetatable({}, { __tostring = function() error("must not stringify secret channels") end })
  c.env.GetChannelList = function() return 1, "RaidReminderZombak", false, 2, c.secret, false end
  c:advance(5); eq(#c.channelSwaps, 0); eq(#c.sent, 2)
  c.env.GetChannelList = read; c:advance(5)
  eq(c.channels.RaidReminderZombak, 2); eq(#c.channelSwaps, 1)
end)

local function setNotificationGroup(c, kind, members)
  local e = c.env
  c.notificationGroup, c.notificationMembers = kind, members or {}
  e.LE_REALM_RELATION_SAME = 1
  local function member(unit)
    if unit == "player" then return { c.player, c.realm } end
    return c.notificationMembers[tonumber((unit or ""):match("%d+"))]
  end
  e.IsInGroup = function(category)
    return c.notificationGroup ~= nil and category ~= e.LE_PARTY_CATEGORY_INSTANCE
  end
  e.IsInRaid = function() return c.notificationGroup == "raid" end
  e.GetNumGroupMembers = function()
    return c.notificationGroup and (#c.notificationMembers + (c.notificationGroup == "party" and 1 or 0)) or 0
  end
  e.GetRaidRosterInfo = function(index)
    local m = c.notificationMembers[index]
    if m and type(m[1]) == "string" then return m[1] .. (m[2] and "-" .. m[2] or "") end
  end
  e.UnitFullName = function(unit) local m = member(unit); if m then return m[1], m[2] end end
  e.UnitName = e.UnitFullName
  e.UnitIsUnit = function(unit, other) return unit == other end
  e.UnitRealmRelationship = function() return e.LE_REALM_RELATION_SAME end
end

test("Relisting still reaches outsiders but never notifies an existing raid member", function()
  local leader = newClient({ player = "Зомбакдх", inGroup = true, isLeader = true, entry = { activityIDs = { 301 } } })
  local member, outsider = newClient({ player = "Альмир" }), newClient()
  setNotificationGroup(member, "raid", { { "Альмир", "Ревущий Фьорд" }, { "Зомбакдх", "Ревущий Фьорд" } })
  member:enable(true); outsider:enable(true)
  leader:deliverTo(member); leader:deliverTo(outsider)
  eq(member.state.announcement, nil); eq(member.sounds, nil)
  local firstNonce = outsider.state.announcement.nonce
  leader.entry = nil; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  leader:advance(1); member:advance(1); outsider:advance(1)
  leader.entry = { activityIDs = { 301 } }; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true)
  leader:deliverTo(member); leader:deliverTo(outsider)
  assert(outsider.state.announcement.nonce ~= firstNonce); eq(outsider.sounds, 2)
  leader:advance(35); member:advance(35)
  for index = 1, #leader.sent do leader:deliverTo(member, index) end
  assert(leader:sentCount("ZOMBAK_RAID_ACTIVE") > 0)
  eq(member.state.announcement, nil); eq(member.sounds, nil)
  eq(member.rr.ZombakRaids.HasPendingNotifications(), false); eq(next(member.state.seen), nil)
  includes(records(member, "RX_DROPPED")[1], "reason=already_in_announced_group")
  eq(#member.searches, 0); eq(#member.applications, 0)
end)

test("Party membership and Russian/English realm aliases suppress the exact announcer", function()
  for _, realm in ipairs({ "Ревущий Фьорд", "HowlingFjord", "" }) do
    local c = newClient(); setNotificationGroup(c, "party", { { "ЗОМБАК", realm } })
    c:enable(true); c:message(); c:advance(10)
    eq(c.state.announcement, nil); eq(c.sounds, nil); eq(c.rr.ZombakRaids.HasPendingNotifications(), false)
  end
end)

test("The sender can subscribe without being notified about their own listing", function()
  local c = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } }); c:enable(true)
  c:deliverTo(c); c:advance(35)
  for index = 1, #c.sent do c:deliverTo(c, index) end
  eq(c.state.announcement, nil); eq(c.sounds, nil); eq(c:sentCount("ZOMBAK_RAID_CREATED"), 3)
  eq(c:sentCount("ZOMBAK_RAID_ACTIVE"), 1)
end)

test("Unrelated groups, same names on other realms and other Zombak alts do not mute notices", function()
  for _, m in ipairs({ { "Другой", "Ревущий Фьорд" }, { "Зомбак", "Гордунни" }, { "Зомбакдх", "Ревущий Фьорд" } }) do
    local c = newClient(); setNotificationGroup(c, "party", { m }); c:enable(true); c:message()
    eq(c.state.phase, "ready"); eq(c.sounds, 1); assert(c:popup():IsShown())
  end
end)

test("Joining clears visible notices and pending search/application timers", function()
  for _, phase in ipairs({ "ready", "searching", "found", "applying" }) do
    local c = newClient()
    if phase == "found" or phase == "applying" then c:found()
    else c:enable(true); c:message() end
    if phase == "searching" or phase == "applying" then c:click() end
    eq(c.state.phase, phase)
    setNotificationGroup(c, "party", { { "Зомбак", "Ревущий Фьорд" } })
    c:dispatch("GROUP_ROSTER_UPDATE")
    eq(c.state.announcement, nil); eq(c.state.currentZombakResultID, nil); assert(not c:popup():IsShown())
    includes(records(c, "POPUP_CLOSED")[1], "reason=already_in_announced_group")
    c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED"); c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42)
    c:dispatch("LFG_LIST_APPLICATION_STATUS_UPDATED", 42, "inviteaccepted")
    c:advance(95); eq(c.state.announcement, nil); eq(c:timerCount(), 1); eq(c.sounds, 1)
  end
end)

test("Joining drops queued notices in combat, hidden UI and Edit Mode", function()
  for _, blocker in ipairs({ "combat", "hidden", "editor", "lockdown" }) do
    local c = newClient(); c:enable(true)
    if blocker == "editor" then c:editEvent("EditMode.Enter")
    elseif blocker == "hidden" then c.env.UIParent:Hide()
    else c.combat = true end
    c:message(); eq(c.rr.ZombakRaids.HasPendingNotifications(), true)
    if blocker == "lockdown" then c.restricted = true end
    setNotificationGroup(c, "party", { { "Зомбак", "Ревущий Фьорд" } }); c:dispatch("GROUP_ROSTER_UPDATE")
    eq(c.rr.ZombakRaids.HasPendingNotifications(), false)
    if blocker == "editor" then assert(c:popup():IsShown()); c:editEvent("EditMode.Exit") end
    c.combat, c.restricted = false, false; c.env.UIParent:Show(); c:dispatch("PLAYER_REGEN_ENABLED")
    eq(c.state.announcement, nil); eq(c.sounds, nil); assert(not c:popup() or not c:popup():IsShown())
  end
end)

test("Joining while editing clears the real notice without hiding the position preview", function()
  local c = newClient(); c:enable(true); c:message(); c:editEvent("EditMode.Enter")
  setNotificationGroup(c, "party", { { "Зомбак", "Ревущий Фьорд" } }); c:dispatch("GROUP_ROSTER_UPDATE")
  eq(c.state.announcement, nil); assert(c:popup():IsShown())
  c:editEvent("EditMode.Exit"); assert(not c:popup():IsShown())
end)

test("Missed roster events are caught by maintenance and before either LFG action", function()
  for _, mode in ipairs({ "maintenance", "search", "apply" }) do
    local c = newClient()
    if mode == "apply" then c:found() else c:enable(true); c:message() end
    local searches = #c.searches
    setNotificationGroup(c, "party", { { "Зомбак", "Ревущий Фьорд" } })
    if mode == "maintenance" then c:advance(5) else c:click() end
    eq(c.state.announcement, nil); eq(#c.searches, searches); eq(#c.applications, 0)
    assert(not c:popup():IsShown())
  end
end)

test("Unreadable rosters wait and retry without consuming deduplication", function()
  for _, memberName in ipairs({ "Зомбак", "Другой" }) do
    local c = newClient(); setNotificationGroup(c, "party", { {} }); c:enable(true); c:message()
    eq(c.state.announcement, nil); eq(next(c.state.seen), nil)
    includes(records(c, "POPUP_WAIT")[1], "reason=group_roster_unavailable")
    c:advance(10); eq(#records(c, "POPUP_WAIT"), 1)
    c.notificationMembers[1] = { memberName, "Ревущий Фьорд" }; c:dispatch("GROUP_ROSTER_UPDATE")
    eq(c.rr.ZombakRaids.HasPendingNotifications(), false)
    eq(c.sounds, memberName == "Другой" and 1 or nil)
  end
end)

test("Secret roster identities are retried without logging their values", function()
  local c = newClient()
  c.secret = setmetatable({}, { __tostring = function() error("must not expose secret roster identity") end })
  setNotificationGroup(c, "party", { { c.secret, "Ревущий Фьорд" } }); c:enable(true); c:message()
  eq(c.state.announcement, nil); eq(c.rr.ZombakRaids.HasPendingNotifications(), true)
  c.notificationMembers[1] = { "Зомбак", "Ревущий Фьорд" }; c:advance(5)
  eq(c.rr.ZombakRaids.HasPendingNotifications(), false); eq(c.sounds, nil)
  eq(#records(c, "RX_ERROR"), 0)
end)

test("Native group lookup uses the full sender and checks the home group inside an instance group", function()
  local c = newClient(); setNotificationGroup(c, "party", { { "Другой", "Гордунни" } })
  c.env.IsInGroup = function() return true end
  c.env.UnitInParty = function(name, category)
    eq(name, "Зомбак-РевущийФьорд"); return category == c.env.LE_PARTY_CATEGORY_HOME
  end
  c:enable(true); c:message(); eq(c.state.announcement, nil); eq(c.sounds, nil)
  eq(c.rr.ZombakRaids.HasPendingNotifications(), false)
end)

test("Leaving permits a fresh recovery packet for a notice suppressed while grouped", function()
  local leader = newClient({ player = "Зомбак", entry = { activityIDs = { 301 } } })
  local c = newClient(); setNotificationGroup(c, "party", { { "Зомбак", "Ревущий Фьорд" } }); c:enable(true)
  leader:deliverTo(c); eq(c.state.announcement, nil)
  c.notificationGroup = nil; c:dispatch("GROUP_ROSTER_UPDATE")
  leader:advance(35); c:advance(35); leader:deliverTo(c)
  eq(c.state.phase, "ready"); eq(c.sounds, 1)
end)

test("LFG hasSelf also dismisses a notice before search results or application can be used", function()
  for _, mode in ipairs({ "result", "update", "click" }) do
    local c = newClient(); c:found(); c.results[42].hasSelf = true
    if mode == "result" then c.state.pendingSearch = true; c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
    elseif mode == "update" then c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42)
    else c:click() end
    eq(c.state.announcement, nil); eq(#c.applications, 0); assert(not c:popup():IsShown())
  end
end)

test("Test banners remain available when already grouped with Zombak", function()
  local c = newClient(); setNotificationGroup(c, "party", { { "Зомбак", "Ревущий Фьорд" } }); c:enable(true)
  c.rr.ZombakRaids.TestPopup(); c:dispatch("GROUP_ROSTER_UPDATE"); c:click()
  eq(c.state.phase, "found"); assert(c.state.announcement.isTest); assert(c:popup():IsShown())
  eq(#c.searches, 0); eq(#c.applications, 0)
end)

NEW_ADDON_TEST_CLIENT = newClient
print(string.format("%d targeted addon scenarios passed", tests))
assert(#failures == 0, table.concat(failures, "\n"))
