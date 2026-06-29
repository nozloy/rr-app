local ADDON_NAME, RR = ...
RR = RR or {}
setfenv(1, RR.Env)

-- Locale.lua
function LocalText(key, fallback)
  local value = _G[key]
  if type(value) == "string" and value ~= "" then
    return value
  end

  return fallback
end

function GetLocaleSection(section, locale)
  local locales = RaidReminderLocales and RaidReminderLocales[section]
  if not locales then
    return nil
  end

  return locales[locale]
end

function InterfaceText(key)
  local localeText = GetLocaleSection("ui", ADDON_LOCALE) or GetLocaleSection("ui", "enUS") or {}
  local fallbackText = GetLocaleSection("ui", "enUS") or {}
  return localeText[key] or fallbackText[key] or key
end

function WhisperTextForLocale(locale, key)
  local localeText = GetLocaleSection("whisper", locale) or GetLocaleSection("whisper", "enUS") or {}
  local fallbackText = GetLocaleSection("whisper", "enUS") or {}
  return localeText[key] or fallbackText[key] or key
end

RR.Locale.InterfaceText = InterfaceText
RR.Locale.WhisperTextForLocale = WhisperTextForLocale
