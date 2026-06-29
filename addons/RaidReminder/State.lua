local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- State.lua
frame = nil
editBox = nil
raidCheckLabel = nil
raidCheckTargetText = nil
raidCheckHeader = nil
raidCheckContent = nil
raidCheckScrollFrame = nil
raidCheckStatus = nil
raidCheckRows = {}
raidCheckState = nil
raidCheckRequestSerial = 0
addonMessagePrefixRegistered = false
raidCheckShowProblemsOnly = false
raidCheckShowAddonOnly = false
raidCheckProblemFilter = nil
raidCheckAddonFilter = nil
raidCheckNoRaidPanel = nil
raidCheckSummary = {}
raidCheckExportPanel = nil
raidCheckTablePanel = nil
raidCheckEventFrame = nil
inspectTooltip = nil
inspectQueue = {
  active = nil,
  queue = {},
  token = nil,
}
raidLockoutFrame = nil
raidLockoutContent = nil
raidLockoutStatus = nil
raidLockoutRows = {}
raidLockoutEventFrame = nil
