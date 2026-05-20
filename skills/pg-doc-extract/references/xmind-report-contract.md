# XMind 报告输出契约

## 定位

XMind 报告是 `pg-doc-extract` 的可选展示层，用于测试点充分性评审。它基于 `docs/test-factors/` 和 `docs/test-points/` 生成，不参与 SQL 设计与 SQL 生成。

只有用户明确要求 XMind、脑图、汇报材料、覆盖证明或可视化时才生成。

## 输入

```text
docs/test-factors/<module>/<section>/factor-matrix.md
docs/test-points/<module>/<section>/*.md
```

## 默认输出

```text
docs/reports/xmind-by-section/<module>/<section>/<section>.xmind
```

输出目录结构应镜像 `docs/test-points/` 的模块和章节结构。

## 导图结构

每个章节一个 XMind 文件，根节点为章节名或扩展目录名，主分支固定为：

1. 来源声明
2. 章节定位 / 扩展目录定位
3. 范围摘要
4. 测试因子矩阵
5. No-test 记录
6. 计划测试点优先级分布
7. 组合方式
8. 测试点覆盖
9. 充分性结论

## 来源规则

- 必须展示 `source_type`、`source_ref` 和 `source_note`。
- `source_type: local-knowledge` 或 `user-supplement` 的目录必须展示为“扩展目录定位”，不能写成官方章节。
- PostgreSQL 官方文档不存在的扩展编号，例如项目自建 `13.8`，不得在报告中声明为官方章节。

## 展示规则

- 测试因子矩阵用于汇报时应保持简洁：主干只展示因子 key、因子名称、因子类型、优先级和取值清单。
- 每个因子下面必须有“取值”节点，展示来自 `## 因子值细化` 的短清单，格式为 `<值ID> = <值> [<优先级>]`，例如 `F01-V01 = READ COMMITTED [P0]`。
- 如果 value 过长，主干只展示冒号前的短值或截断后的摘要；完整 value、类型、依据、边界/异常说明放入该取值节点 notes，不在主干层层展开。
- 不要在测试因子矩阵主干重复铺开依据、边界说明、备注等长文本；这些内容属于审查细节，不是汇报主视图。
- 因子 `F01` 如果表示“测试行为目标集合”，不要展示成“有效值/状态/边界: 本章节 N 个单一测试点”。应展示为：
  - `因子值数量: N 个测试行为目标，详见 F01-V01 至 F01-VNN`
- 每个测试点节点至少展示：
  - 优先级
  - 覆盖因子值
  - 组合方式
  - 测试点
  - 覆盖类型
  - 测试必要性
  - 重要边界
  - 来源文件
- 必须按计划测试点统计 `P0/P1/P2/P3` 数量。该统计来自 factor matrix 的“计划测试点”表，不等同于因子清单或因子值细化中的优先级分布。
- 报告不写 SQL 步骤、会话编排或具体测试数据。

## 质量检查

- XMind 文件数量应等于输入 `factor-matrix.md` 数量。
- 每个 XMind 文件应能解压并包含 `content.json`、`metadata.json`、`manifest.json`。
- 报告中不得出现本机绝对路径。
