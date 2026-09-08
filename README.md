# luci-app-dae（自建仓库 · 仅 apk · 无 vmlinux-btf 依赖）

> **License: AGPL-3.0-only**，完整文本见 [LICENSE](./LICENSE)。

OpenWrt 上 [dae](https://github.com/daeuniverse/dae)（eBPF 透明代理）的自建打包仓库：

- 二进制：从 [olicesx/dae](https://github.com/olicesx/dae) 的 **kdae** 分支源码编译（固定 commit，见 `dae/Makefile` 的 `PKG_SOURCE_VERSION`）；
- LuCI 界面：**模块化 luasrc 界面**（与 [luci-app-honk](../luci-app-honk) 同构，参考 QiuSimons/luci-app-dae），
  菜单与页面显示名统一为 **DAE**，配置拆分为 `/etc/dae/config.dae` + `/etc/dae/config.d/*.dae`；
- init 脚本：官方精简样式（dae 自带 logfile 轮转，不劫持 `/tmp/resolv.conf`，无订阅 cron）。

| 项目 | 上游常见做法 | 本仓库 |
| --- | --- | --- |
| 产物格式 | ipk + apk | **只出 apk**（OpenWrt 25.x apk 体系） |
| 源码 | 上游 release / 旧 commit | **olicesx/dae kdae 分支固定 commit**（`737d9444`） |
| `vmlinux-btf` | `+DAE_USE_VMLINUX_BTF:vmlinux-btf` 条件依赖 | **已移除**，固定使用内核自带 BTF |
| geo 数据 | 直接依赖 v2ray-geoip/geosite | 独立子包 `dae-geoip`/`dae-geosite`（软链 `/usr/share/dae`） |
| x86 二进制 | GOAMD64=v1 | **GOAMD64=v3**（包架构仍为 `x86_64`，CPU 需支持 x86-64-v3） |
| LuCI 界面 | 新版 JS 单页全文编辑器 | **模块化 luasrc**：Global / DNS / Node / Routing / Logs 分页签 + 配置拆分 |

四个包：

- `dae`：kdae 分支编译的 dae 二进制 + init + uci 配置 + 默认拆分配置；
- `dae-geoip` / `dae-geosite`：geo 数据入口（all 架构，软链 `/usr/share/dae/`）；
- `luci-app-dae`：模块化 LuCI 界面。
- 中文语言包 `luci-i18n-dae-zh-cn` 由 luci.mk 随 `luci-app-dae` 自动编出。

---

## 一、LuCI 界面（与 honk 一致的模块化布局）

安装后在 **服务 → DAE** 下看到五个页签（与 luci-app-honk 完全一致）：

| 页签 | 编辑对象 | 说明 |
| --- | --- | --- |
| Global Settings | uci（启用/日志）+ `/etc/dae/config.dae` | 开关、日志轮转参数、`global{}` 段与 `include` 字段 |
| DNS Settings | `/etc/dae/config.d/dns.dae` | `dns{}` 段 |
| Node Settings | `/etc/dae/config.d/node.dae` | `node` / `subscription` / `group` 段 |
| Routing Settings | `/etc/dae/config.d/route.dae` | `routing{}` 段 |
| Logs | `/var/log/dae/dae.log` | 实时日志 + 清空按钮 |

每个配置页都带 CodeMirror 编辑器（支持 dae 语法高亮与 `Format Code`）和
`Reload Service` 按钮（调用 `/etc/init.d/dae hot_reload`，写入后即时生效）。

> 注：Global 页的「订阅自动更新 / 更新周期」只保存 uci 选项。本仓库 init 为官方精简版，
> 不含订阅调度 cron（与 luci-app-honk 的现状一致），需要定时更新订阅时另行配置计划任务。

默认安装的 `/etc/dae/config.d/node.dae` 是带占位符的模板。首次启用前，把其中的
示例节点/订阅/分组替换为实际内容（可在 Node Settings 页签直接编辑），否则
`dae validate` 会因引用不存在的节点/分组而拒绝启动 —— 这是 dae 校验配置的正常行为。

---

## 二、编译与发布

推送 `main` 分支或在 **Actions → Build apk → Run workflow** 手动触发（SDK 默认
`openwrt-25.12`，可经 `sdk` / `packages` 输入覆盖）。完成后 Release 生成
`dae_<version>`，附件形如：

```
dae-2026.09.08-r2-x86_64.apk
dae-2026.09.08-r2-aarch64_generic.apk
dae-geoip-...-x86_64v3.apk
dae-geosite-...-x86_64v3.apk
luci-app-dae-1.1.0-r1-x86_64v3.apk
luci-i18n-dae-zh-cn-1.1.0-r1-x86_64v3.apk
（aarch64 一列同构）
```

在 OpenWrt 源码树中编译：

```sh
git clone https://github.com/498777/luci-app-dae package/luci-app-dae
./scripts/feeds update -a
./scripts/feeds install -a
make menuconfig   # Network -> Web Servers/Proxies -> luci-app-dae
make package/dae/compile V=s
```

产物位于 `bin/packages/<arch>/`。

---

## 三、安装与启用

```sh
apk add dae dae-geoip dae-geosite luci-app-dae luci-i18n-dae-zh-cn
```

启用服务：

```sh
uci set dae.config.enabled=1
uci commit dae
/etc/init.d/dae start
```

LuCI 中同样在 Global Settings 勾选启用。若未把 Node 页签中的占位节点/订阅替换为真实
内容就启用，`/etc/init.d/dae start` 会在 `dae validate` 处失败，LuCI 状态显示未运行。

---

## 四、关于 x86_64v3

官方 OpenWrt / ImmortalWrt 25.12 只发布 `x86_64`（generic）架构，不存在
`x86_64_v3` 的官方 SDK/包架构（上游 kdae 也只是在同一 amd64 下区分
GOAMD64 v1/v2/v3 的二进制档位）。本仓库的做法：

- 用官方 `x86_64` SDK 编译，包架构为 `x86_64`，可安装在任何 25.x 的 x86_64 固件上；
- 编译时通过 `GOAMD64=v3`（见 `dae/Makefile`）让 dae 二进制使用 x86-64-v3 指令集
  （AVX2 / BMI1 / BMI2）。

检查 CPU 是否支持：

```sh
grep -qE 'avx2|bmi1|bmi2' /proc/cpuinfo && echo v3-ok
```

2013 年后的主流 Intel（Haswell+）与 2015 年后的主流 AMD（Excavator+）均满足。老 CPU
运行会报非法指令（SIGILL），此时把 `dae/Makefile` 中 `export GOAMD64=v3` 改为
`export GOAMD64=v1` 后重新编译。`aarch64_generic`（arm64）不受 GOAMD64 影响。

---

## 五、关于 vmlinux-btf / BTF 前提

dae 是 eBPF CO-RE 程序，加载时必须有 BTF 信息。本仓库已从 `dae/Makefile` 移除
`+DAE_USE_VMLINUX_BTF:vmlinux-btf` 依赖与对应 choice：

- 编出的 apk 的 `.PKGINFO` 中不会出现 `depend = vmlinux-btf`；
- 编译期 `Assert no vmlinux-btf dependency` 步骤做兜底检查，一旦依赖被改回，CI 失败。

代价是：**内核未开启 `CONFIG_DEBUG_INFO_BTF` 时，dae 可安装但无法启动。**
官方 25.x 的 x86_64 / armsr 默认配置带 BTF；自编译固件需开启该选项
（`Global build settings → Kernel build options → Compile the kernel with BTF debug info`）。

---

## 六、日志

init 脚本（`dae/files/dae.init`）把日志写入 `/var/log/dae/dae.log`，轮转由 dae 自身的
`--logfile-maxbackups` / `--logfile-maxsize` 控制，对应 uci 选项：

```sh
uci set dae.config.log_maxbackups=3    # 保留旧日志份数
uci set dae.config.log_maxsize=10      # 单份上限（MB）
uci commit dae
/etc/init.d/dae restart
```

LuCI **服务 → DAE → Logs** 页签实时读取该文件。

---

## 七、目录说明

```
dae/                              核心包：kdae 分支编译 dae + 默认配置/init
  Makefile                        移除 vmlinux-btf；geo 拆包；GOAMD64=v3
  files/dae.init                  官方精简启动脚本（参照 dae.txt）
  files/dae.config                uci 默认配置（enabled/config_file/log_*）
  files/config.dae                拆分配置入口（include config.d/*.dae）
  files/config.d/{dns,node,route}.dae  默认拆分模板（带占位符，需替换后启用）
luci-app-dae/                     LuCI 界面（模块化 luasrc：controller/cbi/view/po）
.github/workflows/build-apk.yml   用 OpenWrt SDK 编 apk 并发布 Release
```

---

## 八、许可证

本仓库采用 **AGPL-3.0-only**（[LICENSE](./LICENSE)），与 `dae/Makefile` 中声明的
`PKG_LICENSE:=AGPL-3.0-only` 一致。上游许可见下表：

| 组成部分 | 上游许可证 |
| --- | --- |
| dae 二进制源码 | [daeuniverse/dae](https://github.com/daeuniverse/dae) / [olicesx/dae](https://github.com/olicesx/dae)（fork，AGPL-3.0） |
| LuCI 界面 | [QiuSimons/luci-app-dae](https://github.com/QiuSimons/luci-app-dae)（kix，未声明） |
| init / 打包参考 | [immortalwrt/packages net/dae](https://github.com/immortalwrt/packages/tree/master/net/dae)（GPL-2.0-only，文件头保留版权） |

luci-app-dae 的 luasrc 部分沿用上游文件头 Apache-2.0 模板注释；若长期公开发布，
建议向上游 QiuSimons 提出补充 LICENSE 的请求。
