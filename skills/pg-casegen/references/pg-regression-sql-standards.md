# PostgreSQL Regression SQL 写作规范

## 0. 对象命名

使用前缀区分对象类型：

- `tab_`：表
- `idx_`：索引
- `seq_`：序列
- `view_`：视图
- `matview_`：物化视图
- `func_`：函数
- `proc_`：存储过程
- `trg_`：触发器
- `typ_`：自定义类型
- `sch_`：schema

主名称应与用例编号或覆盖主题一致。SQL 对象名使用小写 snake_case。

## 1. Session 参数

不要依赖实例默认配置。用例开始时只设置本用例需要的 session 级参数。

常见稳定化设置：

```sql
SET client_min_messages TO warning;
SET DateStyle TO 'ISO, YMD';
SET IntervalStyle TO postgres;
SET extra_float_digits TO 0;
SET standard_conforming_strings TO on;
```

只设置必要参数。避免修改 global 或持久化配置。

## 2. COPY 和外部数据

优先使用 `INSERT` 或测试框架支持的 `COPY ... FROM STDIN` 内联数据。

不要依赖 server 端文件路径。如果必须使用文件输入，应使用框架提供的路径变量，或把文件放在测试输入目录。

## 3. 远程连接

默认测试框架作为 client 远程连接数据库，可能无法访问数据库 server 文件系统。

除非测试目标就是相关能力，否则避免 shell escape、server 本地文件操作和绝对路径。

## 4. 对象定义查询

需要稳定 expected 输出时，优先查询 catalog 或 information schema，不优先使用 `\d` 等 psql 元命令。

只有在输出对目标版本稳定时，才使用 catalog 函数，例如 `pg_get_indexdef`、`pg_get_constraintdef`、`pg_get_functiondef`。

除非测试目标就是 psql 输出，否则不要依赖 psql describe 命令的格式。

## 5. 编码和 locale

SQL 文件使用 UTF-8 编码和 Unix 换行。

避免 locale 敏感的 expected 输出。如果文本排序重要，使用确定性数据和显式 `ORDER BY`。

除非用例明确测试编码、locale 或 collation，否则不要打印环境相关设置。

## 6. 版本相关信息

避免断言完整 error、notice、warning 或 hint 文本，因为小版本之间可能存在差异。

expected 输出应聚焦稳定内容，例如对象是否存在、行数、确定性 catalog 值，或项目认可的 SQLSTATE 行为。

必须验证精确错误信息时，应把用例标记为版本相关，或按项目约定提供多 expected 输出。

## 7. 多 expected 输出

默认避免多 expected 文件。

只有当行为确实依赖版本、平台或配置，并且无法通过 SQL 归一化时，才使用多个 expected 输出。

需要多个 expected 文件时，使用项目规定的命名方式，不要在生成用例时临时发明后缀。

## 8. 数据库和 schema 依赖

不要依赖默认 `test` 数据库，也不要依赖除 `public` 之外的预置 schema，除非测试框架明确保证。

范围较大的用例优先创建隔离 schema：

```sql
DROP SCHEMA IF EXISTS sch_<case_id> CASCADE;
CREATE SCHEMA sch_<case_id>;
SET search_path TO sch_<case_id>, public;
```

小型单对象用例可以在当前 schema 中使用确定性对象名。

## 9. Setup 和 Teardown

只有多个用例共享稳定基表或基础数据时，才把公共前置逻辑放到 `000` setup 脚本。

只有框架要求统一生命周期文件时，才把大范围清理放到 `999` teardown 脚本。

普通单文件 regression 用例通常应自包含 setup 和 cleanup：先 `DROP ... IF EXISTS`，再 `CREATE`，末尾按需要清理。

不要在单个用例里清理公共基表。

## 10. 可重复执行

用例必须可重复执行。

- 被用例修改的对象使用 `DROP IF EXISTS` 加 `CREATE`。
- 共享可复用对象才使用 `CREATE IF NOT EXISTS`。
- 参数变更尽量保持 session 级。
- 不依赖无关用例之间的执行顺序。

## 11. 调度兼容

用例设计应支持并行或随机调度。

使用唯一对象名或隔离 schema，避免不同用例互相冲突。

只有修改 global 状态、依赖共享外部文件，或需要有序多会话行为时，才标记为串行。

## 12. 公共脚本

共享 SQL 片段放在 `commonScript/` 或项目认可的公共脚本目录。

模块专用 helper 脚本放在匹配的模块目录。

如果已有公共脚本满足需求，优先复用。

## 13. 路径变量

不要硬编码绝对路径。

路径相关用例使用框架提供的输入/输出路径变量。测试输入文件放在 `input/`，生成产物放在 `output/`。

## 14. 文件编码

使用 Unix 换行和 UTF-8 编码。

SQL 文件保持纯文本，不要包含编辑器元数据。

## 15. 参数恢复

避免修改 global 参数。

如果必须修改 global 或持久化配置，应记录旧值，在 cleanup 中恢复，并按需要标记为串行。

session 级设置通常不需要显式恢复，除非同一 session 后续断言依赖默认值。

## 16. 注释

SQL 注释使用 `-- `，`--` 后必须有空格。

推荐：

```sql
-- 创建基础表
```

避免：

```sql
--创建表
--# setup
```

## 17. 作者信息

如果项目要求作者元数据，使用约定的人类可读格式。需要时优先使用“拼音全称 + 工号”。

不要只写一个不透明工号。

## 18. 禁用 sleep

不要用 `pg_sleep` 做同步。

使用确定性同步方式，例如锁、事务顺序、有界轮询或 isolation/AB 调度。

时间敏感测试必须隔离，并明确标记。

## 19. client 和 psql 行为

不要依赖本地 psql 配置。

如果必须使用 psql 元命令，应在 SQL 文件中显式写出，并确保 expected 输出覆盖它。

除非测试目标就是 psql 行为，否则优先使用 SQL 级验证，不使用 client 格式验证。

## 20. 输出稳定性

regression expected 输出必须稳定。

- 多行结果必须使用 `ORDER BY`。
- 除非做了归一化，否则避免打印 OID、relfilenode、时间戳、随机值、backend PID、内存地址、文件路径和执行计划 cost。
- 除非测试目标就是 planner 输出，且 profile 定义了归一化规则，否则避免断言含 cost 的 `EXPLAIN` 计划。
- 查询列和行数应尽量少，只验证必要内容。

## 21. 错误用例

允许负向用例，但预期错误必须稳定且有意义。

故意失败的语句要隔离，并在前面加注释说明，使 expected 中的 `ERROR:` 容易理解。

每个负向块优先只测试一个错误条件。
