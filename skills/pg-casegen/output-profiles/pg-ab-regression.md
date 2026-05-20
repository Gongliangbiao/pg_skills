# PostgreSQL AB Regression Output Profile

## Profile ID

pg-ab-regression

## 适用场景

- 用户要求生成 AB 型事务用例。
- 用例需要两个 client session，并通过同步点协调执行顺序。
- case design 声明需要两个会话，或 coverage pack 声明 `multi-session`，且项目期望输出多会话 SQL 文件，而不是 PostgreSQL isolation schedule。

## 生成文件

生成一对 SQL 文件：

```text
sql/<module>/<official-section-dir>/<chapter-id>_<section-topic>_<test-point-slug>_001A.sql
sql/<module>/<official-section-dir>/<chapter-id>_<section-topic>_<test-point-slug>_001B.sql
```

示例：

```text
sql/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/13.2.1_read-committed_rc-update-wait-recheck-where-match_001A.sql
sql/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/13.2.1_read-committed_rc-update-wait-recheck-where-match_001B.sql
```

对象名必须使用 `pg-sql-case-naming` 的短对象名规则，并在所有会话文件中保持一致：

```text
case_id:    RC-UPDATE-WAIT-RECHECK-WHERE-MATCH
table name: tab_1321_rc_update_wait_recheck_where_match
```

多会话文件必须使用同一个测试点 slug 和同一套对象名。文件名优先表达官方章节、目录主题和测试点；bug 号或 feature 号优先放在 header 字段中，只有项目明确要求时才作为文件名后缀。

## Header 格式

每个多会话文件必须使用相同 header：

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

多会话文件名使用 AB 框架后缀。新用例默认使用 `_001A.sql`、`_001B.sql`；确实需要第三会话时使用 `_001C.sql`。同一测试点需要多组独立 AB 用例时，序号递增为 `_002A.sql`、`_002B.sql`。

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

当多会话调度需要同步点时，通过明确的 psql shell 命令调用公共同步脚本：

```sql
\! sh commonScript/del_sync_points.sh <sync_prefix>
\! sh commonScript/set_sync_point.sh <sync_prefix>_s1_to_s2_01
\! sh commonScript/get_sync_point.sh <sync_prefix>_s2_to_s1_01
```

多会话文件共享一个稳定的小写 `sync_prefix`。同步点前缀应尽量贴近用例名；只有超长或冲突时才缩写或追加短哈希，通常为：

```text
<case-name-or-case-short>
```

s1 文件职责：

- 删除旧同步点。
- 创建共享对象并插入初始数据。
- 开启事务 s1。
- 只在需要建立顺序、确认对端已到达关键阶段、或等待最终结果时使用 `s1_to_s2` / `s2_to_s1` 同步点。
- 执行被测事务动作。
- 按场景使用 `COMMIT` 或 `ROLLBACK` 结束事务。

s2 文件职责：

- 等待 s1 的 setup 同步点。
- 开启事务 s2。
- 执行阻塞或冲突语句。
- 在 s1 完成后验证最终状态。
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

多会话用例额外要求：

- 使用确定性同步点名称。
- 多会话文件使用同一套确定性表名。
- 验证查询必须加 `ORDER BY`。
- shell 命令只允许调用项目认可的 `commonScript/` 同步 helper。
- 不要使用 `pg_sleep`；使用同步点、锁或有界轮询 helper。
- 注释统一使用 `-- <text>` 格式。
- 生成前必须按 AB 同步契约检查每个 `get_sync_point` 是否有对应 `set_sync_point`。

## 简化示例

示例只展示命名、header、同步点和共享对象名形态；具体 SQL 内容应来自 case design。

### `13.2.1_read-committed_rc-update-wait-recheck-where-match_001A.sql`

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
-- description : 验证 Read Committed 下 UPDATE 等待后重新检查 WHERE 条件
-- version     : 16.4
-- bug         : FEATURE
-- local_or_remote : remote
-- -- restriction  :
-- scheduling  : 9
-- (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
-- -----------------------------------------------------------------------------------------------------------
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET client_min_messages TO warning;

\! sh commonScript/del_sync_points.sh rc_update_wait_recheck_where_match

\! echo "-- 1. 创建测试表并插入初始数据"
DROP TABLE IF EXISTS tab_1321_rc_update_wait_recheck_where_match;
CREATE TABLE tab_1321_rc_update_wait_recheck_where_match (
    id int PRIMARY KEY,
    flag boolean,
    note text
);
INSERT INTO tab_1321_rc_update_wait_recheck_where_match VALUES (1, true, 'init');

\! echo "-- 2. 事务 s1 更新目标行并持有行锁"
SHOW transaction_isolation;
BEGIN;
UPDATE tab_1321_rc_update_wait_recheck_where_match
SET flag = false, note = 's1'
WHERE id = 1;

\! sh commonScript/set_sync_point.sh rc_update_wait_recheck_where_match_s1_to_s2_01
\! sh commonScript/get_sync_point.sh rc_update_wait_recheck_where_match_s2_to_s1_01

\! echo "-- 3. 等待 s2 阻塞后提交 s1"
\! sh commonScript/replica_query_simple.sh "select count(*) from pg_stat_activity where query like 'UPDATE tab_1321_rc_update_wait_recheck_where_match%' and state = 'active' and wait_event_type is not null and query not like '%pg_stat_activity%'" 1 1
COMMIT;
```

### `13.2.1_read-committed_rc-update-wait-recheck-where-match_001B.sql`

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
-- description : 验证 Read Committed 下 UPDATE 等待后重新检查 WHERE 条件
-- version     : 16.4
-- bug         : FEATURE
-- local_or_remote : remote
-- -- restriction  :
-- scheduling  : 9
-- (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
-- -----------------------------------------------------------------------------------------------------------
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET client_min_messages TO warning;

\! echo "-- 1. 等待 s1 持有目标行锁"
\! sh commonScript/get_sync_point.sh rc_update_wait_recheck_where_match_s1_to_s2_01
SHOW transaction_isolation;
BEGIN;
\! sh commonScript/set_sync_point.sh rc_update_wait_recheck_where_match_s2_to_s1_01

\! echo "-- 2. 执行会等待 s1 的 UPDATE"
UPDATE tab_1321_rc_update_wait_recheck_where_match
SET note = 's2'
WHERE id = 1 AND flag IS TRUE;
COMMIT;

\! echo "-- 3. 验证 s2 未更新不再满足 WHERE 条件的行"
SELECT * FROM tab_1321_rc_update_wait_recheck_where_match ORDER BY id;
```
