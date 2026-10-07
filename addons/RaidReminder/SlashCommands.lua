local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- SlashCommands.lua
_G.SLASH_RAIDREMINDER1 = "/rr"
_G.SLASH_RAIDREMINDER2 = "/raidreminder"
SlashCmdList.RAIDREMINDER = function(message)
  local command = (message or ""):match("^%s*(%S+)")
  if command == "testzombak" then
    RR.ZombakRaids.TestPopup()
  elseif command == "zombakstatus" then
    RR.Comm.PrintZombakStatus()
  elseif command == "debug" then
    RR.State.debugZombak = not RR.State.debugZombak
    print("[RR] " .. InterfaceText(RR.State.debugZombak and "zombakDebugOn" or "zombakDebugOff"))
  elseif command == "settings" then
    if RR.Options.category then
      Settings.OpenToCategory(RR.Options.category:GetID())
    end
  else
    RR.UI.ShowExportFrame()
  end
end

_G.SLASH_RAIDREMINDER_RAIDS1 = "/rraid"
SlashCmdList.RAIDREMINDER_RAIDS = RR.UI.ShowRaidLockoutFrame

print(string.format(InterfaceText("loadMessage"), ADDON_NAME))
