local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Events.lua
raidCheckEventFrame = CreateFrame("Frame")
raidCheckEventFrame:RegisterEvent("PLAYER_LOGIN")
raidCheckEventFrame:RegisterEvent("CHAT_MSG_ADDON")
raidCheckEventFrame:RegisterEvent("GROUP_ROSTER_UPDATE")
raidCheckEventFrame:RegisterEvent("UPDATE_INSTANCE_INFO")
raidCheckEventFrame:RegisterEvent("INSPECT_READY")
raidCheckEventFrame:SetScript("OnEvent", function(_, event, ...)
  if event == "PLAYER_LOGIN" then
    RegisterAddonMessages()
  elseif event == "CHAT_MSG_ADDON" then
    HandleRaidCheckAddonMessage(...)
  elseif event == "INSPECT_READY" then
    HandleInspectReady(...)
  elseif event == "GROUP_ROSTER_UPDATE" then
    if frame and frame:IsShown() then
      RefreshRaidCheck(GetExportFields(), GEAR_SCAN_MODE.roster)
    end
  elseif event == "UPDATE_INSTANCE_INFO" then
    if frame and frame:IsShown() then
      local groupType = GetRaidCheckGroupType()
      if groupType ~= "raid" then
        if raidCheckState and raidCheckState.checksLockout then
          raidCheckState = nil
          ResetInspectQueue(nil)
          RenderRaidCheckRows(InterfaceText("groupReadinessNoGroup"))
        end
        return
      end

      local fields = GetExportFields()
      local target = GetRaidCheckTarget(fields)
      if target and (not raidCheckState or not RaidCheckTargetsMatch(raidCheckState.target, target)) then
        RefreshRaidCheck(fields, GEAR_SCAN_MODE.full)
      elseif raidCheckState and raidCheckState.target then
        ApplyLocalRaidCheckResult(raidCheckState.requestId)
      end
    end
  end
end)

RegisterAddonMessages()
