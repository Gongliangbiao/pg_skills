# 意图增强

## 目标

把用户模糊、简略或口语化的请求，转换成明确的覆盖生成任务。

## 规范化规则

- “覆盖索引”“索引覆盖”“index coverage”“CREATE INDEX 用例” -> `index`
- “数据类型覆盖”“类型覆盖”“data type coverage” -> `data-types`
- “RR”“repeatable read”“可重复读”“rr 隔离级别” -> `isolation-repeatable-read`

## 默认假设

- 如果用户说“生成用例”，默认生成 PostgreSQL regression 风格用例。
- 如果用户说“规划”“看看覆盖哪些”“先列一下”，先输出覆盖计划。
- 如果用户只给出主题名，默认扩展为该主题的语法和行为全量覆盖。
- 如果请求有歧义，但某个 coverage pack 明显最接近，可以继续执行，并说明采用的假设。

## 需要澄清的情况

出现以下情况时，只问一个简短澄清问题：

- 两个或多个 coverage pack 匹配程度相同。
- 用户要求的输出格式与 coverage pack 的能力要求冲突。
- 用户要求的主题还没有 coverage pack。
- 用户要求的范围过大，不适合放在一个 regression 文件里。

## 内部任务表示

规范化后，在内部按下面的信息理解任务：

```text
topic: <coverage-pack-id>
output_profile: <output-profile-id>
mode: plan | generate | refine | review
scope: minimal | standard | full
requires_pg_sql: <commands-and-concepts>
```
