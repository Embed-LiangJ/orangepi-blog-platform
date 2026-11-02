# Stage 3.4 公开证据与复现索引

本文件是精简说明和复现入口，不是原始Chrome数据或新验收证明。当前状态见 [项目状态](../PROJECT_STATUS.md)，本轮真实执行结果见 [提交计划](stage-3.4-final-commit-plan.md)。

## 关键故障与实现

| 问题 | 原因与边界 | 可复现入口（相对apps/blog） |
|---|---|---|
| 空围栏吞后文（A1） | Hexo8.1.2围栏量词问题；兼容副本仅改一处量词。版本/指纹/链不符时拒绝构建，仍DEFERRED | `tests/verify-empty-fence.cjs`，24个渲染案例/12个故障注入是历史结果，本次结果另列 |
| 复制读到行号、阅读溢出、目录累积 | 独立资源纠正目标、局部滚动和observer生命周期，保留原生渲染体系 | `tests/verify-reading.cjs`、`tests/build-reading-fixture.cjs`、`tests/verify-reading-browser.cjs`及reading-a/b夹具 |
| 日历每次PJAX注册回调、旧异步绘制 | 单一控制器、固定dispatcher、失效generation和abort，内存接入原生模板 | `tests/verify-calendar-lifecycle.cjs`、`tests/verify-calendar-browser.cjs` |
| F1异常可能被吞却测试通过 | assert.throws与吞异常反向断言；本次不再修改测试 | 上述生命周期单位测试，13组为既有整改结果 |
| 归档active缺失 | archive generator提供page.archive而非page.layout，复用is_archive | `tests/verify-nav-active.cjs`、`tests/verify-nav-browser.cjs` |
| 动态色/重置与日期、音乐保护 | 颜色采用原生hue，重置读取配置，日期与空歌单边界保持 | `tests/verify-visual.cjs`、`tests/verify-hue-reset.cjs`、`tests/verify-scripts.cjs`、`tests/verify-beijing.cjs` |

这些脚本及正式依赖/许可证随白名单提交，不要求下载本地调试附件。JSDOM、真实Hexo、旧Chromium和用户Windows人工结果各自保留原证据等级；Android未测，F4未证明全站无泄漏。

## 本地历史证据与可追溯性

以下明确是**本地历史资料，不随Git发布**，公开克隆没有这些路径是预期边界，不是构建依赖缺失：

- `docs/reviews/stage-3.4-artifacts/a1-empty-fence/`：A1案例/故障、注册链及保护记录。
- `docs/reviews/stage-3.4-artifacts/b1-calendar-lifecycle/`、`b1-review-remediation/`：B1、F1正常/故障退出码及回归。
- `docs/reviews/stage-3.4-artifacts/archive-nav-active/`：修复前后及正式56状态、template_locals、生成记录。
- `docs/reviews/stage-3.4-artifacts/root-cause-investigation/`：围栏与MQL/离线Document调查，唯一故障证据、原始堆及focus/retainer仍保留。
- `docs/reviews/stage-3.4-artifacts/retention-20261102/`：清理前清单、无损压缩/相同PNG映射和结果。此前清理将393份/139,829,192 B降为390份/44,230,242 B；净少95,598,950 B，未删除唯一故障证据。本轮不再清理。
- 原实施/调查/清理报告及逐文件旧提交清单保留本地；原始失败、历史SHA和实验结论不因精简公开范围而删除或改写。

历史目录有隐私、图片授权、第三方调试代码和体积边界；未将它们整体公开。完整原始数据的独立复核需由维护者在本机进行，不能据此索引声称公开仓库已经包含全套审计材料。

## 复现与回滚

按 [当前提交计划](stage-3.4-final-commit-plan.md) 的命令串行验证。临时工程使用磁盘目录，独立clean必须先核验实际base/public/db和钩子，禁止正式站点clean。脚本输出PASS/FAIL/BLOCKED/MANUAL需核对JSON与退出码，旧浏览器不命中BFCache不能伪装PASS。

A1回滚与版本合同见 [技术决策D16](../TECHNICAL_DECISIONS.md#d16-a1版本合同失败保护与回滚)。其他回滚也必须在获授权后恢复对应完整代码/测试集合并重建回归，不能更改Firefly磁盘、删除唯一证据或猜测未来提交SHA。
