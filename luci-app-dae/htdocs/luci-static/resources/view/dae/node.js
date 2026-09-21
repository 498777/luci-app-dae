'use strict';
'require dae.editor as heditor';

/*
 * Node Settings —— 对照 Lua 版 luasrc/model/cbi/dae/node.lua
 * 编辑 /etc/dae/config.d/node.dae（节点 / 订阅 / 分组）
 */

return heditor.editorPage({
	key: 'node',
	title: _('Node Settings'),
	description: _('Configure nodes and groups for DAE.'),
	editorTitle: _('Node Configuration')
});
