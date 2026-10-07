local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local Popup = {}
RR.UI.ZombakRaidPopup = Popup
local popup
local timeout

local function CreatePopup()
  if popup then
    return
  end
  popup = CreateFrame("Frame", "RaidReminderZombakRaidPopup", UIParent, "BackdropTemplate")
  popup:SetSize(470, 292)
  popup:SetPoint("CENTER", UIParent, "CENTER", 0, 90)
  popup:SetFrameStrata(WINDOW_FRAME_STRATA)
  popup:SetFrameLevel(WINDOW_FRAME_LEVEL)
  popup:SetToplevel(true)
  popup:EnableMouse(true)
  ApplyPanelBackdrop(popup)
  popup:Hide()
  RegisterSpecialFrame("RaidReminderZombakRaidPopup")

  local close = CreateStyledButton(popup, 26, 24, "×")
  close:SetPoint("TOPRIGHT", -10, -10)
  close:SetScript("OnClick", function()
    RR.ZombakRaids.Clear()
  end)

  popup.title = popup:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
  popup.title:SetPoint("TOP", 0, -28)
  popup.title:SetWidth(386)
  SetTextColor(popup.title, "gold")

  popup.leader = popup:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  popup.leader:SetPoint("TOP", 0, -63)
  popup.leader:SetWidth(418)
  popup.activity = popup:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  popup.activity:SetPoint("TOP", 0, -89)
  popup.activity:SetSize(418, 44)
  popup.members = popup:CreateFontString(nil, "OVERLAY", "GameFontNormal")
  popup.members:SetPoint("TOP", 0, -140)
  popup.status = popup:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  popup.status:SetPoint("TOP", 0, -163)
  popup.status:SetSize(418, 52)
  SetTextColor(popup.status, "white")

  popup.action = CreateStyledButton(popup, 250, 32, InterfaceText("zombakFind"))
  popup.action:SetPoint("BOTTOM", 0, 22)
  popup.action:RegisterForClicks("LeftButtonUp")
  popup.action:SetScript("OnClick", RR.ZombakRaids.OnActionClick)
  popup:SetScript("OnHide", function()
    if timeout then
      timeout:Cancel()
      timeout = nil
    end
    RR.ZombakRaids.Clear()
  end)
end

function Popup.ResetTimeout()
  if timeout then
    timeout:Cancel()
  end
  timeout = C_Timer.NewTimer(ZOMBAK_RAID_POPUP_TIMEOUT, function()
    timeout = nil
    RR.ZombakRaids.Clear()
  end)
end

function Popup.Show()
  CreatePopup()
  popup:Show()
  popup:Raise()
  Popup.ResetTimeout()
end

function Popup.Render(view)
  CreatePopup()
  popup.title:SetText(view.title)
  popup.leader:SetText(view.leader)
  popup.activity:SetText(view.activity)
  popup.members:SetText(view.members)
  popup.status:SetText(view.status)
  popup.action:SetText(view.button)
  popup.action:SetEnabled(view.enabled)
end

function Popup.Hide()
  if popup and popup:IsShown() then
    popup:Hide()
  end
end
