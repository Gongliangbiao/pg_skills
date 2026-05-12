# PG 用例生成工作流

## 目标

把宽泛或模糊的 PostgreSQL 覆盖需求，转换成具体、稳定、可执行的 regression 测试用例。

## 步骤

1. 规范化用户请求。
   - 识别用户要求覆盖的主题。
   - 判断用户是要生成用例、规划覆盖、评审已有用例，还是细化已有结果。
   - 如果用户没有指定格式，默认按 PostgreSQL regression 用例处理。

2. 选择 coverage pack。
   - 读取 `references/intent-expansion.md`。
   - 用用户表达匹配各 coverage pack 的 `触发短语`。
   - 优先选择最具体、最贴近用户意图的 pack。
   - 如果多个 pack 同样匹配，只问一个简短澄清问题。

3. 构建覆盖计划。
   - 读取 `references/coverage-plan-template.md`。
   - 读取选中 pack 的 `覆盖维度`。
   - 展开必选和可选覆盖点。
   - 区分正向用例、反向用例、边界用例和清理逻辑。
   - 标记是否需要多会话行为。
   - 对宽泛或模糊需求，按模板输出可审阅计划。

4. 解析 PostgreSQL 事实。
   - 读取 `references/pg-sql-integration.md`。
   - 对 coverage pack 的 `需要查询 pg-sql` 中列出的每个命令或概念使用 `pg-sql`。
   - 用查询到的事实确定语法、限制、错误行为和示例。
   - 如果查询缺失、候选不明确或 YAML 字段不足，按 `pg-sql` 对接规范处理，不要凭空补语法。

5. 选择 output profile。
   - 默认使用 `output-profiles/pg-regression.md`。
   - AB 型多会话事务用例使用 `output-profiles/pg-ab-regression.md`。
   - 使用 AB profile 时，必须读取并遵守 `references/ab-sync-contract.md`。
   - 只有当用户明确要求或 coverage pack 声明需要时，才使用其他 profile。

6. 生成用例文件。
   - 使用确定性的文件名和对象名。
   - 在 SQL 中包含必要的 setup 和 cleanup。
   - 保持输出稳定、适合 diff。
   - 如果 output profile 中已有项目级 SQL 规范，必须遵守。

## 宽泛请求处理

对于“覆盖索引”“生成数据类型全量用例”这类宽泛请求，除非用户明确要求直接写文件，否则先输出一份简短覆盖计划。

覆盖计划必须遵守 `references/coverage-plan-template.md`，并至少包含：

- 选中的 coverage pack
- 选中的 output profile
- 需要通过 `pg-sql` 查询的命令或概念
- `pg-sql` 使用到的 YAML 文件和关键字段
- 计划生成的文件名
- 对象命名规则
- 主要覆盖维度
- 明确不覆盖或暂缓覆盖的内容
