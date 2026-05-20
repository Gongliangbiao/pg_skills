# pg_skills

[中文 README](README.zh-CN.md)

`pg_skills` is a set of Codex skills for designing and generating PostgreSQL regression SQL test cases from official documentation, local knowledge, and reviewable test coverage artifacts.

The current workflow separates coverage extraction, case design, SQL generation, SQL naming, and PostgreSQL syntax lookup. This keeps each skill focused and makes every stage easier to review before moving to the next one.

## Skills

| Skill | Responsibility | Main Output |
| --- | --- | --- |
| `pg-doc-extract` | Extract official-document chapter structure, test factors, factor values, priorities, combination strategy, no-test notes, and test-point overviews. | `docs/test-factors/`, `docs/test-points/`, optional XMind reports |
| `pg-case-design` | Refine test-point overviews into detailed case design documents that are ready for SQL generation. | `docs/case-designs/` |
| `pg-casegen` | Generate PostgreSQL regression SQL files from ready case designs. | `sql/` |
| `pg-sql-case-naming` | Decide SQL output paths, file names, and object-name shortening rules before SQL generation. | Naming guidance consumed by `pg-casegen` |
| `pg-sql` | Query the bundled PostgreSQL 16 SQL knowledge base for syntax, options, examples, limits, and concurrency semantics. | Structured SQL facts and examples |

## Workflow

```text
Official documentation / local knowledge
  -> pg-doc-extract
  -> docs/test-factors/
  -> docs/test-points/
  -> optional XMind reports
  -> pg-case-design
  -> docs/case-designs/
  -> pg-casegen
  -> sql/
```

### Coverage Layer

`pg-doc-extract` owns the coverage model:

- `docs/test-factors/` records chapter structure, factor keys, factor values, priorities, boundaries, source attribution, and combination strategy.
- `docs/test-points/` records the derived test points. Each test point should trace back to one or more factor values and one combination strategy.
- Additional local-knowledge scenarios must be marked as local knowledge rather than official-document coverage.
- Chapters with no executable test point should still have a no-test note so coverage reviewers can see that the chapter was considered.

### Case Design Layer

`pg-case-design` consumes `docs/test-points/` and produces detailed case design documents under `docs/case-designs/`.

The case design layer should include enough detail for SQL generation:

- objective and source test point
- session model, preferring two sessions unless a third session is truly required
- setup data and object constraints
- execution outline
- final-state verification
- expected result
- SQL generation constraints

This skill does not generate SQL.

### SQL Generation Layer

`pg-casegen` consumes ready case designs and generates SQL files under `sql/`.

The SQL generation rules include:

- ordinary cases use one SQL file
- AB multi-session cases use paired files ending in `_001A.sql` and `_001B.sql`
- object names use readable prefixes such as `tab`, `idx`, `func`, `seq`, `view`, and `trg`
- object names should stay close to the case name when possible and only be shortened when PostgreSQL identifier limits require it
- final-state `SELECT` checks should be included around transaction boundaries where they help confirm the result
- redundant cleanup sections are not required in generated SQL

## Optional XMind Reports

XMind reports are optional review artifacts. Generate them only when a user explicitly needs reporting material.

The report generator lives in:

```text
skills/pg-doc-extract/scripts/generate_xmind_report.js
```

Example:

```bash
node skills/pg-doc-extract/scripts/generate_xmind_report.js --root . --section 13.2-transaction-isolation
```

Typical output:

```text
docs/reports/xmind-by-section/
```

The XMind view should keep the main branches concise: factor key, value list, priority, combination strategy, and mapped test points. Longer rationale belongs in notes or the source Markdown.

## Repository Layout

```text
pg_skills/
├── README.md
└── skills/
    ├── pg-doc-extract/
    ├── pg-case-design/
    ├── pg-casegen/
    ├── pg-sql-case-naming/
    └── pg-sql/
```

Each skill directory contains a `SKILL.md` file and may include `agents/`, `references/`, `scripts/`, `coverage-packs/`, or `output-profiles/` depending on that skill's role.

## Installation

Clone this repository and copy the skills you need into your Codex skills directory:

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

Restart Codex after installation so the new or updated skills are loaded.

## Usage Examples

Extract test factors and test points from a PostgreSQL documentation chapter:

```text
Use pg-doc-extract to extract test factors and test points for PostgreSQL concurrency control chapter 13.
```

Turn test points into case designs:

```text
Use pg-case-design to refine docs/test-points/chapter-13-concurrency-control into docs/case-designs.
```

Generate SQL from ready case designs:

```text
Use pg-casegen to generate SQL for docs/case-designs/chapter-13-concurrency-control/13.2-transaction-isolation.
```

Look up PostgreSQL syntax facts:

```text
Use pg-sql to confirm CREATE INDEX syntax and important options.
```

## Validation Before Release

Before publishing, check:

- every skill has valid `SKILL.md` frontmatter with `name` and `description`
- scripts pass syntax checks
- release files do not contain local absolute paths
- generated README examples use repository-relative paths
- no `.DS_Store` or temporary files are included
