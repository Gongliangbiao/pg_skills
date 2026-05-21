---
name: pg-test-workflow
description: 用于从 PostgreSQL 官方文档、本地知识或用户补充资料端到端生成测试资产；当用户希望一站式完成 test-factors、test-points、case-designs、可选 XMind 和 SQL 生成，或从中间阶段断点续跑时使用。
---

# PG Test Workflow

这是 PostgreSQL 测试资产生成的编排入口。它不替代子 skill，而是根据当前产物状态串联 `pg-doc-extract -> pg-case-design -> pg-casegen`，并在需要时调用 `pg-sql-case-naming` 和 `pg-sql`。

## 子 Skill 分工

- `pg-doc-extract`：从官方文档、本地知识或用户补充资料生成 `docs/test-factors/` 和 `docs/test-points/`。
- `pg-case-design`：从 `docs/test-points/` 生成可供 SQL 生成的 `docs/case-designs/`。
- `pg-casegen`：从 ready case design 生成 `sql/`。
- `pg-sql-case-naming`：约束 SQL 输出路径、文件名和数据库对象名。
- `pg-sql`：确认 PostgreSQL 语法、选项、限制、错误行为和并发语义。

## 工作流

1. 识别用户目标：全流程生成、只抽取测试点、只补用例设计、只生成 SQL、只生成 XMind 汇报，或检查现有产物。
2. 明确输入来源和来源类型：`official-doc`、`local-knowledge`、`user-supplement` 或 `legacy-derived`。
3. 检查当前仓库产物：
   - `docs/test-factors/`
   - `docs/test-points/`
   - `docs/case-designs/`
   - `sql/`
   - `docs/reports/`
4. 如果缺少 `test-factors` 或 `test-points`，使用 `pg-doc-extract` 生成覆盖建模和测试点概览。
5. 如果存在 `test-points` 但缺少对应 `case-designs`，使用 `pg-case-design` 补全用例设计。
6. 如果存在 ready case design 且用户要求 SQL，使用 `pg-casegen` 生成 SQL。
7. SQL 生成前必须遵守 `pg-sql-case-naming`；需要 PostgreSQL 行为事实时由生成阶段使用 `pg-sql`。
8. 只有用户明确要求 XMind、脑图、汇报材料或覆盖可视化时，才调用 `pg-doc-extract` 的可选报告能力。
9. 如果用户要求质量门禁、评审、裁判或发布前检查，使用 `pg-test-reviewer` 审查对应阶段产物。
10. 每阶段完成后给出简短交付摘要，包括新增/更新文件范围、阻断项和下一步建议。

## 断点续跑

- 已有 `docs/test-factors/` 和 `docs/test-points/` 时，不重复抽取，除非用户要求重新生成或覆盖。
- 已有 `docs/case-designs/` 时，先检查是否为 ready；非 ready 的文件先补全，不直接生成 SQL。
- 已有 `sql/` 时，除非用户明确要求覆盖，否则先报告冲突或只处理缺失文件。
- 如果发现旧格式测试点缺少 `factor_matrix`、`factor_values` 或 `combination_strategy`，按 `pg-case-design` 规则标记 legacy，不反向补造因子。
- 如果用户只要求某一章节或目录，只处理该范围，不扩展到全仓库。

## 输出边界

- 负责：阶段选择、子 skill 调度、断点续跑、目录完整性检查、交付摘要。
- 不负责：重新定义测试因子契约、编写 SQL 细节、维护 PostgreSQL 语法事实。
- 不把本地知识或用户补充资料伪装成官方文档来源。
- 不默认生成 XMind；XMind 是汇报选项，不是主流程必经步骤。
- 不默认删除历史产物；清理或归档必须得到用户明确要求。
- 不把本 skill 生成阶段和 `pg-test-reviewer` 审查阶段混在一起；若同一轮执行两者，应先完成生产，再切换为 reviewer 标准审查。

## 推荐目录

```text
docs/test-factors/
docs/test-points/
docs/case-designs/
docs/reports/
sql/
```

本地知识补充建议放在：

```text
docs/knowledge/
```

## 典型请求

```text
使用 pg-test-workflow，根据 PostgreSQL 官方文档 Chapter 13 生成测试因子、测试点、用例设计和 SQL。
```

```text
使用 pg-test-workflow，从 docs/test-points/chapter-13-concurrency-control 继续生成 case design 和 SQL。
```

```text
使用 pg-test-workflow，只为 Chapter 13 生成 XMind 汇报，不生成 SQL。
```

## 完成前检查

- 测试点能追溯到测试因子矩阵和组合策略。
- case design 达到 ready 状态后才进入 SQL 生成。
- SQL 文件路径和对象名符合 `pg-sql-case-naming`。
- 需要精确 PostgreSQL 行为时已通过 `pg-sql` 确认。
- 输出文档使用仓库相对路径，不包含本机绝对路径。

如需更严格的质量结论，调用 `pg-test-reviewer` 输出 `pass`、`warning` 或 `blocked` 审查报告。
