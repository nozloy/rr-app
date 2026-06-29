local ADDON_NAME, RR = ...

RR.Name = ADDON_NAME
RR.Const = RR.Const or {}
RR.State = RR.State or {}
RR.Util = RR.Util or {}
RR.Locale = RR.Locale or {}
RR.Realm = RR.Realm or {}
RR.Comm = RR.Comm or {}
RR.Group = RR.Group or {}
RR.Export = RR.Export or {}
RR.Gear = RR.Gear or {}
RR.Readiness = RR.Readiness or {}
RR.UI = RR.UI or {}
RR.Env = RR.Env or {}

RR.Env.RR = RR
RR.Env.ADDON_NAME = ADDON_NAME
setmetatable(RR.Env, { __index = _G })
