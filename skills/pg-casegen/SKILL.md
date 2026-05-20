---
name: pg-casegen
description: 用于从 PostgreSQL ready case design 生成 regression SQL 用例；当用户提供 docs/case-designs 下的用例设计、要求生成普通 SQL 或 AB 多会话 SQL 时使用。也支持宽泛主题的覆盖计划，但宽泛主题必须先规划或补全 case design，不能直接靠测试点名字生成 SQL。
---

# PG 用例生成器

当用户要求从 PostgreSQL case design 生成 SQL、生成 regression 用例文件或生成 AB 多会话 SQL 时，使用这个 skill。若用户只给测试点概览或宽泛主题，先转为 case design 或覆盖计划。

这是 SQL 生成主控 skill。它消费 `docs/case-designs/` 中已经补全的用例设计，生成稳定、可执行的 PostgreSQL regression SQL。它不直接维护 PostgreSQL 语法事实；需要精确语法、选项、限制、示例或行为细节时，使用 `pg-sql` 作为语法和行为知识来源。

## 核心模型

- `pg-sql`：负责 PostgreSQL 语法和行为知识。
- `pg-case-design`：负责把测试点概览补全为可生成 SQL 的 case design。
- `pg-sql-case-naming`：负责 SQL 文件路径、文件名和数据库对象名规则。
- `pg-casegen`：负责从 ready case design 生成 SQL。
- `coverage-packs/*.md`：可选的主题覆盖规则，只用于宽泛主题规划或补充覆盖，不是 case-design-to-SQL 主链路的必经步骤。
- `output-profiles/*.md`：可插拔的文件输出格式规则。

## 工作流

1. 理解用户需求，即使输入比较模糊。
2. 读取 [references/intent-expansion.md](references/intent-expansion.md)，把用户输入规范化为明确的覆盖主题。
3. 如果输入是 `docs/test-points/` 测试点概览，先使用 `pg-case-design` 生成或补全 `docs/case-designs/` 用例设计，不要直接靠测试点名字生成 SQL。
4. 读取 [references/case-design-input-contract.md](references/case-design-input-contract.md)，检查 case design 是否满足 SQL 生成输入契约。
5. 只有当输入是 `生成状态: ready` 的 case design，才进入 SQL 生成；否则阻断并说明缺失项。
6. 只有在用户给出宽泛主题、要求扩展覆盖，或 case design 明确要求补充主题覆盖时，才读取 `coverage-packs/*.md`。
7. 选择 output profile。默认使用 [output-profiles/pg-regression.md](output-profiles/pg-regression.md)。如果是 AB 型多会话事务用例，使用 [output-profiles/pg-ab-regression.md](output-profiles/pg-ab-regression.md)。
8. 根据 case design 的 `需要 pg-sql 确认的事实`，并按照 [references/pg-sql-integration.md](references/pg-sql-integration.md)，使用 `pg-sql` 查询 PostgreSQL 语法、选项、限制、示例和行为细节。
9. 当主题较大或输入模糊时，按照 [references/coverage-plan-template.md](references/coverage-plan-template.md) 先产出覆盖计划，再生成文件。
10. 按选中的 output profile 和 `pg-sql-case-naming` 规则生成最终 SQL 用例文件。

## 默认输出

默认从 `docs/case-designs/` 中的 ready 设计生成 PostgreSQL regression 风格 SQL 文件。

当前只生成 SQL 文件。expected 输出由外部成熟框架负责采集和比对，`pg-casegen` 不生成 expected 文件。

当用户需求需要多会话调度，并且项目期望 A/B SQL 文件时，优先使用 [output-profiles/pg-ab-regression.md](output-profiles/pg-ab-regression.md)。

文件路径、文件名和数据库对象名必须遵守 `pg-sql-case-naming`，不要使用旧的 `<test_point_slug>_<case_no>.sql` 或无序号的 `A.sql/B.sql` 后缀命名。

## 约束

- 不要在 `pg-sql` 能提供语法事实时凭记忆编造 PostgreSQL 语法。
- 不要从测试点名称推断缺失的核心执行逻辑；先让 `pg-case-design` 补全 case design。
- 不要把 coverage pack 当作 ready case design 的替代品。
- 不要把具体主题的覆盖规则写死在本文件；放到 `coverage-packs/`。
- 不要把输出格式细节写死在本文件；放到 `output-profiles/`。
- 优先生成稳定、确定、适合回归测试的输出，不追求炫技。
- 如果是宽泛主题规划且缺少对应 coverage pack，不要静默临时发挥一个大型主题；应创建或请求补充 coverage pack。若输入是 ready case design，则不要求必须存在 coverage pack。
- 如果用户提供项目级 SQL 格式规范，优先更新选中的 output profile，不要把格式规则分散到 coverage pack。

## 参考文件

- [references/workflow.md](references/workflow.md)：主控编排流程。
- [references/case-design-input-contract.md](references/case-design-input-contract.md)：case design 到 SQL 生成的输入契约和阻断规则。
- [references/intent-expansion.md](references/intent-expansion.md)：模糊输入增强和主题匹配。
- [references/coverage-pack-contract.md](references/coverage-pack-contract.md)：coverage pack 结构规范。
- [references/output-profile-contract.md](references/output-profile-contract.md)：output profile 结构规范。
- [references/pg-sql-integration.md](references/pg-sql-integration.md)：`pg-casegen` 调用 `pg-sql` 的对接规范。
- [references/coverage-plan-template.md](references/coverage-plan-template.md)：模糊需求展开为可审阅覆盖计划的输出模板。
- [references/ab-sync-contract.md](references/ab-sync-contract.md)：AB 型事务用例的同步点、阻塞判断、超时语义和多会话职责规范。
