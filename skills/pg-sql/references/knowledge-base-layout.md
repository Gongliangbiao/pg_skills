# PostgreSQL Knowledge Base Layout

## Root

- Knowledge base root: `references/pg_skills`
- Global index: `references/pg_skills/_index.yaml`
- Metadata: `references/pg_skills/_metadata.yaml`
- Schema notes: `references/pg_skills/_schema.yaml`

## Counts From `_index.yaml`

- Total entries: `192`
- `DDL`: `126`
- `DML`: `7`
- `DCL`: `3`
- `TCL`: `16`
- `Utility`: `30`
- `Concurrency`: `10`

## DDL Breakdown

- `ddl/alter/`: `37`
- `ddl/create/`: `44`
- `ddl/drop/`: `37`
- Existing-object supplements in index:
  - `existing_alter`: `4`
  - `existing_create`: `9`
  - `existing_drop`: `6`

## Main Directories

- `ddl/alter/*.yaml`
- `ddl/create/*.yaml`
- `ddl/drop/*.yaml`
- `dml/*.yaml`
- `dcl/*.yaml`
- `tcl/*.yaml`
- `utility/*.yaml`
- `concurrency/*.yaml`

## Common Entry Points

- `CREATE TABLE` -> `ddl/create/create_table.yaml`
- `ALTER TABLE` -> `ddl/alter/alter_table.yaml`
- `DROP TABLE` -> `ddl/drop/drop_table.yaml`
- `SELECT` -> `dml/select.yaml`
- `INSERT` -> `dml/insert.yaml`
- `UPDATE` -> `dml/update.yaml`
- `DELETE` -> `dml/delete.yaml`
- `GRANT` -> `dcl/grant.yaml`
- `BEGIN` -> `tcl/begin.yaml`
- `COMMIT` -> `tcl/commit.yaml`
- `MVCC` -> `concurrency/mvcc.yaml`
- `事务隔离` -> `concurrency/transaction_isolation.yaml`
- `死锁` -> `concurrency/deadlock.yaml`
- `行锁` -> `concurrency/row_locks.yaml`

## Recommended Lookup Flow

1. Use `scripts/lookup_pg_doc.rb "<query>"` to resolve likely files.
2. Read the matched YAML file.
3. Prefer structured fields such as `syntax`, `parameters`, `examples`, `notes`, `errors`, and `compatibility`.
4. Quote or summarize only what is relevant to the user’s question.

## Example Script Usage

```bash
scripts/lookup_pg_doc.rb "CREATE TABLE"
scripts/lookup_pg_doc.rb "SELECT FOR UPDATE"
scripts/lookup_pg_doc.rb "事务隔离"
scripts/lookup_pg_doc.rb "deadlock"
```
