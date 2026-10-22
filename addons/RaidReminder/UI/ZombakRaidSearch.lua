local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local SearchFilter = {}
RR.UI.ZombakRaidSearch = SearchFilter
local panel, checkbox, insetAnchor
local enabled = false
local needsRefresh = false

local function IsSecret(value)
  return issecretvalue and issecretvalue(value)
end

local function IsRaidPanel(target)
  return target == panel and not IsSecret(target.categoryID) and target.categoryID == ZOMBAK_RAID_CATEGORY_ID
end

local function IsBlocked()
  return InCombatLockdown() or IsZombakLFGRestricted()
end

local function UpdateAvailability()
  if checkbox then checkbox:SetEnabled(not IsBlocked() and not panel.searching) end
end

local function MatchesLeader(resultID)
  if IsSecret(resultID) then return false end
  local ok, info = pcall(C_LFGList.GetSearchResultInfo, resultID)
  return ok and not IsSecret(info) and type(info) == "table" and
    not IsSecret(info.isDelisted) and not info.isDelisted and
    not IsSecret(info.leaderName) and IsZombakCharacter(info.leaderName)
end

local function FilterResults(target)
  if target == panel then UpdateAvailability() end
  if not enabled or not IsRaidPanel(target) then return end
  if IsBlocked() then
    -- A native refresh can still run while identities are unreadable. Never
    -- expose an unfiltered list under a checked filter, or read restricted data.
    target.results, target.totalResults, target.selectedResult = {}, 0, nil
    needsRefresh = true
    return
  end
  if type(target.results) ~= "table" or IsSecret(target.results) then return end

  -- SortSearchResults runs after Blizzard fetches the fresh result list and
  -- before it renders. Copy the list; never change the shared LFG API cache.
  local filtered, selectedVisible = {}, false
  for _, resultID in ipairs(target.results) do
    if MatchesLeader(resultID) then
      filtered[#filtered + 1] = resultID
      if resultID == target.selectedResult then selectedVisible = true end
    end
  end
  target.results, target.totalResults = filtered, #filtered
  if target.selectedResult and not selectedVisible then target.selectedResult = nil end
  -- Leave applications intact: Blizzard keeps pending applications visible so
  -- the player can manage them even when they no longer match a search filter.
  needsRefresh = false
end

local function RefreshResults()
  if not panel then return end
  if IsBlocked() then needsRefresh = true; return end
  LFGListSearchPanel_UpdateResultList(panel)
  needsRefresh = false
end

local function UpdateCategory()
  if not checkbox then return end
  local isRaid = IsRaidPanel(panel)
  SetFrameShown(checkbox, isRaid)
  checkbox:SetChecked(enabled)
  UpdateAvailability()
  if insetAnchor and not InCombatLockdown() then
    panel.ResultsInset:SetPoint(insetAnchor[1], insetAnchor[2], insetAnchor[3],
      insetAnchor[4], insetAnchor[5] - (isRaid and 26 or 0))
  end
end

local function OnClick(self)
  if not IsRaidPanel(panel) or IsBlocked() or panel.searching then
    self:SetChecked(enabled)
    return
  end
  enabled = self:GetChecked() and true or false
  if enabled then
    -- Use Blizzard's clearing API, never SetText on its protected SearchBox.
    -- Only this hardware click can start a search; events only refilter cache.
    C_LFGList.ClearSearchTextFields()
    LFGListSearchPanel_DoSearch(panel)
  else
    RefreshResults()
  end
end

function SearchFilter.Initialize()
  if checkbox or not LFGListFrame or not LFGListFrame.SearchPanel or not hooksecurefunc or
    not LFGListUtil_SortSearchResults or not LFGListSearchPanel_SetCategory or
    not LFGListSearchPanel_UpdateResultList or not LFGListSearchPanel_DoSearch or
    not C_LFGList or not C_LFGList.ClearSearchTextFields or InCombatLockdown() then return end
  panel = LFGListFrame.SearchPanel
  if panel.ResultsInset then
    for index = 1, panel.ResultsInset:GetNumPoints() do
      local point, relativeTo, relativePoint, x, y = panel.ResultsInset:GetPoint(index)
      if point == "TOPLEFT" then
        insetAnchor = { point, relativeTo, relativePoint, x, y }
        break
      end
    end
  end
  checkbox = CreateFrame("CheckButton", "RaidReminderZombakRaidSearchFilter", panel, "UICheckButtonTemplate")
  checkbox:SetSize(24, 24)
  checkbox:SetPoint("TOPLEFT", panel.SearchBox, "BOTTOMLEFT", -4, -7)
  checkbox.label = checkbox:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  checkbox.label:SetPoint("LEFT", checkbox, "RIGHT", 4, 0)
  checkbox.label:SetText(InterfaceText("zombakRaidFilter"))
  checkbox:SetScript("OnClick", OnClick)
  checkbox:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
    GameTooltip:SetText(InterfaceText("zombakRaidFilterTooltip"), nil, nil, nil, nil, true)
    GameTooltip:Show()
  end)
  checkbox:SetScript("OnLeave", function() GameTooltip:Hide() end)
  hooksecurefunc("LFGListUtil_SortSearchResults", FilterResults)
  hooksecurefunc("LFGListSearchPanel_SetCategory", UpdateCategory)
  panel:HookScript("OnShow", function()
    UpdateCategory()
    if enabled or needsRefresh then RefreshResults() end
  end)
  UpdateCategory()
  return true
end

local events = CreateFrame("Frame")
events:RegisterEvent("ADDON_LOADED")
events:RegisterEvent("PLAYER_LOGIN")
events:RegisterEvent("LFG_LIST_SEARCH_RESULT_UPDATED")
events:RegisterEvent("PLAYER_REGEN_DISABLED")
events:RegisterEvent("PLAYER_REGEN_ENABLED")
events:SetScript("OnEvent", function(_, event, ...)
  if event == "ADDON_LOADED" then
    local name = ...
    if name == ADDON_NAME or name == "Blizzard_GroupFinder" then SearchFilter.Initialize() end
  elseif event == "PLAYER_LOGIN" then
    SearchFilter.Initialize()
  elseif event == "LFG_LIST_SEARCH_RESULT_UPDATED" then
    -- leaderName can be nil on the initial result. Native UI only updates an
    -- existing row, so rebuild to include newly identified leaders as well.
    if enabled and panel and IsRaidPanel(panel) then RefreshResults() end
  elseif event == "PLAYER_REGEN_DISABLED" then
    UpdateCategory()
  elseif event == "PLAYER_REGEN_ENABLED" then
    SearchFilter.Initialize()
    UpdateCategory()
    if needsRefresh then RefreshResults() end
  end
end)
