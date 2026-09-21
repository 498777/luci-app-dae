'use strict';
'require dae.editor as heditor';

/*
 * Routing Settings —— 对照 Lua 版 luasrc/model/cbi/dae/route.lua
 * 编辑 /etc/dae/config.d/route.dae
 */

return heditor.editorPage({
	key: 'route',
	title: _('Routing Settings'),
	description: _('Configure routing rules for DAE.'),
	editorTitle: _('Route Configuration')
});
