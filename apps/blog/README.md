# 本地博客维护规范

## 固定北京时间

- 网站和主题站点时区均为 `Asia/Shanghai`（UTC+08:00）。Ubuntu 保持 `Etc/UTC`。
- 发布和更新时间必须采用完整 ISO 8601，例如 `2026-10-30T12:30:00+08:00`。
- `hello-firefly.md` 保留原来的年月日和钟面时间 12:30，明确解释为北京时间，不是原 UTC 时刻的迁移。
- post/draft/page 脚手架通过站点标签输出明确的 +08:00 日期，并保留创建瞬间；手工修改后仍应检查。
- 日期缺少偏移或格式错误会令构建失败，而不是猜测时间。缺少 updated 时回退到 date，与 `updated_option: date` 一致。
- 永久链接、首页、详情、归档和 HTML datetime 统一使用北京时间。浏览器和 VPN 不参与时间转换。

### 为什么需要站点脚本

当前 Hexo 8.1.2 会对已经带偏移的 Front-matter 时间再次按墙上时间调整；Firefly 又覆盖了 full_date，并忽略网站时区。

`scripts/beijing-time.js` 在生成器运行前从原始 YAML 重新解析明确的时间，使用 Warehouse 的 update API 更新日期；格式化采用带时区的副本。permalink 副本保留自有字段、属性描述符及 getter；归档生成器通过公开 get/register 接口接收专用的北京时间查询副本，保证年月归属正确。均不改变数据库 Moment 的时区或第三方代码。不设置 Moment 全局默认时区，避免 Hexo Warehouse 的内部 `_d` 序列化出现偏差。

`scripts/site-render-policy.js` 使用完整 HTML 输出过滤器补全卡片/归档时间属性、修正构建时间，并实施导航和资源策略；不再次解析详情页时间。它通过 Hexo 的内存视图 getView/setView 接口，仅将主题的歌单 JSON 序列化表达式替换成安全助手，防止 `</script>` 注入，磁盘中的 Submodule 不变。模板表达式变化时明确报错，不能静默跳过。使用现有锁文件中的 jsdom（由 hexo-renderer-marked 引入），未新增依赖。主题升级或依赖调整后必须重新测试。

回归测试：

```sh
node tests/verify-scripts.cjs
node tests/verify-beijing.cjs
```

时间集成测试在 mkdtemp 创建的独立 Hexo 工程中运行，复制本站配置/脚本/源文件，仅读取共享主题和依赖。覆盖 00:30、12:00、23:30、月初、年初、非零秒和不同 updated，验证实际 HTML、年月归档归属、分类/标签、数据库时刻及路由。在 UTC 和纽约进程时区下验证干净/缓存构建，并实际执行新建文章/草稿/页面、非法日期拒绝和安全歌单序列化测试。

测试结束只清理自己的临时目录，通过 SHA256 指纹确认正式 source/public/db/config 未变；不会重建正式网站。单元测试使用 JSDOM 与 APlayer 替身验证生命周期，不下载或播放音频，不等同于真实浏览器验收。

## 本地音乐

- 唯一音乐存储目录沿用机器上已有的目录，在 Git 仓库之外；本文用 `BLOG_MUSIC_DIR` 表示，实际值由本机运维记录维护，不在公开仓库重复披露。
- `BLOG_MUSIC_DIR` 仅为文档占位符，不会被 Hexo 或 Nginx 自动展开；本次没有迁移目录或改变运行配置。
- 浏览器 URL 前缀：`/music/`，不是 Linux 文件系统路径。
- 配置入口：`_config.firefly.yml` 的 `music.local.playlist`，目前为空，不扫描目录、不虚构歌曲。
- 将来按真实文件填写 APlayer 条目：`name`、`artist`、`url`，可选 `cover`、`lrc`。资源路径只允许 `/music/` 下的站内路径；建议对文件名做 URL 编码。
- `music.mode: local`，保留播放器组件和音乐导航。Meting 配置清空，其外部脚本由本站输出策略移除。
- 当前 Firefly 只输出本地歌单与容器，没有创建本地 APlayer 实例；`source/js/site-local-music.js` 管理一个活动实例，跨桌面/移动布局共享，读取配置音量，并对曲名/作者作 HTML 文本转义。
- 初始化全局幂等；PJAX 后清理已移除容器的旧实例；pagehide 释放，返回后恢复曲目/位置但不自动播放。空歌单和 CDN 失败有提示。它不获取歌单、不调用音乐 API、不复制音频。
- Review 中“正常 PJAX 必然重复绑定音乐按钮”的判断已撤回：Firefly 的 ScrollManager.init 有 initialized 保护，本次测试验证了实际 init 路径。
- APlayer JS/CSS 暂时来自 jsDelivr；这只是播放器程序，不是外部音频源。
- 目前目录为空，未验证真实歌曲播放或音频 Range 请求。

未来 OpenResty 映射示意（本阶段没有应用；`/absolute/path/to/local-music/` 是通用占位路径，部署前须在本机替换为 `BLOG_MUSIC_DIR` 对应的真实绝对路径）：

```nginx
location /music/ {
    alias /absolute/path/to/local-music/;
    autoindex off;
}
```

当前 OpenResty 是容器部署。正式实施前还必须核对容器挂载、工作进程读取权限和目录穿越权限；仅有宿主机 alias 路径不保证容器可读。不要 chmod 777，不暴露 HOME，不把音乐复制进 source/public/Git。

Hexo 预览本阶段不提供 /music/ 文件映射。

## 路由与外部资源

- 分类和标签页使用主题自带的索引布局，数据来自真实文章。
- About 导航由本站完整 HTML 过滤器移除（主题硬编码，不受 nav.menu 控制）。Friends 同时在配置中关闭。
- 未安装 RSS 插件，没有有效 atom.xml；移除 feed 自动发现及 RSS 入口，不伪造 XML。
- 所有可见导航都应有实际生成路由；不要创建虚假的个人介绍或友链。
- 保留 Font Awesome、Fancybox、APlayer、PJAX CDN。现有 Chromium 已验证空歌单首页及分类→标签→归档→首页的实际 PJAX 导航；这不等于完整浏览器视觉、非空歌单和真实音频验收。
