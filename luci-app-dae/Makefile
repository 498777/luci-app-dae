# Copyright (C) 2024 ImmortalWrt.org
#
# SPDX-License-Identifier: Apache-2.0
#
# 自建仓库的 luci-app-dae（新版 JS 界面，参考 immortalwrt/luci master 同名应用）
# 差异：菜单与页面显示名称统一使用大写 DAE。

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-dae
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for dae
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+dae +dae-geoip +dae-geosite

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
