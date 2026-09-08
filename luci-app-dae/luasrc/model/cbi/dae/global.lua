local dae = require "luci.model.dae_tools"
local m, s, o

m = Map("dae", translate("Global Settings"), translate("Configure global settings for DAE."))

local config_file = "/etc/dae/config.dae"

s = dae.init_editor(m, "global")

s:option(Flag, "enabled", translate("Enabled")).rmempty = false

dae.add_editor(s, config_file, "globalconf", translate("Global Configuration"), translate("Correctly configure the include field for separate-config to work, or enter complete configuration here."))

return m
