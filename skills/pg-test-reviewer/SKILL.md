---
name: pg-test-reviewer
description: 用于审查 PostgreSQL 测试资产质量；当用户要求评审 test-factors、test-points、case-designs、SQL、XMind 或检查文档到 SQL 流程产物是否符合规范时使用。
---

# PG Test Reviewer

这是 PostgreSQL 测试资产的裁判 skill。它只做审查，不生成或修复产物；若需要修改，应先输出审查结论，再由用户确认或交给对应生产 skill 处理。

## 独立性边界

- 在同一个 agent 内，本文档只能提供“角色隔离”：先生产，后审查；审查时按固定标准找问题，不为已生成内容辩护。
- 真正独立的裁判需要单独 review 轮次、独立 agent，或脚本/MCP 校验器。
- 不要因为产物由当前会话生成就默认通过；必须按检查项逐项核验。
- 不要在 review 过程中顺手改文件，除非用户明确要求“审查并修复”。

## 审查范围

根据用户要求选择输入范围：

- `docs/test-factors/`
- `docs/test-points/`
- `docs/case-designs/`
- `sql/`
- `docs/reports/`

如果用户没有指定范围，默认审查当前请求相关章节的 `test-factors -> test-points -> case-designs -> sql` 链路。

## 五类审查标准

### 1. 来源真实性

检查：

- 官方章节号是否真实来自 PostgreSQL 官方文档。
- `source_type` 是否准确区分 `official-doc`、`local-knowledge`、`user-supplement`、`legacy-derived`。
- 扩展章节或本地知识是否被误写成官方章节。
- `source_ref` 是否能定位到章节、资料或本地知识文件。

阻断：

- 把本地知识或用户补充伪装成官方来源。
- 使用不存在的官方章节号并声称来自官方文档。

### 2. 覆盖链路完整性

检查：

- `test-factors` 是否包含因子、取值、优先级、依据和组合策略。
- `test-points` 是否包含 `factor_matrix`、`factor_values`、`combination_strategy`。
- 测试点是否能追溯到对应因子矩阵。
- 无测试点章节是否有 no-test 说明和理由。
- 是否存在从测试点名称反推因子的迹象。

阻断：

- 大量测试点无法追溯到因子矩阵。
- 因子矩阵核心因子是“已有测试点计划”或“本章节 N 个测试点”等结果型描述。

### 3. 用例设计就绪度

检查：

- case design 是否包含 `case_id`、来源测试点、case_type、session_count、preconditions、test_data、execution_design、expected_result、sql_generation_constraints。
- 是否标记为 ready；非 ready 是否写明缺失项。
- 并发用例是否优先 2 个会话，只有确有必要才使用 3 个会话。
- 一个 case design 是否只验证一个主要场景。
- 测试数据和预期结果是否足够让 `pg-casegen` 生成 SQL，而不是只靠测试点名称猜测。

阻断：

- 非 ready 设计被用于 SQL 生成。
- 缺少核心执行设计或预期结果。

### 4. SQL 生成规范

检查：

- SQL 文件路径是否与官方章节/用例设计路径对应。
- 文件名是否包含章节号、目录主题和主要测试点。
- AB 用例是否使用 `_001A.sql`、`_001B.sql`；确需第三会话时才用 `_001C.sql`。
- 对象名前缀是否清晰，例如 `tab`、`idx`、`func`、`seq`、`view`、`trg`。
- 对象名是否不超过 PostgreSQL 标识符长度限制。
- 事务提交前后是否有必要的状态确认查询。
- 是否去除了冗余的 cleanup 测试对象步骤。
- SQL 是否保留源 case design 或测试点追溯信息。

阻断：

- AB 文件无法配对。
- 文件名或对象名明显违反项目规范。
- SQL 与 case design 的核心场景不一致。

### 5. 测试价值判断

检查：

- 是否一个用例只测一个主要场景。
- 是否有明显重复测试点或重复 SQL。
- 是否覆盖 P0 核心路径、关键边界值、异常路径、并发冲突和诊断观测。
- P0/P1/P2/P3 优先级是否和风险、官方语义、边界重要性匹配。
- 是否存在低价值的大而全用例，导致失败定位困难。

警告：

- 测试点有价值但优先级可疑。
- 覆盖存在局部重复，但还不影响主链路。

## 结论等级

- `pass`：无阻断项，仅有少量可选建议。
- `warning`：无阻断项，但存在需要人工关注的风险或改进项。
- `blocked`：存在阻断项，不建议进入下一阶段。

## 输出格式

审查报告默认写入或建议写入：

```text
docs/reviews/<module-or-section>/review-report.md
```

报告结构：

```markdown
# Review Report

## 结论

- 状态：pass / warning / blocked
- 范围：
- 输入：
- 审查时间：

## 阻断项

- ...

## 警告项

- ...

## 建议优化

- ...

## 来源真实性

- ...

## 覆盖链路完整性

- ...

## 用例设计就绪度

- ...

## SQL 生成规范

- ...

## 测试价值判断

- ...
```

如果用户只要求口头评审，可以直接按同样结构在回复中输出，不必写文件。

## 与其他 Skill 的关系

- `pg-test-workflow`：生产流程入口；可在每个阶段后调用本 skill 做阶段门禁。
- `pg-doc-extract`：被审查对象是因子矩阵和测试点，不由 reviewer 重新抽取。
- `pg-case-design`：被审查对象是用例设计，不由 reviewer 补写设计。
- `pg-casegen`：被审查对象是 SQL，不由 reviewer 生成 SQL。
- `pg-sql-case-naming`：SQL 命名审查依据。
- `pg-sql`：当审查需要确认 PostgreSQL 语法或行为事实时使用。
