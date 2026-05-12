---
name: pg-sql
description: Use when answering PostgreSQL 16 SQL syntax, command options, examples, or concurrency questions such as MVCC, locks, deadlocks, and transaction isolation from the bundled YAML knowledge base rather than from memory.
---

# PG SQL

Use this skill when the answer should come from the bundled PostgreSQL YAML knowledge base at `references/pg_skills`.

## When to Use

- The user asks for PostgreSQL command syntax such as `SELECT`, `INSERT`, `CREATE TABLE`, `ALTER TABLE`, `GRANT`, or transaction commands.
- The user asks for PostgreSQL concurrency topics such as MVCC, row locks, table locks, deadlocks, advisory locks, or transaction isolation.
- The question needs exact PostgreSQL 16.4 wording, parameters, examples, compatibility notes, or PG-specific features.

## Workflow

1. If the target command or topic is not obvious, run `scripts/lookup_pg_doc.rb "<query>"` to resolve candidate YAML files from `_index.yaml`.
2. Read the matched YAML file before answering.
3. Extract only the relevant sections such as `syntax`, `parameters`, `examples`, `notes`, `errors`, `related`, and `compatibility`.
4. Answer for PostgreSQL `16.4` unless the user explicitly asks for another version.
5. Cite the YAML file path you used when precision matters.

## Response Contract

Do not stop at raw SQL unless the user explicitly asks for SQL only.

Choose the response shape based on the question type:

- Syntax or command reference questions: use the command template from [references/response-style.md](references/response-style.md).
- Concurrency or concept questions: use the concept template from [references/response-style.md](references/response-style.md).
- Build requests such as "create a partition table", "write a GRANT statement", or "show an UPSERT example": give a short explanation plus runnable SQL, and still include the key syntax, PG-specific behavior, and important notes.

For build requests, prefer this order:

1. Identify the underlying command or concept.
2. Summarize the relevant syntax in one short section.
3. Provide the runnable SQL example.
4. Add only the most relevant notes, limitations, or PG-specific behavior.
5. When useful, include a tiny verification block such as `INSERT`, `SELECT`, or follow-up DDL.

## Guardrails

- Do not answer PostgreSQL syntax questions from memory when the local YAML knowledge base covers the topic.
- Prefer `_index.yaml` for discovery and the target YAML for final facts.
- If multiple commands are plausible, show the top candidates and explain which file you chose.
- Treat PostgreSQL extensions such as `DISTINCT ON`, `RETURNING`, `ON CONFLICT`, `LIMIT/OFFSET`, `UNLOGGED`, and `PARTITION BY` as PG-specific unless the YAML says otherwise.
- Concurrency questions usually map to files under `concurrency/`.
- Prefer structured answers over a bare snippet when the YAML provides `parameters`, `examples`, `notes`, `errors`, or `compatibility`.
- If the YAML contains an example close to the user's request, adapt it instead of inventing a totally new shape.
- If you synthesize SQL beyond the exact example in the YAML, say that the SQL is adapted from the documented syntax and example.
- For build requests, default to including a lightweight verification snippet unless the user asks for SQL only.
- If the user asks for a PostgreSQL feature that is not shown directly in the matched YAML example, you may adapt from the documented syntax, but say that the final SQL is an adaptation rather than a verbatim example.

## References

- See [references/knowledge-base-layout.md](references/knowledge-base-layout.md) for the knowledge base structure and common entry points.
- See [references/response-style.md](references/response-style.md) for the expected answer formats.
