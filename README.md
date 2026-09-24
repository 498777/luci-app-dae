# luci-app-dae（自建仓库 · `kdae` 分支 · 只出二进制）

> License: **AGPL-3.0-only**（[LICENSE](./LICENSE)）

OpenWrt 上 [dae](https://github.com/daeuniverse/dae)（eBPF 透明代理）的自建构建仓库。本分支（`kdae`）以 [olicesx/dae](https://github.com/olicesx/dae) 的 **kdae** 分支源码为来源，交叉编译静态 `dae` 二进制，**仅通过 CI artifact 交付**：

- **不编译 apk**、**不发 GitHub Release**、**不含 LuCI 界面**；
- 需要 apk 包（含 `luci-app-dae` 界面与中文语言包）请使用 `main` 分支。

## 产出物

| 架构 | artifact 名 | 编译档位 |
| --- | --- | --- |
| x86_64 | `dae-x86_64v3` | `GOAMD64=v3`（需 CPU 支持 AVX2 / BMI） |
| aarch64 | `dae-aarch64` | 通用 arm64 |

artifact 内只有一个文件 `dae`（CI 会把上游产物改名后再上传，见工作流 `Stage binary as "dae"`）。保留期 **30 天**。取哪个上游提交由 `dae/Makefile` 的 `KDAE_COMMIT`（完整 40 位 sha）固定，CI 会 checkout 到该 commit，构建可复现。

## 取用二进制

在 **Actions → Build dae binary (kdae)** 里选最近一次 run，下载对应架构的 artifact，把里面的 `dae` 放到目标机的 `/usr/bin/dae` 并 `chmod 755`。

本机装有 `gh` 时可用命令行（`gh run download -n <name>` 会解到同名目录）：

```sh
gh run download -R 498777/luci-app-dae -n dae-x86_64v3
install -m 755 dae-x86_64v3/dae /usr/bin/dae
```

该二进制是**静态链接的 ELF**，除内核 BTF 外无运行时依赖。注意 x86_64 版本按 `GOAMD64=v3` 编译，需 CPU 支持 AVX2 / BMI，否则运行会 `Illegal instruction`（见下节）。

手工部署所需的 `init` 脚本与默认配置仍在 `dae/files/`（`dae.init`、`dae.config`、`config.dae`、`config.d/{dns,node,route}.dae`），本分支不再打包，仅作素材。

## 触发构建

**本分支只能手动触发**：**Actions → Build dae binary (kdae) → Run workflow**，ref 选 `kdae`。

- `kdae` 是非默认分支，`on.schedule` 不生效，故没有「每日自动同步」。
- 本分支已删除 `update-dae.yml`（它只认 `DAE_RELEASE`，在 `kdae` 上会把版本写坏）。
- `push` 到 `kdae` 时，只有改动 `dae/Makefile` 或本工作流文件才会触发（`on.push.paths` 过滤）。
- 更新上游：把 `dae/Makefile` 的 `KDAE_COMMIT` 换成新的完整 40 位 sha，并按需更新 `PKG_VERSION` / `PKG_RELEASE`。

> ⚠️ 工作流文件名必须保持 `.github/workflows/build-apk.yml`：GitHub 要求 workflow 文件存在于**默认分支**才会出现在 Actions 列表并可 `workflow_dispatch`，本分支靠与 `main` 同路径获得手动触发入口（dispatch 时 ref 选 `kdae`，实际执行的是本分支的文件）。改名会导致 `kdae` 无法手动触发。

## 前提与平台

- **BTF**：dae 是 eBPF CO-RE 程序，内核需开启 `CONFIG_DEBUG_INFO_BTF`（官方 25.x 的 x86_64 / armsr 默认开启）。未开启时 dae 无法启动。
- **geo 数据**：dae 本体不依赖 geo 文件，只有规则引用 `geoip:` / `geosite:` 时才需要；安装官方 `v2ray-geoip` / `v2ray-geosite` 即可（文件位于 `/usr/share/v2ray/`，dae 默认 geo 目录自动兼容）。
- **x86_64v3**：官方 OpenWrt / ImmortalWrt 没有 `x86_64_v3` 架构或 SDK，v3 只是同一 amd64 的 `GOAMD64` 档位（上游 kdae 亦如此）。本分支按 v3 编译，需要 CPU 支持 AVX2 / BMI（2013+ Intel Haswell、2015+ AMD Excavator）；老 CPU 上运行会触发 SIGILL，可用 `grep -o avx2 /proc/cpuinfo | head -1` 确认。规避办法是把 `.github/workflows/build-apk.yml` 中 `build-binary` 的 matrix `goamd64: v3` 改为 `v1` 后重新构建；`aarch64` 不受影响。

## 编译

单段构建（见 `.github/workflows/build-apk.yml`）：仿上游 kdae 的 `seed-build.yml`，在 ubuntu-22.04 + clang-15 / llvm-15 + Go 1.26 下交叉编译静态 `dae`，产物直接上传为 artifact。dae 核心**不在 OpenWrt SDK 内编译**（kdae 的 eBPF 生成与 SDK 的 bpf-headers 不兼容）。

## 目录结构

```
dae/Makefile                       版本与上游提交的唯一记录（PKG_VERSION / PKG_RELEASE / KDAE_COMMIT）
dae/files/                         手工部署素材（init / 默认配置 / 拆分配置模板），本分支不再打包
.github/workflows/build-apk.yml    交叉编译 kdae 二进制并上传 artifact（文件名不可改，见上文警告）
```

日志：`/var/log/dae/dae.log`，轮转由 dae 的 `--logfile-maxbackups` / `--logfile-maxsize` 控制，对应 `dae/files/dae.config` 的 `log_maxbackups` / `log_maxsize`。

## 许可证

**AGPL-3.0-only**（与 `dae/Makefile` 的 `PKG_LICENSE` 一致）。上游 dae 源码为 AGPL-3.0（olicesx/dae 派生自 daeuniverse/dae）。

## 鸣谢

- [daeuniverse/dae](https://github.com/daeuniverse/dae) 及其贡献者（dae 引擎）；[olicesx/dae](https://github.com/olicesx/dae)（kdae 分支，本仓库二进制来源）；
- 本仓库（498777）：负责打包与上游同步。
