# Coverage Pack 规范

coverage pack 位于 `coverage-packs/*.md`。

每个 pack 描述一个 PostgreSQL 主题如何展开为可复用的测试覆盖。pack 只放主题相关的覆盖规则；共享的文件格式和输出规则放到 `output-profiles/`。

## 必需章节

```markdown
# <主题名称> Coverage Pack

## Pack ID
<stable-id>

## 触发短语
- <phrase>

## 需要查询 pg-sql
- <command-or-concept>

## 能力要求
- single-session
- sql-only

## 覆盖维度
- <dimension>

## 用例生成规则
- <topic-specific rule>

## 不覆盖范围
- <out-of-scope item>
```

## 能力标签

使用以下能力标签：

- `single-session`：可在普通单会话 SQL regression 文件中运行。
- `multi-session`：需要多个并发会话。
- `sql-only`：只生成 SQL 文件，expected 由外部框架采集和比对。
- `error-output`：包含预期错误输出。
- `isolation-schedule`：更适合 isolation schedule，而不是普通 SQL regression。

## Pack 选择规则

选择触发短语和主题描述最匹配用户请求的 pack。

如果 pack 需要 `isolation-schedule`，不要强行生成普通 regression SQL。除非项目明确要求 A/B SQL 文件，否则应使用 isolation 输出格式，或说明当前还没有对应 profile。

## Pack 质量规则

- pack 要保持紧凑、聚焦。
- 优先写覆盖维度，不要写成长篇散文。
- PostgreSQL 语法事实放在 `pg-sql`，不要放在 pack。
- 输出格式规则放在 output profile，别放在 pack。
- 明确写出不覆盖范围，避免宽泛请求被误解成无限承诺。
