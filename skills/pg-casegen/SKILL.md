---
name: pg-casegen
description: 用于根据 PostgreSQL 覆盖需求生成回归测试 SQL 用例，支持模糊需求扩展、coverage pack、output profile、普通 regression 和 AB 事务用例格式。
---

# PG 用例生成器

当用户要求生成 PostgreSQL 测试用例、覆盖用例、regression 用例、SQL 文件或 AB 事务用例时，使用这个 skill。

这是主控编排 skill。它不直接维护 PostgreSQL 语法事实；需要精确语法、选项、限制、示例或行为细节时，使用 `pg-sql` 作为语法和行为知识来源。

## 核心模型

- `pg-sql`：负责 PostgreSQL 语法和行为知识。
- `pg-casegen`：负责意图增强、覆盖规划和输出成型。
- `coverage-packs/*.md`：可插拔的主题覆盖规则。
- `output-profiles/*.md`：可插拔的文件输出格式规则。

## 工作流

1. 理解用户需求，即使输入比较模糊。
2. 读取 [references/intent-expansion.md](references/intent-expansion.md)，把用户输入规范化为明确的覆盖主题。
3. 从 `coverage-packs/*.md` 中选择最匹配的 coverage pack。
4. 读取 [references/coverage-pack-contract.md](references/coverage-pack-contract.md)，再读取选中的 coverage pack。
5. 选择 output profile。默认使用 [output-profiles/pg-regression.md](output-profiles/pg-regression.md)。如果是 AB 型多会话事务用例，使用 [output-profiles/pg-ab-regression.md](output-profiles/pg-ab-regression.md)。
6. 根据 coverage pack 中的 `需要查询 pg-sql`，并按照 [references/pg-sql-integration.md](references/pg-sql-integration.md)，使用 `pg-sql` 查询 PostgreSQL 语法、选项、限制、示例和行为细节。
7. 当主题较大或输入模糊时，按照 [references/coverage-plan-template.md](references/coverage-plan-template.md) 先产出覆盖计划，再生成文件。
8. 按选中的 output profile 生成最终 SQL 用例文件。

## 默认输出

默认生成 PostgreSQL regression 风格的单 SQL 文件：

- `<test_point_slug>_<case_no>.sql`

当前只生成 SQL 文件。expected 输出由外部成熟框架负责采集和比对，`pg-casegen` 不生成 expected 文件。

当用户需求需要多会话调度，并且项目期望 A/B SQL 文件时，优先使用 [output-profiles/pg-ab-regression.md](output-profiles/pg-ab-regression.md)。

## 约束

- 不要在 `pg-sql` 能提供语法事实时凭记忆编造 PostgreSQL 语法。
- 不要把具体主题的覆盖规则写死在本文件；放到 `coverage-packs/`。
- 不要把输出格式细节写死在本文件；放到 `output-profiles/`。
- 优先生成稳定、确定、适合回归测试的输出，不追求炫技。
- 如果缺少对应 coverage pack，不要静默临时发挥一个大型主题；应创建或请求补充 coverage pack。
- 如果用户提供项目级 SQL 格式规范，优先更新选中的 output profile，不要把格式规则分散到 coverage pack。

## 参考文件

- [references/workflow.md](references/workflow.md)：主控编排流程。
- [references/intent-expansion.md](references/intent-expansion.md)：模糊输入增强和主题匹配。
- [references/coverage-pack-contract.md](references/coverage-pack-contract.md)：coverage pack 结构规范。
- [references/output-profile-contract.md](references/output-profile-contract.md)：output profile 结构规范。
- [references/pg-sql-integration.md](references/pg-sql-integration.md)：`pg-casegen` 调用 `pg-sql` 的对接规范。
- [references/coverage-plan-template.md](references/coverage-plan-template.md)：模糊需求展开为可审阅覆盖计划的输出模板。
- [references/ab-sync-contract.md](references/ab-sync-contract.md)：AB 型事务用例的同步点、阻塞判断、超时语义和 A/B 职责规范。
