# AB 同步脚本契约

## 目标

AB 型事务用例通过多个 SQL 文件模拟多个 client session。会话文件之间使用 `commonScript/` 同步脚本协调执行顺序，避免使用 `pg_sleep` 等时间敏感方式。

本契约定义同步点命名、脚本调用、阻塞判断、超时语义和会话职责。

## 适用范围

使用 `output-profiles/pg-ab-regression.md` 时必须遵守本契约。

适用场景：

- 两个事务需要按顺序交错执行。
- 一个事务需要等待另一个事务持锁、阻塞或完成。
- 需要验证并发冲突、锁等待、回滚、提交后的数据状态。

不适用场景：

- 普通单会话 SQL 用例。
- 只需要简单顺序执行、不需要同步点的用例。
- 已由专门 isolation schedule 框架表达的用例。

## 文件和对象命名

文件名使用 `pg-sql-case-naming` 规则：

```text
<chapter-id>_<section-topic>_<test-point-slug>_001A.sql
<chapter-id>_<section-topic>_<test-point-slug>_001B.sql
```

文件名优先表达官方章节、目录主题和测试点，做到见名知意。默认只使用两个会话文件；确实需要第三会话时才增加 `_001C.sql`。文件名中的 `A/B/C` 是框架文件后缀，逻辑会话仍可在注释中标记为 `s1/s2/s3`。

bug 号或 feature 号优先写入 header；只有项目明确要求时，才作为文件名后缀。

共享对象名使用 `pg-sql-case-naming` 的短对象名规则：

```text
tab_<chapter-short>_<case-name-or-case-short>
```

同步点前缀使用稳定短名；优先贴近用例名，只有超长或冲突时才缩写或追加短哈希：

```text
<case-name-or-case-short>
```

示例：

```text
file A: 13.2.1_read-committed_rc-update-wait-recheck-where-match_001A.sql
file B: 13.2.1_read-committed_rc-update-wait-recheck-where-match_001B.sql
table:   tab_1321_rc_update_wait_recheck_where_match
sync_prefix: rc_update_wait_recheck_where_match
```

## 同步点命名

同步点命名格式：

```text
<sync_prefix>_<from>_to_<to>_<step_no>
```

其中：

- `<sync_prefix>` 使用小写 snake_case。
- `<from>` 和 `<to>` 使用 `s1`、`s2`、`s3`。
- `<step_no>` 使用两位数字，从 `01` 开始递增。

示例：

```text
rc_update_wait_recheck_where_match_s1_to_s2_01
rc_update_wait_recheck_where_match_s2_to_s1_01
rc_update_wait_recheck_where_match_s1_to_s2_02
```

规则：

- S1 发给 S2 的同步点使用 `_s1_to_s2_`。
- S2 发给 S1 的同步点使用 `_s2_to_s1_`。
- 同一个用例内同步点编号必须单调递增。
- 不同语义不要复用同一个同步点。
- 不要混用大小写不同但语义相同的同步点前缀。
- 不生成没有调度意义的收尾握手；如果某个 `set/get` 只表示“我结束了”且没有后续验证依赖，应删除。

## 脚本调用

允许使用的同步脚本：

```sql
\! sh commonScript/del_sync_points.sh <sync_prefix>
\! sh commonScript/set_sync_point.sh <sync_point>
\! sh commonScript/get_sync_point.sh <sync_point>
\! sh commonScript/replica_query_simple.sh "<sql>" <expected_min> <expected_max>
```

脚本语义：

- `del_sync_points.sh <sync_prefix>`：删除当前用例旧同步点，通常只在 s1 文件开头执行。
- `set_sync_point.sh <sync_point>`：设置一个同步点，通知对端可以继续。
- `get_sync_point.sh <sync_point>`：等待指定同步点出现，直到对端完成对应阶段。
- `replica_query_simple.sh "<sql>" <expected_min> <expected_max>`：轮询执行 SQL，直到结果落在预期范围内，或脚本自身超时失败。

禁止事项：

- 不要用 `pg_sleep` 做同步。
- 不要用未声明的 shell 脚本替代同步脚本。
- 不要在 SQL 中硬编码本机绝对路径。
- 不要让多个会话互相等待同一个未被设置的同步点。

## s1 文件职责

s1 文件通常负责初始化和主事务动作：

1. 设置 session 参数。
2. 删除旧同步点：

   ```sql
   \! sh commonScript/del_sync_points.sh <sync_prefix>
   ```

3. 创建共享对象并插入初始数据。
4. 开启事务 s1。
5. 在完成 setup 后设置 `s1_to_s2` 同步点。
6. 如需等待 s2 完成准备，等待 `s2_to_s1` 同步点。
7. 执行会影响 s2 的事务动作，例如持锁、删除、更新、回滚或提交。
8. 设置后续 `s1_to_s2` 同步点，通知 s2 执行阻塞或冲突语句。
9. 使用阻塞判断 helper 确认 s2 已进入目标状态。
10. 按场景 `COMMIT` 或 `ROLLBACK`。

## s2 文件职责

s2 文件通常负责等待 s1、执行阻塞或冲突动作、验证结果：

1. 设置 session 参数。
2. 开启事务 s2。
3. 等待 `s1_to_s2` setup 同步点。
4. 设置 `s2_to_s1` 同步点，通知 s1 自己已准备好。
5. 等待 s1 持锁或进入目标事务阶段的同步点。
6. 执行阻塞、冲突或观察语句。
7. 在 s1 提交或回滚后继续执行。
8. 验证最终数据状态。
9. 按场景 `COMMIT` 或 `ROLLBACK`。

## 推荐同步模式

### s1 初始化，s2 等待

```sql
-- s1
\! sh commonScript/del_sync_points.sh <sync_prefix>
-- setup objects
BEGIN;
\! sh commonScript/set_sync_point.sh <sync_prefix>_s1_to_s2_01
\! sh commonScript/get_sync_point.sh <sync_prefix>_s2_to_s1_01
```

```sql
-- s2
BEGIN;
\! sh commonScript/get_sync_point.sh <sync_prefix>_s1_to_s2_01
\! sh commonScript/set_sync_point.sh <sync_prefix>_s2_to_s1_01
```

### s1 持锁，s2 阻塞

```sql
-- s1
-- execute statement that holds lock
\! sh commonScript/set_sync_point.sh <sync_prefix>_s1_to_s2_02
\! sh commonScript/replica_query_simple.sh "<blocking-check-sql>" 1 1
ROLLBACK;
```

```sql
-- s2
\! sh commonScript/get_sync_point.sh <sync_prefix>_s1_to_s2_02
-- statement expected to block until s1 commits or rolls back
```

## 阻塞判断

阻塞判断应使用 PostgreSQL catalog 或统计视图，优先使用 `pg_stat_activity` 和 `pg_locks`。

常见判断方式：

```sql
select count(*)
from pg_stat_activity
where query like '<blocked statement prefix>%'
  and state = 'active'
  and wait_event_type is not null
  and query not like '%pg_stat_activity%'
```

或结合 `pg_locks` 判断等待锁：

```sql
select count(*)
from pg_locks
where granted = false
```

规则：

- 阻塞判断 SQL 必须尽量精确，避免误匹配其他用例。
- 查询条件中应包含当前用例的表名或独特 SQL 片段。
- `query not like '%pg_stat_activity%'` 可用于避免匹配查询自身。
- 如果用 `pg_locks`，应尽量关联当前对象或当前数据库，避免误判。
- 不要用固定等待时间推断阻塞。

## 超时语义

同步脚本和轮询 helper 的超时由框架负责。

生成 SQL 时应遵守：

- 不在 SQL 中自行实现无限循环。
- 不使用 `pg_sleep` 扩大等待窗口。
- 阻塞判断必须有明确预期范围，例如 `0 1` 或 `1 1`。
- 如果阻塞状态可能短暂出现，优先通过同步点保证顺序，而不是依赖时间。
- 如果某一步依赖框架超时，应在注释中说明该步骤预期等待的状态。

## 注释要求

每个同步阶段前必须有注释说明意图：

```sql
\! echo "-- 2. 等待事务 A 持有行锁后执行阻塞删除"
```

注释应说明：

- 当前阶段编号。
- 哪个事务在等待。
- 等待什么条件。
- 接下来执行什么动作。

## 生成前检查

生成 AB SQL 前，必须检查：

- 多会话文件名是否同源。
- 多会话文件使用的 case_id 是否一致。
- 表名、索引名、约束名是否从 `pg-sql-case-naming` 规则推导。
- `sync_prefix` 是否一致。
- 每个 `get_sync_point` 是否有对应的 `set_sync_point`。
- 同步点方向是否正确。
- 同步点编号是否单调递增。
- 是否存在双方互等导致死锁的同步点。
- 是否没有使用 `pg_sleep`。
- 阻塞判断 SQL 是否包含当前用例独特标识。

## 暂不处理

本契约不负责：

- expected 输出生成。
- 同步脚本内部实现。
- 框架如何启动多个 client。
- 框架超时时间具体配置。
