# 索引 Coverage Pack

## Pack ID

index

## 触发短语

- 索引
- 索引覆盖
- 覆盖索引
- index
- index coverage
- create index
- CREATE INDEX
- drop index
- reindex

## 需要查询 pg-sql

- CREATE INDEX
- DROP INDEX
- REINDEX
- EXPLAIN

## pg-sql 事实来源

生成索引用例前，必须通过 `pg-sql` 读取以下 YAML：

| 查询项 | YAML | 使用字段 | 用途 |
|---|---|---|---|
| CREATE INDEX | `ddl/create/create_index.yaml` | `syntax`, `key_parameters`, `examples`, `notes`, `compatibility`, `related_commands` | 生成索引主体语法和覆盖维度 |
| DROP INDEX | `ddl/drop/drop_index.yaml` | `syntax`, `key_parameters`, `examples` | 生成清理语句和删除索引用例 |
| REINDEX | `utility/reindex.yaml` | `syntax`, `key_parameters`, `examples`, `notes` | 生成重建索引用例 |
| EXPLAIN | `utility/explain.yaml` | `syntax`, `key_parameters`, `notes` | 仅在需要验证 planner 是否可能使用索引时参考 |

## 能力要求

- single-session
- sql-only
- error-output

## 输出说明

本 pack 只定义索引主题的覆盖维度和生成规则，不定义最终文件名。最终 SQL 文件路径、文件名和数据库对象名由 output profile 与 `pg-sql-case-naming` 决定。

## 覆盖分层

索引覆盖按 6 层组织：

1. 基础建索引语法
2. 索引属性和子句组合
3. 索引方法覆盖
4. 删除与重建
5. 验证查询
6. 负向和边界场景

## 覆盖维度

本 pack 的覆盖维度包括：

- 基础单列、多列和显式命名索引。
- 唯一索引、NULL 唯一性语义和重复值错误。
- 表达式索引、部分索引和覆盖索引 `INCLUDE`。
- 排序方向、NULLS 排序、collation、opclass、storage parameter 和 tablespace 等子句。
- btree、hash、gin、gist、spgist、brin 等索引方法。
- `IF NOT EXISTS`、`DROP INDEX`、`REINDEX` 和 cleanup。
- 重复索引名、不存在表、不存在列、非法谓词等负向场景。
- `CONCURRENTLY` 等并发相关场景默认暂缓到 AB 或专门并发 profile。

## 覆盖矩阵

| 编号 | 覆盖点 | 类型 | pg-sql 依据 | 生成策略 |
|---|---|---|---|---|
| IDX-001 | 普通单列索引 | 正向 | `CREATE INDEX` basic example, `column_name` | 使用按 `pg-sql-case-naming` 生成的表名和索引名创建单列索引，查询 `pg_indexes` 或 `pg_get_indexdef` |
| IDX-002 | 显式索引名和自动索引名 | 正向 | `name` 可选 | 一个用例显式命名；自动命名只在输出稳定可控时覆盖，验证时避免依赖自动名称 |
| IDX-003 | 多列索引 | 正向 | syntax 中 `[, ...]` | 创建 `(c1, c2)` 索引，验证定义 |
| IDX-004 | 唯一索引 | 正向/反向 | `UNIQUE` | 插入唯一数据通过；重复数据作为负向块，预期外部框架采集错误 |
| IDX-005 | 表达式索引 | 正向 | syntax 中 `( expression )` | 例如 `CREATE INDEX ... ON tab ((lower(c_text)))`，用 catalog 验证定义 |
| IDX-006 | 部分索引 | 正向 | `WHERE predicate` | 使用 `WHERE active IS TRUE` 或数值范围谓词，验证 `pg_get_indexdef` |
| IDX-007 | 覆盖索引 INCLUDE | 正向 | `INCLUDE`，PG 特有 | `CREATE INDEX ... ON tab(c1) INCLUDE (c2)`，验证 include 列定义 |
| IDX-008 | `IF NOT EXISTS` | 正向/边界 | `IF NOT EXISTS`，PG 特有 | 重复执行同名 `CREATE INDEX IF NOT EXISTS`，不依赖 NOTICE 文本 |
| IDX-009 | `ONLY table_name` | 正向 | syntax 中 `ON [ ONLY ] table_name` | 在可稳定表达时覆盖 `ONLY`；如涉及继承表，单独建父子表 |
| IDX-010 | 排序方向 `ASC` / `DESC` | 正向 | syntax 中 `[ ASC | DESC ]` | 分别创建排序索引，验证定义 |
| IDX-011 | `NULLS FIRST` / `NULLS LAST` | 正向 | syntax 中 `NULLS { FIRST | LAST }` | 在排序索引中覆盖 NULLS 位置，验证定义 |
| IDX-012 | `NULLS DISTINCT` / `NULLS NOT DISTINCT` | 正向/边界 | syntax 中 `[ NULLS [ NOT ] DISTINCT ]` | 与 `UNIQUE` 结合，验证 NULL 唯一性语义；优先生成简单可读数据 |
| IDX-013 | `COLLATE` | 正向/边界 | syntax 中 `COLLATE collation` | 仅使用环境稳定存在的 collation；不确定时列为需确认 |
| IDX-014 | opclass | 正向/边界 | syntax 中 `opclass` | 使用常见且稳定的 opclass；没有 pg-sql 或环境来源时不强行覆盖 |
| IDX-015 | opclass parameter | 边界 | syntax 中 `opclass_parameter = value` | 仅在能确认方法和 opclass 参数时生成，否则列为暂缓 |
| IDX-016 | storage parameter `WITH (...)` | 正向/边界 | syntax 中 `WITH ( storage_parameter )` | 覆盖常见参数时必须确认 PG 支持；不确定则暂缓 |
| IDX-017 | `TABLESPACE` | 边界/暂缓 | syntax 中 `TABLESPACE tablespace_name` | 默认不生成真实 tablespace 依赖；只有项目提供稳定 tablespace 时覆盖 |
| IDX-018 | `CONCURRENTLY` | 并发/暂缓 | `CONCURRENTLY`，PG 特有，notes warning | 默认不放入普通单会话 regression；需要时拆到 AB 或专门并发 profile |
| IDX-019 | `USING btree` | 正向 | `USING method` | 默认方法，也可显式写 `USING btree` |
| IDX-020 | `USING hash` | 正向 | `USING method` | 使用等值查询适配数据，但验证以 catalog 定义为主 |
| IDX-021 | `USING gin` | 正向/边界 | `USING method` | 需要数组、jsonb 或 tsvector 等适配数据；若数据类型 pack 未配合，先列计划 |
| IDX-022 | `USING gist` | 正向/边界 | `USING method` | 需要合适类型或扩展支持；默认不依赖扩展 |
| IDX-023 | `USING spgist` | 正向/边界 | `USING method` | 需要合适类型；环境不稳定时暂缓 |
| IDX-024 | `USING brin` | 正向 | `USING method` | 适合顺序数据；验证 catalog 定义，不做性能断言 |
| IDX-025 | `DROP INDEX` 基础删除 | 清理/正向 | `DROP INDEX` syntax | 对每个非 cleanup 验证场景，可在末尾删除索引 |
| IDX-026 | `DROP INDEX IF EXISTS` | 正向/边界 | `IF EXISTS`，PG 特有 | 重复删除不存在索引，不依赖 NOTICE 文本 |
| IDX-027 | `DROP INDEX CONCURRENTLY` | 并发/暂缓 | `CONCURRENTLY`，PG 特有 | 默认不放入普通单文件；需要时拆到并发 profile |
| IDX-028 | `DROP INDEX CASCADE/RESTRICT` | 边界/反向 | `CASCADE`, `RESTRICT` | 只有存在依赖对象时覆盖；简单场景优先 `RESTRICT` 默认行为 |
| IDX-029 | `REINDEX INDEX` | 正向 | `REINDEX INDEX` | 对已创建索引执行 `REINDEX INDEX idx...` |
| IDX-030 | `REINDEX TABLE` | 正向 | `REINDEX TABLE` | 对用例表执行 `REINDEX TABLE tab...` |
| IDX-031 | `REINDEX ... CONCURRENTLY` | 并发/暂缓 | `CONCURRENTLY`，PG 特有 | 默认不放入普通单会话 regression |
| IDX-032 | `EXPLAIN` 辅助验证 | 验证/可选 | `EXPLAIN` warnings | 默认不验证 planner cost；如使用，需关闭不稳定输出或只做人工辅助 |
| IDX-033 | 重复索引名 | 反向 | `CREATE INDEX name` + `IF NOT EXISTS` | 不带 `IF NOT EXISTS` 重复创建同名索引，作为负向用例 |
| IDX-034 | 不存在表上建索引 | 反向 | `table_name` required | 对不存在表执行 `CREATE INDEX`，负向用例 |
| IDX-035 | 不存在列上建索引 | 反向 | `column_name` required | 对不存在列执行 `CREATE INDEX`，负向用例 |
| IDX-036 | 唯一索引重复值 | 反向 | `UNIQUE` | 先插入重复值再创建唯一索引，或创建后插入重复值 |
| IDX-037 | partial index 谓词非法 | 反向 | `WHERE predicate` | 谓词引用不存在列或类型不兼容，保持错误条件单一 |
| IDX-038 | cleanup 完整性 | 清理 | `DROP INDEX`, `DROP TABLE` | 文件末尾清理本文件创建的索引和表；不清理公共对象 |

## 推荐用例拆分

默认不要把所有覆盖点塞进一个超大 SQL 文件。推荐拆分：

| 文件建议 | 覆盖点 |
|---|---|
| `docs/case-designs/.../index-basic-btree.md` | IDX-001、IDX-003、IDX-019、IDX-025、IDX-038 |
| `docs/case-designs/.../index-unique-nulls.md` | IDX-004、IDX-012、IDX-036 |
| `docs/case-designs/.../index-expression-partial.md` | IDX-005、IDX-006 |
| `docs/case-designs/.../index-include-sorting.md` | IDX-007、IDX-010、IDX-011 |
| `docs/case-designs/.../index-if-exists-drop.md` | IDX-008、IDX-026、IDX-033 |
| `docs/case-designs/.../index-reindex.md` | IDX-029、IDX-030 |
| `docs/case-designs/.../index-methods.md` | IDX-020、IDX-024；GIN/GiST/SP-GiST 视环境拆分 |

## 用例生成规则

- 计划阶段只建议 case design 文件；最终 SQL 文件名由 output profile 和 `pg-sql-case-naming` 决定。
- 表名和索引名从 `pg-sql-case-naming` 的对象名规则推导；表名前缀使用 `tab_`。
- 索引名使用 `idx_<chapter-short>_<case-short>_<hash6>` 形态。
- 约束名如需要，使用 `cons_<chapter-short>_<case-short>_<hash6>` 形态。
- 每个 SQL 文件应自包含 setup 和 cleanup。
- 验证索引定义时，优先查询 `pg_indexes`、`pg_class`、`pg_index` 或 `pg_get_indexdef`。
- 所有 catalog 查询必须有确定性过滤条件和 `ORDER BY`。
- 除非用户明确要求 planner 覆盖，否则不要断言 `EXPLAIN` cost、行数估算或具体 plan 文本。
- 负向用例应一次只验证一个错误条件，并在 SQL 前用注释说明。
- 不要为了覆盖更多语法而引入不稳定环境依赖。

## 验证查询建议

优先使用稳定 catalog 查询：

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = '<table_name>'
ORDER BY indexname;
```

或：

```sql
SELECT c.relname, pg_get_indexdef(c.oid) AS indexdef
FROM pg_class c
JOIN pg_index i ON i.indexrelid = c.oid
JOIN pg_class t ON t.oid = i.indrelid
WHERE t.relname = '<table_name>'
ORDER BY c.relname;
```

避免默认使用 `EXPLAIN` 作为自动断言来源；如必须使用，优先使用稳定选项并避免 cost 敏感内容。

## 不覆盖范围

- 深度 planner 行为覆盖。
- 性能基准测试。
- 多会话并发建索引行为。
- 依赖非默认 extension 的索引能力，除非用户明确要求并提供环境约束。
- 依赖不稳定 tablespace、collation 或 opclass 参数的场景。
- `CONCURRENTLY` 相关场景默认暂缓到 AB 或专门并发 profile。

## 覆盖计划要求

当用户说“覆盖索引”“生成索引用例”“尽可能全量覆盖索引”时，先按 [references/coverage-plan-template.md](../references/coverage-plan-template.md) 输出计划。

计划中必须列出：

- 采用本 coverage pack。
- 采用 `pg-regression` 还是 AB/并发 profile。
- `CREATE INDEX`、`DROP INDEX`、`REINDEX`、`EXPLAIN` 对应 YAML。
- 将生成哪些 case design 文件。
- 每个文件覆盖哪些 IDX 编号。
- 哪些点因为环境或并发原因暂不覆盖。
