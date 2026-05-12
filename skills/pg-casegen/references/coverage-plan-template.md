# 覆盖计划输出模板

## 目标

当用户输入比较模糊、范围较大，或要求“全量覆盖”时，`pg-casegen` 应先输出一份覆盖计划，让用户审阅后再生成 SQL 文件。

覆盖计划不是最终用例文件，而是生成前的设计说明。它必须足够具体，让用户能判断覆盖范围、文件形态和暂缓项是否符合预期。

## 什么时候输出覆盖计划

以下情况必须先输出覆盖计划：

- 用户只给出宽泛主题，例如“覆盖索引”“生成数据类型用例”。
- 用户要求“全量覆盖”“尽可能覆盖”“系统覆盖”。
- coverage pack 包含多个覆盖维度。
- 需要选择 output profile，例如普通 regression 和 AB regression 二选一。
- 需要 `pg-sql` 查询多个命令或概念。
- 存在暂不覆盖项、缺失语法来源或多候选 YAML。

以下情况可以直接生成 SQL：

- 用户已经明确指定 case 名、输出格式、覆盖点和对象结构。
- 用户明确说“不需要计划，直接生成”。
- 本次只是按用户提供的精确规范改写一个很小的单文件用例。

## 输出格式

覆盖计划使用下面的结构。

```markdown
## 覆盖计划：<主题名称>

**用户需求理解**
- 原始需求：<用户原话或摘要>
- 规范化主题：<coverage-pack-id>
- 生成模式：plan | generate
- 覆盖范围：minimal | standard | full

**模块选择**
- coverage pack：`coverage-packs/<name>.md`
- output profile：`output-profiles/<name>.md`
- 是否需要多会话：是/否

**pg-sql 查询计划**
| 查询项 | 目标 YAML | 使用字段 | 用途 |
|---|---|---|---|
| <query> | <path> | syntax, parameters | 生成语法骨架 |

**计划生成文件**
| 文件 | 说明 |
|---|---|
| `<file>.sql` | <用途> |

**对象命名**
| 对象类型 | 名称规则或示例 |
|---|---|
| 表 | `tab_<case_id>` |
| 索引 | `idx_<case_id>_<suffix>` |

**覆盖维度**
| 编号 | 覆盖点 | 类型 | 依据 | 计划用例 |
|---|---|---|---|---|
| 1 | <dimension> | 正向/反向/边界/并发 | pg-sql/pack/profile | <case sketch> |

**暂不覆盖或需确认**
- <item>：<原因>

**生成策略**
- SQL 风格：<普通 regression / AB regression>
- setup/cleanup：<策略>
- expected：不生成，由外部框架采集和比对
- 稳定性处理：<ORDER BY/catalog/避免非确定输出等>

**待用户确认**
- 是否按此计划生成？
- 如需调整，请指出要增加、删除或拆分的覆盖点。
```

## 字段说明

### 用户需求理解

写清楚如何把用户原始输入转换成 coverage pack。

如果存在假设，必须显式说明。例如：

```text
假设“覆盖索引”指 CREATE INDEX / DROP INDEX / REINDEX 相关语法与行为覆盖，不包含性能基准测试。
```

### 模块选择

必须列出选中的 coverage pack 和 output profile。

如果选择 `pg-ab-regression`，必须说明多会话原因。

### pg-sql 查询计划

每个核心 PostgreSQL 命令或概念都应列出。

目标 YAML 已确定时，写具体路径；尚未查询时，可以先写“待查询”，但生成 SQL 前必须补全。

使用字段示例：

- `syntax`
- `parameters`
- `examples`
- `notes`
- `errors`
- `compatibility`
- `related`

### 计划生成文件

普通单文件 regression 示例：

```text
index_expression_partial_001.sql
```

AB regression 示例：

```text
repeatable_read_update_conflict_001A.sql
repeatable_read_update_conflict_001B.sql
```

文件名必须符合 output profile，并优先表达测试点。bug 号或 feature 号优先放入 header，不作为默认文件名组成部分。

### 对象命名

必须展示关键对象命名规则，尤其是表、索引、约束、函数、schema 和同步点。

对象名必须能从文件名或 case ID 推导。

### 覆盖维度

覆盖维度来自 coverage pack，但可以结合 `pg-sql` 查询结果进一步展开。

类型建议使用：

- 正向
- 反向
- 边界
- 并发
- 清理
- 验证

### 暂不覆盖或需确认

不能隐藏暂不覆盖项。

常见原因：

- `pg-sql` 没有对应语法来源。
- 需要多会话，但当前 output profile 不支持。
- 输出不稳定，不适合 regression。
- 属于性能或 planner 深度行为，超出当前 pack。
- 用户需求不够明确，需要确认。

### 生成策略

说明如何保证生成结果稳定：

- 使用确定性对象名。
- 查询加 `ORDER BY`。
- 使用 catalog 查询代替不稳定客户端输出。
- 避免时间、随机值、PID、OID、执行计划 cost。
- 遵守 output profile 中的 header、调度字段和注释风格。

## 示例：索引覆盖计划

```markdown
## 覆盖计划：索引

**用户需求理解**
- 原始需求：帮我生成索引覆盖的用例
- 规范化主题：index
- 生成模式：plan
- 覆盖范围：standard

**模块选择**
- coverage pack：`coverage-packs/index.md`
- output profile：`output-profiles/pg-regression.md`
- 是否需要多会话：否

**pg-sql 查询计划**
| 查询项 | 目标 YAML | 使用字段 | 用途 |
|---|---|---|---|
| CREATE INDEX | 待查询 | syntax, parameters, examples, notes | 生成索引语法覆盖 |
| DROP INDEX | 待查询 | syntax, examples, notes | 生成 cleanup |
| REINDEX | 待查询 | syntax, parameters | 生成重建索引用例 |
| EXPLAIN | 待查询 | syntax, notes | 仅在需要验证索引使用时参考 |

**计划生成文件**
| 文件 | 说明 |
|---|---|
| `index_001.sql` | 基础索引、唯一索引、多列索引、表达式索引、部分索引覆盖 |

**对象命名**
| 对象类型 | 名称规则或示例 |
|---|---|
| 表 | `tab_index_expression_partial_001` |
| 索引 | `idx_index_expression_partial_001_<feature>` |

**覆盖维度**
| 编号 | 覆盖点 | 类型 | 依据 | 计划用例 |
|---|---|---|---|---|
| 1 | 基础索引创建 | 正向 | coverage pack + pg-sql | 在普通列上创建索引并查询 catalog |
| 2 | 唯一索引 | 正向/反向 | coverage pack + pg-sql | 验证唯一约束效果或重复值错误 |
| 3 | 表达式索引 | 正向 | coverage pack + pg-sql | 使用表达式创建索引并查询定义 |
| 4 | 部分索引 | 正向 | coverage pack + pg-sql | 使用 WHERE 条件创建索引并查询定义 |

**暂不覆盖或需确认**
- 并发建索引：需要多会话或专门 AB profile，本计划暂不覆盖。
- planner 深度行为：输出可能不稳定，本计划只做 catalog 验证。

**生成策略**
- SQL 风格：普通 regression 单文件。
- setup/cleanup：文件内自包含，先 DROP 后 CREATE。
- expected：不生成，由外部框架采集和比对。
- 稳定性处理：catalog 查询加确定性过滤，结果加 ORDER BY。

**待用户确认**
- 是否按此计划生成？
- 是否需要把并发建索引拆成 AB 用例？
```

## 禁止事项

- 不要把覆盖计划写成泛泛说明，必须包含文件名、对象名、覆盖维度和暂缓项。
- 不要在没有 `pg-sql` 事实来源时承诺“全量覆盖”。
- 不要隐藏 output profile 不支持的场景。
- 不要把覆盖计划当作最终 SQL 文件。
