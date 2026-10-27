# Lab 1 Phase 1：SVG 编辑器（CLI）

**Git 仓库地址：<https://github.com/Skitre/advsoftware-lab1-svg-editor>**

**最终提交：[`final` tag](https://github.com/Skitre/advsoftware-lab1-svg-editor/tree/final)**

实现语言：TypeScript；运行环境：Node.js 22+；协作工具：Codex。本文为课程要求的提交 README。

## 1. 运行与功能

```sh
git clone https://github.com/Skitre/advsoftware-lab1-svg-editor.git
cd advsoftware-lab1-svg-editor
git checkout final
npm ci
npm run cli
```

进入后出现 `svg>`。`help` 查看语法，`Ctrl-D` 结束。脚本方式为 `npm run cli < examples/flowchart.commands`。脚本中空行和以 `#` 开头的行被忽略；`#4a90d9` 这样的颜色参数正常保留。交互模式显示提示符；重定向输入时省略提示符，便于保存输出。错误写入 stderr，每行以 `error:` 开头；发生错误后继续处理后续命令，脚本整体退出码为 1。

```text
init 800 600
create g flowchart
create g node1 in flowchart
create rect start 120 100 160 60 #4a90d9 in node1
create text start-label 155 135 "开始" in node1
move node1 0 100
undo
tree
save demo.svg
```

保存的文件可直接拖进浏览器预览。完整两节点案例位于 [`examples/flowchart.commands`](https://github.com/Skitre/advsoftware-lab1-svg-editor/blob/final/examples/flowchart.commands)，配有生成的 SVG 和真实回放输出。

![两节点流程图](https://raw.githubusercontent.com/Skitre/advsoftware-lab1-svg-editor/final/examples/flowchart.svg)

### 命令覆盖

| 分类 | 已实现命令 | 行为 |
| --- | --- | --- |
| 文档 | `init [w] [h]`、`read <file.svg>`、`save [file.svg]` | 默认画布 800×600；成功后封锁历史；首次 save 需要路径，之后记住最近成功路径 |
| 画布 | `canvas [w h]` | 无参数查询；两个参数修改尺寸并重建 viewBox、封锁历史 |
| 图形 | `create <type> <id> [params...] [in <containerId>]` | 六种内置类型，父容器必须存在；id 大小写敏感且唯一 |
| 几何与样式 | `move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` | 容器与叶子统一接口；按类型限制属性 |
| 树编辑 | `delete <id>`、`group <newGid> <id1> [id2...]`、`ungroup <gid>`、`addto <gid> <id>` | 保持树结构，阻止循环；删除容器会删除子树 |
| 层叠 | `front <id>`、`back <id>` | 仅调整同级次序；front 在 SVG 中最后绘制 |
| 展示 | `tree [id]`、`show <id>`、`help` | 树内联几何和样式，show 显示父级和属性；不修改历史 |
| 历史 | `undo`、`redo` | 每条编辑命令一个单元；成功的新编辑清空 redo |

`create` 参数如下，所有类型均可追加 `in <containerId>`：

| 类型 | id 之后的参数 |
| --- | --- |
| rect | `<x> <y> <w> <h> [fill]` |
| circle | `<cx> <cy> <r> [fill]` |
| ellipse | `<cx> <cy> <rx> <ry> [fill]` |
| line | `<x1> <y1> <x2> <y2> [stroke]` |
| text | `<x> <y> "content"` |
| g | 无 |

省略 fill/stroke 时不写该属性，遵循 SVG 默认值。带空格的文本或路径用双引号；双引号内部支持 `\"` 和 `\\`，空字符串也合法。

`set` 允许公共属性 `fill`、`stroke`、`stroke-width`；以及 rect 的 `x/y/width/height`，circle 的 `cx/cy/r`，ellipse 的 `cx/cy/rx/ry`，line 的 `x1/y1/x2/y2`，text 的 `x/y/text`。其他属性（包括 id、font-size）均拒绝，导入时保留属性不代表允许通过 set 修改。

### 明确的语义选择

- **历史屏障**：成功的 init/read/save/canvas 尺寸修改会清空双栈，并使 undo 和 redo 都返回 `error: undo not allowed after io command`。下一次成功编辑解禁；失败的命令不改变文档、保存路径或历史。canvas 查询不触发屏障。help 可以在无文档时使用，其余需要文档的命令统一报未初始化错误。
- **缩放**：factor 必须为正，乘到全部几何位置与尺寸；g 递归处理所有子孙。按本阶段白名单语义，不缩放字体大小或 stroke-width。
- **容器样式**：`set g fill red` 设置 g 的 SVG 属性，子孙通过 SVG 继承获得外观，子元素的显式 fill 可以覆盖。移动/缩放递归改变子孙几何坐标。
- **分组顺序**：需求未规定跨父级新组的位置。本实现按原文档先序保留所选图形的相对顺序，不按命令参数重排；同父级时新组占据首个被选元素的位置，跨父级时新组追加到根部。祖先和后代不能同时入选。
- **解组**：仅允许解散非根级 g，子图形占据原组位置。根级 g 按要求报 `cannot ungroup top-level container`。重新归属会采用新父级的样式/变换继承，不补偿旧父级继承效果。
- **错误与反馈**：规定的错误字符串保持一致。成功编辑输出结果摘要；撤销/重做使用 `undone: ...` / `redone: ...` 表明对应操作，状态完整恢复，不逐字模仿示例的全部成功提示。

## 2. 架构方案

### 2.1 模块划分

```text
src/
  domain/                    图形与文档领域对象
    Shape.ts                 统一行为、身份和展示属性封装
    GeometryShape.ts         几何校验、移动、缩放
    Rect.ts / Circle.ts / Ellipse.ts / Line.ts / Text.ts
    Group.ts                 Composite 容器
    SvgDocument.ts           唯一 ID、归属、分组、删除、层叠
    ShapeFactory.ts          内置类型创建与 SVG 类型还原
    Numbers.ts               有限数和尺寸约束
  application/
    EditorSession.ts         当前文档、路径、编辑与 IO 协调
    History.ts               历史双栈与 IO 屏障
    DocumentStore.ts         存储端口（interface）
    commands/                EditCommand 和九个具体编辑命令类
  infrastructure/
    SvgCodec.ts              XML 与领域树相互转换
    FileDocumentStore.ts     真实文件读写
  cli/
    Lexer.ts / Token.ts      双引号、注释、token 元数据
    CommandArguments.ts      参数个数、数字、in 尾缀
    CommandFactory.ts        命令名称到行为的唯一分发点
    TreeFormatter.ts         tree/show 格式
    Repl.ts                  逐行输入、提示符、错误边界
  main.ts                    组合根，组装并注入依赖
test/                        领域、历史、IO、CLI、架构检查
examples/                    可回放案例与结果
doc/                         提交文档、PlantUML 源码与图
```

生产代码遵循一类一文件、文件名等于类名。`Token.ts` 和 `DocumentStore.ts` 是接口，`main.ts` 只负责装配。领域对象通过方法维护不变量；几何和样式数据对外返回副本，`Group.children` 返回数组副本，`EditorSession.snapshot()` 返回整个文档深拷贝。

### 2.2 PlantUML 组件图

箭头表示代码依赖；虚线实现箭头表示基础设施实现 application 定义的端口。main 是允许依赖全部模块的组合根。

![PlantUML 组件图](https://raw.githubusercontent.com/Skitre/advsoftware-lab1-svg-editor/final/doc/architecture.svg)

可编辑源码：[`doc/architecture.puml`](https://github.com/Skitre/advsoftware-lab1-svg-editor/blob/final/doc/architecture.puml)。本地安装 PlantUML 后执行 `plantuml -tsvg doc/architecture.puml` 可重建图片；运行编辑器不依赖 PlantUML。图像文件随仓库提交，阅读时不依赖在线渲染服务。

### 2.3 设计模式与代码落点

| 模式 | 解决的问题 | 实际落点与取舍 |
| --- | --- | --- |
| **Command（必选）** | 把一条编辑封装成可执行、可撤销、可重做的对象 | `EditCommand.execute/undo/redo` 定义协议，具体命令覆盖 `apply`；`History` 是调用者，`SvgDocument` 与 Shape 是接收者。CLI 仅构造命令，不直接编排图形编辑 |
| **Composite** | 容器和叶子使用相同操作 | Shape 定义 move/scale/set/clone 等行为；五类叶子继承 GeometryShape，Group 包含 Shape 子节点并递归操作；命令无需按图形类型分支 |
| **Memento** | 可靠恢复跨父级分组、子树删除、属性缺失等完整状态 | EditCommand 保存执行前/后的领域深拷贝；undo 恢复 before，redo 恢复 after，避免用浮点逆运算和不完整反操作恢复。代价是每个历史项 O(n) 内存，适合本阶段小文档 |
| **Factory** | 集中处理受限的名称分派 | ShapeFactory 是唯一图形类型分派点，CommandFactory 是唯一命令名称分派点；均用 Map。当前内置列表仍是后续插件化阶段的**待重构项**，尚未声称支持外部插件注册 |
| **端口与适配器** | 隔离文件系统/XML，方便替换和测试 | EditorSession 只依赖 DocumentStore interface；FileDocumentStore 实现真实 IO；测试用 MemoryDocumentStore 替换。SvgCodec 将 XML 库限制在基础设施层 |

一次编辑的流程为：`Repl → Lexer → CommandFactory → EditorSession → History → EditCommand → SvgDocument/Shape`。

EditCommand 先创建草稿，再在草稿上 apply。只有 apply 完整成功才提交新文档并更新历史。这比逐个修改现场再“尽力回滚”容易验证，特别是一个容器中某个子孙出现数值溢出时。文档 IO 由 EditorSession 独立协调，只有存储端口成功返回后才替换文档/路径和封锁历史。

### 2.4 依赖方向规则

| 来源 | 允许依赖 | 理由 |
| --- | --- | --- |
| domain | 仅 domain 与语言内建能力 | 图形规则可独立测试，不知道 CLI、XML 或磁盘 |
| application | application、domain | 组织用例和历史，通过自己定义的端口请求外部服务 |
| infrastructure | infrastructure、domain、application 的 DocumentStore 类型 | 实现端口并转换数据，不调用会话和历史；禁止依赖 CLI |
| cli | cli、application、domain | 解析交互输入，构造领域图形/命令并展示文档，不直接读写文件 |
| main.ts | 所有生产模块 | 唯一组合根，决定使用哪个具体存储适配器 |
| test | 所有模块 | 验证跨模块行为；测试依赖不计入生产依赖方向 |

自动检查使用 TypeScript AST 读取实际 import，验证以上允许矩阵，并要求 infrastructure 对 application 的引用只能是 `import type ... DocumentStore`。domain 与 application 不允许 Node 或第三方包依赖。

### 2.5 变化点假设

| 未来变化 | 当前准备 | 本阶段为何到此为止 |
| --- | --- | --- |
| 新图形、box 插件 | Shape 多态、Group 组合、集中 ShapeFactory；导入 data-kind 时保留标记 | 外部注册协议、插件发现、复合图形的内部保护属于下一阶段，当前 create box 按要求报未知类型 |
| 新命令或 GUI/agent 通道 | 编辑用例独立于 REPL，具备独立命令类与 EditorSession | 不预建没有实际需求的 GUI/agent 框架；新增 CLI 名称目前仍需修改 CommandFactory |
| 新存储位置或序列化格式 | DocumentStore 端口与 SvgCodec 分离 | 没有引入异步队列/数据库；目前同步本地文件足以满足课程交互 |
| 更大文档与更长历史 | 历史集中在 History / EditCommand | 暂不维护 ID 索引和差量快照，避免树变更时双份状态不一致；大文档需替换当前 O(n) 查找和整文档快照 |
| 完整 SVG 标准兼容 | XML 解析与领域模型分开，保留常用展示属性 | 不提前实现路径、CSS、滤镜、完整坐标变换引擎；超范围结构明确报错，避免静默丢失图形 |
| 输出风格或多语言 | TreeFormatter 与 Repl 独立 | 本阶段成功提示使用简短英文，文档使用中文；未增加配置系统 |

## 3. 过程记录

以下记录来自实际开发步骤和 Git 提交。用户确定了完成作业、分步提交以及公开仓库的要求；具体实现与技术自查由 Codex 执行。这里没有将 AI 自查虚构成用户提出的技术纠正。

| 阶段 / commit | 实际工作、发现与处理 | 验证 |
| --- | --- | --- |
| `47dfb91` 初始化 | 先阅读要求，明确 box 属下一阶段、doc/README.md 为提交入口；建立 TypeScript 工程和初版依赖规则，创建公开远程仓库 | 初始化提交推送成功 |
| `6d7920d` 领域模型 | 用类行为和 Composite 实现六种图形；发现跨父级分组位置并未被需求明确，选定稳定文档顺序并记录规则 | 6 项领域测试、类型检查 |
| `0327970` 命令历史 | 用命令对象和前后快照处理撤销；针对失败命令误清空 redo、IO 失败误封锁历史等风险写测试 | 累计 11 项测试 |
| `8bd201d` SVG IO | 缺 id 不能边读边随意命名，否则会撞上文件后部显式 ID，改为先扫描再分配；严格 XML 解析，中文和特殊字符交给 DOM 库转义；修正 DOM 可空类型与测试断言签名的编译错误 | 累计 17 项测试 |
| `7d995a5` CLI | 区分行首 # 注释和颜色；保留 token 是否带引号的信息，避免把文本中的 in 误识别为父容器子句；接通全部命令并回放流程图 | 累计 22 项测试、构建、真实 SVG 和输出文件 |
| `3d02898` 验收修正 | 自查发现根 svg 的 id 未保留，补上根 ID 保留、全局预留与冲突回归；支持导入 px 几何值；补齐每类编辑的完整状态 undo/redo 与 AST 架构检查，建立 CI | 累计 26 项测试，本地与 GitHub CI 通过 |
| 文档收尾 | 补齐架构组件图、变化点、语义边界与质量依据；实际终端验证 svg> 和 EOF，浏览器查看生成流程图；最终提交打 final tag | 使用 Git/CI 记录核对最终结果 |

**方案修订**：初稿的四层模块与组合根保留。实现中新增 GeometryShape 复用几何规则、Numbers 集中数值约束、CommandArguments 隔离参数校验；这些是既有模块内部细化，没有引入反向依赖。导入时保留 viewBox、根 ID 和常用展示属性，是 SVG 往返测试推动的补充，未扩大 CLI set 白名单。

## 4. 一致性自查

### 4.1 模块划分是否一致

一致。实际生产代码为 domain/application/infrastructure/cli 与 main.ts，和初稿一致；内部辅助类已在上一节记入修订。每个生产类单独一个同名文件，Shape 的几何/样式不是公共可写数据袋。业务操作集中在对象方法内，未出现跨模块的过程式图形分派函数。

### 4.2 依赖方向是否被违反

自动化 AST 检查通过，当前没有发现违反项。抽样结果：

- Group → Shape/Numbers：领域内部依赖。
- MoveCommand → EditCommand/SvgDocument：命令通过 Shape 多态操作，不导入 Rect 或 Circle。
- EditorSession → DocumentStore/History/SvgDocument：没有导入 fs 或 SvgCodec。
- FileDocumentStore → DocumentStore（type-only）、SvgCodec、Node 文件 API：符合适配器职责。
- SvgCodec → ShapeFactory/SvgDocument/Shape/Numbers 与 xmldom：不依赖 CLI。
- Repl → CommandFactory/Lexer 与 Node readline：负责交互，不执行文件保存。

生产 AST 检查还验证“一类一文件、同名、无顶层自由函数、无 switch”。该检查不能单独证明全部面向对象设计质量，因此另行阅读了 Shape、Group、命令类和两个工厂；图形类型分派仅在 ShapeFactory，命令名称分派仅在 CommandFactory。两个静态工厂仍明确列为后续插件阶段待重构点。

## 5. 质量保证手段

### 5.1 可复现检查

```sh
npm ci
npm run check
# 等价于：严格类型检查 + 测试 + TypeScript 编译
node dist/main.js < examples/flowchart.commands
```

验收结果：**26 项自动测试通过，TypeScript 严格检查和编译通过**。GitHub Actions 在 push 和 pull_request 上执行相同检查，并用编译产物回放案例，比较生成 SVG 与仓库版本是否一致。CI 页面：<https://github.com/Skitre/advsoftware-lab1-svg-editor/actions>。

| 测试文件 | 数量 | 验证的真实风险 |
| --- | ---: | --- |
| architecture.test.ts | 2 | 层间依赖、一类一文件、文件命名、无 switch/顶层自由函数 |
| domain.test.ts | 6 | 六类图形、容器递归、唯一 ID、循环、分组次序、缩放/属性校验、z-order 与深拷贝 |
| history.test.ts | 5 | 单次命令粒度、子树恢复、失败保留 redo、IO 屏障、数值溢出原子性、路径与快照隔离 |
| svg.test.ts | 7 | 所有形状往返、中文与 XML 转义、自动 ID 冲突、无效 XML、外部展示属性、box 降级、真实文件 IO、根 ID |
| cli.test.ts | 6 | 引号/注释、全部命令接线、失败不变、进程错误恢复、作业案例、所有编辑的完整 undo/redo |

需求对照如下：

| 需求 | 验收证据 |
| --- | --- |
| TypeScript 面向对象、Command、Composite | 类层次、具体命令类、架构测试及对象行为测试 |
| 六种图形与容器/叶子统一编辑 | domain 与 cli 测试覆盖全部类型和嵌套操作 |
| ID 定位、自动补 id 与警告 | SVG 预扫描测试，显式/生成/根 ID 冲突检查 |
| 编辑可撤销、失败不改变状态 | 每类命令前后状态完整比较；失败时保留文档及 redo |
| 文档 IO 屏障与显示命令跳过历史 | history/cli 测试覆盖成功、失败、查询分支 |
| SVG 保存后可打开、可以读回 | codec 往返、真实文件 IO、浏览器预览流程图 |
| tree 属性内联、show 父级与属性、help 完整 | CLI 输出检查与案例 transcript |
| 开发过程可追溯、远程仓库、final tag | 分阶段 Git 提交、公开仓库、最终 tag 链接 |

手工验收包括：真实 PTY 下出现 `svg>`；创建嵌套图形后 move/undo/show 得到原始坐标；Ctrl-D 正常退出；浏览器正确显示蓝色“开始”节点、橙色“处理数据 v2”节点和连接线。单元测试不能替代这一预览检查。

### 5.2 支持范围与限制

本项目按 Phase 1 实现。`create box` 或其他非内置类型会报 `unknown shape type: ... (is the plugin loaded?)`。外部 `g data-kind="box"` 保留标记但作为普通 g 处理，因此没有插件专属传播或禁止解组语义。

SVG 读取支持六种内置标签、嵌套 g、数值/px 尺寸、viewBox、公共样式以及常见文本展示属性。XML 注释不保存；不支持的元素或属性、嵌套 tspan、DTD/自定义实体会明确拒绝。不会假装完整支持浏览器的全部 SVG 特性。

外部 `transform` 会原样保留；move/scale 修改的是形状本地几何坐标，并不把外部变换矩阵展开成屏幕坐标。对已有变换的图形重新分组/归属时也不补偿矩阵。此限制不影响课程中由 CLI 创建、没有外部 transform 的全部必做操作和案例；完整坐标变换引擎留作未来扩展。

完整快照历史的空间开销约为 O(历史长度 × 文档大小)，ID 查找采用遍历，适合本阶段小图形文档；没有进行海量 SVG 性能或并发文件编辑压力测试。

## 6. 依赖与资料

运行时仅使用 [@xmldom/xmldom](https://github.com/xmldom/xmldom) 处理 XML；图形、命令、历史均由本项目实现。开发依赖为 TypeScript、tsx、Node 类型声明；版本由 package-lock.json 固定。测试采用 Node 内建 test/assert，无额外测试框架。架构图采用 [PlantUML](https://plantuml.com/component-diagram)，源码和已生成 SVG 均在 doc 目录。
