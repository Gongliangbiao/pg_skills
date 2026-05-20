# Case Design 输入契约

## 目标

`pg-casegen` 只应从信息完整的 case design 生成 SQL。测试点名称、测试点概览或宽泛主题不能替代 case design。

## 合格输入

合格输入来自：

```text
docs/case-designs/<module>/<official-section-dir>/<case>.md
```

文件必须包含以下字段或同义章节：

```text
case_id
source_test_point
official_chapter
测试目标
测试类型
会话数量
前置条件
测试数据
执行设计
预期结果
SQL 生成约束
清理策略
需要 pg-sql 确认的事实
生成状态
```

新流程中的 case design 可以额外包含以下追溯字段；这些字段用于 header 或注释追溯，不作为旧用例的阻断条件：

```text
source_factor_matrix
factor_values
combination_strategy
```

`生成状态` 必须为：

```text
ready
```

## 阻断规则

遇到以下任一情况，不生成 SQL：

- 输入来自 `docs/test-points/`，还没有对应 `docs/case-designs/`。
- `生成状态` 是 `needs-confirmation`、`no-sql` 或缺失。
- 缺少 `执行设计`。
- 缺少 `预期结果`。
- `会话数量` 缺失，或者与 SQL 生成约束冲突。
- 并发用例没有说明阻塞点、释放点和最终验证点。
- 多会话用例需要 3 个以上会话，但没有明确理由。
- 需要 PostgreSQL 事实确认，但没有列出查询项，且该事实影响核心行为。

阻断时输出缺失项列表，并建议先使用 `pg-case-design` 补全。

## 会话数量映射

```text
1    -> pg-regression
2    -> pg-ab-regression，输出 _001A.sql 和 _001B.sql
3    -> pg-ab-regression 扩展三会话，输出 _001A.sql、_001B.sql、_001C.sql；必须有理由
none -> 不生成 SQL
```

并发测试默认最多 2 个会话。只有观察者会话、第三事务参与冲突链或官方行为本身需要第三会话时，才允许 3 个会话。

## 字段使用方式

- `case_id`：写入 SQL header，用于短哈希和对象名推导。
- `source_test_point`：写入 SQL header，用于追溯。
- `source_factor_matrix`、`factor_values`、`combination_strategy`：如果存在，优先写入 SQL header 或保留在生成记录中，用于从 SQL 反查因子矩阵；缺失时不阻断旧用例。
- `official_chapter`：写入 SQL header，并参与路径推导。
- `测试目标`：写入 description，并指导 SQL 主体。
- `会话数量`：决定 output profile。
- `前置条件` 和 `测试数据`：生成 setup。
- `执行设计`：生成 SQL 主体和多会话同步点。
- `预期结果`：生成验证查询。
- `SQL 生成约束`：决定是否允许错误输出、同步点、session 参数、AB 文件。
- `清理策略`：生成 cleanup。
- `需要 pg-sql 确认的事实`：驱动 `pg-sql` 查询。

## coverage pack 的位置

当输入已经是 ready case design 时，coverage pack 默认不是必需输入。

coverage pack 只在以下场景使用：

- 用户只给了宽泛主题，例如“覆盖索引”。
- 用户要求检查某个主题是否还缺覆盖。
- case design 中明确要求按某主题 pack 补充覆盖维度。
- 正在生成覆盖计划，而不是直接从 ready design 生成 SQL。

不要用 coverage pack 覆盖 case design 中已经明确的执行设计和预期结果。
