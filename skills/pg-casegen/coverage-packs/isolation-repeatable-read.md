# Repeatable Read 隔离级别 Coverage Pack

## Pack ID

isolation-repeatable-read

## 触发短语

- RR
- rr 隔离级别
- repeatable read
- 可重复读
- 事务隔离
- 隔离级别覆盖

## 需要查询 pg-sql

- BEGIN
- COMMIT
- ROLLBACK
- SET TRANSACTION
- transaction isolation
- MVCC
- row locks
- serialization failure

## 能力要求

- multi-session
- sql-only
- error-output
- isolation-schedule

## 覆盖维度

- 稳定快照读取
- 幻读行为预期
- 写写冲突行为
- 序列化失败场景
- 与行锁的交互
- 回滚和清理

## 用例生成规则

- 如果项目期望 A/B SQL 文件，优先使用 `pg-ab-regression`。
- 只有当项目明确要求 PostgreSQL isolation schedule 时，才优先使用 isolation-style output profile。
- 每个场景都应建模为有序的会话步骤。
- 对象 setup 和 cleanup 应放在没有并发歧义的位置。

## 不覆盖范围

- 普通单会话 SQL regression 输出，除非用户明确要求简化演示。
- 性能或时间敏感测试。
