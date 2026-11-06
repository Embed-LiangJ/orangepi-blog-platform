# 技术决策与原因

## D20. 首页文章布局沿用原生设置，补齐PJAX初始化状态同步（2026-11-05）

**Stage3.5.1验收/发布补记（2026-11-06）：** 用户已确认热修复人工验收PASS，授权仅相关代码/测试/必要文档提交、推送及新Tag `stage-3.5.1-accepted`，从该Tag独立构建发布。实现保持不变；工作区既有Stage3.4部署段落与历史资料不夹带。复用现有current符号链接原子切换，不改其他站点配置；保留Stage3.5原发布/完整静态备份/原配置和旧回滚组件，新一键回滚须验证并恢复Stage3.5，而非更早Stage3.4。上线只做必要构建/HTML内容及HTTP资源验证，不重跑大规模浏览器；正式人工验收待用户，不进入Stage4。以下“仅本地/未授权/待确认”为实施期历史，不覆盖新授权；实际SHA及发布证据见PROJECT_STATUS。

**授权/状态：** 用户授权Stage3.5上线后定向热修复及本地预览，未授权本轮commit/push/正式部署或Stage4。已实施并通过本地定向自动化，等待用户人工确认。正式版本仍为已部署的`stage-3.5-accepted`，本轮不动其发布目录、配置、备份或回滚入口；不改写下方D19等实施期的历史授权边界。

**实测原因：** 原生Settings.restoreAll在完整加载时恢复`postListLayout`，而PJAX用默认list模板替换main后调用的PostLayoutManager.init因initialized提前返回，没有恢复新容器/列表属性。保存grid时复现335.75px→1037px，storage仍grid；无偏好时原生桌面默认list正常。原生移动端还会在无偏好时自动持久化grid，与站点期望默认list不一致。不能据此断言用户既有grid究竟来自主动选择还是旧移动初始化；不把网格模式本身判为错误或借修复清除有效偏好。CSS版本未变，固定主题原生脚本/样式指纹与正式响应一致，原生独立反例不依赖Stage3.5导航适配。

**最小决定：** 新站点脚本通过内存scripts视图，在原生post-layout.js后、DOMContentLoaded/boot前加载独立内容版本化客户端。上游管理器完整SHA锁定`9e99673d8e973557a7dadb8a181d47e3622192d5e890d5fb6ea495314661e123`，唯一锚点、重复加载/生成幂等及未知内容拒绝。仅包装manager.init：无保存偏好时通过原生Settings API建立list默认值；始终委托原init（保留一次性绑定），返回后按原生getter同步当前post-list容器/列表属性及按钮。已有grid/list原样保留；原生显示设置继续负责切换和持久化。

**范围/验证：** 不新增全局监听器、轮询或跨PJAX节点引用，不修改Settings实现、卡片结构、CSS/固定宽度/!important、PJAX选择器、科研/About正文、A1/B1或Submodule。单位测试结合真实原生管理器/Settings验证桌面与移动宽度的无偏好/list/grid、替换main、切换及独立页不变，保留上游反例；浏览器实测宽度/模式验证首次、同页首页、PJAX、历史和刷新一致及亮暗/用户网格保存。结果见PROJECT_STATUS，真实BFCache及其他终端不由本轮推断。

**本地撤回（需另获授权）：** 停用本轮新`scripts/site-post-layout.js`接入并重新generate本地预览即可不再引用新客户端；资源/测试可保留。不得以本轮本地修复为由回滚正式站点、删除资料或改主题。现阶段不执行撤回。

## D19. Stage3.5正文隔离使用原生独立Page（2026-11-05）

**验收/版本固定补记：** 用户已确认Stage3.5人工验收全部PASS，并单独授权当前分支提交/推送及注释Tag `stage-3.5-accepted`；不修改已验收实现、不部署或进入Stage4。下方实施期“待验收/未授权”保留历史含义，当前状态以PROJECT_STATUS为准。既有D17上线记录仅本地保留，不夹带本次Stage3.5提交。

**决定及原因：** 用户人工验收指出hash入口仍共用首页，两个正文和文章列表均在同一DOM，不满足独立页面边界。替代下方D18锚点方案；旧导航测试通过不构成正文隔离证明，历史记录不改写。

**页面合同：** `source/research-projects/index.md`和`source/about/index.md`由Hexo原生Page处理，分别固定`type: research-projects/about`、`layout: site-page`、`permalink: research-projects/index.html / about/index.html`。内容只有对应领域的“待补充”段落，不虚构经历、资料或项目。首页保留Banner、原生动态侧栏和文章预览，只留两个简短入口，取消完整科研/About正文与hash入口。

**模板边界：** 原page/about模板默认无侧栏且可附加profile/stats，故注册站点独立`site-page.ejs`内存视图：从SHA锁定的原index提取三栏/侧栏/页脚外壳，替换整个main为当前page.content，绝不执行原post-list循环。站点脚本仍名`site-home-sections.js`，保留双视图幂等、未知上游拒绝；不复制主题源码进磁盘或修改Submodule。主布局仍由原layout.ejs提供Banner等公共结构。

**导航与策略：** 五项一级/技术博客子菜单不变，新页面使用普通路径及服务端layout/type active，删去首页hash专用高亮/滚动/焦点逻辑，不接管PJAX/BFCache。仅保留原先隐藏菜单测宽帧。旧输出策略改为原生About Page存在才保留其入口，Friends/RSS仍隐藏。实际分类/标签详情生成器不保证page.layout，active补用官方is_category/is_tag，归档继续is_archive，不猜URL。

**验收要求：** 同一DOM合同用于实际生成HTML及浏览器切换后的document；验证当前正文类型/完整段落、禁止异页正文和post-list，连CSS-hidden污染也拒绝。隔离工程的反例文章/动态仅作测试，不进开发预览。公共导航和侧栏允许共享，不将它们当作独立页完整正文。结果见 [当前交付](reviews/stage-3.5-navigation.md)；只本地预览，未经用户授权不提交/部署/进入Stage4。

以下D18为首轮及hash补充历史，现行页面边界以D19为准。

## D18. Stage3.5导航采用原生披露分组，保持原生汉堡/PJAX（2026-11-04）

**用户补充整改：** 一级固定为首页/技术博客/科研与项目/生活动态/关于我。保留首轮details分组与原生汉堡；新增`site-home-sections.js`只在首页首个分页的原主列内存视图插入`research-projects`、`about-me`两张卡片，全文仅为待确认的结构，不编造个人经历/项目。原图不在当前可用上下文，未声称照图复刻。

导航使用经url_for处理的`/#research-projects`、`/#about-me`（支持站点root前缀），跨页仍交给原PJAX，同页仍用原生hash历史。客户端只为这两个真实首页目标更新active/aria、聚焦和固定头部避让；PJAX结束后一帧校正其旧库offset/scrollPos，不改history/cache策略，真实pageshow.persisted不强制滚动。该帧每次查询当前DOM，可取消、无旧节点闭包或轮询。五项挤压时补测被原生隐藏列表的真实宽度，再同步原生mobile-nav/visible类，不替换ScrollManager，搜索/音乐等按钮仍原生处理。

两份模板分别受完整SHA/唯一锚点/重复生成保护，首页模块适配@6不与导航@5争同一视图。用户真实资料、项目链接和设计图细节仍待后续补充；本轮仅本地预览，不提交、不部署。下方“三入口/缺页不显示”为首轮方案历史，现已由本次五项真实锚点方案取代。

**范围：** 用户授权导航信息架构与必要交互，仅本地实现/测试/预览；不提交、不推送、不部署或进入Stage4。既有D17部署记录保留，生产站点仍为10cf3b6版本。

**结构：** 当前只显示“首页｜技术博客｜生活动态”。技术博客用原生details/summary分组，子链接为全部文章/分类/标签，原`/archives/`、`/categories/`、`/tags/`不变；动态真实路由由主题generator生成`/dynamic/`，只改导航名称。科研与项目、关于我没有真实页面或可用首页锚点，因此不造链接/内容，留待另行提供真实页面。

**接入：** 扩展现有`site-nav-active.js`的before_generate@5与完整模板SHA保护；不再叠加第二个修改同一视图、破坏重复生成幂等的适配器。保留官方is_archive判定，以is_post/__post和分类/标签layout派生父子active，排除dynamic字样文章slug误判；内存中去掉无页面的About块及应用式menubar角色，使用普通链接列表与原生披露语义。

**交互：** 独立CSS/JS由Injector注册内容版本，所有完整页面加载以支持首页首次PJAX；不改已有注入器。固定委托处理悬停/点击/焦点/Escape，PJAX和pagehide/pageshow时收起，不保留旧菜单节点或新增全局计时器/MQL。汉堡、backdrop和body状态仍由原ScrollManager拥有；只有菜单持有open状态时才调用原生关闭方法。不改PJAX选择器、缓存或B1控制器。

**布局：** 导航局部CSS保留原hue语义色和Material图标，约束品牌缩略及窄屏grid，子菜单在原生汉堡卡片内展开；同时覆盖大于768px但原生判定溢出的模式及其backdrop，不重设计全站。A1/B1、日历、阅读/数学、音乐、日期、配置、依赖和主题磁盘均不改。

**验收/回退：** 执行与限制见 [导航交付](reviews/stage-3.5-navigation.md)。JSDOM、HeadlessChrome110实验开关、Windows窄窗口与真机验收不能混写，Android/BFCache真实persisted专项未据此新增PASS。若获授权撤回本轮，按10cf3b6基线恢复导航适配器与两份导航测试并重新generate本地预览；新资产可保留但不再注入，不执行破坏性Git命令或动正式站点回滚。当前仅待人工验收，不执行回退。

> 2026-11-02最终阶段决定：用户认可资料清理并批准**Stage3.4按当前限定范围关闭**。F1 PASS、F2/BFCache人工PASS、F3 Windows Chrome窄窗口导航人工PASS、归档active人工PASS；Android真机待测，A1 DEFERRED但仍参与构建，F4长期观察。此决定不改原始Review/实验，不批准新功能、Git写操作、部署或Stage4实施；当前仅做 [Git提交准备](reviews/stage-3.4-final-commit-plan.md)。

## D16. A1版本合同、失败保护与回滚

**当前状态：DEFERRED，但仍参与构建。** 本轮只核对与回归，不改变其运行状态；服务端测试通过不等于A1完整浏览器验收PASS。

**版本合同：** package.json精确声明Hexo8.1.2，package-lock固定实际依赖树。兼容副本`apps/blog/lib/compat/hexo-8.1.2-backtick.cjs`对应Hexo原文件SHA-256 `8e18131c3e694ba36485817722b08100ad0a31ea18c5eaaaad25246efdcac102`，唯一运行语义改动为围栏内容量词。完整MIT声明在同目录`hexo-8.1.2.LICENSE`；不修改node_modules。升级必须先Review并重跑，不绕过指纹保护。

**失败保护：** `scripts/site-empty-fence-compat.js`在after_init核验版本、源/函数指纹、唯一身份和过滤器顺序，只替换目标；before_generate@0拒绝pending/failed或链漂移，错误不能被脚本加载日志吞掉后继续生成。故障恢复只触及自己的目标/替换器，不任意重排其他过滤器。注册/异常/回退由`tests/verify-empty-fence.cjs`覆盖。

**完整集合：** 入口、兼容库、许可证及测试不能漏项。阅读/math配置、复制脚本与A1测试相互依赖；隔离构建器和verify-beijing也复制lib，因此同一代码批提交。来源注释关于source-map尾注的P3不一致已在独立Review记录，本轮不修已暂缓功能。

**回滚方法（仅文档，需另授权）：** 当前尚无本轮功能commit，不能给出虚构revert SHA。优先恢复已核验的完整候选/备份后做隔离回归；未来有真实提交后，按实际diff选择回退范围。A1单独撤回时必须同时处理入口、库/许可证、A1专属测试以及构建器/时间测试对lib目录的复制合同，明确原生空围栏问题会返回。不能只删库、改node_modules、吞异常或关闭失败保护；整批回退还会移除已接受的视觉/阅读，必须单独批准，不可自动执行。当前不启用任何回滚。

原A1实施/预检/故障日志为本地历史资料：`docs/reviews/stage-3.4-a1-implementation.md`、`docs/reviews/stage-3.4-a1-preflight.md`及`docs/reviews/stage-3.4-artifacts/a1-empty-fence/`，不随精简白名单发布。公开复现入口见 [证据索引](reviews/stage-3.4-evidence-index.md)。

## D15. 归档顶部导航复用原生 is_archive 判定（2026-11-02）

**授权与实施：** 用户单独授权的归档高亮修复已实现/定向验证，并在重新获取页面后获得用户人工 PASS。恢复的具体原因不归因于服务器刷新延迟或未证明的缓存机制。Windows稳定Chrome的BFCache亦已人工PASS；不重新修改已验收实现，不据此自动关闭整个阶段。

**决定：** 新增站点 `scripts/site-nav-active.js`，before_generate 仅通过 getView/setView 把 `_partials/header/navigation.ejs` 中一处 `page.layout === 'archive'` 改为 `is_archive()`。完整模板 SHA、唯一锚点、重复生成及未知模板拒绝保护；无新增浏览器 JS/CSS/路由管理。沿用原 active class、主题色变量及 PJAX 对 #navbar-menu 的原生替换。

**原因：** 实际 archive generator 把 `archive=true` 放在 page 数据；`['archive','index']` 是生成器顶层选模板列表，不是 page.layout。实际 template_locals 中归档 page.layout 未定义，分类/tags 则为字符串。is_archive 官方 helper 读取 page.archive，覆盖归档/年/月/分页，不靠 URL 子串猜测。

**边界：** 不改主题磁盘、A1/B1/BFCache、PJAX、音乐、日期或布局。旧Chromium110模拟390的按钮越界与DOM click记录作为历史证据保留；用户随后在Windows Chrome窄窗口确认汉堡展开、五项入口可见且无明显越界，**该F3范围人工PASS**，不将它描述为Android真机测试。Android兼容性另列待办。详见 [公开证据索引](reviews/stage-3.4-evidence-index.md)（完整导航修复交付`docs/reviews/stage-3.4-archive-nav-active.md`为本地历史资料） 与 [当前状态](PROJECT_STATUS.md)。

> 2026-11-01 补充：阶段 3.4 B1 的单独授权与实施见 D14；A1 暂缓最终验收，保留现状，不标为 PASS。历史 D12/D13 不构成整个阶段 3.4 关闭或自动部署授权。

资料留存约定（2026-11-02）：经用户授权对确认冗余的历史附件按精确清单整理；大型派生分析优先无损压缩，唯一故障证据/原始堆/方法脚本保留，历史manifest不改造为新现场快照。旧路径通过 本地历史留存索引`docs/reviews/stage-3.4-artifacts/retention-20261102/README.md`（不随Git发布）；公开说明见 [证据索引](reviews/stage-3.4-evidence-index.md) 映射。不改变业务技术方案或已验收实现。

本文件维护已经确定的技术方案、选择原因和边界；不是实时状态日志。当前版本、Git SHA、实施进度和测试结果以 [PROJECT_STATUS.md](PROJECT_STATUS.md) 为准，Agent 行为规范见 [AGENTS.md](../AGENTS.md)。

**重要技术方案发生变化时，必须更新本文件，说明原决定、新决定、原因、影响及验证要求。** 只有用户确认的方案才能标为已确定；“选型确定”不代表“已经实施”。

以下理由是对现有需求、环境和整改记录的归纳，没有借文档拆分新增产品功能或技术选型。

## D01. Firefly 个人 Fork 通过 Git Submodule 管理

**决定：** 主仓库使用 `apps/blog/themes/firefly/` Git Submodule，主题代码与主仓库分离。

```text
origin：https://github.com/Embed-LiangJ/hexo-theme-firefly.git
upstream：https://github.com/LKDenchin/hexo-theme-firefly.git
```

**原因：** 主仓库用 Gitlink 固定可复验版本，主题保留独立历史、协议及上游关系，避免普通目录复制导致嵌套 Git 管理混乱。

**边界：** 始终使用个人 Fork 作为 origin，不得替换成上游；不复制主题源码进主仓库，不擅自改主题磁盘文件。当前分支、SHA 及远程可获取性证据见 PROJECT_STATUS.md。

## D02. 开发、构建和发布分离

**决定：** 主项目位于 `$HOME/projects/orangepi-blog-platform/`，Hexo 站点在 `apps/blog/`，产物为站点 `public/`；公开服务发布目录另行确定。

**原因：** 不在公开网站目录开发，避免源代码、配置、依赖、缓存或未验收产物意外公开。

**边界：** node_modules、public、db.json、缓存、日志不提交；音频在仓库外。GitHub 远程备份不等于站点部署。

## D03. 沿用 1Panel 管理的 OpenResty，不安装 Caddy

**决定：** 使用现有面板和 Web Server，不增加第二套 Web Server。

**原因：** 保持现有运维体系，避免额外服务、端口竞争和有限设备资源消耗。

**边界：** 不擅自改 1Panel/OpenResty、站点、端口、防火墙或系统配置。实际容器、配置路径、挂载和部署进度见 PROJECT_STATUS.md。未来部署先确认独立发布目录和回滚方案，不用现有站点作实验。

## D04. 博客时间固定北京时间，系统保持 UTC

**决定：** 网站和 Firefly site.timezone 均固定 `Asia/Shanghai`；Ubuntu 保持 `Etc/UTC`。首页、详情、归档、分类、标签和永久链接使用北京时间，不根据浏览器时区或 VPN 地区转换。

Front-matter 必须使用完整格式，例如：

```yaml
date: 2026-10-30T12:30:00+08:00
updated: 2026-10-30T12:30:00+08:00
```

缺失 updated 时回退 date，配置使用 `updated_option: date`；日期型永久链接按北京时间年月日生成，保留 `:year/:month/:day/:title/` 结构。

**原因：** 用户明确要求统一北京时间；博客的时区应与整机运维时区解耦。明确偏移可以保留时间语义，避免迁移和午夜日期歧义。

**实现选择：** 当前锁定 Hexo 会再次调整已带偏移的时间，Firefly 的自定义日期助手又未显式使用网站时区，因此采用站点级兼容层，不改主题/依赖源码或整机时区：

- scripts/beijing-time.js：从原始 YAML 恢复准确时刻，避免 Hexo 重复偏移；通过数据库更新接口保存；日期助手使用副本；permalink 保留自有字段/getter；归档生成器接收北京时间查询副本；不设置 Moment 全局时区、不改变共享 Moment。
- scripts/site-render-policy.js：补全卡片/归档时间属性及构建时间，不再二次解析详情时间。
- 脚手架读取 Hexo 提供的 UTC 创建瞬间，输出明确 +08:00 的 date/updated，不能简单给本机钟面值拼接时区。

**边界：** 不是对任意 Hexo/主题版本的兼容保证；升级时必须实测日、月、年边界、不同 updated、缓存构建、HTML datetime 和路由归属。配置快照及测试文章具体时刻只记录于 PROJECT_STATUS.md。

## D05. 音乐只使用本机文件，浏览器使用 /music/ URL

**决定：** 保留 Firefly 原有音乐组件和导航，使用 local 模式；唯一实际音乐目录为 `$HOME/音乐/`，沿用用户指定的本机现有目录，不创建替代目录。

公开文档用 BLOG_MUSIC_DIR 表示本机目录；它不是自动生效的环境变量插值。网站 URL 固定 `/music/文件名`，不使用 Linux 绝对路径作为浏览器音频 URL。

**原因：** 浏览器不能直接访问服务器文件系统。音频和源码生命周期不同，不应将音乐复制到 Git、source、public 或 node_modules；本地音频不应依赖在线歌单平台。

**配置合同：** `music.mode: local`、`show_in_navbar: true`；保留 `music.local.playlist` 入口，当前具体歌单状态见 PROJECT_STATUS.md。

- 保留音乐导航及桌面/移动组件，不因为空歌单删除功能。
- 不扫描目录、不下载歌单、不使用外部音频播放地址、Meting、网易云或 QQ 音乐 API。
- 后续只能按真实歌曲填写 name、artist、url，可选 cover、lrc；资源使用合法的 /music/ 路径，建议文件名 URL 编码。
- 曲名/作者作文本转义；歌单 JSON 安全序列化；外部 URL、路径穿越及不安全路径字符被拒绝。
- source/js/site-local-music.js 管理一个活动 APlayer；初始化幂等、清理旧容器、返回恢复位置但不自动播放。

**“不使用外部音乐 CDN”是指音频和在线歌单不来自外部。当前 APlayer JS/CSS 仍从 jsDelivr 加载，此前用户允许暂时保留。不得宣称播放器已完全离线化。**

另外仍有 Font Awesome、Fancybox、PJAX 前端库 CDN。若未来用户要求连播放器程序也必须本地化，应先提出方案并取得授权。

**未来部署边界：** /music/ 由 OpenResty 映射到本机音乐目录。未来实施须同时检查容器挂载、worker 读取权限、目录穿越权限；仅写宿主机 alias 路径并不保证容器可读。不暴露整个 HOME，不 chmod 777，不修改现有站点作为试验。未配置映射不能声称真实播放/Range 请求验收通过。

## D06. 站点适配层替代主题磁盘改动

**决定：** 本站导航、时间输出和音乐初始化适配放在主仓库脚本中；主题磁盘文件保持干净。

**原因：** 隔离站点定制与上游主题，保持 Submodule 可验证，降低主题维护冲突。

**现有实现边界：**

- scripts/site-render-policy.js 隐藏未实现入口、移除 Meting；通过 Hexo 内存视图接口替换歌单序列化表达式以防 script 注入。主题磁盘文件不变，模板表达式变动时必须报错并 Review。
- 不能在 HTML 已解析后再试图修复结束 script 标签注入，必须在 EJS 输出前安全序列化。
- 不要假设修改 nav.menu 就能控制所有导航。主题有硬编码入口，当前 About 等隐藏依赖站点输出策略；设计变化必须核对该策略。
- 输出处理是版本相关的兼容层，不是放任扩大 DOM 补丁的理由；新适配需要最小范围变更和先行测试。

## D07. CMS 选型为 Decap CMS，避免常驻 CMS 后端

**决定状态：选型已确定，尚未实施。**

**决定：** 后续使用 Decap CMS，避免给 Orange Pi 增加常驻 CMS 后端。

**原因：** 与 Git 内容管理、静态站点和有限设备资源的方向一致。

**边界：** 静态 CMS 面板仍需要明确的认证方案，不得假设无需认证组件，也不得自行部署 OAuth 服务。GitHub 授权/OAuth、权限、内容集合、媒体管理、发布流程及当前完成度见 PROJECT_STATUS.md。CMS 不得在视觉阶段被擅自启用。

## D08. 当前优先本地串行构建，未来按实测评估 GitHub Actions

**决定：** 优先在 Orange Pi 本地串行构建；文章增多后评估迁移 GitHub Actions，不现在安装 Runner 或增加工作流。

**原因：** 当前规模已有资源实测支持，暂时保持流程简单；大规模文章、DOM 处理和路由增长会增加资源成本，届时应依据实测而非猜测决定迁移。

**边界：** 当前规模适合低频、串行本地构建。没有实测 500/1000 篇，不编造容量、耗时或线性外推数值。历史资源数据及测量限制见 PROJECT_STATUS.md；不能据当前小规模结果承诺未来容量。

## D09. 本地、精确版本依赖与兼容性治理

**决定：** 使用现有 Node/npm 和项目本地 Hexo，直接依赖保存精确版本，提交 package-lock.json；用 EJS 渲染器及主题声明的 Nunjucks、搜索和字数统计依赖。

**原因：** 可复现构建，减少全局工具、额外包管理器和主题依赖差异。当前主题无 Stylus 需要，不安装默认 Landscape 或无关渲染器。

**边界：** 没有额外安装 Landscape、Stylus、pnpm 或全局 Hexo。不擅自升级 Node 或依赖。不用 force/legacy-peer-deps 掩盖冲突，不运行自动 audit fix 作为无审查修复。实际版本、弃用提示及既有低风险漏洞记录于 PROJECT_STATUS.md。

## D10. 公开仓库采用路径最小披露与保留历史方案 A

**决定：** 用户接受历史中低风险本机路径披露，保留原 Commit SHA，不清理旧提交或重写历史。当前公开文档优先用通用路径、相对路径或文档占位名。

**原因：** 保留已经验证的版本链与备份关系，同时减少后续无必要的信息披露；历史中的目录信息经用户明确接受，不等同于发现真实凭据。

**边界：** 这不是对真实密钥泄漏的豁免。如果发现凭据应停止并报告，值必须脱敏；不能用接受路径披露的决定跳过撤销凭据或其他必要处理。忽略规则、安全整改和扫描证据见 PROJECT_STATUS.md；不得宣称 Gitleaks 能保证绝对无秘密。

## D11. 测试隔离、证据分层与小步验收

**决定：** 时间集成测试在独立 mkdtemp 工程运行，共享主题/依赖只读，临时内容和数据库与正式项目隔离；以实际生成的文件和数据库作为断言输入。

**原因：** 避免测试改写正式文章、public 和 db.json，避免把硬编码预期输出当成执行证据。正式 clean/generate 与无副作用的测试是不同操作。

**边界：** 通过指纹验证正式 source/public/db/config 未变，仅清理自己创建的临时目录。必须区分静态代码检查、JSDOM/替身、真实浏览器、真实歌曲和公网部署验收；未做的测试不能宣称通过。每步 Review 后小步提交，阶段证据及下一步任务更新 PROJECT_STATUS.md。

## D12. 主题色重置读取配置默认值，不复制常量

**授权与状态：** 2026-11-01 用户先授权阶段 3.3 hue 重置修复，随后明确确认专项、ChatGPT Review 及用户真实 Chrome 人工验收通过，阶段 3.3 正式关闭。原实现与原始实验性浏览器证据不追溯改写。

**决定：** 以 `_config.firefly.yml` 的 `theme_color.hue` 经原生模板生成的 `--configHue` 为重置默认值来源。独立站点脚本只适配 DisplaySettings.resetSection 的 theme 分支，调用原生 Settings.setHue 和 syncAllValues，其他分支委托原方法。不清 localStorage、不重写 Settings API、不修改动态 CSS。

**原因：** 原生重置硬编码 165，与当前配置 290 不一致；在新 JS 再写死 290 会继续制造多个默认值来源。

**集成边界：** 新 `scripts/site-hue-reset.js` 通过公开内存视图 API，在 scripts partial 的原生 display-settings.js 后加载 `source/js/site-hue-reset.js`，保持主题磁盘/Submodule、Injector、PJAX、音乐、日期和壁纸实现不变。模板锚点检查、重复注册/加载幂等，非法配置失败而非默默重置 165。实际根路径浏览器验收通过；url_for 子路径写法有静态检查，不冒充本轮真实子路径站点测试。

**验证：** 亮暗 × 29/161/240/353 的实际点击、刷新、存储/滑块/变量/颜色和独立偏好保持均通过；浏览器为 Chromium 110 实验性 OKLCH，不是稳定版 Chrome。新单位测试另验证配置 240 无需改 JS。完整结果与待验收边界见 [精简交接](handoffs/stage-3.4-closure.md)（原阶段3.3交接§13为本地历史资料`docs/handoffs/stage-3.3-context-handoff.md`）。阶段 3.4 已获用户随后单独授权，不表示授权提交、推送或部署。

## D13. 文章阅读体验采用独立资源与原生生命周期适配

**授权与状态：** 用户正式启动的阶段3.4现已按当前限定范围批准关闭；阅读实现和历史实测不变。Android/A1/F4边界见本文件顶部及当前状态，不将阶段关闭泛化为任意设备/内容验收，不自动进入下一阶段。

**决定：** 保留 Firefly 原生三栏、正文、代码编辑器、高亮类、桌面 TOC、KaTeX/Fancybox/PJAX 机制。文章独立 CSS 修复长标题/链接/代码/表格/公式溢出，独立 JS 纠正代码复制和 TOC 生命周期/移动访问。已有阶段 3.3 品牌 CSS、色相/重置、Injector、主题磁盘、音乐、日期、壁纸和 PJAX 核心不变。

**原因与边界：** Hexo 高亮的首个 pre 是 gutter，原生复制选错；TOC observer 未保存，且百分比 rootMargin 按宽度计算会令宽屏观察区为空。站点适配保留原生 init 调用，保存 observer、按高度生成像素边距、resize 时重建；安全 DOM 文本构建链接，移动目录用同一 heading 集合和原生 details。复制使用真实 Clipboard API，失败显示手动复制提示，不自动读取或上传剪贴板。

**数学：** 独立配置启用原生 KaTeX 0.16.9 CDN，不安装新数学包。利用当前 Marked 的 marked:extensions 公开钩子保护显式 TeX 定界符及矩阵反斜杠，输出 HTML 转义文本，原生浏览器引擎实际渲染。将原生传入 document.body 的渲染请求限制到文章正文，避免摘要/页脚转义片段误当公式，不修改首页模板或 PJAX 代码。

**资源加载：** 独立 after_render:html 过滤器为完整文档加入唯一带内容版本的 CSS/JS，使用 url_for 支持子路径写法；不改 Injector。所有完整页面均加载轻量适配，保证首页经 PJAX 首次进入文章也可用，行为仅作用于文章。修改资源后仍需按既有开发规约 generate/正常重启预览；不新增强刷机制。

**验证边界：** 四场景实际布局/剪贴板/公式/目录/灯箱、16 次双向文章 PJAX、首页进入文章与正式站点 16 组回归；本机是 Chromium 110 实验性 OKLCH，非本阶段用户稳定版 Chrome/真实手机人工验收。单位测试中的 clipboard/observer 替身、真实 Marked 解析与真实浏览器结果分别记录。详见 [精简交接](handoffs/stage-3.4-closure.md)（原完整报告`docs/handoffs/stage-3.4-reading-review.md`为本地历史资料）。依赖版本、主题 DOM 或 Marked 扩展 API 改变后必须回归，不自动升级。

## D14. 日历采用单一生命周期控制器与有限内存视图接入（B1）

**授权与状态：** 用户单独授权B1，A1维持DEFERRED而非PASS，运行状态不变。B1已实施并完成定向测试/独立Review；F1整改已通过Review，F2 Windows稳定Chrome人工PASS，F3 Windows Chrome窄窗口导航人工PASS。Android真机未测留待后续；F4长期观察，不宣称全站无泄漏。历史110引擎BFCache BLOCKED原记录不改写，不实施B2或自动进入Stage4。用户现已批准阶段限定关闭；实际Git提交/推送仍待单独批准。

**决定：** 唯一 `window.SiteCalendarLifecycle` 持有一个 factory、当前 root/scope/cleanup 和 scalar generation。head 同步、唯一、内容版本化加载本地控制器；before_generate 仅以 getView/setView 转换 head/calendar 两视图。固定 DOMContentLoaded（once）、pjax:complete、pagehide、pageshow.persisted；不注册 Swup，不导出 window.initCalendar，不使用 Injector、轮询、全局定时器或 EventTarget.prototype 拦截。

**原因：** 原内联 IIFE 在每次右栏替换后把私有 init 注册到 document，移除 DOM 不会清掉旧全局回调。只添加 initialized 标记不能处理重复 dispatcher 或晚到的 fetch/JSON。

**异步/清理合同：** 每个有效挂载期初始化一次；重复 complete 不重置同一 root。unmount 先失效 generation 并清空三个状态引用，再 abort、按函数身份清理本次设置的四个 DOM0 header handler，并清空 factory 的 activeScope。旧 scope 不捕获旧 root，旧 cleanup 清空所有权数组。fetch 使用 signal，fetch 与 JSON await 后分别验证 isCurrent，只有当前结果可提交状态/缓存；AbortError/过期任务静默，当前真正错误保留原反馈。pagehide 后保留 dispatcher，persisted pageshow 新建 scope 恢复，不清存储或全站缓存。

**升级与范围：** Hexo 8.1.2、两份模板完整 SHA 和各唯一锚点必须匹配；所有转换先验证再统一 setView，自身重复生成幂等，未知内容停止。保留原生绘制/月份年份/今日/日期文章列表算法，不把约 14KB 实现复制进主仓库。不改主题磁盘、PJAX selectors/switches、品牌 CSS、壁纸、音乐、北京时间或 hue/reset。

**验证边界：** 实际 native init 通过 CDP 精确覆盖率计数；dispatcher 通过 DOMDebugger 获取，不靠全局事件 API 拦截。两视口各 20 轮及无该探针对照、私有状态/WeakRef 释放和回归见 [公开证据索引](reviews/stage-3.4-evidence-index.md)（原B1报告`docs/reviews/stage-3.4-b1-implementation.md`为本地历史资料）。Documents/Nodes 并未变成常数；不将单组件修复说成全站无泄漏，不顺手修复 MQL/Sakura/其他保留。单位 BFCache 事件覆盖不能替代真实 persisted 恢复。测试不执行 clean，原清理型回归采用记录在案的隔离派生方式，不改原断言或正式文件。
