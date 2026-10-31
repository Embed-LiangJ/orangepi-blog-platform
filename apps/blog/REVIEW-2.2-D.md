# 阶段 2.2-D 精准整改记录

依据：当前对话中可访问的阶段 2.2-C Review；整改开始时没有独立保存的旧审查报告。P0：旧报告没有列出，本次没有确认新增 P0。

| 级别 | 文件 | 问题、复现条件与影响 | 最小整改 | 验收 |
|---|---|---|---|---|
| P1 | scripts/beijing-time.js | 北京时间月初/年初文章，原生归档按进程时区的 Moment 分入前月/前一年 | 通过公开 generator get/register，仅给归档生成器提供带时区的查询副本 | 隔离真实构建验证年月目录和文章归属 |
| P1 | scripts/site-render-policy.js；主题 music.ejs（只读） | 歌曲元数据含结束 script 标签时，原主题 JSON.stringify 不能阻止 HTML 注入 | 内存视图替换单个序列化表达式，安全编码 JSON；前端对播放器名称/作者作文本转义 | 恶意文本 fixture 不产生额外 script，解码后元数据保持原值 |
| P1 | tests/verify-beijing.cjs | 原测试在正式项目中 clean/generate，改写 public 和 db.json | mkdtemp 隔离工程；只读共享主题/依赖；finally 只清理自己的目录 | 正式 source/public/db/config 前后 SHA256 指纹相同 |
| P2 | scripts/beijing-time.js | Object.create(post) 使扩展 permalink 字段不再是自有字段 | 保留属性描述符/getter/自有字段，只替换日期副本 | 实际原生 permalink 过滤器输出 kept/，原始 Moment 不变 |
| P2 | source/js/site-local-music.js | 桌面/移动端各建实例，容器移除后注册表保留旧实例，脚本重载无全局保护 | 单活动实例、全局幂等、移除/pagehide 清理、返回恢复、读取音量 | JSDOM+APlayer 替身测试重复加载、PJAX 移除/返回、CDN 缺失和空歌单 |
| P2 | _config.yml；scripts/beijing-time.js | updated_option=mtime 与脚本缺失 updated 时回退 date 不一致 | 明确 updated_option=date | 真实构建核对 fallback；另测 date/updated 不相同 |
| P2 | scaffolds/*.md；scripts/beijing-time.js | 默认新建文章日期无偏移，不符合站点严格规范 | scaffold 标签读取 Hexo 提供的 UTC 创建时间，输出带偏移的 date/updated | 纽约进程实际执行 hexo new post/draft/page，核对创建时刻 |
| P2 | 两个站点 scripts | 日期格式化与输出层职责交叉，详情时间被重复解析 | 保留 helper 输出详情 ISO；删除输出层详情时间回退解析 | 原三组样本及扩展样本真实 HTML 回归 |

## 撤回上一阶段的一项判断

旧 Review 直接重复调用 ScrollManager.initNavbarExtraButtons，观察到绑定多次，但不能据此认定正常 PJAX 路径有缺陷。当前主题 ScrollManager.init 存在 initialized 保护。verify-scripts.cjs 对真实 init 路径调用两次，音乐按钮一次点击只调用一次 toggle。没有为该误判修改主题或增加事件拦截。

## 已通过及证据边界

- 旧阶段已通过：基线文章时刻/首页/详情、基础路由、Submodule 干净、依赖哈希、生成目录忽略。
- 新测试先复现旧代码失败：11 月归档文件不存在；扩展 permalink 字段不是自有属性。
- 新时间集成测试覆盖 5 个带 +08:00 的日期 × 两种进程时区 × 干净/缓存构建，验证实际 HTML、数据库、年月归档、分类/标签和 permalink。
- 独立非法日期工程实测：2026-02-30T00:30:00+08:00 被拒绝，退出码 2，错误为 invalid date。
- 播放器有静态检查与 JSDOM/替身事件模拟；另用现有 HeadlessChrome 110 实际加载首页，确认 APlayer/PJAX CDN 可用、空歌单提示和音乐入口保留。连续点击分类→标签→归档→首页，页面上下文标记保留，实例数为 0，未发生整页重载或虚构播放。
- 不修改服务器时区、依赖、主题磁盘文件、OpenResty、1Panel 或音乐目录。

## 尚不能宣称通过

- 非空歌单的实际浏览器 PJAX、移动布局切换、CDN 加载失败后的恢复行为（实际浏览器仅验收空歌单导航）。
- APlayer 真机音频播放、已加载元数据后的 seek 恢复、Range 请求。
- /music/ 的 OpenResty 容器映射和工作进程权限（尚未配置）。

这些是部署/媒体验收边界，不以空歌单替代真实播放证据。当前锁定依赖中的间接引用与模板 DOM/表达式兼容性仍需在升级时回归；npm 既有低风险告警本阶段不修复。

## 复验

```sh
cd apps/blog
node tests/verify-scripts.cjs
node tests/verify-beijing.cjs
npm run clean
npm run generate
```

正式 clean/generate 是人工验收步骤，与隔离测试的无副作用保证不同。全部修改保持未暂存、未提交，供用户 Review。
