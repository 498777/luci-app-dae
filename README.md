# luci-app-dae（自建仓库 · 仅 apk）

> **License: AGPL-3.0-only**（[LICENSE](./LICENSE)）。

OpenWrt 上 [dae](https://github.com/daeuniverse/dae)（eBPF 透明代理）的自建打包仓库：

- 二进制：从 [olicesx/dae](https://github.com/olicesx/dae) **kdae** 分支预编译（跟随上游最新提交；`dae/upstream.commit` 记录当前基准，每日由 `update-dae` 工作流自动同步并触发构建）；
- LuCI：模块化 luasrc 界面（与 luci-app-honk 同构），菜单显示名统一 **DAE**；
- init：官方精简样式（dae 自带日志轮转，不劫持 `/tmp/resolv.conf`，无订阅 cron）。

相对上游的调整：

- **只出 apk**（OpenWrt 25.x apk 体系）；
- **不依赖 `vmlinux-btf`**：移除条件依赖与 choice，固定使用内核自带 BTF；
- **不依赖 v2ray-geodata**：geo（geoip/geosite）数据不作为依赖，默认配置不含
  `geoip:`/`geosite:` 引用；配置里需要时再自行安装官方 `v2ray-geoip` `v2ray-geosite`；
- x86_64 包内二进制按 **GOAMD64=v3** 编译（包架构仍为 `x86_64`）。

## 一键安装

```sh
curl -fsSL "https://raw.githubusercontent.com/498777/luci-app-dae/main/Auto_Install_Script.sh" | sh -s luci-app-dae
```

- 默认装全套：`dae` + `luci-app-dae` + 中文语言包；
- 只装主程序、不带 LuCI：`sh -s dae`；
- 配置里要用 `geoip:`/`geosite:` 时，另加 `--geo`（从官方源安装 v2ray-geoip / v2ray-geosite）；
- 脚本行为：非 apk 体系直接退出；未发现内核 BTF 时给出提示；若包内仍声明
  `vmlinux-btf` 会自动拆包剔除后安装；装完自动刷新 LuCI 缓存；
- 其它参数（`--repo` 换仓库、`--keep-dep` 原样安装）见脚本帮助（`-h`）。

> 需要 Release 已包含模块化 luci-app-dae（r2 起）。

## LuCI 界面（模块化，同 honk）

安装后 **服务 → DAE** 下五个页签，配置拆分、每页带 CodeMirror 编辑器与 Reload 按钮：

| 页签 | 编辑对象 |
| --- | --- |
| Global Settings | uci（启用/日志轮转）+ `/etc/dae/config.dae` |
| DNS Settings | `/etc/dae/config.d/dns.dae` |
| Node Settings | `/etc/dae/config.d/node.dae`（节点/订阅/分组） |
| Routing Settings | `/etc/dae/config.d/route.dae` |
| Logs | `/var/log/dae/dae.log`（实时日志） |

默认 `node.dae` 是占位模板：**先在 Node 页签替换为真实节点/订阅再启用**，否则
`dae validate` 拒绝启动。

## 安装与启用

```sh
apk add dae luci-app-dae luci-i18n-dae-zh-cn

uci set dae.config.enabled=1 && uci commit dae
/etc/init.d/dae start
```

若配置里用到 `geoip:` / `geosite:` 规则，需先装官方 geo 数据包：

```sh
apk add v2ray-geoip v2ray-geosite
```

## 前提与平台说明

- **BTF**：eBPF CO-RE 需要内核 `CONFIG_DEBUG_INFO_BTF`。官方 25.x x86_64 / armsr 默认开启；
  未开启时 dae 可安装但无法启动。CI 有 Assert 步骤保证产物不含 `vmlinux-btf` 依赖。
- **geo 数据**：dae 本体不依赖 geo 文件，只有规则引用 `geoip:`/`geosite:` 时才需要。
  本仓库默认配置不含这些引用；需要时安装官方 `v2ray-geoip` `v2ray-geosite`（文件位于
  `/usr/share/v2ray/`，dae 的默认 geo 目录自动兼容）。
- **x86_64v3**：官方 OpenWrt / ImmortalWrt 无 `x86_64_v3` 架构/SDK，v3 只是同一 amd64 的
  GOAMD64 档位（上游 kdae 亦如此）。本仓库包架构为 `x86_64`、二进制按 v3 编译，需要 CPU
  支持 AVX2/BMI（2013+ Intel Haswell、2015+ AMD Excavator）。老 CPU 跑会 SIGILL，把
  `dae/Makefile` 的 `export GOAMD64=v3` 改为 `v1` 重编即可。`aarch64` 不受影响。

## 编译与发布

构建分两段（见 `.github/workflows/build-apk.yml`）：

1. **预编译 job**：仿上游 kdae `seed-build.yml`，在 ubuntu-22.04 + clang-15/llvm-15 +
   Go 1.26 下交叉编译静态 `dae`（amd64 按 v3、aarch64 一份），产物作为 artifact 传给下一步；
   dae 核心**不在 OpenWrt SDK 内编译**（kdae 的 eBPF 生成与 SDK 的 bpf-headers 不兼容）。
2. **打包 job**：OpenWrt SDK 只负责把预编译二进制装进 `dae` 包并编 luci/语言包。

推送 `main`，或在 **Actions → Build apk → Run workflow** 手动触发（SDK 默认
`openwrt-25.12`）。Release 生成 `dae_<version>`（如 `dae_2026.09.08-r4`）并附 apk：
dae 核心每架构一份，luci / 语言包各一份。每次发布前自动清空该 tag 的旧附件。

在完整源码树中手动编 `luci-app-dae` 时，`dae` 包需要本地已存在预编译二进制：

```sh
git clone https://github.com/498777/luci-app-dae package/luci-app-dae
# 先从 Actions 产物或上游 release.yml 产物获取对应二进制，放好后再 make：
#   package/luci-app-dae/dae/files/prebuilt/x86_64v3/dae   (x86_64)
#   package/luci-app-dae/dae/files/prebuilt/aarch64/dae     (aarch64)
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig   # Network -> Web Servers/Proxies -> luci-app-dae
make package/dae/compile V=s
```

## 目录

```
dae/                              核心包：默认配置/init（二进制由预编译 job 提供）
  upstream.commit                 kdae 分支当前基准提交（update-dae 维护）
  files/dae.init                  官方精简启动脚本（参照 dae.txt）
  files/config.dae                拆分配置入口（include config.d/*.dae）
  files/config.d/{dns,node,route}.dae   默认拆分模板
luci-app-dae/                     LuCI 模块化界面（luasrc：controller/cbi/view/po）
.github/workflows/build-apk.yml   预编译 kdae 二进制 + 编译 apk 并发布 Release
.github/workflows/update-dae.yml  每日同步上游 kdae 提交并自动 bump 版本
```

日志：`/var/log/dae/dae.log`，轮转由 dae 的 `--logfile-maxbackups/-maxsize` 控制，对应
uci 的 `dae.config.log_maxbackups` / `log_maxsize`。

## 许可证

**AGPL-3.0-only**，与 `dae/Makefile` 的 `PKG_LICENSE` 一致。上游：dae 源码
AGPL-3.0（olicesx/dae 派生自 daeuniverse/dae）；LuCI 界面移植自 QiuSimons/luci-app-dae
（上游未声明许可证，文件头沿用 Apache-2.0 模板注释）；init/打包参考
immortalwrt/packages net/dae（GPL-2.0，文件头保留版权）。长期公开发布建议请求上游
补充 LICENSE。
