# 360 集团 AI 应用（侧重前端）一面答案与技术原理

适用岗位：26春-AI应用开发工程师（侧重前端方向）（北京）(J12343)  
内容来源：用户提供的面试准备材料；本文件仅保留可公开整理的脱敏版本。
整理日期：2026-07-24

> 说明：本文给的是“可口述答案框架”，不是要求逐字背诵。涉及项目数据、代码路径和完成度时，只能使用你的真实情况。文中的 `[请填写]` 必须在面试前替换；没有测量过的数据要明确说没有，不能编造。

建议使用顺序：

1. **先练 P0**：第 2 节开场、第 5 节 RAG/Agent、第 6 节流式前端，以及 URL、TCP、HTTP 和两道链表题。
2. **再补简历风险**：第 3、4 节，确保每一项都能指向真实代码、故障或取舍。
3. **最后扩展 P1**：浏览器安全、React Hooks、工程化和其余算法。

口述时不要一次倒完所有知识点。先答 30-60 秒，面试官继续问再展开“技术原理”和“边界”。

P0 题库对照：

| 题库编号 | 答案位置 |
|---|---|
| 1-7：开场、岗位、项目价值 | 2.1-2.7 |
| 8-15：RAG 全链路与安全 | 5.1-5.9 |
| 16-22：SSE 与 AI 前端 | 6.1-6.10 |
| 23-27：Agent、MCP、Transformer | 5.10-5.16 |
| 28：React 与 Vue | 3.1、6.11-6.12 |
| 29：URL 到渲染 | 7.1-7.4 |
| 30：手写题 | 8.1、8.2、8.5 为最高优先级 |

## 1. 通用答题方法

技术题建议用四层结构：

1. **先下定义或给结论**：10-20 秒，让面试官知道你抓住了核心。
2. **再讲机制**：按数据流、状态变化或调用顺序展开。
3. **结合项目**：说明自己在哪里使用、为什么这样选。
4. **主动讲边界**：指出失败场景、替代方案和未完成部分。

项目题建议用 STAR 的工程化版本：

> 用户/场景 -> 问题与约束 -> 我的职责 -> 方案与取舍 -> 结果证据 -> 不足与下一步。

遇到不会的问题，不要用名词堆砌。可以回答：

> 这个点我没有在生产环境实际处理过。我目前的理解是……如果让我落地，我会先通过……验证，再选择……。我不确定的是……，面试后我会补齐。

## 2. 开场与业务题

### 2.1 90 秒自我介绍

公开练习框架：

> 一段合格的 90 秒技术岗位自我介绍只回答三件事：当前定位、与岗位直接相关的两条可验证证据、能力边界与求职动机。可按“15 秒定位 + 55 秒项目证据 + 20 秒边界和动机”组织。

练习要求：

- 每条能力都能对应页面、代码、测试或故障复盘。
- 不按简历时间顺序逐段朗读，不把团队成果包装成个人独立完成。
- 姓名、学校、地点和私人履历只保存在个人版本中，不进入公共题库。

### 2.2 为什么选择 AI 应用前端？

30 秒版本：

> 我喜欢的是模型能力和真实产品之间的工程层。普通接口通常是确定性结果，而 AI 产品还要处理流式输出、上下文、引用、工具过程、取消、失败恢复和不可信输出。我的前端和 Flask/RAG 经历正好覆盖这个交界面，所以我希望做 AI 应用前端，而不是把自己定位成模型训练工程师。

技术原理：

- 大模型输出具有非确定性、延迟长、结果分段、可能失败等特征。
- AI 前端的状态不只是 `loading/success/error`，而可能是：

```text
idle
  -> submitting
  -> retrieving
  -> streaming
  -> tool_running / approval_required
  -> completed / cancelled / failed
```

- UI 需要展示引用、工具调用、阶段进度和可恢复状态。
- 模型输出、检索内容和工具结果都应被当作不可信输入。

项目结合：

> 在 AI 知识工作台 中，我关注的不只是调用模型 API，而是用户怎样选择上下文包、后端怎样检索少量相关片段、前端怎样持续接收和展示结果，以及失败后怎样给出明确状态。

### 2.3 为什么选择 360？

可口述版本：

> 我关注到这个岗位属于 PC安全与办公事业部，JD 直接写了 AI 应用、Agent、实时数据、SSE/WebSocket、Tools 和 MCP。360 已公开的 AI 浏览器包含网页、PDF、音视频理解和连续追问，企业知识库也强调文档解析、MCP、智能体与权限管控。这些产品的核心难点不是单纯做一个聊天框，而是把内容理解、检索、实时交互、安全和权限组合成稳定产品。我的 AI 知识工作台、SSE 和复杂流程经验与这类业务比较契合。

边界：

- 可以说“与公开产品形态契合”。
- 不能说“我确定会进入 AI 浏览器团队”。
- 官方只公开到事业部，具体小组和产品线未知。

参考：

- [360 AI 浏览器](https://browser.360.cn/se/help/information-detail_AIwd_AIllqsx360.html)
- [360 AI 企业知识库](https://aiplus.360.cn/ai)
- [360 官方岗位 J12343](https://360campus.zhiye.com/campus/detail?jobAdId=d28994e2-194e-42a6-9d89-608796e0edef)

### 2.4 AI 知识工作台 两分钟项目介绍

安全版本：

> AI 知识工作台 是我在原 Vue3 + Flask AI 博客基础上升级的知识工作台，目标用户是需要反复使用真实资料的学习者、写作者和小团队。原来的问题是文档、网页和笔记比较零散，每次使用 AI 时要么重新整理，要么把大量全文塞进 Prompt，成本高、噪声多，也不便追溯。
> 
> 我设计的核心闭环是：资料进入上下文包，经过清洗、分块和索引；用户提问或起草时只检索少量相关 Chunk，组合成上下文交给模型；生成结果再沉淀回知识库。前端使用 Vue3、TypeScript、Pinia，后端使用 Flask、SQLAlchemy 和 MySQL，并通过 SSE 返回长文本。  
> 
> 我主要负责 `[请按真实情况填写：数据模型/检索服务/Embedding 配置/SSE/前端工作台/权限]`。一个重要取舍是 `[请填写]`。例如，为了让 MVP 在没有 Embedding 配置时也可运行，我保留关键词检索作为默认或回退路径；语义检索只有在模型、维度和索引状态一致时才启用。  
> 
> 当前已经完成的是 `[请填写可现场演示的功能]`；仍不足的是 `[例如自动化评测、生产安全、文件解析]`。如果继续做，我会优先补检索评测集、run 级事件模型和索引版本管理，因为这三项决定系统能否从演示走向稳定使用。

面试官最关注的不是功能数量，而是：

- 旧项目复用了多少。
- 一个月内真正完成了什么。
- 哪段代码是你最熟悉的。
- 是否有评测、测试或真实用户证据。
- 你是否清楚 MVP 与生产系统的差距。

### 2.5 为什么使用 RAG，而不是全文 Prompt、普通搜索或微调？

30 秒版本：

> RAG 的核心价值是把外部、可更新的知识在推理时按需取回，而不是把所有内容塞给模型或重新训练模型。它能降低上下文噪声和 token 成本，支持知识更新与引用，但效果依赖文档解析、切片、检索和评测。关键词搜索便宜、可解释，适合作为回退；微调更适合改变行为或风格，不适合频繁更新事实知识。

比较思路：

| 方案 | 优点 | 主要问题 | 适合场景 |
|---|---|---|---|
| 全文 Prompt | 实现最快 | 成本高、超上下文、噪声多 | 短且固定的资料 |
| 关键词搜索 | 便宜、可解释 | 同义表达召回弱 | 精确术语、降级 |
| RAG | 知识可更新、可引用 | 链路长、需要评测 | 企业知识、文档问答 |
| 微调 | 改变行为、格式、风格 | 训练成本、知识难更新 | 稳定任务模式 |

### 2.6 一个月为什么能完成这么多？

推荐回答：

> 这个项目不是一个月从零开始。账号、文章、基础后台和部分接口来自原 AI 博客；这个月我集中完成的是 `[列出真实新增模块]`。我会把完成度分成三类：已经端到端跑通并能演示的、只有实验性实现的、仍在设计或待增强的。简历上的每一项我都应该能指到对应代码和验证方式。

不要回答：

- “都是我从零写的”，如果实际复用了旧项目。
- “已经生产可用”，如果没有部署、监控、测试和真实负载。
- “AI 帮我全写完了”。

### 2.7 项目最大的不足或失败是什么？

可选答案：评测不足。

> 我前期更关注把 RAG 闭环跑通，主要通过几组演示问题主观观察效果，没有及时建立固定测试集。这会导致我无法严格回答混合检索比关键词检索提升了多少。后来我意识到应该把检索与生成分开评测：先准备问题、相关 Chunk 和标准答案，评估 Recall@K、MRR、引用准确率，再看最终回答的忠实度、延迟和成本。当前如果这些数据还没完整测完，我会明确把它作为项目不足，而不是编一个提升百分比。

这类回答的优势：

- 承认真实不足。
- 说明为什么是问题。
- 给出可执行改进方案。
- 没有伪造结果。

## 3. 简历高风险问题的标准说法

### 3.1 React 项目经验不足怎么办？

可口述版本：

> 我的生产项目以 Vue 为主，所以我不会把自己包装成有多年 React 项目经验。但组件化、单向数据流、状态拆分、路由、请求竞态和性能优化是可迁移的。我重点补了 React 的函数组件、Hooks、不可变更新、闭包和 effect 生命周期。Vue 的 composable 可以映射到 custom hook，Pinia 可以映射到 Context 或外部 store，但 React 更依赖显式状态更新和闭包语义。我有信心快速迁移，同时也清楚需要通过真实项目继续积累。

如果还没有系统学习 React，不要说“已经补了”；面试前至少完成一个包含列表、表单、请求取消和流式消息的小项目。

### 3.2 是否接受 Go？

可口述版本：

> 我接受。我的后端经验目前主要是 Flask、SQLAlchemy、MySQL、JWT 和 REST API，所以 HTTP、鉴权、数据访问和接口设计的基础可以迁移。Go 方面我不会夸大生产经验，我会重点补 goroutine、channel、context、错误处理和 HTTP 服务。对 AI 流式接口来说，Go 的并发模型和 context 取消也很适合做连接与任务生命周期管理。

### 3.3 如何使用 Codex、Cursor 等 AI 编程工具？

推荐答案：

> 我主要把 AI 编程工具用在代码库理解、方案比较、生成重复性骨架、补测试、排查问题和重构建议上。我不会直接接受大段生成代码，而是先给清楚约束和验收条件，再检查 diff、类型、异常路径和安全问题，最后运行测试和真实场景验证。涉及密钥、用户数据和生产配置时不直接发送；对工具执行、文件修改和部署操作保留人工确认。AI 提高的是反馈速度，代码责任仍然在开发者。

追问“举一个例子”时必须讲真实案例：

> 在 `[请填写真实项目]` 中，我让工具协助 `[理解/重构/补测试]`，我发现它生成的 `[具体错误]`，最后通过 `[测试/日志/文档]` 修正。

### 3.4 异地求职时如何说明地点与到岗意愿？

公开练习框架：

> 地点与到岗意愿属于真实约束，不是标准答案。应说明当前选择、可确认的时间范围和仍待决定的前置条件，并让招聘系统、简历和口头说法保持一致。

任何候选人的具体城市、家庭安排、搬迁计划和到岗承诺都应只保存在私人笔记中。

### 3.5 简历与 GitHub README 的完成度怎样解释？

推荐原则：

> README、简历、演示和代码必须使用同一套完成度口径。

可口述版本：

> README 强调的是默认可运行路径和当前 MVP 边界，例如无 Embedding 时默认回退关键词检索；简历提到的 Hybrid Retrieval、RRF/MMR 和安全规则，我需要能够指出实际代码、配置和测试。如果其中某项只是实验分支或未达到端到端完成，我会明确称为实验性实现，而不是生产能力。面试前我会把 README 更新到和代码一致。

## 4. 项目型问题的技术原理速答

### 4.1 BLE 为什么常按 20 byte 分片？

30 秒版本：

> BLE ATT 默认 MTU 常见为 23 byte，写操作还需要约 3 byte 的 ATT 协议开销，所以很多环境下单次有效载荷是 20 byte。但 20 byte 不是永恒固定值，实际还要看 MTU 协商、平台 API 和设备固件。可靠分片还需要考虑序号、ACK、超时重试、发送节奏以及 UTF-8 字符边界。

更深原理：

- MTU 是 ATT 层单个 PDU 的最大长度。
- 默认常见值 23，写请求/通知的属性协议头会占用空间。
- 不应直接按 JavaScript 字符串长度切分，应先编码成字节数组。
- 多字节字符可能跨分片，但只要接收端先按字节重组、再统一 UTF-8 解码即可。
- 长数据需要应用层 framing，例如：

```text
version | messageId | seq | total | payload | checksum
```

### 4.2 配置流程为什么适合状态机？

30 秒版本：

> 状态机就是一张“流程交通图”：状态表示当前走到哪一步，事件表示刚发生了什么，守卫条件决定这次能不能跳转，副作用才负责连接设备或调用接口。它把合法路径集中定义，能直接排除“同时成功又失败”等非法组合，也让超时、取消和重试可以逐条测试。

示例：

```text
idle
 -> scanning
 -> device_selected
 -> connecting
 -> sending_wifi
 -> verifying
 -> bound

任一步都可能 -> failed / cancelled
```

需要补充：

- 持久化的是可恢复业务状态，不是活跃 BLE 连接本身。
- 恢复时要做 schema version、TTL 和幂等检查。
- WiFi 密码等敏感数据不应长期明文持久化。

### 4.3 配置化表单如何设计？

30 秒版本：

> schema 可以先理解为一份“表单说明书”，它描述每个字段的类型、默认值、校验、显隐和权限，而不是把规则散落在组件里。字段联动用依赖关系只重算受影响项；异步校验要取消旧请求或忽略旧结果；后端仍要做最终权限与业务校验。

核心模型：

```ts
type FieldSchema = {
  key: string
  component: string
  defaultValue?: unknown
  visibleWhen?: Condition[]
  disabledWhen?: Condition[]
  rules?: Rule[]
  asyncValidator?: ValidatorKey
}
```

技术原则：

- schema 只保存可序列化配置，复杂函数通过受控注册表引用。
- 联动关系建成依赖图，避免任意深层 watch。
- 异步校验需要请求序号或 AbortController，防止旧结果覆盖新输入。
- schema 要有版本，历史单据要明确使用旧规则还是迁移。
- 前端显隐是体验控制，最终权限和业务合法性必须由后端校验。

### 4.4 `Promise.allSettled` 为什么适合批量上传？

30 秒版本：

> `Promise.all` 遇到第一个 reject 就整体 reject，其他任务虽然可能还在执行，但调用方拿不到完整结果；`allSettled` 会等待每个任务结束并返回 fulfilled/rejected 状态，适合允许部分成功的批量上传。不过它不负责限制并发，也不等于自动重试，所以大量文件仍要配合并发池、进度、取消和重试。

### 4.5 Three.js 点位如何从世界坐标映射到屏幕？

原理：

1. 取对象世界坐标。
2. 用相机的 view-projection 矩阵投影到 NDC。
3. 将 `[-1, 1]` 的 NDC 映射到容器像素。
4. 叠加容器相对视口偏移。

概念公式：

```text
clip = ProjectionMatrix * ViewMatrix * worldPosition
ndc = clip.xyz / clip.w
x = (ndc.x + 1) / 2 * width + containerLeft
y = (1 - ndc.y) / 2 * height + containerTop
```

还要处理：

- 相机背后或超出 NDC 的点不显示。
- 设备像素比与 CSS 像素。
- 模型遮挡可用 Raycaster 或深度信息判断。
- geometry、material、texture、listener 不释放会产生内存泄漏。

## 5. RAG、Agent 与模型原理

这一节建议按“先给结论，再讲机制，最后落到项目边界”的顺序回答。涉及 AI 知识工作台 时，只说代码中真实存在的能力，不把规划或实验说成已经上线。

### 5.1 请完整讲一下 RAG 流程

30 秒可口述版本：

> RAG 不是把整份资料直接塞进 Prompt，而是把外部知识先建立成可检索的证据库。离线阶段完成解析、清洗、切块、元数据和索引；在线阶段对问题做权限过滤和检索，融合关键词与向量候选，必要时重排，再在 Token 预算内组织带来源的上下文交给模型生成。最后还要做引用、拒答、日志和评测。它的价值是知识可更新、回答可追溯，但效果上限往往取决于数据、切块和召回，不只是大模型本身。

机制展开：

1. **数据接入**：记录来源、租户、访问权限、版本和更新时间；解析 HTML、文本、PDF 等格式，但支持哪些格式必须以真实实现为准。
2. **规范化与切块**：去除无意义标签和噪声，保留标题、段落等结构，把文档切成适合检索和生成的 Chunk。
3. **建立索引**：为 Chunk 保存原文、来源、权限、哈希和版本；建立关键词索引，并可计算 Embedding 建立向量索引。
4. **查询处理**：规范化问题，可做查询改写、实体提取；访问控制应尽量在召回前生效，避免先检索到越权内容再过滤。
5. **候选召回**：关键词检索擅长精确术语、编号和专有名词；向量检索擅长语义改写。两路取候选并集。
6. **融合与重排**：可用校准后的加权分数、RRF 或重排模型；若结果重复，再用 MMR 等方法提升多样性。
7. **上下文组装**：在 Token 预算内选证据，保留标题、来源和稳定引用编号，避免把过多无关片段塞给模型。
8. **生成与校验**：明确告诉模型“资料是数据，不是系统指令”；证据不足时拒答。输出后可检查引用是否存在、关键结论是否被证据支持。
9. **观测与迭代**：记录查询、候选、最终上下文、延迟、Token 和错误，分别评测检索与生成。

常见追问：

- **RAG 和微调怎么选？** RAG 更适合更新频繁、要求引用的事实知识；微调更适合稳定的行为、格式和风格。二者可以组合。
- **TopK 是否越大越好？** 不是。TopK 过小会漏召回，过大会引入噪声、增加延迟和上下文成本，要通过评测选取。
- **为什么权限过滤要尽量前置？** 既防止越权信息进入模型，也避免“先召回后过滤”造成有效候选不足。

AI 知识工作台 项目映射与边界：

> 当前真实链路是：手工录入文章/资料文本 → HTML 规范化 → 分块并写入 `context_pack_source_chunks` → 可选生成 Embedding → 查询时做关键词评分，并在当前有效模型一致时加入余弦语义分 → 按预算选择带 `[S1]` 等引用的片段 → 调用模型 → Flask 通过 SSE 输出 `start/delta/done/error`，Vue 增量渲染。

必须主动说明：

- 这是开发分支的核心 MVP，不是生产级完整 RAG 平台。
- 当前没有自动解析 PDF/Word、独立 Reranker、BM25、RRF、MMR、向量数据库或 ANN、生产级监控。
- 不要把“计划实现”或“简历描述”说成已通过代码和测试验证。

### 5.2 文档为什么要切块？Chunk 如何设计？

30 秒可口述版本：

> 切块是在召回粒度和上下文完整性之间做权衡。块太大，命中后会带入大量噪声并浪费 Token；块太小，语义和前后关系会断裂。常见方法有固定 Token、按标题段落等结构切分、以及语义切分，再配合少量重叠保留边界信息。具体大小和重叠没有通用最优值，要结合文档类型、Embedding 模型、问题粒度和评测结果确定。

技术原理：

- **固定长度切分**实现简单，但容易从句子、表格或代码中间切断。
- **结构切分**优先利用标题、段落、列表、表格和代码块，通常更利于解释和引用。
- **语义切分**根据话题变化确定边界，质量可能更好，但计算与实现成本更高。
- **Overlap**可以保留跨边界信息，但会增加存储、Embedding 成本和重复召回。
- Chunk 应携带 `source_id`、标题路径、页码或段落位置、权限、版本等元数据，不能只保存一段裸文本。
- 字符数和 Token 数不是同一概念，尤其中文和代码差异较大。索引切块可以按字符近似，但生成上下文预算最好使用对应模型的 tokenizer，或明确说明只是估算。

常见追问：

- **表格和代码怎么切？** 尽量保持表头与数据行、函数签名与函数体完整；必要时增加父级摘要或标题路径。
- **重叠是不是越大越好？** 不是。重叠过大会导致重复候选挤占 TopK，还会增加索引与上下文成本。
- **如何选参数？** 建立包含短问、长问、精确名词、跨段问题的验证集，比较 Recall@K、重复率、答案引用质量和成本。

AI 知识工作台 项目映射与边界：

> 当前实现先清理 `script/style` 和 HTML 标签，并恢复 `<br>`、段落等换行；配置是 `max_chars=900`、`overlap=120`。实现会优先按段落聚合，只有单个段落超过 900 个字符时才按步长 780 滑窗，所以普通段落块之间并不一定有 120 字符重叠。

不要说：

- “使用 900 Token 切块”——实际是字符近似。
- “所有相邻 Chunk 都有 120 字重叠”——实际不是。
- “已经实现语义切块”——当前没有。
- “资料更新只增量重算变化块”——当前更新会删除旧 Chunk 后全量重建。

### 5.3 什么是 Hybrid Retrieval？为什么关键词和向量要结合？

30 秒可口述版本：

> Hybrid Retrieval 就是让两种“找资料的方法”合作：关键词检索擅长错误码、编号和原句，向量检索擅长同义表达。两路先各自找候选，再按排名融合或统一重排，能互相补漏；但效果必须用同一批问题做对照评测，不能默认混合一定更好。

技术原理：

- 稀疏检索依据词项匹配，例如倒排索引和 BM25；优势是精确、可解释，缺点是对同义改写较弱。
- 稠密检索把查询和文档映射到同一向量空间，以余弦相似度或点积找近邻；优势是语义泛化，缺点是可能错过罕见编号，也受模型版本与领域分布影响。
- 两路候选先做并集，再选择：
  - 对分数归一化、校准后加权；
  - 用 RRF 按名次融合，绕过分数量纲差异；
  - 用 Cross-Encoder 或其他 Reranker 对候选重新打分。
- 去重键应使用稳定的 Chunk 身份，不能只按当前数组下标去重。

常见追问：

- **为什么不能直接加 BM25 分和余弦分？** 二者范围和分布不同，同一个数字不代表相同置信度；应校准、归一化或采用按排名融合。
- **向量失败怎么办？** 明确降级为关键词检索，并记录降级原因；不能让整个问答不可用。
- **是否一定优于单路检索？** 不一定，必须在同一评测集和相同生成配置下做消融实验。

AI 知识工作台 项目映射与边界：

> 当前不是 BM25 加向量数据库。关键词是应用层启发式评分：标题每命中一个查询词加 8，正文词频计数封顶 5；来源优先级使用 high/medium/low 权重 1.35/1.0/0.75。若 Embedding 有效，则把 `max(cosine, 0) * 100` 作为语义分参与组合。这个 `*100` 是经验尺度，必须靠评测调参，不能宣称具有概率意义。

准确说法是“关键词启发式评分 + 可选向量相似度的混合召回，失败时回退关键词”；不要说已经使用 BM25、标准化分数融合或经过线上效果验证。

### 5.4 RRF 是什么？公式和参数怎么解释？

30 秒可口述版本：

> RRF 是“只看名次的合榜方法”。同一段资料在关键词榜和向量榜越靠前，累加得到的分数越高；它不直接相加两种含义不同的原始分数。`k` 控制榜首与后续名次的差距，常见的 60 只是实验起点，候选窗口和参数仍要按业务评测。

公式：

```text
RRF(d) = Σ 1 / (k + rank_i(d))
```

- `rank_i(d)` 是文档 `d` 在第 `i` 个结果列表中的名次；未出现则该路不贡献。
- `k` 越小，越强调头部名次；`k` 越大，不同名次之间差异越平缓。
- 原论文实验中常见 `k=60`，这是经验起点，不是所有业务的固定最优值。
- 若不同检索器可靠性不同，可扩展成 `Σ w_i / (k + rank_i)`，但要说明这是加权扩展，而非原始无权公式。

实现思路：

1. 分别取关键词和向量 TopN。
2. 用稳定 Chunk ID 合并候选。
3. 按每路名次累计 RRF 分数。
4. 排序后取融合 TopK，再决定是否进入 Reranker 或 MMR。

常见追问：

- **RRF 的优势是什么？** 不需要让 BM25 分和余弦分处于同一数值尺度。
- **缺点是什么？** 只看名次，不看第一名领先第二名多少；结果也受各路召回窗口影响。
- **复杂度如何？** 累计阶段近似为所有输入结果长度之和，再对候选并集排序。

AI 知识工作台 项目边界：

> 当前代码没有 RRF。真实实现是两路启发式原始分组合。面试时可以把 RRF 作为明确的下一步改进方案，但不能说“项目已经用 RRF 融合”，除非能现场指出实现、配置和测试。

### 5.5 MMR 是什么？如何减少重复上下文？

30 秒可口述版本：

> MMR 是“边选相关资料，边避免重复”。它每轮选择一段既贴近问题、又不太像已选内容的候选，`λ` 越大越看重相关性，越小越看重多样性。它只能整理已经召回的候选，不能把第一阶段漏掉的证据重新找回来。

公式：

```text
argmax(d ∈ R \ S) [
  λ · Sim1(d, query)
  - (1 - λ) · max(s ∈ S) Sim2(d, s)
]
```

- `R` 是候选集，`S` 是已选集合。
- `λ` 越接近 1 越重视相关性，越接近 0 越重视多样性。
- 第一个结果还没有已选项，冗余项可视为 0。
- `Sim1` 与 `Sim2` 若尺度不同，需要先校准，否则 `λ` 没有直观意义。

常见追问：

- **MMR 是召回还是重排？** 通常是对已召回候选做迭代选择或重排，不提高原始召回率。
- **和去重有什么不同？** 精确去重判断“是否相同”；MMR 还会降低内容高度相似但不完全相同的片段。
- **复杂度如何？** 若候选数为 N、选择 K 个，缓存向量后朴素选择约需 O(KN) 次相似度比较。

AI 知识工作台 项目边界：

> 当前没有 MMR，也没有独立的语义去重重排。可以建议先扩大候选池，再用 MMR 选入上下文，并在评测中观察重复率和 Recall 的变化；不能把它描述为现有能力。

### 5.6 RAG 应该如何评测？

30 秒可口述版本：

> 评测 RAG 不能只看最后答对没有：先检查正确资料有没有被找回、排得是否靠前；再检查回答是否覆盖要点、是否忠于证据、引用是否指对；最后看延迟、成本、失败率和越权风险。测试集和文档、索引、模型、Prompt 版本都要固定，才能知道改动究竟改善了哪一层。

核心指标：

```text
Recall@K = TopK 中相关结果数 / 全部相关结果数
MRR = 平均(1 / 第一个相关结果的名次)
DCG@K = Σ (2^rel_i - 1) / log2(i + 1)
nDCG@K = DCG@K / IDCG@K
```

- **Hit@K**：TopK 是否至少包含一个相关结果，适合单证据问答。
- **Recall@K**：相关证据是否被找全，适合多证据问题。
- **MRR**：第一个相关结果是否靠前。
- **nDCG**：相关性有等级时，评价整体排序质量。
- **Faithfulness**：回答中的主张能否由给定证据支持。
- **Citation precision/recall**：引用是否真的支持主张、关键主张是否都有引用。
- **拒答正确率**：测试集中必须包含库内无答案、越权和过期资料问题。

评测设计：

- 测试集覆盖精确编号、罕见名词、同义改写、跨段多跳、冲突资料和无答案问题。
- 固定数据快照、索引版本、Embedding 版本、模型、Prompt 与随机参数。
- 分开记录“检索正确但生成错误”和“检索已漏掉证据”，否则无法定位瓶颈。
- LLM Judge 可以提高评测效率，但不是绝对真值，应抽样做人工校准。
- 有足够样本时报告置信区间，避免用几个演示问题下结论。

常见追问：

- **忠实是否等于正确？** 不等于。回答可能忠实复述了一份错误或过期资料，所以还要检查来源质量和事实正确性。
- **离线好是否代表线上好？** 不一定，还要看真实查询分布、延迟、成本、用户反馈和安全事件。

AI 知识工作台 项目边界：

> 当前尚未建立完整的版本化 Gold Set，也没有可核验的 Recall@K、MRR、nDCG 或 Faithfulness 结果。因此正确回答是“已跑通链路，但效果还没有被系统量化证明；下一步会建立数据集做消融”，不能编造“Hybrid 提升了多少百分比”。

### 5.7 Embedding 为什么必须做版本管理？如何无损迁移？

30 秒可口述版本：

> Embedding 是模型给文本建立的一套“坐标”。换模型就像换了一张坐标系，即使向量长度相同，新查询也不能拿去和旧文档向量直接比较。迁移时应并行重建新索引，验证数量和检索效果后一次切换查询入口，并暂留旧索引以便回滚。

技术原理：

- 向量维度只是数组长度；真正决定语义空间的是模型参数、训练目标和后处理。
- 一个可追踪的索引版本至少应包含：

```text
provider
model_revision
dimension
normalization
preprocess_version
chunker_version
source_version / content_hash
created_at
```

- 迁移步骤：
  1. 冻结旧索引继续提供服务。
  2. 后台用新版本重算全部有效 Chunk。
  3. 检查数量、维度、空向量、抽样近邻和离线评测。
  4. 可做 Shadow Read 或双读比较，但不要把两种向量混在同一次余弦排序里。
  5. 通过索引别名或配置一次性切换查询和文档版本。
  6. 保留旧索引一段时间，异常时快速回滚，再延迟清理。

常见追问：

- **维度相同能混用吗？** 不能，维度相同只代表形状相同。
- **是否每次更新都全量重算？** 模型或预处理语义发生变化通常需要重算；纯元数据变化且文本未变时可通过版本化缓存复用。
- **余弦还是点积？** 取决于模型说明和向量是否归一化；不能把某个提供商的特性泛化到所有模型。

AI 知识工作台 项目映射与边界：

> 当前 Chunk 记录了 provider、model、dimension 和 `embedded_at`，向量以 JSON 存在 MySQL，余弦相似度在应用层计算。若向量缺失、调用失败、当前模型不一致或维度不一致，就回退关键词检索。即使维度相同但模型不同，也不应混用。

不要说已经使用向量数据库、HNSW/ANN、双索引灰度迁移或原子别名切换；这些是生产化设计，不是当前实现。

### 5.8 `content_hash` 能做什么？如何做安全去重？

30 秒可口述版本：

> `content_hash` 是内容的数字指纹：规范化后的字节完全相同，哈希通常相同，可用于判断是否变化和复用计算结果。它不能证明两段话语义相同，更不能证明租户、权限和引用关系相同；缓存键仍要包含内容处理版本、模型版本和权限边界。

技术原理：

- **原文件哈希**：判断二进制文件是否完全相同。
- **规范化文档哈希**：判断清洗后的逻辑内容是否变化。
- **Chunk 哈希**：判断某个片段文本是否可复用 Embedding。
- 哈希相等表示相同规范化字节序列，不表示两段话“语义相同”。
- 哈希函数存在理论碰撞；SHA-256 足以作为工程指纹，但关键数据仍应保留长度、来源和必要的二次校验。
- 推荐缓存键：

```text
chunk_hash
+ preprocess_version
+ chunker_version
+ embedding_provider/model/dimension
```

- 即使内容向量可复用，`source_id`、ACL、标题、版本和引用位置仍应分别保存，不能因去重丢失溯源或扩大权限。

常见追问：

- **是否能全局唯一约束 `content_hash`？** 通常不能直接这样做，同一文本可能合法地出现在多个来源中。
- **语义去重怎么做？** 先做精确哈希去重，再用向量相似度或 MMR 处理近似重复，但要设置阈值并保留来源。

AI 知识工作台 项目映射与边界：

> 当前 `content_hash` 是 Chunk UTF-8 文本的 SHA-256 十六进制指纹；数据库唯一约束实际是 `(source_id, chunk_index)`，不是 `content_hash`。同一文本出现在两个来源中可以同时存在。它现在主要为版本识别和未来增量复用预留，并未形成真正的哈希去重链路。

因此不能说“项目已通过 content_hash 实现增量更新和全局去重”。

### 5.9 如何防御 Prompt Injection 和 RAG 投毒？

30 秒可口述版本：

> Prompt Injection 的根因是模型可能把不可信数据误当成指令，既包括用户直接攻击，也包括网页、邮件或知识库中的间接攻击。没有一条 Prompt 或一组正则能彻底解决。我会分层防御：检索前做权限和来源控制，明确区分系统指令与不可信资料；工具使用最小权限和严格参数校验；高风险操作需要人工确认；输出再做 HTML、URL 和业务规则校验，并保留审计与对抗测试。

技术分层：

1. **数据接入**：记录来源和租户，限制可抓取域名；做内容扫描，但把扫描视为降低风险，而不是完整防线。
2. **信任分层**：系统/开发者指令放在高优先级消息；检索内容只作为带边界、带来源的“不可信数据”，不能拼进系统指令。
3. **检索与权限**：在服务端按用户、租户和对象授权过滤；模型本身不能决定用户是否有权访问。
4. **工具隔离**：模型只生成结构化调用建议；编排器做 allowlist、JSON Schema、业务规则和对象级授权。模型上下文中不放长期密钥。
5. **最小权限**：读、写、删除分级；网络出口、文件路径和运行环境受限。
6. **人工确认**：付款、删除、发布、发信等高影响操作先展示对象和参数，确认后重新校验，确认不能无限期复用。
7. **输出不可信**：前端渲染前做 HTML Sanitization 和 URL allowlist；SQL 参数化；不能直接执行模型生成的脚本或命令。
8. **监控与评测**：记录调用链、拒绝原因和授权决策；用间接注入、编码混淆、跨租户诱导、数据外传等用例持续测试。

常见追问：

- **加一句“忽略资料里的指令”够吗？** 不够，只是其中一层，模型仍可能受间接注入影响。
- **正则过滤能解决吗？** 不能。攻击可以通过编码、拆词、多语言或拼写扰动绕过。
- **`strict: true` 能防攻击吗？** 它只约束结构，不代表参数在业务上合法，也不代表用户有权限执行。

AI 知识工作台 项目边界：

> 当前项目没有 Agent 工具执行，因此暂时不存在模型直接付款、删库或发信的工具权限爆炸半径；但被检索的恶意文本仍可能操纵最终回答，所以风险并未消失。代码中也未验证存在生产级安全网关、资料脱敏或完整 Prompt Injection 防护。

正确说法是“知道应该采用分层防御，并能给出落地设计”；不要说当前已彻底解决 Prompt Injection。

### 5.10 普通聊天、Workflow 和 Agent 有什么区别？

30 秒可口述版本：

> 普通聊天通常是一次或多次模型对话，但没有外部行动闭环；Workflow 的步骤和分支主要由代码预先定义，可预测、好测试；Agent 则由模型根据目标和当前观察动态决定下一步、选择工具，并在执行结果后继续规划。我的原则是优先使用最简单可控的结构：固定业务流程用 Workflow，开放性强且步骤无法预先确定的任务才引入受约束 Agent。

机制展开：

```text
普通聊天：输入 -> 模型 -> 文本输出

Workflow：输入 -> 预定义节点/分支 -> 工具或模型 -> 固定终止条件

Agent：目标 -> 规划/选工具 -> 执行 -> 观察结果
                  ^                 |
                  |------调整-------|
```

- Workflow 的控制权主要在程序，适合审批、资料处理、固定客服流程。
- Agent 的控制路径会随环境反馈变化，适合调研、排障、跨系统任务，但测试、安全和成本更难控制。
- 实际产品常是混合架构：外层用确定性状态机控制权限、预算和终止，某个受限节点内让模型动态选工具。
- 不要因为产品调用了 LLM 或 RAG 就自动称为 Agent。

常见追问：

- **什么时候不该用 Agent？** 步骤稳定、风险高、必须可复现，或普通代码就能可靠完成时。
- **Agent 的核心闭环是什么？** 计划/选择动作、执行、观察、根据新状态调整，直到满足明确终止条件。

AI 知识工作台 项目边界：

> 当前是确定性的 RAG 调用链和 AI 工作台：应用代码决定检索、组装上下文、调用模型和 SSE 返回，没有模型自主选工具、规划、记忆或循环执行。因此不能称为完整 Agent，也没有通用 Workflow/DAG 引擎。

### 5.11 Function Calling 的完整链路是什么？

30 秒可口述版本：

> Function Calling 不是模型直接执行函数，而是模型根据工具的名称、描述和 JSON Schema 生成结构化调用请求。应用收到后仍要校验权限和参数，真正执行本地或远程函数，再把带 call ID 的结果返回给模型，模型才生成最终回答或继续请求工具。`strict` 模式能提高结构匹配，但不能替代业务校验、鉴权和人工审批。

标准链路：

1. 应用把用户输入和可用工具 Schema 发给模型。
2. 模型返回零个、一个或多个 Tool Call，包含工具名、参数和 call ID。
3. 编排器解析参数，做 Schema、类型、范围、对象权限和风险校验。
4. 应用真正执行函数；写操作带幂等键，设置超时、取消与重试策略。
5. 应用把工具结果与 call ID 返回模型。
6. 模型生成回答，或在预算内继续下一轮 Tool Call。

常见追问：

- **模型是否执行了函数？** 没有，模型只提出结构化调用；执行权在应用。
- **如何处理多个调用？** 只有相互独立、无副作用冲突的调用才并行；有依赖的必须串行。
- **`strict: true` 保证什么？** 保证输出尽量符合受支持的 Schema 子集，不保证事实正确、参数合理或调用已授权。
- **工具结果可信吗？** 也不一定，可能含错误或恶意内容，应当作为不可信输入处理。

AI 知识工作台 项目边界：

> 当前没有 Function Calling、工具注册表或模型—工具—观察结果的循环。SSE 只是把聊天生成结果流式传给前端，不代表模型在调用工具。

### 5.12 MCP 是什么？与 Function Calling 有什么关系？

30 秒可口述版本：

> MCP 是连接 AI Host 与外部能力的标准化客户端—服务器协议。Host 为每个 MCP Server 建立 Client，通过 JSON-RPC 协商版本与能力，并发现或调用 Tools、读取 Resources、使用 Prompts。Function Calling 是模型向应用表达“想调用哪个工具和参数”的结构化机制；MCP 解决这些能力如何标准发现和传输。Host 可以把 MCP 工具映射成模型工具 Schema，再把模型调用转换成 `tools/call`，两者互补但不等价。

核心组件：

- **Host**：承载 AI 应用，管理上下文、用户交互和安全策略。
- **Client**：Host 内与某个 Server 保持一对一协议连接。
- **Server**：暴露能力。
- **Tools**：可执行动作。
- **Resources**：可读取的上下文数据。
- **Prompts**：可复用的提示模板。
- **生命周期**：初始化并协商协议版本和 capabilities，正常请求/通知，最后关闭。
- **传输**：常见为本地 `stdio` 或远程 Streamable HTTP；是否使用流式响应并不决定它是不是 MCP。

关系示例：

```text
用户目标
 -> Host 把 MCP tools/list 的结果转成模型 Tool Schema
 -> 模型产生 Function Call
 -> MCP Client 发 tools/call
 -> MCP Server 执行并返回
 -> Host 校验结果并交回模型
```

常见追问：

- **MCP 自带权限控制吗？** 协议提供连接与能力交换框架，但应用仍必须实现认证、授权、用户确认、参数校验和审计。
- **Resource 与 Tool 区别？** Resource 偏向读取上下文，Tool 偏向执行动作；具体风险仍由服务端能力决定。
- **MCP 和 REST 谁替代谁？** MCP 可以封装或调用现有 REST 服务，重点是给 AI Host 提供一致的发现和调用方式，不等于所有后端 API 都要改写。

AI 知识工作台 项目边界：

> 当前没有 MCP Host、Client、Server，也没有 `initialize`、`tools/list`、`tools/call` 等协议链路。现有 Flask SSE 聊天接口不是 MCP；“使用 SSE”也不能据此称为旧版 HTTP+SSE MCP 传输。

### 5.13 Agent 如何防死循环、误操作和成本失控？

30 秒可口述版本：

> 我不会把执行权直接交给模型。模型只负责提出下一步，真正的权限、状态、预算和终止条件由编排器掌握。每次运行限制最大步骤、工具次数、Token、耗时和金额；对相同工具、规范化参数及状态结果做指纹，连续无状态变化就停止。写操作使用幂等键和对象级鉴权，高风险操作绑定参数进行人工确认，同时保留完整但脱敏的调用审计。

落地机制：

- **硬预算**：`max_steps`、总时长、输入/输出 Token、工具次数、单工具耗时、总成本和连续失败次数。
- **循环检测**：对 `(tool, canonical_args, relevant_state_hash/result_hash)` 建指纹；相同状态转移反复出现且没有新信息时，终止或请求用户介入。
- **有限状态机**：明确 allowed transitions 和 stop reason，不能仅依赖模型自己说“我完成了”。
- **幂等与重试**：写操作用与 run/call 绑定的 idempotency key；只对明确的瞬时错误做有限指数退避和 jitter。非幂等操作若结果不确定，不自动重试。
- **权限**：按用户、租户、对象和会话下发工具 allowlist，凭证最小权限，执行时重新鉴权，不能相信模型传来的 `userId`。
- **人工确认**：确认内容绑定动作、对象、参数、版本和有效期；确认后参数变化必须重新授权。
- **隔离与出口**：限制文件目录、网络域名、子进程和可访问密钥；工具结果也按不可信内容处理。
- **可恢复性**：超时、取消、Circuit Breaker；多步写入优先设计可补偿操作，而不是假设所有步骤都能回滚。
- **可观测性**：记录 run ID、step、call ID、模型/Prompt 版本、工具、参数摘要、授权结果、耗时、费用和停止原因，并脱敏密钥与个人信息。

常见追问：

- **为什么不能只设最大轮数？** 它能兜底成本，但不能提前识别重复调用和状态不前进。
- **失败后都重试是否更可靠？** 不是。非幂等写操作可能重复扣款或重复发送，必须区分错误类型和操作语义。
- **前端确认弹窗够吗？** 不够，后端必须重新鉴权，并校验确认绑定的参数未被替换。

AI 知识工作台 项目边界：

> 当前没有 Agent 循环和工具执行器，所以也没有上述完整的 step budget、工具幂等、审批绑定或循环检测实现。这些属于如果岗位要求扩展 Agent 能力时的设计答案，不应包装成现有项目成果。

### 5.14 Transformer 的整体架构是什么？

30 秒可口述版本：

> Transformer 用注意力机制直接建模序列中任意位置的关系。输入先变成 Token Embedding 并加入位置信息，每层主要由多头注意力、前馈网络、残差连接和 LayerNorm 组成。原始架构的 Encoder 做双向自注意力；Decoder 先做带因果遮罩的自注意力，再对 Encoder 输出做交叉注意力，最后预测下一个 Token。

技术原理：

- **Embedding**：把离散 Token 映射为连续向量。
- **位置编码**：注意力本身不包含顺序，需要额外注入位置信息。
- **Self-Attention**：让每个位置根据相关性聚合其他位置的信息。
- **Multi-Head**：用多组投影在不同表示子空间学习不同关系，再拼接映射。
- **FFN**：对每个位置独立应用非线性变换，提升表示能力。
- **Residual + LayerNorm**：改善深层网络的信息流和训练稳定性；具体 Pre-LN 或 Post-LN 取决于实现。
- **Mask**：Encoder 通常可看双向上下文；自回归 Decoder 用因果 Mask，位置 `t` 不能看到未来 Token。

常见追问：

- **相比 RNN 的优势？** 训练时可并行处理序列位置，长距离依赖路径更短；但标准注意力对序列长度的时间和显存复杂度约为 O(n²)。
- **位置编码一定是正弦吗？** 不是，原论文使用正弦/余弦方案之一，现代模型也常用可学习位置、RoPE 等。

AI 知识工作台 项目边界：

> AI 知识工作台 调用外部聊天和 Embedding API，没有训练或修改 Transformer，也没有实现模型内部注意力优化。面试中可以解释原理，但不能说这些是项目自行实现的模型层能力。

### 5.15 注意力里的 Q、K、V 分别是什么？

30 秒可口述版本：

> Q、K、V 都是隐藏状态经过不同可学习线性映射得到的矩阵。可以把 Query 理解为当前位置在寻找什么，Key 表示每个位置可被怎样匹配，Value 是匹配后真正被聚合的内容。先计算 `QKᵀ / √d_k`，经过 Softmax 得到权重，再对 V 加权求和。它们不是字面上的用户问题、数据库关键字和值，只是帮助理解的类比。

公式：

```text
Q = XW_Q
K = XW_K
V = XW_V

Attention(Q, K, V)
  = softmax(QK^T / sqrt(d_k))V
```

为什么除以 `sqrt(d_k)`：

> 维度增大时，点积的数值幅度通常也会增大，Softmax 容易进入饱和区，梯度变小；缩放可以让数值范围更稳定。

补充：

- Self-Attention 中 Q、K、V 来自同一序列的不同投影。
- Encoder—Decoder Cross-Attention 中，Q 来自 Decoder 当前表示，K、V 来自 Encoder 输出。
- 多头注意力为每个 Head 使用不同投影，学习语法、指代、位置等不同关系；并不保证每个 Head 都有固定的人类可解释语义。

常见追问：

- **Softmax 后是什么？** 每个 Query 对所有可见 Key 的归一化注意力权重。
- **QKV 是数据库检索吗？** 数学上有相似度匹配的直觉，但它是在神经网络隐藏状态内做可学习的加权聚合，不是外部 RAG 检索。

AI 知识工作台 项目边界：

> 项目只消费模型 API 的输出，不读取或控制模型内部 QKV。RAG 的向量余弦检索与模型内部 Attention 都涉及相似度，但计算对象、训练方式和作用层级不同，不能混为一谈。

### 5.16 为什么很多大模型使用 Decoder-only？Encoder 去哪里了？

30 秒可口述版本：

> Encoder 并没有消失。Encoder-only 仍适合 Embedding、分类和部分重排，Encoder—Decoder 仍适合翻译、摘要等输入输出映射。Decoder-only 在通用大模型中流行，是因为它把提示和答案统一为一个因果序列，用同一个下一 Token 预测目标就能在海量无标注文本上扩展，并自然支持续写、对话和上下文学习。代价是生成必须自回归进行，长上下文的标准注意力成本也较高。

技术原理：

- Decoder-only 把 `prompt + response` 放在同一序列中，用 Causal Mask 保证位置 `t` 只能看见 `≤t` 的 Token。
- 训练目标统一为：

```text
P(x_t | x_1, x_2, ..., x_(t-1))
```

- 单一网络栈、单一训练目标和文本接口便于扩大数据与参数规模，也便于把不同任务写成 Prompt。
- 推理仍按 Token 顺序生成；KV Cache 会保存历史层的 Key/Value，避免每一步重新计算全部历史表示，但不会消除对历史上下文的注意力成本和缓存占用。
- Decoder-only 没有单独的双向 Encoder 和 Cross-Attention；提示信息是在同一因果堆栈内被逐层表示。

常见追问：

- **为什么 Embedding 常用 Encoder 思路？** Embedding 更关注对完整输入做双向语义表示，不需要逐 Token 生成。
- **Decoder-only 是否全面更好？** 不是。任务结构、延迟、吞吐、上下文长度和训练方式不同，Encoder 或 Encoder—Decoder 仍可能更高效。
- **KV Cache 缓存什么？** 缓存各层历史 Token 的 K、V；新 Token 只需生成自己的 Q/K/V，再与历史 K/V 计算注意力。

AI 知识工作台 项目边界：

> 当前聊天模型和 Embedding 模型均由外部提供商决定，项目没有选择或训练底层 Decoder/Encoder 架构。可以解释为什么聊天生成与向量检索通常使用不同类型的模型，但不能声称项目完成了 Decoder-only 训练或 KV Cache 优化。

### 5.17 AI 部分的统一诚实口径

如果面试官连续追问，可以用下面这段收束：

> AI 知识工作台 目前真正跑通的是文本规范化与分块、关键词检索、可选 Embedding 余弦检索、异常回退、Token 预算上下文、引用编号和 SSE 流式输出。它验证了 RAG 的核心闭环，但还不是生产级知识平台，也不是 Agent 系统。RRF、MMR、独立 Reranker、哈希增量去重、版本化评测、MCP 和工具调用治理，是我能给出原理与落地方案、但尚未在当前分支完整实现的部分。我会把“已实现、实验过、计划做”明确分开。

### 5.18 本节原理来源

- Transformer 原论文：[Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- GPT 自回归 Decoder：[Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf)
- BERT Encoder：[BERT: Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805)
- T5 Encoder—Decoder：[Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683)
- RAG 原论文：[Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- RRF 原论文：[Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf)
- MMR 原论文：[The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries](https://aclanthology.org/X98-1025.pdf)
- 检索评测基础：[Introduction to Information Retrieval](https://www-nlp.stanford.edu/IR-book/)
- RAG 评测框架：[RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217)
- Chunking 实践：[Azure AI Search — Chunk large documents](https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents)
- Agent 与 Workflow：[Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- Function Calling：[OpenAI Function Calling Guide](https://developers.openai.com/api/docs/guides/function-calling)
- MCP 架构：[Model Context Protocol — Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- MCP Tools 规范：[Model Context Protocol — Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- MCP 生命周期：[Model Context Protocol — Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- MCP 传输：[Model Context Protocol — Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- Prompt Injection 防护：[OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- Agent 安全：[OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
- 生成式 AI 风险治理：[NIST AI 600-1 Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- SHA-256 标准：[NIST FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)

## 6. SSE、AI 前端与 React 原理

> 本节的“项目结合”以 AI 知识工作台 的 Vue 3 + Flask 技术栈为背景。代码中尚未完成的能力，面试时必须说“我会这样设计”或“下一步会这样改”，不能说成已经上线。

### 6.1 SSE、WebSocket 和轮询怎么选？

口述版：

> 三者的核心差别是通信方向和连接模型。短轮询是客户端定时发完整 HTTP 请求，实现最简单，但空请求多、实时性受轮询周期限制；长轮询是服务器把请求挂起，有消息或超时后返回，客户端再立即重连。SSE 是服务器通过一个长 HTTP 响应持续推送 UTF-8 文本，天然单向，并支持事件类型、事件 ID 和自动重连，适合通知和大模型回答。WebSocket 是全双工消息通道，适合协同编辑、游戏和语音信令这类双方都高频发送的场景。AI 对话通常是“一次提问、服务端持续回答”，所以我优先选 SSE 语义或 fetch 响应流，不会为了流式效果直接上 WebSocket。

机制：

- 短轮询每隔 `n` 秒重新请求，平均额外等待约为半个轮询周期，并产生无效请求。
- 长轮询在服务端有数据或超时后返回，仍需反复建立请求。
- SSE 的响应类型是 `text/event-stream`，事件以空行分隔，可包含 `event`、`data`、`id`、`retry`。
- WebSocket 握手后传输双向消息帧，可发送文本或二进制；重连、心跳、鉴权和消息确认通常由业务层设计。
- SSE 在 HTTP/1.1 下会受到浏览器同域连接数影响；HTTP/2 下并发 stream 数由连接协商。

项目实现与边界：

- AI 知识工作台 的问题用一次 POST 发送，模型输出走持续响应；停止、反馈和工具审批仍可使用独立 HTTP 接口，不必因此改用 WebSocket。
- 高频双向、二进制或多人实时协同时再考虑 WebSocket；低频且允许秒级延迟时，轮询反而可能更经济。
- SSE 只传 UTF-8 文本，图片通常传 URL；直接传二进制并不合适。
- 不能笼统说“WebSocket 一定更快”或“SSE 一定性能更高”。首字时间还取决于模型、应用、代理缓冲和网络。

### 6.2 `EventSource` 和 `fetch` 流有什么区别？

口述版：

> `EventSource` 是浏览器对 SSE 的高层封装，能自动解析事件、断线重连，并利用事件 ID 续接，但接口比较固定，主要是 GET，不能像 fetch 一样自由设置请求体和任意请求头。fetch 可以 POST JSON、携带 Authorization、绑定 AbortSignal，并从 `response.body` 得到 `ReadableStream`；代价是 UTF-8 解码、事件拆包、重试和游标恢复都要自己实现。AI 提问通常带较大的 JSON 请求体，还需要一键停止，所以我更倾向 POST + fetch stream；若特别强调自动恢复，可以先 POST 创建 run，再用 EventSource GET 订阅这个 run。

机制：

- `EventSource(url, { withCredentials })` 原生识别 `text/event-stream`。
- 连接断开时，浏览器可依据 `retry` 重连，并把最近事件 ID 放入 `Last-Event-ID`。
- 原生 EventSource 没有 `method`、`body` 和任意 `headers` 配置项。
- fetch 的 `Response.body` 是字节 `ReadableStream`；拿到 reader 后流会锁定，已经消费的 body 不能再次读取。
- POST 返回 `text/event-stream` 是可行的，但此时由 fetch 代码手动解析，不是由原生 EventSource 接管。

项目实现与边界：

- AI 知识工作台 的问题、会话 ID、检索参数放 POST body，前端用 fetch stream 和 AbortController。
- 更可靠的生产方案是 `POST /runs` 创建任务，再订阅 `GET /runs/{id}/events`，把“创建任务”和“消费事件”解耦。
- EventSource 使用同源 Cookie 最自然；不要把长期 JWT 放 URL，因为 URL 可能进入日志、浏览历史或监控系统。
- `EventSource.close()` 只表示客户端关连接，不等于模型任务已停止。
- 自动重连不等于页面刷新恢复；刷新会销毁原来的 EventSource 和内存状态。

### 6.3 从 Flask 到 Vue 的完整流式链路

口述版：

> 用户点击发送后，Vue 先创建用户消息和空的助手消息，并生成 runId、messageId 和 AbortController；随后 fetch POST 到 Flask。Flask 完成鉴权、参数校验和上下文构造后，用生成器消费模型上游流，把每个业务事件编码成 `delta`、`citation`、`error`、`done` 等 SSE 或 NDJSON 帧并 `yield`。响应经过 WSGI 和 Nginx 时要避免缓冲。浏览器读取 `response.body`，用流式 TextDecoder 解码，再通过残留缓冲区拆出完整事件，按 runId 路由到目标消息，并批量更新 Vue 状态。最终 `done` 事件携带结束原因和 token 用量。

推荐事件格式：

```text
event: delta
id: 17
data: {"runId":"r1","messageId":"m2","seq":17,"text":"你好"}

event: done
id: 18
data: {"runId":"r1","messageId":"m2","seq":18,"finishReason":"stop"}

```

Flask 伪代码：

```python
@app.post("/api/chat/stream")
def chat_stream():
    @stream_with_context
    def generate():
        try:
            for event in model_stream():
                yield encode_sse(event)
        except GeneratorExit:
            cancel_upstream()
            raise
        except Exception as exc:
            yield encode_sse({
                "type": "error",
                "message": safe_message(exc),
            })

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
```

机制、实现与边界：

- Flask view 返回后，普通 request context 可能已经结束；生成器仍需读取 `request` 时使用 `stream_with_context()`。
- 一旦响应头和部分 body 已发出，后续异常不能再可靠地改成 HTTP 500，应发业务级 `error` 事件或断流。
- 显式 `done` 很重要：EOF 既可能是正常完成，也可能是网络断开，不能仅凭 EOF 判断成功。
- `yield` 只是把数据交给下一层，不保证一个 `yield` 对应一个 TCP 包或一次浏览器 `read()`。
- TTFT 应定义为“请求发出到首个 `delta` 到达”，还应分别记录检索、模型首字、总生成和客户端首帧时间。
- 可周期性发送 `: ping\n\n` 心跳，间隔应短于链路最小空闲超时。

### 6.4 UTF-8 分片为什么会导致中文乱码？

口述版：

> 网络分片边界与字符、JSON 和 SSE 消息边界都没有关系。一个中文字符可能占三个 UTF-8 字节，而一次 `read()` 可能只拿到前一部分；如果每个 chunk 单独 decode，就可能出现替换字符。同样，一个 JSON 对象也可能被拆成两段。正确做法是复用同一个 TextDecoder，中间块使用 `stream: true`，结束时再 flush，或者使用 TextDecoderStream；解码后还要保留文本 remainder，只在收到完整的 SSE 双换行或 NDJSON 换行后解析。

```ts
const reader = response.body!.getReader()
const decoder = new TextDecoder("utf-8")
let pending = ""

while (true) {
  const { value, done } = await reader.read()
  pending += decoder.decode(value, { stream: !done })

  let boundary: number
  while ((boundary = pending.indexOf("\n\n")) >= 0) {
    const frame = pending.slice(0, boundary)
    pending = pending.slice(boundary + 2)
    handleCompleteFrame(frame)
  }

  if (done) break
}
```

机制、实现与边界：

- 需要维护两层状态：TextDecoder 保留不完整字节，协议 parser 保留不完整事件文本。
- 不能对每个 chunk 直接 `JSON.parse`，因为传输 chunk 不是业务消息。
- `response.text()` 会等完整响应结束，失去流式体验。
- 原生 EventSource 已替开发者完成 UTF-8 和 SSE 帧解析；手写 fetch parser 才需自己处理。
- 测试时应故意切开中文字节、`\r\n`、`\n\n` 和 JSON 引号，不能只测“恰好一个 chunk 一个事件”的理想情况。

### 6.5 后端一直 `yield`，为什么浏览器最后一次性显示？

口述版：

> 最常见原因不是前端，而是链路中的某层在缓冲。Nginx 的 `proxy_buffering` 默认开启，会先把上游响应读进缓冲区，再向客户端发送；WSGI 中间件、压缩层、CDN 和 API 网关也可能聚合小块。流式接口应局部设置 `proxy_buffering off`，或让上游返回 `X-Accel-Buffering: no`，并检查压缩、缓存和空闲超时。排障时我会用 `curl -N`，分别直连 Flask 和经过 Nginx 测试，定位是哪一层没有即时转发。

```nginx
location /api/chat/stream {
    proxy_pass http://flask_upstream;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
}
```

机制、实现与边界：

- Nginx 官方文档说明 `proxy_buffering` 默认是 `on`；关闭后会同步转发从上游收到的内容。
- 普通响应开启缓冲具有吞吐和隔离慢客户端的价值，所以只针对流式 location 调整，不应全局关闭。
- 压缩实现也可能积累小块；对流式路径关闭压缩或实测其 flush 行为。
- `Transfer-Encoding: chunked` 不等于实时，它只描述 HTTP/1.1 消息传输方式；HTTP/2 使用 DATA frame，同样可以流式传输。
- CDN、Serverless 或企业网关可能不支持长响应，必须核对平台限制，不能只在 Flask 开发服务器上验证。

### 6.6 怎样实现“停止生成”的全链路取消？

口述版：

> 前端调用 AbortController 只能保证 fetch 和响应体读取被中止，不自动等于模型任务停止。完整取消要给每次生成分配 runId：前端 abort、关闭 reader 并把 UI 状态设为 cancelled；服务端感知断连或接收一个幂等取消接口，把取消信号继续传给模型 SDK、后台任务和上游 HTTP 请求，最后关闭迭代器并释放 worker、数据库连接等资源。仅仅不再渲染 token，服务端仍可能继续生成并计费，所以要分别验证“停止接收”和“停止计算”。

```ts
const controller = new AbortController()

try {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
  // consume response.body
} catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    markCancelled(runId)
  }
}

// 用户点击停止
controller.abort("user_cancelled")
```

机制、实现与边界：

- 一个 AbortSignal 只能使用一次；被 abort 后，后续绑定该 signal 的 fetch 会立即失败。
- 服务端可从客户端断连、`POST /runs/{id}/cancel`、任务系统或 Redis 取消标记获得信号。
- WSGI 可能要等下一次写入才感知 broken pipe/`GeneratorExit`，显式取消接口通常更及时。
- 取消、正常完成和失败会竞态，状态机应规定 `running -> completed | cancelled | failed` 只允许一次成功转换。
- abort 后仍可能收到已经进入浏览器或代理缓冲的事件，前端还必须用 run 状态和 ID 门禁拒绝晚到数据。
- 是否立刻停止供应商计费取决于模型 SDK 和计费口径，不能承诺绝对实时。

### 6.7 多会话并发时怎样防止流式内容串台？

口述版：

> 典型竞态是旧请求比新请求晚返回，然后写入了当前页面的全局变量。我的做法是让每个事件携带 conversationId、runId、messageId 和递增 seq，前端按 run 保存独立的 controller、buffer 和状态；处理事件时验证它仍属于目标消息，而不是只看当前选中的会话。替换请求时可以 abort 旧请求，但仍需 ID 门禁，因为已缓冲事件可能继续到达。服务端再用幂等键和 seq 去重，避免重试时重复追加。

事件处理规则：

1. `runId`、`messageId` 必须匹配目标对象。
2. `seq <= lastSeq` 的事件直接丢弃，防止重复消费。
3. 非 `running` 状态拒绝新的 `delta`。
4. 完成、取消和失败由 reducer 做原子状态转换。
5. 同一会话是否允许多个 run，要由产品规则明确；可以排队，也可以并发但按 messageId 分流。

项目实现与边界：

- 用户从 A 会话切到 B 时，A 的 token 仍写入 A 的消息对象；“当前视图”不能成为数据路由依据。
- 只 abort 不够，网络缓冲、microtask 和服务端事件都可能晚到。
- 重试时传 idempotency key，服务端复用原 run 或明确生成新版本，避免创建两条重复助手消息。
- 前端门禁只保证 UI 正确，不替代服务端权限、数据库乐观锁和业务幂等。

### 6.8 为什么不能每收到一个 token 就立即更新 UI？

口述版：

> 模型 token 到达频率可能高于屏幕刷新率。如果每个 token 都修改响应式状态，会造成大量组件调度、Markdown 全量解析、虚拟 DOM diff 和滚动计算。我会先把 delta 放到非响应式缓冲区，每个 animation frame 或每 20 到 50 毫秒合并一次，再做一次状态更新；结束时强制 flush。这样仍然有流式感，但把数十次更新压成一次。自动滚动还要判断用户是否接近底部，不能把正在阅读历史内容的用户强制拉回去。

```ts
let pending = ""
let scheduled = false

function onDelta(text: string) {
  pending += text
  if (scheduled) return

  scheduled = true
  requestAnimationFrame(() => {
    message.value += pending
    pending = ""
    scheduled = false
  })
}
```

机制、实现与边界：

- `requestAnimationFrame` 在下一次重绘前执行，通常与显示器刷新率一致。
- Vue 会把同一 tick 中的多次响应式修改合并，但不同异步 chunk 仍可能形成多轮更新。
- React 中追加文本使用函数式更新：`setText(previous => previous + batch)`，避免旧闭包。
- rAF 在后台标签页会暂停或降频，需要在 `visibilitychange`、定时器或 `done` 时保证最终 flush。
- rAF 是 UI 提交限频，不是服务端或网络背压。
- 用 Performance 面板看长任务、每秒渲染次数、Markdown 解析时间和滚动响应延迟，避免无依据优化。

### 6.9 流式 Markdown 怎样正确且安全地渲染？

口述版：

> 流式 Markdown 的难点是当前文本可能不是完整语法，例如只收到一半代码围栏、表格或链接。我会始终保存完整 raw text，它是唯一真相；简单方案是节流后重新解析完整文本，回答较短时可靠，但总成本可能接近 O(n²)。更大文本可以只提交已经闭合的 block，把不稳定尾部暂时按纯文本显示，结束后再全量解析一次。模型输出、RAG 文档和工具结果都属于不可信输入，所以会禁用 raw HTML，并在写入 `v-html` 或 `dangerouslySetInnerHTML` 前使用 DOMPurify 清洗。

安全链路：

```text
模型 / 检索文本
  -> Markdown 解析器（raw HTML disabled）
  -> DOMPurify.sanitize
  -> v-html / dangerouslySetInnerHTML
```

机制、实现与边界：

- 已闭合段落和代码块可以缓存；未闭合尾部保留原文，避免 parser 不断重构整段 DOM。
- 代码高亮、KaTeX、目录提取等昂贵工作在完整 block 或 `done` 后执行。
- 外链限制为安全协议，并设置 `rel="noopener noreferrer"`。
- Vue `{{ text }}` 会转义，但 `v-html` 明确绕过转义；不能因为用了 Vue 就忽略 XSS。
- 只删除 `<script>` 不够，事件属性、SVG、危险 URL 等都可能执行代码；不能用自写正则清洗 HTML。
- 如果产品只需要纯文本，使用插值或 `textContent` 是最安全、最简单的选择。

### 6.10 断网或刷新后怎样恢复未完成回答？

口述版：

> 恢复要分两件事：重新连上数据流，以及让原生成任务仍能继续。服务端应让任务脱离单次 HTTP 连接，按 `runId + seq` 保存事件和最终快照；前端在 IndexedDB 保存运行游标与未发送 outbox。重连后先查任务状态，再回放 `lastSeq` 之后的事件并去重，任务已终止则明确提示重试。

恢复流程：

1. `POST /runs` 返回 `runId`。
2. 后台 worker 生成并保存 `seq=1,2,3...` 的事件。
3. 客户端订阅 `/runs/{id}/events?after=17`。
4. 服务端先回放 `seq > 17`，然后继续实时推送。
5. 完成后保存最终 message snapshot。
6. 页面刷新后从 IndexedDB 恢复 run 游标和 outbox，再查询 run 状态：已完成则加载快照，仍运行则续订。

项目实现与边界：

- `conversationId`、`runId` 和 `lastSeq` 可放 sessionStorage 或 IndexedDB，但服务端记录才是权威。
- outbox 只负责保存未确认的用户操作，重发时仍要携带幂等键，避免服务端已经接收却重复创建任务。
- 如果模型生成直接绑在 Flask generator 上，连接断开后任务可能一起结束，不能真正恢复；需要拆成独立 job。
- “重新建立连接”不等于“模型从断点继续计算”。
- 事件日志可设短 TTL，最终消息长期保存；恢复接口必须重新鉴权并校验 run 所有权。

### 6.11 React 和 Vue 的核心差异

口述版：

> 两者都以组件、单向数据流和虚拟 DOM 为主要模型，差异集中在表达方式和响应式机制。React 更像 UI 库，常用函数组件和 JSX；每次 render 读取的是当次 state snapshot，状态变化触发组件重新执行，再由 reconciliation 决定真实 DOM 更新，开发者要显式处理 Hook 依赖和不可变更新。Vue 是渐进式框架，常用 SFC 模板和 Composition API；Vue 3 通过 Proxy 和 ref 的 getter/setter 跟踪依赖，编译器还会利用模板静态信息优化更新。不能简单说谁绝对更快，要看团队生态和业务约束。

机制：

- React 函数组件本身就是 render；一次 render 中的 state 是快照。
- React 更新通常使用不可变数据，Effect 负责与网络、DOM、计时器等外部系统同步。
- Vue 的 `reactive` 使用 Proxy，`ref` 使用 getter/setter；读取时 track，写入时 trigger。
- Vue 模板编译器可以标记静态节点和动态绑定，降低运行时比较范围。
- Composition API 与 Hooks 都能复用有状态逻辑，但 Vue composable 不依赖 Hook slot 的固定调用顺序，依赖由 ref/reactive 跟踪。

项目结合与边界：

- Vue 项目经验可迁移的部分包括组件拆分、TypeScript、路由状态、异步请求、流协议、安全和性能。
- 转 React 要重点补齐 state snapshot、Hooks 规则、Effect cleanup、受控表单和不可变更新，而不是把 Vue 写法逐行翻译。
- React 函数组件可能重新执行，但不是“重建全部真实 DOM”；真实更新由 reconciliation 决定。
- 常规 Vue 3 仍使用虚拟 DOM，不能说“Vue 是细粒度响应式，所以完全没有虚拟 DOM”。
- 面试不要贬低任一框架，也不要用“Vue 是双向数据流、React 是单向数据流”这种过度简化。

### 6.12 React Hooks 的常见坑

口述版：

> 我重点关注六类问题：一是在条件和循环中调用 Hook，会破坏固定调用顺序；二是漏写依赖会让 Effect 读取旧闭包，形成 stale closure；三是每次 render 新建对象或函数，可能让 Effect 反复执行；四是没有 cleanup，会残留监听器、定时器和流连接，StrictMode 开发环境还会额外执行一次 setup-cleanup 来暴露问题；五是用 Effect 计算本可在 render 中得到的派生状态，导致多一次渲染和状态不同步；六是异步请求未处理取消和晚到响应竞态。

机制与实现：

- Hook 只在组件或自定义 Hook 顶层调用。
- 每次 render 都会创建新闭包，并捕获那次 render 的 props/state。
- Effect 依赖通过 `Object.is` 与上一次比较；不能用禁用 `exhaustive-deps` 掩盖问题。
- 依赖旧状态更新时使用 `setCount(previous => previous + 1)`。
- Effect 的依赖变化时先用旧值 cleanup，再用新值 setup；unmount 时再次 cleanup。
- `useMemo` 和 `useCallback` 是性能优化，不应作为修复错误依赖的手段。
- `useRef` 可保存跨 render 的可变值，但修改 ref 不会触发渲染。

项目实现与边界：

- 可将流连接封装为 `useChatStream`：Effect 创建 controller 和 reader，cleanup 时 abort，事件按 runId 门禁，文本用函数式 state update。
- 空依赖数组并不意味着代码可以忽略幂等；StrictMode 开发环境会额外执行 setup-cleanup-setup。
- 纯派生数据在 render 中计算，用户点击动作放事件处理函数；Effect 主要同步外部系统。
- 必须在绘制前测量或同步视觉布局时才用 `useLayoutEffect`；普通网络和订阅使用 `useEffect`。
- Effect 只在客户端执行，SSR 阶段不会运行。

### 6.13 TypeScript 判别联合怎样用于流协议？

口述版：

> 判别联合是让多个类型共享一个字面量字段，例如 `type`，然后通过 switch 自动缩窄到对应成员。它特别适合流式事件，因为 delta、citation、done 和 error 的字段不同。相比一个所有字段都可选的大对象，判别联合可以防止在 error 事件上误读 text，还能用 `never` 做编译期穷尽检查。但 TypeScript 类型在运行时会被擦除，网络 JSON 仍需使用 schema 或手写类型守卫校验。

```ts
type StreamEvent =
  | { type: "delta"; runId: string; seq: number; text: string }
  | { type: "citation"; runId: string; seq: number; sourceId: string }
  | { type: "done"; runId: string; seq: number; usage: TokenUsage }
  | { type: "error"; runId: string; seq: number; code: string; message: string }

function handle(event: StreamEvent) {
  switch (event.type) {
    case "delta":
      return append(event.text)
    case "citation":
      return addCitation(event.sourceId)
    case "done":
      return finish(event.usage)
    case "error":
      return fail(event.code, event.message)
    default: {
      const exhaustive: never = event
      return exhaustive
    }
  }
}
```

机制、实现与边界：

- 新增联合成员但未处理时，`never` 会让编译失败，从而发现遗漏分支。
- enum 只描述一组值；判别联合还能让每个值关联不同的数据结构。
- 外部 JSON 不能直接 `as StreamEvent`，应使用 Zod 或手写 validator 验证。
- 协议前向兼容与编译期穷尽存在张力：编译期穷尽已知类型，运行时仍应把未知事件解析为 `unknown`，安全记录或忽略。

### 6.14 Vite 和 Webpack 的区别

口述版：

> Webpack 是高度可配置的静态模块打包器，会从 entry 构建依赖图，通过 loader 转换资源，再由 plugin 介入构建生命周期并输出 bundle。Vite 的主要优势在开发阶段：依赖预构建后，源码通过浏览器原生 ESM 按需提供，HMR 只失效相关模块，所以启动和热更新通常更快；生产仍会打包优化。回答时还要有版本意识：旧版 Vite 的生产构建基于 Rollup，而 2026 年当前官方文档已转向 Rolldown，我会说明项目实际使用的 Vite 版本，而不是死背某个底层工具。

机制：

- Webpack 核心概念包括 entry、dependency graph、output、loader、plugin、mode 和 code splitting。
- loader 主要转换模块内容；plugin 可以介入更广泛的编译生命周期。
- Vite 开发期源码按原生 ESM 按需加载，CommonJS 或大量小模块依赖会先预构建。
- 修改文件时，Vite 精确失效相邻 HMR 边界；生产仍需要打包，减少嵌套 import 的网络瀑布。
- Vite 默认只转译 TypeScript，不做类型检查；CI 仍需 `tsc --noEmit` 或 `vue-tsc`。

项目实现与边界：

- AI 知识工作台 可讲 Vite dev proxy、环境变量、路由懒加载、构建 hash 和独立类型检查。
- 不要回答“Vite 开发完全不打包”：它仍会预构建依赖。
- 大型项目中海量原生 ESM 请求也有开销；Vite 官方当前也在探索 full-bundle 开发模式。
- 已有复杂 Webpack loader、Module Federation 或旧浏览器体系时，不应只因为 Vite 更新就盲目迁移。

### 6.15 浏览器缓存与 `no-cache`

口述版：

> 浏览器缓存可分为新鲜缓存和协商缓存。资源仍在 `max-age` 新鲜期时可以直接复用，不发请求；过期或设置 `no-cache` 时，浏览器携带 `If-None-Match` 或 `If-Modified-Since` 向服务器验证，未变化返回 304。`no-cache` 不是“不存储”，而是“复用前必须验证”；真正禁止存储是 `no-store`。部署时 HTML 使用 `no-cache` 并配 ETag，内容 hash 的 JS/CSS 使用一年 `max-age` 加 `immutable`，敏感会话接口使用 `no-store`。

机制：

- 强缓存命中 `Cache-Control: max-age=...` 时不需要网络请求。
- 协商缓存使用 `ETag / If-None-Match` 或 `Last-Modified / If-Modified-Since`，未变化返回无 body 的 304。
- `immutable` 适合内容 hash 静态文件；`private` 限制共享缓存，`public` 允许共享缓存。
- `Vary` 告诉缓存还需根据哪些请求头区分响应。

项目实现与边界：

- `index.html` 不长缓存，因为它引用最新 hash 文件；`app.abc123.js` 可长期缓存。
- 聊天内容和检索结果是敏感信息，返回 `Cache-Control: no-store`；流式响应不应被中间缓存。
- 发版后旧 chunk 可能来自 HTML、CDN、Service Worker 缓存，或部署时过早删除旧 hash 文件；需 revalidate HTML、原子部署并短期保留旧资源。
- `no-cache`、`max-age=0` 和 `no-store` 不能混为一谈。

### 6.16 CORS 与预检请求

口述版：

> 同源策略限制页面脚本读取其他源的响应，源由协议、主机和端口组成。CORS 是服务器通过响应头明确允许某些跨源页面读取资源，并不是鉴权。满足简单方法、简单请求头和规定 Content-Type 的请求通常直接发送；PUT、DELETE、自定义 Authorization 或 JSON Content-Type 等非简单请求会先发 OPTIONS 预检，服务器允许方法和请求头后才发真实请求。携带 Cookie 时，前端要设置 credentials，服务端返回 `Access-Control-Allow-Credentials: true`，并且 `Access-Control-Allow-Origin` 不能使用星号。

典型响应头：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
Vary: Origin
```

项目实现与边界：

- 开发阶段使用 Vite proxy 把 `/api` 转发到 Flask，可让浏览器看到同源请求；生产优先由 Nginx 统一域名。
- 确需跨域时使用精确 Origin allowlist，不能无条件反射请求 Origin。
- Postman 和 curl 不执行浏览器同源策略，所以“Postman 成功、浏览器失败”通常要检查 CORS。
- POST 不一定预检；表单型简单 POST 可直接发，而 `application/json` 通常会预检。
- CORS 控制跨源脚本能否读取响应，不是身份认证，也不能替代 CSRF 防护。

### 6.17 XSS 与 AI 输出安全

口述版：

> XSS 的本质是不可信数据被浏览器当作 HTML 或 JavaScript 执行，可分为存储型、反射型和 DOM 型。核心防御是按输出上下文编码，优先使用框架默认的文本插值，避免 `v-html` 和 `dangerouslySetInnerHTML`。确实要渲染 Markdown HTML 时，先禁用 raw HTML，再使用 DOMPurify 清洗，并限制 URL 协议；CSP 和 Trusted Types 作为纵深防御。AI 输出、RAG 文档和工具结果都可能携带恶意内容，所以“模型生成”不等于可信。

机制、实现与边界：

- HTML body、attribute、JavaScript、CSS 和 URL 是不同上下文，需要对应的编码方式。
- Vue `{{ value }}` 和 React `{value}` 默认按文本处理；`v-html`、`innerHTML` 和 `dangerouslySetInnerHTML` 会绕开保护。
- 需要保留富文本时使用 sanitizer；纯文本则直接转义，不要混淆“编码”和“清洗”。
- 输入时过滤一次不够，数据未来可能进入不同输出上下文，应在接近输出的位置处理。
- HttpOnly 能降低 Cookie 被直接读取的风险，但恶意脚本仍可代用户发请求，不能消除 XSS。
- CSP 是额外保护层，不能替代输出编码和 HTML 清洗。

### 6.18 CSRF、CORS 与认证方式的关系

口述版：

> CSRF 利用的是浏览器会自动携带目标站点 Cookie。攻击者诱导已登录用户向目标站点发状态变更请求，服务器只看到有效 Cookie，误以为是用户真实操作。防御包括 CSRF token 或会话绑定的签名 double-submit token、SameSite Cookie、校验 Origin、Referer 或 Fetch Metadata，并保证 GET 不改变状态。CORS 主要控制响应能否被跨源脚本读取，不是 CSRF 防线。若 Bearer token 只由前端显式放入 Authorization 头而不会被浏览器自动附带，经典 CSRF 风险较低，但 XSS 风险更突出。

机制、实现与边界：

- CSRF 成立的关键是认证凭证会被浏览器自动随跨站请求发送。
- Synchronizer token 由服务器保存并要求页面提交；signed double-submit 使用会话绑定 HMAC，不能只比较攻击者可注入的普通 Cookie。
- `SameSite=Lax/Strict` 是纵深防御；site 与 origin 不同，同站子域不一定可信。
- 对非安全方法校验 `Origin`、`Referer` 或 `Sec-Fetch-Site`，所有副作用接口使用 POST/PUT/PATCH/DELETE。
- AI 知识工作台 的发送消息、批准 Agent 工具、删除会话和取消任务都可能产生副作用或资源消耗。
- JWT 如果放在 Cookie 中仍会被自动附带，依然要考虑 CSRF；“用了 JWT 就没有 CSRF”是错误结论。

### 6.19 JWT 的原理、存储与安全边界

口述版：

> JWT 通常由 Base64URL 编码的 header、payload 和 signature 三段组成。签名用于发现篡改并确认签发方，并不加密 payload，所以不能把密码或隐私数据放进去。服务端不能只 decode，必须固定算法白名单，并验证 signature、iss、aud、exp、nbf 等字段。Access token 应短期有效，refresh token 要有轮换和撤销机制。浏览器端优先考虑 BFF 或 HttpOnly、Secure、SameSite Cookie，避免把长期凭证放 localStorage；若用内存中的 Bearer token，经典 CSRF 较低，但要更重视 XSS、泄漏和刷新恢复。

机制：

- header 描述类型和算法；payload 存 claim；signature 保证完整性和来源，不保证机密性。
- 验证端必须固定允许算法，不能盲信 token 自带的 `alg`；还要验证 issuer、audience、expiration 和 not-before。
- JWT 的“无状态”不会自动解决登出撤销、账号封禁、权限即时变更和被盗后重放。
- 常见控制包括短 `exp`、refresh rotation、`jti`/session registry、denylist，或直接使用 opaque session。

项目实现与边界：

- fetch stream 可携带 Authorization header；原生 EventSource 不能自由设置该头，更适合同源 HttpOnly Cookie，或先用已鉴权 POST 创建 run，再发放短期订阅票据。
- JWT payload 可以被任何持有者读取；修改字符串后若服务端正确验签，应校验失败。
- `localStorage` 对同源 JavaScript 可读，一处 XSS 就可能窃取长期 token；HttpOnly 只阻止脚本直接读取 Cookie，不阻止恶意脚本代用户操作。
- 删除浏览器 token 不会让已泄漏的 token 失效；退出登录还要结合短有效期、刷新令牌撤销或服务端状态。
- JWT 是 token 表示格式，不是完整的登录、授权和刷新协议；需要即时撤销时，服务端 session 可能更简单。

### 6.20 本节官方资料

- [MDN：Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [WHATWG：Server-sent events 与 Last-Event-ID](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN：Using the Fetch API，流式读取响应体](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN：TextDecoder.decode](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode)
- [MDN：AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [Flask：Streaming Contents](https://flask.palletsprojects.com/en/stable/patterns/streaming/)
- [Nginx：ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React：useEffect](https://react.dev/reference/react/useEffect)
- [React：exhaustive-deps](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps)
- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Vue：DOM Update Timing](https://vuejs.org/guide/essentials/reactivity-fundamentals.html#dom-update-timing)
- [TypeScript：Narrowing 与穷尽检查](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- [Vite：Why Vite](https://vite.dev/guide/why.html)
- [Webpack：Concepts](https://webpack.js.org/concepts/)
- [MDN：HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [MDN：CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [OWASP：XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP：CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [IETF：RFC 7519 JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [MDN：Secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)

## 7. 计算机基础与浏览器原理

这一组题不要从名词定义一路背到底。推荐口述顺序是：

> 一句话结论 -> 关键过程或状态变化 -> 为什么这样设计 -> 一个边界或工程场景。

### 7.1 从输入 URL 到页面渲染发生了什么？

两分钟口述版：

> 我会把它分成六段。第一，浏览器解析 URL，确定协议、域名、端口和路径，并检查 HSTS、浏览器缓存、Service Worker 等是否能直接命中。第二，如果需要访问网络，就进行 DNS 解析，把域名转换成 IP。第三，建立传输连接，HTTP/1.1 和 HTTP/2 通常基于 TCP，HTTPS 还要完成 TLS 握手，HTTP/3 则基于 QUIC。第四，浏览器发送 HTTP 请求，请求可能经过代理、CDN 和网关，服务器返回状态码、响应头和响应体。第五，浏览器流式解析 HTML 生成 DOM，解析 CSS 生成 CSSOM；普通同步脚本可能暂停 HTML 解析，预加载扫描器会提前发现 CSS、JS、图片等资源。第六，DOM 和 CSSOM 形成渲染树，再进行样式计算、布局、绘制、分层与合成，最终显示到屏幕。JavaScript 后续修改 DOM 或样式，可能触发重新布局、重绘或只重新合成。

关键原理：

```text
URL 解析
  -> 缓存 / Service Worker
  -> DNS
  -> TCP / QUIC
  -> TLS（HTTPS）
  -> HTTP 请求与响应
  -> DOM + CSSOM
  -> Render Tree
  -> Style -> Layout -> Paint -> Composite
```

- DNS、TCP 和 TLS 都可能增加网络往返，因此 DNS 缓存、连接复用、CDN 和 HTTP/2 多路复用能降低延迟。
- CSS 通常阻塞首次渲染；普通同步 `script` 会阻塞 HTML 解析。
- 改变元素尺寸或位置通常会触发布局和绘制；改变颜色通常只需重绘；`transform`、`opacity` 在满足分层条件时可能只需合成。
- HTML 可以边下载边解析，并不是等所有内容下载完才开始渲染。

常见追问：

- `DOMContentLoaded`：DOM 已解析完成，并等待同步脚本和 `defer` 脚本执行完；它不必等待图片全部加载。
- `load`：页面依赖的图片等资源也已完成加载。
- `async`：下载完立即执行，执行顺序不保证；`defer`：HTML 解析完成后按文档顺序执行。
- 不一定每次都重新 DNS、TCP、TLS：可能命中缓存、Service Worker，或复用已有连接。
- HTTP/2 虽然能多路复用，但多个流共享一条 TCP，丢包时仍有 TCP 层队头阻塞；HTTP/3 用 QUIC 的独立流缓解这一问题。

### 7.2 DNS 解析的完整过程

一分钟口述版：

> DNS 的作用是把域名解析成 IP。浏览器会先检查浏览器 DNS 缓存，再检查操作系统缓存和 hosts 文件；未命中时，把请求交给本地递归 DNS。递归 DNS 如果也没有缓存，会依次询问根 DNS、顶级域 DNS 和该域名的权威 DNS。根服务器告诉它顶级域服务器在哪里，顶级域服务器告诉它权威服务器在哪里，权威服务器最终返回 A、AAAA 或 CNAME 等记录。递归 DNS 按 TTL 缓存结果，再把 IP 返回给客户端。

关键原理：

- 客户端通常要求递归解析器完成递归查询；递归解析器再向根、顶级域、权威服务器进行多次迭代查询。
- `A` 对应 IPv4，`AAAA` 对应 IPv6，`CNAME` 是别名；遇到 CNAME 后通常还要继续解析目标域名。
- DNS 通常使用 UDP 53；响应被截断、数据较大或某些特殊场景会使用 TCP。
- CDN 可以利用 DNS，根据地理位置、网络和负载把用户调度到合适节点。

常见追问：

- TTL 到期前，缓存中可能仍是旧地址，因此 DNS 变更通常不会立即全网生效。
- DNS 只负责获得地址，不负责建立 TCP 连接。
- DoH/DoT 主要加密 DNS 传输；DNSSEC 主要验证记录来源和完整性，两者解决的问题不同。
- DNS 劫持或缓存投毒会把域名指向错误地址；HTTPS 证书校验还能在后续连接阶段提供一层身份保护。

### 7.3 TCP 三次握手、四次挥手和 TIME_WAIT

三次握手口述版：

> 第一次，客户端发送 SYN 和初始序列号 x。第二次，服务端返回 SYN 加 ACK，自己的初始序列号是 y，确认号是 x+1。第三次，客户端再返回 ACK，确认号是 y+1，双方进入已连接状态。三次握手的核心是让双方确认自己的发送和接收能力，并同步初始序列号，同时避免历史失效连接被误认为新连接。

```text
Client                         Server
  | ---- SYN, seq=x ----------> |
  | <--- SYN+ACK, seq=y, ack=x+1|
  | ---- ACK, ack=y+1 --------> |
  |        ESTABLISHED          |
```

为什么不能只有两次：

- 两次不足以让服务端确认客户端已经收到服务端的序列号。
- 历史延迟 SYN 到达时，若两次就建立连接，服务端更容易产生错误或半开连接。
- 第三次确认后，双方才能完整证明双向收发链路正常。

四次挥手口述版：

> TCP 是全双工的，两个方向要分别关闭。主动方先发送 FIN；被动方返回 ACK，表示收到了关闭请求，但可能还有数据没发完；被动方处理完剩余数据后再发送 FIN；主动方返回最后一个 ACK，进入 TIME_WAIT，等待后才彻底关闭。

```text
主动关闭方                      被动关闭方
  | ---- FIN -----------------> |
  | <--- ACK ------------------ |
  | <--- FIN ------------------ |
  | ---- ACK -----------------> |
  |      TIME_WAIT              |
```

TIME_WAIT 的两个目的：

1. 如果最后一个 ACK 丢失，对方会重传 FIN，主动关闭方仍能再次回复 ACK。
2. 让旧连接在网络中的延迟报文全部过期，避免污染之后使用相同四元组的新连接。

常见追问：

- TIME_WAIT 通常出现在主动关闭的一方，不固定是客户端。
- TIME_WAIT 等待 `2MSL`，保证一个报文及其可能的应答在网络中都已失效。
- 挥手有时看起来是三次，因为被动方可以把 ACK 和 FIN 合并发送。
- `CLOSE_WAIT` 大量堆积通常表示应用收到对方 FIN 后，没有及时关闭本地连接。
- TCP 可靠性来自序列号、确认应答、超时/快速重传、滑动窗口、流量控制、拥塞控制和校验和。

TCP 与 UDP：

| 维度 | TCP | UDP |
|---|---|---|
| 连接 | 面向连接 | 无连接 |
| 数据形式 | 有序字节流 | 独立数据报 |
| 可靠性 | 保证可靠、有序、无重复 | 不保证送达和顺序 |
| 控制机制 | 流量控制、拥塞控制、重传 | 协议本身不提供 |
| 开销 | 较高 | 较低 |
| 常见场景 | HTTP/1.1、HTTP/2、文件传输 | 实时音视频、DNS、QUIC |

> UDP 不等于应用一定不可靠。QUIC 正是在 UDP 之上自行实现可靠传输、拥塞控制和加密。

### 7.4 HTTP、HTTPS 与常见状态码

HTTPS 原理口述版：

> HTTP 是应用层的请求响应协议，本身不提供传输加密和服务端身份认证。HTTPS 可以理解为 HTTP 运行在 TLS 保护之上，提供机密性、完整性和身份认证。以 TLS 1.3 为例，客户端在 ClientHello 中发送支持的算法和密钥交换参数；服务端返回选择结果、自己的密钥参数和证书。客户端验证证书链、有效期、域名和可信 CA，双方通过 ECDHE 得到共享秘密并派生会话密钥。握手完成后，HTTP 数据主要用高效的对称加密传输。

容易说错的点：

- 证书和数字签名主要用于证明服务端身份。
- ECDHE 等密钥交换机制用于协商共享秘密。
- 业务数据使用对称加密，不是一直用证书公钥加密全部响应。
- HTTPS 不能解决终端中毒、业务逻辑漏洞、XSS 或用户主动信任恶意证书等问题。

状态码速答：

| 状态码 | 含义与面试表述 |
|---|---|
| `200` | 请求成功 |
| `201` | 资源创建成功 |
| `204` | 成功但没有响应体 |
| `206` | 范围请求成功 |
| `301/308` | 永久重定向 |
| `302/307` | 临时重定向 |
| `304` | 协商缓存命中，使用本地缓存 |
| `400` | 请求格式或参数错误 |
| `401` | 未认证或凭证无效 |
| `403` | 身份已知，但没有权限 |
| `404` | 资源不存在 |
| `405` | 请求方法不允许 |
| `409` | 资源状态冲突 |
| `413` | 请求体过大 |
| `415` | 媒体类型不支持 |
| `422` | 格式正确，但业务校验失败 |
| `429` | 请求过于频繁 |
| `500` | 服务端内部错误 |
| `502` | 网关收到上游无效响应 |
| `503` | 服务暂时不可用或过载 |
| `504` | 网关等待上游超时 |

高频区别：

- `401` 更接近“你是谁还没验证成功”；`403` 是“知道你是谁，但你不能做”。
- `307/308` 明确保留原请求方法和请求体；`301/302` 在浏览器历史兼容行为中可能把 POST 改为 GET。
- `304` 不返回完整资源，而是让客户端继续使用本地副本。
- CORS 是浏览器同源安全策略，不等同于服务端鉴权；Postman、服务端请求不受浏览器 CORS 限制。

HTTP 版本追问：

- HTTP/1.1 支持持久连接，但浏览器通常还需要多个连接缓解请求排队。
- HTTP/2 使用二进制分帧、多路复用和 HPACK 头部压缩，但仍可能受 TCP 层队头阻塞影响。
- HTTP/3 基于 QUIC，在传输层提供独立流，并内置 TLS 1.3 能力。

### 7.5 进程、线程与协程

一分钟口述版：

> 进程强调资源与地址空间隔离；操作系统线程是在进程内可被调度的执行流，共享进程资源但各有栈和寄存器；协程则是语言或运行时提供的可挂起任务。协程没有统一实现：JavaScript、Python asyncio 和 Go goroutine 的调度方式并不相同，能否利用多核也取决于具体运行时。

| 维度 | 进程 | 线程 | 协程 |
|---|---|---|---|
| 资源隔离 | 强 | 共享进程资源 | 通常共享所在进程/线程资源 |
| 切换成本 | 较高 | 中等 | 较低 |
| 通信方式 | 管道、Socket、共享内存等 IPC | 共享内存与同步原语 | 事件循环、通道、共享状态 |
| 多核并行 | 可以 | 可以 | 需要落到多个线程或进程 |
| 故障影响 | 通常相互隔离 | 可能影响整个进程 | 取决于运行时与异常处理 |

常见追问：

- 进程切换通常要切换地址空间等更多上下文，所以比线程更重。
- 多线程共享内存可能出现竞态，需要锁、原子操作等同步机制，也可能死锁。
- 并发是多个任务在一段时间内交替推进；并行是多个任务在同一时刻真正执行。
- JavaScript 的 `async/await` 是基于 Promise 和事件循环的异步控制流，表现得像协程，但 IO 通常由浏览器、Node 运行时和操作系统处理。
- CPU 密集任务要真正利用多核，浏览器侧可以考虑 Web Worker，Node.js 可考虑 Worker Threads 或多进程。

### 7.6 虚拟内存与从硬件读取内存

一分钟口述版：

> 虚拟内存让每个进程看到一套连续、独立的虚拟地址空间。CPU 访问虚拟地址时，会用虚拟页号先查 TLB；未命中时通过多级页表找到物理页框，再加页内偏移得到物理地址。如果页表项显示该页不在物理内存，就触发缺页异常，由操作系统从文件或交换区加载该页，必要时淘汰其他页，更新页表后重新执行原指令。

```text
CPU 生成虚拟地址
  -> TLB 命中？
       -> 是：得到物理页框
       -> 否：页表遍历
              -> 页面在内存：更新 TLB
              -> 页面不在内存：Page Fault -> OS 调页
  -> 物理地址
  -> CPU Cache / 主存
```

核心价值：

- 进程隔离，防止一个进程任意读写另一个进程内存。
- 给程序提供连续地址视图，实际物理内存不必连续。
- 支持按需分页、共享库、内存映射文件和写时复制。
- 地址空间可以大于当前物理内存，但不能把它理解为性能上“拥有无限内存”。

常见追问：

- TLB 是页表映射的高速缓存，用来减少多级页表遍历。
- Page Fault 不一定是程序错误；按需加载时的首次访问也会发生正常缺页。
- 页面频繁换入换出会产生抖动（thrashing），性能会急剧下降。
- 栈和堆是进程虚拟地址空间中的不同区域；虚拟内存不会自动解决内存泄漏。
- JavaScript 通常不能直接操作裸指针，但 ArrayBuffer、TypedArray 等最终仍由运行时映射到进程内存。

### 7.7 数组、链表、栈和队列

口述版：

> 数组通过索引访问，因此随机访问是 O(1)，缓存局部性也好；但中间插入和删除通常要移动后续元素，是 O(n)。动态数组尾部追加通常是均摊 O(1)，扩容那一次是 O(n)。链表通过指针连接，访问第 k 个节点要从头遍历，所以是 O(n)；已经拿到前驱或目标节点时，插入删除可以是 O(1)，代价是额外指针和较差的缓存局部性。栈是后进先出，适合函数调用、括号匹配、DFS 和撤销；队列是先进先出，适合 BFS、任务调度和消息缓冲。

| 结构 | 随机访问 | 头部插删 | 尾部插删 | 已知位置插删 |
|---|---:|---:|---:|---:|
| 动态数组 | `O(1)` | `O(n)` | 均摊 `O(1)` | `O(n)` |
| 单链表 | `O(n)` | `O(1)` | 无尾指针时 `O(n)` | 已知前驱时 `O(1)` |
| 栈 | 不强调 | — | `push/pop O(1)` | — |
| 队列 | 不强调 | `dequeue O(1)` | `enqueue O(1)` | — |

常见追问：

- 删除单链表某节点通常需要它的前驱；双链表在已知节点时可 `O(1)` 删除，但多存一个指针。
- JavaScript `Array.shift()` 通常涉及后续元素重排，不适合作为高频大队列；可用头指针或环形数组。
- JavaScript Array 是语言级动态数组，引擎会根据元素类型、空洞和稀疏程度采用不同表示，不能简单认为永远是一块连续原生内存。
- 栈和队列描述的是访问规则，可以用数组或链表作为底层结构。

## 8. 高频手写题

手写题先确认输入、输出和是否允许修改原数据，再说循环不变量与复杂度。以下题目共用节点类型：

```ts
interface ListNode {
  val: number
  next: ListNode | null
}
```

### 8.1 链表判环并找到入环点

解题思路：

> 使用 Floyd 快慢指针。慢指针每次走一步，快指针每次走两步；如果没有环，快指针会先到 null；如果有环，两者一定在环中相遇。相遇后把一个指针放回头节点，另一个保留在相遇点，二者都每次走一步，再次相遇的位置就是入环点。

原理证明：

设头到入环点距离为 `a`，入口到首次相遇点距离为 `b`，环长为 `c`。相遇时快指针路程是慢指针两倍：

```text
a + b + k*c = 2(a + b)
a = (k - 1)c + (c - b)
```

所以从头到入口的距离，等于从相遇点继续走到入口的距离再加若干整圈。

```ts
function detectCycle(head: ListNode | null): ListNode | null {
  let slow = head
  let fast = head

  while (fast !== null && fast.next !== null) {
    slow = slow!.next
    fast = fast.next.next

    if (slow === fast) {
      let p1: ListNode = head!
      let p2: ListNode = slow!

      while (p1 !== p2) {
        p1 = p1.next!
        p2 = p2.next!
      }
      return p1
    }
  }

  return null
}
```

复杂度与边界：

- 时间 `O(n)`，空间 `O(1)`。
- 空链表、单节点无环、单节点自环都要覆盖。
- 如果只要求判断是否有环，首次相遇时即可返回 `true`。
- HashSet 也能完成，但需要 `O(n)` 额外空间。

### 8.2 链表形式的两数相加

口述版：

> 先确认数字是否按低位在前存储。若是，就同步遍历两个链表：每一位计算 `sum = x + y + carry`，写入 `sum % 10`，再把 `Math.floor(sum / 10)` 留给下一位。循环必须覆盖两条链表和最后进位，时间为 `O(max(m,n))`。

解题思路：

> 同时遍历两条链表，模拟小学加法。当前位等于 `(x + y + carry) % 10`，新进位等于向下取整除以 10。用虚拟头节点统一首节点创建，循环条件必须包含 carry，避免漏掉最后的进位。

```ts
function addTwoNumbers(
  l1: ListNode | null,
  l2: ListNode | null
): ListNode | null {
  const dummy: ListNode = { val: 0, next: null }
  let tail = dummy
  let carry = 0

  while (l1 !== null || l2 !== null || carry !== 0) {
    const x = l1?.val ?? 0
    const y = l2?.val ?? 0
    const sum = x + y + carry

    carry = Math.floor(sum / 10)
    tail.next = { val: sum % 10, next: null }
    tail = tail.next

    l1 = l1?.next ?? null
    l2 = l2?.next ?? null
  }

  return dummy.next
}
```

复杂度与边界：

- 时间 `O(max(m, n))`。
- 除结果链表外额外空间 `O(1)`，结果空间 `O(max(m, n))`。
- 两条链表长度不同，短的一侧按 0 处理。
- 若数字正序存储，可以用两个栈从低位向高位计算，或先反转链表再相加。

### 8.3 数组去重

口述版：

> 去重方式取决于输入和“相等”的定义：无序基本类型数组要保序可用 `Set`，平均时间 `O(n)`、空间 `O(n)`；已排序数组可用快慢指针原地压缩，时间 `O(n)`、额外空间 `O(1)`；对象数组应先明确按哪个 key 去重，以及保留第一次还是最后一次。

实现对比：

无序数组、保留第一次出现顺序：

```ts
function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)]
}
```

- 平均时间 `O(n)`，空间 `O(n)`。
- `Set` 能将 `NaN` 视为相同值；对象按引用判断，内容相同但引用不同仍是两个元素。

有序数组、原地去重：

> 使用快慢指针，`[0, write)` 始终表示已经去重的有效区间。读指针发现新值时，把它写到 `write`，再移动写指针。

```ts
function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0

  let write = 1

  for (let read = 1; read < nums.length; read++) {
    if (nums[read] !== nums[write - 1]) {
      nums[write] = nums[read]
      write++
    }
  }

  return write
}
```

- 返回的新长度为 `write`，有效内容是 `nums.slice(0, write)`。
- 时间 `O(n)`，额外空间 `O(1)`。
- 无序数组若同时要求严格原地和线性时间，通常无法满足；不用额外集合时容易退化到 `O(n²)`。
- 对象数组按 `id` 去重可以用 Map，但要先明确保留第一次还是最后一次。

### 8.4 反转链表

解题思路：

> 维护 `prev`、`curr`、`next` 三个指针。`prev` 指向已经反转的部分，`curr` 指向待处理节点；先保存 `next`，再把 `curr.next` 指向 `prev`，最后整体前移。保存 next 是为了避免修改指针后丢失后半段链表。

每轮指针变化：

```text
反转前：prev <- 已反转部分    curr -> next -> 未处理部分
改指向：prev <- curr          next -> 未处理部分
向前走：        prev = curr   curr = next
```

循环不变量是：`prev` 始终是已经反转好的链表头，`curr` 始终是尚未处理部分的第一个节点。

```ts
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null
  let curr = head

  while (curr !== null) {
    const next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }

  return prev
}
```

复杂度与边界：

- 时间 `O(n)`，额外空间 `O(1)`。
- 空链表和单节点链表无需单独分支。
- 递归方案虽然也是 `O(n)` 时间，但占用 `O(n)` 调用栈，长链表可能栈溢出。
- 若输入可能有环，要先处理环，否则遍历不会结束。

### 8.5 Promise 并发限制器

先说关键前提：

> 要限制并发，传入的应该是尚未启动的任务函数，而不是已经创建好的 Promise。Promise 创建后，其内部异步操作通常已经开始，此时再调度无法限制启动数量。

解题思路：

> 最多启动 `limit` 个 worker。每个 worker 从共享游标领取一个任务，完成后再领取下一个。结果写回原下标，因此即使完成顺序不同，最终返回顺序仍与输入一致。

```ts
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError("limit must be a positive integer")
  }

  const results = new Array<R>(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  )

  return results
}

function limitAll<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  return mapLimit(tasks, limit, task => task())
}
```

复杂度、失败与取消：

- 调度时间 `O(n)`，结果空间 `O(n)`，在途任务数不超过 `limit`。
- 空任务数组会立即得到空结果。
- 一个任务 reject 时，`Promise.all` 会快速 reject；已经运行的任务不会自动取消。
- 真正取消请求需要任务支持 `AbortSignal`，由调度器通过 `AbortController` 协作取消。
- 如果要求收集全部成功和失败结果，应在单任务内部捕获错误，返回类似 `PromiseSettledResult` 的结构。
- `Promise.allSettled` 负责等待全部结果，但本身不限制并发，二者解决的是不同问题。

### 8.6 防抖与节流

口述版：

> 防抖是连续触发时不断重新计时，只有停止触发一段时间才执行，适合搜索输入和表单校验。节流是在一个时间窗口内最多执行一次，适合滚动、拖拽和高频位置上报。一句话区别是：防抖关心最后一次，节流关心固定频率。

防抖：

```ts
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number
) {
  let timer: ReturnType<typeof setTimeout> | undefined

  function wrapped(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    const context = this

    if (timer !== undefined) clearTimeout(timer)

    timer = setTimeout(() => {
      timer = undefined
      fn.apply(context, args)
    }, wait)
  }

  wrapped.cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  return wrapped
}
```

节流，下面实现首触发和尾触发：

```ts
function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait: number
) {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let latestArgs: Parameters<T>
  let latestContext: ThisParameterType<T>

  function invoke() {
    lastTime = Date.now()
    timer = undefined
    fn.apply(latestContext, latestArgs)
  }

  return function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    latestArgs = args
    latestContext = this

    const remaining = wait - (Date.now() - lastTime)

    if (remaining <= 0) {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      invoke()
    } else if (timer === undefined) {
      timer = setTimeout(invoke, remaining)
    }
  }
}
```

边界与追问：

- 每次调用时间和额外空间都是 `O(1)`。
- 要根据需求明确 leading、trailing、`maxWait` 和 cancel 语义。
- React 中不能每次渲染都重新创建防抖实例，否则定时器状态会丢失；应保持函数实例稳定并在卸载时清理。
- 防抖只减少请求数，不能自动解决旧请求晚于新请求返回的问题；仍需请求序号或 AbortController。
- 如果被包装的是异步函数，节流也不等于限制在途请求数；并发数需要单独管理。

### 8.7 LRU 缓存

口述版：

> LRU 在容量满时淘汰最久没有被访问的元素。通用实现是哈希表加双向链表：哈希表用于 O(1) 定位节点，双向链表维护访问顺序；get 或更新后把节点移到最新端，超容量时删除最旧端。JavaScript Map 保留插入顺序，所以手写时可以通过 delete 再 set，把元素移动到最新位置。

代码示例：

```ts
class LRUCache<K, V> {
  private readonly cache = new Map<K, V>()

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("capacity must be a positive integer")
    }
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined

    const value = this.cache.get(key) as V
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    this.cache.set(key, value)

    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next()
      if (!oldest.done) {
        this.cache.delete(oldest.value)
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }
}
```

复杂度与边界：

- `get`、`put` 平均 `O(1)`，空间 `O(capacity)`。
- 更新已有 key 也算一次访问，必须刷新顺序。
- 如果值本身允许是 `undefined`，只看 `get` 返回值无法区分未命中与命中 undefined，应配合 `has` 或返回 `{ found, value }`。
- 若题目允许容量为 0，则每次 `put` 后都应立即淘汰；上面的实现选择直接拒绝非正容量。
- 生产缓存还可能加入 TTL、容量权重、线程安全、命中率统计和持久化。
- LRU 按最近使用时间淘汰；LFU 按访问频率淘汰。

## 9. P1 基础题速答

这一节用于补漏。每题先说结论和一条机制，面试官继续问再展开。

### 9.1 浏览器事件循环、宏任务与微任务

口述答案：

> JavaScript 主线程先执行当前调用栈；一个任务结束后，会把当前微任务队列清空，Promise 的 `then/catch/finally` 和 `await` 后续通常属于微任务。之后浏览器才可能做渲染，再取下一个任务，例如定时器、网络事件或用户事件。微任务执行过程中新增的微任务也会在本轮继续清空，所以递归创建微任务可能饿死渲染和后续任务。

常见顺序：

```ts
console.log("A")
setTimeout(() => console.log("B"))
Promise.resolve().then(() => console.log("C"))
;(async () => {
  console.log("D")
  await 0
  console.log("E")
})()
console.log("F")

// A D F C E B
```

边界：

- “宏任务”是常用教学术语，规范更常说 task。
- `setTimeout(fn, 0)` 只是尽快排队，不保证零毫秒执行。
- 浏览器并非每执行一个任务都必然渲染一次。
- Node.js 的事件循环阶段与浏览器不同，不要混为一谈。

### 9.2 原型链、`prototype`、`__proto__` 与 `instanceof`

口述答案：

> 每个普通对象都有内部 `[[Prototype]]` 链，属性在自身找不到时会沿链向上找。构造函数的 `prototype` 是一个普通属性；执行 `new Foo()` 时，新对象的 `[[Prototype]]` 会指向 `Foo.prototype`。`obj instanceof Foo` 的核心是检查 `Foo.prototype` 是否出现在 `obj` 的原型链上。`__proto__` 是访问内部原型的历史访问器，代码中更推荐 `Object.getPrototypeOf` 和 `Object.setPrototypeOf`。

`new Foo()` 的概念步骤：

1. 创建新对象。
2. 把其原型设为 `Foo.prototype`。
3. 以新对象为 `this` 调用 `Foo`。
4. 若构造函数显式返回对象则使用该对象，否则返回新对象。

边界：

- 修改 `Foo.prototype` 为一个新对象，不会反向改变旧实例的原型。
- `instanceof` 可被 `Symbol.hasInstance` 定制，也会受跨 iframe 构造函数影响。
- 箭头函数没有自己的 `this`，也不能作为构造函数使用。

### 9.3 `any`、`unknown`、`never`，以及 `type` 与 `interface`

口述答案：

> `any` 基本关闭类型检查，值可以随意读写；`unknown` 表示类型未知，使用前必须缩窄，更适合外部输入；`never` 表示不可能出现的值，可用于穷尽检查或永不返回的函数。`interface` 擅长描述可扩展的对象契约并支持声明合并；`type` 能表达联合、交叉、元组和条件类型。项目里我不机械二选一：公共对象接口可用 interface，流事件的判别联合用 type。

关键边界：

- TypeScript 在运行时会被擦除，`JSON.parse(...) as SomeType` 不能验证网络数据。
- 外部数据应先作为 `unknown`，再通过 Zod、JSON Schema 或类型守卫校验。
- `never` 穷尽检查很适合 `delta/citation/tool/done/error` 事件分发。

### 9.4 Cookie、Web Storage 与 IndexedDB

口述答案：

> Cookie 会按作用域随 HTTP 请求发送，适合服务端需要且体积很小的会话信息；`sessionStorage` 只服务当前标签页，`localStorage` 适合少量非敏感偏好，两者都是同步 API；IndexedDB 是异步结构化数据库，适合较大的离线数据。敏感令牌、容量和跨设备同步不能只靠浏览器存储解决。

方案对比：

| 方案 | 生命周期与容量 | 是否自动随请求发送 | 典型用途 |
|---|---|---|---|
| Cookie | 小，按过期时间或会话 | 是，受 Domain/Path/SameSite 控制 | HttpOnly 会话、服务端需要的小状态 |
| `sessionStorage` | 标签页会话，刷新仍在 | 否 | 单标签页多步骤表单草稿 |
| `localStorage` | 持久、同步 API | 否 | 少量非敏感偏好 |
| IndexedDB | 持久、异步、容量较大 | 否 | 离线数据、结构化草稿、文件缓存 |

项目场景：

> 注册流程使用 sessionStorage 的理由是状态只需在当前标签页刷新后恢复，不希望长期留下虚拟资料。生产实现仍要处理 schema version、TTL、异常 JSON、敏感字段清理和服务端最终校验；如果需要跨设备草稿，就改为服务端草稿，而不是继续扩大浏览器存储。

边界：

- localStorage/sessionStorage 是同步 API，大量读写会阻塞主线程。
- XSS 可以读取 Web Storage；敏感长期凭证不应放 localStorage。
- 前端路由守卫只改善体验，不能代替后端授权和流程校验。

### 9.5 MySQL 为什么常用 B+ 树？联合索引怎么用？

口述答案：

> B+ 树分支多、树高低，非叶子节点主要保存键和子指针，叶子节点按顺序连接，既适合等值查询，也适合范围扫描；较少的树高意味着较少的磁盘页访问。InnoDB 聚簇索引的叶子保存整行，二级索引叶子保存主键，因此通过二级索引查非覆盖字段通常还要回表。

联合索引 `(a, b, c)` 的常用判断：

- 可以有效支持以 `a`、`a+b`、`a+b+c` 为左侧连续前缀的查询。
- 不是“出现范围条件后索引完全失效”；范围列本身仍可用于定位，但其右侧列通常难以继续缩小扫描区间。是否能继续用于过滤要看执行计划与数据库版本。
- 覆盖索引能直接从索引得到查询字段，减少回表。
- 索引会增加写入成本和空间，并非越多越好。

RAG 数据模型可以这样画：

```text
user / tenant
  -> pack
     -> source(document/url/note, version, content_hash)
        -> chunk(position, text, token_count)
           -> embedding(model, dimension, index_version)

conversation -> message -> citation(chunk_id)
run -> run_event(seq, type, payload)
```

权限条件应在召回候选之前进入检索查询；先跨租户召回再过滤，不仅浪费 Top-K，还可能通过分数、缓存或日志造成信息侧漏。

### 9.6 事务、隔离级别与并发异常

口述答案：

> ACID 分别是原子性、一致性、隔离性和持久性。隔离级别从低到高常见为 Read Uncommitted、Read Committed、Repeatable Read、Serializable，隔离越强通常并发代价越高。脏读是读到未提交数据；不可重复读是同一行两次读取结果不同；幻读是同一查询条件两次得到的行集合变化。InnoDB 默认通常是 Repeatable Read，并通过 MVCC 与锁共同实现。

边界：

- “一致性”是事务执行前后满足业务约束，不只是数据没有损坏。
- MVCC 主要服务一致性读；当前读、更新和范围并发还会涉及记录锁、间隙锁或 next-key lock。
- 不要把“隔离级别越高越好”当作结论，应按一致性、锁冲突和吞吐需求取舍。

### 9.7 REST：PUT、PATCH、幂等、分页与错误结构

口述答案：

> PUT 通常表示用给定表示整体替换目标资源，PATCH 表示部分修改。幂等是同一个请求执行一次和多次对目标资源的效果相同，不等于响应一定相同。GET、PUT、DELETE 在语义上应幂等，POST 通常不保证；创建 run、上传或支付这类 POST 可以通过 Idempotency-Key 实现业务幂等。

推荐错误结构：

```json
{
  "code": "RUN_NOT_FOUND",
  "message": "任务不存在或已过期",
  "requestId": "req_xxx",
  "details": []
}
```

分页选择：

- 页码/offset：实现简单，适合小规模后台；深页扫描慢，数据变动时容易重复或遗漏。
- cursor：使用稳定排序键加唯一键继续扫描，更适合消息、事件和大数据列表。

### 9.8 Flask 请求生命周期与流式上下文

口述答案：

> 请求进入后，Flask 建立 application context 和 request context，执行 `before_request`，匹配路由并调用 view；响应阶段执行 `after_request`，最后 teardown 回调负责清理。异常会进入错误处理路径。流式 generator 的迭代发生在 view 已返回之后，若仍要访问 `request`，需要 `stream_with_context`；数据库 session、日志 trace 和取消信号也要明确跟随整个流生命周期。

边界：

- `after_request` 不是处理所有清理工作的唯一位置；即使异常也要释放的资源更适合 teardown 或 `finally`。
- 已发送响应头后发生异常，不能可靠地改成普通 500，应发送业务 `error` 事件或断流。
- 开发服务器能流式返回，不等于生产 WSGI、Nginx、CDN 链路一定不会缓冲。

### 9.9 Go 的 goroutine、channel、context

口述答案：

> goroutine 是 Go 运行时调度的轻量并发执行单元；channel 用于 goroutine 之间传递数据和同步，但共享状态也可以用 mutex，不能为了使用 channel 而使用；context 用于跨调用链传递截止时间、取消信号和请求级元数据。context 应由上游传入并在函数间显式传播，不应用来存任意业务参数。

把 Flask 流式接口迁到 Go 的拆分思路：

1. Handler 负责鉴权、校验、创建 `runId`。
2. Retrieval service 构造上下文。
3. Model client 持续返回结构化事件。
4. Stream writer 写 SSE，并在每帧后 `Flush`。
5. 监听 `r.Context().Done()`，向检索、模型调用和后台任务传播取消。
6. 独立 run store 保存状态与 seq，支持断线恢复和多实例部署。
7. 用并发上限、超时和背压保护模型与数据库，不能为每个请求无限创建 goroutine。

边界：

- goroutine 很轻，但不是零成本；泄漏同样会消耗内存和连接。
- 无缓冲 channel 的发送和接收会互相等待；缓冲 channel 只能吸收短期峰值，不能替代容量规划。
- 关闭 channel 通常由发送方负责；向已关闭的 channel 发送会 panic。

### 9.10 SSR、SSG、CSR 与 hydration mismatch

口述答案：

> CSR 在浏览器生成页面，SSR 每次请求由服务端生成 HTML，SSG 在构建时预生成 HTML。服务端生成的页面通常还要 hydration，即客户端接管已有 HTML。若客户端首轮渲染与服务端 HTML 不一致，就会 hydration mismatch；应让数据、时区和随机值等首屏输入确定，不能隐藏警告。

hydration mismatch 表示客户端首次渲染树与服务端 HTML 不一致，常见原因包括：

- render 阶段使用 `Date.now()`、`Math.random()`。
- 直接读取 `window`、localStorage 或依赖浏览器尺寸。
- 服务端与客户端的数据、时区或语言环境不同。
- 非法 HTML 被浏览器自动修正。
- 条件渲染和异步数据时序不同。

修复原则是让首轮输出确定且一致；仅客户端数据放到 mounted/effect 后更新，不能靠忽略 warning 掩盖问题。

### 9.11 如何做前后端与 AI 链路监控？

口述答案：

> 我会让一次生成具有统一的 `requestId、conversationId、messageId、runId`，前后端日志和事件都带这些关联字段。指标至少拆成请求排队、检索、模型首 token、流传输、前端首帧与最终渲染，不能只报一个总耗时。

建议指标：

```text
TTFT = 首个 delta 到达客户端 - 用户发起请求
retrieval_latency
model_first_token_latency
generation_duration
stream_disconnect_rate
cancel_success_rate
error_rate by stage
tokens / cost per run
frontend long tasks / dropped frames
```

隐私边界：

- 日志默认不记录完整 Prompt、文档正文、JWT 和用户隐私。
- 标识符需要最小化、脱敏并做访问控制。
- 采样错误响应时也要清洗模型输出和工具参数。

## 10. 面试前必须补齐的真实信息

下面这些内容无法仅凭简历替你确定，必须按真实代码和经历填写：

| 待确认项 | 你需要准备的证据 |
|---|---|
| AI 知识工作台 中你亲自新增的模块 | 文件路径、核心类/函数、一次提交或现场演示 |
| 一个最重要的技术取舍 | 候选方案、选择原因、带来的代价 |
| 当前可完整演示的链路 | 从哪个入口开始、预期看到什么、失败时如何降级 |
| 项目尚未完成的能力 | 明确区分“未做”“实验过”“已跑通”“生产可用” |
| AI 编程工具的真实案例 | 任务、AI 的错误、你如何验证和修正 |
| 可量化结果 | 只报真实测量；没有数据就说“尚未系统测量”，并给出测量方案 |
| 北京与到岗意愿 | 真实地点选择和可到岗日期 |

文中目前共有少量 `[请填写]` 占位，面试前应全文搜索并替换。

### 10.1 每道题的练习方式

1. 不看文档，先用 30-60 秒回答。
2. 对照本文，只补漏掉的“机制”和“边界”，不要整段背诵。
3. 让同学从答案中的名词继续追问三层，例如：Hybrid → RRF → 参数与评测。
4. 项目题必须能落到代码、日志、截图或演示，理论题必须能画出数据流。
5. 录音复盘，删除空话和未经证明的形容词。

### 10.2 一道题的合格标准

```text
有结论
+ 讲得清机制
+ 能联系真实项目
+ 知道失败与边界
+ 不虚构数据
= 业务一面可用答案
```
