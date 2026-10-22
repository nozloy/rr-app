-- Load the real transport, dispatcher, watcher and popup. Only Blizzard club
-- rosters and the native packet boundary are mocked; no test creates a global
-- channel shared by unrelated realms or factions.
local tests, failures = 0, {}
local function eq(actual, expected, message)
  assert(actual == expected, (message or "unexpected value") .. ": " .. tostring(actual) .. " ~= " .. tostring(expected))
end
local function test(name, callback)
  local ok, message = pcall(callback)
  if ok then tests = tests + 1; print("PASS " .. name)
  else failures[#failures + 1] = name .. ": " .. tostring(message); print("FAIL " .. failures[#failures]) end
end

local function client(options)
  options = options or {}
  local beforeLoad = options.beforeLoad
  options.beforeLoad = function(env, c)
    c.locale, c.faction = options.locale or "ruRU", options.faction or "Horde"
    env.GetLocale = function() return c.locale end
    env.UnitFactionGroup = function() return c.faction end
    env.Enum.ClubType = { Guild = 0, Character = 1, BattleNet = 2 }
    env.Enum.ClubMemberPresence = { Unknown = 0, Online = 1, OnlineMobile = 2, Offline = 3, Away = 4, Busy = 5 }
    c.clubMembers, c.clubRequests = options.members or {}, 0
    c.clubs = options.clubs or { { clubId = 11, clubType = env.Enum.ClubType.Character } }
    env.C_Club = {
      GetSubscribedClubs = function() return c.clubs end,
      GetClubMembers = function(clubId)
        local ids = {}
        for id in pairs(c.clubMembers[clubId] or {}) do ids[#ids + 1] = id end
        table.sort(ids)
        return ids
      end,
      GetMemberInfo = function(clubId, memberId) return (c.clubMembers[clubId] or {})[memberId] end,
      RequestMembers = function() c.clubRequests = c.clubRequests + 1 end,
    }
    if beforeLoad then beforeLoad(env, c) end
  end
  return NEW_ADDON_TEST_CLIENT(options)
end

local function online(name)
  return { name = name, presence = 1 }
end

local function command(c, packet)
  return c.rr.Env.SplitAddonMessage(packet[2])[1]
end

local function whispers(c, wanted)
  local packets = {}
  for _, packet in ipairs(c.sent) do
    if packet[3] == "WHISPER" and (not wanted or command(c, packet) == wanted) then
      packets[#packets + 1] = packet
    end
  end
  return packets
end

local function subscriptionCommand(c)
  return c.rr.Env.ZOMBAK_RAID_SUBSCRIBE_EVENT or "ZOMBAK_RAID_SUBSCRIBE"
end

local function deliver(sender, recipient, packet, senderName)
  assert(packet and packet[3] == "WHISPER", "deliver a real native whisper packet")
  recipient:dispatch("CHAT_MSG_ADDON", packet[1], packet[2], "WHISPER",
    senderName or (sender.player .. "-" .. sender.realm), "", 0, 0, "", 0)
end

local function pairClients()
  local leader = client({ player = "Зомбак", entry = { activityIDs = { 101 } },
    members = { [11] = { [2] = online("Raider-Silvermoon") } } })
  local recipient = client({ player = "Raider", realm = "Silvermoon", locale = "enUS", faction = "Alliance",
    members = { [11] = { [1] = online("Зомбак-HowlingFjord") } } })
  recipient:enable(true); recipient:advance(1)
  return leader, recipient
end

-- Keep the matrix tied to the production allowlist so a newly added character
-- must pass the same discovery, authentication and application flow as the main.
local allowlistedCharacters = client({ clubs = {} }).rr.ZombakCharacters
for characterIndex, canonical in ipairs(allowlistedCharacters) do
  test("Allowlisted community leader " .. characterIndex .. " works with Russian and English realm names", function()
    local name = assert(canonical:match("^([^-]+)%-рф$"), "expected a Howling Fjord character")
    for _, realm in ipairs({ "РевущийФьорд", "Ревущий Фьорд", "HowlingFjord" }) do
      for _, locale in ipairs({ "enUS", "enGB" }) do
        local nativeName = name .. "-" .. realm
        local leader = client({ player = name, realm = realm, entry = { activityIDs = { 101 } },
          members = { [11] = { [2] = online("Raider-Silvermoon") } } })
        local c = client({ player = "Raider", realm = "Silvermoon", locale = locale, faction = "Alliance",
          members = { [11] = { [1] = online(nativeName) } } })
        assert(c.rr.IsZombakCharacter(nativeName), "recognize the native leader identity")
        c:enable(true); c:advance(1)
        local subscriptions = whispers(c, subscriptionCommand(c))
        eq(#subscriptions, 1, "discover this allowlisted character")
        eq(subscriptions[1][4], nativeName, "address the real character and realm")
        deliver(c, leader, subscriptions[1]); leader:advance(1)
        local snapshots = whispers(leader, "ZOMBAK_RAID_ACTIVE")
        eq(#snapshots, 1, "each character broadcasts its public listing")
        eq(leader.rr.Env.SplitAddonMessage(snapshots[1][2])[3], canonical,
          "advertise the actual leader rather than another allowlisted character")
        deliver(leader, c, snapshots[1], nativeName)
        eq(c.state.phase, "ready"); eq(c.sounds, 1)
        eq(c.state.announcement.leaderKey, c.rr.Realm.NormalizeZombakCharacterName(canonical))
        eq(#c.searches, 0); eq(#c.applications, 0)
        deliver(leader, c, snapshots[1], name .. "-HowlingFjord")
        eq(c.sounds, 1, "realm aliases share notification deduplication")
        c:click()
        eq(c.state.phase, "searching"); eq(#c.searches, 1)
        eq(c.searches[1][4].ruRU, true); eq(c.searches[1][5], true)
        c.results[42] = { leaderName = nativeName, activityIDs = { 101 }, numMembers = 17, partyGUID = "alt-raid" }
        c.resultIDs = { 42 }; c:dispatch("LFG_LIST_SEARCH_RESULTS_RECEIVED")
        eq(c.state.phase, "found"); eq(c.state.currentZombakResultID, 42)
        c:click()
        eq(#c.applications, 1); eq(c.applications[1][1], 42)
      end
    end
  end)
end

test("Shared character communities discover only online allowlisted full names", function()
  local c = client({ realm = "Silvermoon", locale = "enUS", faction = "Alliance", members = { [11] = {
    [1] = online("Зомбак-HowlingFjord"),
    [2] = online("Зомбак-Гордунни"),
    [3] = online("Stranger-Silvermoon"),
    [4] = { name = "Зомбакдх-РевущийФьорд", presence = 3 },
    [5] = online("Зомбак"),
  } } })
  c:enable(true); c:advance(1)
  local sent = whispers(c, subscriptionCommand(c))
  eq(#sent, 1)
  eq(sent[1][4], "Зомбак-HowlingFjord")
  eq(#c.searches, 0, "community discovery never searches LFG automatically")
end)

test("A shared guild is discovered even when absent from the subscribed community list", function()
  local c = client({ realm = "Silvermoon", locale = "enGB", faction = "Alliance", clubs = {},
    members = { [88] = { [1] = online("Зомбак-HowlingFjord") } },
    beforeLoad = function(env) env.C_Club.GetGuildClubId = function() return 88 end end,
  })
  c:enable(true); c:advance(1)
  local sent = whispers(c, subscriptionCommand(c))
  eq(#sent, 1); eq(sent[1][4], "Зомбак-HowlingFjord")
  c.clubs = { { clubId = 88, clubType = c.env.Enum.ClubType.Guild } }
  c:dispatch("CLUB_ADDED", 88); c:advance(1)
  eq(#whispers(c, subscriptionCommand(c)), 1, "duplicate guild membership does not duplicate subscriptions")
end)

test("Bare local roster names use the native realm spelling for whisper addresses", function()
  for _, options in ipairs({
    { realm = "Ревущий Фьорд", locale = "ruRU", target = "Зомбак-РевущийФьорд" },
    { realm = "HowlingFjord", locale = "enGB", target = "Зомбак-HowlingFjord" },
  }) do
    local c = client({ realm = options.realm, locale = options.locale,
      members = { [11] = { [1] = online("Зомбак") } },
    })
    c:enable(true); c:advance(1)
    local sent = whispers(c, subscriptionCommand(c))
    eq(#sent, 1); eq(sent[1][4], options.target)
    assert(sent[1][4] ~= "Зомбак-рф", "never use display aliases as native whisper addresses")
  end
end)

test("An English Alliance recipient on another realm receives a fresh direct snapshot exactly once", function()
  local leader, c = pairClients()
  local subscribe = assert(whispers(c, subscriptionCommand(c))[1], "missing subscription")
  deliver(c, leader, subscribe)
  leader:advance(5)
  local packet = assert(whispers(leader, "ZOMBAK_RAID_ACTIVE")[1], "missing direct active listing")
  eq(packet[4], "Raider-Silvermoon")
  local direct = leader.rr.Env.SplitAddonMessage(packet[2])
  local original = leader.rr.Env.SplitAddonMessage(leader.sent[1][2])
  eq(direct[5], original[5], "preserve listing creation time")
  eq(direct[6], original[6], "preserve listing nonce")
  assert(tonumber(direct[7]) >= tonumber(direct[5]) and
    leader.env.GetServerTime() - tonumber(direct[7]) <= 5, "date the current snapshot")
  c:advance(5)
  deliver(leader, c, packet, "Зомбак-HowlingFjord")
  eq(c.state.phase, "ready"); eq(c.sounds, 1)
  deliver(leader, c, packet, "Зомбак-HowlingFjord")
  eq(c.sounds, 1, "direct duplicates do not replay the notice")
  c:click()
  eq(#c.searches, 1); eq(c.searches[1][4].enUS, true); eq(c.searches[1][4].ruRU, true)
  eq(c.searches[1][5], true, "allow cross faction LFG results")
  eq(c.languageFilter.ruRU, nil, "keep the user's saved language filters")
end)

test("Legacy channel delivery and its deduplication remain available", function()
  local leader = client({ player = "Зомбак", entry = { activityIDs = { 101 } }, clubs = {} })
  local c = client({ clubs = {} }); c:enable(true)
  eq(leader.sent[1][3], "CHANNEL")
  leader:deliverTo(c); leader:deliverTo(c)
  eq(c.state.phase, "ready"); eq(c.sounds, 1); eq(#whispers(leader), 0)
end)

test("Direct announcements reject random senders, mismatched leaders and other distributions", function()
  for _, variation in ipairs({ "random", "mismatch", "party" }) do
    local c = client({ clubs = {} }); c:enable(true)
    local sender = variation == "random" and "Stranger-Silvermoon" or "Зомбак-HowlingFjord"
    local advertised = variation == "mismatch" and "Зомбакдх-рф" or "Зомбак-рф"
    local packet = c.rr.Env.BuildAddonMessage("ZOMBAK_RAID_ACTIVE", "1", advertised,
      "101", c.env.GetServerTime(), "direct-test", c.env.GetServerTime())
    c:dispatch("CHAT_MSG_ADDON", "RaidReminder", packet, variation == "party" and "PARTY" or "WHISPER", sender)
    eq(c.state.announcement, nil); eq(c.sounds, nil)
  end
end)

test("Disabled receiving never discovers leaders and ignores direct announcements", function()
  local c = client({ members = { [11] = { [1] = online("Зомбак-HowlingFjord") } } })
  c:dispatch("CLUB_ADDED", 11); c:dispatch("CLUB_MEMBER_UPDATED", 11, 1); c:advance(60)
  eq(#whispers(c), 0)
  local packet = c.rr.Env.BuildAddonMessage("ZOMBAK_RAID_ACTIVE", "1", "Зомбак-рф", "101",
    c.env.GetServerTime(), "disabled-test", c.env.GetServerTime())
  c:dispatch("CHAT_MSG_ADDON", "RaidReminder", packet, "WHISPER", "Зомбак-HowlingFjord")
  eq(c.state.announcement, nil); eq(c.sounds, nil)
  c:enable(true); c:advance(5)
  assert(#whispers(c) > 0)
  c:enable(false)
  local sent = #whispers(c)
  c:advance(120); c:dispatch("CLUB_MEMBER_UPDATED", 11, 1); c:advance(5)
  eq(#whispers(c), sent, "disabled clients do not renew subscriptions")
end)

test("No common community creates no speculative cross realm traffic", function()
  local c = client({ realm = "Silvermoon", locale = "enUS", faction = "Alliance", clubs = {} })
  c:enable(true); c:advance(120)
  eq(#whispers(c), 0); eq(#c.searches, 0)
  eq(c.state.announcement, nil)
  assert(#c.rr.Community.GetStatusLines() > 0, "show the community transport state")
end)

test("Late club roster events recover discovery without repeated subscription bursts", function()
  local c = client({ realm = "Silvermoon" }); c:enable(true); c:advance(1)
  eq(#whispers(c), 0)
  c.clubMembers[11] = { [1] = online("Зомбак-HowlingFjord") }
  c:dispatch("CLUB_MEMBER_ADDED", 11, 1); c:advance(5)
  eq(#whispers(c, subscriptionCommand(c)), 1)
  for _ = 1, 20 do c:dispatch("CLUB_MEMBER_UPDATED", 11, 1) end
  c:advance(5)
  eq(#whispers(c, subscriptionCommand(c)), 1, "roster churn must respect renewal backoff")
end)

test("Steady unrelated roster updates cannot starve discovery in a large community", function()
  local members = {}
  for index = 1, 499 do members[index] = online("Stranger-Silvermoon") end
  members[500] = online("Зомбак-HowlingFjord")
  local c = client({ realm = "Silvermoon", members = { [11] = members } })
  c:enable(true)
  for _ = 1, 24 do
    c:advance(0.25)
    c:dispatch("CLUB_MEMBER_UPDATED", 11, 1)
  end
  eq(#whispers(c, subscriptionCommand(c)), 1,
    "reach the late roster member while unrelated updates are still arriving")
  c:advance(1)
  eq(#whispers(c, subscriptionCommand(c)), 1, "coalesced rescans do not cause another burst")
end)

test("Chat lockdown defers discovery and direct delivery until a fresh unrestricted attempt", function()
  local c = client({ restricted = true, realm = "Silvermoon", members = { [11] = {
    [1] = online("Зомбак-HowlingFjord"),
  } } })
  c:enable(true); c:advance(30); eq(#whispers(c), 0)
  c.restricted = false; c:dispatch("CLUB_MEMBER_UPDATED", 11, 1); c:advance(5)
  eq(#whispers(c, subscriptionCommand(c)), 1)
  local leader, recipient = pairClients()
  deliver(recipient, leader, whispers(recipient, subscriptionCommand(recipient))[1])
  leader:advance(5)
  local packet = assert(whispers(leader, "ZOMBAK_RAID_ACTIVE")[1])
  recipient.restricted = true; deliver(leader, recipient, packet); eq(recipient.state.announcement, nil)
  recipient.restricted = false; deliver(leader, recipient, packet)
  eq(recipient.state.phase, "ready"); eq(recipient.sounds, 1)
end)

test("Subscribers receive only revalidated public raid listings", function()
  local leader = client({ player = "Зомбак", members = { [11] = { [2] = online("Raider-Silvermoon") } } })
  local c = client({ player = "Raider", realm = "Silvermoon", members = { [11] = {
    [1] = online("Зомбак-HowlingFjord"),
  } } })
  c:enable(true); c:advance(1)
  deliver(c, leader, assert(whispers(c, subscriptionCommand(c))[1])); leader:advance(5)
  eq(#whispers(leader, "ZOMBAK_RAID_ACTIVE"), 0, "a subscription does not invent a listing")
  leader.entry = { activityIDs = { 101 }, privateGroup = true }
  leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", true); leader:advance(5)
  eq(#whispers(leader, "ZOMBAK_RAID_ACTIVE"), 0, "private listings remain private")
  leader.entry.privateGroup = false
  leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false); leader:advance(5)
  assert(#whispers(leader, "ZOMBAK_RAID_ACTIVE") > 0, "the public listing reaches the subscriber")
  leader.entry = nil; leader:dispatch("LFG_LIST_ACTIVE_ENTRY_UPDATE", false)
  local sent = #whispers(leader, "ZOMBAK_RAID_ACTIVE")
  leader:advance(60)
  eq(#whispers(leader, "ZOMBAK_RAID_ACTIVE"), sent, "removed listings do not leak queued snapshots")
end)

test("Subscriptions expire when the recipient stops renewing", function()
  local leader, c = pairClients()
  deliver(c, leader, assert(whispers(c, subscriptionCommand(c))[1]))
  leader:advance(5)
  assert(#whispers(leader, "ZOMBAK_RAID_ACTIVE") > 0)
  -- Only the leader advances. The recipient therefore cannot renew its TTL.
  leader:advance(190)
  local sent = #whispers(leader, "ZOMBAK_RAID_ACTIVE")
  leader:advance(65)
  eq(#whispers(leader, "ZOMBAK_RAID_ACTIVE"), sent, "expired subscribers stop receiving updates")
end)

test("Duplicate subscription bursts do not bypass native whisper pacing", function()
  local leader = client({ player = "Зомбак", entry = { activityIDs = { 101 } } })
  local subscribe = leader.rr.Env.BuildAddonMessage(subscriptionCommand(leader), "1")
  for index = 1, 8 do
    for _ = 1, 5 do
      leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", subscribe, "WHISPER", "Raider" .. string.char(64 + index) .. "-Silvermoon")
    end
  end
  leader:advance(6)
  local sent, perSecond, targets = whispers(leader, "ZOMBAK_RAID_ACTIVE"), {}, {}
  eq(#sent, 8, "one fresh snapshot per subscribed peer")
  for _, packet in ipairs(sent) do
    local second = math.floor(packet[5])
    perSecond[second] = (perSecond[second] or 0) + 1
    assert(perSecond[second] <= 2, "send at most two direct packets per second")
    assert(not targets[packet[4]], "coalesce duplicate subscriptions")
    targets[packet[4]] = true
  end
end)

test("Malformed control messages cannot add subscribers or impersonate a target", function()
  local leader = client({ player = "Зомбак", clubs = {} })
  local build = leader.rr.Env.BuildAddonMessage
  for _, message in ipairs({
    build(subscriptionCommand(leader), "2"),
    build(subscriptionCommand(leader), "1", "Victim-Silvermoon"),
    build(subscriptionCommand(leader)),
  }) do
    leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", message, "WHISPER", "Raider-Silvermoon")
  end
  local valid = build(subscriptionCommand(leader), "1")
  leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", valid, "CHANNEL", "Raider-Silvermoon")
  leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", valid, "WHISPER", "Unqualified")
  leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", valid, "WHISPER", "Pipe|Injected-Silvermoon")
  leader:advance(5)
  assert(table.concat(leader.rr.Community.GetStatusLines(), "\n"):find("subscribers=0", 1, true))
  eq(#whispers(leader), 0)
end)

test("A subscription flood stays bounded and expired peers release the capacity", function()
  local leader = client({ player = "Зомбак", clubs = {} })
  local subscribe = leader.rr.Env.BuildAddonMessage(subscriptionCommand(leader), "1")
  for index = 0, 511 do
    local name = "Peer" .. string.char(65 + math.floor(index / 26)) .. string.char(65 + index % 26)
    leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", subscribe, "WHISPER", name .. "-Silvermoon")
  end
  assert(table.concat(leader.rr.Community.GetStatusLines(), "\n"):find("subscribers=256", 1, true),
    "bound subscriber memory when native peers flood requests")
  eq(#whispers(leader), 0, "idle leaders do not reply with fabricated raid announcements")
  leader:advance(185)
  assert(table.concat(leader.rr.Community.GetStatusLines(), "\n"):find("subscribers=0", 1, true),
    "expire peers even without an active raid")
  leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", subscribe, "WHISPER", "Later-Silvermoon")
  assert(table.concat(leader.rr.Community.GetStatusLines(), "\n"):find("subscribers=1", 1, true))
end)

test("Unavailable community APIs cannot interrupt channel announcements", function()
  local c = client({ beforeLoad = function(env)
    env.C_Club.GetSubscribedClubs = function() error("temporary community API failure") end
  end })
  c:enable(true); c:advance(10)
  c:message()
  eq(c.state.phase, "ready"); eq(c.sounds, 1); eq(#whispers(c), 0)
  assert(c.rr.Diagnostics.BuildReport():find("COMMUNITY_ERROR", 1, true))
end)

test("English GB clients retain native identity and locale in community diagnostics", function()
  local c = client({ player = "Raider", realm = "Silvermoon", locale = "enGB", faction = "Alliance",
    members = { [11] = { [1] = online("Зомбак-HowlingFjord") } } })
  c:enable(true); c:advance(1)
  eq(#whispers(c, subscriptionCommand(c)), 1)
  local report = c.rr.Diagnostics.BuildReport()
  assert(report:find("locale: enGB", 1, true))
  assert(report:find("faction: Alliance", 1, true))
  assert(report:find("Raider-Silvermoon", 1, true))
  assert(report:find("communityRoute=", 1, true))
end)

test("Native throttle and lockdown refusals pause the whole outgoing whisper queue", function()
  for _, refusal in ipairs({ { result = 8, quiet = 4 }, { result = 11, quiet = 29 } }) do
    local leader = client({ player = "Зомбак", entry = { activityIDs = { 101 } }, clubs = {} })
    leader.sendResult = refusal.result
    local subscribe = leader.rr.Env.BuildAddonMessage(subscriptionCommand(leader), "1")
    for index = 1, 3 do
      leader:dispatch("CHAT_MSG_ADDON", "RaidReminder", subscribe, "WHISPER",
        "Raider" .. string.char(64 + index) .. "-Silvermoon")
    end
    leader:advance(0.5)
    eq(#whispers(leader, "ZOMBAK_RAID_ACTIVE"), 1, "first queued native call reports the refusal")
    leader:advance(refusal.quiet)
    eq(#whispers(leader, "ZOMBAK_RAID_ACTIVE"), 1,
      "respect the native refusal globally before trying any other peer")
    leader.sendResult = 0
    leader:advance(6)
    assert(#whispers(leader, "ZOMBAK_RAID_ACTIVE") > 1, "resume queued peers after the cooldown")
  end
end)

print(string.format("%d targeted community transport scenarios passed", tests))
assert(#failures == 0, table.concat(failures, "\n"))
