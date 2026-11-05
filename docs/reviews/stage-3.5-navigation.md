# Stage 3.5 导航与独立页面交付

2026-11-05：**MANUAL PASS，用户明确确认Stage3.5人工验收全部通过。** 本次授权Git提交、分支推送和注释Tag固定，不再等待本轮验收；正式站点仍为10cf3b6，不部署、不进入Stage4。下方实现期“待验收/未授权提交”及导航/hash记录仅为历史。

## 人工验收与版本固定

- 验收来源：用户本次明确反馈“全部通过”；接受当前五导航、技术博客分组、独立Page/正文隔离及已交付交互。不推测终端型号，不替换既有Android/A1/F4/真实BFCache等专项证据。
- 分支：`feat/hexo-foundation`；Stage3.5实现提交：`37a16eb3f03c17c19a52cb7692fceb788c145da7`（已实际创建并核验）；最终验收快照使用注释Tag `stage-3.5-accepted`，包含实现与随后验收记录两个小提交。Tag及远程分支是否成功以实际refs核验为准，未创建的SHA不预填。
- 仅精确暂存下方16份Stage3.5白名单；两份工程文档中的既有Stage3.4部署改动继续留工作区，不提交历史调试附件、截图、缓存、构建产物或临时资料。不改业务代码/主题。
- 本次为Git版本固定，没有重新运行此前的58状态/生成测试；下方测试结果保留原证据时间与范围。完成后停止等待下一步授权。

## 独立页面与内容隔离（当前版本）

**根因：** 旧两个hash只滚动同一个首页，因此科研/About完整段落及博客预览始终共存。用户人工验收未接受该页面边界；旧76状态只证明当时导航/定位，不能证明正文隔离。

| 路由 | 页面来源/正文 |
|---|---|
| `/` | 原index：Banner、原生动态区域/侧栏、文章预览，科研/About只留短入口 |
| `/archives/` | 原archive生成器：文章归档 |
| `/research-projects/` | 原生Page，`layout: site-page`、`type: research-projects`；科研方向/研究内容/实验记录/项目经历 |
| `/dynamic/` | 原dynamic生成器和交互，不改业务功能 |
| `/about/` | 原生Page，`layout: site-page`、`type: about`；个人介绍/教育经历/技术栈/联系方式 |

分类/标签入口与详情及文章详情保持原生路由。两份Page Front Matter明确permalink到各自index.html、comments:false；未填写段落全部“待补充”，没有假资料/项目。

**模板：** 原layout.ejs继续提供Banner；site-page独立内存视图仅复用三栏/侧栏/页脚外壳，整个原index main被page.content取代，不执行文章循环。不是CSS隐藏，不是layout:index，不另造generator冒充Page。首页不再包含两份完整正文；导航取消首页hash与相关客户端定位，保留原汉堡/PJAX。分类/标签详情active另补官方helper判定，旧About隐藏策略仅在原生Page缺失时移除。

### 本轮修改文件（16份）

- `apps/blog/source/{research-projects,about}/index.md`：新增2份独立Page。
- `apps/blog/scripts/site-home-sections.js`：首页短入口与独立site-page视图；`site-nav-active.js`：新路径/active；`site-render-policy.js`：About可用性。
- `apps/blog/source/css/site-navigation.css`、`source/js/site-navigation.js`：去掉旧hash专用样式/行为，保留导航机制。
- `apps/blog/tests/verify-nav-active.cjs`、`verify-nav-browser.cjs`：原测试定向更新。
- `apps/blog/tests/page-isolation-contract.cjs`、`verify-page-isolation.cjs`：新增共享DOM合同、实际HTML/Page模型/过滤反例及隐藏污染反向检查。
- `README.md`、`apps/blog/README.md`、`docs/PROJECT_STATUS.md`、`docs/TECHNICAL_DECISIONS.md`、本报告：当前运行边界与D19。

### 本轮验证与复现

在`apps/blog/`运行：

```sh
node tests/verify-nav-active.cjs
node tests/verify-scripts.cjs
node tests/verify-page-isolation.cjs public
node tests/verify-nav-browser.cjs <新证据目录> <已有public目录>
```

- PASS：导航及既有脚本两项定向回归；隔离工程12个实际HTML检查、两个新增Page模型/layout/type/path检查、2个CSS-hidden串台反向检查。
- 测试夹具仅在隔离工程：额外文章使用不同分类/标签，证明筛选排除；额外动态证明首页原生动态区域仍能显示。正式预览不加入夹具。当前真实动态为空，原模板按设计不渲染空动态Widget，不宣称已有真实动态/播放。
- 初轮浏览器真实发现分类详情active漏判，已用is_category/is_tag补齐；失败报告保留。另保留空动态测试初始预期不符记录，不掩盖失败。
- PASS：开发真实内容10个HTML + 隔离夹具12个HTML，均检查实际正文节点；新增Page数据库记录/layout/type/path正确。两种CSS-hidden串台反例在两套输入均被拒绝。
- PASS：1440亮色/390暗色两组 **58状态、2组交互**（HeadlessChrome110实验性OKLCH，非真机）；每一步共用正文DOM合同，含10路由直接访问、真实点击PJAX、科研/About前进后退和各自刷新、导航active/响应式汉堡；未捕获异常/HTTP错误0、截图0。
- PASS：主开发工程无clean generate退出0（27.93秒），159文件、仍仅原真实文章与0条真实动态；12项回环HTTP200且响应与文件一致，夹具未进入预览。当前 **http://127.0.0.1:4000/** 可访问新独立路由，通过既有SSH隧道普通刷新一次。
- 驱动曾在未稳定滚动/焦点时未点中文章链接，现等待稳定后仍用真实鼠标，不用DOM-click；隔离动态夹具默认头像404已改为已有avif资源。失败均留存，最终以browser-settled/report.json为准。不重复无关全站/日期/内存专项，不新增Android/Windows稳定版或真实BFCache PASS。

本轮证据仅本地`.cache/stage35-pages-20261105T063332Z/`；无批量截图/原始数据上传。回退须另获授权，恢复本轮对应源文件及Page集合后重新generate本地预览，不执行破坏性Git命令或正式站点回滚。

## 上一轮hash补充记录（历史；已被独立Page方案替代）

用户要求一级固定五项，已在首轮实现上做补充，未重构导航：**首页｜技术博客｜科研与项目｜生活动态｜关于我**。

首页原本只有文章列表和侧栏。新增两张同风格卡片及真实`research-projects`、`about-me`锚点，入口分别为`/#research-projects`、`/#about-me`。卡片只列科研方向/项目记录、教育经历/技术栈/联系方式等“待补充”结构，不编造事实、不创建独立应用/后端。原个人主页图不在当前上下文，未声称照图复刻。

普通跨页跳转仍为原PJAX，同页锚点仍用原生hash历史；仅同步这两个目标的active、焦点与导航栏避让。补齐隐藏菜单真实测宽以容纳五个入口，不替换原生汉堡，不隐藏右侧按钮。

本次新增文件：`apps/blog/scripts/site-home-sections.js`（原首页index.ejs的只读SHA保护内存适配）；其余文件见下方清单，累计10份。新卡片样式复用`site-navigation.css`；不修改主题磁盘。

### 本次测试

- 七项轻量回归再次退出0，包括新增首页首分页/幂等/未知模板拒绝、五个入口与root前缀、真实锚点高亮、历史对齐及persisted恢复不强制滚动断言。
- 独立generate退出0（27.68秒）；历史对齐调整后再次构建退出0。1440亮、390暗、320亮、800暗共4组 **76状态/4组交互PASS**，按19+57两批串行执行，报告输入HTML/CSS/JS/驱动SHA完全一致；未捕获异常与HTTP错误0，截图0。
- 每组含原导航13状态及新增6种锚点场景：从归档跨页到科研、同页到关于我、锚点后退/前进/刷新、从标签跨页到关于我。核对标题可见且不被固定导航遮挡、正确active与原生汉堡关闭，右侧按钮真实可命中。
- 当前主开发工程generate退出0（25.60秒），仍157文件、仅原真实文章；7项回环HTTP200。预览已更新为五入口：**http://127.0.0.1:4000/**，通过既有SSH隧道访问并普通刷新一次，不改正式站点。
- 初期锚点回退定位/驱动等待失败已保留；完善限定目标的完成后对齐，并修正驱动等待真正PJAX完成、原生hash条目无PJAX事件及色彩过渡稳定的条件，不把失败改写为PASS。本次证据仅本地`.cache/stage35-anchors-20261104T140319Z/`，不上传原始浏览器数据。

本次浏览器覆盖结果以本节为准；下方78状态是首轮三入口版本历史，不冒充当前五项已测。设计/真机仍等待用户人工验收。

## 首轮调查与差异（历史，三入口已被补充方案取代）

导航由Firefly的`layout/_partials/header/navigation.ejs`硬编码，单改nav配置不能重排；既有`site-nav-active.js`负责归档判定。ScrollManager拥有汉堡/backdrop，PJAX原生替换`#navbar-menu`。

| 修改前 | 修改后 |
|---|---|
| 首页 | 首页，原路由`/` |
| 归档、分类、标签三个一级入口 | 技术博客一级披露菜单 → 全部文章`/archives/`、分类`/categories/`、标签`/tags/` |
| 动态 | 生活动态，仍为主题generator的`/dynamic/`，页面内容/功能不变 |
| 无科研/项目页、无关于我页或对应首页锚点 | 不创建页面、虚假链接或占位个人资料；暂不显示这两个入口，待真实内容及单独授权 |

当前一级是**首页｜技术博客｜生活动态**，不是冒称已提供全部五个目标页面。文章详情归属技术博客/全部文章，分类/标签详情归属对应子项；归档继续使用官方is_archive，不用URL子串猜测。

## 修改文件

| 文件 | 用途 |
|---|---|
| `apps/blog/scripts/site-nav-active.js` | 扩展原@5内存视图适配、完整SHA保护及幂等；独立资源注入 |
| `apps/blog/scripts/site-home-sections.js`（补充新增） | 首页首分页两张中性结构卡片及锚点，@6独立模板保护 |
| `apps/blog/source/css/site-navigation.css`（新增） | 复用原主题变量，局部下拉/汉堡内分组及窄屏头部约束 |
| `apps/blog/source/js/site-navigation.js`（新增） | 原生details增强、固定委托、关闭/生命周期；不接管原生汉堡或PJAX |
| `apps/blog/tests/verify-nav-active.cjs` | 原生成器合同/高亮/失败保护扩展，原生ScrollManager联动和事件生命周期 |
| `apps/blog/tests/verify-nav-browser.cjs` | 导航真实鼠标/键盘、几何、PJAX/历史/刷新矩阵；无DOM点击兜底、无截图 |
| `README.md` | 当前本地导航/正式站点边界 |
| `docs/PROJECT_STATUS.md`、`docs/TECHNICAL_DECISIONS.md` | 状态与D18；保留本轮前已有的部署记录修改 |
| 本报告 | 精简交付与限制 |

没有改配置/锁文件/依赖、正式文章、A1/B1/日历、阅读/数学、日期、音乐或主题磁盘；原路由全部保留。子菜单用details/summary而非虚假href；普通链接列表不伪装应用menubar。固定委托在PJAX替换后仍用当前DOM，无旧菜单引用和轮询。

## 首轮三入口验证记录（历史）

- 七项轻量回归PASS：nav-active、scripts、reading、calendar-lifecycle、hue-reset、visual、empty-fence，均退出0。A1测试通过不改变DEFERRED状态。
- 独立Hexo工程generate退出0（27.69秒）；11份完整HTML均只有一份导航CSS和JS，保留真实文章和原有路由。
- 桌面1440亮色、窄窗口390亮色子集各13状态PASS，含真实鼠标/键盘、直接/PJAX/前进后退/刷新。
- 重启后的完整导航矩阵PASS：78状态、6组交互，退出0，403.46秒，未捕获运行异常/HTTP错误均0。30直接访问、30次PJAX、6后退、6前进、6刷新；另覆盖鼠标悬停/点击、外点/汉堡关闭、Escape及Enter。
- 主开发工程无clean的generate退出0（26.55秒），157个文件；原真实文章/时刻不变。7项回环HTTP检查200，CSS/JS与隔离测试输入一致；本地静态预览已恢复。

完整测试组合为1440/390的亮暗，以及320亮色、800暗色（含原生溢出汉堡模式）；每组检查首页、归档、分类、标签、动态。核对三个一级入口、父子active和原hue颜色、汉堡/子项/外点/Escape/Enter、真实按钮可命中及无整页横滚，PJAX保留窗口上下文，前进后退/刷新后active正确。没有据此声称所有屏幕/浏览器/键盘操作均通过。

本机浏览器为HeadlessChrome110，启用实验性OKLCH；窄窗口不是物理Android手机或用户Windows Chrome验收。pagehide/pageshow收起由JSDOM事件覆盖，浏览器前进后退不等于证明真实BFCache persisted；没有修改其策略。

初期驱动/夹具失败（__post标记、HTML属性解码、焦点和Enter协议）已纠正并重跑；一次300秒外层超时未生成最终报告，另一轮在40状态后遭遇主机重启而中断，均不算完整PASS。重启原因未知，不推断为代码故障；重启后已先核验825份既有文件及正式155文件/配置未出现意外变更，历史记录不删除。

本地证据仅在`.cache/stage35-nav-20261104T122657Z/`（不随Git发布）：必要测试结果/退出码、失败与中断记录、独立构建及浏览器报告，无截图/堆采集。完整矩阵保留实际输入public路径和关键资源SHA，不以进程退出码替代报告状态。

## 人工验收与回退

预览：**http://127.0.0.1:4000/**，仅回环（远程Windows使用既有SSH隧道）。普通刷新一次或新开页面以加载新增资源，再进行人工验收。主机重启停止了旧预览，本轮恢复为Python静态服务PID43039；不监听0.0.0.0，不更新正式站点。

请检查桌面悬停/点击、窄窗口原生汉堡与二级菜单、三子项和生活动态跳转、active、前进后退/刷新；科研/关于我暂缺页不应出现链接。Windows稳定Chrome及真机触摸仍为MANUAL，本阶段不自动关闭。

若需撤回，须单独授权恢复10cf3b6基线的导航适配器及两份导航测试，再generate开发预览；新增资产可以保留但不再注入。当前不运行破坏性Git命令，也不要为本轮未发布的导航调用正式站点回滚脚本。
