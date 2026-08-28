# 360 AI 应用前端一面预判

# RAG 方案选型

## Q5：为什么使用 RAG，而不是全文 Prompt、普通搜索或微调？

**短回答：**

RAG 适合知识需要更新、回答需要引用且全文过长的场景；全文 Prompt 适合短而固定的资料，关键词搜索适合精确术语，微调更适合稳定行为和格式。选择方案时应比较召回误差、上下文成本、更新方式和可追溯性。

**原理：**

RAG 把频繁变化的知识与模型参数解耦。离线链路负责解析、切块、向量化和建索引；在线链路负责查询改写、混合召回、重排、上下文组装、生成和引用校验。全文 Prompt 没有召回误差，但受上下文窗口、成本和噪声限制；关键词搜索擅长精确词，却较难覆盖语义改写；微调主要改变模型行为和输出形式，不适合承载需要频繁更新、逐条追溯的事实。是否选择 RAG，最终要用检索命中率、答案忠实度、引用正确率、延迟和成本共同验证。

**代码 / 场景：**

选一份 20 页产品文档做四路对照实验：全文塞入 Prompt、浏览器关键词搜索、固定问答微调假设和 RAG。记录上下文长度、是否能返回原文位置、资料更新成本和错误案例，用同一组五个问题解释为什么当前需求优先 RAG，同时指出短文档场景下全文 Prompt 可能更简单。

**递进追问：**

1. **什么情况下全文 Prompt 反而比 RAG 更合适？**

   文档很短、一次性使用且能完整放入上下文时，全文输入省去切块与召回误差；仍需控制敏感信息、提示注入和模型上下文成本。

2. **为什么不直接微调模型记住企业知识？**

   微调更适合改变行为或风格，不擅长频繁更新且要求逐条引用的事实；企业资料变化时 RAG 可重建索引并保留来源，回滚和审计更直接。

**易错点：**

- 不要宣称 RAG 必然更准确，召回失败或坏切块同样会降低答案质量。
- 不要把普通关键词搜索贬低为落后方案，精确编号、专有名词和错误码常由关键词检索更稳。

**参考来源：**

- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [OpenAI：Retrieval 指南](https://platform.openai.com/docs/guides/retrieval)
- [OpenAI：Fine-tuning 指南](https://platform.openai.com/docs/guides/fine-tuning)

# AI 编程工具安全

## Q10：如何安全、可信地使用 Codex、Cursor 等 AI 编程工具？

**短回答：**

AI 编程工具适合代码库理解、方案比较、重复骨架、测试和重构建议，但需求、边界、权限和最终验收仍由开发者负责。正确流程是先限定范围与验收条件，再审查 diff、运行独立测试，并避免向外部工具发送密钥或个人数据。

**原理：**

AI 编程代理的输入、外部文档和生成结果都应按不可信数据处理。主要风险包括提示注入、密钥或源码外泄、越权写入、危险命令、恶意依赖、许可证冲突，以及生成代码与测试共享同一错误假设。可靠控制链应包含最小文件与网络权限、隔离的凭据、受控命令白名单、逐文件 diff 审查、独立设计的测试、安全与依赖扫描、可追溯日志；发布、删除、上传和权限变更等高影响动作还要保留人工确认。

**代码 / 场景：**

在不含真实凭据的临时仓库中演练一次受限代理工作流：只开放指定目录的读取和单个分支写入，默认关闭外网与发布权限；先写验收条件和禁止修改清单，再让工具生成候选补丁。随后逐文件审查 diff，运行独立编写的边界测试、类型检查、密钥扫描和依赖审计，并故意放入一条来自 README 的恶意操作指令，验证代理不会越权执行或外传数据。

**递进追问：**

1. **怎样防止 AI 工具把敏感代码或密钥发到外部？**

   遵守组织的数据策略，敏感仓库使用获批环境，提示中不粘贴凭据和个人数据；提交前运行密钥扫描，并把工具输出当不可信第三方代码审查。

2. **AI 生成的测试全部通过就能合并吗？**

   不能，测试可能与错误实现共享同一假设；还要依据需求独立设计边界样例、检查未覆盖路径，并进行人工代码评审和必要的安全检查。

**易错点：**

- 不要说“AI 帮我写了大部分代码所以效率高”，应说明自己控制的需求、验证和取舍。
- 不要把工具建议直接复制进仓库，许可证、依赖、安全与风格都需要核对。

**参考来源：**

- [GitHub：Responsible use of Copilot code review](https://docs.github.com/en/copilot/responsible-use/copilot-code-review)
- [OWASP：Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

# 项目技术原理

## Q13：BLE 为什么常按 20 byte 分片？

**短回答：**

常见的 20 byte 来自默认 ATT MTU 为 23 byte，再扣除写入或通知通常占用的 3 byte 协议头；它不是 BLE 永久固定上限。实际分片必须读取协商后的 MTU，并继续处理序号、重试和 UTF-8 字节边界。

**原理：**

- MTU 是 ATT 层单个 PDU 的最大长度。
- 默认常见值 23，写请求/通知的属性协议头会占用空间。
- 不应直接按 JavaScript 字符串长度切分，应先编码成字节数组。
- 多字节字符可能跨分片，但只要接收端先按字节重组、再统一 UTF-8 解码即可。
- 长数据需要应用层 framing，例如：

```text
version | messageId | seq | total | payload | checksum
```

**代码 / 场景：**

用真实 BLE 外设做一次分片实验：读取协商后的 MTU，分别按默认 ATT_MTU 23 和更大 MTU 计算可用载荷，发送包含多字节中文的录音元数据。记录序号、总片数和 CRC，故意丢失中间片，验证接收端不会把“20 byte”写死或静默拼出损坏数据。

**递进追问：**

1. **为什么常见说法是 20 byte，而不是 23 byte？**

   默认 ATT_MTU 为 23，写请求或通知还要占用 3 字节 ATT 操作码与句柄，因此常见应用载荷是 20；不同操作和协商后 MTU 会改变上限。

2. **MTU 变大后是否可以一次发送任意长度数据？**

   不可以，还受特征属性、平台 API、链路层数据长度和设备缓冲影响；应用协议仍应定义分片、顺序、重试和完整性校验。

**易错点：**

- 不要把 20 byte 说成 BLE 标准永远不变的硬限制，它只是常见默认载荷。
- 不要按 JavaScript 字符数切中文字符串，必须先编码为字节再按实际载荷切片。

**参考来源：**

- [Bluetooth Core Specification](https://www.bluetooth.com/specifications/specs/core-specification/)
- [MDN：Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

## Q14：配置流程为什么适合状态机？

**短回答：**

状态机就是一张“流程交通图”：状态表示当前走到哪一步，事件表示刚发生了什么，守卫条件决定这次能不能跳转，副作用才负责连接设备或调用接口。它把合法路径集中定义，能直接排除“同时成功又失败”等非法组合，也让超时、取消和重试可以逐条测试。

**原理：**

状态机把流程从零散的 if/else 提升为一个可验证的迁移模型：

- **状态**：保存当前流程位置和继续执行必需的数据，例如 scanning、connecting、configuring。
- **事件与守卫**：事件表示“发生了什么”，守卫函数只根据当前上下文决定该迁移是否合法。
- **迁移与副作用**：迁移计算下一状态；连接蓝牙、调用接口等副作用由独立执行器启动，完成后再发回成功或失败事件。

非法事件应被拒绝或记录，不能悄悄跳步。页面刷新后只恢复可序列化状态，外设连接和未完成请求必须重新确认，这是流程状态与外部世界的边界。

**代码 / 场景：**

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

**递进追问：**

1. **为什么多个 boolean 不足以描述配置流程？**

   connecting、success、error 等布尔值可能组合出同时成功又失败的非法状态；显式状态与事件表只允许定义过的转移，也便于测试超时和取消。

2. **状态机中的副作用应放在哪里？**

   转移本身保持可预测，连接、写入和计时器由进入状态后的 effect 执行；结果再作为事件回送，并在离开状态时清理未完成资源。

**易错点：**

- 不要让 UI 组件直接跨过中间状态修改最终结果，否则日志与恢复无法解释。
- 不要只画正常路径，断连、权限拒绝、重复事件和取消才是状态机价值所在。

**参考来源：**

- [Stately：State machines](https://stately.ai/docs/machines)
- [W3C：SCXML State Machine Recommendation](https://www.w3.org/TR/scxml/)

## Q15：配置化表单应该如何设计？

**短回答：**

schema 可以先理解为一份“表单说明书”，它描述每个字段的类型、默认值、校验、显隐和权限，而不是把规则散落在组件里。字段联动用依赖关系只重算受影响项；异步校验要取消旧请求或忽略旧结果；后端仍要做最终权限与业务校验。

**原理：**

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

**代码 / 场景：**

为 SRM 表单定义一份可执行 schema，包含字段类型、默认值、校验、可见条件和权限，再建立 sourceField 到受影响规则的反向索引。用 200 个字段压测初次加载和单字段修改，确认只重算相关依赖；同时验证服务端仍对金额、权限和必填规则做权威校验。

**递进追问：**

1. **字段 A 控制 B，B 又控制 A 时如何避免循环？**

   保存规则时先对依赖图做环检测，运行时记录本批访问路径并在值未变化时停止传播；无法消除的业务环应拒绝配置并给出具体路径。

2. **schema 版本升级后旧草稿怎样恢复？**

   草稿保存 schemaVersion，加载时按明确迁移函数补默认值、重命名字段或标记不兼容；迁移失败保留原始快照并提示人工处理，不能静默丢字段。

**易错点：**

- 不要把任意 JavaScript 表达式存进配置执行，这会引入注入、安全和不可审计问题。
- 不要监听整个表单对象做所有联动，字段规模增长后会造成重复遍历和难以定位的级联更新。

**参考来源：**

- [JSON Schema：Creating your first schema](https://json-schema.org/learn/getting-started-step-by-step)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Vue：Watchers](https://vuejs.org/guide/essentials/watchers.html)

## Q16：`Promise.allSettled` 为什么适合批量上传？

**短回答：**

`Promise.all` 遇到第一个 reject 就整体 reject，其他任务虽然可能还在执行，但调用方拿不到完整结果；`allSettled` 会等待每个任务结束并返回 fulfilled/rejected 状态，适合允许部分成功的批量上传。不过它不负责限制并发，也不等于自动重试，所以大量文件仍要配合并发池、进度、取消和重试。

**原理：**

Promise.allSettled 会为每个输入建立独立的成功和失败处理，直到所有输入都已终止才解决聚合 Promise：

- 输出数组严格保留输入顺序，与任务实际完成先后无关。
- 每个结果都是 fulfilled/value 或 rejected/reason，因此批量上传可以分别标记成功、重试失败项。
- 它只负责聚合结果，不限制并发、不取消请求、不自动重试，也不会回滚已成功项。

因此完整的批量上传器还需要并发池、AbortSignal、进度模型、幂等键和失败重试策略。如果任一文件失败都不允许继续，则应使用更强的整体事务或补偿机制，而不是只换一个 Promise API。

**代码 / 场景：**

构造五个独立上传任务，其中两个超时、一个校验失败，使用 Promise.allSettled 收集每项结果并按文件 ID 更新界面。只对网络类失败开放重试，保留已成功项，提交按钮依据业务要求判断“全部成功”还是“允许部分成功”，而不是把 settled 误认为整体成功。

**递进追问：**

1. **什么时候仍应使用 Promise.all？**

   后续步骤必须依赖所有任务成功且任何失败都应立即进入统一错误流程时，Promise.all 的快速拒绝语义更清晰；但已经启动的请求仍需单独取消。

2. **allSettled 能自动解决并发过高吗？**

   不能，它只改变结果收集方式，不限制同时启动数量；大量文件还需并发队列、AbortController、超时和服务端幂等键。

**易错点：**

- 不要只检查 allSettled 返回数组存在，必须逐项区分 fulfilled 与 rejected。
- 不要对权限拒绝或格式错误无限重试，重试条件必须按错误类型和幂等性定义。

**参考来源：**

- [MDN：Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN：JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Q17：Three.js 点位如何从世界坐标映射到屏幕？

**短回答：**

先把模型中的世界坐标交给相机投影，得到范围为 `-1` 到 `1` 的标准化设备坐标（NDC），再按画布宽高换算成页面像素。标签仍可能位于相机后方或被物体遮挡，所以投影坐标只解决“画在哪里”，不等于“应该显示”。

**原理：**

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

**代码 / 场景：**

在 Three.js 场景中选一个世界坐标点，先更新对象和相机矩阵，再复制 Vector3 调用 project(camera)，把 NDC 的负一到一映射到画布像素。滚动、缩放和设备像素比变化时重新计算，并检测点是否在相机后方或被遮挡，验证标签不会错误漂移。

**递进追问：**

1. **为什么投影后标签位置仍可能偏移？**

   常见原因是使用窗口尺寸而非渲染画布矩形、忽略 CSS 缩放或相机矩阵尚未更新；应以 getBoundingClientRect 和当前 camera 数据完成映射。

2. **仅凭投影坐标能判断标签可见吗？**

   不能，NDC 范围只能判断视锥位置；对象可能被其他模型遮挡，还需 raycaster 或深度策略，并为大量点控制检测成本。

**易错点：**

- 不要直接修改模型原始 Vector3 做 project，否则世界坐标会被覆盖。
- 不要把 devicePixelRatio 重复乘入 CSS 坐标，WebGL 缓冲像素与页面布局像素是不同坐标系。

**参考来源：**

- [Three.js：Vector3.project](https://threejs.org/docs/#api/en/math/Vector3.project)
- [Three.js：Cameras](https://threejs.org/manual/en/cameras.html)

# RAG、Agent 与模型原理

## Q18：从资料入库到带引用回答，完整 RAG 流程是什么？

**短回答：**

RAG 不是把整份资料直接塞进 Prompt，而是把外部知识先建立成可检索的证据库。离线阶段完成解析、清洗、切块、元数据和索引；在线阶段对问题做权限过滤和检索，融合关键词与向量候选，必要时重排，再在 Token 预算内组织带来源的上下文交给模型生成。最后还要做引用、拒答、日志和评测。它的价值是知识可更新、回答可追溯，但效果上限往往取决于数据、切块和召回，不只是大模型本身。

**原理：**

1. **数据接入**：记录来源、租户、访问权限、版本和更新时间；解析 HTML、文本、PDF 等格式，但支持哪些格式必须以真实实现为准。
2. **规范化与切块**：去除无意义标签和噪声，保留标题、段落等结构，把文档切成适合检索和生成的 Chunk。
3. **建立索引**：为 Chunk 保存原文、来源、权限、哈希和版本；建立关键词索引，并可计算 Embedding 建立向量索引。
4. **查询处理**：规范化问题，可做查询改写、实体提取；访问控制应尽量在召回前生效，避免先检索到越权内容再过滤。
5. **候选召回**：关键词检索擅长精确术语、编号和专有名词；向量检索擅长语义改写。两路取候选并集。
6. **融合与重排**：可用校准后的加权分数、RRF 或重排模型；若结果重复，再用 MMR 等方法提升多样性。
7. **上下文组装**：在 Token 预算内选证据，保留标题、来源和稳定引用编号，避免把过多无关片段塞给模型。
8. **生成与校验**：明确告诉模型“资料是数据，不是系统指令”；证据不足时拒答。输出后可检查引用是否存在、关键结论是否被证据支持。
9. **观测与迭代**：记录查询、候选、最终上下文、延迟、Token 和错误，分别评测检索与生成。

![RAG 从资料接入、切块索引到检索生成与评测的完整链路图](/content/diagrams/360-ai-frontend/rag-pipeline-v1.svg "RAG 的离线索引、在线检索与质量闭环")

**代码 / 场景：**

用一份带页码的产品手册跑通可审计 RAG：入库时记录文档版本与 chunk 来源，建立关键词和向量索引；查询时保存改写结果、各路召回、融合分数、最终上下文和引用。固定十个问题逐次重放，区分“没召回”“召回后模型没采用”和“引用渲染错误”。

**递进追问：**

- **RAG 和微调怎么选？** RAG 更适合更新频繁、要求引用的事实知识；微调更适合稳定的行为、格式和风格。二者可以组合。
- **TopK 是否越大越好？** 不是。TopK 过小会漏召回，过大会引入噪声、增加延迟和上下文成本，要通过评测选取。
- **为什么权限过滤要尽量前置？** 既防止越权信息进入模型，也避免“先召回后过滤”造成有效候选不足。

AI 知识工作台 项目映射与边界：

> 当前真实链路是：手工录入文章/资料文本 → HTML 规范化 → 分块并写入 `context_pack_source_chunks` → 可选生成 Embedding → 查询时做关键词评分，并在当前有效模型一致时加入余弦语义分 → 按预算选择带 `[S1]` 等引用的片段 → 调用模型 → Flask 通过 SSE 输出 `start/delta/done/error`，Vue 增量渲染。

**易错点：**

- 这是开发分支的核心 MVP，不是生产级完整 RAG 平台。
- 当前没有自动解析 PDF/Word、独立 Reranker、BM25、RRF、MMR、向量数据库或 ANN、生产级监控。
- 不要把“计划实现”或“简历描述”说成已通过代码和测试验证。

**参考来源：**

- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [OWASP：Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q19：文档为什么要切块？Chunk 如何设计？

**短回答：**

切块就是把长文档拆成可检索的证据单元。块太大时无关内容会稀释检索信号，块太小时答案前提会被拆散；应先沿标题、段落、表格或函数等自然边界切，再用真实问题验证命中率和答案完整度。

**原理：**

- **固定长度切分**实现简单，但容易从句子、表格或代码中间切断。
- **结构切分**优先利用标题、段落、列表、表格和代码块，通常更利于解释和引用。
- **语义切分**根据话题变化确定边界，质量可能更好，但计算与实现成本更高。
- **Overlap**可以保留跨边界信息，但会增加存储、Embedding 成本和重复召回。
- Chunk 应携带 `source_id`、标题路径、页码或段落位置、权限、版本等元数据，不能只保存一段裸文本。
- 字符数和 Token 数不是同一概念，尤其中文和代码差异较大。索引切块可以按字符近似，但生成上下文预算最好使用对应模型的 tokenizer，或明确说明只是估算。

**代码 / 场景：**

把同一份包含标题、表格和代码的文档分别按固定 300 字、递归标题边界和语义段落切块。对五个跨段问题记录召回命中、重复率和上下文占用，再调整 overlap；同时保存 startOffset、页码和标题路径，保证回答引用能回到原文。

**递进追问：**

- **表格和代码怎么切？** 尽量保持表头与数据行、函数签名与函数体完整；必要时增加父级摘要或标题路径。
- **重叠是不是越大越好？** 不是。重叠过大会导致重复候选挤占 TopK，还会增加索引与上下文成本。
- **如何选参数？** 建立包含短问、长问、精确名词、跨段问题的验证集，比较 Recall@K、重复率、答案引用质量和成本。

AI 知识工作台 项目映射与边界：

> 当前实现先清理 `script/style` 和 HTML 标签，并恢复 `<br>`、段落等换行；配置是 `max_chars=900`、`overlap=120`。实现会优先按段落聚合，只有单个段落超过 900 个字符时才按步长 780 滑窗，所以普通段落块之间并不一定有 120 字符重叠。

**易错点：**

- “使用 900 Token 切块”——实际是字符近似。
- “所有相邻 Chunk 都有 120 字重叠”——实际不是。
- “已经实现语义切块”——当前没有。
- “资料更新只增量重算变化块”——当前更新会删除旧 Chunk 后全量重建。

**参考来源：**

- [OpenAI：Retrieval 指南](https://platform.openai.com/docs/guides/retrieval)
- [RAG 原始论文](https://arxiv.org/abs/2005.11401)

## Q20：什么是 Hybrid Retrieval？为什么关键词和向量要结合？

**短回答：**

Hybrid Retrieval 就是让两种“找资料的方法”合作：关键词检索擅长错误码、编号和原句，向量检索擅长同义表达。两路先各自找候选，再按排名融合或统一重排，能互相补漏；但效果必须用同一批问题做对照评测，不能默认混合一定更好。

**原理：**

- 稀疏检索依据词项匹配，例如倒排索引和 BM25；优势是精确、可解释，缺点是对同义改写较弱。
- 稠密检索把查询和文档映射到同一向量空间，以余弦相似度或点积找近邻；优势是语义泛化，缺点是可能错过罕见编号，也受模型版本与领域分布影响。
- 两路候选先做并集，再选择：
  - 对分数归一化、校准后加权；
  - 用 RRF 按名次融合，绕过分数量纲差异；
  - 用 Cross-Encoder 或其他 Reranker 对候选重新打分。
- 去重键应使用稳定的 Chunk 身份，不能只按当前数组下标去重。

**代码 / 场景：**

为查询“ERR_CONN_104 如何恢复”同时运行 BM25 与向量检索：关键词路保住精确错误码，向量路召回语义相近的断线说明。把两路原始排名、归一化前分数和融合结果写入调试面板，测试专有名词、自然语言和混合查询三组样本。

**递进追问：**

- **为什么不能直接加 BM25 分和余弦分？** 二者范围和分布不同，同一个数字不代表相同置信度；应校准、归一化或采用按排名融合。
- **向量失败怎么办？** 明确降级为关键词检索，并记录降级原因；不能让整个问答不可用。
- **是否一定优于单路检索？** 不一定，必须在同一评测集和相同生成配置下做消融实验。

AI 知识工作台 项目映射与边界：

> 当前不是 BM25 加向量数据库。关键词是应用层启发式评分：标题每命中一个查询词加 8，正文词频计数封顶 5；来源优先级使用 high/medium/low 权重 1.35/1.0/0.75。若 Embedding 有效，则把 `max(cosine, 0) * 100` 作为语义分参与组合。这个 `*100` 是经验尺度，必须靠评测调参，不能宣称具有概率意义。

准确说法是“关键词启发式评分 + 可选向量相似度的混合召回，失败时回退关键词”；不要说已经使用 BM25、标准化分数融合或经过线上效果验证。

**易错点：**

- 不要把“关键词加向量”本身当作质量保证，融合参数仍需基于真实查询评测。
- 不要忽略中文分词、缩写和大小写归一化，它们会直接影响关键词召回。

**参考来源：**

- [Weaviate：Hybrid search](https://docs.weaviate.io/weaviate/concepts/search/hybrid-search)
- [RRF 原论文](https://doi.org/10.1145/1571941.1572114)
- [RAG 原始论文](https://arxiv.org/abs/2005.11401)

## Q21：RRF 是什么？公式和参数怎么解释？

**短回答：**

RRF 是“只看名次的合榜方法”。同一段资料在关键词榜和向量榜越靠前，累加得到的分数越高；它不直接相加两种含义不同的原始分数。`k` 控制榜首与后续名次的差距，常见的 60 只是实验起点，候选窗口和参数仍要按业务评测。

**原理：**

```text
RRF(d) = Σ 1 / (k + rank_i(d))
```

- `rank_i(d)` 是文档 `d` 在第 `i` 个结果列表中的名次；未出现则该路不贡献。
- `k` 越小，越强调头部名次；`k` 越大，不同名次之间差异越平缓。
- 原论文实验中常见 `k=60`，这是经验起点，不是所有业务的固定最优值。
- 若不同检索器可靠性不同，可扩展成 `Σ w_i / (k + rank_i)`，但要说明这是加权扩展，而非原始无权公式。


1. 分别取关键词和向量 TopN。
2. 用稳定 Chunk ID 合并候选。
3. 按每路名次累计 RRF 分数。
4. 排序后取融合 TopK，再决定是否进入 Reranker 或 MMR。

**代码 / 场景：**

准备两份有意让 BM25 与向量分数尺度完全不同的排名列表，按 RRF 公式逐项计算 1/(k+rank)，验证同一文档在两路靠前时自然累加。用 k=10、60、100 对比头部差异，并保存文档去重键，避免同一 chunk 因索引副本被重复计分。

**递进追问：**

- **RRF 的优势是什么？** 不需要让 BM25 分和余弦分处于同一数值尺度。
- **缺点是什么？** 只看名次，不看第一名领先第二名多少；结果也受各路召回窗口影响。
- **复杂度如何？** 累计阶段近似为所有输入结果长度之和，再对候选并集排序。

AI 知识工作台 项目边界：

> 当前代码没有 RRF。真实实现是两路启发式原始分组合。面试时可以把 RRF 作为明确的下一步改进方案，但不能说“项目已经用 RRF 融合”，除非能现场指出实现、配置和测试。

**易错点：**

- 不要把 RRF 说成融合原始相似度，它只使用各路排名位置。
- 不要在合并前缺少稳定文档 ID，否则同一内容无法累分，重复 chunk 还会挤占候选。

**参考来源：**

- [RRF 原论文](https://doi.org/10.1145/1571941.1572114)
- [Weaviate：Hybrid search](https://docs.weaviate.io/weaviate/concepts/search/hybrid-search)

## Q22：MMR 是什么？如何减少重复上下文？

**短回答：**

MMR 是“边选相关资料，边避免重复”。它每轮选择一段既贴近问题、又不太像已选内容的候选，`λ` 越大越看重相关性，越小越看重多样性。它只能整理已经召回的候选，不能把第一阶段漏掉的证据重新找回来。

**原理：**

MMR 不是另一种向量检索，而是对已召回候选集做迭代选择。每轮都给未选文档计算：

- **查询相关性**：候选文档与用户问题有多匹配。
- **内容冗余度**：候选文档与已选集合中最相似的文档有多重复。
- **权衡系数 λ**：越接近 1 越重视查询相关性，越接近 0 越鼓励多样性。

算法选出当前最高分项后把它加入已选集，再重复到 Top-K 满足。两类相似度必须使用可比较的尺度，候选集过小时 MMR 也无法找回未被召回的证据。评估时应同时检查答案覆盖率和重复率，防止为了“多样”选入不相关片段。

**代码 / 场景：**

从同一章节召回十个高度相似 chunk，先按相关性取第一项，再计算每个候选与已选集合的最大相似度，用 lambda 平衡查询相关性和新信息。分别以 0.3、0.7 运行，人工标注是否遗漏关键答案，观察多样性提升是否牺牲了核心证据。

**递进追问：**

- **MMR 是召回还是重排？** 通常是对已召回候选做迭代选择或重排，不提高原始召回率。
- **和去重有什么不同？** 精确去重判断“是否相同”；MMR 还会降低内容高度相似但不完全相同的片段。
- **复杂度如何？** 若候选数为 N、选择 K 个，缓存向量后朴素选择约需 O(KN) 次相似度比较。

AI 知识工作台 项目边界：

> 当前没有 MMR，也没有独立的语义去重重排。可以建议先扩大候选池，再用 MMR 选入上下文，并在评测中观察重复率和 Recall 的变化；不能把它描述为现有能力。

**易错点：**

- 不要把 MMR 当去重算法，它是在相关性与多样性之间做贪心选择。
- 不要在候选池很小或召回已失败时盲目做多样化，否则会进一步稀释有效证据。

**参考来源：**

- [MMR 原论文](https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf)
- [Qdrant：Maximal Marginal Relevance](https://qdrant.tech/documentation/search/search-relevance/#maximal-marginal-relevance-mmr)

## Q23：RAG 应该如何评测？

**短回答：**

评测 RAG 不能只看最后答对没有：先检查正确资料有没有被找回、排得是否靠前；再检查回答是否覆盖要点、是否忠于证据、引用是否指对；最后看延迟、成本、失败率和越权风险。测试集和文档、索引、模型、Prompt 版本都要固定，才能知道改动究竟改善了哪一层。

**原理：**

RAG 评测必须拆开检索、生成和端到端三层，否则只能看到“答错了”，却不知道错在哪里：

1. **数据集**：从真实查询抽样，为每题标注可接受证据、答案要点和拒答条件，并保留时间、权限与版本。
2. **检索层**：用 Recall@K、MRR 或 nDCG 检查正确证据是否进入候选且排名足够靠前。
3. **生成层**：分别评估答案覆盖、对证据的忠实度、引用指向和无证据时的拒答行为。
4. **系统层**：记录首字延迟、总延迟、token 成本、超时、权限泄漏和用户任务成功率。

每次实验必须锁定文档、切块、Embedding、索引、Prompt 和模型版本，再按“没召回”“召回错”“有证据却生成错”分桶复盘。

**代码 / 场景：**

建立 30 条带标准证据的最小评测集，覆盖可回答、跨块、无答案和恶意指令。分别计算 recall@k、MRR、引用命中与无答案拒答，再让人工按忠实度和完整性复核；每次改切块、模型或提示都保存版本与逐题差异，不只看单个总分。

**递进追问：**

- **忠实是否等于正确？** 不等于。回答可能忠实复述了一份错误或过期资料，所以还要检查来源质量和事实正确性。
- **离线好是否代表线上好？** 不一定，还要看真实查询分布、延迟、成本、用户反馈和安全事件。

AI 知识工作台 项目边界：

> 当前尚未建立完整的版本化 Gold Set，也没有可核验的 Recall@K、MRR、nDCG 或 Faithfulness 结果。因此正确回答是“已跑通链路，但效果还没有被系统量化证明；下一步会建立数据集做消融”，不能编造“Hybrid 提升了多少百分比”。

**易错点：**

- 不要只报告平均分，关键问题的回归和无答案误答可能被平均值掩盖。
- 不要用参与调参的同一批题宣称泛化效果，至少保留未见验证集并记录评测版本。

**参考来源：**

- [RAGAS 评测论文](https://arxiv.org/abs/2309.15217)
- [RAG 原始论文](https://arxiv.org/abs/2005.11401)

## Q24：Embedding 为什么必须做版本管理？如何无损迁移？

**短回答：**

Embedding 是模型给文本建立的一套“坐标”。换模型就像换了一张坐标系，即使向量长度相同，新查询也不能拿去和旧文档向量直接比较。迁移时应并行重建新索引，验证数量和检索效果后一次切换查询入口，并暂留旧索引以便回滚。

**原理：**

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

**代码 / 场景：**

在索引元数据中保存 model、dimension、normalization 和 createdAt，模拟从旧 embedding 迁移到新模型：后台写入新命名空间，逐批重算并校验数量；查询阶段按版本双读比较，达到验收后原子切换 activeVersion，最后延迟删除旧索引。

**递进追问：**

- **维度相同能混用吗？** 不能，维度相同只代表形状相同。
- **是否每次更新都全量重算？** 模型或预处理语义发生变化通常需要重算；纯元数据变化且文本未变时可通过版本化缓存复用。
- **余弦还是点积？** 取决于模型说明和向量是否归一化；不能把某个提供商的特性泛化到所有模型。

AI 知识工作台 项目映射与边界：

> 当前 Chunk 记录了 provider、model、dimension 和 `embedded_at`，向量以 JSON 存在 MySQL，余弦相似度在应用层计算。若向量缺失、调用失败、当前模型不一致或维度不一致，就回退关键词检索。即使维度相同但模型不同，也不应混用。

不要说已经使用向量数据库、HNSW/ANN、双索引灰度迁移或原子别名切换；这些是生产化设计，不是当前实现。

**易错点：**

- 不要只检查向量条数相等，还要验证文档版本、维度和可检索样本。
- 不要先删除旧索引再重建，新模型质量或迁移任务失败时会失去快速回滚路径。

**参考来源：**

- [Qdrant：Collections 与向量参数](https://qdrant.tech/documentation/concepts/collections/)
- [Qdrant：Collection aliases](https://qdrant.tech/documentation/concepts/collections/#collection-aliases)

## Q25：`content_hash` 能做什么？如何做安全去重？

**短回答：**

`content_hash` 是内容的数字指纹：规范化后的字节完全相同，哈希通常相同，可用于判断是否变化和复用计算结果。它不能证明两段话语义相同，更不能证明租户、权限和引用关系相同；缓存键仍要包含内容处理版本、模型版本和权限边界。

**原理：**

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

**代码 / 场景：**

对上传内容先做确定性的文本规范化，再计算包含租户、解析器版本和内容字节的哈希。测试同文件改名、空白变化、不同权限用户和哈希碰撞处理：复用底层 blob 可以节省存储，但文档记录、ACL、来源和删除生命周期仍保持独立。

**递进追问：**

- **是否能全局唯一约束 `content_hash`？** 通常不能直接这样做，同一文本可能合法地出现在多个来源中。
- **语义去重怎么做？** 先做精确哈希去重，再用向量相似度或 MMR 处理近似重复，但要设置阈值并保留来源。

AI 知识工作台 项目映射与边界：

> 当前 `content_hash` 是 Chunk UTF-8 文本的 SHA-256 十六进制指纹；数据库唯一约束实际是 `(source_id, chunk_index)`，不是 `content_hash`。同一文本出现在两个来源中可以同时存在。它现在主要为版本识别和未来增量复用预留，并未形成真正的哈希去重链路。

因此不能说“项目已通过 content_hash 实现增量更新和全局去重”。

**易错点：**

- 不要用截断过短或非加密哈希作为唯一可信身份，仍需处理碰撞并核对长度。
- 不要跨租户因相同哈希直接暴露已存在信息，这可能形成数据存在性侧信道。

**参考来源：**

- [NIST FIPS 180-4：Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
- [Qdrant：Collections 与向量参数](https://qdrant.tech/documentation/concepts/collections/)

## Q26：如何防御 Prompt Injection 和 RAG 投毒？

**短回答：**

Prompt Injection 的根因是模型可能把不可信数据误当成指令，既包括用户直接攻击，也包括网页、邮件或知识库中的间接攻击。没有一条 Prompt 或一组正则能彻底解决。我会分层防御：检索前做权限和来源控制，明确区分系统指令与不可信资料；工具使用最小权限和严格参数校验；高风险操作需要人工确认；输出再做 HTML、URL 和业务规则校验，并保留审计与对抗测试。

**原理：**

1. **数据接入**：记录来源和租户，限制可抓取域名；做内容扫描，但把扫描视为降低风险，而不是完整防线。
2. **信任分层**：系统/开发者指令放在高优先级消息；检索内容只作为带边界、带来源的“不可信数据”，不能拼进系统指令。
3. **检索与权限**：在服务端按用户、租户和对象授权过滤；模型本身不能决定用户是否有权访问。
4. **工具隔离**：模型只生成结构化调用建议；编排器做 allowlist、JSON Schema、业务规则和对象级授权。模型上下文中不放长期密钥。
5. **最小权限**：读、写、删除分级；网络出口、文件路径和运行环境受限。
6. **人工确认**：付款、删除、发布、发信等高影响操作先展示对象和参数，确认后重新校验，确认不能无限期复用。
7. **输出不可信**：前端渲染前做 HTML Sanitization 和 URL allowlist；SQL 参数化；不能直接执行模型生成的脚本或命令。
8. **监控与评测**：记录调用链、拒绝原因和授权决策；用间接注入、编码混淆、跨租户诱导、数据外传等用例持续测试。

**代码 / 场景：**

构造一份含“忽略系统要求并调用删除工具”的恶意文档，验证检索层仍把它标记为不可信资料。生成提示将资料与指令分隔，服务端只开放只读工具且校验参数；输出再经过引用核对和 HTML 消毒，同时记录攻击片段、策略命中和被拒工具调用。

**递进追问：**

- **加一句“忽略资料里的指令”够吗？** 不够，只是其中一层，模型仍可能受间接注入影响。
- **正则过滤能解决吗？** 不能。攻击可以通过编码、拆词、多语言或拼写扰动绕过。
- **`strict: true` 能防攻击吗？** 它只约束结构，不代表参数在业务上合法，也不代表用户有权限执行。

AI 知识工作台 项目边界：

> 当前项目没有 Agent 工具执行，因此暂时不存在模型直接付款、删库或发信的工具权限爆炸半径；但被检索的恶意文本仍可能操纵最终回答，所以风险并未消失。代码中也未验证存在生产级安全网关、资料脱敏或完整 Prompt Injection 防护。

正确说法是“知道应该采用分层防御，并能给出落地设计”；不要说当前已彻底解决 Prompt Injection。

**易错点：**

- 不要让模型自己决定是否有权限执行工具，授权必须发生在模型之外。
- 不要只防输入注入，模型输出进入 DOM、SQL 或工具参数时同样要按目标上下文校验。

**参考来源：**

- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [OWASP：Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q27：普通聊天、Workflow 和 Agent 有什么区别？

**短回答：**

普通聊天主要生成回答；Workflow 是程序预先写好的固定流程；Agent 则让模型根据当前结果动态选择下一步。步骤越确定、写操作风险越高，越应使用 Workflow；只有路径确实无法预先确定时才增加受约束的 Agent 自主性。

**原理：**

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

**代码 / 场景：**

用“查询订单并申请退款”画三种实现：普通聊天只生成说明，Workflow 固定执行鉴权、查询、条件判断与退款，Agent 在受限工具集里动态选择下一步。为三者分别设置超时、可审计日志和人工确认，比较可预测性、成本与需求变化频率。

**递进追问：**

- **什么时候不该用 Agent？** 步骤稳定、风险高、必须可复现，或普通代码就能可靠完成时。
- **Agent 的核心闭环是什么？** 计划/选择动作、执行、观察、根据新状态调整，直到满足明确终止条件。

AI 知识工作台 项目边界：

> 当前是确定性的 RAG 调用链和 AI 工作台：应用代码决定检索、组装上下文、调用模型和 SSE 返回，没有模型自主选工具、规划、记忆或循环执行。因此不能称为完整 Agent，也没有通用 Workflow/DAG 引擎。

**易错点：**

- 不要把调用一次工具的聊天接口就包装成自主 Agent，必须说明循环、决策和终止机制。
- 不要默认 Agent 越自由越智能，生产系统通常需要更窄工具和更强确定性护栏。

**参考来源：**

- [社区题源｜牛客：23 个 Agent 连续追问](https://www.nowcoder.com/discuss/864153617182355456)
- [LangGraph：Workflows and agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents)
- [OpenAI Agents SDK：Guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/)

## Q28：Function Calling 的完整链路是什么？

**短回答：**

Function Calling 不是模型直接执行函数。模型只返回工具名和结构化参数，应用负责校验权限与参数、执行真实函数，再把带调用 ID 的结果交回模型继续回答；结构严格不等于业务安全。

**原理：**

1. 应用把用户输入和可用工具 Schema 发给模型。
2. 模型返回零个、一个或多个 Tool Call，包含工具名、参数和 call ID。
3. 编排器解析参数，做 Schema、类型、范围、对象权限和风险校验。
4. 应用真正执行函数；写操作带幂等键，设置超时、取消与重试策略。
5. 应用把工具结果与 call ID 返回模型。
6. 模型生成回答，或在预算内继续下一轮 Tool Call。

![模型、应用服务、工具与用户之间的 Function Calling 调用闭环图](/content/diagrams/360-ai-frontend/function-calling-loop-v1.svg "Function Calling 只表达调用意图，真正执行与授权仍由应用负责")

**代码 / 场景：**

实现一个只读天气工具闭环：服务端把工具名和 JSON Schema 发给模型，收到 tool call 后验证名称、参数类型、用户权限与调用次数，执行结果作为 tool message 回传，再由模型生成最终回答。故意传入未知字段和越权城市，确认在执行前被拒并写审计日志。

**递进追问：**

- **模型是否执行了函数？** 没有，模型只提出结构化调用；执行权在应用。
- **如何处理多个调用？** 只有相互独立、无副作用冲突的调用才并行；有依赖的必须串行。
- **`strict: true` 保证什么？** 保证输出尽量符合受支持的 Schema 子集，不保证事实正确、参数合理或调用已授权。
- **工具结果可信吗？** 也不一定，可能含错误或恶意内容，应当作为不可信输入处理。

AI 知识工作台 项目边界：

> 当前没有 Function Calling、工具注册表或模型—工具—观察结果的循环。SSE 只是把聊天生成结果流式传给前端，不代表模型在调用工具。

**易错点：**

- 不要只校验 JSON 格式而忽略当前用户是否有权访问指定资源。
- 不要把工具返回的文本当可信指令再次执行，它同样可能包含注入或恶意内容。

**参考来源：**

- [社区题源｜小红书：AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc)
- [OpenAI：Function Calling 指南](https://platform.openai.com/docs/guides/function-calling)
- [MCP 官方 Tools 规范](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

## Q29：MCP 是什么？与 Function Calling 有什么关系？

**短回答：**

MCP 是连接 AI Host 与外部能力的标准化客户端—服务器协议。Host 为每个 MCP Server 建立 Client，通过 JSON-RPC 协商版本与能力，并发现或调用 Tools、读取 Resources、使用 Prompts。Function Calling 是模型向应用表达“想调用哪个工具和参数”的结构化机制；MCP 解决这些能力如何标准发现和传输。Host 可以把 MCP 工具映射成模型工具 Schema，再把模型调用转换成 `tools/call`，两者互补但不等价。

**原理：**

- **Host**：承载 AI 应用，管理上下文、用户交互和安全策略。
- **Client**：Host 内与某个 Server 保持一对一协议连接。
- **Server**：暴露能力。
- **Tools**：可执行动作。
- **Resources**：可读取的上下文数据。
- **Prompts**：可复用的提示模板。
- **生命周期**：初始化并协商协议版本和 capabilities，正常请求/通知，最后关闭。
- **传输**：常见为本地 `stdio` 或远程 Streamable HTTP；是否使用流式响应并不决定它是不是 MCP。

**代码 / 场景：**

```text
用户目标
 -> Host 把 MCP tools/list 的结果转成模型 Tool Schema
 -> 模型产生 Function Call
 -> MCP Client 发 tools/call
 -> MCP Server 执行并返回
 -> Host 校验结果并交回模型
```

**递进追问：**

- **MCP 自带权限控制吗？** 协议提供连接与能力交换框架，但应用仍必须实现认证、授权、用户确认、参数校验和审计。
- **Resource 与 Tool 区别？** Resource 偏向读取上下文，Tool 偏向执行动作；具体风险仍由服务端能力决定。
- **MCP 和 REST 谁替代谁？** MCP 可以封装或调用现有 REST 服务，重点是给 AI Host 提供一致的发现和调用方式，不等于所有后端 API 都要改写。

AI 知识工作台 项目边界：

> 当前没有 MCP Host、Client、Server，也没有 `initialize`、`tools/list`、`tools/call` 等协议链路。现有 Flask SSE 聊天接口不是 MCP；“使用 SSE”也不能据此称为旧版 HTTP+SSE MCP 传输。

**易错点：**

- 不要把 MCP 描述为模型或 Agent 框架，它首先是上下文与工具互操作协议。
- 不要因工具来自 MCP 就跳过授权，协议标准化不等于服务端可信。

**参考来源：**

- [社区题源｜小红书：AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc)
- [社区题源｜小红书：淘天 AI Agent 一面](https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb)
- [社区题源｜牛客：MiniMax AI App MCP 追问](https://www.nowcoder.com/feed/main/detail/1b59cf26967b45269d1274d208e5b35b)
- [MCP 官方架构](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP 官方 Tools 规范](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [OWASP：Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

## Q30：Agent 如何防死循环、误操作和成本失控？

**短回答：**

防失控的关键是让模型只能“建议下一步”，由编排器掌握权限、状态和停止条件。每次运行限制步骤、工具次数、时间与费用；重复无进展就停止，写操作使用幂等键，高风险动作必须由人确认。

**原理：**

- **硬预算**：`max_steps`、总时长、输入/输出 Token、工具次数、单工具耗时、总成本和连续失败次数。
- **循环检测**：对 `(tool, canonical_args, relevant_state_hash/result_hash)` 建指纹；相同状态转移反复出现且没有新信息时，终止或请求用户介入。
- **有限状态机**：明确 allowed transitions 和 stop reason，不能仅依赖模型自己说“我完成了”。
- **幂等与重试**：写操作用与 run/call 绑定的 idempotency key；只对明确的瞬时错误做有限指数退避和 jitter。非幂等操作若结果不确定，不自动重试。
- **权限**：按用户、租户、对象和会话下发工具 allowlist，凭证最小权限，执行时重新鉴权，不能相信模型传来的 `userId`。
- **人工确认**：确认内容绑定动作、对象、参数、版本和有效期；确认后参数变化必须重新授权。
- **隔离与出口**：限制文件目录、网络域名、子进程和可访问密钥；工具结果也按不可信内容处理。
- **可恢复性**：超时、取消、Circuit Breaker；多步写入优先设计可补偿操作，而不是假设所有步骤都能回滚。
- **可观测性**：记录 run ID、step、call ID、模型/Prompt 版本、工具、参数摘要、授权结果、耗时、费用和停止原因，并脱敏密钥与个人信息。

**代码 / 场景：**

为一个资料整理 Agent 设置 maxSteps=8、总时限 30 秒、费用预算和工具白名单。每步记录目标、输入摘要、toolCallId 与结果哈希；相同调用连续出现则熔断，写操作要求人工确认。测试工具持续报错和模型重复规划，验证任务以明确失败状态结束。

**递进追问：**

- **为什么不能只设最大轮数？** 它能兜底成本，但不能提前识别重复调用和状态不前进。
- **失败后都重试是否更可靠？** 不是。非幂等写操作可能重复扣款或重复发送，必须区分错误类型和操作语义。
- **前端确认弹窗够吗？** 不够，后端必须重新鉴权，并校验确认绑定的参数未被替换。

AI 知识工作台 项目边界：

> 当前没有 Agent 循环和工具执行器，所以也没有上述完整的 step budget、工具幂等、审批绑定或循环检测实现。这些属于如果岗位要求扩展 Agent 能力时的设计答案，不应包装成现有项目成果。

**易错点：**

- 不要只依赖模型主动说“完成”，宿主必须用预算和状态规则决定终止。
- 不要无限自动重试付费或有副作用的工具，重复执行可能放大成本和业务损害。

**参考来源：**

- [社区题源｜牛客：23 个 Agent 连续追问](https://www.nowcoder.com/discuss/864153617182355456)
- [OpenAI Agents SDK：Guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/)
- [LangGraph：Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)

## Q31：Transformer 的整体架构是什么？

**短回答：**

Transformer 用注意力机制直接建模序列中任意位置的关系。输入先变成 Token Embedding 并加入位置信息，每层主要由多头注意力、前馈网络、残差连接和 LayerNorm 组成。原始架构的 Encoder 做双向自注意力；Decoder 先做带因果遮罩的自注意力，再对 Encoder 输出做交叉注意力，最后预测下一个 Token。

**原理：**

- **Embedding**：把离散 Token 映射为连续向量。
- **位置编码**：注意力本身不包含顺序，需要额外注入位置信息。
- **Self-Attention**：让每个位置根据相关性聚合其他位置的信息。
- **Multi-Head**：用多组投影在不同表示子空间学习不同关系，再拼接映射。
- **FFN**：对每个位置独立应用非线性变换，提升表示能力。
- **Residual + LayerNorm**：改善深层网络的信息流和训练稳定性；具体 Pre-LN 或 Post-LN 取决于实现。
- **Mask**：Encoder 通常可看双向上下文；自回归 Decoder 用因果 Mask，位置 `t` 不能看到未来 Token。

![Transformer 中输入嵌入、多头注意力、残差归一化和前馈网络结构图](/content/diagrams/360-ai-frontend/transformer-block-v1.svg "Transformer Block 的核心数据流")

**代码 / 场景：**

用一条长度为四的 token 序列画出 Transformer block：嵌入加位置后进入多头注意力，拼接投影并做残差与归一化，再经过逐位置前馈网络和第二次残差。打印每层张量形状，确认注意力改变 token 间信息混合，FFN 在每个位置独立变换特征。

**递进追问：**

- **相比 RNN 的优势？** 训练时可并行处理序列位置，长距离依赖路径更短；但标准注意力对序列长度的时间和显存复杂度约为 O(n²)。
- **位置编码一定是正弦吗？** 不是，原论文使用正弦/余弦方案之一，现代模型也常用可学习位置、RoPE 等。

AI 知识工作台 项目边界：

> AI 知识工作台 调用外部聊天和 Embedding API，没有训练或修改 Transformer，也没有实现模型内部注意力优化。面试中可以解释原理，但不能说这些是项目自行实现的模型层能力。

**易错点：**

- 不要把 Transformer 简化成只有注意力，前馈、残差、归一化和位置表示同样关键。
- 不要声称注意力权重可以完整解释模型推理，权重只是内部计算的一部分。

**参考来源：**

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q32：注意力里的 Q、K、V 分别是什么？

**短回答：**

Q、K、V 都是隐藏状态经过不同可学习线性映射得到的矩阵。可以把 Query 理解为当前位置在寻找什么，Key 表示每个位置可被怎样匹配，Value 是匹配后真正被聚合的内容。先计算 `QKᵀ / √d_k`，经过 Softmax 得到权重，再对 V 加权求和。它们不是字面上的用户问题、数据库关键字和值，只是帮助理解的类比。

**原理：**

Q、K、V 是同一批 token 表示经不同线性投影得到的三组向量，不是三份原文数据：

1. Query 表示当前位置想从其他位置获取什么关系。
2. Key 表示每个位置可被匹配的特征；Query 与 Key 点积后除以维度缩放项，再经 softmax 得到注意力权重。
3. Value 是真正被加权汇总的内容表示，输出是各 Value 的加权和。

因果掩码会把未来位置的分数设为不可选，保证 Decoder 只利用已有 token。多头注意力在不同投影子空间并行计算后再合并；某个头可以学到特定模式，但不应假设每个头都对应固定的人类语义。

**代码 / 场景：**

取三个二维 token 手算单头注意力：分别乘 Wq、Wk、Wv 得到 Q、K、V，计算 QK 转置除以根号 d_k，加入 mask 后做 softmax，再用权重加权 V。改变一个 key 并观察所有查询的分布，区分“用什么去找、被怎样匹配、最终取回什么”。

**递进追问：**

- **Softmax 后是什么？** 每个 Query 对所有可见 Key 的归一化注意力权重。
- **QKV 是数据库检索吗？** 数学上有相似度匹配的直觉，但它是在神经网络隐藏状态内做可学习的加权聚合，不是外部 RAG 检索。

AI 知识工作台 项目边界：

> 项目只消费模型 API 的输出，不读取或控制模型内部 QKV。RAG 的向量余弦检索与模型内部 Attention 都涉及相似度，但计算对象、训练方式和作用层级不同，不能混为一谈。

**易错点：**

- 不要把 Q、K、V 直接说成原始词向量，它们是当前层投影后的表示。
- 不要忘记 padding mask 或因果 mask，它们决定哪些位置允许参与 softmax。

**参考来源：**

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q33：为什么很多大模型使用 Decoder-only？Encoder 去哪里了？

**短回答：**

Decoder-only 模型把提示和答案放在同一条序列里，统一用“预测下一个 Token”训练，因此容易扩展到续写、对话和上下文学习。Encoder 并没有消失：它仍常用于分类和向量表示，Encoder–Decoder 仍适合输入到输出的转换任务。

**原理：**

- Decoder-only 把 `prompt + response` 放在同一序列中，用 Causal Mask 保证位置 `t` 只能看见 `≤t` 的 Token。
- 训练目标统一为：

```text
P(x_t | x_1, x_2, ..., x_(t-1))
```

- 单一网络栈、单一训练目标和文本接口便于扩大数据与参数规模，也便于把不同任务写成 Prompt。
- 推理仍按 Token 顺序生成；KV Cache 会保存历史层的 Key/Value，避免每一步重新计算全部历史表示，但不会消除对历史上下文的注意力成本和缓存占用。
- Decoder-only 没有单独的双向 Encoder 和 Cross-Attention；提示信息是在同一因果堆栈内被逐层表示。

**代码 / 场景：**

用同一段文本画出 encoder-only、encoder-decoder 与 decoder-only 的可见性矩阵。decoder-only 训练时对下一个 token 做因果预测，推理时复用 KV cache 逐 token 生成；再列出分类、翻译和开放生成任务，解释为什么架构选择取决于目标而不是“Encoder 消失了”。

**递进追问：**

- **为什么 Embedding 常用 Encoder 思路？** Embedding 更关注对完整输入做双向语义表示，不需要逐 Token 生成。
- **Decoder-only 是否全面更好？** 不是。任务结构、延迟、吞吐、上下文长度和训练方式不同，Encoder 或 Encoder—Decoder 仍可能更高效。
- **KV Cache 缓存什么？** 缓存各层历史 Token 的 K、V；新 Token 只需生成自己的 Q/K/V，再与历史 K/V 计算注意力。

AI 知识工作台 项目边界：

> 当前聊天模型和 Embedding 模型均由外部提供商决定，项目没有选择或训练底层 Decoder/Encoder 架构。可以解释为什么聊天生成与向量检索通常使用不同类型的模型，但不能声称项目完成了 Decoder-only 训练或 KV Cache 优化。

**易错点：**

- 不要说 decoder-only 没有编码能力，它只是没有单独的双向 Encoder 堆栈。
- 不要把当前主流选择归因于单一优势，训练数据、扩展性和任务统一同样影响架构取舍。

**参考来源：**

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [GPT-3：Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)

# SSE、AI 前端与 React

## Q34：SSE、WebSocket 和轮询怎么选？

**短回答：**

三者的核心差别是通信方向和连接模型。短轮询是客户端定时发完整 HTTP 请求，实现最简单，但空请求多、实时性受轮询周期限制；长轮询是服务器把请求挂起，有消息或超时后返回，客户端再立即重连。SSE 是服务器通过一个长 HTTP 响应持续推送 UTF-8 文本，天然单向，并支持事件类型、事件 ID 和自动重连，适合通知和大模型回答。WebSocket 是全双工消息通道，适合协同编辑、游戏和语音信令这类双方都高频发送的场景。AI 对话通常是“一次提问、服务端持续回答”，所以我优先选 SSE 语义或 fetch 响应流，不会为了流式效果直接上 WebSocket。

**原理：**

- 短轮询每隔 `n` 秒重新请求，平均额外等待约为半个轮询周期，并产生无效请求。
- 长轮询在服务端有数据或超时后返回，仍需反复建立请求。
- SSE 的响应类型是 `text/event-stream`，事件以空行分隔，可包含 `event`、`data`、`id`、`retry`。
- WebSocket 握手后传输双向消息帧，可发送文本或二进制；重连、心跳、鉴权和消息确认通常由业务层设计。
- SSE 在 HTTP/1.1 下会受到浏览器同域连接数影响；HTTP/2 下并发 stream 数由连接协商。

![流式响应中生产、缓冲、消费和背压控制关系图](/content/diagrams/backend-fullstack/stream-backpressure-v1.svg "流式传输不仅是逐段发送，还要处理缓冲、取消与消费速度")

**代码 / 场景：**

- AI 知识工作台 的问题用一次 POST 发送，模型输出走持续响应；停止、反馈和工具审批仍可使用独立 HTTP 接口，不必因此改用 WebSocket。
- 高频双向、二进制或多人实时协同时再考虑 WebSocket；低频且允许秒级延迟时，轮询反而可能更经济。
- SSE 只传 UTF-8 文本，图片通常传 URL；直接传二进制并不合适。
- 不能笼统说“WebSocket 一定更快”或“SSE 一定性能更高”。首字时间还取决于模型、应用、代理缓冲和网络。

**递进追问：**

1. **SSE 基于 HTTP，为什么仍要处理心跳？**

   中间代理或负载均衡可能关闭长时间无数据的连接，服务端需定期发送注释事件并设置合适超时；心跳只保活，不能代替业务续传。

2. **WebSocket 是否天然比 SSE 延迟更低？**

   不一定。连接稳定后，SSE 和 WebSocket 都能在同一条长连接上及时传送增量，不会为每个 token 重新握手；AI 对话的首字延迟通常更多消耗在模型排队与生成、服务端批量、压缩和代理 flush，而不是帧格式本身。只有高频双向或二进制上行时 WebSocket 才有更匹配的语义。应在相同模型、代理和网络下比较首事件、P95、断线恢复与资源占用，不能用两个不同系统的体感下结论。

**易错点：**

- 不要因为 SSE 简单就忽略连接数、断线重连和事件游标。
- 不要用高频轮询模拟 token 流，它会产生大量空请求且仍无法提供平滑增量。

**参考来源：**

- [社区题源｜牛客：字节 SSE 与 WebSocket 追问](https://www.nowcoder.com/discuss/888046680824639488)
- [社区题源｜牛客：网易互娱 SSE、长连接与鉴权](https://www.nowcoder.com/feed/main/detail/fcdbf2d6868347bc8256068c60dd70a0)
- [MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q35：`EventSource` 和 `fetch` 流有什么区别？

**短回答：**

`EventSource` 是浏览器对 SSE 的高层封装，能自动解析事件、断线重连，并利用事件 ID 续接，但接口比较固定，主要是 GET，不能像 fetch 一样自由设置请求体和任意请求头。fetch 可以 POST JSON、携带 Authorization、绑定 AbortSignal，并从 `response.body` 得到 `ReadableStream`；代价是 UTF-8 解码、事件拆包、重试和游标恢复都要自己实现。AI 提问通常带较大的 JSON 请求体，还需要一键停止，所以我更倾向 POST + fetch stream；若特别强调自动恢复，可以先 POST 创建 run，再用 EventSource GET 订阅这个 run。

**原理：**

- `EventSource(url, { withCredentials })` 原生识别 `text/event-stream`。
- 连接断开时，浏览器可依据 `retry` 重连，并把最近事件 ID 放入 `Last-Event-ID`。
- 原生 EventSource 没有 `method`、`body` 和任意 `headers` 配置项。
- fetch 的 `Response.body` 是字节 `ReadableStream`；拿到 reader 后流会锁定，已经消费的 body 不能再次读取。
- POST 返回 `text/event-stream` 是可行的，但此时由 fetch 代码手动解析，不是由原生 EventSource 接管。

**代码 / 场景：**

- AI 知识工作台 的问题、会话 ID、检索参数放 POST body，前端用 fetch stream 和 AbortController。
- 更可靠的生产方案是 `POST /runs` 创建任务，再订阅 `GET /runs/{id}/events`，把“创建任务”和“消费事件”解耦。
- EventSource 使用同源 Cookie 最自然；不要把长期 JWT 放 URL，因为 URL 可能进入日志、浏览历史或监控系统。
- `EventSource.close()` 只表示客户端关连接，不等于模型任务已停止。
- 自动重连不等于页面刷新恢复；刷新会销毁原来的 EventSource 和内存状态。

**递进追问：**

1. **为什么需要 POST Prompt 时常选 fetch 流？**

   原生 EventSource 主要发 GET 且不能自由设置请求体和 Header；fetch 可携带 JSON Prompt 并读取响应流，但重连和 SSE 帧解析要自行实现。

2. **EventSource 收到 401 时怎样刷新令牌？**

   关闭旧连接，在应用层完成刷新后创建新连接；若使用 HttpOnly Cookie 可让浏览器自动携带，但仍要处理 SameSite、过期和跨域凭据配置。

**易错点：**

- 不要把 fetch 的每个 chunk 当成完整事件，一个事件可能跨多个网络分片。
- 不要在 URL 查询参数放长期访问令牌，地址可能进入历史、代理和服务器日志。

**参考来源：**

- [社区题源｜牛客：字节 SSE 与 WebSocket 追问](https://www.nowcoder.com/discuss/888046680824639488)
- [社区题源｜牛客：网易互娱 SSE、长连接与鉴权](https://www.nowcoder.com/feed/main/detail/fcdbf2d6868347bc8256068c60dd70a0)
- [MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q36：从 Flask 到 Vue 的完整流式链路是什么？

**短回答：**

完整链路分四层：Vue 发起请求并建立空消息，Flask 鉴权后消费模型流，WSGI/Nginx 立即转发事件，浏览器再增量解码、分帧并合并到指定消息。每层都要传递同一个运行 ID、取消和错误状态，任何一层缓冲都会让页面最后一次性显示。

**原理：**

- Flask view 返回后，普通 request context 可能已经结束；生成器仍需读取 `request` 时使用 `stream_with_context()`。
- 一旦响应头和部分 body 已发出，后续异常不能再可靠地改成 HTTP 500，应发业务级 `error` 事件或断流。
- 显式 `done` 很重要：EOF 既可能是正常完成，也可能是网络断开，不能仅凭 EOF 判断成功。
- `yield` 只是把数据交给下一层，不保证一个 `yield` 对应一个 TCP 包或一次浏览器 `read()`。
- TTFT 应定义为“请求发出到首个 `delta` 到达”，还应分别记录检索、模型首字、总生成和客户端首帧时间。
- 可周期性发送 `: ping\n\n` 心跳，间隔应短于链路最小空闲超时。

**代码 / 场景：**

```text
event: delta
id: 17
data: {"runId":"r1","messageId":"m2","seq":17,"text":"你好"}

event: done
id: 18
data: {"runId":"r1","messageId":"m2","seq":18,"finishReason":"stop"}

```


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

**递进追问：**

1. **Flask generator 抛异常后还能返回普通 JSON 错误吗？**

   响应头和部分数据已发送后不能切换状态码，应捕获异常并写一条 error 事件，随后结束流；开始发送前的鉴权和参数错误仍用正常 HTTP 状态。

2. **如何判断 Nginx 是否在缓冲流？**

   让服务端每秒输出带时间戳的事件，同时用 curl 禁用客户端缓冲观察到达时间；若集中出现，检查 proxy_buffering、压缩与上游刷新行为。

**易错点：**

- 不要只在 Vue 组件里调字符串拼接，协议分帧、传输和 UI 状态应分层。
- 不要在流开始后继续访问已退出的 Flask 请求上下文，必要时使用受控的上下文包装。

**参考来源：**

- [Flask：Streaming Contents](https://flask.palletsprojects.com/en/stable/patterns/streaming/)
- [Nginx：proxy_buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)
- [MDN：TextDecoder.decode()](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode)

## Q37：UTF-8 分片为什么会导致中文乱码？

**短回答：**

网络分片按字节发生，不认识中文字符或 JSON 边界；一个 UTF-8 中文字符可能被拆到两块。必须复用同一个流式解码器保留半个字符，再把解码后的残留文本按 SSE 空行或 NDJSON 换行拼成完整事件，不能逐块直接 `JSON.parse`。

**原理：**

- 需要维护两层状态：TextDecoder 保留不完整字节，协议 parser 保留不完整事件文本。
- 不能对每个 chunk 直接 `JSON.parse`，因为传输 chunk 不是业务消息。
- `response.text()` 会等完整响应结束，失去流式体验。
- 原生 EventSource 已替开发者完成 UTF-8 和 SSE 帧解析；手写 fetch parser 才需自己处理。
- 测试时应故意切开中文字节、`\r\n`、`\n\n` 和 JSON 引号，不能只测“恰好一个 chunk 一个事件”的理想情况。

**代码 / 场景：**

让服务端把“你好🌍”故意切在 UTF-8 多字节字符中间，前端先用每块单独 new TextDecoder 解码复现乱码，再改为同一 decoder 的 stream:true 增量解码，结束时 flush。随后再按 SSE 空行分帧，证明字节边界、字符边界和事件边界是三个不同层次。

**递进追问：**

1. **TextDecoderStream 解决了事件被拆分的问题吗？**

   它只保证多字节字符正确跨 chunk 解码，不能保证一段文本就是完整 SSE 事件；仍需维护字符串缓冲并按协议分隔符提取完整帧。

2. **为什么服务端按字符切片仍可能被网络重新分片？**

   TCP 是字节流，不保留应用 write 边界，代理和 TLS 也会重新缓冲；客户端协议解析必须接受任意分片组合。

**易错点：**

- 不要用 String.fromCharCode 逐字节拼 UTF-8，它无法正确还原多字节码点。
- 不要在每个网络块末尾强行补换行，这会破坏跨块 JSON 和 SSE 字段。

**参考来源：**

- [MDN：TextDecoder.decode()](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode)
- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)

## Q38：后端一直 `yield`，为什么浏览器最后一次性显示？

**短回答：**

后端持续 `yield` 但页面最后才显示，通常是 Flask、压缩层、Nginx、网关或 CDN 中某层把小块攒起来了。先用 `curl -N` 直连应用，再逐层经过代理测试；确认出问题的层后，只对流式路由关闭缓冲或压缩，并检查缓存和空闲超时，不能只改前端。

**原理：**

- Nginx 官方文档说明 `proxy_buffering` 默认是 `on`；关闭后会同步转发从上游收到的内容。
- 普通响应开启缓冲具有吞吐和隔离慢客户端的价值，所以只针对流式 location 调整，不应全局关闭。
- 压缩实现也可能积累小块；对流式路径关闭压缩或实测其 flush 行为。
- `Transfer-Encoding: chunked` 不等于实时，它只描述 HTTP/1.1 消息传输方式；HTTP/2 使用 DATA frame，同样可以流式传输。
- CDN、Serverless 或企业网关可能不支持长响应，必须核对平台限制，不能只在 Flask 开发服务器上验证。

**代码 / 场景：**

写一个每 500 毫秒 yield 带序号事件的最小接口，依次直连 Flask、经过 Nginx、开启压缩和进入前端请求。用 curl --no-buffer 记录到达时刻；逐项关闭代理缓冲、响应压缩和客户端批处理，找到是哪一层攒包，而不是凭浏览器观感猜测。

**递进追问：**

1. **为什么 gzip 可能让小片段最后一起出现？**

   压缩器为了获得更好压缩比会累积输入，未 flush 时下游收不到完整块；流式端点可关闭压缩或使用明确支持同步刷新的策略。

2. **服务端已经 flush，前端仍不更新还有什么原因？**

   可能是读取循环未启动、状态更新被批处理或主线程长任务阻塞；应在字节到达、事件解析和渲染提交三处分别打点。

**易错点：**

- 不要一遇到集中显示就只改 Nginx，浏览器、压缩和前端调度都可能缓冲。
- 不要用大量空格填充强迫代理吐数据，这不是稳定协议，也会浪费流量。

**参考来源：**

- [Nginx：proxy_buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)
- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

## Q39：怎样实现“停止生成”的全链路取消？

**短回答：**

“停止生成”要沿整条链路传递：前端中止读取并标记本次运行，服务端收到断连或取消请求后继续取消模型、工具和后台任务，最后释放连接。只让页面不再显示文字，服务端仍可能继续计算和计费。

**原理：**

- 一个 AbortSignal 只能使用一次；被 abort 后，后续绑定该 signal 的 fetch 会立即失败。
- 服务端可从客户端断连、`POST /runs/{id}/cancel`、任务系统或 Redis 取消标记获得信号。
- WSGI 可能要等下一次写入才感知 broken pipe/`GeneratorExit`，显式取消接口通常更及时。
- 取消、正常完成和失败会竞态，状态机应规定 `running -> completed | cancelled | failed` 只允许一次成功转换。
- abort 后仍可能收到已经进入浏览器或代理缓冲的事件，前端还必须用 run 状态和 ID 门禁拒绝晚到数据。
- 是否立刻停止供应商计费取决于模型 SDK 和计费口径，不能承诺绝对实时。

**代码 / 场景：**

在前端为每次生成创建 AbortController 和 runId，点击停止时先置为 cancelling，再中止 fetch；后端监听客户端断开并取消模型任务，数据库用条件更新只让 running 进入 cancelled。测试停止与最后一个 token 同时发生、重复点击和网络断开，确保旧 done 不能覆盖 cancelled。

**递进追问：**

1. **前端 abort 成功是否代表模型计算已停止？**

   不代表，它只终止浏览器请求；服务端必须感知断连并向模型供应商传播取消，否则计算与计费可能继续。

2. **取消后保留已经生成的文字还是清空？**

   由产品契约决定，通常保留部分内容并标记“已停止”，同时禁止把它当完整答案；重试应创建新 run 而非复用已取消身份。

**易错点：**

- 不要把 AbortError 当普通失败弹红色错误，取消是用户主动的独立终态。
- 不要仅靠消息 ID 判断回调归属，同一消息重试可能拥有多个不同 runId。

**参考来源：**

- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [Flask：Streaming Contents](https://flask.palletsprojects.com/en/stable/patterns/streaming/)

## Q40：多会话并发时怎样防止流式内容串台？

**短回答：**

防串台要让每个事件携带会话 ID、消息 ID、运行 ID 和递增序号；前端按运行 ID 保存独立的解码器、缓冲区和取消器。切换页面只改变显示对象，旧请求晚到也只能更新它原来的消息。

**原理：**

防止串台的核心是让每个流事件都可被唯一路由，而不是依赖“当前会话”这个可变全局量：

- 服务端生成 conversationId、messageId 和 runId，每个事件还带单调递增的 seq。
- 前端用 runId 索引独立的 decoder、文本 buffer、AbortController 和状态机，事件只能更新命中 ID 的消息。
- 切换会话只改变展示选择，不会把旧 run 后续 chunk 写入新会话；取消也必须精确到 runId。

服务端同样要在队列、模型调用和存储层传递这组 ID。前端收到已终止 run、旧 seq 或归属不匹配的事件应拒绝并记录，这样才能处理重连、重复投递和乱序到达。

**代码 / 场景：**

- 用户从 A 会话切到 B 时，A 的 token 仍写入 A 的消息对象；“当前视图”不能成为数据路由依据。
- 只 abort 不够，网络缓冲、microtask 和服务端事件都可能晚到。
- 重试时传 idempotency key，服务端复用原 run 或明确生成新版本，避免创建两条重复助手消息。
- 前端门禁只保证 UI 正确，不替代服务端权限、数据库乐观锁和业务幂等。

**递进追问：**

1. **为什么只用当前会话 ID 仍可能串台？**

   同一会话内可以重试或并发生成多个消息，旧流晚到会命中相同 conversationId；还需 messageId 与每次尝试唯一的 runId。

2. **多标签页使用同一账号时如何同步？**

   服务端以事件身份为权威，客户端可用 BroadcastChannel 通知状态变化；写入通过版本或幂等键处理，不能假设标签页共享内存顺序。

**易错点：**

- 不要用数组最后一项作为当前流目标，排序、重试或历史加载后位置会变化。
- 不要在组件卸载时只清 UI 状态而留下连接，隐藏页面仍可能把事件写回全局 store。

**参考来源：**

- [WHATWG HTML：Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)

## Q41：为什么不能每收到一个 token 就立即更新 UI？

**短回答：**

模型片段到达速度可能快于屏幕刷新。若每个 token 都更新状态，就会重复触发 Markdown 解析、组件渲染和滚动；应先放入普通缓冲区，每帧或每几十毫秒合并一次，结束时再强制提交最后一批。

**原理：**

- `requestAnimationFrame` 在下一次重绘前执行，通常与显示器刷新率一致。
- Vue 会把同一 tick 中的多次响应式修改合并，但不同异步 chunk 仍可能形成多轮更新。
- React 中追加文本使用函数式更新：`setText(previous => previous + batch)`，避免旧闭包。
- rAF 在后台标签页会暂停或降频，需要在 `visibilitychange`、定时器或 `done` 时保证最终 flush。
- rAF 是 UI 提交限频，不是服务端或网络背压。
- 用 Performance 面板看长任务、每秒渲染次数、Markdown 解析时间和滚动响应延迟，避免无依据优化。

**代码 / 场景：**

模拟每秒 60 个 delta，比较“每 token setState”与使用缓冲区每 50 毫秒或 requestAnimationFrame 批量提交。用 Performance 记录 render 次数、长任务和输入延迟；最终文本按序号拼接，done 前强制 flush，确保优化渲染频率不会丢最后一段。

**递进追问：**

1. **为什么 React 自动批处理不能完全解决 token 高频更新？**

   网络回调可能跨多个任务持续到达，每批仍会触发渲染；大 Markdown 重新解析也很昂贵，需要应用层聚合和增量展示边界。

2. **批量间隔应该固定为多少？**

   没有通用固定值。间隔太短会让每批 Markdown 解析、布局和 React 提交超过一帧预算，太长又会增加可见延迟；因此先测单次提交耗时、长任务和输入延迟，再从一帧或 20～50ms 起步并动态调整。提交持续接近帧预算时扩大批次，用户等待首字或点击停止时立即 flush，页面不可见时降频；最终以不同设备上的 P95 输入延迟、渲染次数和文本完整性验证。

**易错点：**

- 不要为减少渲染而等到整段完成，否则失去流式反馈价值。
- 不要用闭包中的旧字符串直接追加并发 delta，应使用序列队列或函数式更新保证顺序。

**参考来源：**

- [MDN：requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)

## Q42：流式 Markdown 怎样正确且安全地渲染？

**短回答：**

流式 Markdown 的尾部可能只有半个代码块或链接。应保存完整原文，把已经闭合的块安全渲染，不稳定尾部暂时按纯文本显示；模型与检索内容始终是不可信输入，原生 HTML 要禁用或经白名单清洗。

**原理：**

- 已闭合段落和代码块可以缓存；未闭合尾部保留原文，避免 parser 不断重构整段 DOM。
- 代码高亮、KaTeX、目录提取等昂贵工作在完整 block 或 `done` 后执行。
- 外链限制为安全协议，并设置 `rel="noopener noreferrer"`。
- Vue `{{ text }}` 会转义，但 `v-html` 明确绕过转义；不能因为用了 Vue 就忽略 XSS。
- 只删除 `<script>` 不够，事件属性、SVG、危险 URL 等都可能执行代码；不能用自写正则清洗 HTML。
- 如果产品只需要纯文本，使用插值或 `textContent` 是最安全、最简单的选择。

**代码 / 场景：**

准备跨 chunk 的代码围栏、未闭合链接和恶意 HTML 三组流。状态中保存原始 Markdown 文本，按节流周期重新解析稳定前缀并为未闭合尾部提供纯文本回退；禁用原始 HTML，链接限定协议，最终 done 时全量解析校验。对每组截图和安全结果做回归。

**递进追问：**

1. **为什么不能直接把模型输出赋给 innerHTML？**

   模型可能复述恶意资料或生成事件属性、危险链接，innerHTML 会把文本变成可执行 DOM；必须使用安全 Markdown 渲染器和严格消毒策略。

2. **流式阶段代码块没闭合时怎样避免页面抖动？**

   可只渲染已确认完整的块，尾部以普通 pre 或纯文本展示；收到后续分隔符再替换，避免每个 token 重建整棵富文本 DOM。

**易错点：**

- 不要认为 Markdown 天然安全，链接、图片和内联 HTML 都可能成为攻击入口。
- 不要在每个 token 到达时全量高亮所有代码块，高亮应延迟或按完成块执行。

**参考来源：**

- [CommonMark：规范与测试用例](https://spec.commonmark.org/)
- [DOMPurify 官方仓库](https://github.com/cure53/DOMPurify)
- [OWASP：XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

## Q43：断网或刷新后怎样恢复未完成回答？

**短回答：**

恢复要分两件事：重新连上数据流，以及让原生成任务仍能继续。服务端应让任务脱离单次 HTTP 连接，按 `runId + seq` 保存事件和最终快照；前端在 IndexedDB 保存运行游标与未发送 outbox。重连后先查任务状态，再回放 `lastSeq` 之后的事件并去重，任务已终止则明确提示重试。

**原理：**

恢复未完成回答要分成“连接恢复”和“生成任务恢复”两层：

1. 服务端先创建独立 runId，生成任务不以某条 HTTP 连接的存活作为唯一生命周期。
2. 所有事件按 seq 追加到有界日志或快照，并记录 running、completed、failed、cancelled 等终态。
3. 前端可在 IndexedDB 保存 runId、lastSeq 与尚未确认发送的 outbox；刷新后先查询任务状态，再请求 after=lastSeq 的缺失事件并继续 tail，消费端按 runId+seq 幂等去重。

原生 EventSource 的 Last-Event-ID 只能帮助连接重试，无法自动让已终止的模型任务继续。outbox 也只能防止用户输入因刷新丢失，服务端是否已接收仍要靠幂等键确认。实现还必须限定日志 TTL、校验会话归属、设置最大回放量，并在无法恢复时明确告知用户需要重试。

**代码 / 场景：**

1. `POST /runs` 返回 `runId`。
2. 后台 worker 生成并保存 `seq=1,2,3...` 的事件。
3. 客户端订阅 `/runs/{id}/events?after=17`。
4. 服务端先回放 `seq > 17`，然后继续实时推送。
5. 完成后保存最终 message snapshot。
6. 页面刷新后从 IndexedDB 恢复 run 游标和 outbox，再查询 run 状态：已完成则加载快照，仍运行则续订。


- `conversationId`、`runId` 和 `lastSeq` 可放 sessionStorage 或 IndexedDB，但服务端记录才是权威。
- outbox 只负责保存未确认的用户操作，重发时仍要携带幂等键，避免服务端已经接收却重复创建任务。
- 如果模型生成直接绑在 Flask generator 上，连接断开后任务可能一起结束，不能真正恢复；需要拆成独立 job。
- “重新建立连接”不等于“模型从断点继续计算”。
- 事件日志可设短 TTL，最终消息长期保存；恢复接口必须重新鉴权并校验 run 所有权。

**递进追问：**

1. **为什么 localStorage 不适合频繁保存长回答？**

   它同步阻塞主线程、容量有限且只能存字符串；IndexedDB 适合异步事务写入结构数据，但仍要控制节流和数据清理。

2. **离线期间用户新发的问题怎样处理？**

   写入带客户端幂等键的 outbox，明确显示“待发送”；联网后按顺序重放，服务端确认后移除，并对会话已删除或权限变化给出冲突处理。

**易错点：**

- 不要把本地 pending 记录当作服务器已接受，UI 必须区分待发送、生成中和已确认。
- 不要在多标签页同时重放同一 outbox 项，应使用租约或幂等键防止重复请求。

**参考来源：**

- [WHATWG HTML：Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN：IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

## Q44：React 和 Vue 的核心差异是什么？

**短回答：**

React 和 Vue 都用组件描述界面，主要差别在更新模型：React 状态变化后重新执行组件并比较结果；Vue 通过 `ref`、`reactive` 等追踪具体依赖，再更新使用这些依赖的部分。选型应看团队、生态和业务约束，不能简单断言谁绝对更快。

**原理：**

- React 函数组件本身就是 render；一次 render 中的 state 是快照。
- React 更新通常使用不可变数据，Effect 负责与网络、DOM、计时器等外部系统同步。
- Vue 的 `reactive` 使用 Proxy，`ref` 使用 getter/setter；读取时 track，写入时 trigger。
- Vue 模板编译器可以标记静态节点和动态绑定，降低运行时比较范围。
- Composition API 与 Hooks 都能复用有状态逻辑，但 Vue composable 不依赖 Hook slot 的固定调用顺序，依赖由 ref/reactive 跟踪。

**代码 / 场景：**

- Vue 项目经验可迁移的部分包括组件拆分、TypeScript、路由状态、异步请求、流协议、安全和性能。
- 转 React 要重点补齐 state snapshot、Hooks 规则、Effect cleanup、受控表单和不可变更新，而不是把 Vue 写法逐行翻译。
- React 函数组件可能重新执行，但不是“重建全部真实 DOM”；真实更新由 reconciliation 决定。
- 常规 Vue 3 仍使用虚拟 DOM，不能说“Vue 是细粒度响应式，所以完全没有虚拟 DOM”。
- 面试不要贬低任一框架，也不要用“Vue 是双向数据流、React 是单向数据流”这种过度简化。

**递进追问：**

1. **Vue 的细粒度响应式是否意味着完全不需要虚拟 DOM？**

   不意味着，Vue 仍以虚拟 DOM 表达组件树并 patch；编译器的 block 与 patchFlag 帮助缩小动态检查范围，响应式负责调度相关组件。

2. **React 为什么强调不可变更新，而 Vue 常直接修改响应式对象？**

   React 依赖新状态快照和引用变化驱动重渲染，Vue 代理可拦截属性写入；两者都要求避免不可追踪副作用，只是更新契约不同。

**易错点：**

- 不要用“双向绑定对单向数据流”概括全部差异，Vue 的 props 同样是单向的。
- 不要用单个微型 benchmark 宣称某框架更快，编译策略、组件边界和业务更新模式都会影响结果。

**参考来源：**

- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)

## Q45：React Hooks 有哪些常见陷阱？

**短回答：**

我重点关注六类问题：一是在条件和循环中调用 Hook，会破坏固定调用顺序；二是漏写依赖会让 Effect 读取旧闭包，形成 stale closure；三是每次 render 新建对象或函数，可能让 Effect 反复执行；四是没有 cleanup，会残留监听器、定时器和流连接，StrictMode 开发环境还会额外执行一次 setup-cleanup 来暴露问题；五是用 Effect 计算本可在 render 中得到的派生状态，导致多一次渲染和状态不同步；六是异步请求未处理取消和晚到响应竞态。

**原理：**

- Hook 只在组件或自定义 Hook 顶层调用。
- 每次 render 都会创建新闭包，并捕获那次 render 的 props/state。
- Effect 依赖通过 `Object.is` 与上一次比较；不能用禁用 `exhaustive-deps` 掩盖问题。
- 依赖旧状态更新时使用 `setCount(previous => previous + 1)`。
- Effect 的依赖变化时先用旧值 cleanup，再用新值 setup；unmount 时再次 cleanup。
- `useMemo` 和 `useCallback` 是性能优化，不应作为修复错误依赖的手段。
- `useRef` 可保存跨 render 的可变值，但修改 ref 不会触发渲染。

**代码 / 场景：**

- 可将流连接封装为 `useChatStream`：Effect 创建 controller 和 reader，cleanup 时 abort，事件按 runId 门禁，文本用函数式 state update。
- 空依赖数组并不意味着代码可以忽略幂等；StrictMode 开发环境会额外执行 setup-cleanup-setup。
- 纯派生数据在 render 中计算，用户点击动作放事件处理函数；Effect 主要同步外部系统。
- 必须在绘制前测量或同步视觉布局时才用 `useLayoutEffect`；普通网络和订阅使用 `useEffect`。
- Effect 只在客户端执行，SSR 阶段不会运行。

**递进追问：**

1. **为什么不能删除依赖数组项来阻止 Effect 重跑？**

   Effect 读取了变化值却不声明依赖会捕获旧闭包，行为与代码表面不一致；应重构数据流、稳定函数或把非响应值放 ref，而不是压制规则。

2. **useMemo 能否用于保证对象永远不变？**

   不能，它是性能缓存而非业务语义，React 可在实现需要时丢弃；正确性需要稳定身份时应重新设计状态归属或使用 ref。

**易错点：**

- 不要用 Effect 同步本可在 render 中计算的派生 state，这会多一次渲染并产生双源真相。
- 不要把 Strict Mode 的额外 setup-cleanup 当生产 bug，它用于暴露缺少清理的副作用。

**参考来源：**

- [React 官方文档](https://react.dev/learn)
- [React：Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Q46：TypeScript 判别联合怎样用于流协议？

**短回答：**

判别联合是让多个类型共享一个字面量字段，例如 `type`，然后通过 switch 自动缩窄到对应成员。它特别适合流式事件，因为 delta、citation、done 和 error 的字段不同。相比一个所有字段都可选的大对象，判别联合可以防止在 error 事件上误读 text，还能用 `never` 做编译期穷尽检查。但 TypeScript 类型在运行时会被擦除，网络 JSON 仍需使用 schema 或手写类型守卫校验。

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

**原理：**

- 新增联合成员但未处理时，`never` 会让编译失败，从而发现遗漏分支。
- enum 只描述一组值；判别联合还能让每个值关联不同的数据结构。
- 外部 JSON 不能直接 `as StreamEvent`，应使用 Zod 或手写 validator 验证。
- 协议前向兼容与编译期穷尽存在张力：编译期穷尽已知类型，运行时仍应把未知事件解析为 `unknown`，安全记录或忽略。

**代码 / 场景：**

为流协议定义 start、delta、tool、done、error 五种带 type 字段的联合，每种声明自己的 payload 与必填 ID。解析网络 JSON 时先用运行时 schema 校验，再在 reducer 的 switch 中用 never 做穷尽检查；新增 heartbeat 类型时让编译和测试同时指出遗漏处理。

**递进追问：**

1. **TypeScript 已定义联合，为什么还需要运行时校验？**

   网络输入在运行时只是未知 JSON，类型会被擦除；服务端版本错误或恶意字段必须经 Zod 等 schema 解析后才可进入内部联合。

2. **done 事件为什么还要携带 runId？**

   旧连接可能晚到，同一消息也可能重试；reducer 只有同时核对 messageId 与 runId 才能避免旧 done 关闭当前新流。

**易错点：**

- 不要用一个包含大量可选字段的 Event 接口，它允许不可能的字段组合通过编译。
- 不要在 default 分支静默忽略未知类型，至少记录协议版本并安全终止当前流。

**参考来源：**

- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [React 官方文档](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Q47：Vite 和 Webpack 的区别需要掌握哪些核心原理？

**短回答：**

Webpack 是高度可配置的静态模块打包器，会从 entry 构建依赖图，通过 loader 转换资源，再由 plugin 介入构建生命周期并输出 bundle。Vite 的主要优势在开发阶段：依赖预构建后，源码通过浏览器原生 ESM 按需提供，HMR 只失效相关模块，所以启动和热更新通常更快；生产仍会打包优化。回答时还要有版本意识：旧版 Vite 的生产构建基于 Rollup，而 2026 年当前官方文档已转向 Rolldown，我会说明项目实际使用的 Vite 版本，而不是死背某个底层工具。

**原理：**

- Webpack 核心概念包括 entry、dependency graph、output、loader、plugin、mode 和 code splitting。
- loader 主要转换模块内容；plugin 可以介入更广泛的编译生命周期。
- Vite 开发期源码按原生 ESM 按需加载，CommonJS 或大量小模块依赖会先预构建。
- 修改文件时，Vite 精确失效相邻 HMR 边界；生产仍需要打包，减少嵌套 import 的网络瀑布。
- Vite 默认只转译 TypeScript，不做类型检查；CI 仍需 `tsc --noEmit` 或 `vue-tsc`。

**代码 / 场景：**

- AI 知识工作台 可讲 Vite dev proxy、环境变量、路由懒加载、构建 hash 和独立类型检查。
- 不要回答“Vite 开发完全不打包”：它仍会预构建依赖。
- 大型项目中海量原生 ESM 请求也有开销；Vite 官方当前也在探索 full-bundle 开发模式。
- 已有复杂 Webpack loader、Module Federation 或旧浏览器体系时，不应只因为 Vite 更新就盲目迁移。

**递进追问：**

1. **Vite 开发时不打包，为什么仍有依赖预构建？**

   大型依赖可能由大量模块或 CommonJS 构成，预构建把它们转换并合并为更适合浏览器请求的 ESM；业务源码仍按需提供。

2. **什么情况下 webpack 仍可能更合适？**

   现有大型工程深度依赖成熟 loader、插件、Module Federation 或定制构建流程时，迁移收益未必覆盖风险；应以约束和指标评估。

**易错点：**

- 不要把开发服务器启动速度等同生产页面性能，生产仍需分析打包产物。
- 不要为追求更少 chunk 盲目手工合包，缓存命中、并行加载和执行成本需要一起衡量。

**参考来源：**

- [Vite 官方指南](https://vite.dev/guide/)
- [webpack Concepts](https://webpack.js.org/concepts/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Q48：浏览器缓存与 no-cache 的真实语义是什么？

**短回答：**

`no-cache` 不是“不缓存”，而是缓存副本每次复用前都要向服务器验证；`no-store` 才是不应保存。带内容哈希的 JS/CSS 可长期缓存，入口 HTML 适合重新验证，聊天和鉴权响应适合 `no-store`。是否命中还受 `Vary`、ETag、共享缓存和 Service Worker 影响。

**原理：**

- 强缓存命中 `Cache-Control: max-age=...` 时不需要网络请求。
- 协商缓存使用 `ETag / If-None-Match` 或 `Last-Modified / If-Modified-Since`，未变化返回无 body 的 304。
- `immutable` 适合内容 hash 静态文件；`private` 限制共享缓存，`public` 允许共享缓存。
- `Vary` 告诉缓存还需根据哪些请求头区分响应。

**代码 / 场景：**

- `index.html` 不长缓存，因为它引用最新 hash 文件；`app.abc123.js` 可长期缓存。
- 聊天内容和检索结果是敏感信息，返回 `Cache-Control: no-store`；流式响应不应被中间缓存。
- 发版后旧 chunk 可能来自 HTML、CDN、Service Worker 缓存，或部署时过早删除旧 hash 文件；需 revalidate HTML、原子部署并短期保留旧资源。
- `no-cache`、`max-age=0` 和 `no-store` 不能混为一谈。

**递进追问：**

1. **no-cache 与 no-store 的核心区别是什么？**

   no-cache 允许保存响应但复用前必须向服务器验证，no-store 要求不保存；敏感个人数据通常考虑 no-store，版本化静态资源不应使用它。

2. **为什么 HTML 不能像哈希 JS 一样缓存一年？**

   HTML URL 通常不随内容变化且负责引用新资源，长期缓存会让用户一直拿旧入口；哈希资源内容改变时 URL 也改变，可以安全 immutable。

**易错点：**

- 不要只在前端 fetch 选项里改 cache 就认为 CDN 与代理策略同步，响应头才是共享缓存契约。
- 不要给携带 Cookie 的私有响应误设 public，否则中间缓存可能向其他用户复用。

**参考来源：**

- [RFC 9111：HTTP Caching](https://www.rfc-editor.org/info/rfc9111)
- [MDN：HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

## Q49：CORS 与预检请求是如何工作的？

**短回答：**

同源策略限制页面脚本读取其他源的响应，源由协议、主机和端口组成。CORS 是服务器通过响应头明确允许某些跨源页面读取资源，并不是鉴权。满足简单方法、简单请求头和规定 Content-Type 的请求通常直接发送；PUT、DELETE、自定义 Authorization 或 JSON Content-Type 等非简单请求会先发 OPTIONS 预检，服务器允许方法和请求头后才发真实请求。携带 Cookie 时，前端要设置 credentials，服务端返回 `Access-Control-Allow-Credentials: true`，并且 `Access-Control-Allow-Origin` 不能使用星号。

典型响应头：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
Vary: Origin
```

**原理：**

CORS 是浏览器对脚本跨源读响应的约束，不是服务端身份认证：

1. 浏览器比较页面和目标的协议、主机、端口，跨源请求会携带 Origin。
2. 非简单方法、Content-Type 或自定义请求头会先发 OPTIONS 预检，询问服务端允许的来源、方法和请求头。
3. 正式响应仍需返回匹配的 Access-Control-Allow-Origin；使用 Cookie 时前端需显式携带凭据，服务端需允许 credentials，且不能使用通配来源。

预检成功不代表业务请求有权限，预检失败也不代表服务器收不到所有跨源请求。鉴权、CSRF 防护和输入校验必须独立完成。

**代码 / 场景：**

- 开发阶段使用 Vite proxy 把 `/api` 转发到 Flask，可让浏览器看到同源请求；生产优先由 Nginx 统一域名。
- 确需跨域时使用精确 Origin allowlist，不能无条件反射请求 Origin。
- Postman 和 curl 不执行浏览器同源策略，所以“Postman 成功、浏览器失败”通常要检查 CORS。
- POST 不一定预检；表单型简单 POST 可直接发，而 `application/json` 通常会预检。
- CORS 控制跨源脚本能否读取响应，不是身份认证，也不能替代 CSRF 防护。

**递进追问：**

1. **为什么 Postman 能调用，浏览器却报 CORS？**

   CORS 是浏览器对脚本读取跨源响应的限制，Postman 不受同源策略约束；服务器可达并不表示浏览器允许前端读取。

2. **带凭据请求为什么不能配 Access-Control-Allow-Origin 星号？**

   浏览器要求服务器明确回显受信 Origin 并设置 Allow-Credentials，避免任何站点都能以用户凭据读取响应；还应校验 Origin 白名单。

**易错点：**

- 不要把 CORS 当服务端鉴权，curl 或攻击者服务器不受浏览器策略保护。
- 不要对收到的 Origin 无条件回显并允许 credentials，这等于把跨站读取权限交给任意来源。

**参考来源：**

- [MDN：CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [OWASP：Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)

## Q50：AI 输出场景应如何防御 XSS？

**短回答：**

XSS 是不可信内容被浏览器当成代码执行。AI 输出、检索文档和工具结果都必须按外部输入处理：优先以文本渲染；需要富文本时禁用原始 HTML，并用维护良好的 sanitizer 按白名单清洗和限制 URL 协议。CSP、Trusted Types 和 HttpOnly Cookie 只能做纵深防御，不能代替安全输出。

**原理：**

- HTML body、attribute、JavaScript、CSS 和 URL 是不同上下文，需要对应的编码方式。
- Vue `{{ value }}` 和 React `{value}` 默认按文本处理；`v-html`、`innerHTML` 和 `dangerouslySetInnerHTML` 会绕开保护。
- 需要保留富文本时使用 sanitizer；纯文本则直接转义，不要混淆“编码”和“清洗”。
- 输入时过滤一次不够，数据未来可能进入不同输出上下文，应在接近输出的位置处理。
- HttpOnly 能降低 Cookie 被直接读取的风险，但恶意脚本仍可代用户发请求，不能消除 XSS。
- CSP 是额外保护层，不能替代输出编码和 HTML 清洗。

**代码 / 场景：**

让模型输出脚本标签、javascript 链接、带 onerror 的图片和普通代码示例，用真实 Markdown 渲染链路测试。禁用原始 HTML，链接协议白名单化，必要时经成熟 sanitizer；CSP 作为第二层防线。再验证流式未闭合标签不会绕过最终策略，并对阻断结果写安全回归。

**递进追问：**

1. **React 普通 JSX 文本会转义，为什么仍会发生 XSS？**

   dangerouslySetInnerHTML、Markdown 插件、DOM API 和危险 URL 会绕过普通文本转义；AI 输出通常经过富文本转换，因此必须审查实际 sink。

2. **只在 Prompt 中要求模型不输出 HTML 是否足够？**

   不足，模型输出不可作为安全保证，资料本身也可能诱导；客户端与服务端都应把输出当不可信数据并在进入执行上下文前处理。

**易错点：**

- 不要自己用正则删除 script 标签，事件属性、SVG 和编码变体会轻易绕过。
- 不要允许模型生成的链接直接使用任意协议，javascript 与 data URL 需要明确限制。

**参考来源：**

- [OWASP：XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify 官方仓库](https://github.com/cure53/DOMPurify)

## Q51：CSRF、CORS 与认证方式有什么关系？

**短回答：**

CSRF 利用浏览器自动携带登录 Cookie，诱导用户执行并非本人发起的操作；CORS 主要限制跨源脚本能否读取响应，不是身份认证，也不能单独阻止 CSRF。防护要用 SameSite、CSRF Token、Origin 校验和正确的请求语义。

**原理：**

- CSRF 成立的关键是认证凭证会被浏览器自动随跨站请求发送。
- Synchronizer token 由服务器保存并要求页面提交；signed double-submit 使用会话绑定 HMAC，不能只比较攻击者可注入的普通 Cookie。
- `SameSite=Lax/Strict` 是纵深防御；site 与 origin 不同，同站子域不一定可信。
- 对非安全方法校验 `Origin`、`Referer` 或 `Sec-Fetch-Site`，所有副作用接口使用 POST/PUT/PATCH/DELETE。
- AI 知识工作台 的发送消息、批准 Agent 工具、删除会话和取消任务都可能产生副作用或资源消耗。
- JWT 如果放在 Cookie 中仍会被自动附带，依然要考虑 CSRF；“用了 JWT 就没有 CSRF”是错误结论。

**代码 / 场景：**

搭建 Cookie Session 与 Authorization Header 两种登录 Demo，从第三方页面分别发普通表单和 fetch。验证浏览器可能自动携带 Cookie，SameSite、Origin 检查和 CSRF token 如何阻断；Header token 不会自动附带但更怕 XSS 读取。把 CORS 仅用于“能否读响应”，不混入身份判断。

**递进追问：**

1. **SameSite=Lax 是否意味着不再需要 CSRF 防护？**

   它能阻止多数跨站子请求携带 Cookie，但顶级导航、旧浏览器和业务例外仍需评估；敏感写操作还应验证 Origin 或 CSRF token。

2. **使用 JWT 就不会有 CSRF 吗？**

   取决于存储与发送方式；JWT 放 HttpOnly Cookie 仍会被浏览器自动携带，需要 CSRF 防护，放 JavaScript 可读存储则主要增加 XSS 窃取风险。

**易错点：**

- 不要把预检请求当 CSRF 防线，简单表单请求可能无需预检就到达服务器。
- 不要同时允许任意 Origin、credentials 和状态修改接口，这会扩大跨站攻击面。

**参考来源：**

- [OWASP：CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN：CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

## Q52：JWT 的原理、存储方式与安全边界是什么？

**短回答：**

JWT 是一段带签名的声明，不是加密保险箱。服务端必须固定允许的算法并验证签名、签发方、受众和有效期；payload 对持有者可读，不能放密码或隐私。短期 access token 仍需配合 refresh token 轮换、撤销和重放控制，浏览器存储方式要同时权衡 XSS 与 CSRF。

**原理：**

- header 描述类型和算法；payload 存 claim；signature 保证完整性和来源，不保证机密性。
- 验证端必须固定允许算法，不能盲信 token 自带的 `alg`；还要验证 issuer、audience、expiration 和 not-before。
- JWT 的“无状态”不会自动解决登出撤销、账号封禁、权限即时变更和被盗后重放。
- 常见控制包括短 `exp`、refresh rotation、`jti`/session registry、denylist，或直接使用 opaque session。

**代码 / 场景：**

- fetch stream 可携带 Authorization header；原生 EventSource 不能自由设置该头，更适合同源 HttpOnly Cookie，或先用已鉴权 POST 创建 run，再发放短期订阅票据。
- JWT payload 可以被任何持有者读取；修改字符串后若服务端正确验签，应校验失败。
- `localStorage` 对同源 JavaScript 可读，一处 XSS 就可能窃取长期 token；HttpOnly 只阻止脚本直接读取 Cookie，不阻止恶意脚本代用户操作。
- 删除浏览器 token 不会让已泄漏的 token 失效；退出登录还要结合短有效期、刷新令牌撤销或服务端状态。
- JWT 是 token 表示格式，不是完整的登录、授权和刷新协议；需要即时撤销时，服务端 session 可能更简单。

**递进追问：**

1. **JWT 如何做到立即注销？**

   纯无状态 access token 到期前难以立即失效，可缩短有效期并用服务端会话、tokenVersion 或撤销列表控制刷新和高风险请求。

2. **为什么不能相信 token Header 里的 alg？**

   服务端必须按预配置算法和密钥验证，不能让攻击者选择 none 或错误算法；同时按 kid 从受信密钥集合取钥并限制轮换范围。

**易错点：**

- 不要把 JWT payload 的 Base64 解码误认为加密，任何持有者都能读取其中内容。
- 不要把长期 token 放 localStorage 后忽略 XSS，一次脚本注入即可窃取并跨设备使用。

**参考来源：**

- [RFC 7519：JSON Web Token](https://www.rfc-editor.org/info/rfc7519)
- [OWASP：JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)

# 计算机与后端基础

## Q53：从输入 URL 到页面渲染发生了什么？

**短回答：**

浏览器先解析 URL 和缓存策略，再做 DNS、连接与 TLS，发送 HTTP 请求；收到 HTML 后并行构建 DOM、CSSOM 和加载资源，最后经过样式、布局、绘制与合成显示页面。能看到页面不等于可交互，长脚本仍可能占住主线程。

**原理：**

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

![浏览器从 HTML 和 CSS 解析到布局、绘制与合成的渲染流水线图](/content/diagrams/frontend-engineering/browser-rendering-pipeline-v1.svg "从导航到首屏渲染的关键阶段")

**代码 / 场景：**

在 Chrome DevTools 录制一次禁用缓存的首屏导航，把 URL 解析、DNS、连接、TLS、首字节、HTML 流式解析、CSSOM、脚本、布局、绘制和合成逐段标注。再注入一个 200 毫秒长任务，观察资源已到达但页面仍不可交互，说明网络完成不等于渲染完成。

**递进追问：**

- `DOMContentLoaded`：DOM 已解析完成，并等待同步脚本和 `defer` 脚本执行完；它不必等待图片全部加载。
- `load`：页面依赖的图片等资源也已完成加载。
- `async`：下载完立即执行，执行顺序不保证；`defer`：HTML 解析完成后按文档顺序执行。
- 不一定每次都重新 DNS、TCP、TLS：可能命中缓存、Service Worker，或复用已有连接。
- HTTP/2 虽然能多路复用，但多个流共享一条 TCP，丢包时仍有 TCP 层队头阻塞；HTTP/3 用 QUIC 的独立流缓解这一问题。

**易错点：**

- 不要背成绝对串行步骤，预加载扫描、网络请求和解析会并行交错。
- 不要把 DOMContentLoaded、load 与“可交互”当成同一个时刻，它们衡量的条件不同。

**参考来源：**

- [MDN：How browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [RFC 1034：Domain Names - Concepts and Facilities](https://www.rfc-editor.org/info/rfc1034)
- [RFC 8446：TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)

## Q54：DNS 解析的完整过程是什么？

**短回答：**

DNS 把域名逐步解析成地址。客户端通常把请求交给递归解析器；缓存未命中时，递归解析器依次询问根、顶级域和权威服务器，最终得到 A、AAAA、CNAME 等记录并按 TTL 缓存。DNS 只负责找到目标地址，之后还要单独建立 TCP、TLS 和 HTTP 连接。

**原理：**

- 客户端通常要求递归解析器完成递归查询；递归解析器再向根、顶级域、权威服务器进行多次迭代查询。
- `A` 对应 IPv4，`AAAA` 对应 IPv6，`CNAME` 是别名；遇到 CNAME 后通常还要继续解析目标域名。
- DNS 通常使用 UDP 53；响应被截断、数据较大或某些特殊场景会使用 TCP。
- CDN 可以利用 DNS，根据地理位置、网络和负载把用户调度到合适节点。

**代码 / 场景：**

用 nslookup 或 dig 对一个未缓存域名查询，记录浏览器/系统缓存、hosts、递归解析器、根、TLD 与权威服务器的角色。再查 CNAME 和 A/AAAA，修改一个低 TTL 测试记录，观察不同递归节点传播时间；明确客户端通常向递归解析器发查询，不会自己走遍所有层。

**递进追问：**

- TTL 到期前，缓存中可能仍是旧地址，因此 DNS 变更通常不会立即全网生效。
- DNS 只负责获得地址，不负责建立 TCP 连接。
- DoH/DoT 主要加密 DNS 传输；DNSSEC 主要验证记录来源和完整性，两者解决的问题不同。
- DNS 劫持或缓存投毒会把域名指向错误地址；HTTPS 证书校验还能在后续连接阶段提供一层身份保护。

**易错点：**

- 不要把递归解析和迭代查询混为一谈，客户端与递归服务器承担的工作不同。
- 不要通过把 TTL 永久设得极低解决发布，查询负载、成本和缓存收益也需要权衡。

**参考来源：**

- [RFC 1034：Domain Names - Concepts and Facilities](https://www.rfc-editor.org/info/rfc1034)
- [RFC 1035：Domain Names - Implementation and Specification](https://www.rfc-editor.org/info/rfc1035)

## Q55：TCP 为什么需要三次握手、四次挥手和 TIME_WAIT？

**短回答：**

第一次，客户端发送 SYN 和初始序列号 x。第二次，服务端返回 SYN 加 ACK，自己的初始序列号是 y，确认号是 x+1。第三次，客户端再返回 ACK，确认号是 y+1，双方进入已连接状态。三次握手的核心是让双方确认自己的发送和接收能力，并同步初始序列号，同时避免历史失效连接被误认为新连接。

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


TCP 是全双工的，两个方向要分别关闭。主动方先发送 FIN；被动方返回 ACK，表示收到了关闭请求，但可能还有数据没发完；被动方处理完剩余数据后再发送 FIN；主动方返回最后一个 ACK，进入 TIME_WAIT，等待后才彻底关闭。

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

**原理：**

TCP 建连、传输和关闭分别解决不同问题：

- **三次握手**：客户端和服务端各自公布初始序列号，并证明双向收发路径可用。最后一个 ACK 让服务端确认客户端收到了自己的序列空间。
- **四次挥手**：TCP 是全双工字节流，一方 FIN 只表示自己不再发送，另一方仍可继续发送数据，所以两个方向要独立关闭；ACK 和 FIN 在合适时可合并。
- **TIME_WAIT**：主动关闭方保留连接状态，既可重发最终 ACK，也等待旧报文过期，防止污染后续复用同一四元组的连接。

握手完成只证明传输连接已建立，不证明 TLS、HTTP 路由或业务服务正常；排障时要按层分开验证。

![TCP 建连与 TLS 握手的时序关系图](/content/diagrams/network-deployment/tcp-tls-handshake-v1.svg "可靠传输与加密会话建立在不同协议层完成")

**代码 / 场景：**

用 Wireshark 抓取一次 TCP 连接建立和主动关闭，标出双方初始序列号、ACK、FIN 与 TIME_WAIT。再制造丢包观察重传，说明三次握手确认双向收发与序列空间，四次挥手来自全双工方向独立关闭；最后用端口复用实验解释旧报文风险。

**递进追问：**

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

**易错点：**

- 不要把四次挥手说成永远四个独立包，ACK 与 FIN 在合适时机可以合并。
- 不要看到大量 TIME_WAIT 就立即调小内核参数，应先确认连接复用、关闭方向和真实端口耗尽。

**参考来源：**

- [RFC 9293：TCP](https://www.rfc-editor.org/rfc/rfc9293)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [MDN：Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)

## Q56：HTTP、HTTPS 与常见状态码分别解决什么问题？

**短回答：**

HTTP 定义请求、响应、方法和状态码；HTTPS 是由 TLS 保护的 HTTP，增加加密、完整性和服务端身份校验。状态码中 2xx 表示成功，3xx 表示重定向或缓存协商，4xx 表示请求需修正，5xx 表示服务端未能完成请求。

**原理：**

HTTP 定义请求、响应、方法、状态码和缓存等应用语义；HTTPS 则是让 HTTP 运行在 TLS 保护的连接上：

1. TLS 握手协商版本、算法和临时密钥，客户端校验证书链、域名和有效期，双方派生会话密钥。
2. 后续 HTTP 报文使用对称加密保护机密性和完整性；TLS 不会替应用判断用户是否有业务权限。
3. 状态码表达处理结果：2xx 成功，3xx 重定向或缓存协商，4xx 表示客户端需修正请求或身份，5xx 表示服务端未能履行请求。

重试策略不能只按状态码决定：还要看方法是否幂等、是否已提交副作用、Retry-After 和业务错误码，避免把一次超时放大成重复扣款或重复建单。

**代码 / 场景：**

用 curl -v 请求同一路径的 HTTP 与 HTTPS，观察 HTTP 语义如何承载在 TCP/TLS 或其他传输上，HTTPS 额外完成证书验证和密钥协商。为 API 构造 200、201、204、304、400、401、403、404、409、429、500、503，逐个写清客户端是否重试及用户提示。

**递进追问：**

1. **401 与 403 应如何区分？**

   401 表示缺少或无效认证，通常可重新登录；403 表示身份已确认但无权限。隐藏敏感资源存在性时服务端也可按策略统一返回 404。

2. **HTTPS 能否阻止恶意服务端读取请求？**

   不能，TLS 保护客户端到所验证服务端之间的传输和完整性，终止 TLS 的服务仍能看到明文；端点可信、应用鉴权和数据最小化仍必要。

**易错点：**

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

**参考来源：**

- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 8446：TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)

## Q57：进程、线程与协程有什么区别？

**短回答：**

进程强调资源与地址空间隔离；操作系统线程是在进程内可被调度的执行流，共享进程资源但各有栈和寄存器；协程则是语言或运行时提供的可挂起任务。协程没有统一实现：JavaScript、Python asyncio 和 Go goroutine 的调度方式并不相同，能否利用多核也取决于具体运行时。

**原理：**

三者的核心区别是资源边界和调度责任；“协程”必须结合具体语言运行时解释：

- **进程**：通常拥有独立虚拟地址空间和资源引用，隔离强；跨进程交换数据需要管道、套接字、共享内存等 IPC。
- **线程**：共享进程地址空间和文件等资源，但拥有独立寄存器、栈和调度上下文；共享数据必须通过锁、原子操作或消息传递保护不变量。
- **协程/运行时任务**：由语言或运行时调度，可在 await、yield 或运行时安排的安全点挂起。JavaScript async 函数、Python asyncio Task 和 Go goroutine 的调度、抢占与多核能力不同，不能套用同一实现结论。

这些任务最终仍在系统线程上执行。选型应同时看故障隔离、共享状态、CPU/I/O 比例、运行时调度、取消传递和调试成本，不能只比“谁更轻”。

**代码 / 场景：**

用一个 CPU 计算和一个 I/O 等待任务分别比较单进程、多线程、async 协程与 worker 进程。记录地址空间、调度单位、上下文切换和崩溃隔离；在 Python 示例中说明协程只在 await 处让出，并不会让 CPU 密集代码自动并行。

**递进追问：**

- 进程切换通常要切换地址空间等更多上下文，所以比线程更重。
- 多线程共享内存可能出现竞态，需要锁、原子操作等同步机制，也可能死锁。
- 并发是多个任务在一段时间内交替推进；并行是多个任务在同一时刻真正执行。
- JavaScript 的 `async/await` 是基于 Promise 和事件循环的异步控制流，表现得像协程，但 IO 通常由浏览器、Node 运行时和操作系统处理。
- CPU 密集任务要真正利用多核，浏览器侧可以考虑 Web Worker，Node.js 可考虑 Worker Threads 或多进程。

**易错点：**

- 不要把“线程由系统调度、协程由用户态调度”当成所有语言实现的完整答案。
- 不要用协程处理未拆分的 CPU 长任务，它仍会阻塞所在执行线程。

**参考来源：**

- [Linux man-pages：clone(2)](https://man7.org/linux/man-pages/man2/clone.2.html)
- [Python：asyncio Task](https://docs.python.org/3/library/asyncio-task.html)
- [Go 语言规范：Go statements](https://go.dev/ref/spec#Go_statements)

## Q58：虚拟内存如何映射到硬件内存？

**短回答：**

虚拟内存让程序使用虚拟地址，而不是直接操作物理内存。CPU 先查保存常用映射的 TLB，未命中再查页表；页尚未驻留时触发缺页异常，由操作系统装入或分配物理页后重试。它提供隔离、按需加载和共享能力，但频繁缺页会明显拖慢程序。

**原理：**

虚拟内存把程序看到的地址与实际物理页框解耦：

1. CPU 产生虚拟地址，拆成虚拟页号和页内偏移。
2. MMU 先查 TLB；未命中时按页表层级寻找页表项，检查存在位和读写执行权限。
3. 页已驻留时组成物理地址并访问缓存/内存；页不在内存时触发缺页异常，内核可从文件或 swap 载入，或为匿名页分配页框。

进程的 VIRT 是地址空间范围，RSS 是当前驻留物理内存，两者不等于进程独占内存。排查时还要区分堆、mmap、共享页、page cache 和写时复制，不能用单一数字判断泄漏。

**代码 / 场景：**

在 Linux 进程中申请一大段虚拟内存但只访问部分页面，观察 VIRT、RSS 与缺页变化；再读取一个地址的页号概念，画出虚拟页经页表和 TLB 映射到物理页框。触发 swap 或文件映射实验，说明“从硬件读取内存”还涉及缓存层级与操作系统权限。

**递进追问：**

- TLB 是页表映射的高速缓存，用来减少多级页表遍历。
- Page Fault 不一定是程序错误；按需加载时的首次访问也会发生正常缺页。
- 页面频繁换入换出会产生抖动（thrashing），性能会急剧下降。
- 栈和堆是进程虚拟地址空间中的不同区域；虚拟内存不会自动解决内存泄漏。
- JavaScript 通常不能直接操作裸指针，但 ArrayBuffer、TypedArray 等最终仍由运行时映射到进程内存。

**易错点：**

- 不要把虚拟地址直接说成磁盘地址，绝大多数已驻留页面映射到物理内存。
- 不要只看进程 VIRT 判断内存泄漏，共享映射、保留地址和真实 RSS 含义不同。

**参考来源：**

- [Linux Kernel：Memory Management Concepts](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Linux Kernel：Page Tables](https://docs.kernel.org/mm/page_tables.html)

## Q59：数组、链表、栈和队列应该如何选择？

**短回答：**

先按操作选择结构：频繁按下标读取和顺序遍历优先动态数组；已经拿到节点并频繁插删时链表才可能占优；栈表达后进先出，队列表达先进先出。复杂度成立有前提，例如动态数组尾插是均摊 `O(1)`，单链表删除是“已知前驱”时 `O(1)`。

**原理：**

选数据结构应先明确操作语义，再比较复杂度和内存布局：

- 需要按下标随机访问、紧凑遍历和尾部追加时，连续数组通常是默认选择；中间插入需要搬移后续元素。
- 链表在已持有目标节点时可常数时间插删，但定位第 k 项仍需顺序走访，且指针开销和缓存局部性较差。
- 栈表达后进先出，队列表达先进先出，双端队列能在两端做常数时间操作；它们是行为约束，可由不同底层结构实现。

大 O 只是增长趋势。真实选型还要测数据规模、对象开销、缓存命中、内存分配和并发访问模式。

**代码 / 场景：**

为三类需求选结构并实测：随机访问百万项用数组，频繁在已知节点后插入用链表，撤销历史用栈，任务先来先服务用队列。分别记录访问、插入、删除复杂度与实际缓存局部性；再说明 JavaScript Array 的动态实现不等于教科书固定数组。

**递进追问：**

- 删除单链表某节点通常需要它的前驱；双链表在已知节点时可 `O(1)` 删除，但多存一个指针。
- JavaScript `Array.shift()` 通常涉及后续元素重排，不适合作为高频大队列；可用头指针或环形数组。
- JavaScript Array 是语言级动态数组，引擎会根据元素类型、空洞和稀疏程度采用不同表示，不能简单认为永远是一块连续原生内存。
- 栈和队列描述的是访问规则，可以用数组或链表作为底层结构。

**易错点：**

- 不要只背大 O 而忽略常数、缓存局部性和数据规模。
- 不要用链表解决需要频繁按索引读取的问题，它必须从头或已知节点顺序遍历。

**参考来源：**

- [Open Data Structures：Array-Based Lists](https://opendatastructures.org/ods-python/2_Array_Based_Lists.html)
- [Open Data Structures：Linked Lists](https://opendatastructures.org/ods-python/3_Linked_Lists.html)

# 高频手写题

## Q60：如何判断链表有环并找到入环点？

**短回答：**

使用 Floyd 快慢指针。慢指针每次走一步，快指针每次走两步；如果没有环，快指针会先到 null；如果有环，两者一定在环中相遇。相遇后把一个指针放回头节点，另一个保留在相遇点，二者都每次走一步，再次相遇的位置就是入环点。

**原理：**

> 使用 Floyd 快慢指针。慢指针每次走一步，快指针每次走两步；如果没有环，快指针会先到 null；如果有环，两者一定在环中相遇。相遇后把一个指针放回头节点，另一个保留在相遇点，二者都每次走一步，再次相遇的位置就是入环点。


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

**代码 / 场景：**

实现 Floyd 快慢指针并用四组用例走读：空链表、单节点无环、单节点自环、长链中部入环。相遇后让一个指针回到头部，两者同速前进求入口；打印移动步数并解释距离等式，同时给出 Set 方案作为易懂但 O(n) 空间的对照。

**递进追问：**

1. **快慢指针第一次相遇点为什么通常不是入口？**

   快指针在环内可能多走若干圈，相遇只证明存在环；由头到入口距离与相遇点到入口的特定模环关系，重置一个指针后才会在入口相遇。

2. **如果还要计算环长度怎样做？**

   第一次相遇后固定一个指针，另一个沿 next 走到再次相遇并计数；必须先确认有环，避免在 null 上继续访问。

**易错点：**

- 时间 `O(n)`，空间 `O(1)`。
- 空链表、单节点无环、单节点自环都要覆盖。
- 如果只要求判断是否有环，首次相遇时即可返回 `true`。
- HashSet 也能完成，但需要 `O(n)` 额外空间。

**参考来源：**

- [LeetCode 142：Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)
- [Open Data Structures：Linked Lists](https://opendatastructures.org/ods-python/3_Linked_Lists.html)

## Q61：如何实现链表形式的两数相加？

**短回答：**

先确认数字是否按低位在前存储。若是，就同步遍历两个链表：每一位计算 `sum = x + y + carry`，写入 `sum % 10`，再把 `Math.floor(sum / 10)` 留给下一位。循环必须覆盖两条链表和最后进位，时间为 `O(max(m,n))`。

**原理：**

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

**代码 / 场景：**

实现逆序数字链表相加，循环条件写成 l1、l2 或 carry 任一存在；每轮取缺失节点为零，计算 sum、digit 和新 carry。用 342+465、999+1、0+0、长度不等四组测试，再说明若输入为正序链表需用栈或先反转，不能沿用同一遍历方向。

**递进追问：**

1. **为什么循环结束后还要处理 carry？**

   最高位相加可能产生新进位，例如 999+1 得到额外节点 1；把 carry 放进循环条件可统一处理，不需结束后特殊分支。

2. **能否复用较长输入链表减少空间？**

   可以原地修改，但会破坏输入并使共享节点场景危险；面试前先确认约束，默认新建结果链表通常更清晰，额外空间是结果本身所需。

**易错点：**

- 时间 `O(max(m, n))`。
- 除结果链表外额外空间 `O(1)`，结果空间 `O(max(m, n))`。
- 两条链表长度不同，短的一侧按 0 处理。
- 若数字正序存储，可以用两个栈从低位向高位计算，或先反转链表再相加。

**参考来源：**

- [LeetCode 2：Add Two Numbers](https://leetcode.com/problems/add-two-numbers/)
- [Open Data Structures：Linked Lists](https://opendatastructures.org/ods-python/3_Linked_Lists.html)

## Q62：数组去重有哪些实现与复杂度差异？

**短回答：**

去重方式取决于输入和“相等”的定义：无序基本类型数组要保序可用 `Set`，平均时间 `O(n)`、空间 `O(n)`；已排序数组可用快慢指针原地压缩，时间 `O(n)`、额外空间 `O(1)`；对象数组应先明确按哪个 key 去重，以及保留第一次还是最后一次。

**原理：**

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

**代码 / 场景：**

对包含 NaN、-0、对象引用和重复字符串的数组分别用 Set、filter+indexOf、排序双指针和按 key 的 Map 去重。记录是否保持原顺序、比较语义、时间与额外空间；对象按业务 id 去重时明确保留第一项还是最后一项，并测试 id 缺失。

**递进追问：**

1. **Set 对 NaN 和 -0 的比较语义是什么？**

   Set 使用 SameValueZero，NaN 与自身视为相等，+0 与 -0 也视为相等；这与 indexOf 对 NaN 的行为不同，需要按题目要求说明。

2. **对象内容相同为什么 Set 仍会保留两项？**

   对象按引用身份比较，不做深度结构比较；若业务按 id 或组合字段去重，应显式构造稳定 key，并处理冲突和缺失值。

**易错点：**

- 不要默认排序后去重仍保持输入顺序，排序会改变元素位置且有 O(n log n) 成本。
- 不要用 JSON.stringify 做通用对象去重，键顺序、循环引用和不可序列化值都会出问题。

**参考来源：**

- [MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [LeetCode 26：Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/)

## Q63：如何反转单链表？

**短回答：**

维护 `prev`、`curr`、`next` 三个指针。`prev` 指向已经反转的部分，`curr` 指向待处理节点；先保存 `next`，再把 `curr.next` 指向 `prev`，最后整体前移。保存 next 是为了避免修改指针后丢失后半段链表。

**原理：**

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

**代码 / 场景：**

迭代反转时在每轮写清不变量：prev 已是反转完成的前缀，current 指向未处理首节点；先保存 next，再改 current.next，最后推进两指针。用空、单节点、两节点和长链测试；再写递归版比较 O(n) 调用栈与尾节点处理。

**递进追问：**

1. **为什么必须先保存 next 再改指针？**

   current.next 被改为 prev 后，原来的后续链路会丢失；保存 next 才能继续遍历未处理部分，这是原地算法的关键顺序。

2. **如何只反转区间 m 到 n？**

   先找到区间前驱，按相同不变量反转指定长度，再把前驱接新头、旧区间头接后继；需要特别处理 m=1 时没有前驱。

**易错点：**

- 时间 `O(n)`，额外空间 `O(1)`。
- 空链表和单节点链表无需单独分支。
- 递归方案虽然也是 `O(n)` 时间，但占用 `O(n)` 调用栈，长链表可能栈溢出。
- 若输入可能有环，要先处理环，否则遍历不会结束。

**参考来源：**

- [LeetCode 206：Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)
- [Open Data Structures：Linked Lists](https://opendatastructures.org/ods-python/3_Linked_Lists.html)

## Q64：如何实现 Promise 并发限制器？

**短回答：**

要限制并发，传入的应该是尚未启动的任务函数，而不是已经创建好的 Promise。Promise 创建后，其内部异步操作通常已经开始，此时再调度无法限制启动数量。

**原理：**

先说关键前提：

> 要限制并发，传入的应该是尚未启动的任务函数，而不是已经创建好的 Promise。Promise 创建后，其内部异步操作通常已经开始，此时再调度无法限制启动数量。


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

**代码 / 场景：**

实现一个接收任务函数数组和 limit 的调度器，只在 running 小于上限时启动；每项完成或失败都在 finally 释放槽位并启动下一项，结果按原索引保存。用并发计数器断言从未超过 3，并测试同步抛错、异步拒绝、空队列和取消等待任务。

**递进追问：**

1. **为什么队列里应保存函数而不是已经创建的 Promise？**

   Promise 创建时任务通常已开始，放入队列后无法限制并发；保存惰性函数，调度器取得槽位时才调用，才能真正控流。

2. **某个任务失败后其余任务是否继续？**

   由契约决定，可仿 allSettled 收集全部结果，也可停止启动新任务并取消在途项；无论哪种都要在失败路径释放槽位，避免队列死锁。

**易错点：**

- 调度时间 `O(n)`，结果空间 `O(n)`，在途任务数不超过 `limit`。
- 空任务数组会立即得到空结果。
- 一个任务 reject 时，`Promise.all` 会快速 reject；已经运行的任务不会自动取消。
- 真正取消请求需要任务支持 `AbortSignal`，由调度器通过 `AbortController` 协作取消。
- 如果要求收集全部成功和失败结果，应在单任务内部捕获错误，返回类似 `PromiseSettledResult` 的结构。
- `Promise.allSettled` 负责等待全部结果，但本身不限制并发，二者解决的是不同问题。

**参考来源：**

- [MDN：Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN：JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Q65：如何实现防抖与节流？

**短回答：**

防抖是在连续触发时重新计时，只保留停止后的最后一次，适合搜索输入；节流是在持续触发期间按固定频率执行，适合滚动和拖拽。实现时还要明确首次、末次执行以及取消行为。

**原理：**

防抖和节流都是用时间窗口合并高频调用，但保留事件的规则不同：

- **防抖**：每次调用都取消旧计时器并重新计时，只有停止触发达到 wait 后才执行 trailing 回调；适合搜索输入、表单校验等“关心最终值”的场景。
- **节流**：保证持续触发期间每个窗口最多执行一次；适合滚动、拖拽和采样等需要持续反馈的场景。
- **边界选项**：leading 决定窗口开始是否立即执行，trailing 决定结束时是否补最后一次；cancel 清除待执行调用，flush 立即提交它。

实现必须保留最新参数与 this，并用单调时间计算剩余窗口。组件卸载、页面切换或请求失效时应 cancel；搜索还要取消旧网络请求，因为防抖只减少启动次数，不能防止已发请求乱序返回。

**代码 / 场景：**

为搜索框实现 trailing debounce：连续输入只在停顿 300 毫秒后请求，并取消旧计时器；为滚动统计实现每 200 毫秒最多一次的 throttle。用假定时器验证 leading、trailing、cancel、flush 与 this/参数透传，比较短时间内实际调用时间线。

**递进追问：**

- 每次调用时间和额外空间都是 `O(1)`。
- 要根据需求明确 leading、trailing、`maxWait` 和 cancel 语义。
- React 中不能每次渲染都重新创建防抖实例，否则定时器状态会丢失；应保持函数实例稳定并在卸载时清理。
- 防抖只减少请求数，不能自动解决旧请求晚于新请求返回的问题；仍需请求序号或 AbortController。
- 如果被包装的是异步函数，节流也不等于限制在途请求数；并发数需要单独管理。

**易错点：**

- 不要把每次触发都重新延后的实现称为节流，那实际上是防抖。
- 不要忽略 leading 与 trailing 同时开启时的重复边界，单次触发是否执行两次要由契约明确。

**参考来源：**

- [MDN：Debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce)
- [MDN：Throttle](https://developer.mozilla.org/en-US/docs/Glossary/Throttle)

## Q66：如何实现 LRU 缓存？

**短回答：**

LRU 在容量满时淘汰“最久没被访问”的条目。哈希表负责按 key 平均 `O(1)` 找到节点，双向链表维护新旧顺序；每次 get 或 put 命中都要把节点移到最新端，超容量则删最旧端。JavaScript 面试实现也可利用 `Map` 的插入顺序完成同样规则。

**原理：**

LRU 要同时满足“按 key 常数时间定位”和“常数时间找到最久未使用项”：

- 哈希表从 key 直接定位缓存节点，避免 get 时遍历。
- 双向链表按最近使用顺序排列；get 命中或 put 更新时把节点移到最新端，超容量时从最旧端删除。
- 链表节点保存前后指针与 key/value，哈希表和链表删除必须在同一操作中保持一致。

JavaScript Map 保留插入顺序，因此可用 delete 再 set 将命中 key 移到末尾，用第一个迭代键淘汰。这个实现对面试和单线程小缓存足够清楚；生产环境还要处理容量为零、值为 undefined、TTL、并发、存储成本和淘汰回调，不能把访问次数最少的 LFU 与 LRU 混淆。

**代码 / 场景：**

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

**递进追问：**

1. **为什么普通对象加时间戳不一定是 O(1) 淘汰？**

   找最小时间戳需要扫描全部键形成 O(n)，时间相同还需稳定规则；双向链表可在 O(1) 移动节点并从尾部淘汰。

2. **LRU 为什么不一定是最佳缓存策略？**

   顺序扫描会把一次性数据留在缓存并驱逐热点，且未考虑对象大小和过期时间；生产系统可能组合 TTL、LFU、权重与容量字节。

**易错点：**

- `get`、`put` 平均 `O(1)`，空间 `O(capacity)`。
- 更新已有 key 也算一次访问，必须刷新顺序。
- 如果值本身允许是 `undefined`，只看 `get` 返回值无法区分未命中与命中 undefined，应配合 `has` 或返回 `{ found, value }`。
- 若题目允许容量为 0，则每次 `put` 后都应立即淘汰；上面的实现选择直接拒绝非正容量。
- 生产缓存还可能加入 TTL、容量权重、线程安全、命中率统计和持久化。
- LRU 按最近使用时间淘汰；LFU 按访问频率淘汰。

**参考来源：**

- [LeetCode 146：LRU Cache](https://leetcode.com/problems/lru-cache/)
- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)

# 前端与全栈基础速答

## Q67：浏览器事件循环中宏任务与微任务如何调度？

**短回答：**

JavaScript 主线程先执行当前调用栈；一个任务结束后，会把当前微任务队列清空，Promise 的 `then/catch/finally` 和 `await` 后续通常属于微任务。之后浏览器才可能做渲染，再取下一个任务，例如定时器、网络事件或用户事件。微任务执行过程中新增的微任务也会在本轮继续清空，所以递归创建微任务可能饿死渲染和后续任务。

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

**原理：**

浏览器事件循环以“一次 task 执行 + 微任务检查点 + 可选渲染机会”为主线：

1. 浏览器从计时器、用户交互、网络等任务源选择一个 task，将其回调压入 JavaScript 调用栈直到返回。
2. 栈清空后执行微任务检查点，Promise reaction 和 queueMicrotask 按入队继续处理；微任务再创建微任务会延长本次检查点。
3. 微任务清空后，浏览器根据帧调度决定是否计算样式、布局、绘制并运行 requestAnimationFrame，然后进入后续 task。

“宏任务”是常用教学词，不表示所有任务只在一个全局 FIFO 队列里。递归微任务会饿死渲染和计时器；Node.js 又有自己的阶段和 nextTick 规则，不应与浏览器时序混为一谈。

![浏览器事件循环中任务、微任务和渲染机会的执行顺序图](/content/diagrams/javascript/event-loop-v1.svg "一次任务结束后先清空微任务，再进入渲染与下一任务")

**代码 / 场景：**

运行一段同时包含同步日志、queueMicrotask、Promise.then、setTimeout 和 requestAnimationFrame 的代码，先手写顺序再用 Performance 验证。加入递归微任务观察定时器与渲染被推迟，说明一次 task 结束后清空微任务队列，浏览器才获得渲染机会。

**递进追问：**

1. **Promise.then 与 setTimeout 谁一定先执行？**

   在同一任务中都被安排且调用栈正常结束时，then 微任务会在下一个 timer 任务前执行；但若它们来自不同时间和任务源，不能脱离上下文背固定顺序。

2. **微任务为什么可能造成页面卡死？**

   每次微任务又排入新微任务时，检查点迟迟无法清空，浏览器不能进入渲染和后续任务；长工作应分片到任务或 worker，并设置终止条件。

**易错点：**

- “宏任务”是常用教学术语，规范更常说 task。
- `setTimeout(fn, 0)` 只是尽快排队，不保证零毫秒执行。
- 浏览器并非每执行一个任务都必然渲染一次。
- Node.js 的事件循环阶段与浏览器不同，不要混为一谈。

**参考来源：**

- [MDN：JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)

## Q68：原型链、prototype、__proto__ 与 instanceof 有什么关系？

**短回答：**

对象找不到自身属性时，会沿内部原型链继续查找。构造函数的 `prototype` 用来成为新实例的原型；`instanceof` 检查这个对象是否出现在实例的原型链上；`__proto__` 只是访问内部原型的历史接口。

**原理：**

每个普通对象都有内部 [[Prototype]] 链接，属性查找从对象自身开始，找不到才沿这条链向上：

- 构造函数的 prototype 是一个普通属性，供 new 在创建实例时设为新对象的 [[Prototype]]；它不是该函数自身的原型。
- __proto__ 通常是 Object.prototype 上的历史访问器，业务代码应优先用 Object.getPrototypeOf 和 Object.setPrototypeOf，并避免运行时频繁改链。
- instanceof 取右侧函数的 prototype，在左侧对象的 [[Prototype]] 链上查找；跨 realm、自定义 Symbol.hasInstance 和替换 prototype 都会影响结果。

方法共享的本质是多个实例链接到同一原型对象，而不是每个实例复制一份方法。类语法也使用这套原型机制。

**代码 / 场景：**

定义 Person 构造函数和 alice 实例，用 Object.getPrototypeOf 逐层打印 alice、Person.prototype、Object.prototype；再手写简化 instanceof，沿左侧对象原型链寻找右侧函数的 prototype。修改 prototype 后创建新实例，观察旧实例链不会自动指向新对象。

**递进追问：**

1. **Person.prototype 与 Person 的原型是同一个对象吗？**

   不是，前者是构造实例时使用的普通属性，后者可由 Object.getPrototypeOf(Person) 取得，通常指向 Function.prototype，二者角色不同。

2. **为什么跨 iframe 使用 instanceof 可能失败？**

   每个 realm 有独立的内建构造函数和 prototype，对方数组的原型链不包含当前窗口的 Array.prototype；判断数组应使用 Array.isArray。

**易错点：**

- 修改 `Foo.prototype` 为一个新对象，不会反向改变旧实例的原型。
- `instanceof` 可被 `Symbol.hasInstance` 定制，也会受跨 iframe 构造函数影响。
- 箭头函数没有自己的 `this`，也不能作为构造函数使用。

**参考来源：**

- [MDN：Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [MDN：instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)

## Q69：any、unknown、never、type 与 interface 如何选择？

**短回答：**

`any` 基本关闭类型检查，值可以随意读写；`unknown` 表示类型未知，使用前必须缩窄，更适合外部输入；`never` 表示不可能出现的值，可用于穷尽检查或永不返回的函数。`interface` 擅长描述可扩展的对象契约并支持声明合并；`type` 能表达联合、交叉、元组和条件类型。项目里我不机械二选一：公共对象接口可用 interface，流事件的判别联合用 type。

**原理：**

这些 TypeScript 工具解决的是不同边界：

- **any** 基本关闭后续检查，适合极少量有意隔离的迁移边界，不应作为外部数据的默认类型。
- **unknown** 允许任意值进入，但读取属性、调用或赋值前必须通过 typeof、判别字段或运行时 schema 缩窄。
- **never** 表示不可到达的值，可用于 switch 的穷尽检查，让新增协议分支时编译器指出漏处。
- **interface / type**：interface 适合可扩展的对象契约和声明合并；type 可组合联合、交叉、元组和条件类型。

类型只在编译期存在，所以 API、localStorage 和消息流的 unknown 输入仍要运行时校验。对流协议使用判别联合，比一个充满可选字段的大接口更能排除非法状态。

**代码 / 场景：**

设计一个解析 API 结果的函数：入口类型用 unknown，经运行时校验后变成判别联合；泛型保留请求与响应关系，switch default 用 never 检查遗漏。再分别用 interface 扩展对象契约、type 表达联合，演示 any 如何让错误字段一路逃过检查。

**递进追问：**

1. **unknown 相比 any 的实际收益是什么？**

   unknown 接受任意输入但使用前必须收窄，迫使边界写真实检查；any 会同时跳过读取、调用和赋值检查，错误会扩散到下游。

2. **什么时候会自然推断出 never？**

   判别联合所有分支都已处理后的变量、永不返回函数或互斥类型交集会得到 never；可利用它让新增协议类型在编译期暴露遗漏。

**易错点：**

- TypeScript 在运行时会被擦除，`JSON.parse(...) as SomeType` 不能验证网络数据。
- 外部数据应先作为 `unknown`，再通过 Zod、JSON Schema 或类型守卫校验。
- `never` 穷尽检查很适合 `delta/citation/tool/done/error` 事件分发。

**参考来源：**

- [MDN：JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)

## Q70：Cookie、Web Storage 与 IndexedDB 如何选择？

**短回答：**

Cookie 会按作用域随 HTTP 请求发送，适合服务端需要且体积很小的会话信息；`sessionStorage` 只服务当前标签页，`localStorage` 适合少量非敏感偏好，两者都是同步 API；IndexedDB 是异步结构化数据库，适合较大的离线数据。敏感令牌、容量和跨设备同步不能只靠浏览器存储解决。

**原理：**

| 方案 | 生命周期与容量 | 是否自动随请求发送 | 典型用途 |
|---|---|---|---|
| Cookie | 小，按过期时间或会话 | 是，受 Domain/Path/SameSite 控制 | HttpOnly 会话、服务端需要的小状态 |
| `sessionStorage` | 标签页会话，刷新仍在 | 否 | 单标签页多步骤表单草稿 |
| `localStorage` | 持久、同步 API | 否 | 少量非敏感偏好 |
| IndexedDB | 持久、异步、容量较大 | 否 | 离线数据、结构化草稿、文件缓存 |

**代码 / 场景：**

> 注册流程使用 sessionStorage 的理由是状态只需在当前标签页刷新后恢复，不希望长期留下虚拟资料。生产实现仍要处理 schema version、TTL、异常 JSON、敏感字段清理和服务端最终校验；如果需要跨设备草稿，就改为服务端草稿，而不是继续扩大浏览器存储。

**递进追问：**

1. **为什么不把 access token 一律放 localStorage？**

   任意同源 XSS 都可读取并外传，且 token 生命周期难由服务端控制；HttpOnly Cookie 不可被脚本读取，但要配合 SameSite 与 CSRF 防护。

2. **IndexedDB 的事务什么时候可能失效？**

   事务只在活跃事件循环阶段保持，跨不相关 await 可能自动提交；应在事务回调中及时发起请求，并处理版本升级被其他标签页阻塞。

**易错点：**

- localStorage/sessionStorage 是同步 API，大量读写会阻塞主线程。
- XSS 可以读取 Web Storage；敏感长期凭证不应放 localStorage。
- 前端路由守卫只改善体验，不能代替后端授权和流程校验。

**参考来源：**

- [MDN：HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [MDN：Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN：IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## Q71：MySQL 为什么常用 B+ 树？联合索引怎么用？

**短回答：**

B+ 树扇出大、层级低，叶子节点又按键有序，因此既能少读磁盘页完成等值查找，也适合范围扫描。联合索引按定义列依次排序，查询通常要从最左列连续使用；是否真正生效仍应看 `EXPLAIN`，不能只背“最左前缀”。

**原理：**

B+ 树适合数据库，关键不只是 O(log n)，而是它以页为单位降低随机 I/O：

1. 内部页只保存分隔键和子页指针，单页扇出较大，根到叶的层数很少。
2. 叶子页按键有序且相互连接，定位范围起点后可以顺序扫描，同时服务排序和前缀查询。
3. 在 InnoDB 中，聚簇主键叶子保存整行，二级索引叶子保存主键；二级索引查询可能需要再回主键树取其他列。

联合索引按列定义的字典序排列，等值前缀可继续缩小范围，遇到范围条件后后续列通常不再缩小定位区间，但仍可参与覆盖或排序。是否使用索引由优化器根据统计、扫描行数、回表和排序成本决定。

**代码 / 场景：**

建立包含联合索引 (tenant_id, status, created_at, id) 的订单表，用 EXPLAIN ANALYZE 比较等值租户加状态范围、只查 created_at 和深 offset 三类查询。观察 B+Tree 从根到叶定位、叶子顺序扫描和二级索引回表，再改成覆盖索引与游标分页验证扫描行数。

**递进追问：**

1. **联合索引为什么强调最左前缀？**

   键按定义列依次排序，跳过前导列时后续列在整棵树中不连续，通常无法直接定位范围；优化器是否使用仍取决于统计和查询成本。

2. **B+Tree 为什么把数据集中在叶子层？**

   内部节点只存导航键可提高扇出、降低树高，叶子有序相连便于范围扫描；具体聚簇与二级索引叶子内容由存储引擎决定。

**易错点：**

- 不要机械地把区分度最高列放联合索引第一位，等值、范围、排序和实际查询组合都要考虑。
- 不要只看 EXPLAIN 选择了索引就判定优化成功，还要比较实际扫描行数、回表和耗时。

**参考来源：**

- [MySQL：InnoDB Index Types](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [MySQL：Multiple-Column Indexes](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [MySQL：How MySQL Uses Indexes](https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html)

## Q72：事务隔离级别分别会出现哪些并发异常？

**短回答：**

ACID 分别是原子性、一致性、隔离性和持久性。隔离级别从低到高常见为 Read Uncommitted、Read Committed、Repeatable Read、Serializable，隔离越强通常并发代价越高。脏读是读到未提交数据；不可重复读是同一行两次读取结果不同；幻读是同一查询条件两次得到的行集合变化。InnoDB 默认通常是 Repeatable Read，并通过 MVCC 与锁共同实现。

**原理：**

ACID 描述事务契约，隔离级别则决定并发事务能观察到哪些中间变化：

- Read Uncommitted 可能读到未提交变更；Read Committed 每条语句通常取新快照，避免脏读但可出现不可重复读。
- Repeatable Read 通常让同一事务的普通快照读复用一致视图；Serializable 进一步约束并发，但吞吐和等待代价更高。
- MVCC 通过版本和快照减少读写互阻，锁仍用于保护当前读、写入和范围不变量；快照不会自动防止写写冲突。

脏读、不可重复读和幻读是观察现象，具体数据库对同名隔离级别的实现会不同。库存扣减等写业务应使用条件 UPDATE、版本号或显式锁表达竞争，不能因为隔离级别较高就先读再无条件写回。

**代码 / 场景：**

用两个数据库会话复现并发异常：一个事务更新未提交，另一个读取验证脏读；同一事务两次读同一行验证不可重复读；同一范围再次查询验证幻读。记录 MySQL 当前隔离级别、快照读与 FOR UPDATE 的差异，并为库存扣减写带条件的原子 UPDATE。

**递进追问：**

1. **可重复读是否意味着所有查询结果永远不变？**

   快照读通常保持一致视图，但当前读会读取最新可锁版本，自己事务的写入也可见；具体幻读防护依赖 MVCC 与锁实现，不能只背标准名称。

2. **隔离级别越高为什么不一定越好？**

   更强隔离可能增加锁等待、冲突重试或序列化失败，吞吐下降；应根据业务不变量选择，并用唯一约束和条件更新在数据库层兜底。

**易错点：**

- “一致性”是事务执行前后满足业务约束，不只是数据没有损坏。
- MVCC 主要服务一致性读；当前读、更新和范围并发还会涉及记录锁、间隙锁或 next-key lock。
- 不要把“隔离级别越高越好”当作结论，应按一致性、锁冲突和吞吐需求取舍。

**参考来源：**

- [MySQL：InnoDB Transaction Model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL：How MySQL Uses Indexes](https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)

## Q73：REST 中 PUT、PATCH、幂等、分页与错误结构如何设计？

**短回答：**

PUT 通常表示整体替换，PATCH 表示部分修改；幂等是同一请求重复执行后资源效果与执行一次相同。小列表可用页码，持续变化或深翻页数据更适合稳定游标；错误响应应包含机器可判断的错误码和请求追踪 ID。

**原理：**

REST 设计先确定资源身份和 HTTP 语义，再定义重试、并发与列表稳定性：

- PUT 表达对已知 URI 的完整替换，多次执行同一请求应得到同一最终状态；PATCH 表达局部变更，是否幂等取决于补丁语义，“计数加一”就不天然幂等。
- POST 创建或执行命令时，可用 Idempotency-Key 在服务端记录请求指纹和结果，防止超时重试产生重复副作用。
- offset 分页易于跳页，但深页扫描成本高且并发插入会造成重复/遗漏；游标分页用稳定排序键加唯一键继续扫描。

错误响应应同时有正确 HTTP 状态、稳定业务 code、可读 message、字段错误和 requestId。并发更新可配合 ETag/If-Match 或版本号防止静默覆盖。

**代码 / 场景：**

设计订单 API：PUT /orders/{id} 表达完整替换，PATCH 只接受白名单字段，创建用 Idempotency-Key 防重复。列表按 createdAt、id 做稳定游标，错误返回 code、message、fieldErrors、requestId。用同一请求重放、版本冲突和深分页数据变动验证契约。

**递进追问：**

1. **PATCH 请求天然幂等吗？**

   不天然，设置字段为固定值可幂等，而“余额加一”重复执行会累加；接口必须定义操作语义并用幂等键或版本条件控制重放。

2. **为什么游标要同时包含唯一键？**

   createdAt 可能相同，只用它无法确定严格下一位置，会重复或漏记录；追加 id 形成全序，查询条件与 ORDER BY 必须一致。

**易错点：**

- 不要所有业务失败都返回 200 再塞 error 字段，HTTP 状态与稳定业务码应共同表达结果。
- 不要把内部异常堆栈和 SQL 直接返回客户端，保留 requestId 供服务端关联日志。

**参考来源：**

- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9457：Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [IETF：Idempotency-Key Header 草案](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-07)

## Q74：Flask 请求生命周期与流式上下文如何工作？

**短回答：**

Flask 为每个请求建立应用上下文和请求上下文，执行路由与响应钩子后再清理。流式生成器是在视图返回后继续迭代的，若还要读取 `request`，需用 `stream_with_context` 保持上下文，并让数据库连接、追踪和取消覆盖整个流生命周期。

**原理：**

Flask 把 WSGI 请求绑定到两层上下文，再通过 LocalProxy 让代码使用 request、g 和 current_app：

1. 请求到达时推入 application context 和 request context，执行 before_request，匹配路由并调用 view。
2. view 返回值被转为 Response，after_request 可统一加响应头；最后 teardown_request/teardown_appcontext 在成功或异常路径上释放数据库会话等资源。
3. 流式 Response 返回后，generator 的实际迭代发生在 view 之后；若 generator 仍要读 request，需用 stream_with_context 延长所需上下文。

不应让数据库事务、请求对象或大量缓冲区无界地跟随长流。客户端断开、generator 异常和 worker 超时都要进入可观测的取消与清理路径。

**代码 / 场景：**

在 Flask application factory 中注册一个流式 Blueprint，请求进入前记录 requestId，路由读取 request 与 g，返回 generator。先复现 generator 执行时上下文已退出，再使用 stream_with_context 或预先复制所需值修复；最后验证 teardown 无论成功异常都会释放数据库 session。

**递进追问：**

1. **request 为什么看似全局却能区分并发请求？**

   它是上下文本地代理，在当前 worker 的 request context 中解析到对应对象；脱离上下文或把代理传到后台线程都会失败或读错生命周期。

2. **流式响应期间数据库事务应一直保持吗？**

   通常不应，先完成必要查询并提交或释放，再开始长流；否则慢客户端会长期占用连接和锁，需把后续状态写入拆成短事务。

**易错点：**

- `after_request` 不是处理所有清理工作的唯一位置；即使异常也要释放的资源更适合 teardown 或 `finally`。
- 已发送响应头后发生异常，不能可靠地改成普通 500，应发送业务 `error` 事件或断流。
- 开发服务器能流式返回，不等于生产 WSGI、Nginx、CDN 链路一定不会缓冲。

**参考来源：**

- [Flask：The Request Context](https://flask.palletsprojects.com/en/stable/reqcontext/)
- [Flask：Streaming Contents](https://flask.palletsprojects.com/en/stable/patterns/streaming/)

## Q75：Go 的 goroutine、channel 与 context 分别解决什么问题？

**短回答：**

goroutine 是 Go 运行时调度的并发任务；channel 用来传值并建立同步关系；context 沿调用链传递截止时间和取消信号。三者不是固定搭配：共享计数可能更适合 mutex，channel 必须有明确发送、接收和关闭责任，所有 goroutine 都要能在请求取消或超时后退出。

**原理：**

goroutine、channel 和 context 分别负责执行、通信和生命周期传递：

- goroutine 是由 Go 运行时调度到系统线程上的轻量任务；它们可以并发，在有多个可用核时也可并行，但共享内存仍会竞争。
- channel 传递有类型的值并建立同步关系；无缓冲 channel 要求发送接收会合，有缓冲 channel 可吸收有界峰值，两者都不应作为无界队列。
- context 用于沿调用链传播 deadline、取消和请求级元数据；子任务必须主动监听 Done 或把 context 传给支持取消的 I/O。

正确模式要明确谁创建、谁关闭 channel，谁等待所有 goroutine 退出。发送无接收者、永不返回的 I/O 和遗失的 ticker 都会泄漏 goroutine，应用 errgroup、并发上限和超时将失败结构化。

**代码 / 场景：**

写一个并发查询三个服务的 Go handler：errgroup 派生 context，任一关键请求失败就取消其余 goroutine；结果通过明确所有权写入，设置总超时并在返回前等待回收。再实现一个有缓冲 channel 的 worker pool，压测慢消费者时观察背压和 goroutine 数。

**递进追问：**

1. **channel 应该由发送方还是接收方关闭？**

   通常由能确定不会再发送的一方关闭，接收方随意关闭会让后续发送 panic；channel 不必总关闭，只有接收方需要结束信号时才必要。

2. **context.Value 适合传业务参数吗？**

   不适合，它用于请求范围的元数据，如 traceId、认证主体；必需业务参数应显式传递，避免隐藏依赖和键冲突。

**易错点：**

- goroutine 很轻，但不是零成本；泄漏同样会消耗内存和连接。
- 无缓冲 channel 的发送和接收会互相等待；缓冲 channel 只能吸收短期峰值，不能替代容量规划。
- 关闭 channel 通常由发送方负责；向已关闭的 channel 发送会 panic。

**参考来源：**

- [Go 语言规范：Go statements](https://go.dev/ref/spec#Go_statements)
- [Go：context package](https://pkg.go.dev/context)

## Q76：SSR、SSG、CSR 与 hydration mismatch 有什么关系？

**短回答：**

CSR 在浏览器生成页面，SSR 每次请求由服务端生成 HTML，SSG 在构建时预生成 HTML。服务端生成的页面通常还要 hydration，即客户端接管已有 HTML。若客户端首轮渲染与服务端 HTML 不一致，就会 hydration mismatch；应让数据、时区和随机值等首屏输入确定，不能隐藏警告。

**原理：**

CSR、SSR 和 SSG 的主要区别是 HTML 在什么时候、由谁根据数据生成：

- CSR 通常先返回容器和 JavaScript，浏览器运行应用后再请求数据并构建页面。
- SSR 在每次请求或缓存刷新时在服务端产生含内容 HTML，浏览器随后下载 JavaScript 并 hydration，把事件和客户端状态接管回来。
- SSG 在构建阶段预生成 HTML，适合更新节奏可预期且需要 CDN 缓存的内容；增量再生成可避免每次全站重建。

hydration 要求客户端首次 render 与服务端 HTML 在结构和内容上一致。Date.now、随机数、时区、未序列化数据或首帧直接访问 window 都可导致 mismatch。修复方式是让首帧输入确定，将只属于浏览器的差异放到 Effect/mounted 之后，而不是隐藏告警。

**代码 / 场景：**

为文章站分别制作 CSR、SSR 和构建时 SSG 路由，比较首屏 HTML、数据新鲜度、缓存与部署成本。SSR 示例中故意使用 Date.now、随机数和 window 条件造成 hydration mismatch，再把首屏输入序列化为确定数据、浏览器逻辑移到 Effect，验证告警消失。

**递进追问：**

1. **SSG 页面数据更新后必须全站重建吗？**

   不一定，可按路由增量构建、使用按需再生成或让部分数据在客户端刷新；选择取决于发布平台、实时性和一致性要求。

2. **SSR 是否一定改善所有性能指标？**

   它可能更早输出内容，但服务器计算、数据瀑布和 hydration JavaScript 仍有成本；需要测 TTFB、LCP、INP 与缓存命中，而非只看有 HTML。

**易错点：**

- 不要在服务端与客户端首帧使用不同随机值、时区或浏览器 API，这会造成 hydration 不一致。
- 不要把 SEO 当选择 SSR 的唯一理由，分享预览、弱设备体验、缓存与运维复杂度也要评估。

**参考来源：**

- [React：hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Vue：SSR Hydration Mismatch](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch)
- [Nuxt：Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering)

## Q77：如何做前后端与 AI 链路监控？

**短回答：**

链路监控的关键不是多记日志，而是让一次回答从点击、检索、模型、传输到渲染共享 `traceId/runId`。指标要分阶段记录首字延迟、总时长、错误、取消、token 成本和前端卡顿；出现异常时用 trace 定位究竟慢在排队、检索、模型、代理还是渲染，同时避免记录完整 Prompt、令牌和隐私。

**原理：**

端到端 AI 链路必须用同一组身份将前端、API、检索、模型和工具阶段串起来：

1. 入口生成 requestId、conversationId、messageId 和 runId，所有结构化日志、span 与流事件都带必要 ID，但不记完整 Prompt、用户文档、token 或工具密参。
2. 前端记录点击、请求排队、首字节、首个可见字符、渲染长任务、取消和重连；后端分段记录鉴权、检索、重排、模型首 token、工具调用和总生成时间。
3. 指标需按版本和阶段切分：错误率、P50/P95 延迟、TTFT、召回命中、引用正确、工具失败、token 成本和用户取消率不能混成一个平均值。

告警要绑定可执行 SLO 和故障阶段。例如 TTFT 升高时，先用 span 比较排队、检索和模型耗时；如果服务端已准时发出而用户看不到，再查代理缓冲、帧解析和前端渲染。

**代码 / 场景：**

为一次 AI 生成贯穿 requestId、conversationId、messageId、runId，服务端记录排队、检索、模型首 token、总生成和错误阶段，前端记录点击、首字节、首个可见字符、长任务与取消结果。建立一张按版本和阶段聚合的仪表盘，并对日志中的 Prompt、文档和令牌做脱敏。

**递进追问：**

1. **TTFT 很高时如何定位是模型还是前端问题？**

   比较服务端 model_first_token_at、边缘首字节和前端 first_delta_at；若模型早已产出但客户端晚到，检查代理缓冲与网络，若 delta 到达却未显示则查解析和渲染。

2. **为什么只看平均延迟会误导？**

   少量极慢请求和不同文档规模会被平均掩盖，应看 P50、P95、P99 并按阶段、模型、版本和错误类型切分，同时保留样本量。

**易错点：**

- 不要把完整 Prompt、模型输出、JWT 或用户文档直接写日志，可观测性不能越过隐私边界。
- 不要只有指标没有 trace 关联字段，否则前端慢、后端慢和模型慢无法还原为同一次请求。

**参考来源：**

- [OpenTelemetry：Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry：Generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [GoogleChrome：web-vitals](https://github.com/GoogleChrome/web-vitals)

# Agent 工程：MCP、Skill 与 Tool

## Q78：MCP、Tool Calling 与 Skill 分别解决什么问题？
**短回答：**

- **Tool** 是可执行能力及其输入输出契约，例如查询订单、检索文档或写入工单。
- **Tool Calling** 是模型用结构化参数表达“要调用哪个 Tool”的机制，真正执行、鉴权和回填结果仍由宿主应用负责。
- **MCP** 是 Host、Client 与 Server 之间发现和调用 Tools、读取 Resources、使用 Prompts 的标准协议。
- **Skill** 是按需加载的操作说明与配套资源，通常包含说明、脚本、参考资料和模板；它教 Agent “怎样完成一类任务”，但本身不等于远程协议或已经执行的 Tool。
- **Agent** 负责理解目标、选择 Skill、决定是否调用 Tool，并控制循环、确认、失败恢复和停止条件。

这道题来自小红书与牛客公开面经中的 MCP、Tool Calling、Skill 对比问法，不把四个概念压成同一层。

**原理：**

1. **模型层**：Tool Calling 产生工具名与 JSON 参数，输出只是调用意图，不应直接产生副作用。
2. **协议层**：MCP 用 JSON-RPC、生命周期与能力协商，把工具发现和调用从某一家模型 API 中解耦。
3. **知识层**：Skill 通过渐进披露加载说明；启动时只暴露名称与描述，命中任务后再读取完整步骤和所需资源。
4. **编排层**：Agent 把用户目标、上下文、Skill 指引、工具结果和停止条件串成一次可观测运行。

因此“接了 MCP 就有 Agent”“写了 Skill 就会自动执行”都不成立。MCP Server 可能只暴露一个只读 Tool；Skill 也可能完全不调用工具，只规范分析与交付格式。

**代码 / 场景：**

~~~text
用户：检查线上告警并生成复盘
  -> Agent 命中 incident-review Skill，读取排障步骤和复盘模板
  -> 模型选择 get_alerts Tool，并给出结构化参数
  -> Host 将调用映射到 MCP Client
  -> MCP Server 鉴权、执行并返回结果
  -> Agent 按 Skill 校验证据，必要时请求人工确认，再生成复盘
~~~

面试时可用“可移植排障流程”解释 Skill，用“统一连接告警平台”解释 MCP，用“get_alerts”解释 Tool，用“模型输出工具名和参数”解释 Tool Calling。

**递进追问：**

1. **Skill 中可以带脚本，那它是不是 Tool？**

   不必然。脚本是 Skill 的资源；只有宿主把它注册为可调用能力并定义输入、输出、权限与错误语义后，它才成为 Tool。不能因为目录里有脚本就绕过执行授权。
2. **MCP 与普通 REST API 是替代关系吗？**

   不是。MCP Server 经常在内部复用 REST、数据库或命令行能力；MCP 统一的是 AI Host 侧的发现和调用协议，业务服务是否继续提供 REST 是另一层决策。
3. **如何判断应该写 Skill 还是接 MCP？**

   可复用的步骤、规范和模板优先放 Skill；需要访问外部实时数据或执行动作时提供 Tool；当多个 Host 需要以统一协议发现这些能力时，再通过 MCP 暴露。

**易错点：**

- 不要把 Tool Calling 说成模型自己执行了函数；模型只生成调用意图。
- 不要把 MCP 说成 Agent 框架、模型或知识库。
- 不要宣称所有产品中的 Skill 都完全同构；应先说明所采用的 Skill 规范。
- 不要让 Skill 文本或 Tool 描述替代服务端鉴权、参数校验和人工确认。

**参考来源：**

- [社区题源｜小红书：AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc)
- [社区题源｜牛客：一场面试中的 Agent、MCP 与 Skill 问题](https://www.nowcoder.com/discuss/864153617182355456)
- [社区题源｜牛客：AI 应用开发进阶面](https://www.nowcoder.com/discuss/908750485325086720)
- [官方校验｜Agent Skills 规范](https://agentskills.io/specification)
- [官方校验｜MCP 架构](https://modelcontextprotocol.io/docs/learn/architecture)
- [官方校验｜OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

## Q79：MCP 工具接口如何设计，发现、调用与流式结果怎样串起来？
**短回答：**

真实面经会继续追问“怎样包装一个 MCP 工具、入参与出参怎么定义、结果能否流式”。完整链路是：

1. Client 与 Server 先执行 initialize，协商协议版本和 capabilities，再进入 operation。
2. Client 通过 tools/list 获取名称、描述和 input schema，Host 将它转换为模型可见的工具定义。
3. 模型生成工具调用后，Host 校验参数、用户权限和确认策略，再发 tools/call。
4. Server 返回结构化结果或错误；Host 把结果关联到原 call id，交给模型继续推理或直接展示。
5. 传输层可流式承载消息，工具也可发送进度通知，但“流式传输”“业务进度”和“最终调用结果”要分开建模。

**原理：**

- **Schema 要窄**：名称稳定，描述写清适用条件；参数使用明确类型、枚举、长度和 required，避免一个万能字符串承载 SQL、路径或命令。
- **结果要可判定**：区分成功数据、业务拒绝、可重试错误和未知错误；返回给模型的文本不能成为新的可信指令。
- **副作用要显式**：只读、幂等、破坏性操作分别设置权限；写操作带幂等键、目标摘要和确认点。
- **生命周期要完整**：超时、取消、断开、版本不兼容和 Server 重启都要有确定行为，不能只实现 tools/call 的快乐路径。
- **可观测要关联**：runId、toolCallId、用户、Server、耗时和结果类别贯穿日志，但不记录密钥和完整敏感载荷。

**代码 / 场景：**

~~~json
{
  "name": "get_order",
  "description": "按当前用户可见范围读取一个订单，不执行修改",
  "inputSchema": {
    "type": "object",
    "properties": {
      "orderId": { "type": "string", "minLength": 1, "maxLength": 64 }
    },
    "required": ["orderId"],
    "additionalProperties": false
  }
}
~~~

调用前 Host 再校验当前用户是否能访问该订单。若查询需要较长时间，Server 可报告阶段进度；最终仍返回一次可关联的 Tool Result。不要把每个进度片段伪装成多次成功调用，也不要因断线自动重复写操作。

**递进追问：**

1. **MCP 返回结果能不能流式？**

   传输可持续承载消息，也可通过通知报告进度；但客户端必须区分进度、日志和最终结果。若工具要持续订阅数据，应定义独立资源或订阅语义，而不是无限悬挂一个普通 tools/call。
2. **为什么工具描述会影响调用准确率？**

   模型依赖名称、描述和 schema 选择工具。描述重叠、边界含糊或参数过宽会增加误选；应以真实调用集评测选择率、参数合法率和最终任务成功率。
3. **远程 MCP Server 如何鉴权？**

   HTTP 传输按 MCP 授权规范处理 OAuth 与资源服务器边界；stdio 通常从受控环境获取凭据。无论哪种传输，授权都应落实到具体 Tool 和业务资源。

**易错点：**

- 不要省略 initialize 与 capabilities，直接假设所有 Server 支持相同能力。
- 不要把 JSON Schema 当成业务授权；结构合法不代表用户有权操作目标资源。
- 不要在 Tool Result 中返回新的高权限指令并让模型无条件执行。
- 不要把网络重试直接套在非幂等写操作上。

**参考来源：**

- [社区题源｜小红书：淘天 AI Agent 一面](https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb)
- [社区题源｜小红书：AI 应用开发一面](https://www.xiaohongshu.com/explore/6a342fec00000000210215bc)
- [社区题源｜牛客：AI 应用开发进阶面](https://www.nowcoder.com/discuss/908750485325086720)
- [官方校验｜MCP 生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [官方校验｜MCP Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [官方校验｜MCP Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [官方校验｜MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

## Q80：多 Agent 并行时如何隔离 State、Checkpoint 与失败重试？
**短回答：**

这道题来自淘天 Agent 面经中“多个 Agent 一起跑时状态会不会覆盖、State 怎样全局管理、子任务失败怎样重试或降级”的连续追问。核心不是做一个全局可变对象，而是：

- 每次运行使用独立 runId / threadId 和命名空间，子 Agent 只读写声明过的状态片段。
- 状态更新通过 reducer 或版本化事件合并，Checkpoint 保存可恢复快照和下一步位置。
- 重试以节点为单位，并要求该节点幂等；写操作用幂等键、执行记录和补偿，而不是整条链无脑重跑。
- 并行分支在 join 点显式合并，冲突字段要有确定策略，不能以“最后写入者获胜”碰运气。
- 高风险 Tool 在执行前暂停并等待确认，恢复时校验状态版本和授权是否仍有效。

**原理：**

State 是一次运行的业务事实，Checkpoint 是某个确定时刻可恢复的持久化表示，两者都不应等同于进程内全局变量。父 Agent 创建子任务时传入最小上下文和独立命名空间；子任务返回结构化产物，由父节点合并。并行写同一字段时，使用追加事件、集合并集、带版本 compare-and-set 或业务 reducer。

失败至少分四类：瞬时网络错误可有限重试；参数错误回到规划或人工修正；权限拒绝不得重试绕过；已有副作用但响应丢失时先用幂等键查询执行结果。Checkpoint 还应记录模型、Prompt、Tool 版本和关键配置，否则“恢复”可能在新配置下走出另一条路径。

**代码 / 场景：**

~~~text
run-42
  plan
   ├─ research / namespace=run-42:research
   └─ verify   / namespace=run-42:verify
  join(reducer: citations 去重 + conflicts 显式保留)
  await_approval(version=7)
  publish(idempotencyKey=run-42:publish:v7)
~~~

research 超时只重试 research；verify 已完成的结果从 Checkpoint 恢复。用户确认后若状态已从 version 7 变为 8，旧确认失效并重新展示影响范围，避免批准对象被替换。

**递进追问：**

1. **Checkpoint 越频繁越好吗？**

   不是。频繁持久化增加延迟和存储；应放在昂贵步骤后、人工确认前、外部副作用前后和可恢复边界上，并通过故障注入验证恢复点。
2. **子 Agent 能否共享同一个 Memory？**

   可以共享经过授权的只读事实或显式共享区，但会话草稿、工具凭据和临时推理不应默认广播。共享内容要有范围、版本、来源和清理策略。
3. **怎样证明重试没有重复执行？**

   对写 Tool 使用业务幂等键和执行表；测试“服务端成功但响应丢失”场景，重试后应读取同一执行结果，而不是创建第二次副作用。

**易错点：**

- 不要把所有状态塞进一个可变 Map，并让多个 Agent 任意覆盖。
- 不要把异常全部归为“再问一次模型”；权限和确定性参数错误不会因此消失。
- 不要只保存对话文本却遗漏节点位置、Tool 结果和配置版本。
- 不要在恢复后自动执行旧的人工确认，确认必须绑定具体版本与影响范围。

**参考来源：**

- [社区题源｜小红书：淘天 AI Agent 一面](https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb)
- [社区题源｜牛客：第四范式 Agent 实习面试](https://www.nowcoder.com/feed/main/detail/77a81a03b55143c89d1caf76833676d9)
- [官方校验｜LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [官方校验｜OpenAI Agents SDK：Human in the loop](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)

# 实时通信可靠性与攻击防护

## Q81：SSE / WebSocket 长连接怎样鉴权，断线后如何避免重连风暴？
**短回答：**

牛客公开面经真实问到了 SSE / WebSocket 选型、长连接为何失效、如何鉴权，以及为什么使用指数退避而不是固定重连。可靠方案包含五层：

1. 建连前完成身份认证，订阅或每条消息继续做资源级授权；连接成功不等于永久拥有所有操作权限。
2. 用心跳发现半开连接，并让心跳间隔小于链路中最短的空闲超时。
3. 断线后采用有上限的指数退避、随机抖动和总重试预算；401、403、协议错误不自动重试。
4. 重连携带 runId、事件游标或序号，服务端去重并从可重放窗口续发，避免重复启动模型或重复写操作。
5. 页面隐藏、网络切换和服务发布时只允许一个重连调度器运行，旧连接、定时器和监听器全部清理。

**原理：**

连接可能被浏览器休眠、移动网络切换、Nginx / 网关空闲超时、服务重启或中间 NAT 回收。固定间隔重试会让大量客户端在同一时刻再次冲击服务；指数退避降低频率，jitter 打散请求，但必须设置最大延迟和总时长。

原生 EventSource 主要使用 GET，不能随意设置 Authorization Header；可使用安全 Cookie、先创建一次性订阅票据再 GET，或改用 fetch 流。票据应短期、一次性并绑定用户、订阅目标与来源，不能把长期 Token 放进 URL、日志和 Referer。WebSocket 建连时校验身份与 Origin，握手后仍按消息类型和资源做授权。

**代码 / 场景：**

~~~text
POST /runs              -> 创建 runId（幂等）
GET  /runs/42/events    -> SSE，携带短期订阅凭据
断线 lastEventId=107
等待 min(cap, base * 2^attempt) + jitter
GET  /runs/42/events    -> 从 108 续发；不重新创建 run
~~~

若服务端返回 401 / 403，客户端停止自动重试并要求重新登录；若事件游标已过期，先拉取 run 快照再继续，而不是把新旧片段盲目拼接。

**递进追问：**

1. **心跳能替代业务消息确认吗？**

   不能。心跳只证明双方在某个时刻还能收发链路级数据，不证明某条业务消息已通过校验、持久化或完成副作用；ACK 还可能丢失，发送方重试会造成重复投递。每条业务事件应有 eventId/seq，消费端以幂等键提交并返回明确 ACK，重连后按游标补发；对扣款等关键动作还要查询权威状态。通过丢 ACK、重复事件和断线重连测试，验证结果只生效一次。
2. **为什么 jitter 仍需重试预算？**

   jitter 只打散时间，不能阻止永久故障下的无限请求。预算耗尽后应进入手动恢复或较低频探测。
3. **SSE 自动重连是否一定无损？**

   不一定。服务端必须保存可重放窗口并正确处理 Last-Event-ID；超出窗口时返回快照恢复策略，否则只能重新开始。

**易错点：**

- 不要把 Token 长期放在 EventSource URL 查询参数中。
- 不要对 401、403、参数错误和协议错误无限重试。
- 不要在重连时重新创建生成任务，导致重复计费或副作用。
- 不要只清理连接却遗漏重连定时器和网络、可见性监听器。

**参考来源：**

- [社区题源｜牛客：字节前端 SSE / WebSocket 追问](https://www.nowcoder.com/discuss/888046680824639488)
- [社区题源｜牛客：网易互娱 SSE、长连接与鉴权](https://www.nowcoder.com/feed/main/detail/fcdbf2d6868347bc8256068c60dd70a0)
- [社区题源｜牛客：Shopee WebSocket 心跳、重连与 JWT](https://www.nowcoder.com/feed/main/detail/e82a37ee238f4157af6e6c2d33fb31eb)
- [官方校验｜MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [官方校验｜Nginx：proxy read timeout](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [官方校验｜AWS：Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

## Q82：WebSocket 如何防御 CSWSH、消息洪泛和连接耗尽？
**短回答：**

这道题明确标为：由真实面经中的“WebSocket 如何鉴权、心跳与重连”延伸出的工程安全追问，不冒充社区原题原句。

- **跨站握手**：使用 WSS，严格等值校验 Origin allowlist；Cookie 会被浏览器自动带上时，要防跨站 WebSocket 劫持（CSWSH）。
- **授权绕过**：握手认证后，每条消息仍校验 action、目标资源和当前会话；退出、封禁或 Token 过期时主动断开。
- **资源耗尽**：设置全局、租户、用户和 IP 连接上限，握手与消息分别限流，并设置空闲与最大生命周期。
- **消息攻击**：只接受明确 schema，限制单帧、分片重组后完整消息和队列大小；持续超限直接关闭。
- **慢消费者**：监控发送缓冲和有界队列，合并非关键 delta；长期积压时取消上游或断开，不能无限占内存。
- **内容注入**：收到的文本和流式 AI 内容均按不可信数据处理，安全渲染 Markdown，禁止 eval 和原始危险 HTML。

**原理：**

CSWSH 类似针对 WebSocket 握手的跨站请求利用：恶意页面可能借受害者 Cookie 建连并读写数据。WebSocket 不依赖普通 CORS 预检作为安全边界，所以服务端要校验 Origin；但 Origin 也不能替代身份认证和消息级授权，因为非浏览器客户端可自行构造请求。

DoS 不只来自连接数。攻击者还可以频繁握手、发送超大分片消息、制造压缩放大、让服务端为未授权连接提前分配昂贵资源，或作为慢消费者让发送队列不断增长。防护要在昂贵操作之前完成认证、大小检查和配额判断。

**代码 / 场景：**

~~~text
Upgrade 请求
  -> WSS + Origin 精确白名单
  -> 认证会话 / 一次性票据
  -> 用户与 IP 连接配额
  -> 建连
每条消息
  -> 最大尺寸 -> JSON Schema -> action / resource 授权 -> 速率限制
发送侧
  -> 有界队列 -> 高水位降级 -> 持续积压则关闭并取消上游
~~~

关闭连接时使用明确的业务错误码，但发给客户端的信息保持最小；安全日志记录用户、来源、动作和拒绝原因，不写入 Token、Cookie 或完整敏感消息。

**递进追问：**

1. **为什么只校验 Origin 仍不安全？**

   Origin 主要约束浏览器跨站场景，脚本客户端可伪造；服务端仍需认证、资源级授权、速率限制和审计。
2. **经典 WebSocket API 的 bufferedAmount 能做什么？**

   它能提示客户端发送缓冲积压，可用于暂停非关键发送或断开；服务端还必须有自己的有界队列和慢消费者策略，不能只依赖浏览器指标。
3. **握手成功后用户退出登录怎么办？**

   服务端维护会话到连接的映射，注销或撤销时关闭相关连接；长连接也要周期性检查会话有效性，不能只在握手时验证一次。

**易错点：**

- 不要说“配置了 CORS 就能防 CSWSH”；WebSocket 握手必须单独校验 Origin。
- 不要只限制单帧大小而忽略分片重组后的完整消息。
- 不要在认证前创建模型任务、数据库订阅或大缓冲区。
- 不要把未消毒的流式片段直接写入 innerHTML。

**参考来源：**

- [社区题源｜牛客：WebSocket 如何鉴权](https://www.nowcoder.com/discuss/comment/14201373)
- [社区题源｜牛客：Shopee WebSocket、JWT、XSS 与 CSRF](https://www.nowcoder.com/feed/main/detail/e82a37ee238f4157af6e6c2d33fb31eb)
- [工程安全延伸｜CSDN：WebSocket 握手、消息鉴权与限流](https://blog.csdn.net/jam_yin/article/details/154494892)
- [官方校验｜OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [官方校验｜RFC 6455](https://www.rfc-editor.org/rfc/rfc6455.html)
- [官方校验｜MDN：WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
