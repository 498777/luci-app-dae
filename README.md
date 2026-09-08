# luci-app-dae（自建仓库 · 仅 apk · 无 vmlinux-btf 依赖）

> **License: AGPL-3.0-only**，完整文本见 [LICENSE](./LICENSE)。

OpenWrt 上 [dae](https://github.com/daeuniverse/dae)（eBPF 透明代理）的自建打包仓库：

- 二进制：从 [olicesx/dae](https://github.com/olicesx/dae) 的 **kdae** 分支源码编译（固定 commit，见 `dae/Makefile` 的 `PKG_SOURCE_VERSION`）；
- LuCI 界面：参考 [immortalwrt/luci](https://github.com/immortalwrt/luci/tree/master/applications/luci-app-dae) master 同名应用（新版 JS 界面），菜单与显示名称统一为 **DAE**；
- init 脚本：采用官方样式（dae 自带 logfile 轮转，不劫持 `/tmp/resolv.conf`，无订阅 cron 逻辑）。

| 项目 | 上游常见做法 | 本仓库 |
| --- | --- | --- |
| 产物格式 | ipk + apk | **只出 apk**（OpenWrt 25.x apk 体系） |
| 源码 | 上游 release / 旧 commit | **olicesx/dae kdae 分支固定 commit**（`737d9444`） |
| `vmlinux-btf` | `+DAE_USE_VMLINUX_BTF:vmlinux-btf` 条件依赖 | **已移除**，固定使用内核自带 BTF |
| geo 数据 | 直接依赖 v2ray-geoip/geosite | 独立子包 `dae-geoip`/`dae-geosite`（软链到 `/usr/share/dae`，新旧默认目录均可命中） |
| x86 二进制 | GOAMD64=v1 | **GOAMD64=v3**（包架构仍为 `x86_64`，可正常安装；CPU 需支持 x86-64-v3） |
| LuCI 菜单名 | 小写 dae | **大写 DAE** |

包结构沿用官方，四个包：

- `dae`：kdae 分支编译的 dae 二进制 + init + uci 配置；
- `dae-geoip` / `dae-geosite`：geo 数据入口（all 架构，软链 `/usr/share/dae/`）；
- `luci-app-dae`：LuCI 界面（Settings / Configuration / Log）。
- 中文语言包 `luci-i18n-dae-zh-cn` 由 luci.mk 随 `luci-app-dae` 自动编出。

---

## 一、编译与发布

推送 `main` 分支或在 **Actions → Build apk → Run workflow** 手动触发（SDK 默认 `openwrt-25.12`，可通过 `sdk` / `packages` 输入覆盖）。完成后 Release 生成 `dae_<version>`，附件形如：

```
dae-2026.09.08-r1-x86_64.apk
dae-2026.09.08-r1-aarch64_generic.apk
dae-geoip-...-x86_64v3.apk
dae-geosite-...-x86_64v3.apk
luci-app-dae-...-x86_64v3.apk
luci-i18n-dae-zh-cn-...-x86_64v3.apk
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

## 二、安装与启用

```sh
apk add dae dae-geoip dae-geosite luci-app-dae luci-i18n-dae-zh-cn
```

启用服务：

```sh
uci set dae.config.enabled=1
uci commit dae
/etc/init.d/dae start
```

首次使用流程：LuCI → **服务 → DAE → Settings** 先不开 Enable；到 **Configuration** 页保存一份 dae 配置（保存后自动写入 `/etc/dae/config.dae` 并触发 `hot_reload`）。未保存配置前直接启用会导致 `dae validate` 失败、服务无法启动 —— 这是 dae 校验配置文件的正常行为。也可以跳过 LuCI，直接向 `/etc/dae/config.dae` 写入合法配置。

配置示例可参考安装包内的 `/etc/dae/example.dae`。

---

## 三、关于 x86_64v3

官方 OpenWrt / ImmortalWrt 25.12 只发布 `x86_64`（generic）架构，不存在 `x86_64_v3` 的官方 SDK。本仓库的做法是：

- 用官方 `x86_64` SDK 编译，**包架构为 `x86_64`**，可安装在任何 25.x 的 x86_64 固件上；
- 编译时通过 `GOAMD64=v3`（见 `dae/Makefile`）让 **dae 二进制** 使用 x86-64-v3 指令集（AVX2 / BMI1 / BMI2）。

因此安装没有任何架构门槛，但运行要求 CPU 支持 v3。检查方式：

```sh
grep -qE 'avx2|bmi1|bmi2' /proc/cpuinfo && echo v3-ok
```

2013 年后的主流 Intel（Haswell+）与 2015 年后的主流 AMD（Excavator+）均满足。若在更老的 CPU 上运行，dae 会报非法指令（SIGILL），此时需把 `dae/Makefile` 中的 `export GOAMD64=v3` 改为 `export GOAMD64=v1` 后重新编译。

`aarch64_generic`（arm64）不受 GOAMD64 影响。

---

## 四、关于 vmlinux-btf / BTF 前提

dae 是 eBPF CO-RE 程序，加载时必须有 BTF 信息。本仓库已从 `dae/Makefile` 移除
`+DAE_USE_VMLINUX_BTF:vmlinux-btf` 依赖与对应 choice：

- 编出的 apk 的 `.PKGINFO` 中不会出现 `depend = vmlinux-btf`；
- 编译期 `Assert no vmlinux-btf dependency` 步骤做兜底检查，一旦依赖被改回，CI 失败，不会发布。

代价是：**内核未开启 `CONFIG_DEBUG_INFO_BTF` 时，dae 可安装但无法启动。**
官方 25.x 的 x86_64 / armsr 默认配置带 BTF；自编译固件需开启该选项
（`Global build settings → Kernel build options → Compile the kernel with BTF debug info`）。

---

## 五、日志

init 脚本（`dae/files/dae.init`）把 dae 日志写入 `/var/log/dae/dae.log`，轮转由
dae 自身的 `--logfile-maxbackups` / `--logfile-maxsize` 控制，对应 uci 选项：

```sh
uci set dae.config.log_maxbackups=3    # 保留旧日志份数
uci set dae.config.log_maxsize=10      # 单份上限（MB）
uci commit dae
/etc/init.d/dae restart
```

LuCI **服务 → DAE → Log** 页面实时读取该文件。

---

## 六、目录说明

```
dae/                              核心包：kdae 分支编译 dae + init/uci 配置
  Makefile                        移除 vmlinux-btf；geo 拆包；GOAMD64=v3
  files/dae.init                  官方样式启动脚本（参照 dae.txt）
  files/dae.config                uci 默认配置（enabled/config_file/log_*）
luci-app-dae/                     LuCI 界面（新版 JS：menu.d + htdocs + po）
.github/workflows/build-apk.yml   用 OpenWrt SDK 编 apk 并发布 Release
```

---

## 七、许可证

本仓库采用 **AGPL-3.0-only**（[LICENSE](./LICENSE)），与 `dae/Makefile` 中声明的
`PKG_LICENSE:=AGPL-3.0-only` 一致。上游许可见下表：

| 组成部分 | 上游许可证 |
| --- | --- |
| dae 二进制源码 | [daeuniverse/dae](https://github.com/daeuniverse/dae) / [olicesx/dae](https://github.com/olicesx/dae)（fork，AGPL-3.0） |
| init / 打包参考 | [immortalwrt/packages net/dae](https://github.com/immortalwrt/packages/tree/master/net/dae)（GPL-2.0-only，文件头保留版权） |
| LuCI 界面 | [immortalwrt/luci luci-app-dae](https://github.com/immortalwrt/luci/tree/master/applications/luci-app-dae)（Apache-2.0，文件头 SPDX 标注） |

agpl-3.0 与上游 gpl-2.0 / apache-2.0 的兼容性：GPL-2.0 代码并入 AGPL-3.0 作品在
上游已以独立文件形式保留其自身许可证声明；单文件内如有混合改动，以文件头
SPDX 为准。
