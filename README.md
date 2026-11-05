# Orange Pi Blog Platform

在 Orange Pi 3B 上维护基于 Hexo 与 Firefly 的个人技术博客。开发仓库与 OpenResty 网站发布目录分离，不在公开目录中开发。

## 目录职责

- `apps/blog/`：Hexo 8.1.2 站点目录，包含本地精确版本依赖清单、配置、脚手架和测试文章。
- `apps/blog/_config.firefly.yml`：站点独立主题配置，不修改主题默认配置。
- `apps/blog/public/`、`node_modules/`：本地生成内容与依赖，均不进入 Git。
- `apps/blog/themes/firefly/`：Firefly 主题 Git Submodule，origin 使用个人 Fork。
- `.gitmodules`：记录主题 Submodule 的路径与克隆地址。

## 主题来源

- origin：https://github.com/Embed-LiangJ/hexo-theme-firefly.git
- upstream：https://github.com/LKDenchin/hexo-theme-firefly.git
- 检查时默认分支：`master`；主项目通过 gitlink 固定主题提交。
- 主题处于开发者预览阶段，尚无 Tag 或 GitHub Release。
- 保留主题原有 LICENSE、README、CONTRIBUTING；不直接改动主题源码或 package.json。

## 后续克隆

```sh
git clone --recurse-submodules <主项目仓库地址>
```

`upstream` 是本地 Submodule 的远程配置，不随 `.gitmodules` 传播；其他工作副本如需使用，须在主题目录中单独添加。

## 当前阶段

`feat/hexo-foundation` 已完成并推送阶段3.3/3.4，现有OpenResty运行10cf3b6版本（正式功能/视觉待用户人工验收）。当前Stage3.5本地一级固定为“首页｜技术博客｜科研与项目｜生活动态｜关于我”；技术博客保留归档/分类/标签分组，科研与项目、关于我分别使用原生独立Page `/research-projects/`、`/about/`，正文互相隔离且不含博客文章列表；首页仅保留简短入口卡片，具体资料待补充，不新增应用或后端。Stage3.5已获用户人工验收全部PASS，现授权Git提交/推送与注释Tag `stage-3.5-accepted` 固定，执行结果以项目状态及实际Git refs为准；未部署，不进入Stage4。主仓库origin仍为个人仓库 `Embed-LiangJ/orangepi-blog-platform`，不是主题仓库或上游。

当前状态和未验收范围以 [PROJECT_STATUS](docs/PROJECT_STATUS.md) 为准，工程规范见 [AGENTS](AGENTS.md)，技术边界见 [TECHNICAL_DECISIONS](docs/TECHNICAL_DECISIONS.md)。[提交计划](docs/reviews/stage-3.4-final-commit-plan.md) 区分拟提交代码/文档与本地历史附件；不能将目录内所有资料直接加入Git。

本地开发（在 `apps/blog/` 下）：

```sh
npm ci
npm run clean
npm run generate
npm run server -- --ip 127.0.0.1 --port 4000
```

预览仅监听本机回环地址，使用 Ctrl+C 停止。博客固定使用北京时间；详见 `apps/blog/README.md` 的时间规范及实际 HTML 回归测试。保留本地音乐播放器，音频存储在仓库外的机器本地目录（文档以 `BLOG_MUSIC_DIR` 表示），网站 URL 为 `/music/`；当前空歌单未做真实播放测试。评论、在线歌单和第三方统计均未启用。分类/标签汇总页与About独立页已建立；Friends、RSS 的未实现入口仍隐藏。部分前端库仍来自 CDN。已确认的视觉、阅读及Windows Chrome人工验收范围见状态文档；Android真机待测，A1仍DEFERRED但参与构建，F4长期观察，不能据限定关闭宣称全设备/全功能或无泄漏验收通过。
