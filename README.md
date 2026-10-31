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

主分支初始化提交包含 Git 骨架及主题 Submodule；`feat/hexo-foundation` 开发分支进行 Hexo 本地初始化与首次构建验证。提交身份仅在当前项目配置，未配置主项目远程仓库，未部署站点。

本地开发（在 `apps/blog/` 下）：

```sh
npm ci
npm run clean
npm run generate
npm run server -- --ip 127.0.0.1 --port 4000
```

预览仅监听本机回环地址，使用 Ctrl+C 停止。博客固定使用北京时间；详见 `apps/blog/README.md` 的时间规范及实际 HTML 回归测试。保留本地音乐播放器，音频目录约定为 `/home/orangepi/音乐/`，网站 URL 为 `/music/`；当前空歌单未做真实播放测试。评论、在线歌单和第三方统计均未启用。分类/标签汇总页已建立；About、Friends、RSS 的未实现入口已隐藏。部分前端库仍来自 CDN，完整浏览器视觉和交互尚未验收。
