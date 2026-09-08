# Copyright (C) 2016 Openwrt.org

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-dae
PKG_VERSION:=1.1.0
PKG_RELEASE:=3

LUCI_TITLE:=LuCI support for DAE
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+dae +luci-compat

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
