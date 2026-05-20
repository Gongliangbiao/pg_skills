# PG SQL Response Style

Use the local YAML file as the source of truth. Do not guess syntax when the knowledge base already covers the topic.

## Command Template

Use this for command syntax, options, and usage questions.

````markdown
## [Command Name]
分类: [Category]

**语法**
```sql
[Primary syntax or the most relevant variant]
```

**关键参数**
| 参数 | 必需 | 说明 |
|------|------|------|
| [name] | [true/false] | [description] |

**示例**
```sql
[Most relevant example]
```

**PostgreSQL 特有**
[Only if the YAML marks the command or relevant option as PG-specific]

**注意事项**
[Best practices, restrictions, or warnings most relevant to the question]
````

## Concept Template

Use this for concurrency topics such as MVCC, row locks, deadlocks, advisory locks, and transaction isolation.

````markdown
## [Concept Name]
分类: [Category]

**核心说明**
[Brief explanation from the YAML]

**关键机制**
- [Concept or behavior 1]
- [Concept or behavior 2]
- [Concept or behavior 3]

**典型行为**
- 读取: [read behavior]
- 写入: [write behavior]
- 清理/恢复: [cleanup or recovery behavior if present]

**注意事项**
- [Important notes]

**相关主题**
- [Related topic]
````

## Build Request Template

Use this when the user wants you to create SQL, not just explain it. Examples:

- "创建一个分区表"
- "给我一条 UPSERT"
- "写一个 GRANT 例子"
- "生成 SELECT FOR UPDATE 示例"

Default shape:

````markdown
## [Underlying command or concept]
分类: [Category]

**适用语法**
```sql
[Most relevant syntax excerpt]
```

**示例 SQL**
```sql
[Runnable SQL tailored to the user's request]
```

**PostgreSQL 特有**
[If applicable]

**注意事项**
- [Most relevant warning or restriction]
- [Most relevant best practice]
````

Preferred additions for build requests:

- **验证示例**
```sql
[Small INSERT/SELECT/check statement when it helps confirm behavior]
```

- **常见错误**
- [Most relevant command error from `errors`]
- [One behavior-specific pitfall if needed]

## Selection Rules

- If the user asks "语法", "参数", "用法", or "区别", use the command or concept template.
- If the user asks "创建", "生成", "写一个", "给我 SQL", use the build request template.
- When the YAML includes both `primary` syntax and a close example, show both.
- Keep the answer dense but not bloated: include the sections the YAML supports, skip empty ones.

## Partition Table Example Pattern

For partition table requests based on `CREATE TABLE`:

1. Show the `PARTITION BY` syntax excerpt.
2. Give the parent table SQL.
3. Give one or more `PARTITION OF ... FOR VALUES ...` child partitions.
4. Note that `PARTITION BY` is PostgreSQL-specific in this knowledge base.
5. Warn that inserted rows must match an existing partition bound.
6. Prefer adding one or two `INSERT` statements to verify routing.
7. If the user explicitly asks for a default partition, you may provide it as an adaptation of PostgreSQL partition syntax, but label it clearly as an adapted extension beyond the exact local example.

Suggested dense answer shape:

````markdown
## CREATE TABLE
分类: DDL

**适用语法**
```sql
[Syntax excerpt with PARTITION BY]
```

**示例 SQL**
```sql
[Parent table and child partitions]
```

**验证示例**
```sql
[One or two INSERT statements or a small SELECT]
```

**PostgreSQL 特有**
`PARTITION BY`

**注意事项**
- [Rows must match an existing partition bound]
- [Best practice or restriction]

**常见错误**
- `relation already exists`: [use IF NOT EXISTS or check first]
- [If relevant] 插入值未命中任何分区范围
````
