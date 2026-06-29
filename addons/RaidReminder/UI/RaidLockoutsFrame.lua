local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- UI/RaidLockoutsFrame.lua
function FormatRaidLockoutReset(seconds)
  seconds = tonumber(seconds)
  if not seconds or seconds <= 0 then
    return nil
  end

  local days = math.floor(seconds / 86400)
  local hours = math.floor((seconds % 86400) / 3600)
  local minutes = math.floor((seconds % 3600) / 60)

  if days > 0 then
    return string.format("%dd %dh", days, hours)
  end

  if hours > 0 then
    return string.format("%dh %dm", hours, minutes)
  end

  return string.format("%dm", minutes)
end

function BuildRaidLockoutRows()
  local rows = {}

  if not GetNumSavedInstances or not GetSavedInstanceInfo or not GetSavedInstanceEncounterInfo then
    return rows
  end

  local savedInstanceCount = GetNumSavedInstances()
  for instanceIndex = 1, savedInstanceCount do
    local name, _, reset, difficultyId, locked, extended, _, isRaid, _, difficultyName, numEncounters =
      GetSavedInstanceInfo(instanceIndex)

    if isRaid and locked and numEncounters and numEncounters > 0 then
      local resetText = FormatRaidLockoutReset(reset)
      local difficultyLabel = difficultyName or InterfaceText("unknown")
      if resetText then
        difficultyLabel = difficultyLabel .. " (" .. resetText .. ")"
      end

      if extended then
        difficultyLabel = difficultyLabel .. " +"
      end

      for encounterIndex = 1, numEncounters do
        local bossName, fileDataID, isKilled = GetSavedInstanceEncounterInfo(instanceIndex, encounterIndex)
        if bossName and bossName ~= "" then
          table.insert(rows, {
            bossName = bossName,
            difficultyId = difficultyId or 0,
            difficultyName = difficultyLabel,
            encounterIndex = encounterIndex,
            isKilled = isKilled and true or false,
            raidName = name or InterfaceText("unknown"),
          })
        end
      end
    end
  end

  table.sort(rows, function(left, right)
    if left.raidName ~= right.raidName then
      return left.raidName < right.raidName
    end

    if left.difficultyId ~= right.difficultyId then
      return left.difficultyId < right.difficultyId
    end

    return left.encounterIndex < right.encounterIndex
  end)

  return rows
end

function GetRaidLockoutRow(index)
  local row = raidLockoutRows[index]
  if row then
    row:Show()
    return row
  end

  row = CreateFrame("Frame", nil, raidLockoutContent)
  row:SetHeight(RAID_LOCKOUT_ROW_HEIGHT)
  row:SetPoint("TOPLEFT", 0, -((index - 1) * RAID_LOCKOUT_ROW_HEIGHT))
  row:SetPoint("RIGHT", raidLockoutContent, "RIGHT", 0, 0)

  row.background = row:CreateTexture(nil, "BACKGROUND")
  row.background:SetAllPoints(row)
  row.background:SetColorTexture(1, 1, 1, index % 2 == 0 and 0.04 or 0.02)

  row.raidText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.raidText:SetPoint("LEFT", 6, 0)
  row.raidText:SetWidth(190)
  row.raidText:SetJustifyH("LEFT")
  row.raidText:SetWordWrap(false)

  row.difficultyText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.difficultyText:SetPoint("LEFT", row.raidText, "RIGHT", 12, 0)
  row.difficultyText:SetWidth(150)
  row.difficultyText:SetJustifyH("LEFT")
  row.difficultyText:SetWordWrap(false)

  row.bossText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.bossText:SetPoint("LEFT", row.difficultyText, "RIGHT", 12, 0)
  row.bossText:SetWidth(230)
  row.bossText:SetJustifyH("LEFT")
  row.bossText:SetWordWrap(false)

  row.statusText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  row.statusText:SetPoint("LEFT", row.bossText, "RIGHT", 12, 0)
  row.statusText:SetWidth(90)
  row.statusText:SetJustifyH("LEFT")
  row.statusText:SetWordWrap(false)

  raidLockoutRows[index] = row
  return row
end

function HideRaidLockoutRowsFrom(startIndex)
  for index = startIndex, #raidLockoutRows do
    raidLockoutRows[index]:Hide()
  end
end

function RenderRaidLockoutRows(statusText)
  if not raidLockoutContent or not raidLockoutStatus then
    return
  end

  if statusText then
    HideRaidLockoutRowsFrom(1)
    raidLockoutContent:SetHeight(1)
    raidLockoutStatus:SetText(statusText)
    return
  end

  local rows = BuildRaidLockoutRows()
  raidLockoutContent:SetHeight(math.max(#rows * RAID_LOCKOUT_ROW_HEIGHT, 1))

  for index, rowData in ipairs(rows) do
    local row = GetRaidLockoutRow(index)
    row.raidText:SetText(rowData.raidName)
    row.difficultyText:SetText(rowData.difficultyName)
    row.bossText:SetText(rowData.bossName)

    if rowData.isKilled then
      row.statusText:SetText(InterfaceText("killed"))
      row.statusText:SetTextColor(0.36, 0.86, 0.45)
    else
      row.statusText:SetText(InterfaceText("unlocked"))
      row.statusText:SetTextColor(0.78, 0.78, 0.78)
    end
  end

  HideRaidLockoutRowsFrom(#rows + 1)

  if #rows == 0 then
    raidLockoutStatus:SetText(InterfaceText("noRaidLockouts"))
  else
    raidLockoutStatus:SetText(string.format(InterfaceText("rowCount"), #rows))
  end
end

function RefreshRaidLockoutFrame()
  RenderRaidLockoutRows(InterfaceText("loading"))

  if RequestRaidInfo then
    RequestRaidInfo()
  else
    RenderRaidLockoutRows(InterfaceText("unavailable"))
    return
  end

  if C_Timer and C_Timer.After then
    C_Timer.After(1, function()
      if raidLockoutFrame and raidLockoutFrame:IsShown() then
        RenderRaidLockoutRows()
      end
    end)
  end
end

function CreateRaidLockoutFrame()
  if raidLockoutFrame then
    return
  end

  raidLockoutFrame = CreateFrame("Frame", "RaidReminderRaidLockoutFrame", UIParent, "BasicFrameTemplateWithInset")
  raidLockoutFrame:SetSize(760, 520)
  raidLockoutFrame:SetPoint("CENTER")
  BringRaidLockoutFrameToFront()
  raidLockoutFrame:SetMovable(true)
  raidLockoutFrame:EnableMouse(true)
  raidLockoutFrame:RegisterForDrag("LeftButton")
  raidLockoutFrame:SetScript("OnMouseDown", BringRaidLockoutFrameToFront)
  raidLockoutFrame:SetScript("OnDragStart", raidLockoutFrame.StartMoving)
  raidLockoutFrame:SetScript("OnDragStop", raidLockoutFrame.StopMovingOrSizing)
  raidLockoutFrame:Hide()
  raidLockoutFrame:SetScript("OnHide", function()
    PlayRaidReminderSound("IG_CHARACTER_INFO_CLOSE")
  end)
  RegisterSpecialFrame("RaidReminderRaidLockoutFrame")

  local title = raidLockoutFrame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  title:SetPoint("TOP", 0, -7)
  title:SetText(InterfaceText("raidLockoutTitle"))

  local header = CreateFrame("Frame", nil, raidLockoutFrame)
  header:SetSize(700, RAID_LOCKOUT_ROW_HEIGHT)
  header:SetPoint("TOPLEFT", 24, -38)

  local headerBackground = header:CreateTexture(nil, "BACKGROUND")
  headerBackground:SetAllPoints(header)
  headerBackground:SetColorTexture(1, 1, 1, 0.08)

  local raidHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  raidHeader:SetPoint("LEFT", 6, 0)
  raidHeader:SetWidth(190)
  raidHeader:SetJustifyH("LEFT")
  raidHeader:SetText(InterfaceText("raid"))

  local difficultyHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  difficultyHeader:SetPoint("LEFT", raidHeader, "RIGHT", 12, 0)
  difficultyHeader:SetWidth(150)
  difficultyHeader:SetJustifyH("LEFT")
  difficultyHeader:SetText(InterfaceText("difficulty"))

  local bossHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  bossHeader:SetPoint("LEFT", difficultyHeader, "RIGHT", 12, 0)
  bossHeader:SetWidth(230)
  bossHeader:SetJustifyH("LEFT")
  bossHeader:SetText(InterfaceText("boss"))

  local statusHeader = header:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  statusHeader:SetPoint("LEFT", bossHeader, "RIGHT", 12, 0)
  statusHeader:SetWidth(90)
  statusHeader:SetJustifyH("LEFT")
  statusHeader:SetText(InterfaceText("status"))

  local scrollFrame = CreateFrame("ScrollFrame", nil, raidLockoutFrame, "UIPanelScrollFrameTemplate")
  scrollFrame:SetPoint("TOPLEFT", header, "BOTTOMLEFT", 0, -4)
  scrollFrame:SetPoint("BOTTOMRIGHT", raidLockoutFrame, "BOTTOMRIGHT", -42, 58)

  raidLockoutContent = CreateFrame("Frame", nil, scrollFrame)
  raidLockoutContent:SetSize(700, 1)
  scrollFrame:SetScrollChild(raidLockoutContent)

  raidLockoutStatus = raidLockoutFrame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  raidLockoutStatus:SetPoint("BOTTOM", 0, 42)
  raidLockoutStatus:SetWidth(700)
  raidLockoutStatus:SetJustifyH("CENTER")
  raidLockoutStatus:SetText("")

  local refreshButton = CreateFrame("Button", nil, raidLockoutFrame, "UIPanelButtonTemplate")
  refreshButton:SetSize(120, 24)
  refreshButton:SetPoint("BOTTOMLEFT", 250, 18)
  refreshButton:SetText(InterfaceText("refresh"))
  refreshButton:SetScript("OnClick", RefreshRaidLockoutFrame)

  local closeButton = CreateFrame("Button", nil, raidLockoutFrame, "UIPanelButtonTemplate")
  closeButton:SetSize(120, 24)
  closeButton:SetPoint("BOTTOMRIGHT", -250, 18)
  closeButton:SetText(InterfaceText("close"))
  closeButton:SetScript("OnClick", function()
    raidLockoutFrame:Hide()
  end)

  raidLockoutEventFrame = CreateFrame("Frame")
  raidLockoutEventFrame:RegisterEvent("UPDATE_INSTANCE_INFO")
  raidLockoutEventFrame:SetScript("OnEvent", function()
    if raidLockoutFrame and raidLockoutFrame:IsShown() then
      RenderRaidLockoutRows()
    end
  end)
end

function ShowRaidLockoutFrame()
  CreateRaidLockoutFrame()
  BringRaidLockoutFrameToFront()
  PlayRaidReminderSound("IG_CHARACTER_INFO_OPEN")
  raidLockoutFrame:Show()
  RefreshRaidLockoutFrame()
end
