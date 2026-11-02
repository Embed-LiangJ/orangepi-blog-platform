# Stage 3.4 最终提交前整改与验证

2026-11-02（UTC）。**限定阶段已关闭，四批结构保留；本轮不实际暂存、提交或推送。** 本报告替代原长清单作为公开计划；原长版已逐字节保存到本轮本地验证目录history，不删除任何本地历史资料。

## 1. 最终状态与公开范围

F1 **PASS**；F2 BFCache、F3 Windows Chrome窄窗口导航、归档active均为**用户人工PASS**。Android真实设备未测、A1 **DEFERRED但仍参与构建**、F4长期观察。阶段关闭不等于全设备验收、全站无泄漏或Stage4/部署授权。

公开入口为 [项目状态](../PROJECT_STATUS.md)、[技术决策](../TECHNICAL_DECISIONS.md)、[精简交接](../handoffs/stage-3.4-closure.md)、[公开证据索引](stage-3.4-evidence-index.md) 和 [原独立Review](stage-3.4-final-independent-review.md)。

- 原16项无法随白名单解析的引用：4项公开源文档改为公开索引/本地历史标注，另外12项所在长报告全部仅本地留存。原始Review正文自“日期/审查基线”起逐字节不变，仅追加发布说明和更改前置说明中的本地链接呈现。
- 过程交接、A1/B1长实施/调查/故障/清理报告、完整逐文件清单及390份历史附件均保留本地，不上传、不删除、不生成同名假证据填链接。公开索引说明来源和复现方法，不冒充原始数据。
- 原PROJECT_STATUS长版/原提交计划保存在本地验证目录history；现行状态只保留当前状态和边界。AGENTS启动入口改为随白名单存在的精简交接。
- 最终 **37份候选文件**（29应用、8规范/文档）；除此之外不新增暂存内容。379份非忽略未跟踪资料和25份ignored日志留本地。已提交且未改的package/lock、主配置、文章、脚手架、日期/音乐源码及Gitlink继续来自HEAD，不是遗漏依赖。

## 2. 四批精确白名单

第一批合并共享hue/math配置、视觉、阅读和A1，是因为A1测试要求KaTeX/阅读复制/数学适配，而阅读/时间隔离构建器又复制lib；不为拆批修改已通过的代码。日历浏览器依赖第一批构建器；每批自带必要测试，不将测试拖到文档批。

### 批1：共享配置、Stage3.3视觉、阅读与A1完整集合（22份）

- `apps/blog/README.md`
- `apps/blog/_config.firefly.yml`
- `apps/blog/lib/compat/hexo-8.1.2-backtick.cjs`
- `apps/blog/lib/compat/hexo-8.1.2.LICENSE`
- `apps/blog/scripts/site-article-reading.js`
- `apps/blog/scripts/site-empty-fence-compat.js`
- `apps/blog/scripts/site-hue-reset.js`
- `apps/blog/scripts/site-reading-math.js`
- `apps/blog/scripts/site-visual-style.js`
- `apps/blog/source/css/site-anime-engineering.css`
- `apps/blog/source/css/site-article-reading.css`
- `apps/blog/source/js/site-article-reading.js`
- `apps/blog/source/js/site-hue-reset.js`
- `apps/blog/tests/build-reading-fixture.cjs`
- `apps/blog/tests/fixtures/reading-a.md`
- `apps/blog/tests/fixtures/reading-b.md`
- `apps/blog/tests/verify-beijing.cjs`
- `apps/blog/tests/verify-empty-fence.cjs`
- `apps/blog/tests/verify-hue-reset.cjs`
- `apps/blog/tests/verify-reading-browser.cjs`
- `apps/blog/tests/verify-reading.cjs`
- `apps/blog/tests/verify-visual.cjs`

### 批2：B1日历生命周期与F1测试（4份）

- `apps/blog/scripts/site-calendar-lifecycle.js`
- `apps/blog/source/js/site-calendar-lifecycle.js`
- `apps/blog/tests/verify-calendar-lifecycle.cjs`
- `apps/blog/tests/verify-calendar-browser.cjs`

### 批3：归档导航修复（3份）

- `apps/blog/scripts/site-nav-active.js`
- `apps/blog/tests/verify-nav-active.cjs`
- `apps/blog/tests/verify-nav-browser.cjs`

### 批4：工程规范与精简公开文档（8份）

- `AGENTS.md`
- `README.md`
- `docs/PROJECT_STATUS.md`
- `docs/TECHNICAL_DECISIONS.md`
- `docs/handoffs/stage-3.4-closure.md`
- `docs/reviews/stage-3.4-evidence-index.md`
- `docs/reviews/stage-3.4-final-independent-review.md`
- `docs/reviews/stage-3.4-final-commit-plan.md`

代码三批整文件大小分别为120,533 / 48,151 / 14,769 B，合计183,453 B；文档批约80KiB，37份合计约260KiB。精确最终字节保留本地final-tree.json，不冒充Git对象包/推送流量。全部为精确文件路径，不以目录/通配符加入Git；主题Gitlink不变。

## 3. Git基线与隔离候选tree

- 分支 `feat/hexo-foundation`，HEAD `c01cdffd4c4b7731c2ac5e1a43366f86f3dca14b`。
- origin fetch/push：`git@github.com:Embed-LiangJ/orangepi-blog-platform.git`；未来目标同名开发分支，不是main、主题或上游；未联网验证写权限，不宣称远程实时同步。
- Firefly Gitlink/HEAD `eddb66995d5f45504011303c082e7fa80f82f60f`，工作树干净。主题origin个人Fork，未改remote或主题。
- 从HEAD的ls-tree构建路径映射，仅叠加各批白名单；hash-object/mktree写入项目.cache下**独立对象库**，以主对象库只读alternate获取基线。不使用主index、不建commit/ref、不checkout；archive导出各候选工程，只读共享已核验主题/依赖。

| 代码批 | 实际候选tree（不是commit SHA） |
|---|---|
| 1 | `4d29afd791fc6c2e6ced894c072d3788cbc07e0d` |
| 2 | `7782b49b8b6e02d304493e998daa9997d7922c41` |
| 3 | `8afcbaa1690dc100ca05d35e7653aa8f234249bb` |

实际候选含55项Git条目（54个blob及1个Gitlink），已从Git blob核验42处相对文件/标题anchor引用，0失效；不是借完整开发目录中的本地附件补链接。报告收尾后再次重建/核验，最终SHA在交付回复和本地final-tree.json中提供，不把包含本报告自身的tree SHA写回报告造成自引用。代码/配置/测试blob与上述已测候选一致，文档收尾不改变构建输入。

## 4. 本次实际执行（不是历史结果复述）

前检：Node22.23.4/npm10.9.9，磁盘约48GiB可用、内存available约621MiB，swap接近满；/tmp tmpfs已100%。所有新增测试输出使用项目内.cache磁盘目录、TMPDIR指向其tmp子目录，未清理/tmp或改变系统/现有4000预览。

| 检查/执行位置 | 本次结果 |
|---|---|
| 第一批：verify-scripts / visual / hue-reset / reading / empty-fence | PASS，5项均退出0 |
| 第二批：verify-calendar-lifecycle | PASS，退出0，13组 |
| 第三批：verify-nav-active | PASS，退出0 |
| 第一批：verify-beijing首次，180秒上限 | 超时FAIL（124）；已保留原日志，未改断言 |
| 完整代码第三批：同一verify-beijing，600秒上限 | PASS，退出0，285.33秒；UTC/纽约、干净/缓存、创建/非法日期等完整套件 |
| 第一批：同一verify-beijing重试，600秒上限 | PASS，退出0，294.21秒；补齐第一批自身的完整集成验证 |
| 三批独立generate | PASS，退出0，27.15 / 26.24 / 24.34秒；154 / 155 / 155个产物 |
| 首轮构建随外层240秒预算被中断 | 未获得退出码，不算PASS；原日志保留，后续三批完整重跑如上 |

clean仅由现有verify-beijing调用。临时preload保护不修改测试断言：核验mkdtemp所有权、package clean确为hexo clean且无pre/post钩子，校验真实Hexo base/public/db均在指定独立工程、无输出symlink、after_clean为空，写入审计记录后才执行。本轮6次实际clean均通过该核验（首次与两次完整重跑各2次）。**正式项目没有clean，也没有generate；原source/public/db维持指纹。** 测试自行清理新建的owned临时工程不涉及旧本地保留资料。

本轮不重复已接受的完整浏览器/截图/堆采集：没有业务改动，原用户Windows人工结果及历史浏览器矩阵保持其证据等级；本轮只做必要单位、真实Hexo集成和构建/产物核验。不把旧Chromium BFCache未命中、Android未测或本轮未重跑矩阵标PASS；若Review要求额外浏览器复验，仍需作为独立待办执行，不能用退出0替代report状态。

复现（在对应独立候选apps/blog内，先设置空间足够的TMPDIR，clean前按上述核验；命令不得对正式项目clean）：

```sh
node tests/verify-scripts.cjs
node tests/verify-visual.cjs
node tests/verify-hue-reset.cjs
node tests/verify-reading.cjs
node tests/verify-empty-fence.cjs
node tests/verify-beijing.cjs
node tests/verify-calendar-lifecycle.cjs
node tests/verify-nav-active.cjs
npm run generate
```

第一批不含后两项测试，第二批再增加calendar，第三批再增加nav；第一批所有依赖、A1入口/库/许可证、math配置和必要夹具齐全。测试指纹保护与本轮外部基线检查共同核验正式工程无副作用。

## 5. A1、安全与版权

- A1继续DEFERRED、运行不变。Hexo8.1.2声明/lock/安装版本一致；兼容源/函数/注册链指纹、after_init和before_generate失败保护，以及回滚范围见 [D16](../TECHNICAL_DECISIONS.md#d16-a1版本合同失败保护与回滚)。故障注入通过不解除最终验收暂缓。
- 完整MIT LICENSE与安装Hexo LICENSE字节一致；source-map来源注释P3保留，不借本轮改业务。回滚需另授权，不能只删lib/吞异常；整批回退影响视觉/阅读，必须明确范围，未虚构未来revert SHA。
- 最终候选文本进行私钥、GitHub/AWS/Google/Slack/Stripe/GitLab token、JWT、认证URL和凭据赋值等自定义规则检索及上下文检查；真实候选54个blob的10类自定义规则0命中，原机HOME路径0命中；Hexo LICENSE字节一致。不是Gitleaks全规则或安全认证，当前PATH无Gitleaks，未安装工具或升级依赖。
- 不提交原机HOME、截图、堆图、Chrome数据、临时Profile或第三方调试源码；新增夹具为测试文本/生成几何SVG，没有用户照片/音频。依赖manifest许可证已核对，Hexo MIT及Firefly Gitlink内完整MIT保留。
- **主题既存角色/壁纸/模型/音频的素材权利未独立认证**，不能用代码MIT一概证明所有美术/音频授权；本轮不新增这些素材，只保留既有Gitlink。公开部署前仍需单独审查。

## 6. 证据与剩余边界

本次独立验证目录为项目内本地历史资料`.cache/stage34-finalverify-20261102T123705Z/`，不随Git发布。必要退出码/日志、首次超时、clean审计、16项引用处置、白名单/候选对象、保护指纹和原长版history保留；不再为本次新增全量截图、DOM或堆快照。公开克隆通过脚本复现，不要求拥有这些本地目录。

Android、A1最终验收、F4、非空歌单/Range和正式部署仍未验收；既有CDN/旧引擎、版本/模板SHA和间接JSDOM依赖边界不变。当前有限秘密规则与许可检查不能保证零隐私/零法律风险。阶段关闭不消除这些限制，也不自动授权Stage4。

## 7. 完整Git状态与停止

以下为标准short状态（目录按Git默认折叠）；412份非忽略未跟踪文件及4份tracked修改均已与37份候选/379份本地保留核对。完整逐路径porcelain保留本地验证目录git-status-full.txt，不把长清单作为新公开附件。

```text
 M README.md
 M apps/blog/README.md
 M apps/blog/_config.firefly.yml
 M apps/blog/tests/verify-beijing.cjs
?? AGENTS.md
?? apps/blog/lib/
?? apps/blog/scripts/site-article-reading.js
?? apps/blog/scripts/site-calendar-lifecycle.js
?? apps/blog/scripts/site-empty-fence-compat.js
?? apps/blog/scripts/site-hue-reset.js
?? apps/blog/scripts/site-nav-active.js
?? apps/blog/scripts/site-reading-math.js
?? apps/blog/scripts/site-visual-style.js
?? apps/blog/source/css/
?? apps/blog/source/js/site-article-reading.js
?? apps/blog/source/js/site-calendar-lifecycle.js
?? apps/blog/source/js/site-hue-reset.js
?? apps/blog/tests/build-reading-fixture.cjs
?? apps/blog/tests/fixtures/
?? apps/blog/tests/verify-calendar-browser.cjs
?? apps/blog/tests/verify-calendar-lifecycle.cjs
?? apps/blog/tests/verify-empty-fence.cjs
?? apps/blog/tests/verify-hue-reset.cjs
?? apps/blog/tests/verify-nav-active.cjs
?? apps/blog/tests/verify-nav-browser.cjs
?? apps/blog/tests/verify-reading-browser.cjs
?? apps/blog/tests/verify-reading.cjs
?? apps/blog/tests/verify-visual.cjs
?? docs/
```

暂存区空、无冲突，diff --check及主题状态已核验；823份既有文件全部保留，仅5份获准文档改动，原业务/配置/测试/正式public/db/主题/历史附件指纹不变。最终候选产物另核验：唯一真实文章与时刻、6份资源一致、6页唯一资源标签、归档/年/月active正确，无测试夹具污染。没有add/commit/push/reset/clean/checkout/stash、主仓库ref变更、remote变更或部署。

文档引用闸门已整改，必要回归已完成，首次超时和中断不抹去；安全/素材权利仍保留上述明确边界。完成最终tree复核后暂停，等待ChatGPT Review及用户实际提交授权。
