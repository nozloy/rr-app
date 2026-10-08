local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local Popup = {}
RR.UI.ZombakRaidPopup = Popup
local popup
local timeout
local currentView
local notificationVisible = false
local editing = false
local WIDTH = 396
local BORDER = { 0.56, 0.43, 0.24, 0.95 }
local backdrop = {
  bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background-Dark",
  edgeFile = "Interface\\Buttons\\WHITE8x8",
  tile = true, tileSize = 64, edgeSize = 1,
  insets = { left = 1, right = 1, top = 1, bottom = 1 },
}

local function Gradient(parent, layer, direction, from, to)
  local texture = parent:CreateTexture(nil, layer)
  texture:SetTexture("Interface\\Buttons\\WHITE8x8")
  texture:SetGradient(direction, CreateColor(unpack(from)), CreateColor(unpack(to)))
  return texture
end

local function CreateButton(parent, width, text, primary)
  local button = CreateFrame("Button", nil, parent, "BackdropTemplate")
  button:SetSize(width, 28)
  button:SetBackdrop(backdrop)
  local label = button:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  label:SetPoint("CENTER")
  label:SetWidth(width - 16)
  label:SetWordWrap(false)
  button:SetFontString(label)
  button:SetNormalFontObject(GameFontHighlightSmall)
  button:SetText(text)
  button:RegisterForClicks("LeftButtonUp")
  local function Refresh()
    local enabled = button:IsEnabled()
    local hover = enabled and button.hover
    if primary then
      button:SetBackdropColor(hover and 0.31 or 0.21, hover and 0.23 or 0.15, 0.055, 1)
      button:SetBackdropBorderColor(0.82, 0.65, 0.32, enabled and 1 or 0.35)
    else
      button:SetBackdropColor(0.06, 0.085, 0.1, hover and 1 or 0.85)
      button:SetBackdropBorderColor(0.38, 0.44, 0.48, hover and 1 or 0.6)
    end
    button:GetFontString():SetTextColor(1, primary and 0.87 or 0.94, primary and 0.62 or 0.95, enabled and 1 or 0.45)
  end
  button:SetScript("OnEnter", function() button.hover = true; Refresh() end)
  button:SetScript("OnLeave", function() button.hover = false; Refresh() end)
  button:SetScript("OnEnable", Refresh)
  button:SetScript("OnDisable", Refresh)
  button:SetScript("OnMouseDown", function() if button:IsEnabled() then button:SetAlpha(0.8) end end)
  button:SetScript("OnMouseUp", function() button:SetAlpha(1) end)
  Refresh()
  return button
end

local function StopAnimation()
  popup.appear:Stop()
  popup.glowAnimation:Stop()
  popup:SetAlpha(1)
  popup.glow:SetAlpha(0)
end

local function CreatePopup()
  if popup then return end
  popup = CreateFrame("Frame", "RaidReminderZombakRaidPopup", UIParent, "BackdropTemplate")
  popup:SetSize(WIDTH, 180)
  popup:SetFrameStrata(WINDOW_FRAME_STRATA)
  popup:SetFrameLevel(WINDOW_FRAME_LEVEL)
  popup:SetToplevel(true)
  popup:EnableMouse(true)
  -- SetUserPlaced(false) also requires a movable frame, before the first ApplyPosition.
  popup:SetMovable(true)
  popup:SetClampedToScreen(true)
  popup:SetBackdrop(backdrop)
  popup:SetBackdropColor(0.025, 0.04, 0.055, 0.98)
  popup:SetBackdropBorderColor(unpack(BORDER))
  popup:Hide()
  RegisterSpecialFrame("RaidReminderZombakRaidPopup")

  local wash = Gradient(popup, "BACKGROUND", "HORIZONTAL", { 0.09, 0.23, 0.28, 0.65 }, { 0.03, 0.07, 0.1, 0 })
  wash:SetPoint("TOPLEFT", 1, -1)
  wash:SetPoint("BOTTOMRIGHT", -1, 1)
  local watermark = popup:CreateTexture(nil, "BACKGROUND")
  watermark:SetTexture(MEDIA_PATH .. "RaidReminderIcon.tga")
  watermark:SetSize(112, 112)
  watermark:SetPoint("TOPRIGHT", -14, -14)
  watermark:SetAlpha(0.045)
  local edge = Gradient(popup, "ARTWORK", "HORIZONTAL", { 0.95, 0.73, 0.3, 0.9 }, { 0.95, 0.73, 0.3, 0 })
  edge:SetPoint("TOPLEFT", 1, -1)
  edge:SetPoint("TOPRIGHT", -1, -1)
  edge:SetHeight(2)

  popup.glow = Gradient(popup, "ARTWORK", "VERTICAL", { 0.92, 0.72, 0.28, 0 }, { 0.92, 0.72, 0.28, 0.22 })
  popup.glow:SetPoint("TOPLEFT", 1, -3)
  popup.glow:SetPoint("TOPRIGHT", -1, -3)
  popup.glow:SetHeight(42)
  popup.glow:SetAlpha(0)
  popup.appear = popup:CreateAnimationGroup()
  local fade = popup.appear:CreateAnimation("Alpha")
  fade:SetFromAlpha(0)
  fade:SetToAlpha(1)
  fade:SetDuration(0.22)
  popup.glowAnimation = popup.glow:CreateAnimationGroup()
  local brighten = popup.glowAnimation:CreateAnimation("Alpha")
  brighten:SetFromAlpha(0)
  brighten:SetToAlpha(1)
  brighten:SetDuration(0.3)
  brighten:SetOrder(1)
  local dim = popup.glowAnimation:CreateAnimation("Alpha")
  dim:SetFromAlpha(1)
  dim:SetToAlpha(0)
  dim:SetDuration(0.7)
  dim:SetOrder(2)

  local icon = popup:CreateTexture(nil, "ARTWORK")
  icon:SetTexture(MEDIA_PATH .. "RaidReminderIcon.tga")
  icon:SetSize(36, 36)
  icon:SetPoint("TOPLEFT", 16, -15)
  popup.title = popup:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  popup.title:SetPoint("TOPLEFT", 64, -17)
  popup.title:SetWidth(294)
  popup.title:SetJustifyH("LEFT")
  popup.title:SetWordWrap(false)
  popup.title:SetTextColor(0.96, 0.79, 0.45)
  popup.leader = popup:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  popup.leader:SetPoint("TOPLEFT", 64, -35)
  popup.leader:SetWidth(240)
  popup.leader:SetJustifyH("LEFT")
  popup.leader:SetWordWrap(false)
  popup.members = popup:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  popup.members:SetPoint("TOPRIGHT", -16, -36)
  popup.members:SetWidth(64)
  popup.members:SetJustifyH("RIGHT")
  popup.activity = popup:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  popup.activity:SetPoint("TOPLEFT", 16, -65)
  popup.activity:SetWidth(WIDTH - 32)
  popup.activity:SetJustifyH("LEFT")
  popup.activity:SetWordWrap(true)
  popup.status = popup:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  popup.status:SetWidth(WIDTH - 32)
  popup.status:SetJustifyH("LEFT")
  popup.status:SetJustifyV("TOP")
  popup.status:SetWordWrap(true)
  popup.status:SetTextColor(0.72, 0.79, 0.82)

  popup.close = CreateFrame("Button", nil, popup, "UIPanelCloseButtonNoScripts")
  popup.close:SetFrameLevel(popup:GetFrameLevel() + 2)
  popup.close:SetSize(24, 24)
  popup.close:SetPoint("TOPRIGHT", -3, -3)
  popup.close:SetScript("OnClick", function() RR.ZombakRaids.Clear() end)
  popup.action = CreateButton(popup, 254, InterfaceText("zombakFind"), true)
  popup.action:SetPoint("BOTTOMLEFT", 16, 14)
  popup.action:SetScript("OnClick", RR.ZombakRaids.OnActionClick)
  popup.dismiss = CreateButton(popup, 102, InterfaceText("zombakDismiss"), false)
  popup.dismiss:SetPoint("BOTTOMRIGHT", -16, 14)
  popup.dismiss:SetScript("OnClick", function() RR.ZombakRaids.Clear() end)
  popup:SetScript("OnHide", function()
    StopAnimation()
    if editing then return end
    if timeout then timeout:Cancel(); timeout = nil end
    if notificationVisible then
      notificationVisible = false
      RR.ZombakRaids.Clear()
    end
  end)
  RR.UI.ZombakRaidEditMode.ApplyPosition(popup)
end

local function RenderView(view)
  popup.title:SetText(view.title)
  popup.leader:SetText(view.leader)
  popup.activity:SetText(view.activity)
  popup.members:SetText(view.members)
  popup.status:SetText(view.status)
  popup.action:SetText(view.button)
  popup.action:SetEnabled(view.enabled and not editing)
  popup.dismiss:SetEnabled(not editing)
  popup.close:SetEnabled(not editing)
  -- Fit long raid names and localized error messages without enlarging every toast.
  local activityHeight = math.max(26, popup.activity:GetStringHeight())
  popup.status:ClearAllPoints()
  popup.status:SetPoint("TOPLEFT", 16, -(73 + activityHeight))
  local statusHeight = math.max(24, popup.status:GetStringHeight())
  popup:SetHeight(math.max(180, 73 + activityHeight + statusHeight + 54))
  RR.UI.ZombakRaidEditMode.ApplyPosition(popup)
end

function Popup.ResetTimeout()
  if timeout then timeout:Cancel() end
  timeout = C_Timer.NewTimer(ZOMBAK_RAID_POPUP_TIMEOUT, function()
    timeout = nil
    RR.ZombakRaids.Clear()
  end)
end

function Popup.Show()
  CreatePopup()
  notificationVisible = true
  popup:Show()
  if not editing then
    popup:Raise()
    StopAnimation()
    popup.appear:Play()
    popup.glowAnimation:Play()
  end
  Popup.ResetTimeout()
end

function Popup.Render(view)
  CreatePopup()
  currentView = view
  if not editing then RenderView(view) end
end

function Popup.Hide()
  notificationVisible = false
  currentView = nil
  if timeout then timeout:Cancel(); timeout = nil end
  if popup and not editing then popup:Hide() end
end

function Popup.SetEditing(value)
  if value == editing then return popup end
  if value then
    CreatePopup()
    editing = true
    StopAnimation()
    RenderView({
      title = InterfaceText("zombakTitle"), leader = RR.ZombakCharacters[1],
      activity = InterfaceText("zombakPreviewActivity"), members = "17 / 30",
      status = InterfaceText("zombakEditHint"), button = InterfaceText("zombakFind"), enabled = false,
    })
    popup:Show()
  else
    editing = false
    if notificationVisible and currentView then
      RenderView(currentView)
      popup:Show()
    elseif popup then
      popup:Hide()
    end
  end
  return popup
end

function Popup.ApplyPosition()
  if popup then RR.UI.ZombakRaidEditMode.ApplyPosition(popup) end
end
