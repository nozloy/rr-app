-- Readiness regression tests run the real UI, protocol and event handlers in two
-- clients. Only Blizzard APIs, packet delivery and the unrelated gear scan are mocked.
local tests, failures = 0, {}
local function eq(actual, expected)
  assert(actual == expected, tostring(actual) .. " ~= " .. tostring(expected))
end
local function test(name, callback)
  local ok, message = pcall(callback)
  if ok then tests = tests + 1; print("PASS " .. name)
  else failures[#failures + 1] = name .. ": " .. tostring(message); print("FAIL " .. failures[#failures]) end
end

local function client(player)
  local c = NEW_ADDON_TEST_CLIENT({ player = player or "Латтэ" })
  local e, a = c.env, c.rr.Env
  c.group, c.saved, c.infoRequests = "raid", {}, 0
  c.members = { { "Латтэ", "Ревущий Фьорд" }, { "Зомбакдх", "Ревущий Фьорд" } }
  c.fields = { name = "Открытый мир", kind = "none", difficulty = 0, mapID = 0 }
  local function member(unit)
    if unit == "player" then return { c.player, c.realm } end
    return c.members[tonumber((unit or ""):match("%d+"))]
  end
  e.IsInRaid = function() return c.group == "raid" end
  e.IsInGroup = function(category) return c.group ~= nil and category ~= e.LE_PARTY_CATEGORY_INSTANCE end
  e.GetNumGroupMembers = function() return c.group and #c.members or 0 end
  e.GetNumSubgroupMembers = function() return c.group and #c.members - 1 or 0 end
  e.GetRaidRosterInfo = function(i) local m = c.members[i]; return m[1] .. "-" .. m[2], i == 2 and 2 or 0 end
  e.UnitFullName = function(unit) local m = member(unit); if m then return m[1], m[2] end end
  e.UnitName = e.UnitFullName
  e.UnitExists = function(unit) return member(unit) ~= nil end
  e.UnitClass = function() return "Mage", "MAGE" end
  e.UnitIsUnit = function(unit, other)
    local m, n = member(unit), member(other)
    return m and n and m[1] == n[1] and m[2] == n[2]
  end
  e.UnitIsGroupLeader = function(unit) return member(unit)[1] == "Зомбакдх" end
  e.GetRaidDifficultyID = function() return 16 end
  e.GetDifficultyInfo = function(id)
    return ({ [14] = "Обычный", [15] = "Героический", [16] = "Эпохальный" })[id], "raid"
  end
  e.GetInstanceInfo = function()
    local f = c.fields
    return f.name, f.kind, f.difficulty, e.GetDifficultyInfo(f.difficulty), 20, 0, false, f.mapID
  end
  e.RequestRaidInfo = function() c.infoRequests = c.infoRequests + 1 end
  e.GetNumSavedInstances = function() return #c.saved end
  e.GetSavedInstanceInfo = function(i)
    local s = c.saved[i]
    return s.name, 123456, 86400, s.difficulty, s.locked ~= false, false, 0, true, 20,
      e.GetDifficultyInfo(s.difficulty), #s.bosses, 0, false, s.mapID
  end
  e.GetSavedInstanceEncounterInfo = function(i, j)
    local boss = c.saved[i].bosses[j]
    return boss.name, 0, boss.killed
  end
  c.rr.Gear.StartInspectScan = function() end
  function c:open() self.rr.UI.ShowExportFrame() end
  function c:refresh(mode) self.rr.Readiness.Refresh(a.GetExportFields(), mode or a.GEAR_SCAN_MODE.manual) end
  function c:entry(name)
    return a.FindRaidCheckEntry(name or "Зомбакдх-РевущийФьорд")
  end
  function c:packet(command, id, ...)
    self:dispatch("CHAT_MSG_ADDON", "RaidReminder", a.BuildAddonMessage(command, id, ...),
      "WHISPER", "Зомбакдх-РевущийФьорд")
  end
  function c:deliver(recipient)
    for i = (self.delivered or 0) + 1, #self.sent do
      local wire = self.sent[i]
      if wire[3] ~= "CHANNEL" then
        recipient:dispatch("CHAT_MSG_ADDON", wire[1], wire[2], wire[3], a.GetPlayerCharacterKey())
      end
    end
    self.delivered = #self.sent
  end
  function c:select(mapID, name, difficulty)
    a.SelectRaidCheckTarget({ raidName = name or "Рейд А", instanceID = mapID or 999,
      difficultyId = difficulty or 16, difficultyName = e.GetDifficultyInfo(difficulty or 16) })
  end
  return c
end

test("Outside discovery works with a closed responder window and the addon-only filter", function()
  local c, peer = client(), client("Зомбакдх")
  c:open(); eq(c.rr.Env.raidCheckState.target, nil)
  eq(c.rr.Env.raidCheckSummary.addonValue:GetText(), "1 / 2")
  c:deliver(peer); peer:deliver(c)
  eq(c.rr.Env.raidCheckSummary.addonValue:GetText(), "2 / 2")
  eq(c.infoRequests, 0); eq(peer.infoRequests, 0)
  eq(c:entry().status, "unavailable"); eq(c.rr.Env.raidCheckSummary.cleanValue:GetText(), 0)
  c.rr.Env.raidCheckAddonFilter:SetChecked(true)
  c.rr.Env.raidCheckAddonFilter.scripts.OnClick(c.rr.Env.raidCheckAddonFilter)
  eq(c.rr.Env.raidCheckRows[1]:IsShown(), true); eq(c.rr.Env.raidCheckRows[2]:IsShown(), true)
  eq(peer.rr.Env.frame, nil)
end)

test("Legacy clean response to discovery confirms presence without a false clean lockout", function()
  local c = client(); c:open()
  local wire = c.rr.Env.SplitAddonMessage(c.sent[#c.sent][2])
  eq(wire[1], "REQ"); eq(wire[3], "__RR_ADDON_PRESENCE__")
  c:packet("RSP", wire[2], "clean", 0)
  eq(c:entry().hasAddon, true); eq(c:entry().status, "unavailable")
  eq(c.rr.Env.raidCheckSummary.cleanValue:GetText(), 0)
end)

test("Lost first request is retried and a response after timeout is still accepted", function()
  local c, peer = client(), client("Зомбакдх"); c:open()
  c.delivered = #c.sent; c:advance(3); eq(c:sentCount("REQ"), 2)
  c:deliver(peer); c:advance(13)
  eq(c:entry().status, "noAddon"); eq(c.rr.Env.GetRaidCheckStatusText(c:entry()), "Нет ответа")
  peer:deliver(c); eq(c:entry().hasAddon, true); eq(c:entry().status, "unavailable")
end)

test("Presence survives roster changes and manual refresh; same-target late replies remain valid", function()
  local c = client(); c:open()
  local id = c.rr.Env.raidCheckState.requestId
  c:packet("RRP", id, "0.2.9")
  c.members[3] = { "Новый", "Гордунни" }; c:dispatch("GROUP_ROSTER_UPDATE")
  eq(c.rr.Env.raidCheckState.requestId, id); eq(c:entry().hasAddon, true)
  c:packet("RSP", id, "clean", 0); eq(c:entry().status, "unavailable")
  c:refresh(); eq(c:entry().hasAddon, true)
end)

test("Outside manual raid checks wait for fresh lockout data on both clients", function()
  local c, peer = client(), client("Зомбакдх"); c:open(); c:select()
  c:deliver(peer); peer:deliver(c)
  eq(c:entry().hasAddon, true); eq(c:entry().status, "pending")
  peer:advance(2); eq(peer:sentCount("RSP"), 0)
  peer.saved = { { name = "Рейд А", difficulty = 16, mapID = 999, bosses = { { name = "Босс", killed = true } } } }
  peer:dispatch("UPDATE_INSTANCE_INFO"); peer:deliver(c)
  eq(c:entry().status, "hasLockout"); eq(c:entry().killedBosses[1], "Босс")
  c:dispatch("UPDATE_INSTANCE_INFO"); eq(c.rr.Env.raidCheckState.localEntry.status, "clean")
end)

test("Lockout timeout never reports clean and late instance data repairs the local result", function()
  local c, peer = client(), client("Зомбакдх"); c:open(); c:select(); c:deliver(peer)
  peer:advance(6); peer:deliver(c); c:advance(6)
  eq(c:entry().status, "unavailable"); eq(c.rr.Env.raidCheckState.localEntry.status, "unavailable")
  eq(c:entry().hasAddon, true)
  c:dispatch("UPDATE_INSTANCE_INFO"); eq(c.rr.Env.raidCheckState.localEntry.status, "clean")
end)

test("Stable instance ID handles other client languages and excludes other raids and difficulties", function()
  local c = client()
  c.saved = {
    { name = "English raid", difficulty = 16, mapID = 999, bosses = { { name = "Boss", killed = true } } },
    { name = "Рейд А", difficulty = 15, mapID = 999, bosses = { { name = "Heroic boss", killed = true } } },
    { name = "Рейд А", difficulty = 16, mapID = 998, bosses = { { name = "Other boss", killed = true } } },
  }
  local bosses = c.rr.Env.GetKilledBossesForRaid("Рейд А", 16, 999)
  eq(#bosses, 1); eq(bosses[1], "Boss")
end)

test("Duplicate and reordered boss packets do not erase or duplicate lockout details", function()
  local c = client(); c:open(); c:select()
  local id = c.rr.Env.raidCheckState.requestId
  c:packet("BOS", id, 2, "Второй")
  c:packet("RSP", id, "hasLockout", 2)
  c:packet("BOS", id, 1, "Первый")
  c:packet("BOS", id, 2, "Второй")
  c:packet("RSP", id, "hasLockout", 2)
  eq(#c:entry().killedBosses, 2); eq(c:entry().killedBosses[1], "Первый"); eq(c:entry().lockoutReply, true)
  c:dispatch("GROUP_ROSTER_UPDATE"); eq(#c:entry().killedBosses, 2); eq(c:entry().status, "hasLockout")
end)

test("Malformed status and stale replies cannot mark a different raid as clean", function()
  local c = client(); c:open(); c:select()
  local id = c.rr.Env.raidCheckState.requestId
  c:packet("RSP", id, "garbage", 0); eq(c:entry().status, "pending")
  c:select(1000, "Другой рейд")
  c:packet("RSP", id, "clean", 0); c:packet("BOS", id, 1, "Старый")
  eq(c:entry().status, "pending"); eq(#c:entry().killedBosses, 0)
end)

test("Entering a raid automatically selects its actual map and difficulty for any group member", function()
  local c = client(); c:open(); c:select()
  c.fields = { name = "Рейд Б", kind = "raid", difficulty = 15, mapID = 888 }
  c:dispatch("PLAYER_ENTERING_WORLD")
  eq(c.rr.Env.raidCheckState.target.instanceID, 888)
  eq(c.rr.Env.raidCheckState.target.difficultyId, 15)
  eq(c.rr.Env.raidCheckTargetButton:IsEnabled(), false)
  c:select(1000, "Неверный"); eq(c.rr.Env.raidCheckState.target.instanceID, 888)
end)

test("Closed windows cancel retries and leaving a raid clears the manual target", function()
  local c = client(); c:open(); c:select()
  local before = c:sentCount("REQ"); c.rr.Env.frame:Hide(); c:advance(20)
  eq(c:sentCount("REQ"), before)
  c.group = nil; c:dispatch("GROUP_ROSTER_UPDATE")
  eq(c.rr.Env.raidCheckState, nil); eq(c.rr.Env.raidCheckSelectedTarget, nil)
end)

test("Chat lockdown prevents sends and detection restarts when restrictions end", function()
  local c, peer = client(), client("Зомбакдх")
  c.restricted = true; c:open(); c:advance(20); eq(c:sentCount("REQ"), 0)
  c.restricted = false; c:dispatch("PLAYER_REGEN_ENABLED")
  c:deliver(peer); peer:deliver(c); eq(c:entry().hasAddon, true)
end)

test("Only group members receive lockout replies; cross-realm namesakes are distinct", function()
  local c = client()
  c:dispatch("CHAT_MSG_ADDON", "RaidReminder", "REQ\tforeign\tРейд А\t16", "WHISPER", "Чужой-Гордунни")
  eq(c:sentCount("RRP"), 0); eq(c.infoRequests, 0)
  eq(c.rr.Env.IsSenderPlayer("Латтэ-Гордунни"), false)
  eq(c.rr.Env.IsSenderPlayer("Латтэ"), true)
  c.members[2] = { "Латтэ", "Гордунни" }; c:open()
  eq(c.rr.Env.raidCheckState.localEntry.realm, "Ревущий Фьорд")
  eq(c:entry("Латтэ-Гордунни").hasAddon, false)
end)

test("Raid picker reads the client catalogue, restores journal state and triggers the selected check", function()
  local c = client(); local e, a = c.env, c.rr.Env
  local tier, instance, difficulty = 1, 41, 14
  e.EJ_GetCurrentTier = function() return tier end
  e.EJ_GetNumTiers = function() return 2 end
  e.EJ_GetTierInfo = function(t) return "Дополнение " .. t end
  e.EJ_SelectTier = function(t) tier = t end
  e.EJ_GetDifficulty = function() return difficulty end
  e.EJ_SetDifficulty = function(d) difficulty = d end
  e.EJ_GetInstanceInfo = function() return "Рейд", nil, nil, nil, nil, nil, nil, nil, true, 999 end
  e.C_EncounterJournal = { GetInstanceForGameMap = function() return 41 end }
  e.EJ_SelectInstance = function(id) instance = id end
  e.EJ_IsValidInstanceDifficulty = function(d) return d == 16 end
  e.EJ_GetInstanceByIndex = function(i, raid)
    eq(raid, true)
    if i == 1 then return tier + 40, "Рейд " .. tier, nil, nil, nil, nil, nil, nil, nil, nil, tier + 998 end
  end
  local targets = {}
  local root = {}
  function root:CreateTitle() end
  function root:CreateButton() return self end
  function root:CreateRadio(_, _, setter, target) if target then targets[#targets + 1] = { setter, target } end end
  e.MenuUtil = { CreateContextMenu = function(owner, callback) callback(owner, root) end }
  c:open(); a.raidCheckTargetButton.scripts.OnClick(a.raidCheckTargetButton)
  eq(#targets, 2); eq(tier, 1); eq(instance, 41); eq(difficulty, 14)
  targets[1][1](targets[1][2])
  eq(a.raidCheckState.target.instanceID, 1000); eq(a.raidCheckState.target.difficultyId, 16)
  eq(c.infoRequests, 1)
end)

test("Temporarily failing lockout APIs report unknown and recover on the next request", function()
  local c, peer = client(), client("Зомбакдх"); c:open(); c:select(); c:deliver(peer)
  peer.env.GetNumSavedInstances = function() error("data not available") end
  peer:dispatch("UPDATE_INSTANCE_INFO"); peer:deliver(c)
  eq(c:entry().hasAddon, true); eq(c:entry().status, "unavailable")
  peer.env.GetNumSavedInstances = function() return 0 end
  c:advance(3); c:deliver(peer); peer:dispatch("UPDATE_INSTANCE_INFO"); peer:deliver(c)
  eq(c:entry().status, "clean")
  eq(peer.infoRequests, 2)
end)

test("Missing encounter data cannot be interpreted as a clean lockout", function()
  local c = client()
  c.saved = { { name = "Рейд А", difficulty = 16, mapID = 999, bosses = {} } }
  local bosses, reason = c.rr.Env.GetKilledBossesForRaid("Рейд А", 16, 999)
  eq(bosses, nil); assert(reason)
  c.saved[1].bosses = { { name = "Босс" } }
  bosses, reason = c.rr.Env.GetKilledBossesForRaid("Рейд А", 16, 999)
  eq(bosses, nil); assert(reason)
end)

test("A namesake joining from another realm cannot inherit addon or lockout confirmation", function()
  local c = client(); c:open(); c:select()
  c:packet("RSP", c.rr.Env.raidCheckState.requestId, "clean", 0)
  c.members[2][2] = "Гордунни"; c:dispatch("GROUP_ROSTER_UPDATE")
  eq(c:entry("Зомбакдх-Гордунни").hasAddon, false)
  eq(c:entry("Зомбакдх-Гордунни").status, "pending")
  eq(c:entry("Зомбакдх"), nil)
end)

test("Roster event bursts keep retries bounded instead of flooding addon messages", function()
  local c = client(); c:open()
  for i = 1, 30 do c:dispatch("GROUP_ROSTER_UPDATE") end
  eq(c:sentCount("REQ"), 1); eq(c:timerCount(), 3)
  c:advance(3); eq(c:sentCount("REQ"), 2)
end)

test("Party gear checks remain independent of raid detection and the target selector", function()
  local c = client(); c.group = "party"; c:open()
  eq(c:sentCount("REQ"), 0); eq(c.infoRequests, 0)
  eq(c.rr.Env.raidCheckAddonFilter:IsShown(), false)
  eq(c.rr.Env.raidCheckTargetButton:IsShown(), false)
end)

test("Readiness diagnostics expose request, target, version and failed replies without extra traffic", function()
  local c = client(); c:open(); c:advance(16)
  local sent = #c.sent
  local report = c.rr.Diagnostics.BuildReport()
  for _, text in ipairs({ "readinessTarget=presence only", "addon=confirmed version=0.2.10",
    "addon=unconfirmed", "CHECK_TX", "CHECK_TIMEOUT", "readinessRequest=" }) do
    assert(report:find(text, 1, true), "missing " .. text)
  end
  eq(#c.sent, sent)
end)

print(string.format("%d targeted readiness scenarios passed", tests))
assert(#failures == 0, table.concat(failures, "\n"))
