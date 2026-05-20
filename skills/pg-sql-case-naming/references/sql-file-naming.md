# SQL 用例文件命名规范

## 目标

SQL 用例文件需要让评审者只看路径和文件名，就能知道它覆盖哪个官方章节、哪个目录主题、哪个主要测试点。

## 标准目录结构

默认 SQL 根目录为仓库根目录下的 `sql/`。如果用户指定其他根目录，保持根目录以下结构不变。

优先从 `docs/case-designs/` 的相对路径推导 SQL 输出路径；`docs/test-points/` 只作为概览层来源，不应直接生成 SQL。

```text
sql/
  chapter-13-concurrency-control/
    <official-section-dir>/
      <chapter-id>_<section-topic>_<test-point-slug>.sql
  chapter-74-transaction-processing/
    <official-section-dir>/
      <chapter-id>_<section-topic>_<test-point-slug>.sql
```

更深层目录应保留官方章节层级：

```text
sql/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/
  13.2.1_read-committed_rc-update-wait-recheck-where-match.sql
```

扩展测试点也要放在对应章节扩展目录下：

```text
sql/chapter-13-concurrency-control/13.8-lock-knowledge-extensions/13.8.1-locking-read-options/
  13.8.1_locking-read-options_lock-read-nowait-conflict-error.sql
```

Transaction Processing 章节示例：

```text
sql/chapter-74-transaction-processing/74.1-transactions-and-identifiers/
  74.1_transactions-and-identifiers_txid-xid-wraparound-epoch-increment.sql
```

## 文件名格式

普通单会话用例：

```text
<chapter-id>_<section-topic>_<test-point-slug>.sql
```

并发或事务多会话用例：

```text
<chapter-id>_<section-topic>_<test-point-slug>_001A.sql
<chapter-id>_<section-topic>_<test-point-slug>_001B.sql
```

确实无法用两个会话覆盖时，才增加：

```text
<chapter-id>_<section-topic>_<test-point-slug>_001C.sql
```

其中 `001` 是同一测试点下的 AB 用例序号。一个测试点只有一组 AB 用例时使用 `_001A/_001B`；同一测试点需要多组独立 AB 用例时递增为 `_002A/_002B`。

辅助文件只在确实需要独立 setup/cleanup 时使用：

```text
<chapter-id>_<section-topic>_<test-point-slug>_setup.sql
<chapter-id>_<section-topic>_<test-point-slug>_cleanup.sql
```

优先把轻量 setup/cleanup 写入主 SQL 文件，避免辅助文件泛滥。

## 字段来源

- `<chapter-id>`：取最具体的官方章节编号，例如 `13.2.1`、`13.3`、`74.1`。
- `<section-topic>`：取当前章节目录去掉编号后的英文 slug，例如 `read-committed`、`explicit-locking`、`transactions-and-identifiers`。
- `<test-point-slug>`：优先取 md 文件名去掉 `.md` 后的 slug；如果来源是汇总计划中的测试点 ID，则取测试点 ID 的小写短横线形式。

## slug 规范

- 使用小写 ASCII。
- 空格、下划线、斜杠统一转为短横线 `-`。
- 连续短横线压缩为一个短横线。
- 去掉首尾短横线。
- 保留 PostgreSQL 关键词、隔离级别、锁模式、边界值等关键信息。
- 避免无意义词，例如 `test`、`case`、`scenario`，除非它们是原始 ID 的必要部分。
- 文件名过长时，优先删减描述性形容词，不删章节号、section topic、核心对象和边界值。

## 长名称缩写规则

PostgreSQL 标识符默认最多 63 字节。生成 SQL 内容时，不要把完整文件名或完整测试点 slug 直接用作表名、索引名、约束名、序列名、视图名等数据库对象名。

文件名和数据库对象名采用不同策略：

- SQL 文件名优先可读，允许较长，但单个文件名建议控制在 180 个字符以内。
- 数据库对象名优先可执行、稳定、低碰撞，默认尽量贴近用例 slug，必须小于 PostgreSQL 63 字节标识符限制。
- 只有对象名接近或超过 63 字节、与同一 SQL 文件内对象重名、或同一测试点有多组对象时，才缩写到建议的 48 字符以内。
- 数据库对象名使用下划线 `_` 分隔，不使用双下划线结构。

数据库对象名格式：

```text
<obj-prefix>_<chapter-short>_<case-short>
```

默认不要追加无语义哈希后缀，优先保证对象名与用例名称相近、可读。

只有在以下情况才追加 `<hash6>`：

- 对象名与同一目录或同一 SQL 文件中的其他对象重名。
- 对象名超过 PostgreSQL 63 字节限制，需要进一步压缩但仍要保持跨用例唯一。
- 同一测试点拆出多组对象，短序号仍不足以区分。

带哈希时格式为：

```text
<obj-prefix>_<chapter-short>_<case-short>_<hash6>
```

常用对象前缀使用 3 到 4 个字符，优先选择能直接看出对象类型的缩写；不要使用 `i_`、`v_`、`s_`、`fn_` 这类过短且含义不直观的前缀。

```text
tab  table
idx  index
view view
seq  sequence
cons constraint
trig trigger
func function
proc procedure
type type
sch  schema
matv materialized view
```

字段含义：

- `<chapter-short>`：章节号去点号，例如 `13.2.1` 转为 `1321`，`74.1` 转为 `741`。
- `<case-short>`：优先使用完整测试点 slug 的下划线形式；只有超长或冲突时，才从测试点 slug 中抽取关键信息词进行缩写。
- `<hash6>`：基于完整测试点 slug 或完整 case_id 生成的 6 位稳定短哈希，仅用于避免缩写后重名；它没有业务含义，能不用就不用。

对象名生成优先级：

1. 先尝试 `<obj-prefix>_<chapter-short>_<完整测试点 slug 下划线形式>`。
2. 如果超过 PostgreSQL 63 字节限制，保留隔离级别、锁模式、事务 ID、边界值等核心词，例如 `read_committed`、`repeatable_read`、`serializable`、`nowait`、`skip_locked`、`xid`、`freeze`。
3. 保留动作和预期，例如 `wait`、`abort`、`retry`、`block`、`visible`、`conflict`。
4. 删除泛化词，例如 `test`、`case`、`scenario`、`behavior`、`verify`。
5. 如果仍然过长，只保留最关键的 2 到 3 个词，并依赖 `<hash6>` 区分。

常用缩写词：

```text
read-committed       rc
repeatable-read      rr
serializable         ser
transaction          tx
transactions         tx
identifier           ident
identifiers          ident
concurrency          conc
control              ctrl
explicit             expl
locking              lock
deadlock             dl
serialization        ser
snapshot             snap
visibility           vis
wraparound           wrap
vacuum               vac
freeze               freeze
foreign-key          fk
primary-key          pk
unique               uniq
exclusive            excl
share                sh
update               upd
delete               del
insert               ins
conflict             conflict
timeout              timeout
```

示例：

```text
case_id: RC-UPDATE-WAIT-RECHECK-WHERE-MATCH
table:   tab_1321_rc_update_wait_recheck_where_match
index:   idx_1321_rc_update_wait_recheck_where_match
```

如果完整名称不超长，应优先保留完整语义：

```text
case_id: RC-UPDATE-WAIT-RECHECK-WHERE-MATCH
table:   tab_1321_rc_update_wait_recheck_where_match
```

```text
case_id: TXID-XID-WRAPAROUND-EPOCH-INCREMENT
table:   tab_741_xid_wrap_epoch
```

如果一个用例里需要多个同类对象，在末尾追加短序号，但仍要保持 63 字节以内：

```text
tab_1321_rc_update_wait_recheck_where_match_1
tab_1321_rc_update_wait_recheck_where_match_2
```

SQL 文件头中可以记录完整 case_id，因此对象名不需要承担完整语义。

## SQL 文件头

每个 SQL 文件开头建议包含：

```sql
-- source_md: docs/archive/concurrency-control-by-official-chapter/13.2-transaction-isolation/13.2.1-read-committed/rc-update-wait-recheck-where-match.md
-- case_id: RC-UPDATE-WAIT-RECHECK-WHERE-MATCH
-- official_chapter: 13.2.1 Read Committed Isolation Level
-- naming: pg-sql-case-naming/v1
```

多会话文件应额外标明：

```sql
-- session_file: _001A
-- logical_session: s1
-- peer_sessions: _001B
```

## 与 pg-casegen 对接

1. 先用本规范确定目标路径。
2. 再让 `pg-casegen` 根据 md 测试点生成 SQL 内容。
3. 如果是多会话并发用例，使用 `pg-casegen` 的 AB 多会话规则，输出文件名使用 `_001A.sql`、`_001B.sql`。
4. 如果 `pg-casegen` 默认生成 `<test_point_slug>_<case_no>.sql`，需要重命名为本规范格式。
5. 不修改 `pg-casegen` 的 SQL 断言、同步点和清理策略，除非用户明确要求调整用例内容。

## 示例映射

源文件：

```text
docs/archive/concurrency-control-by-official-chapter/13.2-transaction-isolation/13.2.1-read-committed/rc-update-wait-recheck-where-match.md
```

目标文件：

```text
sql/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/13.2.1_read-committed_rc-update-wait-recheck-where-match_001A.sql
sql/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/13.2.1_read-committed_rc-update-wait-recheck-where-match_001B.sql
```

源测试点：

```text
TXID-XID-WRAPAROUND-EPOCH-INCREMENT
```

目标文件：

```text
sql/chapter-74-transaction-processing/74.1-transactions-and-identifiers/74.1_transactions-and-identifiers_txid-xid-wraparound-epoch-increment.sql
```
