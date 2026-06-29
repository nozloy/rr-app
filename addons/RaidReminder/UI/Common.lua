local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- UI/Common.lua
function ApplyPanelBackdrop(panel, alpha)
  if panel.SetBackdrop then
    panel:SetBackdrop({
      bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background-Dark",
      edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
      tile = true,
      tileSize = 16,
      edgeSize = 14,
      insets = { left = 4, right = 4, top = 4, bottom = 4 },
    })
    panel:SetBackdropColor(0.02, 0.018, 0.014, alpha or 0.94)
    panel:SetBackdropBorderColor(0.72, 0.58, 0.28, 0.9)
    return
  end

  local background = panel:CreateTexture(nil, "BACKGROUND")
  background:SetAllPoints(panel)
  background:SetColorTexture(0.02, 0.018, 0.014, alpha or 0.94)
end

function CreateBorderedPanel(parent, width, height, point, relativeTo, relativePoint, x, y)
  local panel = CreateFrame("Frame", nil, parent, "BackdropTemplate")
  panel:SetSize(width, height)
  panel:SetPoint(point, relativeTo, relativePoint, x, y)
  ApplyPanelBackdrop(panel)
  return panel
end

function ApplyButtonTextures(button)
  if button.SetNormalFontObject then
    if GameFontNormalSmall then
      button:SetNormalFontObject(GameFontNormalSmall)
    end
    if GameFontHighlightSmall then
      button:SetHighlightFontObject(GameFontHighlightSmall)
    end
    if GameFontDisableSmall then
      button:SetDisabledFontObject(GameFontDisableSmall)
    end
  end
end

function CreateStyledButton(parent, width, height, text)
  local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
  button:SetSize(width, height)
  ApplyButtonTextures(button)
  button:SetText(text)
  return button
end

function CreateFilterCheckbox(parent, text, checked, onClick)
  local checkbox = CreateFrame("CheckButton", nil, parent, "UICheckButtonTemplate")
  checkbox:SetSize(24, 24)
  checkbox:SetChecked(checked)
  checkbox.label = checkbox:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  checkbox.label:SetPoint("LEFT", checkbox, "RIGHT", 6, 1)
  checkbox.label:SetText(text)
  checkbox:SetScript("OnClick", onClick)
  return checkbox
end

function CreateSummaryCard(parent, iconPath, label, colorName)
  local card = CreateFrame("Frame", nil, parent, "BackdropTemplate")
  card:SetSize(198, 58)
  ApplyPanelBackdrop(card, 0.78)

  card.icon = card:CreateTexture(nil, "ARTWORK")
  card.icon:SetSize(34, 34)
  card.icon:SetPoint("LEFT", 10, 0)
  card.icon:SetTexture(iconPath)

  card.label = card:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  card.label:SetPoint("TOPLEFT", card.icon, "TOPRIGHT", 10, -3)
  card.label:SetWidth(136)
  card.label:SetJustifyH("LEFT")
  card.label:SetText(label)

  card.value = card:CreateFontString(nil, "OVERLAY", "GameFontHighlightLarge")
  card.value:SetPoint("TOPLEFT", card.label, "BOTTOMLEFT", 0, -2)
  card.value:SetText("0")
  SetTextColor(card.value, colorName or "white")

  return card
end
