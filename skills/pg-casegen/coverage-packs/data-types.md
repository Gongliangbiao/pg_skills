# 数据类型 Coverage Pack

## Pack ID

data-types

## 触发短语

- 数据类型
- 类型覆盖
- data type
- data types
- type coverage

## 需要查询 pg-sql

- CREATE TABLE
- INSERT
- SELECT
- ALTER TABLE

## 能力要求

- single-session
- sql-only
- error-output

## 覆盖维度

- 数值类型
- 字符类型
- 布尔类型
- 日期和时间类型
- 二进制类型
- UUID 类型
- JSON 和 JSONB 类型
- 数组类型
- 默认值
- 类型转换
- 非法输入

## 用例生成规则

- 相关类型应分组生成，保持输出可读。
- 当表达式可能有歧义时，使用显式类型转换。
- 避免生成会导致外部框架采集到 locale 敏感输出的 SQL。

## 不覆盖范围

- 扩展提供的数据类型
- locale 专项格式覆盖
- 性能或存储大小基准测试
