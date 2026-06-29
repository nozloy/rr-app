local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Util.lua
function BringExportFrameToFront()
  if not frame then
    return
  end

  frame:SetFrameStrata(WINDOW_FRAME_STRATA)
  frame:SetFrameLevel(WINDOW_FRAME_LEVEL)

  if frame.SetToplevel then
    frame:SetToplevel(true)
  end

  if frame.Raise then
    frame:Raise()
  end
end

function UrlEncode(value)
  value = tostring(value or "")
  value = value:gsub("\n", "\r\n")
  value = value:gsub("([^%w%-_%.~])", function(character)
    return string.format("%%%02X", string.byte(character))
  end)

  return value
end

function AddParam(params, key, value)
  if value == nil or value == "" then
    return
  end

  table.insert(params, key .. "=" .. UrlEncode(value))
end

function SafeCall(callback)
  if type(callback) ~= "function" then
    return nil
  end

  local ok, result = pcall(callback)
  if ok then
    return result
  end

  return nil
end

function SetTextColor(fontString, colorName)
  local color = STATUS_COLORS[colorName] or STATUS_COLORS.white
  fontString:SetTextColor(color[1], color[2], color[3])
end

function GetClassColor(classFile)
  local color = RAID_CLASS_COLORS and RAID_CLASS_COLORS[classFile]
  if color then
    return color.r or 1, color.g or 1, color.b or 1
  end

  return 0.92, 0.88, 0.78
end

function JoinList(values, separator)
  if not values or #values == 0 then
    return ""
  end

  return table.concat(values, separator or ", ")
end

function CountList(values)
  if type(values) ~= "table" then
    return 0
  end

  return #values
end

function SetFrameShown(frameToSet, isShown)
  if not frameToSet then
    return
  end

  if isShown then
    frameToSet:Show()
  else
    frameToSet:Hide()
  end
end

function PlayRaidReminderSound(soundName)
  if not PlaySound or not SOUNDKIT then
    return
  end

  local sound = SOUNDKIT[soundName]
  if sound then
    PlaySound(sound)
  end
end

function RegisterSpecialFrame(frameName)
  if type(frameName) ~= "string" or frameName == "" or not UISpecialFrames then
    return
  end

  for _, existingFrameName in ipairs(UISpecialFrames) do
    if existingFrameName == frameName then
      return
    end
  end

  table.insert(UISpecialFrames, frameName)
end

function BringRaidLockoutFrameToFront()
  if not raidLockoutFrame then
    return
  end

  raidLockoutFrame:SetFrameStrata(WINDOW_FRAME_STRATA)
  raidLockoutFrame:SetFrameLevel(WINDOW_FRAME_LEVEL)

  if raidLockoutFrame.SetToplevel then
    raidLockoutFrame:SetToplevel(true)
  end

  if raidLockoutFrame.Raise then
    raidLockoutFrame:Raise()
  end
end
