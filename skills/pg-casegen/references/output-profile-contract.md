# Output Profile 规范

output profile 位于 `output-profiles/*.md`。

每个 profile 描述 SQL 用例在磁盘上的格式、header、稳定性要求和示例。profile 只放输出规则；主题覆盖规则放到 `coverage-packs/`，文件路径和对象名细节优先遵守 `pg-sql-case-naming`。

## 必需章节

```markdown
# <格式名称> Output Profile

## Profile ID
<stable-id>

## 适用场景
- <condition>

## 生成文件
- <path-pattern>

## 文件结构
- <section>

## 稳定性规则
- <rule>

## 待补充的项目规则
- <rule placeholder>
```

## 质量规则

- 生成结果必须确定、可重复。
- 文件名必须稳定且可读，并与 `pg-sql-case-naming` 保持一致。
- 不要依赖本机绝对路径。
- 项目级格式规则必须集中放在选中的 output profile 中。
- 当用户提供具体 SQL 格式规范时，先更新 output profile，再生成用例。
