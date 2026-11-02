# Orange Pi 博客 Stage 3.4 最终独立 Review

> 公开留存说明：用户随后已批准Stage3.4按当前限定范围关闭，当前状态见 [精简交接](../handoffs/stage-3.4-closure.md)。下文保留原独立Review及当时结论，后续关闭不追溯改成全项PASS。原始调试附件和清理长报告仅本地留存，不随精简Git白名单发布；公开复现入口见 [证据索引](stage-3.4-evidence-index.md)。

> **后续验收/资料留存更新（2026-11-02）：** 用户已确认F3的Windows Chrome窄窗口导航人工PASS：汉堡展开、首页/归档/分类/标签/动态可见，未发现明显按钮越界。Android真机仍未测，F4长期观察，A1仍DEFERRED且运行状态不变。此前F1 Review、F2和归档active人工通过继续有效。下文为当时独立Review原结论，保留其历史数据，不把原F3缺口描述当作该Windows范围当前仍未通过。
>
> R2所涉主要状态入口本轮已同步；R3体积整理按 本地历史留存索引`docs/reviews/stage-3.4-artifacts/retention-20261102/README.md`（不随Git发布） 执行，旧410文件/约140MB为审查时快照，不是当前数量。最终清理统计和残余待确认项见 本地历史清理报告`docs/reviews/stage-3.4-acceptance-cleanup.md`（不随Git发布）。这些是用户授权的后续记录，不追溯篡改旧实验、给A1标PASS或自动授权提交/Stage4。阶段关闭及Git分批提交仍待用户最终批准。

日期：2026-11-02（UTC）。审查基线：当前工作区，而非只看已提交HEAD。

**总体结论：CONDITIONAL ACCEPT。当前不建议无条件宣布 Stage 3.4 全项关闭，也不建议直接提交全部工作区。**

核心阅读适配、B1定向生命周期和归档导航有实现/自动化证据支持；F1已修复并按用户最新确认通过Review，F2和归档active已有用户人工通过。剩余条件主要是F3移动验收边界、当前文档同步及提交材料范围/公开性核验，不是要求重改已验收功能。A1按用户决定继续**跳过最终验收、保留、暂缓，不标PASS**；F4长期观察。

本轮仅新增本报告。未执行测试、Hexo init/clean/generate，未改变服务、业务代码、Submodule、依赖、配置、文章或旧证据，未执行Git写操作或部署。下文“通过”区分源码核对、历史执行证据和用户人工确认，绝不表示Reviewer本轮重新实测。

## 1. 最新人工结论及证据等级

以本次用户消息为最新验收依据，不用旧报告状态覆盖它：

| 项目 | 当前结论 | 边界 |
|---|---|---|
| BFCache / B1 F2 | **用户人工验收通过** | Windows稳定版Chrome；具体版本、case明细、persisted原始记录未提供。不改写旧Chromium110未命中的BLOCKED实验，不声称本轮重测。 |
| 归档顶部active | **用户人工验收通过** | 用户重新获取页面后正常；与此前只读核验public/HTTP含active一致。不据此认定服务器刷新延迟、HTTP缓存或BFCache是此前失败的唯一根因。 |
| Chrome内存观察 | **长期观察记录** | 用户任务管理器约140～145 MB，未见明显持续增长；缺少持续时长/进程口径/导航负载记录，不等于全站无泄漏证明。 |
| B1 F1 | **已通过Review** | 用户明确确认；当前测试源码及整改日志另行核对一致。 |
| B1 F3 | **仍有移动验收缺口，MANUAL/BLOCKED** | 不自动把模拟390、DOM click或其他人工通过扩展成真手机及完整移动导航通过。 |
| A1 | **DEFERRED，不标PASS** | 保留当前实现，仍参与生成链；不是停用、回滚或获最终验收。 |
| B1 F4 | **长期观察风险** | 不擅自修相邻MQL/picture/PJAX，不宣称泄漏根除。 |

此前归档失败的精确成因仍缺同页响应/DOM来源证据；**功能人工确认通过与历史成因未能归因可以同时成立**，后者不再单独阻断已确认的导航功能。

## 2. Git与完整工作区范围

实际核验：

- 分支：`feat/hexo-foundation`。
- HEAD：`c01cdffd4c4b7731c2ac5e1a43366f86f3dca14b`。
- 暂存区：空；`git ls-files -u`无输出，无未合并条目。
- Firefly Gitlink/HEAD：`eddb66995d5f45504011303c082e7fa80f82f60f`；主题包括未跟踪检查的工作区干净，未改子模块。
- remote保持原配置；未联网重新核验远程同步，branch的upstream信息仅来自本地记录。
- `git diff --check`无输出；源码/主要状态文档未发现合并冲突标记。
- 4000仍由既有PID2485325 Python静态预览监听，仅回环；本轮未启停。

### 2.1 所有已跟踪文件的完整diff

只有以下3个文件，合计新增19行、删除1行，已逐项核对全部差异：

| 文件 | 全部改动 | 判断 |
|---|---|---|
| `apps/blog/README.md` | 新增12行CSS版本/持续Hexo进程预览说明 | 属此前3.3维护说明，不是本轮新增浏览器强刷机制。 |
| `apps/blog/_config.firefly.yml` | 新增hue=290三行、math.engine=katex三行（含注释） | 分别属于已确认3.3和3.4原生KaTeX启用；无其他配置变化。 |
| `apps/blog/tests/verify-beijing.cjs` | 复制目录数组增加`lib` | A1兼容库随隔离工程复制；没有删除原日期断言或改正式时间实现。 |

package.json、package-lock.json、主_config.yml、已跟踪文章/source、scaffolds、日期脚本、site-render-policy、.gitignore、.gitmodules和Gitlink对HEAD无diff。未发现额外未授权tracked修改。

### 2.2 普通git diff看不到的全部新增文件

审查开始时有 **410份非忽略未跟踪文件，共140,305,066字节（约133.8 MiB）**：

- 26份应用源码/测试/夹具/许可证。
- 16份工程入口、状态、交接与Review文档（含AGENTS）。
- 368份历史证据：A1 8份、归档13份、B1 12份、F1整改9份、证据根目录9份、根因调查191份、补测126份。

所有410份均纳入逐路径/大小/字节读取/类型检查，未把`?? docs/`当成单一文件。26份应用文件按实现职责审阅；历史调试脚本核对用途/静态内容/语法，巨型堆分析与截图按格式、来源和已引用关键路径检查，**没有冒充对所有堆图做完整dominator归因、对67张截图完成逐像素视觉/授权审计**。

应用文件完整清单（路径基于`apps/blog/`）：

- `lib/compat/hexo-8.1.2-backtick.cjs`、`lib/compat/hexo-8.1.2.LICENSE`。
- `scripts/site-article-reading.js`、`site-calendar-lifecycle.js`、`site-empty-fence-compat.js`、`site-hue-reset.js`、`site-nav-active.js`、`site-reading-math.js`、`site-visual-style.js`。
- `source/css/site-anime-engineering.css`、`site-article-reading.css`。
- `source/js/site-article-reading.js`、`site-calendar-lifecycle.js`、`site-hue-reset.js`。
- `tests/build-reading-fixture.cjs`；`tests/fixtures/reading-a.md`、`reading-b.md`。
- `tests/verify-calendar-browser.cjs`、`verify-calendar-lifecycle.cjs`、`verify-empty-fence.cjs`、`verify-hue-reset.cjs`、`verify-nav-active.cjs`、`verify-nav-browser.cjs`、`verify-reading-browser.cjs`、`verify-reading.cjs`、`verify-visual.cjs`。

静态格式检查（无测试执行、无被审代码运行）：52份JS/CJS仅用vm.Script编译检查；9份Python仅AST解析；74份JSON、1份JSONL、26份gzip内JSON解析；67份PNG签名/chunk CRC检查，均未发现格式错误。其余文本也读取并分类。格式正确不等于逻辑/安全/图片版权全部通过。

另外发现 **25份docs证据日志被现有`*.log`忽略规则排除**，它们当前仍存在，但不会随普通git add自动进入提交。不能把“本机证据存在”当成“克隆后证据完整”。

## 3. 实现独立核对

### 3.1 文章阅读体验

- 独立文章CSS解决标题/正文长文本、代码/表格/公式局部滚动，作用域没有重写全站网格；代码弱文字颜色与正文规则分开，保留原高亮结构。
- 复制使用代码pre而非gutter，br转换为换行后写Clipboard；仅拦截文章复制按钮，失败保留明确手动提示。回调/短期提示定时器不是持续累积的全局初始化器。
- TOC用textContent构建，避免标题HTML注入；mobile details复用heading集合；observer保存在原TOC对象供原生init断开，resize按高度重建观察区。原TOC.init在离开文章时先清空headings/tocLinks并disconnect，并非只加重复监听。
- Marked显式数学定界符保护后HTML转义交给原生KaTeX；代码块/行内代码不走数学转换。客户端只把原生传入body的请求限于文章正文，避免首页摘要误解析；没有替换PJAX或数学引擎。
- 阅读资源在所有完整文档唯一加载，允许首页第一次PJAX进文章；当前CSS/JS hash与最初阅读报告一致，未发现后来被替换。

结论：限定阅读实现及已执行自动化支持接受；任意Markdown/TeX宏、金额美元文本、所有CDN失败及所有移动设备并未因此全部验收。稳定浏览器完整阅读人工范围应在关闭记录中明示，不借3.3人工结论自动补齐。

### 3.2 A1完整实现：审过代码，不代表验收PASS

- 兼容副本正文与当前安装的Hexo原文件比较，唯一运行语义变化为可选内容量词`?`→`??`；许可证与Hexo LICENSE逐字节相同。核心源文件hash仍为预期`8e18131c…`，未改node_modules该实现。
- after_init@100核验版本、源/函数指纹、唯一身份与顺序，替换一个过滤器；before_generate@0拒绝pending/failed或链已漂移实例。错误恢复只针对自己的目标与替换器，不任意重排其他过滤器；失败实例不得继续生成。
- 隔离测试的24个渲染案例/12个故障场景是历史证据；其真实浏览器0有效case的BLOCKED仍保留。
- 当前A1源码及旧资料hash与B1 integration的保留清单一致，未因导航/F1修改；它仍在构建链上，不能把“用户跳过”说成“不影响生成”。

**结论：按用户决定DEFERRED，既不要求重做验收，也不将服务端历史PASS升级为A1最终PASS。** 提交说明/下一阶段风险清单必须记录“暂缓但仍启用”。

### 3.3 B1与F1

- 单一window控制器、factory guard及固定dispatcher；同root重复complete不重置月份。DCL once，后续常驻pjax/pagehide/pageshow，不因mount重复注册全局监听。
- unmount先失效generation并清root/scope/cleanup，再abort、按函数身份清理四个自有DOM0 header handler、清factory activeScope。scope闭包不捕获旧root；cleanup所有权数组置空。
- fetch signal和fetch/JSON await后current检查隔离旧结果，只有当前任务能提交缓存/私有状态/绘制。原生局部日/月/年click随节点生命周期，不误称逐一remove过所有监听。
- 内存接入只改head/calendar，完整指纹、锚点、双视图先验证再发布及失败恢复；真实Hexo Theme API的对象_content合同已核对，不能用mock替代这一证据。
- F1由共用helper要求`Error: mount-test`，失败后的三项状态、旧scope、后续complete恢复与再次释放都强制检查；测试本地吞异常包装器必须触发AssertionError。整改source hash=`aa899d12…`匹配F1 protection，13组单位及内存变体预期退出1有记录。
- B1旧integration的测试hash与当前不一致是**获授权的F1修改**；生产控制器/适配器/浏览器测试hash一致，不是证据篡改。

结论：F1关闭；F2人工通过；**B1整体仍CONDITIONAL ACCEPT，F3不变，F4长期观察**。不要求因本次Review重改已通过的生产生命周期代码。

### 3.4 归档导航

- 原page.layout判断不适用于archive generator的page数据；最小适配只改为官方is_archive()，保留原active class、href及主题色变量。
- 仅navigation内存视图@5，完整SHA与幂等保护；不改浏览器导航管理、CSS或PJAX核心。
- 当前正式archives/index及archives/2026/index都含`navbar-link active`，hash均为`8dbe58d7…`，与前次只读调查相同。
- 历史56状态是本机新profile/临时服务测试，JSON不绑定public realpath和响应hash，非用户会话端到端证明；该限制不能被人工恢复结果掩盖。

结论：**接受用户现已人工通过**。不以再次获取页面恢复，推出“服务器刷新延迟”或任何未经证明的缓存因果链；无需继续修已正常的导航。

## 4. 配置、依赖、文章、public和数据库

| 检查 | 结果与限制 |
|---|---|
| manifests/lock | 对HEAD无改动；11项直接依赖声明、锁定与实际安装版本一致，没有新增数学/浏览器依赖。未审计每个node_modules文件或重新npm audit。 |
| 配置 | 仅已说明的hue/math diff；主时区、路由、音乐空歌单等原配置未改。 |
| 正式文章 | source/_posts只有hello-firefly；对HEAD无diff，未发布A/B测试夹具。 |
| 正式db | models.Post只有hello-firefly，date=`2026-10-30T04:30:00.000Z`；没有夹具文章。缓存不能用Git diff做不存在的基线比较。 |
| public | 当前155文件，无reading-fixture或reading-a/b路径；六份站点CSS/JS产物与source逐字节一致。导航active、唯一calendar标签及原生initCalendar全局注册移除状态符合实现。 |
| 忽略与发布 | public/db/node_modules均未被Git跟踪；未见加入提交的发布目录、音乐或凭据文件。 |
| 生成授权 | public/db变动对应此前获授权generate，最后导航阶段11文件生成有日志；本轮没有生成。没有证据将这些自然构建更新定为未授权源码修改。 |

当前检查支持“无发现的额外未授权配置/依赖清单/文章/主题修改”，不是对全部机器历史操作的绝对证明。

## 5. 未提交工作之间的冲突核对

没有Git冲突条目；功能接入职责可分：

- A1：after_init及before_post_render替换，before_generate@0闸门。
- 日期：before_generate@0/1及既有helper/generator副本，未修改。
- 音乐：music视图@2及既有输出策略，未修改。
- hue：scripts视图@3；B1：head/calendar@4；导航：navigation@5。各自视图目标不同，没有彼此覆盖相同模板的现有冲突。
- 阅读：after_render:html@25在既有输出策略@20后加独立资源；visual用既有Injector。数学Marked钩子与A1是不同流水线阶段，历史集成回归中同时启用。
- build-reading-fixture与verify-beijing均复制lib，避免当前启用A1时缺依赖；不能提交时只漏掉兼容库/许可证，导致clone后加载失败。

保留限制：以上是当前锁版本/模板合同。升级或新增第三方过滤器可能有意触发失败保护；不把当前无冲突泛化为任意插件组合兼容。

## 6. 自动化与人工证据核验

关键历史材料不是仅检查末尾PASS：

| 证据 | 独立核对结果 |
|---|---|
| reading final-browser-3 / real-site-browser | JSON中4场景、16次文章PJAX、首页进入及16正式smoke；无fatal/错误；源CSS/JS hash匹配。 |
| 补充C/MATLAB/TOC材料 | 区分正常代码复制通过与零内容空围栏FAIL；不能拿后者的旧FAIL抹掉正常阅读通过，也不能把它因A1存在改为已获最终验收。 |
| A1 validation | 24个case、12个fault；保留早期失败和真实浏览器BLOCKED；当前A1保留hash一致。 |
| B1 browser/control/memory | 两视口20轮及无定向探针对照；dispatcher恒1、mount/init按根替换增长；旧BFCache测试整体BLOCKED，不改历史文件。 |
| F1 unit/protection/mutation | 13组、正常退出0；吞异常变体退出1；当前测试hash匹配。 |
| 导航before/after/formal | before明确expectedBroken=true；后两轮false，各56状态，归档24个样本active；不是用错误预期让最终formal通过。 |
| 用户最新确认 | F1 Review、F2、归档通过及140～145MB观察，独立标注用户来源，不伪装Agent执行。 |

本轮只是静态语法/格式/指纹检查，**没有重新跑上述功能测试或构建**。没有补造缺失的Windows版本、F2逐case计数、完整移动证据或新内存快照。

## 7. 状态分类

### 已通过项目

- 原阅读实现的限定自动化/静态Review范围：布局溢出、真实复制既有证据、公式、TOC、灯箱、文章PJAX与正式smoke。
- F1测试整改及Review。
- F2 Windows稳定Chrome人工BFCache确认。
- 归档顶部active用户人工确认；当前产物与适配源码一致。
- 本轮Git/Submodule保护、已跟踪差异可解释、依赖清单/文章未额外改变。

“已通过”不抹掉下面的环境边界。

### 有条件接受项目

- **Stage 3.4整体、B1整体：CONDITIONAL ACCEPT**。F3与关闭范围仍需明确。
- 稳定Chrome/移动端完整阅读及导航范围：已有模拟与部分人工结论，不自动升级所有设备/场景。
- 提交材料：代码有组织提交的基础，但需要先完成第10节准备。

### 尚未完成项目

- F3完整移动验证，特别是本机390模拟已知原生菜单按钮越界、菜单打开使用DOM click的边界；真机触摸未测仍MANUAL/BLOCKED。不是本次Review授权修布局。
- A1最终验收按用户决定**DEFERRED**，不要求擅自恢复其验收，不标PASS。
- 主要状态文档对最新人工结论及F1 Review结果的同步。
- Windows端到端测试输入/响应身份及必要人工环境记录的补充；不是要求否定已明确人工通过。
- 提交清单、证据体积/隐私/图片及第三方素材公开性选择。

### 非阻断长期风险

- F4：旧110引擎Documents/Nodes与原生MQL离线Document保留；现代环境的完整retainer/dominator/RSS归因仍未完成。
- 用户140～145MB短期稳定观察与旧110计数并非同一指标/引擎，不能直接互证零泄漏。当前没有直接指向B1控制器持续旧DOM强保留的证据，也不宣称已排除一切泄漏。
- 版本/完整模板SHA耦合、间接JSDOM/内部测试API、CDN离线/失败回退、任意TeX/美元语法、规模性能。
- 既有npm低风险/弃用提示、真音频/Range/发布运维等范围外事项；不借Stage3.4关闭自动验收。

## 8. 发现的问题与严重程度

**未发现新的确定性生产逻辑P0/P1缺陷。** 以下为验收、维护或提交准备问题：

| 编号 | 严重程度 | 问题与证据 | 建议（本轮不修改） |
|---|---|---|---|
| R1 | P2，关闭条件 | F3移动环境缺口；390按钮越界为已记录实际表现，自动化以DOM click打开菜单，不能说可见触摸全部通过 | 用户完成所需移动复验，或显式批准阶段接受边界/将该问题移交待办；不由Reviewer自动豁免，不先改已验收功能。 |
| R2 | P2，文档一致性 | PROJECT_STATUS最新顶部仍待人工；TECHNICAL_DECISIONS D14仍称真实BFCache BLOCKED；F1整改文档仍待Review。旧root-cause的未归因结论不等于导航现仍失败 | 经授权在当前状态入口追加最新人工确认、F1关闭、A1暂缓、F3/F4边界；历史实验和旧失败原样保留。 |
| R3 | P2，提交准备 | 410未跟踪约140MB，含103.5MB非压缩JSON、67截图、堆快照、4个历史PID文件及原生提取代码；24份非忽略文件可直接检索到原始HOME绝对路径。历史路径接受不自动豁免新公开资料 | 逐项决定公共仓库所需附件、体积、路径最小披露、图片/第三方代码许可；原始证据保留原地，不删除，不全量git add。 |
| R4 | P2，证据可追溯性 | 导航浏览器JSON缺public真实路径/base/响应hash；25份当前日志受*.log忽略，不会自动随提交保存 | 在提交材料方案中明确持久证据清单；未来harness增强输入/响应绑定。此为证据工程问题，不要求重修已人工通过的active。 |
| R5 | P3，A1来源说明 | 兼容文件头/旧实施报告称移除source-map引用，但实际副本仍有该尾注；测试replace要求尾随换行而原文件无尾随换行，因而未移除。运行正文仍精确一处量词差异、许可证正确 | A1后续获授权维护时修正来源描述/断言，非运行阻断；本轮尊重A1暂缓，不改其代码或强迫验收。 |

对410文件（含gzip解压文本）作有限高置信凭据模式检索，没有命中私钥头、常见GitHub/AWS/特定API token模式。**这不是Gitleaks全规则扫描，也不能证明原始堆/截图完全无隐私**；因此R3不能用“0命中”跳过。

## 9. 是否建议正式关闭Stage 3.4

**现在不建议无条件正式关闭。建议：保留CONDITIONAL ACCEPT，待用户/ChatGPT确认关闭边界。**

可选择的合法路径：

1. 补齐F3所要求移动验收，完成当前状态文档同步后，由用户正式确认关闭；或
2. 用户明确批准“已接受的桌面/既有人工范围关闭，F3列入具名后续待办”，同时保留移动MANUAL/BLOCKED、A1 DEFERRED和F4风险，再批准限定范围关闭。

第二条是需要用户决策的范围安排，**本报告没有代替用户选择，更不把F3改PASS**。A1是用户已批准暂缓的例外，不应被Reviewer擅自重新列为必须验收后才能结束的功能；但其启用事实要写进关闭/提交说明。

## 10. 是否具备提交Git条件

**不具备直接全量提交条件；具备制定分步提交方案的基础。没有提交授权。**

提交前需要：

- ChatGPT/用户审核本报告，批准处理R1/R2的范围；同步状态，不改历史原证据。
- 明确3.3旧未提交工作、3.4阅读、A1暂缓、B1/F1和导航的提交边界；不能只提交部分脚本却漏lib/许可证/资源而破坏构建。
- 为R3/R4制定选定文件清单，检查原始快照/截图的隐私与公开许可、证据体积、忽略日志的长期保存方式。140MB资料不是网站正式public，但也不因此适合全部入Git。
- 对最终拟提交内容进行适当秘密/许可检查；本轮有限模式扫描不是发布安全认证。保留所有未选中的原始证据，不擅自清理。
- 如用户批准，另安排必要的最终验证和小步提交；本报告不代表Git add/commit/push、合并main或部署授权。

## 11. 进入Stage 4的前置条件

- 用户明确确认Stage3.4关闭或限定关闭，以及F3移交方式。
- 关闭记录准确保存：F1已Review、F2/归档人工通过、A1暂缓且仍启用、F4长期观察；内存结论不夸大，页面恢复不乱归因。
- 经授权完成提交/证据保存方案，或用户明确允许在未提交基线上继续并识别风险；不自动推送或合并。
- 用户另行定义并授权Stage4目标、范围、验收标准和禁止事项。不能凭旧CMS/部署规划自动开始，也不能把进入Stage4当作部署授权。

## 12. 停止说明

本报告是本轮唯一写入。原有工程和证据保留，Firefly不变，未执行测试/构建/服务变更或Git写操作。项目状态/技术决策等文件因只读限制未更新，R2需下一次授权处理。

**最终意见：限定实现与已确认人工结果支持CONDITIONAL ACCEPT；F3未完成、文档和提交准备待处理，不作全项PASS或自动阶段关闭。等待ChatGPT及用户最终审核。**
