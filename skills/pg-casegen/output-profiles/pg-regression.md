# PostgreSQL 普通 Regression Output Profile

## Profile ID

pg-regression

## 适用场景

- 用户要求生成普通 PostgreSQL regression 用例。
- 用户要求生成单 SQL 用例文件。
- 用户没有指定其他输出格式。

## 生成文件

默认生成单个 SQL 文件：

```text
<test_point_slug>_<case_no>.sql
```

示例：

```text
foreign_key_020.sql
foreign_key_on_update_delete_set_null_020.sql
```

文件名优先表达测试点，做到见名知意。使用小写 snake_case，尽量让读者只看文件名就能理解核心覆盖点。对象名必须与文件基础用例 ID 对应：

```text
file name:  foreign_key_020.sql
table name: tab_foreign_key_020_a
table name: tab_foreign_key_020_b
```

如果存在 bug 号或 feature 号，优先写入 header 字段；只有当项目明确要求时，才放入文件名。

本 profile 只生成 SQL 文件。expected 输出由外部框架负责采集和比对。

## Header 格式

每个 SQL 文件必须以如下 header 开头：

```sql
--  --------------------------------------------------------
--  版权所有(C)  2021-2030 XXX有限公司
-- --
--  author      : NAME ID
--  create at   : YYYY-MM-DD
--  feature     : FEATURE NUMBER
--  version     : <target version>
--  description : <case description>
--  local_or_remote : local or remote
--  -- restriction : <restriction>
--  scheduling : 9
--  (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
--  -------------------------------------------------------
```

除非用例修改 global 状态、依赖共享外部文件或必须串行执行，否则默认使用 `scheduling: 9`。

## 文件结构

SQL 文件应包含：

1. setup
2. 正向覆盖用例
3. 反向覆盖用例，如果该主题支持
4. 验证查询
5. cleanup

章节注释优先使用中文，并遵循示例风格：`--` 后保留一个空格。

生成的 SQL 应保证外部框架采集到的输出稳定、可比对。

## 稳定性规则

- 使用确定性对象名。
- SQL 输出中避免非确定性函数。
- 多行结果在顺序重要时必须加 `ORDER BY`。
- 避免环境敏感断言。
- NOTICE、WARNING、ERROR 输出必须是有意保留的。
- 优先使用简单验证查询，不依赖 planner cost 等不稳定细节。

## 错误用例

普通 regression 负向用例可以包含预期 `ERROR:` 输出。

故意失败的语句应隔离，并通过注释说明错误意图。

## SQL 写作规范

生成 regression SQL 时，遵守 [references/pg-regression-sql-standards.md](../references/pg-regression-sql-standards.md)。

## PostgreSQL 语法转换规则

从 MySQL 风格参考用例转换为 PostgreSQL 用例时：

- 将 `key(c_id)` 这类内联索引语法改为 PostgreSQL 约束或索引，例如 `UNIQUE (c_id)` 或 `CREATE INDEX`。
- 将 `show create table` 改为稳定 catalog 验证，例如 `pg_constraint`、`pg_indexes` 或 `pg_get_constraintdef`。
- 移除 PostgreSQL 不支持的 MySQL 选项，只保留 PostgreSQL 语法。
- SQL 对象名使用小写，并使用确定性数据。

## 清理后的 PostgreSQL 示例

在更严格的项目规范给出前，使用本示例作为普通单文件输出标准。

### `foreign_key_020.sql`

```sql
--  --------------------------------------------------------
--  版权所有(C)  2021-2030 XXX有限公司
-- --
--  author      : NAME ID
--  create at   : 2025-06-30
--  feature     : FEATURE NUMBER
--  version     : 16.4
--  description : 验证给一个字段添加外键约束 on update set null on delete set null
--  local_or_remote : local or remote
--  -- restriction : remote
--  scheduling : 9
--  (must be serial(1), feature internal serial(3), feature internal parallel(5), unlimited(9); sync point only decided by AB)
--  -------------------------------------------------------

SET client_min_messages TO warning;

-- 创建表
DROP TABLE IF EXISTS tab_foreign_key_020_b;
DROP TABLE IF EXISTS tab_foreign_key_020_a;
CREATE TABLE tab_foreign_key_020_a (
    id int,
    c_id int UNIQUE
);
CREATE TABLE tab_foreign_key_020_b (
    id int,
    c_id int
);

-- 给两个表之间添加外键约束
ALTER TABLE tab_foreign_key_020_b
    ADD CONSTRAINT fk_tab_foreign_key_020_b
    FOREIGN KEY (c_id)
    REFERENCES tab_foreign_key_020_a(c_id)
    MATCH FULL
    ON UPDATE SET NULL
    ON DELETE SET NULL;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'fk_tab_foreign_key_020_b'
ORDER BY conname;

-- 给两个表插入数据
INSERT INTO tab_foreign_key_020_a VALUES (1, 4), (2, 5), (3, 6);
INSERT INTO tab_foreign_key_020_b VALUES (4, 4), (5, 5), (6, 6);
SELECT * FROM tab_foreign_key_020_a ORDER BY id;
SELECT * FROM tab_foreign_key_020_b ORDER BY id;

-- 更改 tab_foreign_key_020_a 数据
UPDATE tab_foreign_key_020_a SET c_id = 70 WHERE id = 1;
SELECT * FROM tab_foreign_key_020_b ORDER BY id;

-- 删除 tab_foreign_key_020_a 数据
DELETE FROM tab_foreign_key_020_a WHERE id = 2;
SELECT * FROM tab_foreign_key_020_b ORDER BY id;
```

## 待补充的项目规则

如果用户继续提供更具体的 SQL 约定，先更新本 profile，再生成最终 SQL 文件。

后续可能补充：

- header 中各字段的真实取值规则
- 对象命名细节
- 事务包裹策略
- cleanup 策略
- psql 元命令使用策略
- 外部框架输出归一化配合规则
