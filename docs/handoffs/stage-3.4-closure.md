# Stage 3.3 / 3.4 精简交接

## 关闭状态

2026-11-02：用户已确认Stage3.3正式关闭，并认可历史资料清理，批准Stage3.4按当前限定范围关闭。当前仅进行提交前文档整改和验证；没有实际提交/推送授权，不进入Stage4或部署。

| 项目 | 当前状态 |
|---|---|
| Stage3.3视觉、动态主题色与重置 | 已接受、正式关闭 |
| F1异常测试假阳性修复 | PASS |
| F2 BFCache | Windows稳定Chrome人工PASS |
| F3窄窗口导航 | Windows Chrome人工PASS；汉堡展开、五个入口可见、未见明显越界 |
| 归档active | 人工PASS；恢复原因未作未经证明的缓存归因 |
| Android真实设备 | 未测，后续待办 |
| A1 | DEFERRED，但仍参与构建，不改变运行状态 |
| F4 | 长期观察；140～145MB短期观察不等于无泄漏证明 |

## 实现与维护

- 视觉使用独立CSS、内容版本和原生hue变量；重置读取配置默认值，不清存储。
- 阅读用独立CSS/JS与Marked钩子，保留原生KaTeX、TOC、灯箱和PJAX；修复溢出、复制目标与TOC清理。
- A1锁定Hexo8.1.2的单个围栏过滤器副本；完整MIT许可证同行保留。兼容性失败即阻止构建，不改node_modules。
- B1用单一生命周期控制器、generation/AbortController隔离过期请求，仅在内存适配head/calendar；导航仅将原模板archive判定换为官方is_archive。
- 所有站点适配都在主仓库，Firefly Submodule保持固定SHA和干净工作树。日期、音乐和正式文章不新增修改。

## 验证与回滚

本次执行结果、四批白名单及真实候选tree见 [提交前验证与计划](../reviews/stage-3.4-final-commit-plan.md)。原审查结论见 [最终独立Review](../reviews/stage-3.4-final-independent-review.md)，历史自动化/用户人工/本次运行分层记录，不能互相替代。

维护方法和关键故障索引见 [公开证据索引](../reviews/stage-3.4-evidence-index.md)，版本/失败保护/A1回滚限制见 [技术决策D16](../TECHNICAL_DECISIONS.md#d16-a1版本合同失败保护与回滚)。回滚必须另获授权，不能只删除兼容库或忽略异常；尚无本轮功能提交SHA可直接revert。

## 本地历史材料（不随Git白名单发布）

以下是原始过程记录，不是公开克隆必需文件，也不作为自动化测试输入：`docs/handoffs/stage-3.3-context-handoff.md`、`docs/handoffs/stage-3.4-reading-review.md`、`docs/reviews/stage-3.4-a1-implementation.md`、`docs/reviews/stage-3.4-b1-implementation.md`及其独立Review/整改记录。原有失败、限制、回滚说明及附件全部保留，本轮不删除或重写它们。

完整调试数据、逐文件历史清单和旧提交计划只在本机保存。公开索引不是原始证据副本，不冒充包含所有原图、堆图或浏览器会话。
