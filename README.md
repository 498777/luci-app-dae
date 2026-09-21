# luci-app-dae（自建仓库 · 仅 apk · `kdae` 分支）

> License: **AGPL-3.0-only**（[LICENSE](./LICENSE)）

OpenWrt 上 [dae](https://github.com/daeuniverse/dae)（eBPF 透明代理）的自建打包仓库，本分支（`kdae`）使用 [olicesx/dae](https://github.com/olicesx/dae) 的 **kdae** 分支作为二进制来源，只产出 **apk**（OpenWrt 25.x apk 体系）。

## 构成

| 部分 | 说明 |
| --- | --- |
| 核心包 `dae` | 从 [olicesx/dae](https://github.com/olicesx/dae) 的 **kdae** 分支源码交叉编译静态 `dae`。取哪个提交由 `dae/Makefile` 的 `KDAE_COMMIT` 固定（CI 会 checkout 到该 commit，构建可复现）；包版本为 `PKG_VERSION:=<日期>`（apk 要求版本以数字开头，日期制天然满足） |
| LuCI 包 `luci-app-dae` | JS 版界面（`htdocs/` 客户端视图 + `root/usr/share/luci/menu.d/` + `rpcd/acl.d/`，与 luci-app-honk 同构），菜单显示名 **DAE**，不依赖 `luci-compat` |
| 版本维护 | **没有自动同步工作流**：`kdae` 是非默认分支，`on.schedule` 不生效，构建只能**手动 dispatch**；`dae/Makefile` 的 `PKG_VERSION` / `KDAE_COMMIT` 由人工更新 |

### 相对上游的调整

- **只出 apk**；
- **不依赖 `vmlinux-btf`**：移除条件依赖与 choice，固定使用内核自带 BTF；
- **geo 数据**：依赖官方 `v2ray-geoip` / `v2ray-geosite`，安装脚本在 `/usr/share/dae` 自动建立软链；
- **x86_64 二进制按 `GOAMD64=v3` 编译**（包架构仍为 `x86_64`）；
- **启动脚本**：官方精简样式，dae 自带日志轮转，不劫持 `/tmp/resolv.conf`，无订阅 cron。

## 安装

### 一键安装（apk）

```sh
curl -fsSL "https://raw.githubusercontent.com/498777/luci-app-dae/kdae/Auto_Install_Script.sh" | sh -s luci-app-dae
```

本分支（`kdae`）的脚本默认安装 **kdae 线**的 Release（tag 前缀 `dae-kdae_`）；如需安装 `main` 线，改用 `main` 分支的 URL，或设 `TAG_PREFIX=dae_`。

默认安装 `dae` + `luci-app-dae` + 中文语言包；`sh -s dae` 只装主程序。

脚本行为：非 apk 体系直接退出；未发现内核 BTF 时给出提示；从 Release 拉取 `SHA256SUMS` 并对每个下载的 apk 做 sha256 校验（Release 未附校验文件时跳过并提示）；包内不再声明 `vmlinux-btf` 依赖——由 CI 的 Makefile 断言保证；安装完成后自动刷新 LuCI 缓存。其余参数（`--repo`、`--no-proxy`、`--gh-proxy`、`--keep-dep` 等）见脚本 `-h`。

`geoip:` / `geosite:` 所需数据由 `v2ray-geoip` / `v2ray-geosite` 依赖带入，`/usr/share/dae` 的软链由安装脚本自动创建。

### 手动安装与启用

```sh
apk add dae luci-app-dae luci-i18n-dae-zh-cn

uci set dae.config.enabled=1 && uci commit dae
/etc/init.d/dae start
```

### 前提与平台

- **BTF**：dae 是 eBPF CO-RE 程序，内核需开启 `CONFIG_DEBUG_INFO_BTF`（官方 25.x 的 x86_64 / armsr 默认开启）。未开启时 dae 可安装但无法启动；CI 有 Assert 步骤保证产物不含 `vmlinux-btf` 依赖。
- **geo 数据**：dae 本体不依赖 geo 文件，只有规则引用 `geoip:` / `geosite:` 时才需要。默认配置含 geo 规则，安装官方 `v2ray-geoip` / `v2ray-geosite` 即可（文件位于 `/usr/share/v2ray/`，dae 默认 geo 目录自动兼容）。
- **x86_64v3**：官方 OpenWrt / ImmortalWrt 没有 `x86_64_v3` 架构或 SDK，v3 只是同一 amd64 的 `GOAMD64` 档位（上游 kdae 亦如此）。本仓库包架构为 `x86_64`、二进制按 v3 编译，需要 CPU 支持 AVX2 / BMI（2013+ Intel Haswell、2015+ AMD Excavator）。老 CPU 上运行会触发 SIGILL，将 `.github/workflows/build-apk.yml` 中 build-binary 的 matrix `goamd64: v3` 改为 `v1` 后重新构建即可规避；`aarch64` 不受影响。

## LuCI 界面

安装后 **服务 → DAE** 下为五个页签（JS 客户端渲染，`htdocs/luci-static/resources/view/dae/*.js`）。顶部是运行状态卡片（含重载按钮），每页带 CodeMirror 编辑器（`.dae` 语法高亮、代码折叠、括号匹配与自动补全、当前行高亮、格式化代码），底部为 Save / Save & Apply（保存并 `hot_reload`）/ Reset 三个按钮：

| 页签 | 编辑对象 |
| --- | --- |
| Global Settings | uci 启用开关 + `/etc/dae/config.dae` |
| DNS Settings | `/etc/dae/config.d/dns.dae` |
| Node Settings | `/etc/dae/config.d/node.dae`（节点 / 订阅 / 分组） |
| Routing Settings | `/etc/dae/config.d/route.dae` |
| Logs | `/var/log/dae/dae.log`（实时日志，末尾 1000 行） |

文件写入与 `hot_reload` 的执行权限由 `root/usr/share/rpcd/acl.d/luci-app-dae.json` 精确声明；运行状态由 `root/usr/libexec/dae-status` 提供（只放开该脚本的执行权限，不放开 `/proc`）。

默认 `node.dae` 是占位模板，直接启用会被 `dae validate` 拒绝启动；需先在 Node 页签填入真实节点 / 订阅。

## 编译与发布

构建分两段（见 `.github/workflows/build-apk.yml`）：

1. **预编译 job**：仿上游 kdae 的 `seed-build.yml`，在 ubuntu-22.04 + clang-15 / llvm-15 + Go 1.26 下交叉编译静态 `dae`（amd64 按 v3、aarch64 一份），产物作为 artifact 传给下一步。dae 核心**不在 OpenWrt SDK 内编译**（kdae 的 eBPF 生成与 SDK 的 bpf-headers 不兼容）。
2. **打包 job**：OpenWrt SDK 只负责把预编译二进制装进 `dae` 包，并编译 luci / 语言包。

**本分支 `kdae` 只能手动触发构建**：在 **Actions → Build apk → Run workflow**，ref 选 `kdae`。本分支不再有 `update-dae.yml`（该工作流只认 `DAE_RELEASE`，在 `kdae` 上会把版本写坏，已删除），且 `on.schedule` 在非默认分支不生效，所以没有“每日自动同步 + 自动构建”。

**`kdae` 线的 Release tag 为 `dae-kdae_<日期>`**（与 `main` 线的 `dae_<日期>` 区分），包版本为 `dae-<YYYY.MM.DD>-rN`：dae 核心每架构一份，luci / 语言包各一份。每次发布前自动清空该 tag 的旧附件并附带 `SHA256SUMS`。保留策略：**按 tag 前缀各保留最近 2 个**（`dae-kdae_` 与 `dae_` 互不影响），workflow run 与 artifact 各保留 2 天。

在完整源码树中手动编译 `luci-app-dae` 时，`dae` 包需要本地已存在预编译二进制：

```sh
git clone https://github.com/498777/luci-app-dae package/luci-app-dae
# 需先从 Actions 产物或上游 kdae 预编译产物获取对应二进制并放好：
#   package/luci-app-dae/dae/files/prebuilt/x86_64v3/dae   (x86_64)
#   package/luci-app-dae/dae/files/prebuilt/aarch64/dae     (aarch64)
./scripts/feeds update -a && ./scripts/feeds install -a
make menuconfig   # Network -> Web Servers/Proxies -> luci-app-dae
make package/dae/compile V=s
```

## 目录结构

```
Auto_Install_Script.sh             一键安装（apk）
dae/                               核心包（默认配置 / init；二进制由预编译 job 提供）
  files/dae.init                   官方精简启动脚本
  files/config.dae                 拆分配置入口（include config.d/*.dae）
  files/config.d/{dns,node,route}.dae   默认拆分模板
luci-app-dae/                      LuCI 界面（htdocs 视图 + menu.d/acl.d + libexec 状态脚本 + po）
.github/workflows/build-apk.yml    预编译 kdae 二进制 + 编译 apk 并发布 Release（本分支已删除 update-dae.yml）
```

日志：`/var/log/dae/dae.log`，轮转由 dae 的 `--logfile-maxbackups` / `--logfile-maxsize` 控制，对应 uci 的 `dae.config.log_maxbackups` / `log_maxsize`。

## 第三方前端资源

`luci-app-dae/root/www/luci-static/resources/dae/` 下的 CodeMirror 资源为 **5.65.21 压缩版**，取自 cdnjs（`https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.21/`）。库本体的压缩版位于该包的 **根目录**（`codemirror.min.js` / `codemirror.min.css`），addon 与 theme 与上游同名：

| 仓库内路径 | 上游文件 |
| --- | --- |
| `lib/codemirror.min.js` | `codemirror.min.js` |
| `lib/codemirror.min.css` | `codemirror.min.css` |
| `addon/edit/matchbrackets.min.js` | `addon/edit/matchbrackets.min.js` |
| `addon/edit/closebrackets.min.js` | `addon/edit/closebrackets.min.js` |
| `addon/selection/active-line.min.js` | `addon/selection/active-line.min.js` |
| `addon/fold/foldcode.min.js` | `addon/fold/foldcode.min.js` |
| `addon/fold/foldgutter.min.js` | `addon/fold/foldgutter.min.js` |
| `addon/fold/foldgutter.min.css` | `addon/fold/foldgutter.min.css` |
| `addon/fold/indent-fold.min.js` | `addon/fold/indent-fold.min.js` |
| `theme/dracula.min.css` | `theme/dracula.min.css` |

`mode/dae/dae.js` 是本仓库自写的语法模式，保持未压缩以便修改。升级 CodeMirror 时需同步替换上表全部文件，并保证 `editor.js` 的 `CM_ASSETS` 与实际文件一一对应 —— 声明了却不存在、或存在却未被声明，都会使编辑器静默降级为普通文本框。

替换结果的校验命令（在 `luci-app-dae/root/www/luci-static/resources/dae/` 下执行）：

```sh
sha256sum -c <<'EOF'
d649a8d6bd5d0ca9bb3bef8212c9de6fa5599af3e3fe2898f94861dfe87bea7d  lib/codemirror.min.js
22f18b4dec95cc981a96f8e69f61f595314162fd102ba401abcd20b0674d9846  lib/codemirror.min.css
d0676055ec033a6f8f8f225b3fe47f8b6b2388e5beba4765d24152f106077806  addon/edit/matchbrackets.min.js
d48f92696b5cd5dc27055c73d1c34c4fa4e4e1e5e7b5baea58e5c23ca9777a36  addon/edit/closebrackets.min.js
6b5973470168d480f70a87affe7b1f93bea82369d790a23349c6a4816ae11708  addon/selection/active-line.min.js
4d101855eaa4334515bbdc6d96b1ff885ac83093d30cf792307e9e109622bd6e  addon/fold/foldcode.min.js
7d42c7d69bab903cf0ebb6864faf0ce097dbcabf9576dd8956bf97f3db8bb5cc  addon/fold/foldgutter.min.js
6c92093b9b94474c6d956b2989361928888e25fa695b140d8d8d0c0d2400773c  addon/fold/foldgutter.min.css
25d0dae3fc23df52e6ef52bf144a2a1b4418f130cb334eeb84359f5171e6cd46  addon/fold/indent-fold.min.js
d3a5434495be383a98973444d440d60b5148e67dd7c94e87369c2dcb829bb9e0  theme/dracula.min.css
EOF
```

## 许可证

**AGPL-3.0-only**（与 `dae/Makefile` 的 `PKG_LICENSE` 一致）。上游 dae 源码为 AGPL-3.0（olicesx/dae 派生自 daeuniverse/dae）；LuCI 界面移植自 QiuSimons/luci-app-dae。

## 鸣谢

- [daeuniverse/dae](https://github.com/daeuniverse/dae) 及其贡献者（dae 引擎）；[olicesx/dae](https://github.com/olicesx/dae)（kdae 分支，本仓库二进制来源）；[QiuSimons/luci-app-dae](https://github.com/QiuSimons/luci-app-dae)（界面行为与文案的移植来源）；
- 本仓库（498777）：负责打包与每日同步上游；
- [OpenWrt LuCI](https://github.com/openwrt/luci) 框架与 luci-app 基础设施；JS 版界面（`form.TextValue` 自定义 load/write + `fs.*_direct` + menu.d/acl.d 的权限写法）参考 [ImmortalWrt/luci](https://github.com/immortalwrt/luci) 的 `luci-app-dae`。
