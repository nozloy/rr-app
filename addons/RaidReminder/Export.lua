local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Export.lua
function BuildCompactRoster(roster, regionCode)
  if type(roster) ~= "string" or roster == "" then
    return nil
  end

  local compactRoster = {}
  for part in string.gmatch(roster, "([^,]+)") do
    local name, realm, classFile, role = part:match("^([^:]+):([^:]+):([^:]+):([^:]+)$")
    if not name or not realm or not classFile then
      return nil
    end

    local realmEntry = GetRealmCodeEntry(regionCode, realm)
    if not realmEntry then
      return nil
    end

    table.insert(compactRoster, name .. ":" .. realmEntry[1] .. ":" .. CompactClass(classFile) .. ":" .. CompactRole(role))
  end

  return table.concat(compactRoster, ",")
end

function BuildRR2ExportString(fields)
  local regionCode = GetRealmRegionCode()
  if not regionCode then
    return nil
  end

  local realmEntry = GetRealmCodeEntry(regionCode, fields.realmName)
  if not realmEntry then
    return nil
  end

  local compactRoster = BuildCompactRoster(fields.roster, regionCode)
  if fields.roster and fields.roster ~= "" and not compactRoster then
    return nil
  end

  local params = {}
  AddParam(params, "rg", regionCode)
  AddParam(params, "n", fields.playerName)
  AddParam(params, "l", fields.raidLeaderName)
  AddParam(params, "r", realmEntry[1])
  AddParam(params, "c", CompactClass(fields.classFile))
  AddParam(params, "i", fields.itemLevel)
  AddParam(params, "g", CompactGroupType(fields.groupType))
  AddParam(params, "z", fields.groupSize)
  AddParam(params, "m", fields.compactMembers)
  AddParam(params, "ro", compactRoster)
  AddParam(params, "t", CompactInstanceType(fields.instanceType))
  AddParam(params, "in", fields.instanceName)
  AddParam(params, "di", fields.difficultyID)
  AddParam(params, "sr", fields.selectedRaidDifficultyID)
  AddParam(params, "kl", fields.keyLevel)
  AddParam(params, "km", fields.keyChallengeMapID)
  AddParam(params, "kn", fields.keyMapName)

  return RR2_EXPORT_PREFIX .. table.concat(params, "&")
end

function BuildLegacyExportString(fields)
  fields = fields or GetExportFields()

  local params = {}
  AddParam(params, "name", fields.playerName)
  AddParam(params, "raidLeaderName", fields.raidLeaderName)
  AddParam(params, "realm", fields.realmName)
  AddParam(params, "classFile", fields.classFile)
  AddParam(params, "className", fields.localizedClass)
  AddParam(params, "spec", fields.specName)
  AddParam(params, "ilvl", fields.itemLevel)
  AddParam(params, "groupType", fields.groupType)
  AddParam(params, "groupSize", fields.groupSize)
  AddParam(params, "members", fields.members)
  AddParam(params, "roster", fields.roster)
  AddParam(params, "instanceType", fields.instanceType)
  AddParam(params, "instanceName", fields.instanceName)
  AddParam(params, "difficultyID", fields.difficultyID)
  AddParam(params, "difficultyName", fields.difficultyName)
  AddParam(params, "selectedRaidDifficultyID", fields.selectedRaidDifficultyID)
  AddParam(params, "selectedRaidDifficultyName", fields.selectedRaidDifficultyName)
  AddParam(params, "keyLevel", fields.keyLevel)
  AddParam(params, "keyChallengeMapID", fields.keyChallengeMapID)
  AddParam(params, "keyMapName", fields.keyMapName)

  return EXPORT_PREFIX .. table.concat(params, "&")
end

function BuildExportString(fields)
  fields = fields or GetExportFields()

  return BuildRR2ExportString(fields) or BuildLegacyExportString(fields)
end

RR.Export.BuildExportString = BuildExportString
