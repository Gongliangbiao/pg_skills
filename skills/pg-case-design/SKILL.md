---
name: pg-case-design
description: 用于把 PostgreSQL 测试点概览 md 细化为可供 pg-casegen 生成 SQL 的用例设计 md；当用户要求从 test-points 生成 case-designs、补全会话设计、前置条件、测试数据、预期结果或 SQL 生成约束时使用。本 skill 不直接生成 SQL。
---

# PG Case Design

将 `test-points/` 层的概览测试点补全为 `case-designs/` 层的 SQL 生成输入。测试点是 `test-factors/` 因子矩阵经过组合策略派生出的结果；本 skill 不重新设计测试因子，只消费已经形成的测试点并保留其因子追溯。输出应足够具体，让 `pg-casegen` 不需要靠测试点名字猜测执行逻辑。

## 工作流

1. 读取一个或多个 `docs/test-points/` 测试点概览 md。
2. 确认测试点中的 `factor_matrix`、`factor_values`、`combination_strategy` 追溯字段；新规范测试点应包含这些字段，因为测试点应由因子矩阵派生。
3. 如果输入是旧测试点且缺少因子追溯，不要反向补造因子；标记为 legacy，并继续按测试点内容设计用例。
4. 保持相同相对路径和文件名，输出到 `docs/case-designs/`。
5. 按 [references/case-design-contract.md](references/case-design-contract.md) 补全用例设计字段。
6. 判断用例类型：单会话、两会话、三会话、无需 SQL。
7. 并发用例优先使用 2 个会话，只有无法表达时才允许 3 个会话。
8. 明确前置条件、测试数据、会话编排、预期结果和 SQL 生成约束。
9. 将测试点中的 `factor_matrix`、`factor_values`、`combination_strategy` 原样传递到 case design 的“来源”章节。
10. 不生成 SQL 文件；SQL 生成交给 `pg-casegen`。

## 输出边界

- 负责：把“测什么”变成“怎么设计可执行 SQL 用例”。
- 不负责：具体 SQL 语句、文件命名细节、PostgreSQL 语法事实维护。
- 不负责：从官方文档抽取因子、给因子定优先级、选择组合策略；这些属于 `pg-doc-extract`。
- 因子矩阵在本层只作为覆盖追溯依据；不要在 case design 阶段重新扩展或修改因子组合。
- 需要 PostgreSQL 行为依据时，调用 `pg-sql` 查询事实。
- 需要文件路径或对象名规则时，引用 `pg-sql-case-naming`。

## 目录映射

输入：

```text
docs/test-points/<module>/<official-section-dir>/<case>.md
```

输出：

```text
docs/case-designs/<module>/<official-section-dir>/<case>.md
```

两边必须保持相同相对路径和相同文件名，便于追溯。

## 交付给 pg-casegen 的最低要求

每个可生成 SQL 的 case design 必须包含：

- case_id
- official_chapter
- source_test_point
- case_type
- session_count
- preconditions
- test_data
- execution_design
- expected_result
- sql_generation_constraints
- cleanup_strategy

如果缺少这些信息，不要让 `pg-casegen` 直接生成 SQL；先补全设计或标记为 `needs-confirmation`。
