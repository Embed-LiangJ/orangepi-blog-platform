# 项目当前状态

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
