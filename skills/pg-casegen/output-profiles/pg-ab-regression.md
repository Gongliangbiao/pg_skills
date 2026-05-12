# PostgreSQL AB Regression Output Profile

## Profile ID

pg-ab-regression

## 适用场景

- 用户要求生成 AB 型事务用例。
- 用例需要两个 client session，并通过同步点协调执行顺序。
- coverage pack 声明 `multi-session`，且项目期望输出 A/B SQL 文件，而不是 PostgreSQL isolation schedule。

## 生成文件

生成一对 SQL 文件：

```text
<test_point_slug>_<case_no>A.sql
<test_point_slug>_<case_no>B.sql
```

示例：

```text
rollback_delete_lock_wait_001A.sql
rollback_delete_lock_wait_001B.sql
```

对象名必须与共享的基础用例 ID 对应：

```text
base_case_id: rollback_delete_lock_wait_001
table name:   tab_rollback_delete_lock_wait_001
```

A/B 文件必须使用同一个测试点 slug 和同一个表名。文件名优先表达测试点，做到见名知意；bug 号或 feature 号优先放在 header 字段中，只有项目明确要求时才作为文件名后缀。SQL 对象名必须使用小写 snake_case。

## Header 格式

每个 A/B 文件必须使用相同 header：

```sql
-- --------------------------------------------------------
--  版权所有(C)  2021-2030 XXX有限公司
--
-- --
--  author    : NAME ID
--  create at : YYYY-MM-DD
-- ++
-- --------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
-- description : <case description>
-- version     : <target version>
-- bug         : <bug id or feature id>
-- local_or_remote : remote
-- -- restriction  :
-- scheduling  : 9
-- (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
-- -----------------------------------------------------------------------------------------------------------
```

AB 用例由同步点控制执行顺序，且框架允许随机调度时，使用 `scheduling: 9`。

## Session 设置

使用 PostgreSQL session 设置，不使用 MySQL 设置：

```sql
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET client_min_messages TO warning;
SHOW transaction_isolation;
```

不要生成 MySQL-only 语句，例如 `set sql_mode = ''` 或 `select @@transaction_isolation`。

## 同步点规则

必须遵守 [references/ab-sync-contract.md](../references/ab-sync-contract.md)。

当 AB 调度需要同步点时，通过明确的 psql shell 命令调用公共同步脚本：

```sql
\! sh commonScript/del_sync_points.sh <sync_prefix>
\! sh commonScript/set_sync_point.sh <sync_prefix>_A2B_01
\! sh commonScript/get_sync_point.sh <sync_prefix>_B2A_01
```

A/B 文件共享一个稳定的小写 `sync_prefix`，通常为：

```text
<test_point_slug>
```

A 文件职责：

- 删除旧同步点。
- 创建共享对象并插入初始数据。
- 开启事务 A。
- 协调 A2B 和 B2A 同步点。
- 执行被测事务动作。
- 按场景使用 `COMMIT` 或 `ROLLBACK` 结束事务。

B 文件职责：

- 等待 A 的 setup 同步点。
- 开启事务 B。
- 执行阻塞或冲突语句。
- 在 A 完成后验证最终状态。
- 使用 `COMMIT` 或 `ROLLBACK` 结束事务。

## PostgreSQL 语法转换规则

从 MySQL 风格参考用例转换为 PostgreSQL 用例时：

- 将 `REPLACE INTO` 改为 `INSERT ... ON CONFLICT ... DO UPDATE` 或 `DO NOTHING`。
- 删除 `LOW_PRIORITY`、`QUICK`、`IGNORE`、`ZEROFILL`、`COLUMN_FORMAT`、`STORAGE`。
- 双引号字符串改为单引号字符串。
- 将 MySQL `@@transaction_isolation` 改为 `SHOW transaction_isolation`。
- 将 `DECIMAL ZEROFILL` 改为 `numeric` 或 `numeric(p,s)`。
- 根据列类型使用 PostgreSQL 兼容的数据值。

## 输出稳定性规则

遵守 [references/pg-regression-sql-standards.md](../references/pg-regression-sql-standards.md)。

AB 用例额外要求：

- 使用确定性同步点名称。
- A/B 文件使用同一套确定性表名。
- 验证查询必须加 `ORDER BY`。
- shell 命令只允许调用项目认可的 `commonScript/` 同步 helper。
- 不要使用 `pg_sleep`；使用同步点、锁或有界轮询 helper。
- 注释统一使用 `-- <text>` 格式。
- 生成前必须按 AB 同步契约检查每个 `get_sync_point` 是否有对应 `set_sync_point`。

## 清理后的 PostgreSQL 示例

在更严格的项目模板给出前，使用本示例作为 AB 输出标准。

### `rollback_delete_lock_wait_001A.sql`

```sql
-- --------------------------------------------------------
--  版权所有(C)  2021-2030 XXX有限公司
--
-- --
--  author    : NAME ID
--  create at : 2025-11-29
-- ++
-- --------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
-- description : 验证事务回滚场景下并发删除的数据一致性
-- version     : 16.4
-- bug         : BUG2025102229952
-- local_or_remote : remote
-- -- restriction  :
-- scheduling  : 9
-- (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
-- -----------------------------------------------------------------------------------------------------------
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET client_min_messages TO warning;

\! sh commonScript/del_sync_points.sh rollback_delete_lock_wait

\! echo "-- 1. 创建测试表并插入初始数据"
DROP TABLE IF EXISTS tab_rollback_delete_lock_wait_001;
CREATE TABLE tab_rollback_delete_lock_wait_001 (
    c0 smallint UNIQUE,
    c1 numeric(18,2) UNIQUE
);

INSERT INTO tab_rollback_delete_lock_wait_001(c0, c1)
VALUES (100, 10.01);

INSERT INTO tab_rollback_delete_lock_wait_001(c0, c1)
VALUES (200, 20.02)
ON CONFLICT (c0) DO UPDATE SET c1 = EXCLUDED.c1;

\! echo "-- 2. 验证隔离级别并开启事务 A"
SHOW transaction_isolation;
BEGIN;

\! sh commonScript/set_sync_point.sh rollback_delete_lock_wait_A2B_01
\! sh commonScript/get_sync_point.sh rollback_delete_lock_wait_B2A_01

INSERT INTO tab_rollback_delete_lock_wait_001(c0, c1)
VALUES (300, 30.03), (400, 40.04)
ON CONFLICT (c0) DO NOTHING;

\! echo "-- 3. 事务 A 删除数据并持有行锁"
DELETE FROM tab_rollback_delete_lock_wait_001;
\! sh commonScript/set_sync_point.sh rollback_delete_lock_wait_A2B_02

\! echo "-- 4. 等待事务 B 阻塞后回滚事务 A"
\! sh commonScript/replica_query_simple.sh "select count(*) from pg_stat_activity where query like 'DELETE FROM tab_rollback_delete_lock_wait_001%' and state = 'active' and query not like '%pg_stat_activity%'" 0 1

SELECT c0, c1 FROM tab_rollback_delete_lock_wait_001 ORDER BY c0;
ROLLBACK;
```

### `rollback_delete_lock_wait_001B.sql`

```sql
-- --------------------------------------------------------
--  版权所有(C)  2021-2030 XXX有限公司
--
-- --
--  author    : NAME ID
--  create at : 2025-11-29
-- ++
-- --------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
-- description : 验证事务回滚场景下并发删除的数据一致性
-- version     : 16.4
-- bug         : BUG2025102229952
-- local_or_remote : remote
-- -- restriction  :
-- scheduling  : 9
-- (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
-- -----------------------------------------------------------------------------------------------------------
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET client_min_messages TO warning;

\! echo "-- 1. 验证隔离级别并开启事务 B"
SHOW transaction_isolation;
BEGIN;

\! sh commonScript/get_sync_point.sh rollback_delete_lock_wait_A2B_01
\! sh commonScript/set_sync_point.sh rollback_delete_lock_wait_B2A_01

\! echo "-- 2. 等待事务 A 持有行锁后执行阻塞删除"
\! sh commonScript/get_sync_point.sh rollback_delete_lock_wait_A2B_02
DELETE FROM tab_rollback_delete_lock_wait_001
WHERE EXISTS (SELECT 1);

\! echo "-- 3. 事务 A 回滚后验证最终表数据"
SELECT c0, c1 FROM tab_rollback_delete_lock_wait_001 ORDER BY c0;
SELECT count(*) FROM tab_rollback_delete_lock_wait_001;
COMMIT;

SELECT c0, c1 FROM tab_rollback_delete_lock_wait_001 ORDER BY c0;
SELECT count(*) FROM tab_rollback_delete_lock_wait_001;
```
