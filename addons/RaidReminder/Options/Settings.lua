local ADDON_NAME, RR = ...
setfenv(1, RR.Env)

function RR.Options.IsZombakEnabled()
  return RR.DB ~= nil and RR.DB.autoSearchZombakRaids == true
end

function RR.Options.Initialize()
  if type(_G.RaidReminderDB) ~= "table" then
    _G.RaidReminderDB = {}
  end
  RR.DB = _G.RaidReminderDB
  if type(RR.DB.autoSearchZombakRaids) ~= "boolean" then
    RR.DB.autoSearchZombakRaids = false
  end

  if RR.Options.category or not Settings then
    return
  end

  local category = Settings.RegisterVerticalLayoutCategory("Raid Reminder")
  local setting = Settings.RegisterAddOnSetting(
    category, "RaidReminder_autoSearchZombakRaids", "autoSearchZombakRaids", RR.DB,
    Settings.VarType.Boolean, InterfaceText("zombakSetting"), false
  )
  setting:SetValueChangedCallback(function(_, value)
    if not value then
      RR.ZombakRaids.Clear()
    end
    RR.Comm.UpdateZombakSubscription()
  end)
  Settings.CreateCheckbox(category, setting, InterfaceText("zombakSettingTooltip"))
  Settings.RegisterAddOnCategory(category)
  RR.Options.category = category
end
