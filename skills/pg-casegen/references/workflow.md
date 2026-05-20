# PG 用例生成工作流

## 目标

把 PostgreSQL case design 转换成具体、稳定、可执行的 regression SQL。对于宽泛或模糊的覆盖需求，先生成覆盖计划或要求补全 case design。

## 步骤

1. 规范化用户请求。
   - 识别用户要求覆盖的主题。
   - 判断用户是要生成用例、规划覆盖、评审已有用例，还是细化已有结果。
   - 如果用户没有指定格式，默认按 PostgreSQL regression 用例处理。
   - 如果输入是测试点概览而不是 case design，先交给 `pg-case-design` 补全设计。

2. 检查 case design 输入。
   - 读取 `references/case-design-input-contract.md`。
   - 如果用户提供 `docs/case-designs/` 文件，检查是否包含 case_id、session_count、execution_design、expected_result 和生成状态。
   - 只有 `生成状态: ready` 的设计文件可以生成 SQL。
   - 如果是 `needs-confirmation` 或关键字段缺失，不要直接生成 SQL，应先补全设计或提示缺失项。
   - 如果用户只提供测试点名称或测试点概览，不要直接生成 SQL。

3. 判断是否需要 coverage pack。
   - 如果输入是 ready case design，默认跳过 coverage pack。
   - 如果用户给出宽泛主题、要求扩展覆盖、要求检查遗漏，才选择 coverage pack。
   - 读取 `references/intent-expansion.md`。
   - 用用户表达匹配各 coverage pack 的 `触发短语`。
   - 优先选择最具体、最贴近用户意图的 pack。
   - 如果多个 pack 同样匹配，只问一个简短澄清问题。

4. 构建覆盖计划。
   - 读取 `references/coverage-plan-template.md`。
   - 如果使用 coverage pack，读取选中 pack 的 `覆盖维度`。
   - 如果已有 case design，合并其中的测试目标、会话数量、执行设计和预期结果。
   - 展开必选和可选覆盖点。
   - 区分正向用例、反向用例、边界用例和清理逻辑。
   - 标记是否需要多会话行为。
   - 对宽泛或模糊需求，按模板输出可审阅计划。

5. 解析 PostgreSQL 事实。
   - 读取 `references/pg-sql-integration.md`。
   - 如使用 coverage pack，对 coverage pack 的 `需要查询 pg-sql` 中列出的每个命令或概念使用 `pg-sql`。
   - 对 case design 的 `需要 pg-sql 确认的事实` 中列出的项目补充查询。
   - 用查询到的事实确定语法、限制、错误行为和示例。
   - 如果查询缺失、候选不明确或 YAML 字段不足，按 `pg-sql` 对接规范处理，不要凭空补语法。

6. 选择 output profile。
   - 默认使用 `output-profiles/pg-regression.md`。
   - AB 型多会话事务用例使用 `output-profiles/pg-ab-regression.md`。
   - 使用 AB profile 时，必须读取并遵守 `references/ab-sync-contract.md`。
   - 只有当用户明确要求、case design 声明需要，或 coverage pack 声明需要时，才使用其他 profile。

7. 生成用例文件。
   - 使用 `pg-sql-case-naming` 的文件名和对象名规则。
   - 在 SQL 中包含必要的 setup 和 cleanup。
   - 保持输出稳定、适合 diff。
   - 如果 output profile 中已有项目级 SQL 规范，必须遵守。

## 宽泛请求处理

对于“覆盖索引”“生成数据类型全量用例”这类宽泛请求，先输出一份简短覆盖计划。覆盖计划确认后，应先生成或补全 case design，再进入 SQL 生成。

覆盖计划必须遵守 `references/coverage-plan-template.md`，并至少包含：

- 选中的 coverage pack
- 选中的 output profile
- 需要通过 `pg-sql` 查询的命令或概念
- `pg-sql` 使用到的 YAML 文件和关键字段
- 计划生成的 case design 文件名
- 对象命名规则
- 主要覆盖维度
- 明确不覆盖或暂缓覆盖的内容
