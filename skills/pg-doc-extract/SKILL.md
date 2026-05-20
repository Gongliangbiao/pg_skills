---
name: pg-doc-extract
description: 用于从 PostgreSQL 官方文档、章节文本、PDF 转文本或已有章节目录中抽取章节结构、测试因子矩阵和测试点概览；当用户要求按官方章节整理覆盖点、检查遗漏、标注优先级、生成 test-factors 或 test-points 时使用。本 skill 不设计 SQL 步骤、不生成 SQL 文件。
---

# PG Doc Extract

将 PostgreSQL 官方文档内容整理为可审阅的测试覆盖输入。`test-factors/` 是覆盖建模层，负责章节结构、测试因子、有效值、优先级和组合策略；`test-points/` 是组合结果层，测试点必须由因子值组合派生，供 `pg-case-design` 继续细化。

## 工作流

1. 定位来源，并明确标注来源类型：`official-doc`、`local-knowledge`、`user-supplement` 或 `legacy-derived`。
2. 按真实来源建立输出层级，并列出当前处理范围内的章节树或扩展目录树。
3. 逐段抽取可测试行为、对象、条件、参数、状态、边界值、例外情况和无需测试说明；因子必须优先来自官方文档描述的功能空间，而不是从已有测试点名称反推。
4. 使用 [references/test-factor-matrix-contract.md](references/test-factor-matrix-contract.md) 生成章节测试因子矩阵，包含因子、有效值、优先级、依据、组合策略和不测原因。
5. 基于测试因子矩阵选择组合方法生成测试点：核心路径用主效应覆盖，边界/异常/并发用定向组合，必要时用 pairwise 降低组合爆炸。测试点不能脱离因子矩阵直接生成。
6. 使用 [references/test-point-overview-contract.md](references/test-point-overview-contract.md) 生成测试点概览 md；每个测试点必须能追溯到因子矩阵中的一个或多个组合。
7. 对无测试点的章节也创建因子矩阵和说明文件，标记“本章节无测试点”并写明原因。
8. 不生成 SQL，不补充执行步骤，不把多个官方测试点合并成一个大测试点。

后续主链路仍应继续交给 `pg-case-design -> pg-casegen -> sql/`。本 skill 只负责到 `test-factors/` 和 `test-points/`。

## 来源真实性规则

- 不得把本地知识库、用户补充资料、历史归档或推导出来的扩展测试点写成“官方章节”。
- 只有在 PostgreSQL 官方文档中真实存在的章节号，才能标注为 `source_type: official-doc`，并写入“官方章节结构”。
- 对用户新增的扩展目录，例如 `13.8-lock-knowledge-extensions`，必须标注为 `source_type: local-knowledge` 或 `user-supplement`，标题中使用“扩展测试点”或“本地知识补充”，不得声称其来自 Chapter 13 官方章节。
- `legacy-derived` 只能表示从旧测试点目录迁移而来；如果旧目录中混有扩展内容，也必须继续追溯其真实来源。
- 每个 factor matrix 和 test point 都必须写清楚 `source_type` 与 `source_ref`。来源不确定时，标记 `source_type: needs-confirmation`，不要补造官方依据。

## 输出边界

- 负责：官方章节结构、测试因子、有效值、优先级、组合策略、官方依据、测试点名称、覆盖意图、边界提示、是否需要测试。
- 不负责：会话编排、测试数据、SQL 语句、对象命名、同步点设计。
- 当用户要求“怎么测”或“生成可用于 SQL 的设计 md”时，改用 `pg-case-design`。

## 测试因子建模规则

- 因子矩阵必须先描述“被测空间”，再派生“计划测试点”。不要先列测试点，再包装成因子。
- 因子抽取优先顺序为：对象/语句、参数/选项、状态/条件、行为语义、边界值、异常/错误、诊断观测、no-test。
- `F01 测试行为目标`、`已有测试点计划`、`本章节 N 个单一测试点` 这类结果型描述不能作为核心因子；只允许在覆盖汇总、计划测试点或历史迁移备注中出现。
- 因子清单中的每个因子应代表一个可组合维度，例如 `隔离级别`、`并发关系`、`语句类型`、`可见性现象`、`冲突结果`，而不是某个最终测试点名称。
- 如果官方章节是 SQL 语法类内容，应按语法/对象/选项建模，例如 `CREATE TABLE` 可抽取 `表类型`、`创建方式`、`列定义`、`约束`、`存储参数`、`权限/所有者`、`异常边界`。
- 如果官方章节是并发或事务语义类内容，应按隔离级别、事务状态、并发关系、可见性、冲突/错误、非事务对象、诊断观测等维度建模。
- 对历史迁移来的旧测试点，必须重新归并到真实因子值组合；无法归并的测试点标记为 `needs-factor-review`，不要强行制造兜底因子。

## 可选报告输出

当用户明确要求 XMind、脑图、汇报材料、给组长/项目组评审、测试点充分性证明或覆盖可视化时，可以基于已经生成的 `docs/test-factors/` 和 `docs/test-points/` 生成报告。

- 报告输出不是主流程必经步骤，不应默认生成。
- 报告只展示覆盖关系，不改变测试点、用例设计或 SQL 生成流程。
- 报告结构遵守 [references/xmind-report-contract.md](references/xmind-report-contract.md)。
- 可使用脚本：

```bash
node ~/.codex/skills/pg-doc-extract/scripts/generate_xmind_report.js --root . --all
node ~/.codex/skills/pg-doc-extract/scripts/generate_xmind_report.js --root . --section 13.2-transaction-isolation
```

默认输出到：

```text
docs/reports/xmind-by-section/
```

## 目录约定

默认输出到仓库根目录下的：

```text
docs/test-factors/
docs/test-points/
```

并保留官方章节结构，例如：

```text
docs/test-points/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/
```

测试因子矩阵路径与测试点路径保持同一官方章节结构：

```text
docs/test-factors/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/factor-matrix.md
```

`test-factors/` 是人工审阅和增删因子的入口；`test-points/` 是由因子组合派生出的“测什么”清单。

若项目已有旧目录，例如 `docs/archive/concurrency-control-by-official-chapter/`，可以把它视为历史测试点概览来源，但新增规范化输出优先使用 `docs/test-points/`。迁移旧目录时必须重新确认来源类型；目录名像官方章节不等于真实官方来源。

## 与其他 Skill 的关系

- `pg-case-design`：读取本 skill 产出的测试点概览，并补全为可生成 SQL 的用例设计。
- `pg-casegen`：不应直接从官方文档抽取测试点；应消费 `pg-case-design` 产出的设计 md。
- `pg-sql`：仅在需要确认 PostgreSQL 语法或行为事实时作为辅助事实来源使用。
