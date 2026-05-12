# AB 同步脚本契约

## 目标

AB 型事务用例通过两个 SQL 文件模拟两个 client session。A/B 文件之间使用 `commonScript/` 同步脚本协调执行顺序，避免使用 `pg_sleep` 等时间敏感方式。

本契约定义同步点命名、脚本调用、阻塞判断、超时语义和 A/B 职责。

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

A/B 文件名：

```text
<test_point_slug>_<case_no>A.sql
<test_point_slug>_<case_no>B.sql
```

文件名优先表达测试点，做到见名知意。`test_point_slug` 使用小写 snake_case，应该能概括核心场景，例如 `rollback_delete_lock_wait`、`repeatable_read_update_conflict`。

bug 号或 feature 号优先写入 header；只有项目明确要求时，才作为文件名后缀。

共享基础 ID：

```text
base_case_id: <test_point_slug>_<case_no>
```

共享表名：

```text
tab_<base_case_id>
```

同步点前缀：

```text
<test_point_slug>
```

示例：

```text
file A: rollback_delete_lock_wait_001A.sql
file B: rollback_delete_lock_wait_001B.sql
base_case_id: rollback_delete_lock_wait_001
table: tab_rollback_delete_lock_wait_001
sync_prefix: rollback_delete_lock_wait
```

## 同步点命名

同步点命名格式：

```text
<sync_prefix>_<from>2<to>_<step_no>
```

其中：

- `<sync_prefix>` 使用小写 snake_case。
- `<from>` 和 `<to>` 只能是 `A` 或 `B`。
- `<step_no>` 使用两位数字，从 `01` 开始递增。

示例：

```text
rollback_delete_lock_wait_A2B_01
rollback_delete_lock_wait_B2A_01
rollback_delete_lock_wait_A2B_02
```

规则：

- A 发给 B 的同步点使用 `_A2B_`。
- B 发给 A 的同步点使用 `_B2A_`。
- 同一个用例内同步点编号必须单调递增。
- 不同语义不要复用同一个同步点。
- 不要混用大小写不同但语义相同的同步点前缀。

## 脚本调用

允许使用的同步脚本：

```sql
\! sh commonScript/del_sync_points.sh <sync_prefix>
\! sh commonScript/set_sync_point.sh <sync_point>
\! sh commonScript/get_sync_point.sh <sync_point>
\! sh commonScript/replica_query_simple.sh "<sql>" <expected_min> <expected_max>
```

脚本语义：

- `del_sync_points.sh <sync_prefix>`：删除当前用例旧同步点，通常只在 A 文件开头执行。
- `set_sync_point.sh <sync_point>`：设置一个同步点，通知对端可以继续。
- `get_sync_point.sh <sync_point>`：等待指定同步点出现，直到对端完成对应阶段。
- `replica_query_simple.sh "<sql>" <expected_min> <expected_max>`：轮询执行 SQL，直到结果落在预期范围内，或脚本自身超时失败。

禁止事项：

- 不要用 `pg_sleep` 做同步。
- 不要用未声明的 shell 脚本替代同步脚本。
- 不要在 SQL 中硬编码本机绝对路径。
- 不要让 A/B 双方互相等待同一个未被设置的同步点。

## A 文件职责

A 文件通常负责初始化和主事务动作：

1. 设置 session 参数。
2. 删除旧同步点：

   ```sql
   \! sh commonScript/del_sync_points.sh <sync_prefix>
   ```

3. 创建共享对象并插入初始数据。
4. 开启事务 A。
5. 在完成 setup 后设置 A2B 同步点。
6. 如需等待 B 完成准备，等待 B2A 同步点。
7. 执行会影响 B 的事务动作，例如持锁、删除、更新、回滚或提交。
8. 设置后续 A2B 同步点，通知 B 执行阻塞或冲突语句。
9. 使用阻塞判断 helper 确认 B 已进入目标状态。
10. 按场景 `COMMIT` 或 `ROLLBACK`。

## B 文件职责

B 文件通常负责等待 A、执行阻塞或冲突动作、验证结果：

1. 设置 session 参数。
2. 开启事务 B。
3. 等待 A2B setup 同步点。
4. 设置 B2A 同步点，通知 A 自己已准备好。
5. 等待 A 持锁或进入目标事务阶段的同步点。
6. 执行阻塞、冲突或观察语句。
7. 在 A 提交或回滚后继续执行。
8. 验证最终数据状态。
9. 按场景 `COMMIT` 或 `ROLLBACK`。

## 推荐同步模式

### A 初始化，B 等待

```sql
-- A
\! sh commonScript/del_sync_points.sh <sync_prefix>
-- setup objects
BEGIN;
\! sh commonScript/set_sync_point.sh <sync_prefix>_A2B_01
\! sh commonScript/get_sync_point.sh <sync_prefix>_B2A_01
```

```sql
-- B
BEGIN;
\! sh commonScript/get_sync_point.sh <sync_prefix>_A2B_01
\! sh commonScript/set_sync_point.sh <sync_prefix>_B2A_01
```

### A 持锁，B 阻塞

```sql
-- A
-- execute statement that holds lock
\! sh commonScript/set_sync_point.sh <sync_prefix>_A2B_02
\! sh commonScript/replica_query_simple.sh "<blocking-check-sql>" 1 1
ROLLBACK;
```

```sql
-- B
\! sh commonScript/get_sync_point.sh <sync_prefix>_A2B_02
-- statement expected to block until A commits or rolls back
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

- A/B 文件名是否同源。
- A/B 使用的 `base_case_id` 是否一致。
- 表名、索引名、约束名是否从 `base_case_id` 推导。
- `sync_prefix` 是否一致。
- 每个 `get_sync_point` 是否有对应的 `set_sync_point`。
- A2B/B2A 方向是否正确。
- 同步点编号是否单调递增。
- 是否存在双方互等导致死锁的同步点。
- 是否没有使用 `pg_sleep`。
- 阻塞判断 SQL 是否包含当前用例独特标识。

## 暂不处理

本契约不负责：

- expected 输出生成。
- 同步脚本内部实现。
- 框架如何启动 A/B 两个 client。
- 框架超时时间具体配置。
