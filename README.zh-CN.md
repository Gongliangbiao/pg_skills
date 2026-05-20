# pg_skills

[English README](README.md)

`pg_skills` 是一组用于 PostgreSQL 回归 SQL 测试用例设计和生成的 Codex skills。它面向从官方文档、本地知识库和可审阅覆盖产物出发，逐步形成测试因子、测试点、用例设计，最终生成 SQL 用例文件的工作流。

当前流程把覆盖抽取、用例设计、SQL 生成、SQL 命名和 PostgreSQL 语法查询拆成多个单一职责的 skill，方便逐步审查，也方便后续维护和扩展。

## Skills

| Skill | 职责 | 主要输出 |
| --- | --- | --- |
| `pg-doc-extract` | 从官方文档或本地知识中抽取章节结构、测试因子、因子取值、优先级、组合策略、无测试点说明和测试点概览。 | `docs/test-factors/`、`docs/test-points/`、可选 XMind 汇报 |
| `pg-case-design` | 将测试点概览细化为可供 SQL 生成使用的用例设计文档。 | `docs/case-designs/` |
| `pg-casegen` | 根据 ready case design 生成 PostgreSQL regression SQL 文件。 | `sql/` |
| `pg-sql-case-naming` | 在 SQL 生成前确定输出目录、文件命名和对象名缩写规则。 | 供 `pg-casegen` 消费的命名约束 |
| `pg-sql` | 查询内置 PostgreSQL 16 SQL 知识库，确认语法、选项、示例、限制和并发语义。 | 结构化 SQL 事实和示例 |

## 工作流

```text
官方文档 / 本地知识
  -> pg-doc-extract
  -> docs/test-factors/
  -> docs/test-points/
  -> 可选 XMind 汇报
  -> pg-case-design
  -> docs/case-designs/
  -> pg-casegen
  -> sql/
```

### 覆盖建模层

`pg-doc-extract` 负责覆盖建模：

- `docs/test-factors/` 记录章节结构、测试因子、因子取值、优先级、边界值、来源标注和组合策略。
- `docs/test-points/` 记录由测试因子组合派生出的测试点。每个测试点都应能追溯到一个或多个因子取值和对应组合策略。
- 额外补充的本地知识场景必须标注为本地知识，不能伪装成官方文档来源。
- 对没有可执行测试点的章节，也应创建无测试点说明，方便审查者确认该章节已被纳入覆盖分析。

### 用例设计层

`pg-case-design` 消费 `docs/test-points/`，并在 `docs/case-designs/` 下生成详细用例设计。

用例设计应包含足够的信息，让 SQL 生成阶段不需要只靠测试点名称猜测执行逻辑：

- 测试目标和来源测试点
- 会话模型，优先使用两个会话，确实需要时才使用三个会话
- 前置对象、测试数据和对象约束
- 执行逻辑概要
- 事务前后的最终状态确认
- 预期结果
- SQL 生成约束

这个 skill 不直接生成 SQL。

### SQL 生成层

`pg-casegen` 消费 ready case design，并在 `sql/` 下生成 SQL 文件。

SQL 生成规则包括：

- 普通用例生成一个 SQL 文件。
- AB 多会话用例生成成对文件，文件名以 `_001A.sql` 和 `_001B.sql` 结尾。
- 数据库对象使用可读前缀，例如 `tab`、`idx`、`func`、`seq`、`view`、`trg`。
- 对象名应尽量贴近用例名，只有在 PostgreSQL 标识符长度限制下才进行缩写。
- 在事务边界前后，必要时增加最终状态 `SELECT` 校验。
- 生成 SQL 时不要求保留冗余的清理测试对象步骤。

## 可选 XMind 汇报

XMind 是可选汇报产物，只在用户明确要求汇报材料时生成，不是主流程必选步骤。

生成脚本位于：

```text
skills/pg-doc-extract/scripts/generate_xmind_report.js
```

示例：

```bash
node skills/pg-doc-extract/scripts/generate_xmind_report.js --root . --section 13.2-transaction-isolation
```

典型输出位置：

```text
docs/reports/xmind-by-section/
```

XMind 主分支应保持简洁，重点展示因子 key、取值列表、优先级、组合策略和映射测试点。较长的依据、边界说明和细节解释应保留在 Markdown 或备注中。

## 仓库结构

```text
pg_skills/
├── README.md
├── README.zh-CN.md
└── skills/
    ├── pg-doc-extract/
    ├── pg-case-design/
    ├── pg-casegen/
    ├── pg-sql-case-naming/
    └── pg-sql/
```

每个 skill 目录都包含 `SKILL.md`，并可按需包含 `agents/`、`references/`、`scripts/`、`coverage-packs/` 或 `output-profiles/`。

## 安装

克隆仓库，并将需要的 skills 复制到 Codex skills 目录：

```bash
git clone https://github.com/Gongliangbiao/pg_skills.git
cd pg_skills
mkdir -p ~/.codex/skills
cp -R skills/pg-doc-extract ~/.codex/skills/
cp -R skills/pg-case-design ~/.codex/skills/
cp -R skills/pg-casegen ~/.codex/skills/
cp -R skills/pg-sql-case-naming ~/.codex/skills/
cp -R skills/pg-sql ~/.codex/skills/
```

安装完成后重启 Codex，使新增或更新的 skills 生效。

## 使用示例

从 PostgreSQL 文档章节抽取测试因子和测试点：

```text
使用 pg-doc-extract 抽取 PostgreSQL concurrency control 第 13 章的测试因子和测试点。
```

将测试点转为用例设计：

```text
使用 pg-case-design 将 docs/test-points/chapter-13-concurrency-control 细化为 docs/case-designs。
```

根据 ready case design 生成 SQL：

```text
使用 pg-casegen 为 docs/case-designs/chapter-13-concurrency-control/13.2-transaction-isolation 生成 SQL。
```

查询 PostgreSQL SQL 语法事实：

```text
使用 pg-sql 确认 CREATE INDEX 语法和关键选项。
```

## 发布前校验

发布前建议检查：

- 每个 skill 都有合法的 `SKILL.md` frontmatter，并包含 `name` 和 `description`
- 脚本语法检查通过
- 发布文件中不包含本机绝对路径
- README 示例使用仓库相对路径
- 不包含 `.DS_Store` 或临时文件

