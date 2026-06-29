local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- SlashCommands.lua
_G.SLASH_RAIDREMINDER1 = "/rr"
_G.SLASH_RAIDREMINDER2 = "/raidreminder"
SlashCmdList.RAIDREMINDER = ShowExportFrame

_G.SLASH_RAIDREMINDER_RAIDS1 = "/rraid"
SlashCmdList.RAIDREMINDER_RAIDS = ShowRaidLockoutFrame

print(string.format(InterfaceText("loadMessage"), ADDON_NAME))
