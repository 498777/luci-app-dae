# SPDX-License-Identifier: AGPL-3.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=dae
PKG_VERSION:=2026.09.11
PKG_RELEASE:=1

PKG_LICENSE:=AGPL-3.0-only
PKG_LICENSE_FILE:=LICENSE

include $(INCLUDE_DIR)/package.mk

# dae 核心由 GitHub Actions 的预编译 job 产出（仿 kdae seed-build：ubuntu + clang-15 +
# Go 1.26 + submodule 头文件交叉编译静态二进制），见 .github/workflows/build-apk.yml。
# 打包时直接使用 dae/files/prebuilt/<arch>/dae，不在 OpenWrt SDK 内编译。

define Package/dae
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  URL:=https://github.com/olicesx/dae
  TITLE:=A lightweight and high-performance transparent proxy solution
  DEPENDS:=+ca-bundle +kmod-sched-core +kmod-sched-bpf \
    +kmod-veth +@KERNEL_XDP_SOCKETS +v2ray-geoip +v2ray-geosite
endef

define Package/dae/description
  dae, means goose, is a lightweight and high-performance transparent
  proxy solution. It runs the transparent proxy and traffic diversion
  suite in the linux kernel by eBPF.
endef

define Package/dae/conffiles
/etc/dae/
/etc/config/dae
endef

define Build/Prepare
endef

define Build/Compile
endef

ifeq ($(ARCH_PACKAGES),x86_64)
  DAE_PREBUILT:=$(CURDIR)/files/prebuilt/x86_64v3/dae
else ifeq ($(ARCH_PACKAGES),aarch64_generic)
  DAE_PREBUILT:=$(CURDIR)/files/prebuilt/aarch64/dae
else
  DAE_PREBUILT:=
endif

define Package/dae/install
	$(INSTALL_DIR) $(1)/usr/bin/
	test -f "$(DAE_PREBUILT)" || { echo "prebuilt missing: $(DAE_PREBUILT)"; exit 1; }
	$(INSTALL_BIN) $(DAE_PREBUILT) $(1)/usr/bin/dae
	$(INSTALL_DIR) $(1)/etc/dae/
	$(INSTALL_CONF) $(CURDIR)/files/config.dae $(1)/etc/dae/config.dae
	$(INSTALL_DIR) $(1)/etc/dae/config.d/
	$(INSTALL_CONF) $(CURDIR)/files/config.d/dns.dae $(1)/etc/dae/config.d/dns.dae
	$(INSTALL_CONF) $(CURDIR)/files/config.d/node.dae $(1)/etc/dae/config.d/node.dae
	$(INSTALL_CONF) $(CURDIR)/files/config.d/route.dae $(1)/etc/dae/config.d/route.dae
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(CURDIR)/files/dae.config $(1)/etc/config/dae
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(CURDIR)/files/dae.init $(1)/etc/init.d/dae
endef

$(eval $(call BuildPackage,dae))
