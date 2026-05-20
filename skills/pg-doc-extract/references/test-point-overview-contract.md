# 测试点概览文件契约

## 目标

测试点概览文件回答两个问题：

```text
官方文档说了什么？
这里应该测什么？
```

它不是 SQL 设计文件，不需要写完整执行步骤。

## 路径规则

测试点概览默认放在：

```text
docs/test-points/<module>/<official-section-dir>/<test-point-slug>.md
```

示例：

```text
docs/test-points/chapter-13-concurrency-control/13.2-transaction-isolation/13.2.1-read-committed/rc-update-wait-recheck-where-match.md
```

测试点应由 `docs/test-factors/` 中对应章节的因子矩阵派生，是因子值组合后的覆盖结果；除非是快速草稿，文件中必须记录来源因子和组合策略。

注意：测试点是因子组合的结果，不是因子来源。生成测试点前必须先建立真实因子维度，例如对象/语句、参数/选项、状态/条件、行为语义、边界、异常和诊断观测。不要把测试点名称反向写成 `测试行为目标` 因子。

## 文件模板

```markdown
# <TEST_POINT_ID>

## 来源声明
- source_type: official-doc / local-knowledge / user-supplement / legacy-derived / needs-confirmation
- source_ref: <官方文档章节、知识库文件、用户补充说明或历史目录>
- source_note: <说明该测试点的真实来源>

## 官方章节
<chapter-number> <chapter-title>

## 官方/来源依据摘要
<用自己的话概括官方文档中的行为、限制或边界。>

## 来源因子
- factor_matrix: docs/test-factors/<module>/<official-section-dir>/factor-matrix.md
- factor_values: <Fxx-Vxx, Fyy-Vyy>
- combination_strategy: <single-factor / equivalence-class / boundary-directed / pairwise / state-transition / risk-based>

## 测试点
<一句话说明要验证什么。>

## 覆盖类型
正向 / 反向 / 边界 / 并发 / 诊断 / 无测试点

## 重要边界
- <边界值、例外情况、版本或配置限制>

## 测试必要性
core / supporting / special / duplicate-covered / no-test

## 标记理由
<说明为什么属于该必要性标签。>

## 备注
<可选。记录与其他章节的关系、暂缓原因或需后续确认点。>
```

## 抽取规则

- 一个文件只表达一个主要测试点。
- 必须区分真实来源：官方文档测试点写 `official-doc`；本地锁知识、用户补充或自建扩展章节写 `local-knowledge` / `user-supplement`；历史迁移写 `legacy-derived`。
- 不得因为目录名包含章节号就声明为官方章节；PostgreSQL 官方文档不存在的扩展章节必须在来源声明和备注中明确说明。
- 测试点必须由因子矩阵中的因子值和组合策略生成，并能回链追溯。
- 来源因子必须指向真实可组合维度；如果只看到 `F01 测试行为目标` 或 `本章节 N 个单一测试点`，说明因子矩阵需要先返工。
- 章节中明确描述的边界、例外、限制必须单独记录，不要只写主路径。
- 对官方明确说明但不适合自动化测试的内容，保留 `no-test` 文件说明原因。
- 不要在概览层写 SQL、表结构、会话同步点或具体执行步骤。
- 如果一个测试点依赖另一个测试点，只记录关系，不做交叉合并。

## 输出质量检查

- 每个文件都能追溯到一个官方章节。
- 每个 P0 因子值至少有一个测试点覆盖，或在因子矩阵中有明确不测理由。
- 测试点名称读起来像“要验证的行为”，不是实现步骤。
- 边界值没有被主路径吞掉。
- `no-test` 章节有理由，不是空目录。
