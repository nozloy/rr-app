local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local EditMode = {}
RR.UI.ZombakRaidEditMode = EditMode
local banner
local selection
local active = false
local dragging = false
local initialized = false

local function ValidOffset(value)
  return type(value) == "number" and value == value and math.abs(value) < 100000
end

function EditMode.ApplyPosition(target)
  local position = RR.DB and RR.DB.zombakBannerPosition
  local x, y = 0, 90
  if type(position) == "table" and ValidOffset(position.x) and ValidOffset(position.y) then
    x, y = position.x, position.y
  end
  local maxX = math.max(0, (UIParent:GetWidth() - target:GetWidth()) / 2 - 6)
  local maxY = math.max(0, (UIParent:GetHeight() - target:GetHeight()) / 2 - 6)
  target:ClearAllPoints()
  target:SetPoint("CENTER", UIParent, "CENTER", math.max(-maxX, math.min(maxX, x)), math.max(-maxY, math.min(maxY, y)))
  target:SetUserPlaced(false)
end

local function StopDragging()
  if not dragging then return end
  dragging = false
  banner:StopMovingOrSizing()
  local x, y = banner:GetCenter()
  local parentX, parentY = UIParent:GetCenter()
  if x and y and parentX and parentY and RR.DB then
    RR.DB.zombakBannerPosition = { x = x - parentX, y = y - parentY }
    EditMode.ApplyPosition(banner)
  end
end

function EditMode.ResetPosition()
  StopDragging()
  if RR.DB then RR.DB.zombakBannerPosition = nil end
  RR.UI.ZombakRaidPopup.ApplyPosition()
end

local function CreateSelection()
  if selection then return end
  selection = CreateFrame("Button", "RaidReminderZombakBannerSelection", banner, "BackdropTemplate")
  selection:SetPoint("TOPLEFT", -3, 3)
  selection:SetPoint("BOTTOMRIGHT", 3, -3)
  selection:SetFrameLevel(banner:GetFrameLevel() + 10)
  selection:SetBackdrop({ edgeFile = "Interface\\Buttons\\WHITE8x8", edgeSize = 2 })
  selection:SetBackdropBorderColor(0.25, 0.78, 1, 1)
  selection:EnableMouse(true)
  selection:RegisterForDrag("LeftButton")
  selection:RegisterForClicks("RightButtonUp")
  selection:SetScript("OnDragStart", function()
    if active and not InCombatLockdown() then
      dragging = true
      banner:StartMoving()
    end
  end)
  selection:SetScript("OnDragStop", StopDragging)
  selection:SetScript("OnHide", StopDragging)
  selection:SetScript("OnClick", function(_, button)
    if active and button == "RightButton" and not InCombatLockdown() then EditMode.ResetPosition() end
  end)
  selection.label = selection:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  selection.label:SetPoint("BOTTOMLEFT", selection, "TOPLEFT", 2, 6)
  selection.label:SetText(InterfaceText("zombakEditLabel"))
  selection.label:SetTextColor(0.4, 0.85, 1)
end

function EditMode.Enter()
  if active or InCombatLockdown() then return end
  banner = RR.UI.ZombakRaidPopup.SetEditing(true)
  CreateSelection()
  selection:Show()
  active = true
end

function EditMode.Exit()
  if not active then return end
  StopDragging()
  active = false
  selection:Hide()
  RR.UI.ZombakRaidPopup.SetEditing(false)
end

function EditMode.OpenFromSettings()
  if InCombatLockdown() then
    print("[RR] " .. InterfaceText("zombakCombat"))
    return
  end
  if not EditModeManagerFrame and C_AddOns and C_AddOns.LoadAddOn then
    C_AddOns.LoadAddOn("Blizzard_EditMode")
  end
  local manager = EditModeManagerFrame
  if not manager or not EventRegistry or not manager:CanEnterEditMode() then
    print("[RR] " .. InterfaceText("zombakEditUnavailable"))
    return
  end
  if SettingsPanel and SettingsPanel:IsShown() then
    -- Keep unapplied game settings intact instead of hiding their confirmation dialog.
    if SettingsPanel:HasUnappliedSettings() then
      print("[RR] " .. InterfaceText("zombakEditApplySettings"))
      return
    end
    SettingsPanel:Close(true)
    if SettingsPanel:IsShown() then return end
  end
  EditMode.Initialize()
  ShowUIPanel(manager)
  if manager:IsEditModeActive() then
    -- Also covers resuming an already active editor after visiting Settings.
    EditMode.Enter()
  else
    print("[RR] " .. InterfaceText("zombakEditUnavailable"))
  end
end

function EditMode.Initialize()
  if initialized or not EventRegistry then return end
  initialized = true
  -- Observe callbacks without adding addon frames to Blizzard's protected system list.
  EventRegistry:RegisterCallback("EditMode.Enter", EditMode.Enter, EditMode)
  EventRegistry:RegisterCallback("EditMode.Exit", EditMode.Exit, EditMode)
  local events = CreateFrame("Frame")
  events:RegisterEvent("PLAYER_REGEN_DISABLED")
  events:RegisterEvent("DISPLAY_SIZE_CHANGED")
  events:RegisterEvent("UI_SCALE_CHANGED")
  events:SetScript("OnEvent", function(_, event)
    if event == "PLAYER_REGEN_DISABLED" then
      EditMode.Exit()
    elseif not dragging then
      RR.UI.ZombakRaidPopup.ApplyPosition()
    end
  end)
  if EditModeManagerFrame and EditModeManagerFrame:IsEditModeActive() then EditMode.Enter() end
end
