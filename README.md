# luci-app-dae（自建仓库 · 仅 apk）

> **License: AGPL-3.0-only**（[LICENSE](./LICENSE)）。

OpenWrt 上 [dae](https://github.com/daeuniverse/dae)（eBPF 透明代理）的自建打包仓库：

- 二进制：从 [olicesx/dae](https://github.com/olicesx/dae) **kdae** 分支源码编译（固定 commit `737d9444`，见 `dae/Makefile`）；
- LuCI：模块化 luasrc 界面（与 luci-app-honk 同构），菜单显示名统一 **DAE**；
- init：官方精简样式（dae 自带日志轮转，不劫持 `/tmp/resolv.conf`，无订阅 cron）。

相对上游的调整：

- **只出 apk**（OpenWrt 25.x apk 体系）；
- **不依赖 `vmlinux-btf`**：移除条件依赖与 choice，固定使用内核自带 BTF；
- geo 数据拆为 `dae-geoip` / `dae-geosite`（软链 `/usr/share/dae`，兼容新旧默认目录）；
- x86_64 包内二进制按 **GOAMD64=v3** 编译（包架构仍为 `x86_64`）。

## LuCI 界面（模块化，同 honk）

安装后 **服务 → DAE** 下五个页签，配置拆分、每页带 CodeMirror 编辑器与 Reload 按钮：

| 页签 | 编辑对象 |
| --- | --- |
| Global Settings | uci（启用/日志轮转）+ `/etc/dae/config.dae` |
| DNS Settings | `/etc/dae/config.d/dns.dae` |
| Node Settings | `/etc/dae/config.d/node.dae`（节点/订阅/分组） |
| Routing Settings | `/etc/dae/config.d/route.dae` |
| Logs | `/var/log/dae/dae.log`（实时 + 清空） |

默认 `node.dae` 是占位模板：**先在 Node 页签替换为真实节点/订阅再启用**，否则
`dae validate` 拒绝启动。Global 页的「订阅自动更新」仅保存选项，init 不含订阅调度
（与 luci-app-honk 现状一致）。

## 安装与启用

```sh
apk add dae dae-geoip dae-geosite luci-app-dae luci-i18n-dae-zh-cn

uci set dae.config.enabled=1 && uci commit dae
/etc/init.d/dae start
```

## 前提与平台说明

- **BTF**：eBPF CO-RE 需要内核 `CONFIG_DEBUG_INFO_BTF`。官方 25.x x86_64 / armsr 默认开启；
  未开启时 dae 可安装但无法启动。CI 有 Assert 步骤保证产物不含 `vmlinux-btf` 依赖。
- **x86_64v3**：官方 OpenWrt / ImmortalWrt 无 `x86_64_v3` 架构/SDK，v3 只是同一 amd64 的
  GOAMD64 档位（上游 kdae 亦如此）。本仓库包架构为 `x86_64`、二进制按 v3 编译，需要 CPU
  支持 AVX2/BMI（2013+ Intel Haswell、2015+ AMD Excavator）。老 CPU 跑会 SIGILL，把
  `dae/Makefile` 的 `export GOAMD64=v3` 改为 `v1` 重编即可。`aarch64` 不受影响。

## 编译与发布

推送 `main`，或在 **Actions → Build apk → Run workflow** 手动触发（SDK 默认
`openwrt-25.12`）。Release 生成 `dae_<version>`（如 `dae_2026.09.08-r2`）并附 apk。
源码树编译：

```sh
git clone https://github.com/498777/luci-app-dae package/luci-app-dae
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig   # Network -> Web Servers/Proxies -> luci-app-dae
make package/dae/compile V=s
```

## 目录

```
dae/                              核心包：kdae 分支编译 + 默认配置/init
  files/dae.init                  官方精简启动脚本（参照 dae.txt）
  files/config.dae                拆分配置入口（include config.d/*.dae）
  files/config.d/{dns,node,route}.dae   默认拆分模板
luci-app-dae/                     LuCI 模块化界面（luasrc：controller/cbi/view/po）
.github/workflows/build-apk.yml   编译 apk 并发布 Release
```

日志：`/var/log/dae/dae.log`，轮转由 dae 的 `--logfile-maxbackups/-maxsize` 控制，对应
uci 的 `dae.config.log_maxbackups` / `log_maxsize`。

## 许可证

**AGPL-3.0-only**，与 `dae/Makefile` 的 `PKG_LICENSE` 一致。上游：dae 源码
AGPL-3.0（olicesx/dae 为 daeuniverse/dae 的 fork）；LuCI 部分 fork 自 QiuSimons（未声明，
文件头沿用 Apache-2.0 模板注释）；init/打包参考 immortalwrt/packages net/dae（GPL-2.0，
文件头保留版权）。长期公开发布建议请求上游补充 LICENSE。
