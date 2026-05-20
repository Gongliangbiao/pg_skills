# 意图增强

## 目标

把用户模糊、简略或口语化的请求，转换成明确的 pg-casegen 任务类型。ready case design 进入 SQL 生成；宽泛主题进入覆盖计划或要求补全 case design。

## 规范化规则

- “覆盖索引”“索引覆盖”“index coverage”“CREATE INDEX 用例” -> `index`
- “数据类型覆盖”“类型覆盖”“data type coverage” -> `data-types`
- “RR”“repeatable read”“可重复读”“rr 隔离级别” -> `isolation-repeatable-read`

## 默认假设

- 如果用户提供 ready case design 并说“生成用例”，默认生成 PostgreSQL regression 风格 SQL。
- 如果用户说“规划”“看看覆盖哪些”“先列一下”，先输出覆盖计划。
- 如果用户只给出主题名，默认只生成覆盖计划，不直接生成 SQL。
- 如果请求有歧义，但某个 coverage pack 明显最接近，可以继续执行，并说明采用的假设。
- 如果用户只给测试点名称或测试点概览，先要求或调用 `pg-case-design` 补全 case design。

## 需要澄清的情况

出现以下情况时，只问一个简短澄清问题：

- 两个或多个 coverage pack 匹配程度相同。
- 用户要求的输出格式与 coverage pack 的能力要求冲突。
- 用户要求的主题还没有 coverage pack。
- 用户要求的范围过大，不适合放在一个 regression 文件里。
- 用户要求直接生成 SQL，但没有提供 ready case design。

## 内部任务表示

规范化后，在内部按下面的信息理解任务：

```text
topic: <coverage-pack-id>
output_profile: <output-profile-id>
mode: plan | design-needed | generate | refine | review
scope: minimal | standard | full
input_kind: ready-case-design | test-point-overview | broad-topic
requires_pg_sql: <commands-and-concepts>
```
