---
title: Firefly 主题初始化测试
date: 2026-10-30T12:30:00+08:00
updated: 2026-10-30T12:30:00+08:00
author: Embed-LiangJ
categories:
  - 技术测试
tags:
  - Hexo
  - Firefly
description: 在 Orange Pi 上验证中文文章、模板、代码高亮、字数统计和本地搜索。
comments: false
copyright: false
toc: true
---

# 中文渲染测试

这是 Orange Pi 技术博客的第一篇测试文章。本文仅用于本地验证，不代表网站已经部署或开放公网访问。

## 基础功能检查

使用 Hexo 生成静态页面，使用 Firefly 的 EJS 模板呈现文章。检查文章标题、发布时间、目录和字数统计是否正确。

- 中文段落与标点正常显示。
- 无序列表可以渲染。
- 搜索索引包含本文标题与正文。

## 代码高亮测试

下面是 JavaScript 代码块，用于检查构建时的语法高亮。

```javascript
const message = '你好，Orange Pi！';
console.log(message);
```

更多信息请参阅 [Hexo 官方文档](https://hexo.io/zh-cn/docs/)。
