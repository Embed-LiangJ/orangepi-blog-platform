# 项目当前状态

## Stage3.5.1已发布（2026-11-06，正式待用户人工确认）

- **本地热修复MANUAL PASS：用户明确确认首页文章列表初始化问题已解决。** 正式网站人工确认另行等待用户，不扩大Windows/Android、真实BFCache、A1或F4结论，不进入Stage4。
- 发布代码：`38d0649200303d3f99b153f70339c9e6fbc4ad63`；注释Tag `stage-3.5.1-accepted`，Tag对象`18b1a3de231cd72b2ea76386989403347d25114e`。本地/GitHub refs已核验一致；本节为随后部署结果补记，开发分支`feat/hexo-foundation`追加结果文档不改变发布Tag或业务代码。Firefly仍`eddb66995d5f45504011303c082e7fa80f82f60f`且干净。
- 初始热修复提交严格6路径：两份post-layout脚本、两份定向测试、两份工程文档的相关部分。结果补记仅两份工程文档；原Stage3.4未提交部署段落继续排除，379份历史资料及缓存不提交、不删除。原有34浏览器状态为上次实测及本次用户人工验收依据，本轮未重跑浏览器。
- 本次从Tag独立导出55份应用文件和固定主题Git对象，只读复用经package/lock及直接版本核验的依赖；未从含未提交内容的工作区复制源码，未重建开发预览。独立generate退出0（29.16秒），160静态文件逐一复制并匹配哈希；仍仅原真实文章。定向单元、10页内容/Page模型及13个完整站点HTML的脚本顺序/唯一性/版本检查PASS。
- 正式地址`http://192.168.31.171/`；current原子指向`releases/stage351-20261106T012716Z-38d0649/public`。26项HTTP200且响应哈希匹配（7路由、新热修复及关键原生/站点JS/CSS/图片）。nginx -t前后通过、优雅重载无严重错误，容器未重启；全部既有站点配置指纹不变。
- 回滚目标：Stage3.5 `d6ac21b7a3153aaa1bc1d6f18df16525cb387f39`，原`releases/stage35-20261105T092307Z-d6ac21b/public`完整保留。新完整静态备份、原配置、旧回滚组件/入口记录位于`$HOME/.local/share/orangepi-blog-platform/deployments/stage351-20261106T012716Z-38d0649/backup/`；原Stage3.5部署目录及更早Stage3.4发布/备份未变。
- 一键回滚：`bash "$HOME/.local/share/orangepi-blog-platform/rollback.sh"`。新入口切换前后`--check`验证Stage3.5全部159文件、完整备份、配置和当前链接状态，**未实际执行回滚**；真正执行时原子恢复Stage3.5链接、保持相同原配置、重载并核对7个旧响应，拒绝覆盖未知配置/链接，不删新版。
- 本次实测记录：`$HOME/.local/share/orangepi-blog-platform/deployments/stage351-20261106T012716Z-38d0649/deployment.json`；提交范围/排除差异留在本地`.cache/stage351-release-20261106T012716Z/`。附加HTML顺序扫描最初误将未变的原生`pio/README.html`静态资源当完整页面而失败，已仅收紧检查范围并核验该资产旧哈希一致，保留`content-validation-attempts.json`；构建及业务代码未因此重跑/修改。
- **部署完成后停止，等待正式网站人工确认。** 下方本地“待确认/不提交部署”为实施期历史，不覆盖本次MANUAL PASS及已执行的授权发布。

## Stage3.5上线后首页布局热修复（2026-11-05，本地实施与验证历史）

- 实际HEAD/验收Tag `stage-3.5-accepted`：`d6ac21b7a3153aaa1bc1d6f18df16525cb387f39`；Firefly仍`eddb66995d5f45504011303c082e7fa80f82f60f`且干净。上一任务已完成Stage3.5正式部署，当前`current`仍指向`stage35-20261105T092307Z-d6ac21b/public`。下方“正式仍Stage3.4/未部署”等文字为历史时点，不覆盖实际发布状态。
- 本次在正式站点的隔离浏览器复现：1920px桌面、亮暗两色，有`grid`偏好时首次卡片335.75px、点击首页后1037px，storage/getter仍grid而新DOM已list；无偏好时两次均1037px。原生Settings完整加载恢复偏好，PJAX替换为默认list后，PostLayoutManager.init的initialized早退漏掉新DOM同步。原生独立反例也复现；两阶段CSS URL未变，正式cards.css/原生管理器与固定主题源码一致，不归因于未经证明的缓存或导航时序。
- 新增`scripts/site-post-layout.js`与`source/js/site-post-layout.js`：原生管理器后唯一、内容版本化加载；完整上游JS SHA及锚点保护。保留原生init/bind/Settings/CSS，仅在每次init后重新读取当前DOM和偏好同步两处data属性及按钮；无偏好时seed list，避免原生移动端自动写grid；已有grid保留，不清存储、不改宽度或!important。科研/About正文、导航、A1/B1、配置/依赖及主题磁盘不改。方案见D20。
- 本次PASS：6组原生集成、2个原生缺陷反例、注入幂等/版本及3类拒绝保护；10个真实HTML/Page模型和2个隐藏污染反例；1920亮暗、无偏好/已存grid的34个首页定向浏览器状态（直接、首页点击、About往返、后退/前进到首页、刷新及真实设置按钮切换/保存）。列表首次/点击均1037px；保留网格两次均335.75px；未捕获异常/HTTP错误0，截图0。浏览器为本机HeadlessChrome110实验性OKLCH，不新增Windows/Android或真实BFCache结论。
- 开发工程无clean generate退出0（27.05秒），160文件、仍仅原真实文章；4项HTTP200且内容与磁盘一致，新脚本顺序/唯一性/版本检查通过。**本地预览 http://127.0.0.1:4000/ 已更新**，原Python回环服务未重启。已有grid偏好者需在显示设置→外观主动选“列表”，本轮不会擅自抹掉网格偏好。
- 477份正式版本/旧发布/备份及回滚保护文件、current与rollback符号链接指纹未变；379份历史资料完整保留。新增两份定向测试，全部热修复待提交；原有两份工程文档未提交部署记录保留。**不commit/push/部署或执行回滚，不进入Stage4；等待本地人工确认。** A1仍DEFERRED且启用，F4长期观察，不扩大验收结论。
- 本地必要证据：`.cache/stage35-layout-20261105T095610Z/final-results.json`、`after-preview-final/report.json`及正式缺陷复现`before-production/report.json`。首次修复后驱动误用不存在的layout页签失败，已仅修正为appearance并完整重跑；失败保留。上述缓存/浏览器Profile仅本地临时资料，不随仓库发布。

以下保留既有验收/版本固定与部署过程快照，不改写历史MANUAL PASS或原失败。

## Stage3.5人工验收PASS与Git版本固定（2026-11-05，当前）

- **MANUAL PASS：用户明确确认Stage3.5人工验收全部通过。** 五个一级入口、技术博客分组、原生独立Page及内容隔离的交付已接受；不再处于等待本轮验收状态。用户未提供本次终端/浏览器明细，不虚增Android、真实BFCache、A1、F4或正式站点专项结论。
- 当前分支`feat/hexo-foundation`；提交前HEAD/正式发布代码为`10cf3b6a816d8b69f5f678db87dca5c60b9a7457`。Stage3.5实现提交：`37a16eb3f03c17c19a52cb7692fceb788c145da7`（已实际创建并核验）。最终验收快照由注释Tag `stage-3.5-accepted` 固定（包括随后验收文档提交）；不猜测尚未创建的SHA，推送结果以远程refs核验为准。
- 本次授权仅Git版本固定：实现与验收记录分两步提交，精确白名单16份代码/测试/必要工程文档；先核验本地及远程同名Tag不存在，不覆盖Tag或远程历史。原Stage3.4部署文档的既有未提交部分继续留在工作区，不夹带历史附件/截图/缓存/临时资料。
- 下方58状态、真实10页/夹具12页、两个隐藏污染反例及两项回归均为此前实际测试，本次没有重新运行构建或浏览器测试。人工PASS与历史自动化证据分开记录，早期失败不删除。
- Firefly仍为`eddb66995d5f45504011303c082e7fa80f82f60f`，未修改Submodule或已验收业务代码；正式站点仍Stage3.4，**本次不部署、不进入Stage4**。

**完成版本固定后停止，等待下一步授权。下方实现过程、待验收措辞及Stage3.4基线均为各自历史时点，不覆盖本节的新授权与人工PASS。**

## Stage3.5正文串台整改：原生独立Page（2026-11-05，当前）

- 用户人工验收要求独立页面：旧hash方案共用首页，不能隔离科研/About/文章列表；旧76状态不构成正文隔离PASS。下方hash及三入口记录均为历史，当前以本节与D19为准。
- 新增原生Page `/research-projects/`、`/about/`，明确Front Matter layout/type/permalink；site-page独立视图只渲染当前Markdown，保留原Banner/侧栏外壳，不执行首页post循环。内容仅对应领域“待补充”，不编造资料；首页只留短入口及原文章预览/动态逻辑。
- 五一级、技术博客子项、原动态系统与PJAX保留；取消hash专用定位。About隐藏策略按真实Page存在性判断，分类/标签详情active补官方helper。
- 已通过两项定向回归、隔离工程12个实际HTML/Page记录检查及2个隐藏污染反向检查。只在隔离工程添加文章/动态反例，开发预览不含夹具；当前真实动态为空，不虚构可见动态条目。
- 1440亮色/390暗色两组58状态、2组交互PASS；每步实际DOM归属检查，含10路由直接/PJAX、科研/About前后退及刷新、active/窄屏汉堡。未捕获异常/HTTP错误0、截图0；不是Android/Windows稳定版或真实BFCache新增PASS。初期分类详情active失败及驱动/夹具问题均保留。
- 主开发工程无clean generate退出0（27.93秒），159文件、仅原真实文章/0条真实动态；真实内容10个HTML与Page模型检查、2种隐藏污染反例通过。12项HTTP200且文件一致，预览 **http://127.0.0.1:4000/** 已更新，科研`/research-projects/`、关于`/about/`不再用hash。使用既有SSH隧道普通刷新一次。详见 [当前独立页面交付](reviews/stage-3.5-navigation.md)。
- 代码基线仍`10cf3b6a816d8b69f5f678db87dca5c60b9a7457`，主题仍`eddb66995d5f45504011303c082e7fa80f82f60f`；不提交/推送/部署，不进入Stage4，正式站点仍Stage3.4。原部署文档与历史失败保留。

**本轮完成后停止，等待用户人工验收，不自动关闭Stage3.5。**

## Stage3.5补充：五个一级入口与首页锚点（2026-11-04，当前待人工验收）

- 按用户补充要求固定为：首页、技术博客、科研与项目、生活动态、关于我。技术博客三子项不变；新增首页科研/项目与About中性卡片，入口为`/#research-projects`、`/#about-me`，只放待补充结构，不编造个人资料/项目，不增应用/后端。
- 原生汉堡/PJAX/哈希历史保留；补齐两锚点的active、固定头部避让及五项溢出测宽，不重构导航、不修改A1/B1/阅读/数学或主题。详见 [当前导航交付](reviews/stage-3.5-navigation.md) 和D18补充。
- 七项轻量回归再次退出0；1440亮/390暗/320亮/800暗四组，76个状态/4组交互通过（同一输入、19+57串行执行），含跨页/同页锚点、后退/前进/刷新，标题定位与active正确、按钮可命中，未捕获异常/HTTP错误0、截图0。不是Windows稳定版/Android真机或真实BFCache新增PASS。
- 独立generate通过，开发工程无clean generate退出0（25.60秒），仍157文件和原真实文章；7项HTTP200。**预览 http://127.0.0.1:4000/ 已更新为五入口**，使用既有SSH隧道并普通刷新一次。
- 分支/HEAD仍`feat/hexo-foundation` / `10cf3b6a816d8b69f5f678db87dca5c60b9a7457`，主题仍`eddb66995d5f45504011303c082e7fa80f82f60f`。不提交、不推送、不部署，不进入Stage4；此前部署记录和历史证据保留。正式站点仍为Stage3.4。

**等待用户人工验收。本节取代下方首轮“三入口”当前描述；首轮结果仅作历史，不冒充本次五项版验收。**

## Stage3.5：导航层级优化（2026-11-04，本地待人工验收）

- 用户单独授权导航信息架构与交互，不提交/推送/部署，不进入Stage4。现有两份未提交的部署状态记录保留，下方Stage3.4上线记录不重写。
- 本地一级改为“首页｜技术博客｜生活动态”；技术博客下含全部文章/分类/标签，原路由及`/dynamic/`保留。科研与项目、关于我无真实页面/锚点，暂不放入口，不虚构内容。
- 现有导航@5内存适配加独立CSS/JS，复用原生汉堡/PJAX与hue变量；仅导航相关文件/测试和必要文档有改动，A1/B1/阅读/数学等不改。
- 七项轻量回归PASS；重启后完整导航矩阵78状态/6组合PASS，未捕获运行异常与HTTP错误0，含1440/390亮暗、320亮、800暗的真实鼠标/Enter/Escape、直接/PJAX/前后退/刷新及布局边界。不是Windows稳定Chrome或Android真机验收，不新增真实BFCache persisted PASS。
- 隔离generate退出0（27.69秒）；主开发工程generate退出0（26.55秒），均无clean。开发public现157文件、仅原真实文章；新增资源与已测隔离输入一致。
- 本地预览 **http://127.0.0.1:4000/** 已恢复，Python静态服务PID43039，7项HTTP200；远程使用既有SSH隧道并正常刷新一次。正式192.168.31.171仍为Stage3.4版本，155份发布文件与OpenResty配置指纹未变。
- 验证期间观察到主机13:25左右重启，旧预览和一轮长矩阵中断；原因未知，未将40个checkpoint当完整PASS，重启后核验文件并完整重跑。早期驱动失败/中断记录保留本地。
- 分支/HEAD仍为`feat/hexo-foundation` / `10cf3b6a816d8b69f5f678db87dca5c60b9a7457`；Firefly仍`eddb66995d5f45504011303c082e7fa80f82f60f`干净，暂存区空，本轮待提交、未部署。详情见 [导航交付](reviews/stage-3.5-navigation.md) 与技术决策D18。

**停止等待用户人工验收；不自动部署、关闭Stage3.5或进入Stage4。以下保留Stage3.4既有上线记录，不代表本轮再次部署。**

## 阶段与验收

2026-11-02：Stage3.3已正式关闭；用户认可ChatGPT对历史资料清理的Review，批准**Stage3.4按当前限定范围关闭**。当前仅进行提交前文档整改和验证，不再增加功能。

| 项目 | 当前结论 |
|---|---|
| F1 | PASS，异常测试整改已通过Review |
| F2 / BFCache | Windows稳定Chrome人工PASS |
| F3导航 | Windows Chrome窄窗口人工PASS；汉堡正常展开、首页/归档/分类/标签/动态可见，未见明显越界 |
| 归档active | 人工PASS；不乱归因页面重新获取后的恢复原因 |
| Android真机 | 未测，后续待办 |
| A1 | **DEFERRED，但仍启用并参与构建**；不改运行状态，不标最终PASS |
| F4 | 长期观察；140～145MB短期稳定不代表全站无泄漏 |

## Git与工程基线

- 分支：`feat/hexo-foundation`。
- HEAD：`c01cdffd4c4b7731c2ac5e1a43366f86f3dca14b`。
- 主仓库origin：`git@github.com:Embed-LiangJ/orangepi-blog-platform.git`；未来目标为同名开发分支，不合并main、不强推。
- Firefly Gitlink/HEAD：`eddb66995d5f45504011303c082e7fa80f82f60f`，工作树干净；不得夹带主题内部改动。
- 本轮功能/文档均**待提交**，暂存区空；没有创建提交、推送、部署或修改remote。隔离Git候选tree不是commit SHA。
- 现有Node v22.23.4/npm10.9.9，系统Etc/UTC、博客Asia/Shanghai。Hexo8.1.2及11项直接依赖精确锁定，package/lock不变。

## 当前实现与资料

站点、构建产物及OpenResty发布目录分离；业务实现/测试/夹具/许可证全部保留。日期、音乐/空歌单、独立视觉、阅读、A1、B1和归档适配的技术边界见 [技术决策](TECHNICAL_DECISIONS.md)。

精简 [阶段交接](handoffs/stage-3.4-closure.md)、[公开证据索引](reviews/stage-3.4-evidence-index.md) 和 [最终独立Review](reviews/stage-3.4-final-independent-review.md) 随候选白名单公开。历史实施/调查/失败/回滚记录、截图、日志、堆图与逐文件清单留本地，不作为构建输入，不为修链接整体上传。本轮未删除这些资料。

原PROJECT_STATUS历史长版及旧完整提交计划已在本轮独立验证目录的history子目录逐字节保留；其历史阶段、资源和测试数据不是本轮复测。现行入口只维护当前状态，原始Review结论不重写。

## 本轮验证与下一步

四批精确白名单、16项原引用的处置、真实运行结果、安全/许可检查、完整Git状态与候选tree见 [最终提交前计划与验证](reviews/stage-3.4-final-commit-plan.md)。报告区分已执行、人工历史和BLOCKED，不能将仅计划命令写成已通过。

本轮允许现有测试在核验过的独立工程内部clean，**禁止正式项目clean**；源码/用户素材/主题不得有非预期变化。验证输出在项目内被忽略的磁盘临时目录；不使用已满/tmp，不改变既有4000预览或公开端口。

剩余边界：Android真机、A1最终验收、F4长期内存；非空歌单真实播放、Range、/music/容器映射和公网部署未验收。CDN/旧浏览器能力、版本/模板指纹耦合仍需维护。

**完成后停止，等待ChatGPT Review和用户实际暂存/提交/推送授权。Stage4目标、验收与运维边界须另行授权。**
