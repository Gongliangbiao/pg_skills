# pg-sql 对接规范

## 目标

`pg-casegen` 负责生成测试用例，但不直接维护 PostgreSQL 语法事实。生成 SQL 前，凡是涉及命令语法、参数、限制、错误行为、并发语义或 PostgreSQL 特有行为，都必须通过 `pg-sql` 确认。

本规范定义 `pg-casegen` 如何使用 `pg-sql`。

## 输入来源

优先从选中的 coverage pack 读取 `需要查询 pg-sql` 章节。

例如：

```markdown
## 需要查询 pg-sql

- CREATE INDEX
- DROP INDEX
- REINDEX
- EXPLAIN
```

如果 coverage pack 的查询项不够，`pg-casegen` 可以根据生成计划补充必要查询项。例如索引用例中如果涉及部分索引表达式，可以补充 `CREATE TABLE`、`INSERT` 或 `SELECT`。

## 查询流程

对每个查询项按以下流程处理：

1. 使用 `pg-sql` 的查找脚本解析候选 YAML：

   ```bash
   scripts/lookup_pg_doc.rb "<query>"
   ```

2. 从候选结果中选择最贴近测试意图的 YAML 文件。

3. 读取目标 YAML 文件，不要只依赖 lookup 输出。

4. 提取生成用例所需字段。

5. 将提取结果合并到覆盖计划和 SQL 生成过程。

## 字段读取优先级

读取 YAML 时按用途选择字段。

### 生成语法骨架

优先读取：

- `syntax`
- `parameters`
- `examples`

用途：

- 确认命令主语法。
- 确认可选子句位置。
- 确认参数是否必需。
- 参考官方示例形态。

### 生成覆盖维度

优先读取：

- `parameters`
- `notes`
- `compatibility`
- `related`

用途：

- 找出可覆盖选项。
- 区分 PostgreSQL 特有能力。
- 找出关联命令或概念。
- 判断某些组合是否不适合覆盖。

### 生成负向用例

优先读取：

- `errors`
- `notes`
- `parameters`

用途：

- 确认预期错误是否稳定。
- 选择明确、单一的错误条件。
- 避免生成依赖版本差异的错误文本。

### 生成并发或事务用例

优先读取：

- `notes`
- `examples`
- `related`
- concurrency 目录下的概念文件

用途：

- 确认锁行为。
- 确认隔离级别行为。
- 确认是否需要 AB output profile 或 isolation-style 输出。

## 事实记录格式

生成覆盖计划时，应把 `pg-sql` 查询结果浓缩成事实记录，而不是把 YAML 全量塞进结果。

建议内部记录格式：

```text
lookup: CREATE INDEX
yaml: references/pg_skills/ddl/create/create_index.yaml
used_fields: syntax, parameters, examples, notes
facts:
  - CREATE INDEX 支持 <关键语法点>
  - <选项> 是 PostgreSQL 特有或需特别处理
  - <限制> 会影响用例生成
adaptation:
  - 最终 SQL 基于 documented syntax 适配生成，不是逐字示例
```

当输出给用户时，只需要在计划中摘要说明使用了哪些命令或概念，不必暴露全部事实记录。

## 缺失处理

### lookup 没有结果

如果 `scripts/lookup_pg_doc.rb "<query>"` 没有结果：

1. 尝试换用更基础的命令名或英文关键词。
2. 查看 coverage pack 是否给出了错误的查询项。
3. 如果仍然找不到，不要凭空生成该语法覆盖。
4. 在覆盖计划中标记为“暂不覆盖：pg-sql 未提供语法来源”。
5. 如果该语法点是用户明确要求的核心内容，向用户提出一个简短澄清或请求补充资料。

### 多个候选结果

如果 lookup 返回多个候选：

1. 优先选择命令名完全匹配的 YAML。
2. 其次选择类别与 coverage pack 一致的 YAML。
3. 再考虑相关概念文件，例如锁、MVCC、事务隔离。
4. 如果多个候选同样合理，在覆盖计划中列出选择，并说明采用原因。

### YAML 缺少字段

如果目标 YAML 缺少某个字段：

- 缺少 `examples`：可以基于 `syntax` 和 `parameters` 适配生成 SQL，但应避免复杂组合。
- 缺少 `errors`：不要主动生成依赖精确错误输出的负向用例。
- 缺少 `notes`：避免推断限制，除非 PostgreSQL 基础行为非常确定且 output profile 可稳定验证。
- 缺少 `compatibility`：不要声称某能力是 PostgreSQL 特有，除非其他字段明确说明。

## 生成 SQL 的使用规则

- 如果 YAML 提供了接近目标的示例，优先改写该示例。
- 如果最终 SQL 是基于 `syntax` 和 `parameters` 组合生成，应视为“适配生成”。
- 对适配生成的 SQL，保持组合简单、可读、稳定。
- 不要为了覆盖更多语法而制造难以稳定验证的 SQL。
- 不要生成 `pg-sql` 无法支持或无法确认的核心语法点。

## 输出计划中的说明

在正式生成 SQL 前的覆盖计划中，建议包含：

```text
pg-sql 查询：
- CREATE INDEX -> ddl/create/create_index.yaml
- DROP INDEX -> ddl/drop/drop_index.yaml
- EXPLAIN -> utility/explain.yaml

依据字段：
- syntax
- parameters
- examples
- notes

缺失或暂缓：
- 并发建索引行为暂不覆盖，需 AB 或专门并发 profile。
```

## 与 output profile 的关系

`pg-sql` 只决定“PostgreSQL 能怎么写、行为是什么”。  
output profile 决定“项目要求怎么写用例文件”。

当二者冲突时：

- PostgreSQL 语法正确性优先。
- 文件命名、header、注释、调度字段等遵守 output profile。
- 如果 output profile 中的旧示例含有非 PostgreSQL 语法，必须按本规范转换。

## 禁止事项

- 禁止跳过 `pg-sql` 直接凭记忆生成核心命令语法。
- 禁止把 lookup 输出当作最终事实来源，必须读取目标 YAML。
- 禁止在 `pg-sql` 无依据时声称“全量覆盖”。
- 禁止把 MySQL 语法直接带入 PostgreSQL 用例，除非是在转换规则中作为反例说明。
