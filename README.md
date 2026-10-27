# Lab 1 — SVG CLI 编辑器

[![CI](https://github.com/Skitre/advsoftware-lab1-svg-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/Skitre/advsoftware-lab1-svg-editor/actions/workflows/ci.yml)

TypeScript 面向对象课程作业：六种 SVG 图形、组合树编辑、Command 撤销/重做、SVG 文件读写和可回放的命令行交互。

- **提交文档：[doc/README.md](doc/README.md)**，含架构图、设计模式、过程记录、一致性自查与质量保证。
- **Git 仓库：[Skitre/advsoftware-lab1-svg-editor](https://github.com/Skitre/advsoftware-lab1-svg-editor)**
- **最终版本：[final tag](https://github.com/Skitre/advsoftware-lab1-svg-editor/tree/final)**

## 运行

需要 Node.js 22 或以上版本。

```sh
npm ci
npm run cli
```

输入 `help` 查看命令，`Ctrl-D` 退出。示例：

```text
init 800 600
create g scene
create rect card 40 50 160 60 #4a90d9 in scene
create text title 60 85 "Hello SVG" in scene
move scene 30 10
undo
tree
save demo.svg
```

## 验证与示例

```sh
npm run check
npm run cli < examples/flowchart.commands
```

`npm run check` 包含严格类型检查、26 项自动测试和编译。编译后可直接运行 `node dist/main.js`。

![流程图示例](examples/flowchart.svg)

示例输入、生成 SVG 和实际输出保存在 [examples/](examples/)。支持 Phase 1 的 19 条命令；`box` 插件属于后续阶段，此版本按要求报未知类型。
