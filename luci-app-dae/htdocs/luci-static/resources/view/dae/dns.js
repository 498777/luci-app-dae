'use strict';
'require dae.editor as heditor';

/*
 * DNS Settings —— 对照 Lua 版 luasrc/model/cbi/dae/dns.lua
 * 编辑 /etc/dae/config.d/dns.dae（CodeMirror 高亮 + 保存即 hot_reload）
 */

return heditor.editorPage({
	key: 'dns',
	title: _('DNS Settings'),
	description: _('Configure DNS settings for DAE.'),
	editorTitle: _('DNS Configuration')
});
