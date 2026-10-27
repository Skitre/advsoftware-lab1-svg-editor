# Lab 1 Phase 1：SVG 编辑器（CLI）

## 架构方案（初稿）

使用 TypeScript 类层次与多态；六种内置图形：rect、circle、ellipse、line、text、g。

| 模块 | 职责 | 允许依赖 |
| --- | --- | --- |
| domain | 图形行为、组合树、文档不变量 | 标准语言能力 |
| application | Command、历史、文档会话、存储端口 | domain |
| infrastructure | SVG XML 适配、文件读写 | domain、application 的端口 |
| cli | 分词、命令分发、REPL、展示 | application、domain |
| main.ts | 组装具体依赖 | 所有模块 |

Command 表达一次编辑，Composite 统一叶子与容器，Memento 保存编辑前后文档以保证原子撤销。
名字分派只留在 CommandFactory 与 ShapeFactory，作为后续插件阶段待重构点。
所有编辑先作用于文档副本，验证成功后再提交；失败不改变文档、路径或历史。

## 过程记录

1. 阅读需求后先确认阶段边界：box 属后续插件化目标，本阶段应明确拒绝。
2. 采用分阶段真实提交，先确定依赖规则，再实现和验证各阶段。

## 一致性自查

完成实现后补充目录与依赖检查结果。

## 质量保证手段

计划覆盖领域行为、历史与错误原子性、SVG 往返、真实 CLI 脚本回放和架构依赖。
