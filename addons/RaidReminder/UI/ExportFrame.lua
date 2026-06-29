local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- UI/ExportFrame.lua

function SelectExportText()
  if not editBox then
    return
  end

  editBox:SetFocus()
  editBox:HighlightText()
end

function RefreshExport(scanMode)
  if not editBox then
    return
  end

  local fields = GetExportFields()
  editBox:SetText(BuildExportString(fields))
  RefreshRaidCheck(fields, scanMode or GEAR_SCAN_MODE.full)
  SelectExportText()
end

function CreateTableHeader(parent)
  raidCheckHeader = CreateFrame("Frame", nil, parent)
  raidCheckHeader:SetSize(RAID_CHECK_WIDTH, RAID_CHECK_ROW_HEIGHT)
  raidCheckHeader:SetPoint("TOPLEFT", parent, "TOPLEFT", 16, -16)
  raidCheckSummary.headerLabels = raidCheckSummary.headerLabels or {}

  local background = raidCheckHeader:CreateTexture(nil, "BACKGROUND")
  background:SetAllPoints(raidCheckHeader)
  background:SetColorTexture(0.12, 0.09, 0.05, 0.86)

  for index, column in ipairs(TABLE_COLUMNS) do
    local label = raidCheckHeader:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    label:SetPoint("LEFT", raidCheckHeader, "LEFT", GetTableColumnOffset(index), 0)
    label:SetWidth(column.width)
    label:SetJustifyH("CENTER")
    label:SetText(InterfaceText(column.key))
    raidCheckSummary.headerLabels[column.key] = label
  end

  ApplyRaidCheckTableLayout()
end

function CreateExportFrame()
  if frame then
    return
  end

  frame = CreateFrame("Frame", "RaidReminderExportFrame", UIParent, "BasicFrameTemplateWithInset")
  frame:SetSize(EXPORT_FRAME_WIDTH, EXPORT_FRAME_COMPACT_HEIGHT)
  frame:SetPoint("CENTER")
  BringExportFrameToFront()
  frame:SetMovable(true)
  frame:EnableMouse(true)
  frame:RegisterForDrag("LeftButton")
  frame:SetScript("OnMouseDown", BringExportFrameToFront)
  frame:SetScript("OnDragStart", frame.StartMoving)
  frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
  frame:Hide()
  frame:SetScript("OnHide", function()
    PlayRaidReminderSound("IG_CHARACTER_INFO_CLOSE")
  end)
  RegisterSpecialFrame("RaidReminderExportFrame")

  if frame.TitleText then
    frame.TitleText:SetText("RaidReminder")
    frame.TitleText:SetTextColor(1, 0.82, 0)
  else
    local title = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightLarge")
    title:SetPoint("TOP", 0, -8)
    title:SetText("RaidReminder")
    title:SetTextColor(1, 0.82, 0)
  end

  raidCheckExportPanel = CreateBorderedPanel(frame, 820, 92, "TOP", frame, "TOP", 0, -38)

  local exportTitle = raidCheckExportPanel:CreateFontString(nil, "OVERLAY", "GameFontNormal")
  exportTitle:SetPoint("TOPLEFT", 18, -14)
  exportTitle:SetText(InterfaceText("exportTitle"))
  exportTitle:SetTextColor(1, 0.82, 0)

  local hint = raidCheckExportPanel:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
  hint:SetPoint("TOPLEFT", 18, -62)
  hint:SetText(InterfaceText("exportHint"))

  editBox = CreateFrame("EditBox", nil, raidCheckExportPanel, "InputBoxTemplate")
  editBox:SetSize(740, 28)
  editBox:SetPoint("TOPLEFT", 18, -36)
  editBox:SetAutoFocus(false)
  editBox:SetFontObject(ChatFontNormal)
  editBox:SetScript("OnEditFocusGained", function(self)
    self:HighlightText()
  end)
  editBox:SetScript("OnMouseUp", function(self)
    self:HighlightText()
  end)
  editBox:SetScript("OnEscapePressed", function(self)
    self:ClearFocus()
  end)

  raidCheckLabel = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
  raidCheckLabel:SetPoint("TOPLEFT", frame, "TOPLEFT", 60, -150)
  raidCheckLabel:SetText(InterfaceText("raidReadinessTitle"))
  raidCheckLabel:SetTextColor(1, 0.82, 0)

  raidCheckTargetText = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  raidCheckTargetText:SetPoint("TOPLEFT", raidCheckLabel, "BOTTOMLEFT", 0, -12)
  raidCheckTargetText:SetWidth(520)
  raidCheckTargetText:SetJustifyH("LEFT")
  raidCheckTargetText:SetText(InterfaceText("groupReadinessNoGroup"))

  raidCheckProblemFilter = CreateFilterCheckbox(frame, InterfaceText("filterProblems"), raidCheckShowProblemsOnly, function(self)
    raidCheckShowProblemsOnly = self:GetChecked() and true or false
    RenderRaidCheckRows()
  end)
  raidCheckProblemFilter:SetPoint("TOPLEFT", frame, "TOPLEFT", 560, -168)

  raidCheckAddonFilter = CreateFilterCheckbox(frame, InterfaceText("filterAddon"), raidCheckShowAddonOnly, function(self)
    raidCheckShowAddonOnly = self:GetChecked() and true or false
    RenderRaidCheckRows()
  end)
  raidCheckAddonFilter:SetPoint("LEFT", raidCheckProblemFilter.label, "RIGHT", 28, 0)

  local summaryPanel = CreateBorderedPanel(frame, 850, 74, "TOP", frame, "TOP", 0, -214)
  local addonCard = CreateSummaryCard(summaryPanel, "Interface\\Icons\\INV_Misc_GroupNeedMore", InterfaceText("addonSummary"), "white")
  addonCard:SetPoint("LEFT", summaryPanel, "LEFT", 14, 0)
  local cleanCard = CreateSummaryCard(summaryPanel, "Interface\\RaidFrame\\ReadyCheck-Ready", InterfaceText("cleanSummary"), "green")
  cleanCard:SetPoint("LEFT", addonCard, "RIGHT", 10, 0)
  local enchantCard = CreateSummaryCard(summaryPanel, "Interface\\Icons\\INV_Misc_EnchantedScroll", InterfaceText("enchantSummary"), "gold")
  enchantCard:SetPoint("LEFT", cleanCard, "RIGHT", 10, 0)
  local gemCard = CreateSummaryCard(summaryPanel, "Interface\\Icons\\INV_Misc_Gem_X4_MetaGem_Cut", InterfaceText("gemSummary"), "gold")
  gemCard:SetPoint("LEFT", enchantCard, "RIGHT", 10, 0)

  raidCheckSummary.addonValue = addonCard.value
  raidCheckSummary.addonCard = addonCard
  raidCheckSummary.cleanValue = cleanCard.value
  raidCheckSummary.cleanCard = cleanCard
  raidCheckSummary.enchantValue = enchantCard.value
  raidCheckSummary.enchantCard = enchantCard
  raidCheckSummary.gemValue = gemCard.value
  raidCheckSummary.gemCard = gemCard
  raidCheckSummary.panel = summaryPanel

  raidCheckTablePanel = CreateBorderedPanel(frame, 850, 350, "TOP", frame, "TOP", 0, -302)
  CreateTableHeader(raidCheckTablePanel)

  raidCheckScrollFrame = CreateFrame("ScrollFrame", nil, raidCheckTablePanel, "UIPanelScrollFrameTemplate")
  raidCheckScrollFrame:SetPoint("TOPLEFT", raidCheckHeader, "BOTTOMLEFT", 0, -4)
  raidCheckScrollFrame:SetPoint("BOTTOMRIGHT", raidCheckTablePanel, "BOTTOMRIGHT", -34, 20)

  raidCheckContent = CreateFrame("Frame", nil, raidCheckScrollFrame)
  raidCheckContent:SetSize(RAID_CHECK_WIDTH, 1)
  raidCheckScrollFrame:SetScrollChild(raidCheckContent)

  raidCheckStatus = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  raidCheckStatus:SetPoint("BOTTOMLEFT", raidCheckTablePanel, "BOTTOMLEFT", 18, 12)
  raidCheckStatus:SetWidth(620)
  raidCheckStatus:SetJustifyH("LEFT")
  raidCheckStatus:SetText("")
  raidCheckStatus:SetTextColor(0.82, 0.78, 0.68)

  local refreshButton = CreateStyledButton(frame, 150, 28, InterfaceText("refresh"))
  refreshButton:SetPoint("BOTTOM", frame, "BOTTOM", -95, 24)
  refreshButton:SetScript("OnClick", function()
    RefreshExport(GEAR_SCAN_MODE.manual)
  end)

  local closeButton = CreateStyledButton(frame, 150, 28, InterfaceText("close"))
  closeButton:SetPoint("LEFT", refreshButton, "RIGHT", 40, 0)
  closeButton:SetScript("OnClick", function()
    frame:Hide()
  end)

  SetExportFrameMode("raidCheck")
end

function ShowExportFrame()
  CreateExportFrame()
  BringExportFrameToFront()
  PlayRaidReminderSound("IG_CHARACTER_INFO_OPEN")
  frame:Show()
  RefreshExport(GEAR_SCAN_MODE.full)

  if C_Timer and C_Timer.After then
    C_Timer.After(0, SelectExportText)
  end
end
