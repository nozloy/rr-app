local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Group.lua
function GetUnitRole(unit, playerSpecRole)
  local role = UnitGroupRolesAssigned and UnitGroupRolesAssigned(unit) or "NONE"

  if (not role or role == "NONE") and UnitIsUnit and UnitIsUnit(unit, "player") then
    role = playerSpecRole
  end

  return NormalizeRole(role)
end

function SplitFullName(fullName)
  if type(fullName) ~= "string" or fullName == "" then
    return nil, nil
  end

  local name, realm = fullName:match("^([^-]+)%-(.+)$")
  if name and name ~= "" then
    return name, realm
  end

  return fullName, nil
end

function GetUnitNameAndRealm(unit, rosterName)
  local guid = UnitGUID and UnitGUID(unit)
  if guid and GetPlayerInfoByGUID then
    local _, _, _, _, _, guidName, guidRealm = GetPlayerInfoByGUID(guid)
    if guidName and guidName ~= "" then
      local parsedGuidName, parsedGuidRealm = SplitFullName(guidName)
      guidName = parsedGuidName or guidName
      guidRealm = guidRealm and guidRealm ~= "" and guidRealm or parsedGuidRealm
      if guidRealm then
        return guidName, guidRealm
      end
    end
  end

  local rosterPlayerName, rosterRealm = SplitFullName(rosterName)
  if rosterPlayerName and rosterPlayerName ~= "" then
    rosterRealm = rosterRealm and rosterRealm ~= "" and rosterRealm or nil
    if rosterRealm then
      return rosterPlayerName, rosterRealm
    end
  end

  local unitName, unitRealm
  if UnitFullName then
    unitName, unitRealm = UnitFullName(unit)
  end

  if (not unitName or unitName == "") and UnitName then
    unitName, unitRealm = UnitName(unit)
  end

  local parsedName, parsedRealm = SplitFullName(unitName)
  local name = parsedName or unitName
  local realm = unitRealm and unitRealm ~= "" and unitRealm or parsedRealm

  if name and name ~= "" and (not realm or realm == "") then
    local isLocalRealm = UnitIsUnit and UnitIsUnit(unit, "player")
    if (not isLocalRealm) and UnitRealmRelationship and LE_REALM_RELATION_SAME then
      isLocalRealm = UnitRealmRelationship(unit) == LE_REALM_RELATION_SAME
    end

    if isLocalRealm then
      realm = GetRealmName and GetRealmName() or nil
    end
  end

  return name, realm
end

function CompactRealmName(realm)
  if type(realm) ~= "string" then
    return nil
  end

  realm = realm:gsub("%s+", "")
  if realm == "" then
    return nil
  end

  return realm
end

function BuildCharacterKey(name, realm)
  if type(name) ~= "string" or name == "" then
    return nil
  end

  realm = CompactRealmName(realm)
  if realm then
    return name .. "-" .. realm
  end

  return name
end

function BuildCharacterKeyFromFullName(fullName)
  local name, realm = SplitFullName(fullName)
  return BuildCharacterKey(name, realm)
end

function GetPlayerCharacterKey()
  local name, realm
  if UnitFullName then
    name, realm = UnitFullName("player")
  end

  if not name or name == "" then
    name = UnitName and UnitName("player") or nil
  end

  return BuildCharacterKey(name, realm)
end

function IsSenderPlayer(sender)
  local senderKey = BuildCharacterKeyFromFullName(sender)
  local playerKey = GetPlayerCharacterKey()

  if senderKey and playerKey and senderKey == playerKey then
    return true
  end

  local senderName = SplitFullName(sender)
  local playerName = UnitName and UnitName("player") or nil
  return senderName and playerName and senderName == playerName
end

function GetDisplayCharacterName(name, realm)
  if type(name) ~= "string" or name == "" then
    return InterfaceText("unknown")
  end

  realm = CompactRealmName(realm)
  if realm then
    return name .. "-" .. realm
  end

  return name
end

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

function AddMember(members, compactMembers, rosterMembers, unit, playerSpecRole, rosterName)
  if not UnitExists(unit) then
    return
  end

  local _, classFile = UnitClass(unit)
  if not classFile then
    return
  end

  local role = GetUnitRole(unit, playerSpecRole)
  table.insert(members, classFile .. ":" .. role)
  table.insert(compactMembers, CompactClass(classFile) .. ":" .. CompactRole(role))

  if rosterMembers then
    local name, realm = GetUnitNameAndRealm(unit, rosterName)
    if name and name ~= "" and realm and realm ~= "" then
      table.insert(rosterMembers, name .. ":" .. realm .. ":" .. classFile .. ":" .. role)
    end
  end
end

function GetGroupInfo(playerSpecRole)
  local members = {}
  local compactMembers = {}
  local rosterMembers = {}
  local groupType = "solo"

  if IsInRaid and IsInRaid() then
    groupType = "raid"
    for index = 1, GetNumGroupMembers() do
      local rosterName = GetRaidRosterInfo and GetRaidRosterInfo(index)
      AddMember(members, compactMembers, rosterMembers, "raid" .. index, playerSpecRole, rosterName)
    end
  elseif IsInGroup and IsInGroup() then
    groupType = "party"
    AddMember(members, compactMembers, rosterMembers, "player", playerSpecRole)

    local partyMembers = GetNumSubgroupMembers and GetNumSubgroupMembers() or 0
    for index = 1, partyMembers do
      AddMember(members, compactMembers, rosterMembers, "party" .. index, playerSpecRole)
    end
  else
    AddMember(members, compactMembers, rosterMembers, "player", playerSpecRole)
  end

  local groupSize = #members
  if groupType ~= "solo" and GetNumGroupMembers then
    groupSize = math.max(groupSize, GetNumGroupMembers())
  end

  return groupType, groupSize, table.concat(members, ","), table.concat(compactMembers, ","), table.concat(rosterMembers, ",")
end

function GetRaidLeaderName()
  if not IsInRaid or not IsInRaid() or not UnitIsGroupLeader then
    return nil
  end

  local raidMembers = GetNumGroupMembers and GetNumGroupMembers() or 0
  for index = 1, raidMembers do
    local unit = "raid" .. index
    if UnitExists(unit) and UnitIsGroupLeader(unit) then
      return UnitName(unit)
    end
  end

  if UnitIsGroupLeader("player") then
    return UnitName("player")
  end

  return nil
end

function GetInstanceFields()
  if not GetInstanceInfo then
    return nil, nil, nil, nil
  end

  local name, instanceType, difficultyID, difficultyName = GetInstanceInfo()
  return name, instanceType, difficultyID, difficultyName
end

function GetSelectedRaidDifficulty()
  if not GetRaidDifficultyID then
    return nil, nil
  end

  local difficultyID = GetRaidDifficultyID()
  if not difficultyID or difficultyID == 0 then
    return nil, nil
  end

  local difficultyName
  if GetDifficultyInfo then
    difficultyName = GetDifficultyInfo(difficultyID)
  end

  return difficultyID, difficultyName
end

function GetOwnedKeystone()
  if not C_MythicPlus then
    return nil, nil, nil
  end

  local keyLevel = SafeCall(C_MythicPlus.GetOwnedKeystoneLevel)
  local challengeMapID = SafeCall(C_MythicPlus.GetOwnedKeystoneChallengeMapID)
  local mapName

  if challengeMapID and C_ChallengeMode and C_ChallengeMode.GetMapUIInfo then
    mapName = SafeCall(function()
      local name = C_ChallengeMode.GetMapUIInfo(challengeMapID)
      return name
    end)
  end

  return keyLevel, challengeMapID, mapName
end

function GetEquippedItemLevel()
  if not GetAverageItemLevel then
    return nil
  end

  local _, equippedItemLevel = GetAverageItemLevel()
  if not equippedItemLevel then
    return nil
  end

  return math.floor(equippedItemLevel + 0.5)
end

function GetExportFields()
  local playerName = UnitName("player")
  local raidLeaderName = GetRaidLeaderName()
  local realmName = GetRealmName and GetRealmName() or ""
  local localizedClass, classFile = UnitClass("player")
  local specName, specRole = GetPlayerSpec()
  local groupType, groupSize, members, compactMembers, roster = GetGroupInfo(specRole)
  local instanceName, instanceType, difficultyID, difficultyName = GetInstanceFields()
  local selectedRaidDifficultyID, selectedRaidDifficultyName = GetSelectedRaidDifficulty()
  local keyLevel, keyChallengeMapID, keyMapName = GetOwnedKeystone()

  return {
    classFile = classFile,
    compactMembers = compactMembers,
    difficultyID = difficultyID,
    difficultyName = difficultyName,
    groupSize = groupSize,
    groupType = groupType,
    instanceName = instanceName,
    instanceType = instanceType,
    itemLevel = GetEquippedItemLevel(),
    keyChallengeMapID = keyChallengeMapID,
    keyLevel = keyLevel,
    keyMapName = keyMapName,
    localizedClass = localizedClass,
    members = members,
    playerName = playerName,
    raidLeaderName = raidLeaderName,
    realmName = realmName,
    roster = roster,
    selectedRaidDifficultyID = selectedRaidDifficultyID,
    selectedRaidDifficultyName = selectedRaidDifficultyName,
    specName = specName,
  }
end

RR.Group.GetExportFields = GetExportFields
RR.Group.GetGroupInfo = GetGroupInfo
