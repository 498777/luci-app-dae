# SPDX-License-Identifier: AGPL-3.0-only
#
# dae 二进制包（自建仓库，仅 apk）
# - 源码：https://github.com/olicesx/dae 的 kdae 分支（固定 commit，见 PKG_SOURCE_VERSION）
# - 参考：immortalwrt/packages 的 net/dae 与 QiuSimons/luci-app-dae（dae/ 子目录）
# - 本仓库相对上游的调整：
#   1) 移除 `+DAE_USE_VMLINUX_BTF:vmlinux-btf` 条件依赖及对应 choice，
#      固定使用内核自带 BTF（与 luci-app-honk 仓库的改法一致）；
#   2) geo 数据拆成独立子包 dae-geoip / dae-geosite：依赖 v2ray-geoip/geosite 的同时
#      在 /usr/share/dae 下建立软链，新旧 dae 默认 geo 目录均可命中；
#   3) x86_64 构建启用 GOAMD64=v3（包架构仍为 x86_64，可正常安装，
#      运行要求 CPU 支持 x86-64-v3，即 AVX2/BMI1/BMI2，2013 年后的主流 Intel、
#      2015 年后的主流 AMD 均满足）。

include $(TOPDIR)/rules.mk

PKG_NAME:=dae
PKG_VERSION:=2026.09.08
PKG_RELEASE:=2

PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_SOURCE_PROTO:=git
# olicesx/dae 分支 kdae 的 HEAD
PKG_SOURCE_VERSION:=737d94442f1a82da55073cd4c3697e860ce84cc9
PKG_SOURCE_URL:=https://github.com/olicesx/dae.git
PKG_MIRROR_HASH:=skip

PKG_LICENSE:=AGPL-3.0-only
PKG_LICENSE_FILE:=LICENSE

PKG_BUILD_DEPENDS:=golang/host bpf-headers
PKG_BUILD_PARALLEL:=1
PKG_BUILD_FLAGS:=no-mips16

GO_PKG:=github.com/daeuniverse/dae
GO_PKG_EXCLUDES:=control/kern/tests

GO_PKG_LDFLAGS:= \
	-s -w -buildid= \
	-linkmode external -extldflags '-static -Wl,-s'
GO_PKG_LDFLAGS_X:= \
	$(GO_PKG)/cmd.Version=$(PKG_VERSION) \
	$(GO_PKG)/common/consts.MaxMatchSetLen_=1024
GO_PKG_TAGS:=trace

# 仅 GOARCH=amd64 时生效；aarch64 等其它架构不受影响
export GOAMD64=v3

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/bpf.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/dae/Default
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  URL:=https://github.com/olicesx/dae
endef

define Package/dae
  $(call Package/dae/Default)
  TITLE:=A lightweight and high-performance transparent proxy solution
  # 需要内核开启 CONFIG_DEBUG_INFO_BTF（不再依赖 vmlinux-btf 包）
  DEPENDS:=$(GO_ARCH_DEPENDS) \
    +ca-bundle +kmod-sched-core +kmod-sched-bpf \
    +kmod-veth \
    +@KERNEL_XDP_SOCKETS
endef

define Package/dae-geoip
  $(call Package/dae/Default)
  TITLE:=geoip data for dae
  DEPENDS:=+dae +v2ray-geoip
  PKGARCH:=all
endef

define Package/dae-geosite
  $(call Package/dae/Default)
  TITLE:=geosite data for dae
  DEPENDS:=+dae +v2ray-geosite
  PKGARCH:=all
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

DAE_CFLAGS:= \
	-O2 -Wall -Werror \
	-DMAX_MATCH_SET_LEN=1024 \
	-I$(BPF_HEADERS_DIR)/tools/lib \
	-I$(BPF_HEADERS_DIR)/arch/$(BPF_KARCH)/include/asm/mach-generic

define Build/Compile
	( \
		pushd $(PKG_BUILD_DIR) ; \
		go mod tidy ; \
		export \
		$(GO_GENERAL_BUILD_CONFIG_VARS) \
		$(GO_PKG_BUILD_CONFIG_VARS) \
		$(GO_PKG_BUILD_VARS) \
		BPF_CLANG="$(CLANG)" \
		BPF_STRIP_FLAG="-strip=$(LLVM_STRIP)" \
		BPF_CFLAGS="$(DAE_CFLAGS)" \
		BPF_TARGET="bpfel,bpfeb" \
		BPF_TRACE_TARGET="$(GO_ARCH)" ; \
		go generate ./control/control.go ; \
		go generate ./trace/trace.go ; \
		popd ; \
	)
	$(call GoPackage/Build/Compile)
endef

define Package/dae/install
	$(call GoPackage/Package/Install/Bin,$(PKG_INSTALL_DIR))
	$(INSTALL_DIR) $(1)/usr/bin/
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/dae $(1)/usr/bin/dae
	$(INSTALL_DIR) $(1)/etc/dae/
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/example.dae $(1)/etc/dae/example.dae
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

define Package/dae-geoip/install
	$(INSTALL_DIR) $(1)/usr/share/dae
	$(LN) ../v2ray/geoip.dat $(1)/usr/share/dae/geoip.dat
endef

define Package/dae-geosite/install
	$(INSTALL_DIR) $(1)/usr/share/dae
	$(LN) ../v2ray/geosite.dat $(1)/usr/share/dae/geosite.dat
endef

$(eval $(call GoBinPackage,dae))
$(eval $(call BuildPackage,dae))
$(eval $(call BuildPackage,dae-geoip))
$(eval $(call BuildPackage,dae-geosite))
