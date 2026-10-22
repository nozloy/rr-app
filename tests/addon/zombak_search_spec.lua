-- Exercise the actual Group Finder integration using a fresh native result
-- cache on every draw. The secure hooks run after native sorting, as in WoW.
local tests, failures = 0, {}
local function eq(actual, expected, message)
  assert(actual == expected, (message or "unexpected value") .. ": " .. tostring(actual) .. " ~= " .. tostring(expected))
end
local function sameIDs(actual, expected)
  eq(#actual, #expected, "result count")
  for index, id in ipairs(expected) do eq(actual[index], id, "result order at " .. index) end
end
local function copy(values)
  local result = {}
  for index, value in ipairs(values) do result[index] = value end
  return result
end
local function test(name, callback)
  local ok, message = pcall(callback)
  if ok then tests = tests + 1; print("PASS " .. name)
  else failures[#failures + 1] = name .. ": " .. tostring(message); print("FAIL " .. failures[#failures]) end
end

local function installNative(env, c)
  c.nativeUpdates, c.nativeSorts, c.clears, c.nativeHooks = 0, 0, 0, {}
  local createFrame = env.CreateFrame
  env.CreateFrame = function(kind, name, parent, template)
    local item = createFrame(kind, name, parent, template)
    item.parent, item.anchors = parent, {}
    function item:GetParent() return self.parent end
    function item:GetNumPoints() return #self.anchors end
    function item:GetPoint(index) return unpack(self.anchors[index or 1]) end
    local setPoint, clearPoints, show = item.SetPoint, item.ClearAllPoints, item.Show
    function item:SetPoint(...)
      local args = { ... }
      for index, point in ipairs(self.anchors) do
        if point[1] == args[1] then self.anchors[index] = args; setPoint(self, ...); return end
      end
      self.anchors[#self.anchors + 1] = args
      setPoint(self, ...)
    end
    function item:ClearAllPoints() self.anchors = {}; clearPoints(self) end
    function item:HookScript(script, callback)
      local previous = self.scripts[script]
      self:SetScript(script, function(...)
        if previous then previous(...) end
        callback(...)
      end)
    end
    function item:Show()
      local wasShown = self:IsShown()
      show(self)
      if not wasShown and self.scripts.OnShow then self.scripts.OnShow(self) end
    end
    return item
  end

  local panel = env.CreateFrame("Frame", nil, env.UIParent)
  c.searchPanel = panel
  panel.categoryID, panel.results, panel.applications = 3, {}, { 901 }
  panel.SearchBox = env.CreateFrame("EditBox", nil, panel)
  panel.SearchBox:SetText("previous search")
  panel.ResultsInset = env.CreateFrame("Frame", nil, panel)
  panel.ResultsInset:SetPoint("TOPLEFT", panel, "TOPLEFT", 7, -125)
  panel.ResultsInset:SetPoint("BOTTOMRIGHT", panel, "BOTTOMRIGHT", -5, 8)
  env.LFGListFrame = { SearchPanel = panel }
  env.LFGListUtil_SortSearchResults = function(target)
    c.nativeSorts = c.nativeSorts + 1
    table.sort(target.results, function(first, second) return first > second end)
    return "native sorted", nil, 7
  end
  env.LFGListSearchPanel_UpdateResultList = function(target)
    assert(not c.combat and not c.restricted, "defer native result rebuilding while blocked")
    c.nativeUpdates = c.nativeUpdates + 1
    target.results, target.totalResults = copy(c.resultIDs), #c.resultIDs
    env.LFGListUtil_SortSearchResults(target)
    target.drawnResults = copy(target.results)
  end
  env.LFGListSearchPanel_SetCategory = function(target, category)
    target.categoryID = category
    return "native category"
  end
  env.LFGListSearchPanel_DoSearch = function(target)
    assert(c.hardware and not c.combat and not c.restricted, "native search requires an unrestricted hardware click")
    target.searching = true
    env.C_LFGList.Search(target.categoryID, 0, 0, c.languageFilter, true)
    env.LFGListSearchPanel_UpdateResultList(target)
  end
  env.C_LFGList.ClearSearchTextFields = function()
    assert(c.hardware, "clearing search text requires the checkbox click")
    c.clears = c.clears + 1
    -- The native API owns its secure edit box; the addon must never SetText it.
    panel.SearchBox.text = ""
  end
  function panel.SearchBox:SetText() error("must use ClearSearchTextFields instead of protected SearchBox:SetText") end
  env.hooksecurefunc = function(name, callback)
    local original = assert(env[name], "missing native hook target")
    c.nativeHooks[name] = (c.nativeHooks[name] or 0) + 1
    env[name] = function(...)
      local function capture(...) return { n = select("#", ...), ... } end
      local result = capture(original(...))
      callback(...)
      return unpack(result, 1, result.n)
    end
  end
  function c:refreshNative() env.LFGListSearchPanel_UpdateResultList(panel) end
  function c:receiveNative()
    panel.searching = false
    self:refreshNative()
    self:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
  end
  function c:selectCategory(category) return env.LFGListSearchPanel_SetCategory(panel, category) end
  function c:showSearch() panel:Hide(); panel:Show() end
  function c:filterCheckbox() return env.RaidReminderZombakRaidSearchFilter end
  function c:clickFilter(value)
    local box = assert(self:filterCheckbox(), "missing raid checkbox")
    box:SetChecked(value)
    self.hardware = true
    local ok, message = pcall(box.scripts.OnClick, box, "LeftButton")
    self.hardware = false
    assert(ok, message)
  end
end

local function client(options)
  options = options or {}
  local late, combat = options.late, options.combat
  options.beforeLoad = function(env, c)
    c.combat = combat
    c.installNative = function() installNative(env, c) end
    if not late then c.installNative() end
  end
  return NEW_ADDON_TEST_CLIENT(options)
end

test("Native raid checkbox initializes once, defaults off and restores original layout outside raids", function()
  local c = client({ db = { autoSearchZombakRaids = true } })
  local box, panel = c:filterCheckbox(), c.searchPanel
  assert(box and box:IsShown()); eq(box:GetChecked(), false); eq(box:IsEnabled(), true)
  eq(box.label:GetText(), "Рейды Зомбака")
  eq(box:GetParent(), panel); eq(panel.ResultsInset:GetNumPoints(), 2)
  local _, relative, _, x, y = panel.ResultsInset:GetPoint(1)
  eq(relative, panel); eq(x, 7); eq(y, -151)
  eq(c:selectCategory(2), "native category"); eq(box:IsShown(), false)
  local _, _, _, _, restoredY = panel.ResultsInset:GetPoint(1)
  eq(restoredY, -125)
  c:selectCategory(3); c:selectCategory(3); c:showSearch()
  local _, _, _, _, raidY = panel.ResultsInset:GetPoint(1)
  eq(raidY, -151); eq(c.nativeHooks.LFGListUtil_SortSearchResults, 1)
  eq(c.nativeHooks.LFGListSearchPanel_SetCategory, 1); eq(#c.searches, 0); eq(c.clears, 0)
end)

test("Lazy Group Finder load and combat-delayed initialization install the checkbox without searching", function()
  local c = client({ late = true })
  eq(c.env.RaidReminderZombakRaidSearchFilter, nil)
  c.installNative(); c:dispatch("ADDON_LOADED", "UnrelatedAddon")
  eq(c:filterCheckbox(), nil)
  c:dispatch("ADDON_LOADED", "Blizzard_GroupFinder")
  local box = assert(c:filterCheckbox())
  c:dispatch("ADDON_LOADED", "Blizzard_GroupFinder"); c:dispatch("PLAYER_LOGIN")
  eq(c:filterCheckbox(), box); eq(c.nativeHooks.LFGListUtil_SortSearchResults, 1); eq(#c.searches, 0)
  c = client({ combat = true }); eq(c:filterCheckbox(), nil)
  c.combat = false; c:dispatch("PLAYER_REGEN_ENABLED")
  assert(c:filterCheckbox()); eq(#c.searches, 0)
end)

test("Unavailable native hook API is harmless and a later load can retry initialization", function()
  local c = client({ late = true }); c.installNative()
  local hook = c.env.hooksecurefunc
  c.env.hooksecurefunc = nil
  c:dispatch("ADDON_LOADED", "Blizzard_GroupFinder"); eq(c:filterCheckbox(), nil)
  c.env.hooksecurefunc = hook
  c:dispatch("ADDON_LOADED", "Blizzard_GroupFinder"); assert(c:filterCheckbox())
  eq(#c.searches, 0)
end)

test("A checkbox click searches all Zombak leaders and preserves native order, cache and applications", function()
  local c = client(); local panel = c.searchPanel
  local expected = {}
  for index, name in ipairs(c.rr.ZombakCharacters) do
    c.results[index] = { leaderName = name }
    c.resultIDs[#c.resultIDs + 1] = index
    table.insert(expected, 1, index)
  end
  local nextID = #c.resultIDs
  for _, info in ipairs({
    { leaderName = "ЗОМБАК-HowlingFjord", accept = true },
    { leaderName = "Зомбак-Гордунни" },
    { leaderName = "Другой-РевущийФьорд" },
    {},
    { leaderName = "Зомбак-РевущийФьорд", isDelisted = true },
    { leaderName = "secret leader" },
  }) do
    nextID = nextID + 1
    c.results[nextID] = info; c.resultIDs[#c.resultIDs + 1] = nextID
    if info.accept then table.insert(expected, 1, nextID) end
  end
  c.secret = "secret leader"
  local rawIDs, applications, languages = c.resultIDs, panel.applications, c.languageFilter
  panel.selectedResult = nextID - 4
  c:clickFilter(true)
  eq(#c.searches, 1); eq(c.searches[1][1], 3); eq(c.clears, 1)
  eq(c:filterCheckbox():IsEnabled(), false)
  eq(panel.SearchBox:GetText(), ""); eq(c.languageFilter, languages)
  c:receiveNative(); sameIDs(panel.drawnResults, expected); eq(panel.totalResults, #expected)
  eq(c:filterCheckbox():IsEnabled(), true)
  eq(panel.selectedResult, nil); eq(panel.applications, applications); sameIDs(applications, { 901 })
  local rawCount, rawResults = c.env.C_LFGList.GetSearchResults()
  eq(rawCount, #rawIDs); eq(rawResults, rawIDs); assert(panel.results ~= rawResults)
  eq(rawIDs[1], 1); eq(rawIDs[#rawIDs], nextID); eq(#c.applications, 0)
  local first, second, third = c.env.LFGListUtil_SortSearchResults(panel)
  eq(first, "native sorted"); eq(second, nil); eq(third, 7)
end)

test("Unchecking restores cached native results without another search or clearing saved languages", function()
  local c = client(); local panel = c.searchPanel
  c.results = { [1] = { leaderName = "Зомбак-рф" }, [2] = { leaderName = "Другой-Гордунни" } }
  c.resultIDs = { 1, 2 }; panel.selectedResult = 1
  c:clickFilter(true); c:receiveNative(); sameIDs(panel.results, { 1 }); eq(panel.selectedResult, 1)
  c:clickFilter(false); sameIDs(panel.drawnResults, { 2, 1 }); eq(panel.totalResults, 2)
  eq(#c.searches, 1); eq(c.clears, 1); eq(c.languageFilter.enUS, true)
  eq(c.env.RaidReminderDB.autoSearchZombakRaids, false)
end)

test("Other categories retain their native results while the enabled raid choice survives", function()
  local c = client()
  c.results = { [1] = { leaderName = "Зомбак-рф" }, [2] = { leaderName = "Другой-Гордунни" } }
  c.resultIDs = { 1, 2 }
  c:clickFilter(true); c:receiveNative(); sameIDs(c.searchPanel.results, { 1 })
  c:selectCategory(2); c:refreshNative(); sameIDs(c.searchPanel.results, { 2, 1 })
  eq(c:filterCheckbox():IsShown(), false)
  c:clickFilter(false); eq(c:filterCheckbox():GetChecked(), true)
  c:selectCategory(3); c:refreshNative(); sameIDs(c.searchPanel.results, { 1 })
  eq(c:filterCheckbox():IsShown(), true); eq(#c.searches, 1)
end)

test("Late leader data and leader or delisting updates rebuild the native list without a new request", function()
  local c = client(); c.results[42] = {}; c.resultIDs = { 42 }
  c:clickFilter(true); c:receiveNative()
  sameIDs(c.searchPanel.results, {})
  c.results[42].leaderName = "Зомбак-Ревущий Фьорд"
  c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42); sameIDs(c.searchPanel.drawnResults, { 42 })
  c.results[42].leaderName = "Зомбак-Гордунни"
  c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42); sameIDs(c.searchPanel.drawnResults, {})
  c.results[42].leaderName = "Зомбак-рф"; c.results[42].isDelisted = true
  c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 42); sameIDs(c.searchPanel.drawnResults, {})
  eq(#c.searches, 1); eq(c.clears, 1); eq(#c.applications, 0)
end)

test("Busy activation, empty results and panel reopening never queue an automatic search", function()
  local c = client(); c.searchPanel.searching = true
  c:showSearch(); eq(c:filterCheckbox():IsEnabled(), false)
  c:clickFilter(true); eq(c:filterCheckbox():GetChecked(), false)
  c:receiveNative(); eq(c:filterCheckbox():IsEnabled(), true)
  eq(#c.searches, 0); eq(c.clears, 0)
  c:clickFilter(true); c:receiveNative()
  sameIDs(c.searchPanel.results, {}); eq(c.searchPanel.totalResults, 0)
  c:showSearch(); c:dispatch("PLAYER_REGEN_ENABLED")
  c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 999)
  eq(#c.searches, 1); eq(c.clears, 1)
  c.results[1] = { leaderName = "Зомбак-рф" }; c.resultIDs = { 1, 2 }
  local getInfo = c.env.C_LFGList.GetSearchResultInfo
  c.env.C_LFGList.GetSearchResultInfo = function(id)
    if id == 2 then error("temporarily unavailable result") end
    return getInfo(id)
  end
  c:refreshNative(); sameIDs(c.searchPanel.results, { 1 })
end)

test("Combat and restricted mode disable clicks and defer result updates until recovery", function()
  for _, mode in ipairs({ "combat", "restricted" }) do
    local c = client(); local panel = c.searchPanel
    c.results[1] = { leaderName = "Зомбак-рф" }; c.resultIDs = { 1 }
    c:clickFilter(true); c:receiveNative()
    sameIDs(panel.results, { 1 })
    c[mode] = true
    if mode == "combat" then c:dispatch("PLAYER_REGEN_DISABLED") else c:showSearch() end
    eq(c:filterCheckbox():IsEnabled(), false)
    local updates, reads = c.nativeUpdates, c.reads
    c:clickFilter(false); eq(c:filterCheckbox():GetChecked(), true)
    c.results[1].leaderName = "Другой-Гордунни"
    c:dispatch("LFG_LIST_SEARCH_RESULT_UPDATED", 1)
    eq(c.nativeUpdates, updates); eq(c.reads, reads); sameIDs(panel.results, { 1 })
    c[mode] = false; c:dispatch("PLAYER_REGEN_ENABLED")
    eq(c:filterCheckbox():IsEnabled(), true); eq(c.nativeUpdates, updates + 1)
    sameIDs(panel.results, {}); eq(#c.searches, 1); eq(c.clears, 1); eq(#c.applications, 0)
  end
end)

test("Native redraws while blocked cannot expose other leaders and recover from cache without searching", function()
  for _, mode in ipairs({ "combat", "restricted" }) do
    local c = client(); local panel = c.searchPanel
    c.results = { [1] = { leaderName = "Зомбак-рф" }, [2] = { leaderName = "Другой-Гордунни" } }
    c.resultIDs = { 1, 2 }
    c:clickFilter(true); c:receiveNative(); sameIDs(panel.results, { 1 })
    c[mode] = true
    -- Native internal redraws can sort a fresh cache even though addon-triggered
    -- UpdateResultList calls are deferred while combat or chat restrictions hold.
    panel.results, panel.totalResults, panel.selectedResult = copy(c.resultIDs), 2, 2
    local reads, updates = c.reads, c.nativeUpdates
    c.env.LFGListUtil_SortSearchResults(panel)
    eq(c.reads, reads); eq(c.nativeUpdates, updates)
    sameIDs(panel.results, {}); eq(panel.totalResults, 0); eq(panel.selectedResult, nil)
    eq(c:filterCheckbox():GetChecked(), true); eq(c:filterCheckbox():IsEnabled(), false)
    sameIDs(c.resultIDs, { 1, 2 })
    c[mode] = false; c:dispatch("PLAYER_REGEN_ENABLED")
    sameIDs(panel.drawnResults, { 1 }); eq(panel.totalResults, 1)
    eq(c.nativeUpdates, updates + 1); eq(c:filterCheckbox():IsEnabled(), true)
    eq(#c.searches, 1); eq(c.clears, 1); eq(#c.applications, 0)
  end
end)

print(string.format("%d targeted native raid search scenarios passed", tests))
assert(#failures == 0, table.concat(failures, "\n"))
