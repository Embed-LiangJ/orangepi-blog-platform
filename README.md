# Orange Pi Blog Platform

在 Orange Pi 3B 上维护基于 Hexo 与 Firefly 的个人技术博客。开发仓库与 OpenResty 网站发布目录分离，不在公开目录中开发。

## 目录职责

- `apps/blog/`：未来的 Hexo 站点目录；当前尚未安装或初始化 Hexo。
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

本仓库的初始化提交包含本地 Git 骨架及主题 Submodule。提交身份仅在当前项目配置；未配置主项目远程仓库、未安装依赖、未构建或部署站点。下一阶段需确认 Hexo/渲染器与插件版本、主题配置策略和独立发布目录。
