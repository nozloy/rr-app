local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Gear.lua
function ApplyRaidCheckResult(entry, killedBosses, errorText)
  if not entry then
    return
  end

  entry.hasAddon = true
  entry.killedBosses = killedBosses or {}

  if errorText then
    entry.status = RAID_CHECK_STATUS.unavailable
  elseif #entry.killedBosses > 0 then
    entry.status = RAID_CHECK_STATUS.hasLockout
  else
    entry.status = RAID_CHECK_STATUS.clean
  end
end

function ApplyLocalRaidCheckResult(requestId)
  if not raidCheckState or raidCheckState.requestId ~= requestId then
    return
  end

  local entry = raidCheckState.localEntry
  if not entry then
    return
  end

  local killedBosses, errorText = GetKilledBossesForRaid(
    raidCheckState.target.raidName,
    raidCheckState.target.difficultyId
  )
  ApplyRaidCheckResult(entry, killedBosses, errorText)
  RenderRaidCheckRows()
end

function GetItemLinkFields(itemLink)
  local itemString = type(itemLink) == "string" and itemLink:match("item:([^|]+)") or nil
  if not itemString then
    return {}
  end

  local fields = {}
  for value in (itemString .. ":"):gmatch("([^:]*):") do
    table.insert(fields, value)
    if #fields >= 8 then
      break
    end
  end

  return fields
end

function HasPermanentEnchant(itemLink)
  local fields = GetItemLinkFields(itemLink)
  local enchantId = tonumber(fields[2])
  return enchantId and enchantId > 0
end

function CountFilledGemFields(itemLink)
  local fields = GetItemLinkFields(itemLink)
  local count = 0
  for fieldIndex = 3, 6 do
    local gemId = tonumber(fields[fieldIndex])
    if gemId and gemId > 0 then
      count = count + 1
    end
  end

  return count
end

function IsWeaponItemLink(itemLink)
  if not itemLink then
    return false
  end

  if not GetItemInfoInstant then
    return true
  end

  local _, _, _, equipLoc, _, classId = GetItemInfoInstant(itemLink)
  local weaponClass = Enum and Enum.ItemClass and Enum.ItemClass.Weapon or LE_ITEM_CLASS_WEAPON or 2
  return classId == weaponClass or equipLoc == "INVTYPE_WEAPON" or equipLoc == "INVTYPE_WEAPONOFFHAND"
end

function GetItemStatsTable(itemLink)
  if not itemLink then
    return nil
  end

  if C_Item and C_Item.GetItemStats then
    return SafeCall(function()
      return C_Item.GetItemStats(itemLink)
    end)
  end

  if GetItemStats then
    return SafeCall(function()
      return GetItemStats(itemLink)
    end)
  end

  return nil
end

function GetSocketCountFromStats(itemLink)
  local count = 0
  local stats = GetItemStatsTable(itemLink)
  if type(stats) == "table" then
    for statName, statValue in pairs(stats) do
      if type(statName) == "string" and statName:find("EMPTY_SOCKET_", 1, true) then
        count = count + (tonumber(statValue) or 1)
      end
    end
  end

  return count
end

function GetTooltipEmptySocketCount(itemLink)
  if not itemLink or not GameTooltip then
    return 0
  end

  if not inspectTooltip then
    inspectTooltip = CreateFrame("GameTooltip", "RaidReminderInspectTooltip", nil, "GameTooltipTemplate")
  end

  inspectTooltip:SetOwner(UIParent, "ANCHOR_NONE")
  inspectTooltip:ClearLines()
  inspectTooltip:SetHyperlink(itemLink)

  local emptySocketText = LocalText("EMPTY_SOCKET", InterfaceText("emptySocket"))
  local count = 0
  for lineIndex = 1, inspectTooltip:NumLines() do
    local line = _G["RaidReminderInspectTooltipTextLeft" .. lineIndex]
    local text = line and line:GetText()
    if text and emptySocketText and text:find(emptySocketText, 1, true) then
      count = count + 1
    end
  end

  inspectTooltip:Hide()
  return count
end

function GetEmptySocketCount(itemLink)
  local tooltipEmptySockets = GetTooltipEmptySocketCount(itemLink)
  if tooltipEmptySockets > 0 then
    return tooltipEmptySockets
  end

  local socketCount = GetSocketCountFromStats(itemLink)
  return math.max(socketCount - CountFilledGemFields(itemLink), 0)
end

function GetGearSlotLabel(slotInfo)
  return InterfaceText(slotInfo.textKey)
end

function GetDetailedItemLevel(itemLink)
  if not itemLink then
    return nil
  end

  local itemLevel
  if C_Item and C_Item.GetDetailedItemLevelInfo then
    itemLevel = SafeCall(function()
      return C_Item.GetDetailedItemLevelInfo(itemLink)
    end)
  elseif GetDetailedItemLevelInfo then
    itemLevel = SafeCall(function()
      return GetDetailedItemLevelInfo(itemLink)
    end)
  end

  itemLevel = tonumber(itemLevel)
  if itemLevel and itemLevel > 0 then
    return itemLevel
  end

  return nil
end

function CalculateUnitItemLevel(unit)
  if not GetInventoryItemLink then
    return nil
  end

  local total = 0
  local count = 0
  for _, slotId in ipairs(ITEM_LEVEL_SLOTS) do
    local itemLink = GetInventoryItemLink(unit, slotId)
    local itemLevel = GetDetailedItemLevel(itemLink)
    if itemLevel then
      total = total + itemLevel
      count = count + 1
    end
  end

  if count == 0 then
    return nil
  end

  return math.floor((total / count) + 0.5)
end

function ApplyUninspectableGearResult(entry)
  if not entry then
    return
  end

  entry.missingEnchants = {}
  entry.missingEnchantSlotKeys = {}
  entry.emptyGemSlots = {}
  entry.enchantStatus = GEAR_CHECK_STATUS.notChecked
  entry.gemStatus = GEAR_CHECK_STATUS.notChecked
end

function AnalyzeUnitGear(unit)
  local missingEnchants = {}
  local missingEnchantSlotKeys = {}
  local emptyGemSlots = {}
  local seenItemLinks = 0

  for _, slotInfo in ipairs(ENCHANT_SLOTS) do
    local itemLink = GetInventoryItemLink and GetInventoryItemLink(unit, slotInfo.slotId)
    if itemLink then
      seenItemLinks = seenItemLinks + 1
      local shouldRequireEnchant = true
      if slotInfo.weaponOnly then
        shouldRequireEnchant = IsWeaponItemLink(itemLink)
      end

      if shouldRequireEnchant and not HasPermanentEnchant(itemLink) then
        table.insert(missingEnchants, GetGearSlotLabel(slotInfo))
        table.insert(missingEnchantSlotKeys, slotInfo.textKey)
      end
    end
  end

  for _, slotInfo in ipairs(GEM_SCAN_SLOTS) do
    local itemLink = GetInventoryItemLink and GetInventoryItemLink(unit, slotInfo.slotId)
    if itemLink then
      seenItemLinks = seenItemLinks + 1
      local emptySocketCount = GetEmptySocketCount(itemLink)
      if emptySocketCount > 0 then
        table.insert(emptyGemSlots, {
          count = emptySocketCount,
          slotName = GetGearSlotLabel(slotInfo),
          textKey = slotInfo.textKey,
        })
      end
    end
  end

  return {
    emptyGemSlots = emptyGemSlots,
    missingEnchantSlotKeys = missingEnchantSlotKeys,
    missingEnchants = missingEnchants,
    seenItemLinks = seenItemLinks,
  }
end

function ApplyGearResult(entry, unit)
  if not entry then
    return
  end

  entry.itemLevel = CalculateUnitItemLevel(unit)
  if UnitIsUnit and UnitIsUnit(unit, "player") and GetEquippedItemLevel then
    entry.itemLevel = GetEquippedItemLevel() or entry.itemLevel
  end

  local result = AnalyzeUnitGear(unit)
  if result.seenItemLinks == 0 then
    ApplyUninspectableGearResult(entry)
    return
  end

  entry.missingEnchants = result.missingEnchants
  entry.missingEnchantSlotKeys = result.missingEnchantSlotKeys
  entry.emptyGemSlots = result.emptyGemSlots
  entry.enchantStatus = CountList(entry.missingEnchants) > 0 and GEAR_CHECK_STATUS.issue or GEAR_CHECK_STATUS.ready
  entry.gemStatus = CountList(entry.emptyGemSlots) > 0 and GEAR_CHECK_STATUS.issue or GEAR_CHECK_STATUS.ready
end

function ResetInspectQueue(token)
  if inspectQueue.active and ClearInspectPlayer then
    ClearInspectPlayer()
  end

  inspectQueue.token = token
  inspectQueue.queue = {}
  inspectQueue.active = nil
end

function FinishActiveInspect()
  if ClearInspectPlayer then
    ClearInspectPlayer()
  end

  inspectQueue.active = nil
end

ProcessNextInspect = nil

function ScheduleNextInspect()
  if C_Timer and C_Timer.After then
    C_Timer.After(INSPECT_DELAY, ProcessNextInspect)
  else
    ProcessNextInspect()
  end
end

function RetryOrFailInspect(active)
  if not active or not active.entry then
    FinishActiveInspect()
    ScheduleNextInspect()
    return
  end

  local entry = active.entry
  FinishActiveInspect()

  if active.attempt < INSPECT_MAX_ATTEMPTS then
    entry.inspectAttempt = active.attempt + 1
    table.insert(inspectQueue.queue, 1, entry)
  else
    ApplyUninspectableGearResult(entry)
    RenderRaidCheckRows()
  end

  ScheduleNextInspect()
end

function HandleInspectTimeout(token, guid)
  local active = inspectQueue.active
  if not active or inspectQueue.token ~= token then
    return
  end

  if guid and active.guid and active.guid ~= guid then
    return
  end

  RetryOrFailInspect(active)
end

ProcessNextInspect = function()
  if inspectQueue.active or not raidCheckState or inspectQueue.token ~= raidCheckState.requestId then
    return
  end

  local entry = table.remove(inspectQueue.queue, 1)
  if not entry then
    return
  end

  local unit = entry.unit
  if not UnitExists or not UnitExists(unit) or (UnitIsConnected and not UnitIsConnected(unit)) then
    ApplyUninspectableGearResult(entry)
    RenderRaidCheckRows()
    ScheduleNextInspect()
    return
  end

  if not CanInspect or not NotifyInspect or not CanInspect(unit, false) then
    ApplyUninspectableGearResult(entry)
    RenderRaidCheckRows()
    ScheduleNextInspect()
    return
  end

  local guid = UnitGUID and UnitGUID(unit)
  local token = inspectQueue.token
  inspectQueue.active = {
    attempt = entry.inspectAttempt or 1,
    entry = entry,
    guid = guid,
    token = token,
    unit = unit,
  }

  NotifyInspect(unit)

  if C_Timer and C_Timer.After then
    C_Timer.After(INSPECT_TIMEOUT, function()
      HandleInspectTimeout(token, guid)
    end)
  end
end

function StartRaidInspectScan(state, scanMode)
  ResetInspectQueue(state and state.requestId or nil)
  if not state or not state.entries then
    return
  end

  scanMode = scanMode or GEAR_SCAN_MODE.full
  local playerKey = GetPlayerCharacterKey()
  for _, entry in ipairs(state.entries) do
    if ShouldInspectGear(entry, scanMode) then
      entry.inspectAttempt = 1
      if entry.key == playerKey or (UnitIsUnit and entry.unit and UnitIsUnit(entry.unit, "player")) then
        ApplyGearResult(entry, "player")
      else
        entry.enchantStatus = GEAR_CHECK_STATUS.pending
        entry.gemStatus = GEAR_CHECK_STATUS.pending
        table.insert(inspectQueue.queue, entry)
      end
    end
  end

  RenderRaidCheckRows()
  ScheduleNextInspect()
end

function HandleInspectReady(guid)
  local active = inspectQueue.active
  if not active or not raidCheckState or active.token ~= raidCheckState.requestId then
    return
  end

  if guid and active.guid and active.guid ~= guid then
    return
  end

  ApplyGearResult(active.entry, active.unit)
  FinishActiveInspect()
  RenderRaidCheckRows()
  ScheduleNextInspect()
end

RR.Gear.StartInspectScan = StartRaidInspectScan
RR.Gear.HandleInspectReady = HandleInspectReady
