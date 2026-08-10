local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Comm.lua
function CleanAddonMessageField(value)
  value = tostring(value or "")
  return value:gsub(ADDON_MESSAGE_SEPARATOR, " ")
end

function BuildAddonMessage(...)
  local parts = {}
  for index = 1, select("#", ...) do
    parts[index] = CleanAddonMessageField(select(index, ...))
  end

  return table.concat(parts, ADDON_MESSAGE_SEPARATOR)
end

function SplitAddonMessage(message)
  local parts = {}
  message = tostring(message or "") .. ADDON_MESSAGE_SEPARATOR

  for part in message:gmatch("([^" .. ADDON_MESSAGE_SEPARATOR .. "]*)" .. ADDON_MESSAGE_SEPARATOR) do
    table.insert(parts, part)
  end

  return parts
end

function RegisterAddonMessages()
  if addonMessagePrefixRegistered then
    return
  end

  if C_ChatInfo and C_ChatInfo.RegisterAddonMessagePrefix then
    addonMessagePrefixRegistered = C_ChatInfo.RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX) ~= false
  elseif RegisterAddonMessagePrefix then
    addonMessagePrefixRegistered = RegisterAddonMessagePrefix(ADDON_MESSAGE_PREFIX) ~= false
  end
end

function SendRaidReminderAddonMessage(message, distribution, target)
  RegisterAddonMessages()

  if not distribution then
    return false
  end

  if C_ChatInfo and C_ChatInfo.SendAddonMessage then
    return C_ChatInfo.SendAddonMessage(ADDON_MESSAGE_PREFIX, message, distribution, target)
  end

  if SendAddonMessage then
    return SendAddonMessage(ADDON_MESSAGE_PREFIX, message, distribution, target)
  end

  return false
end

function GetGroupAddonDistribution()
  if IsInGroup and LE_PARTY_CATEGORY_INSTANCE and IsInGroup(LE_PARTY_CATEGORY_INSTANCE) then
    return "INSTANCE_CHAT"
  end

  if IsInRaid and IsInRaid() then
    return "RAID"
  end

  if IsInGroup and IsInGroup() then
    return "PARTY"
  end

  return nil
end

function HandleRaidCheckAddonMessage(prefix, message, _, sender)
  if prefix ~= ADDON_MESSAGE_PREFIX or type(message) ~= "string" or not sender then
    return
  end

  RegisterAddonMessages()

  local parts = SplitAddonMessage(message)
  local command = parts[1]
  if command == "REQ" then
    HandleRaidCheckRequest(sender, parts)
  elseif command == "RSP" and not IsSenderPlayer(sender) then
    HandleRaidCheckResponse(sender, parts)
  elseif command == "BOS" and not IsSenderPlayer(sender) then
    HandleRaidCheckBoss(sender, parts)
  end
end

RR.Comm.RegisterAddonMessages = RegisterAddonMessages
RR.Comm.HandleAddonMessage = HandleRaidCheckAddonMessage
