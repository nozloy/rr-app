local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Events.lua
raidCheckEventFrame = CreateFrame("Frame")
raidCheckEventFrame:RegisterEvent("ADDON_LOADED")
raidCheckEventFrame:RegisterEvent("PLAYER_LOGIN")
raidCheckEventFrame:RegisterEvent("PLAYER_ENTERING_WORLD")
raidCheckEventFrame:RegisterEvent("CHANNEL_UI_UPDATE")
raidCheckEventFrame:RegisterEvent("LFG_LIST_ACTIVE_ENTRY_UPDATE")
raidCheckEventFrame:RegisterEvent("LFG_LIST_SEARCH_RESULTS_RECEIVED")
raidCheckEventFrame:RegisterEvent("LFG_LIST_SEARCH_RESULT_UPDATED")
raidCheckEventFrame:RegisterEvent("LFG_LIST_SEARCH_FAILED")
raidCheckEventFrame:RegisterEvent("LFG_LIST_APPLICATION_STATUS_UPDATED")
raidCheckEventFrame:RegisterEvent("PLAYER_REGEN_DISABLED")
raidCheckEventFrame:RegisterEvent("PLAYER_REGEN_ENABLED")
raidCheckEventFrame:RegisterEvent("CHAT_MSG_ADDON")
raidCheckEventFrame:RegisterEvent("GROUP_ROSTER_UPDATE")
raidCheckEventFrame:RegisterEvent("UPDATE_INSTANCE_INFO")
raidCheckEventFrame:RegisterEvent("INSPECT_READY")
raidCheckEventFrame:SetScript("OnEvent", function(_, event, ...)
  if event == "ADDON_LOADED" then
    if ... == ADDON_NAME then
      RR.Options.Initialize()
    end
  elseif event == "PLAYER_LOGIN" then
    RR.UI.ZombakRaidEditMode.Initialize()
    RR.Comm.RegisterAddonMessages()
    RR.Comm.UpdateZombakSubscription()
  elseif event == "PLAYER_ENTERING_WORLD" then
    RR.Comm.UpdateZombakSubscription()
  elseif event == "CHANNEL_UI_UPDATE" then
    RR.Comm.HandleChannelUpdate()
  elseif event == "LFG_LIST_ACTIVE_ENTRY_UPDATE" then
    RR.ZombakRaids.HandleActiveEntryUpdate(...)
  elseif event == "LFG_LIST_SEARCH_RESULTS_RECEIVED" then
    RR.ZombakRaids.HandleSearchResults()
  elseif event == "LFG_LIST_SEARCH_RESULT_UPDATED" then
    RR.ZombakRaids.HandleResultUpdated(...)
  elseif event == "LFG_LIST_SEARCH_FAILED" then
    RR.ZombakRaids.HandleSearchFailed(...)
  elseif event == "LFG_LIST_APPLICATION_STATUS_UPDATED" then
    RR.ZombakRaids.HandleApplicationStatus(...)
  elseif event == "PLAYER_REGEN_DISABLED" or event == "PLAYER_REGEN_ENABLED" then
    RR.ZombakRaids.RefreshPopup()
  elseif event == "CHAT_MSG_ADDON" then
    RR.Comm.HandleAddonMessage(...)
  elseif event == "INSPECT_READY" then
    RR.Gear.HandleInspectReady(...)
  elseif event == "GROUP_ROSTER_UPDATE" then
    if frame and frame:IsShown() then
      RR.Readiness.Refresh(RR.Group.GetExportFields(), GEAR_SCAN_MODE.roster)
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
        RR.Readiness.Refresh(fields, GEAR_SCAN_MODE.full)
      elseif raidCheckState and raidCheckState.target then
        ApplyLocalRaidCheckResult(raidCheckState.requestId)
      end
    end
  end
end)

RR.Comm.RegisterAddonMessages()
