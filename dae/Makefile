# SPDX-License-Identifier: AGPL-3.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=dae
PKG_VERSION:=2026.09.18
KDAE_COMMIT:=4502be786c97b9e35996cfcea5711e8d30091bb6
PKG_RELEASE:=1

PKG_LICENSE:=AGPL-3.0-only
PKG_LICENSE_FILE:=LICENSE

include $(INCLUDE_DIR)/package.mk

# 本分支只用本文件记录版本与上游提交（CI 的 prepare job 从这里读 PKG_VERSION /
# PKG_RELEASE / KDAE_COMMIT）。核心二进制由 GitHub Actions 直接交叉编译并作为
# artifact 交付，不再打包 apk、不再发 Release —— 见 .github/workflows/build-apk.yml。
# 下方 define 与 dae/files/ 保留作参考与手工部署素材，本分支不再构建。

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
