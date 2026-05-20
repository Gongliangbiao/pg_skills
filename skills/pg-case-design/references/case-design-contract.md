# 用例设计文件契约

## 目标

用例设计文件回答两个问题：

```text
这个测试点如何设计成可执行 SQL 用例？
pg-casegen 需要哪些输入才能稳定生成 SQL？
```

它是 SQL 生成的输入，不是最终 SQL 文件。

## 路径规则

输入测试点概览。新规范下，测试点概览应由 `docs/test-factors/` 中的因子矩阵派生，并携带因子追溯字段：

```text
docs/test-points/<module>/<official-section-dir>/<case>.md
```

输出用例设计：

```text
docs/case-designs/<module>/<official-section-dir>/<case>.md
```

相对路径和文件名必须一致。

## 文件模板

```markdown
# <CASE_ID>

## 来源
- source_test_point: <docs/test-points/.../<case>.md>
- official_chapter: <chapter-number> <chapter-title>
- source_factor_matrix: <docs/test-factors/.../factor-matrix.md，新规范必填；旧测试点可缺省>
- factor_values: <Fxx-Vxx，新规范必填；旧测试点可缺省>
- combination_strategy: <single-factor / equivalence-class / boundary-directed / pairwise / state-transition / risk-based，新规范必填；旧测试点可缺省>

## 测试目标
<说明该用例验证的单一场景。>

## 测试类型
正向 / 反向 / 边界 / 并发 / 诊断 / 无需 SQL

## 会话数量
1 / 2 / 3 / none

## 前置条件
- <schema、表、配置、隔离级别等前置条件>

## 表结构设计
- <说明表、列、约束、索引如何服务本测试点>

## 测试数据
- <初始数据和关键边界值>

## 执行设计
<单会话用例写顺序动作；多会话用例按 Session 1、Session 2、Session 3 分块写。>

## 预期结果
- <稳定、可验证的结果>

## SQL 生成约束
- <是否使用普通 regression 或 AB 多会话>
- <是否禁止 pg_sleep>
- <是否需要同步点>
- <是否需要错误输出>
- <是否需要特殊 session 参数>

## 清理策略
<说明 cleanup 放在同一 SQL 文件、A/B 哪个会话，或无需清理的原因。>

## 需要 pg-sql 确认的事实
- <命令、概念或行为>

## 生成状态
ready / needs-confirmation / no-sql
```

## 设计规则

- 一个设计文件只服务一个主要测试点。
- 测试因子是测试点的上游输入；测试点是因子值按组合策略生成的结果；case design 只能消费测试点，不能反向发明或修改测试因子。
- 新规范测试点必须包含来源因子，case design 必须原样保留到“来源”章节，便于从 SQL 用例反查覆盖矩阵。
- 旧测试点没有来源因子时，不要因此阻断生成；只在备注中说明“legacy test point without factor matrix”，后续可由 `pg-doc-extract` 补建因子矩阵。
- 不要把多个官方测试点合并成一个大用例。
- 并发场景优先 2 个会话，确实需要观察者或第三事务时才使用 3 个会话。
- 多会话设计必须写清楚阻塞点、释放点和最终验证点。
- 预期结果必须能通过稳定 SQL 输出验证，避免依赖时间、PID、OID、随机值或完整错误文本。
- 不要使用 `pg_sleep` 作为同步手段；优先使用同步点、锁等待或有界轮询。
- 表结构应服务测试点，不要所有用例套用完全相同的列名、列类型和索引组合。
- 表结构变化应确定、可解释，不使用真正随机；可根据章节、测试类型、被测对象选择不同列类型、约束和索引。
- 表名前缀使用 `tab_`。
- AB 多会话用例默认只在 setup 阶段清理上次残留，不在用例末尾重复生成 `DROP TABLE` 清理步骤。
- 涉及事务提交、回滚或可见性变化的设计，应安排提交/回滚前后的稳定 `SELECT` 观测点。
- 如果官方行为无法稳定自动化，标记 `no-sql` 并说明原因。
- 如果缺少关键前置条件或预期结果，标记 `needs-confirmation`。

## 与 pg-casegen 的交接

只有 `生成状态` 为 `ready` 的设计文件才能进入 SQL 生成。

`pg-casegen` 应从设计文件读取：

- 用例 ID 和描述
- 来源测试点、来源因子矩阵和组合策略（如果存在）
- session_count
- setup/test data
- execution_design
- expected_result
- SQL 生成约束
- 需要 `pg-sql` 查询的事实

`pg-casegen` 不应从测试点名称推断缺失的核心执行逻辑。

## 示例

```markdown
# RC-UPDATE-WAIT-RECHECK-WHERE-MATCH

## 来源
- source_test_point: docs/test-points/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/rc-update-wait-recheck-where-match.md
- official_chapter: 13.2.1 Read Committed Isolation Level
- source_factor_matrix: docs/test-factors/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/factor-matrix.md
- factor_values: F01-V01,F02-V01,F03-V01,F04-V01,F05-V01
- combination_strategy: state-transition

## 测试目标
验证 Read Committed 下，UPDATE 等待并发事务释放行锁后，会重新检查 WHERE 条件。

## 测试类型
并发 / 边界

## 会话数量
2

## 前置条件
- 创建测试表，包含一行满足 Session 2 WHERE 条件的数据。
- 两个会话均使用 READ COMMITTED。

## 测试数据
- 初始行满足 `flag = true`。
- Session 1 更新该行，使其不再满足 `flag = true`。

## 执行设计
Session 1:
- BEGIN。
- 更新目标行并持有行锁。
- 等待 Session 2 发起 UPDATE 并阻塞。
- COMMIT。

Session 2:
- BEGIN。
- 对 `flag = true` 的行执行 UPDATE，等待 Session 1。
- Session 1 提交后重新检查 WHERE 条件。
- COMMIT。

## 预期结果
- Session 2 的 UPDATE 影响 0 行。
- 最终表中保留 Session 1 提交后的值。

## SQL 生成约束
- 使用 AB 多会话 SQL。
- 不使用 pg_sleep。
- 使用同步点控制 Session 1 和 Session 2 的顺序。
- 对象名使用 pg-sql-case-naming 缩写规则。

## 清理策略
由 Session 1 在 setup 前清理旧对象，最终验证后清理测试表。

## 需要 pg-sql 确认的事实
- READ COMMITTED 行为
- UPDATE 行锁等待
- WHERE 条件重新检查

## 生成状态
ready
```
