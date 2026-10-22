local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

local Diagnostics = {}
RR.Diagnostics = Diagnostics
local MAX_ENTRIES = 600
local entries = {}
local session = "loading"
local character = "loading"
local initialized = false
local changes = {}
local counters = {}
local lastHealthAt, lastHealth = 0, nil
local errors = 0

-- Never stringify a secret value, retain message bodies, or interpret chat markup.
local function Safe(value)
  if issecretvalue and issecretvalue(value) then return "<secret>" end
  local kind = type(value)
  if kind ~= "string" and kind ~= "number" and kind ~= "boolean" and kind ~= "nil" then
    return "<" .. kind .. ">"
  end
  return tostring(value):gsub("[%c|]", " "):sub(1, 240)
end
Diagnostics.Safe = Safe

local function Details(fields)
  local keys, result = {}, {}
  for key in pairs(fields or {}) do
    if type(key) == "string" then keys[#keys + 1] = key end
  end
  table.sort(keys)
  for _, key in ipairs(keys) do result[#result + 1] = Safe(key) .. "=" .. Safe(fields[key]) end
  return table.concat(result, " "):sub(1, 900)
end

local function Append(event, details)
  local now = GetServerTime()
  local stamp = date and date("!%Y-%m-%dT%H:%M:%SZ", now) or tostring(now)
  entries[#entries + 1] = string.format("%s t=%d up=%.3f s=%s p=%s %s %s",
    stamp, now, GetTime(), session, character, Safe(event), details)
  while #entries > MAX_ENTRIES do table.remove(entries, 1) end
  counters[event] = (counters[event] or 0) + 1
end

-- Diagnostic failures must not interrupt delivery, UI, or protected button handlers.
function Diagnostics.Record(event, fields)
  local ok = pcall(function() Append(event, Details(fields)) end)
  if not ok then errors = errors + 1 end
end

function Diagnostics.Change(key, event, fields)
  local ok = pcall(function()
    local details = Details(fields)
    if changes[key] ~= details then
      changes[key] = details
      Append(event, details)
    end
  end)
  if not ok then errors = errors + 1 end
end

function Diagnostics.Initialize()
  if initialized or not RR.DB then return end
  initialized = true
  local saved = RR.DB.zombakDiagnostics
  if type(saved) ~= "table" or saved.version ~= 1 then saved = {} end
  local previous, pending = saved.entries, entries
  entries = {}
  if type(previous) == "table" then
    for i = math.max(1, #previous - MAX_ENTRIES + 1), #previous do
      if type(previous[i]) == "string" then
        entries[#entries + 1] = previous[i]:gsub("[%c|]", " "):sub(1, 1200)
      end
    end
  end
  for _, line in ipairs(pending) do entries[#entries + 1] = line end
  local sequence = saved.sequence
  sequence = type(sequence) == "number" and sequence >= 0 and sequence < 1000000000 and math.floor(sequence) or 0
  sequence = sequence + 1
  session = GetServerTime() .. "-" .. sequence
  character = Safe(GetPlayerCharacterKey())
  RR.DB.zombakDiagnostics = { version = 1, sequence = sequence, entries = entries }
  Diagnostics.Record("SESSION", {
    player = GetPlayerCharacterKey(), faction = UnitFactionGroup and UnitFactionGroup("player"), locale = ADDON_LOCALE,
    version = C_AddOns and C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "unknown",
    receiveEnabled = RR.Options.IsZombakEnabled(),
  })
end

function Diagnostics.SampleHealth()
  local ok = pcall(function()
    local details = Details({
      channel = GetChannelName and GetChannelName(ZOMBAK_RAID_CHANNEL) or 0,
      prefix = addonMessagePrefixRegistered, receiveEnabled = RR.Options.IsZombakEnabled(),
      lockdown = IsZombakLFGRestricted() or false, combat = InCombatLockdown() or false,
      ui = RR.UI.ZombakRaidPopup.GetBlockReason() or "ready",
      pending = RR.ZombakRaids.HasPendingNotifications(),
    })
    if details ~= lastHealth or GetTime() - lastHealthAt >= 60 then
      lastHealth, lastHealthAt = details, GetTime()
      Append("HEALTH", details)
    end
  end)
  if not ok then errors = errors + 1 end
end

function Diagnostics.ChannelNotice(event, ...)
  local notice, channelName, channelID, baseName = select(1, ...), select(4, ...), select(8, ...), select(9, ...)
  if issecretvalue and (issecretvalue(channelName) or issecretvalue(baseName)) then return end
  local target = ZOMBAK_RAID_CHANNEL:lower()
  if not ((type(baseName) == "string" and baseName:lower() == target) or
    (type(channelName) == "string" and channelName:lower() == target)) then return end
  Diagnostics.Record("CHANNEL_NOTICE", { event = event, notice = notice, channel = channelID })
end

function Diagnostics.BuildReport()
  local lines = {
    "RaidReminder Zombak diagnostic report v1",
    "generatedServerTime=" .. GetServerTime() .. " session=" .. session,
    "Times: UTC, t=server seconds, up=client uptime. Match leader + nonce across reports.",
    "TX Success means API accepted, not delivered. listingAge is NOT network latency.",
    "snapshotAge exists only on ACTIVE packets. queuedFor measures local receive-to-show delay.",
    "History: last " .. MAX_ENTRIES .. " local events across characters/reloads; SESSION identifies the player.",
    "Saved to disk by WoW on normal logout/reload. Diagnostics never upload or send the report.",
    "--- Current state ---",
  }
  for _, line in ipairs(RR.Comm.GetZombakStatusLines()) do lines[#lines + 1] = line end
  lines[#lines + 1] = "--- Raid readiness ---"
  for _, line in ipairs(RR.Readiness.GetStatusLines()) do lines[#lines + 1] = line end
  lines[#lines + 1] = "diagnosticErrors=" .. errors .. " retainedEvents=" .. #entries
  lines[#lines + 1] = "sessionCounters: " .. Details(counters)
  lines[#lines + 1] = "--- History (oldest first) ---"
  for _, line in ipairs(entries) do lines[#lines + 1] = line end
  return table.concat(lines, "\n")
end
