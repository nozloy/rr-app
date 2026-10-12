local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

function GetRaidCheckChoices()
  if not EJ_GetNumTiers or not EJ_GetCurrentTier or not EJ_SelectTier or not EJ_GetInstanceByIndex
    or not EJ_SelectInstance or not EJ_IsValidInstanceDifficulty or not GetDifficultyInfo then return {} end
  local oldTier = EJ_GetCurrentTier()
  local oldDifficulty = EJ_GetDifficulty and EJ_GetDifficulty()
  local oldMap = EJ_GetInstanceInfo and select(10, EJ_GetInstanceInfo())
  local oldInstance = oldMap and C_EncounterJournal and C_EncounterJournal.GetInstanceForGameMap and
    C_EncounterJournal.GetInstanceForGameMap(oldMap)
  local difficulties, seenDifficulties = {}, {}
  local function addDifficulty(id)
    local name, instanceType = GetDifficultyInfo(id)
    if name and instanceType == "raid" and not seenDifficulties[id] then
      difficulties[#difficulties + 1], seenDifficulties[id] = id, true
    end
  end
  -- Use the client's difficulty catalogue, including any newly added raid modes.
  for _, id in pairs(DifficultyUtil and DifficultyUtil.ID or {}) do
    if type(id) == "number" then addDifficulty(id) end
  end
  if #difficulties == 0 then
    for _, id in ipairs({ 3, 4, 5, 6, 7, 9, 14, 15, 16, 17, 33 }) do addDifficulty(id) end
  end
  table.sort(difficulties)
  local tiers, seenInstances = {}, {}
  local ok = pcall(function()
    for tierIndex = EJ_GetNumTiers(), 1, -1 do
      EJ_SelectTier(tierIndex)
      local tier = { name = EJ_GetTierInfo(tierIndex), raids = {} }
      for index = 1, 100 do
        local journalID, name, _, _, _, _, _, _, _, _, mapID = EJ_GetInstanceByIndex(index, true)
        if not journalID then break end
        if not seenInstances[journalID] then
          seenInstances[journalID] = true
          EJ_SelectInstance(journalID)
          local raid = { name = name, targets = {} }
          for _, difficultyId in ipairs(difficulties) do
            local valid = EJ_IsValidInstanceDifficulty(difficultyId)
            if valid and difficultyId > 64 then
              valid = C_EncounterJournal and C_EncounterJournal.InstanceHasDifficultyID and
                C_EncounterJournal.InstanceHasDifficultyID(difficultyId)
            end
            if valid then
              local difficultyName = GetDifficultyInfo(difficultyId)
              if difficultyId < 14 and DifficultyUtil and DifficultyUtil.GetMaxPlayers then
                difficultyName = difficultyName .. " (" .. DifficultyUtil.GetMaxPlayers(difficultyId) .. ")"
              end
              raid.targets[#raid.targets + 1] = { raidName = name, instanceID = mapID,
                difficultyId = difficultyId, difficultyName = difficultyName }
            end
          end
          if #raid.targets > 0 then tier.raids[#tier.raids + 1] = raid end
        end
      end
      if #tier.raids > 0 then tiers[#tiers + 1] = tier end
    end
  end)
  -- Do not leave the player's Adventure Guide on the last enumerated raid.
  if oldTier then pcall(EJ_SelectTier, oldTier) end
  if oldInstance then pcall(EJ_SelectInstance, oldInstance) end
  if oldDifficulty and EJ_SetDifficulty then pcall(EJ_SetDifficulty, oldDifficulty) end
  return ok and tiers or {}
end

function SelectRaidCheckTarget(target)
  if GetRaidCheckGroupType() ~= "raid" or select(2, GetInstanceFields()) == "raid" then return end
  raidCheckSelectedTarget = target
  RR.Readiness.Refresh(GetExportFields(), GEAR_SCAN_MODE.full)
end

function ShowRaidCheckTargetMenu(owner)
  if not MenuUtil or not MenuUtil.CreateContextMenu then return end
  local choices = GetRaidCheckChoices()
  MenuUtil.CreateContextMenu(owner, function(_, root)
    root:CreateTitle(InterfaceText("chooseRaidTarget"))
    root:CreateRadio(InterfaceText("automaticRaidTarget"), function() return not raidCheckSelectedTarget end,
      function() SelectRaidCheckTarget(nil) end)
    if #choices == 0 then root:CreateTitle(InterfaceText("raidCatalogueUnavailable")); return end
    for _, tier in ipairs(choices) do
      local tierMenu = root:CreateButton(tier.name)
      for _, raid in ipairs(tier.raids) do
        local raidMenu = tierMenu:CreateButton(raid.name)
        for _, target in ipairs(raid.targets) do
          raidMenu:CreateRadio(target.difficultyName, function(value)
            return RaidCheckTargetsMatch(raidCheckSelectedTarget, value)
          end, SelectRaidCheckTarget, target)
        end
      end
    end
  end)
end
