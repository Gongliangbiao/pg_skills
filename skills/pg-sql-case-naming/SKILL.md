---
name: pg-sql-case-naming
description: 用于将 PostgreSQL Markdown 测试用例或测试点转换为 SQL 文件前确定目录和文件名；按官方文档章节编号组织路径，文件名包含章节、目录主题和主要测试点，并与 pg-casegen、pg-sql 对接。
---

# PG SQL Case Naming

当用户要求把 PostgreSQL md 用例、测试点计划、官方章节覆盖点实现为 SQL 文件时，先使用本 skill 决定输出目录和文件名，再使用 `pg-casegen` 生成 SQL 内容。

本 skill 只负责“放在哪里、叫什么名字、如何和多会话文件对应”。SQL 语义、会话调度、断言格式、regression/AB 输出结构仍由 `pg-casegen` 和 `pg-sql` 负责。

## 工作流

1. 读取源 md 文件路径、用例标题、用例编号、官方章节号和所属模块。
2. 如果源文件来自 `docs/case-designs/`，以其相对路径作为 SQL 输出目录的主依据；如果来自历史测试点目录，则先确认是否已有对应 case design。
3. 读取 [references/sql-file-naming.md](references/sql-file-naming.md)，按项目规则推导 SQL 输出路径。
4. 如果是普通单文件 regression 用例，生成一个 `.sql` 文件名。
5. 如果是并发/事务多会话用例，按 AB 框架命名生成 `_001A.sql` 和 `_001B.sql`；确实需要第三会话时才生成 `_001C.sql`。
6. 生成 SQL 内容时调用 `pg-casegen`；需要 PostgreSQL 语法或行为事实时调用 `pg-sql`。
7. 写入前检查同名文件是否已存在。除非用户明确要求覆盖，否则保留已有文件并提示冲突。
8. SQL 内部对象名按引用文档的缩写规则生成，尤其表名不能直接复用过长用例名。
9. SQL 文件头部应记录源 md、官方章节和用例 ID，方便从 SQL 反查测试计划。

## 命名原则

- 目录结构与官方文档章节保持一致。
- 文件名必须同时体现章节号、目录主题和主要测试点。
- slug 使用小写 ASCII、短横线分隔；文件名内部字段使用单下划线 `_` 分隔，不使用双下划线。
- 文件名应稳定、可读、可排序，不依赖生成时间或临时编号。
- 数据库对象名要尽量贴近用例名并短于 PostgreSQL 标识符限制；只有超长或冲突时才缩写。
- 不把多个独立测试场景合并进一个 SQL 文件；一份 SQL 只验证一个主要测试点。

## 与 pg-casegen 的关系

- 本 skill 覆盖 `pg-casegen` 的默认 `<test_point_slug>_<case_no>.sql` 文件命名。
- `pg-casegen` 仍负责选择普通 regression 或 AB 多会话 output profile。
- 当文件名规范和 `pg-casegen` output profile 冲突时，优先遵循本 skill 的路径和文件名，保留 output profile 的 SQL 内容格式。
