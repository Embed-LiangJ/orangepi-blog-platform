# Agent 工程规范与项目入口

本文件只维护长期工程规范、AI 行为约束、架构索引和 Git/安全要求。动态状态与技术决策分别由下列文档维护，不在这里复制当前 SHA 或测试结果。

## 1. 恢复上下文时的必读顺序

**新会话、上下文压缩后或开始重要阶段前，必须依次读取：**

1. 本文件 `AGENTS.md`。
2. [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)：当前分支、Git/Submodule SHA、阶段进度、测试证据、已知问题、下一阶段任务。
3. [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md)：已确认的技术方案、原因、约束及实现边界。
4. 根目录 [`README.md`](README.md)、[`apps/blog/README.md`](apps/blog/README.md)、[`apps/blog/REVIEW-2.2-D.md`](apps/blog/REVIEW-2.2-D.md)，以及当前任务涉及的配置、脚本和测试源码。

阶段恢复时须补读 [`阶段 3.3/3.4 精简交接`](docs/handoffs/stage-3.4-closure.md) 与 [`公开证据索引`](docs/reviews/stage-3.4-evidence-index.md)：3.3 已正式关闭，3.4 已获用户限定关闭。原始过程交接为本地历史资料（`docs/handoffs/stage-3.3-context-handoff.md`、`docs/handoffs/stage-3.4-reading-review.md`），不随精简白名单发布；旧快照不代表当前进度。按最新交接核对验收边界，不得自动进入未经授权的下一阶段。

文档不能替代实际检查。Git 状态以实际只读检查为准；环境、资源及验收记录须区分历史实测与本次检查，不能据摘要宣称重新执行过测试。

## 2. 文档维护职责

- **每完成一个重要开发阶段，必须更新 `docs/PROJECT_STATUS.md` 中的项目状态、Git SHA、Submodule SHA、已完成工作、测试证据、已知问题和下一阶段任务。**
- **重要技术方案发生变化时，必须更新 `docs/TECHNICAL_DECISIONS.md`，记录决定、原因、影响和是否已经实施；不得把规划写成已完成。**
- 只有长期工程规范、AI 约束、架构索引或文档分工发生变化时才更新 `AGENTS.md`，不把它重新变成阶段日志。
- SHA 只能记录实际存在、已经核验的提交。提交尚未创建时明确标注“待提交”，不得猜测未来 SHA。区分代码基线、文档未提交状态和远程已同步状态。
- 用户明确要求只读时，不得为更新这些文档违反只读限制；应报告哪些状态需要更新并请求授权。
- 为延续公开仓库的路径最小披露约定，文档用 `$HOME`、项目相对路径及 `BLOG_MUSIC_DIR` 表达机器路径。它们是文档表达，不意味着运行配置已改为环境变量插值。
- 不在交接文档中重复公开密钥、Token、密码、SSH agent socket 或其他认证材料。

## 3. 项目架构与职责索引

项目根目录：`$HOME/projects/orangepi-blog-platform/`。开发仓库、构建产物和 OpenResty 发布目录分离，不在网站公开目录中开发。

```text
orangepi-blog-platform/
├── AGENTS.md                        # 长期规范、Agent 入口
├── docs/
│   ├── PROJECT_STATUS.md            # 动态状态、SHA、证据、阶段计划
│   └── TECHNICAL_DECISIONS.md       # 技术决策及原因
├── .gitignore
├── .gitmodules
├── README.md
└── apps/blog/
    ├── README.md                    # 运行规范、日期和音乐说明
    ├── REVIEW-2.2-D.md               # 整改记录及验收边界
    ├── _config.yml                  # Hexo 网站配置
    ├── _config.firefly.yml          # 独立主题配置
    ├── package.json
    ├── package-lock.json
    ├── scaffolds/{post,page,draft}.md
    ├── scripts/
    │   ├── beijing-time.js
    │   └── site-render-policy.js
    ├── source/
    │   ├── _posts/hello-firefly.md
    │   ├── _drafts/.gitkeep
    │   ├── categories/index.md
    │   ├── tags/index.md
    │   └── js/site-local-music.js
    ├── tests/
    │   ├── verify-beijing.cjs
    │   └── verify-scripts.cjs
    ├── themes/firefly/              # Git Submodule，非普通源码目录
    ├── node_modules/                # 忽略，不提交
    ├── public/                      # 忽略，不提交
    └── db.json                      # 忽略，不提交
```

## 4. Git、安全与 AI 行为边界

- 每次开始工作先阅读相关文档和源码，检查 Git 工作区。保留用户已有修改；发现额外、不确定的改动先停止并报告。
- 所有代码修改必须经过 Git Review，采用小步修改、小步提交、阶段验收。没有明确授权不得提交、推送、合并或部署。
- 不修改、删除或升级 Firefly Submodule，不把主题 origin 换成上游，不复制主题源码进主仓库。
- 不重写历史、不强推、不合并 main、不自动创建 PR。分支基线及已获授权的历史保留决定见状态和决策文档。
- 没有明确授权不修改远程；不要因为只读查询或测试需要改变远程配置。
- 不无授权升级依赖、修改锁文件、替换 Node，或使用 force/legacy-peer-deps 掩盖冲突。
- 不安装 Caddy、常驻 CMS 后端、Runner 或无关服务。
- 不修改 1Panel、OpenResty、防火墙、系统时区或公网配置。
- 不把预览监听改为 0.0.0.0，不开放公网端口。
- 不移动音乐、不下载在线歌单、不暴露 HOME，不把音频纳入 Git；音乐资源合同见技术决策文档。
- 不虚构资料、文章、歌曲、测试执行或验证结果。不得将空歌单验收描述为真实播放成功。
- 不输出私钥、Token、密码，不要求用户在对话中提供口令。
- `.env.example` 虽允许跟踪，也必须逐次检查内容。忽略规则不替代秘密扫描，不会消除历史中的信息。
- SSH 推送需要可用 agent。GitHub 成功认证通常返回退出码 1，不能误判；Pi 工具进程未必继承用户终端的 SSH_AUTH_SOCK。
- 不把 SSH 口令发到对话中，不擅自创建或替换密钥。

## 5. 命令与验证纪律

在 `apps/blog/` 下按任务授权运行：

```sh
node tests/verify-scripts.cjs
node tests/verify-beijing.cjs
npm run clean
npm run generate
npm run server -- --ip 127.0.0.1 --port 4000
```

- 本地预览仅监听回环地址，使用 Ctrl+C 停止。
- 时间测试使用独立临时工程，指纹验证正式 source/public/db/config 未变。
- 正式 clean/generate 会更新被忽略的 public/db.json，与隔离测试不同。
- npm ci 仅在需要恢复依赖时执行，不无故重装。
- 只读审查阶段不得自动运行会重建项目或改变运行状态的命令。

## 6. 启动时的只读首检

```sh
cd "$HOME/projects/orangepi-blog-platform"
git status
git branch -vv
git remote -v
git log -3 --oneline
git submodule status
git -C apps/blog/themes/firefly status --short
node --version
npm --version
free -h
df -h /
timedatectl show -p Timezone --value
```

将结果与 `docs/PROJECT_STATUS.md` 核对，不凭记忆使用旧 SHA。完整工程所在分支、文档待提交情况、临时报告是否仍存在等都以实际结果为准。没有明确任务授权，不因恢复上下文自动开始下一阶段或执行 `/compact`。

## 7. 验收资料与调试产物管理

### 7.1 默认交付

所有功能开发、缺陷修复和阶段验收默认采用：**精简报告 + 可复现测试脚本 + 必要证据**。报告重点记录修改内容、原因、测试结果、遗留问题和回滚方式，不为简单修改反复生成冗长报告或全量调试附件。

- 优先保留可重复执行的自动化测试脚本及必要夹具。
- 明确区分 PASS、FAIL、BLOCKED、MANUAL；暂缓项目保留 DEFERRED，不把环境受阻、模拟测试或人工确认混写为自动化通过。
- 截图仅用于证明自动化不能充分表达的视觉结果或人工验收结果；不默认保存每轮相同页面、每个中间步骤。
- 浏览器原始日志仅保留关键故障、异常及必要诊断记录。
- 历史失败记录不得为了报告简洁而删除或改写，不以精简资料为由掩盖失败。

### 7.2 临时资料与证据留存

在任务授权范围内，优先把大量调试资料放入独立临时目录，不污染正式工程目录；明确临时路径的易失性，不把临时资料存在等同于已归档或已提交。设备资源有限时优先使用空间充足的磁盘目录，避免耗尽 /tmp tmpfs。

以下内容原则上不长期堆积或全量归档进仓库：重复/中间截图、大型浏览器原始日志、临时 JSON/DOM 快照/调试输出、浏览器 Profile、重复堆快照/中间分析、临时服务 PID/运行记录。

优先保留：

- 唯一故障复现证据、关键测试结果与退出码。
- 可复现脚本、必要测试夹具、完整代码差异和关键指纹。
- 重要架构决策、技术限制、回滚方案。
- 尚未解决问题所需的原始证据。

大型调试资料优先采用**无损压缩 + 摘要 + 索引**管理，核验压缩恢复后的指纹；不擅自删除唯一关键证据。索引应区分公开随仓库提交的材料和仅本地留存的材料，不为填补公开链接而夹带未经审查的原始数据。

### 7.3 清理安全

- 清理前建立逐文件清单，记录路径、用途和处理方式，区分正式源码、测试资料、历史证据和临时产物。
- 检查报告、测试脚本和构建系统引用；仅清理已确认不再需要的冗余资料。用途不确定即保留并列入待确认清单。
- 不擅自删除用户素材、业务源码、配置、测试脚本、许可证或唯一故障证据。
- 涉及历史资料删除时，明确列出范围、理由和保留替代方案；必要摘要/路径映射先行，避免引用无说明地失效，不篡改历史结论或原始指纹。
- 未经用户授权，不批量删除、不执行 Git Clean 或其他破坏性操作；已有任务对目录、文件和命令的限制继续生效，本规范本身不是清理授权。

长期目标：目录清晰、证据可追溯、测试可复现。**不以文件数量衡量工程质量，以代码质量、测试可信度和问题可追溯性衡量工程质量。**
