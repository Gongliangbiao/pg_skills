# pg_skills

`pg_skills` 是一组面向 PostgreSQL 回归测试用例生成的 AI skills。当前项目采用“双 skill 架构”：

- `pg-sql`：PostgreSQL 语法知识工具 skill。
- `pg-casegen`：PostgreSQL 测试用例生成主控 skill。

项目目标是：用户用自然语言提出覆盖需求，例如“覆盖索引”“生成 RR 隔离级别用例”，主控 skill 先把模糊需求展开成可审阅的覆盖计划，再结合 PostgreSQL 语法知识和项目输出规范生成稳定、可执行、见名知意的 SQL 用例文件。

> 当前版本只生成 SQL 文件，不生成 expected。expected 输出由外部测试框架采集和比对。

## 架构

```text
pg-sql
  └── PostgreSQL 语法、参数、示例、注意事项和并发知识

pg-casegen
  ├── 主控编排：理解需求、选择覆盖包、选择输出格式、生成计划和 SQL
  ├── coverage-packs：可插拔覆盖主题
  ├── output-profiles：可插拔输出格式
  └── references：工作流、规范、对接契约和校验规则
```

### pg-sql

`pg-sql` 是语法知识层，内置 PostgreSQL 16.4 YAML 知识库，覆盖：

- DDL / DML / DCL / TCL / Utility 命令
- MVCC、锁、死锁、事务隔离等并发主题
- 命令语法、关键参数、示例、注意事项、兼容性信息

语法知识主要整理自 PostgreSQL 16 官方文档的 [SQL Commands](https://www.postgresql.org/docs/16/sql-commands.html) 章节。

`pg-casegen` 生成 SQL 前，凡是涉及 PostgreSQL 命令语法、选项、限制、错误行为或并发语义，都应通过 `pg-sql` 确认。

### pg-casegen

`pg-casegen` 是主控生成层，负责：

- 识别和增强用户的模糊需求
- 选择合适的 coverage pack
- 选择普通 regression 或 AB transaction output profile
- 调用 `pg-sql` 获取语法事实
- 输出覆盖计划
- 按规范生成 SQL 用例

当前已支持的基础模块：

- `coverage-packs/index.md`：索引覆盖，已第一轮细化。
- `coverage-packs/data-types.md`：数据类型覆盖，待细化。
- `coverage-packs/isolation-repeatable-read.md`：RR 隔离级别覆盖，待细化。
- `output-profiles/pg-regression.md`：普通单文件 SQL 用例格式。
- `output-profiles/pg-ab-regression.md`：AB 型多会话事务 SQL 用例格式。

## 仓库结构

建议仓库结构如下：

```text
pg_skills/
├── README.md
└── skills/
    ├── pg-sql/
    │   ├── SKILL.md
    │   ├── agents/
    │   │   └── openai.yaml
    │   ├── references/
    │   │   ├── knowledge-base-layout.md
    │   │   ├── response-style.md
    │   │   └── pg_skills/
    │   │       ├── _index.yaml
    │   │       ├── _metadata.yaml
    │   │       ├── _schema.yaml
    │   │       ├── ddl/
    │   │       ├── dml/
    │   │       ├── dcl/
    │   │       ├── tcl/
    │   │       ├── utility/
    │   │       └── concurrency/
    │   └── scripts/
    │       └── lookup_pg_doc.rb
    └── pg-casegen/
        ├── SKILL.md
        ├── agents/
        │   └── openai.yaml
        ├── coverage-packs/
        │   ├── index.md
        │   ├── data-types.md
        │   └── isolation-repeatable-read.md
        ├── output-profiles/
        │   ├── pg-regression.md
        │   └── pg-ab-regression.md
        ├── references/
        │   ├── workflow.md
        │   ├── intent-expansion.md
        │   ├── coverage-pack-contract.md
        │   ├── output-profile-contract.md
        │   ├── pg-sql-integration.md
        │   ├── coverage-plan-template.md
        │   ├── ab-sync-contract.md
        │   └── pg-regression-sql-standards.md
        └── scripts/
            └── validate_pg_casegen.rb
```

## 安装

### 方式一：通过 Codex skill installer 安装

如果你的环境提供 `install-skill-from-github.py`，可以直接从 GitHub 仓库安装：

```bash
install-skill-from-github.py \
  --repo Gongliangbiao/pg_skills \
  --path skills/pg-sql skills/pg-casegen
```

也可以使用 GitHub tree URL：

```bash
install-skill-from-github.py \
  --url https://github.com/Gongliangbiao/pg_skills/tree/main/skills/pg-sql

install-skill-from-github.py \
  --url https://github.com/Gongliangbiao/pg_skills/tree/main/skills/pg-casegen
```

安装后重启 Codex，使新 skill 生效。

### 方式二：手动下载后放入本地 skills 目录

如果你的工具不支持 GitHub installer，可以手动下载仓库，然后把 `skills/pg-sql` 和 `skills/pg-casegen` 复制到工具的 skills 目录。

例如：

```bash
git clone https://github.com/Gongliangbiao/pg_skills.git
cd pg_skills
```

放入 Codex skills 目录：

```bash
mkdir -p ~/.codex/skills
cp -R skills/pg-sql ~/.codex/skills/
cp -R skills/pg-casegen ~/.codex/skills/
```

放入 Claude Code skills 目录：

```bash
mkdir -p ~/.claude/skills
cp -R skills/pg-sql ~/.claude/skills/
cp -R skills/pg-casegen ~/.claude/skills/
```

不同 CLI 工具的 skills 目录可能不同。如果你的工具支持自定义 skill 目录，请把 `skills/pg-sql` 和 `skills/pg-casegen` 放到对应目录即可。

安装后重启 CLI，使新 skill 生效。

### 安装验证

进入 CLI 后可以测试：

```text
/pg-sql CREATE INDEX 的语法和关键参数是什么？
```

```text
/pg-casegen 覆盖索引，先生成覆盖计划，不要生成 SQL
```

## 使用示例

### 查询 PostgreSQL 语法

```text
/pg-sql CREATE INDEX 的语法和关键参数是什么？
```

预期行为：

- 查找 `CREATE INDEX` 对应 YAML
- 读取语法、参数、示例、注意事项
- 按结构化格式回答

### 生成覆盖计划

```text
/pg-casegen 覆盖索引，先生成覆盖计划，不要生成 SQL
```

预期行为：

- 识别主题为 `index`
- 使用 `coverage-packs/index.md`
- 使用 `output-profiles/pg-regression.md`
- 查询 `CREATE INDEX`、`DROP INDEX`、`REINDEX`、`EXPLAIN`
- 展开覆盖矩阵，例如 `IDX-001` 到 `IDX-038`
- 给出建议生成文件，例如：
  - `index_basic_btree_001.sql`
  - `index_unique_nulls_002.sql`
  - `index_expression_partial_003.sql`
  - `index_include_sorting_004.sql`

### 生成 SQL 用例

```text
/pg-casegen 按当前规范生成 index_basic_btree_001.sql，只生成 SQL，不生成 expected
```

预期行为：

- 文件名表达测试点
- 表名使用 `tab_` 前缀
- 索引名使用 `idx_` 前缀
- 包含标准 header
- 包含 setup、正向 SQL、验证查询和 cleanup
- 不生成 expected
- 不使用 MySQL-only 语法

### AB 型事务用例

```text
/pg-casegen 生成 repeatable read 下 update conflict 的 AB 事务用例，先给覆盖计划
```

预期行为：

- 使用 `pg-ab-regression` output profile
- 文件名采用测试点语义，例如：
  - `repeatable_read_update_conflict_001A.sql`
  - `repeatable_read_update_conflict_001B.sql`
- 同步点采用稳定命名：
  - `repeatable_read_update_conflict_A2B_01`
  - `repeatable_read_update_conflict_B2A_01`
- 遵守 `references/ab-sync-contract.md`
