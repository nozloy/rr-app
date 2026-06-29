local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Realm.lua
function GetPlayerSpec()
  if not GetSpecialization or not GetSpecializationInfo then
    return nil, nil
  end

  local specializationIndex = GetSpecialization()
  if not specializationIndex then
    return nil, nil
  end

  local _, specName, _, _, specRole = GetSpecializationInfo(specializationIndex)
  return specName, specRole
end

function NormalizeRole(role)
  if role == "TANK" or role == "HEALER" or role == "DAMAGER" then
    return role
  end

  return "NONE"
end

function CompactClass(classFile)
  return CLASS_CODES[classFile] or classFile
end

function CompactRole(role)
  return ROLE_CODES[NormalizeRole(role)] or "N"
end

function CompactGroupType(groupType)
  return GROUP_CODES[groupType] or "s"
end

function CompactInstanceType(instanceType)
  return INSTANCE_CODES[instanceType] or instanceType
end

function GetRealmRegionCode()
  local regionId = GetCurrentRegion and GetCurrentRegion()

  if regionId == 1 then
    return "u"
  end

  if regionId == 3 then
    return "e"
  end

  return nil
end

function NormalizeRealmCodeKey(realm)
  if type(realm) ~= "string" then
    return nil
  end

  realm = realm:gsub("%s+", "")
  if realm == "" then
    return nil
  end

  return realm
end

function GetRealmCodeEntry(regionCode, realm)
  local byRegion = RaidReminderRealmCodes and RaidReminderRealmCodes.byRegion and RaidReminderRealmCodes.byRegion[regionCode]
  if not byRegion then
    return nil
  end

  if type(realm) ~= "string" or realm == "" then
    return nil
  end

  local direct = byRegion[realm]
  if direct then
    return direct
  end

  local key = NormalizeRealmCodeKey(realm)
  if not key then
    return nil
  end

  return byRegion[key] or byRegion[string.lower(key)]
end

function HasCyrillicText(value)
  if type(value) ~= "string" then
    return false
  end

  local index = 1
  local length = string.len(value)
  while index < length do
    local first, second = string.byte(value, index, index + 1)
    if first and second and first >= 208 and first <= 211 and second >= 128 and second <= 191 then
      return true
    end
    index = index + 1
  end

  return false
end

function GetWhisperLocale(entry)
  if entry then
    local realmEntry = GetRealmCodeEntry(GetRealmRegionCode(), entry.realm)
    if realmEntry and realmEntry[4] then
      return realmEntry[4]
    end
  end

  if entry and (HasCyrillicText(entry.name) or HasCyrillicText(entry.displayName)) then
    return "ruRU"
  end

  return "enUS"
end
