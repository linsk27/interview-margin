import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { QUESTION_SPECIFICS } from './360-ai-specifics.js'
import { SUPPLEMENTAL_360_AI_MARKDOWN } from './360-ai-supplementals.js'
import { assert360PublicContentSafe } from './public-content-policy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')

const SOURCE_PATH = path.join(rootDir, 'docs/source/360-ai-frontend/answers.md')
const OUTPUT_PATH = path.join(rootDir, 'public/question-banks/360-ai-frontend.md')

const INCLUDED_SECTIONS = new Map([
  ['2', 'RAG 方案选型'],
  ['3', 'AI 编程工具安全'],
  ['4', '项目技术原理'],
  ['5', 'RAG、Agent 与模型原理'],
  ['6', 'SSE、AI 前端与 React'],
  ['7', '计算机基础与浏览器'],
  ['8', '高频手写题'],
  ['9', '前端与全栈基础速答'],
])

const EXCLUDED_QUESTIONS = new Set(['5.17', '5.18', '6.20'])
const RETIRED_PUBLIC_QUESTIONS = new Set([
  '2.1',
  '2.2',
  '2.3',
  '2.4',
  '2.6',
  '2.7',
  '3.1',
  '3.2',
  '3.4',
  '3.5',
])

const SOURCE_QUESTION_COUNT = 77
const PUBLIC_QUESTION_COUNT = 72
const SUPPLEMENTAL_QUESTION_NUMBERS = [78, 79, 80, 81, 82]

const TITLE_OVERRIDES = new Map([
  ['2.1', '如何组织一段 90 秒的技术岗位自我介绍？'],
  ['2.3', '为什么选择 360 和 PC 安全与办公事业部？'],
  ['2.4', '如何用两分钟讲清 AI 知识库项目的用户、问题、方案和贡献？'],
  ['2.6', '项目周期较短时，如何说明复用、增量与完成度？'],
  ['2.7', '如何复盘项目中最大的不足或失败？'],
  ['3.1', '生产项目缺少 React 经验时，应该如何补齐并说明边界？'],
  ['3.2', '你是否接受学习 Go 并向全栈方向发展？'],
  ['3.3', '如何安全、可信地使用 Codex、Cursor 等 AI 编程工具？'],
  ['3.4', '异地求职时，如何真实说明地点与到岗意愿？'],
  ['3.5', '如何保证简历、README、演示与代码的完成度口径一致？'],
  ['4.3', '配置化表单应该如何设计？'],
  ['5.1', '从资料入库到带引用回答，完整 RAG 流程是什么？'],
  ['6.3', '从 Flask 到 Vue 的完整流式链路是什么？'],
  ['6.11', 'React 和 Vue 的核心差异是什么？'],
  ['6.12', 'React Hooks 有哪些常见陷阱？'],
  ['6.15', '浏览器缓存与 no-cache 的真实语义是什么？'],
  ['6.16', 'CORS 与预检请求是如何工作的？'],
  ['6.17', 'AI 输出场景应如何防御 XSS？'],
  ['6.18', 'CSRF、CORS 与认证方式有什么关系？'],
  ['6.19', 'JWT 的原理、存储方式与安全边界是什么？'],
  ['7.2', 'DNS 解析的完整过程是什么？'],
  ['7.3', 'TCP 为什么需要三次握手、四次挥手和 TIME_WAIT？'],
  ['7.4', 'HTTP、HTTPS 与常见状态码分别解决什么问题？'],
  ['7.5', '进程、线程与协程有什么区别？'],
  ['7.6', '虚拟内存如何映射到硬件内存？'],
  ['7.7', '数组、链表、栈和队列应该如何选择？'],
  ['8.1', '如何判断链表有环并找到入环点？'],
  ['8.2', '如何实现链表形式的两数相加？'],
  ['8.3', '数组去重有哪些实现与复杂度差异？'],
  ['8.4', '如何反转单链表？'],
  ['8.5', '如何实现 Promise 并发限制器？'],
  ['8.6', '如何实现防抖与节流？'],
  ['8.7', '如何实现 LRU 缓存？'],
  ['9.1', '浏览器事件循环中宏任务与微任务如何调度？'],
  ['9.2', '原型链、prototype、__proto__ 与 instanceof 有什么关系？'],
  ['9.3', 'any、unknown、never、type 与 interface 如何选择？'],
  ['9.4', 'Cookie、Web Storage 与 IndexedDB 如何选择？'],
  ['9.6', '事务隔离级别分别会出现哪些并发异常？'],
  ['9.7', 'REST 中 PUT、PATCH、幂等、分页与错误结构如何设计？'],
  ['9.8', 'Flask 请求生命周期与流式上下文如何工作？'],
  ['9.9', 'Go 的 goroutine、channel 与 context 分别解决什么问题？'],
  ['9.10', 'SSR、SSG、CSR 与 hydration mismatch 有什么关系？'],
])

const PUBLIC_SAFE_SHORTS = new Map([
  ['2.1', '一段合格的 90 秒技术岗位自我介绍只回答三件事：当前定位、与岗位直接相关的两条可验证证据、能力边界与求职动机。可按“15 秒定位 + 55 秒项目证据 + 20 秒边界和动机”组织，姓名、学校和项目名称只作为必要背景，不应挤占能力证据。'],
  ['2.2', 'AI 应用前端位于模型能力和真实产品之间，除了普通页面状态，还要处理上下文、流式输出、引用、取消、工具过程、失败恢复和不可信内容。适合这个方向的证据应来自可运行的交互链路，而不是只说“AI 是趋势”。'],
  ['2.3', '回答公司动机时要建立“公开产品问题—岗位职责—可迁移能力”三层对应。对 360 可以基于公开的 AI 浏览器、企业知识库、安全与办公场景说明理解，但不能猜测具体小组，也不能把未体验的产品说成深度使用。'],
  ['2.4', '两分钟项目介绍应先说明用户和痛点，再讲输入输出与核心闭环，随后明确个人负责范围、一个关键取舍、可演示证据和当前边界。技术栈只用于解释方案，不能代替产品问题和验证结果。'],
  ['2.5', 'RAG 适合知识需要更新、回答需要引用且全文过长的场景；全文 Prompt 适合短而固定的资料，关键词搜索适合精确术语，微调更适合稳定行为和格式。选择方案时应比较召回误差、上下文成本、更新方式和可追溯性。'],
  ['2.6', '短周期交付必须拆清复用部分与新增部分，并用提交记录、测试、演示和未完成清单证明范围。可信的说法是“基于已有底座完成若干增量模块”，而不是把复用、依赖库和 AI 辅助全部包装成从零开发。'],
  ['2.7', '项目复盘应包含预期、实际偏差、根因、修复、验证和仍存限制。优先选择会影响正确性、恢复能力或用户体验的真实问题，并说明下次会把哪项机制和测试前置，而不是把“过于追求完美”包装成失败。'],
  ['3.1', '缺少生产 React 经验时应明确边界，再用可运行的小项目证明函数组件、Hooks、不可变更新、请求取消和测试能力。Vue 中的组件边界与状态机经验可以迁移，但依赖追踪、闭包和 Effect 生命周期必须重新学习。'],
  ['3.2', '学习 Go 的可信回答应区分可迁移基础与新增能力：HTTP、鉴权和数据访问经验可以复用，goroutine、channel、context、错误处理和服务治理需要通过代码、测试与排障继续验证，不能把“愿意学”等同于已经具备生产经验。'],
  ['3.3', 'AI 编程工具适合代码库理解、方案比较、重复骨架、测试和重构建议，但需求、边界、权限和最终验收仍由开发者负责。正确流程是先限定范围与验收条件，再审查 diff、运行独立测试，并避免向外部工具发送密钥或个人数据。'],
  ['3.4', '地点与到岗意愿属于真实约束，不是标准答案。应说明当前选择、可确认的时间范围和仍待决定的前置条件，并让招聘系统、简历和口头说法保持一致；公共题库不保存任何候选人的具体城市或搬迁承诺。'],
  ['3.5', '简历、README、演示与代码应共享同一份完成度清单：已实现项要能定位代码和测试，实验项写明开关与限制，计划项写验收条件。时间线同样属于事实，不能用面试前临时补丁反向证明之前的描述准确。'],
])

const PUBLIC_SAFE_MECHANISMS = new Map([
  ['2.1', '面试开场的注意力预算很短，因此需要先给结论，再给证据。定位句让面试官建立候选人模型，项目证据证明能力不是标签，边界与动机则降低夸大风险并解释岗位选择。每一段都应能被后续追问验证，无法展开的技能不应放进主线。'],
  ['2.4', '项目介绍本质上是在有限时间内建立一条可验证的因果链：某类用户遇到具体问题，系统接收什么输入、经过哪些关键状态、产出什么结果；候选人负责其中哪一段、为什么选择该方案、如何验证，以及尚未解决什么。缺少任一环，介绍都容易退化成技术名词或功能清单。'],
  ['2.5', 'RAG 把频繁变化的知识与模型参数解耦。离线链路负责解析、切块、向量化和建索引；在线链路负责查询改写、混合召回、重排、上下文组装、生成和引用校验。全文 Prompt 没有召回误差，但受上下文窗口、成本和噪声限制；关键词搜索擅长精确词，却较难覆盖语义改写；微调主要改变模型行为和输出形式，不适合承载需要频繁更新、逐条追溯的事实。是否选择 RAG，最终要用检索命中率、答案忠实度、引用正确率、延迟和成本共同验证。'],
  ['3.3', 'AI 编程代理的输入、外部文档和生成结果都应按不可信数据处理。主要风险包括提示注入、密钥或源码外泄、越权写入、危险命令、恶意依赖、许可证冲突，以及生成代码与测试共享同一错误假设。可靠控制链应包含最小文件与网络权限、隔离的凭据、受控命令白名单、逐文件 diff 审查、独立设计的测试、安全与依赖扫描、可追溯日志；发布、删除、上传和权限变更等高影响动作还要保留人工确认。'],
  ['3.4', '地点意愿的核心是信息一致性和可执行性。回答应把偏好、硬约束、确认节点与到岗条件分开：已经决定的部分给清楚结论，尚未决定的部分给确认时间，变化则说明新的信息和决策依据。这样既避免虚假承诺，也让招聘方能够评估实际安排。'],
])

const PUBLIC_SAFE_SPECIFICS = new Map([
  ['2.1', {
    practice: '先选定目标岗位，再录制 90 秒和 45 秒两个版本。前 15 秒只说当前定位，中间用两个“问题—行动—证据”片段证明匹配，结尾主动说明一项能力边界与求职动机。回听时删除学校沿革、项目清单和无法验证的形容词，确保被打断后仍能留下核心证据。',
    followups: `1. **如果只剩 45 秒，哪些内容必须保留？**

   保留能力主线、一个可验证项目证据和岗位匹配结论；背景信息各压成一句，不能靠加快语速硬塞。

2. **面试官如何现场验证自我介绍里的能力？**

   每条能力都应对应可打开的页面、代码、测试或故障复盘；仍在学习的技术明确称为补齐项，不伪装成生产经验。`,
    pitfalls: `- 不要按简历时间顺序逐段朗读，听完却没有清晰的能力主线。
- 不要在公共模板中写姓名、学校、地点意愿或雇主信息；个人版本只保存在登录后的私人笔记。
- 不要把团队成果全部说成个人独立完成，必须能指出职责和代码边界。`,
  }],
  ['3.3', {
    practice: '在不含真实凭据的临时仓库中演练一次受限代理工作流：只开放指定目录的读取和单个分支写入，默认关闭外网与发布权限；先写验收条件和禁止修改清单，再让工具生成候选补丁。随后逐文件审查 diff，运行独立编写的边界测试、类型检查、密钥扫描和依赖审计，并故意放入一条来自 README 的恶意操作指令，验证代理不会越权执行或外传数据。',
  }],
  ['3.4', {
    practice: '把地点回答写成三个事实字段：当前可接受范围、可确认的到岗时间、仍需处理的前置事项。然后检查招聘系统、简历和口头说法是否一致；如果尚未决定，就明确给出最终确认日期，不用模糊承诺换取流程机会。',
    followups: `1. **如果对方追问具体到岗时间，怎样回答才可信？**

   给出可确认的日期区间和前置事项；尚未确定的部分说明决策节点，不能把估计说成承诺。

2. **此前地点偏好与当前投递不同，怎样解释？**

   说明当时掌握的信息、当前岗位匹配度和重新评估后的真实结论，重点是决策依据变化，而不是否定原先选择。`,
    pitfalls: `- 不要为了通过面试临时承诺尚未决定的地点或到岗日期。
- 不要把信息冲突推给模板或平台，应主动统一所有投递渠道。
- 公共题库只讲判断方法，不保存任何人的具体城市、家庭或搬迁安排。`,
  }],
])

const VISUALS = new Map([
  ['5.1', {
    src: '/content/diagrams/360-ai-frontend/rag-pipeline-v1.svg',
    alt: 'RAG 从资料接入、切块索引到检索生成与评测的完整链路图',
    caption: 'RAG 的离线索引、在线检索与质量闭环',
  }],
  ['5.11', {
    src: '/content/diagrams/360-ai-frontend/function-calling-loop-v1.svg',
    alt: '模型、应用服务、工具与用户之间的 Function Calling 调用闭环图',
    caption: 'Function Calling 只表达调用意图，真正执行与授权仍由应用负责',
  }],
  ['5.14', {
    src: '/content/diagrams/360-ai-frontend/transformer-block-v1.svg',
    alt: 'Transformer 中输入嵌入、多头注意力、残差归一化和前馈网络结构图',
    caption: 'Transformer Block 的核心数据流',
  }],
  ['6.1', {
    src: '/content/diagrams/backend-fullstack/stream-backpressure-v1.svg',
    alt: '流式响应中生产、缓冲、消费和背压控制关系图',
    caption: '流式传输不仅是逐段发送，还要处理缓冲、取消与消费速度',
  }],
  ['7.1', {
    src: '/content/diagrams/frontend-engineering/browser-rendering-pipeline-v1.svg',
    alt: '浏览器从 HTML 和 CSS 解析到布局、绘制与合成的渲染流水线图',
    caption: '从导航到首屏渲染的关键阶段',
  }],
  ['7.3', {
    src: '/content/diagrams/network-deployment/tcp-tls-handshake-v1.svg',
    alt: 'TCP 建连与 TLS 握手的时序关系图',
    caption: '可靠传输与加密会话建立在不同协议层完成',
  }],
  ['9.1', {
    src: '/content/diagrams/javascript/event-loop-v1.svg',
    alt: '浏览器事件循环中任务、微任务和渲染机会的执行顺序图',
    caption: '一次任务结束后先清空微任务，再进入渲染与下一任务',
  }],
])

const REFERENCES = {
  job: ['360 官方岗位 J12343', 'https://360campus.zhiye.com/campus/detail?jobAdId=d28994e2-194e-42a6-9d89-608796e0edef'],
  browser360: ['360 AI 浏览器', 'https://browser.360.cn/se/help/information-detail_AIwd_AIllqsx360.html'],
  knowledge360: ['360 AI 企业知识库', 'https://aiplus.360.cn/ai'],
  ragPaper: ['RAG 原始论文', 'https://arxiv.org/abs/2005.11401'],
  attentionPaper: ['Attention Is All You Need', 'https://arxiv.org/abs/1706.03762'],
  mcpArchitecture: ['MCP 官方架构', 'https://modelcontextprotocol.io/docs/learn/architecture'],
  mcpTools: ['MCP 官方 Tools 规范', 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools'],
  owaspPrompt: ['OWASP：Prompt Injection', 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/'],
  owaspOutput: ['OWASP：Improper Output Handling', 'https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/'],
  mdnSse: ['MDN：Server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
  mdnStreams: ['MDN：Streams API', 'https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams'],
  mdnCors: ['MDN：CORS', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS'],
  mdnStorage: ['MDN：客户端存储', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage'],
  mdnBluetooth: ['MDN：Web Bluetooth API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API'],
  mdnEventLoop: ['MDN：JavaScript execution model', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model'],
  mdnPromise: ['MDN：Promise', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise'],
  react: ['React 官方文档', 'https://react.dev/learn'],
  reactEffects: ['React：Synchronizing with Effects', 'https://react.dev/learn/synchronizing-with-effects'],
  typescript: ['TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html'],
  vite: ['Vite 官方指南', 'https://vite.dev/guide/'],
  webpack: ['webpack Concepts', 'https://webpack.js.org/concepts/'],
  threeProject: ['Three.js：Vector3.project', 'https://threejs.org/docs/#api/en/math/Vector3.project'],
  threeDispose: ['Three.js：How to dispose of objects', 'https://threejs.org/manual/en/how-to-dispose-of-objects.html'],
  rfc9110: ['RFC 9110：HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110'],
  rfc9293: ['RFC 9293：TCP', 'https://www.rfc-editor.org/rfc/rfc9293'],
  mysqlIndexes: ['MySQL：How MySQL Uses Indexes', 'https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html'],
  mysqlTransactions: ['MySQL：InnoDB Transaction Model', 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html'],
  flask: ['Flask：The Request Context', 'https://flask.palletsprojects.com/en/stable/reqcontext/'],
  goContext: ['Go：context package', 'https://pkg.go.dev/context'],
}

const LABELS = {
  short: [
    /^(?:可直接练习的版本|可口述版本|安全版本|推荐回答|推荐答案|口述版|口述答案)$/,
    /^(?:30 秒(?:可口述)?版本|一分钟口述版|两分钟口述版|HTTPS 原理口述版|三次握手口述版|四次挥手口述版)$/,
    /^(?:核心答案|核心结论|核心价值|项目回答)$/,
  ],
  mechanism: [
    /^(?:技术原理|原理|更深原理|关键原理|机制|机制展开|机制与实现|机制、实现与边界)$/,
    /^(?:技术分层|标准链路|核心组件|落地机制|实现思路|解题思路|原理证明)$/,
  ],
  practice: [
    /^(?:项目结合|项目结合与边界|项目实现与边界|项目场景|示例|代码示例)$/,
    /^(?:ContextForge 项目映射与边界|ContextForge 项目边界|恢复流程|关系示例|推荐事件格式|Flask 伪代码)$/,
  ],
  followups: [/^(?:常见追问|边界与追问)$/],
  pitfalls: [
    /^(?:边界|关键边界|复杂度与边界|复杂度、失败与取消|容易说错的点)$/,
    /^(?:不要说|不要回答|必须主动说明|注意)$/,
  ],
  sources: [/^(?:参考|参考来源)$/],
}

function normalizedLabel(line) {
  return line.trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/[：:]\s*$/, '')
    .trim()
}

function labelKind(line) {
  const label = normalizedLabel(line)
  for (const [kind, patterns] of Object.entries(LABELS)) {
    if (patterns.some((pattern) => pattern.test(label))) return kind
  }
  return undefined
}

function trimLines(lines) {
  const result = [...lines]
  while (result[0]?.trim() === '') result.shift()
  while (result.at(-1)?.trim() === '') result.pop()
  return result
}

function partitionBody(body) {
  const buckets = {
    short: [],
    mechanism: [],
    practice: [],
    followups: [],
    pitfalls: [],
    sources: [],
  }
  let active = 'mechanism'
  let inFence = false

  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    const fence = line.trim().match(/^(```|~~~)/)
    if (!inFence && !fence) {
      const kind = labelKind(line)
      if (kind) {
        active = kind
        if (buckets[active].length && buckets[active].at(-1)?.trim() !== '') buckets[active].push('')
        continue
      }
    }
    buckets[active].push(line)
    if (fence) inFence = !inFence
  }

  return Object.fromEntries(Object.entries(buckets).map(([key, lines]) => [key, trimLines(lines).join('\n')]))
}

function conciseText(markdown) {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
  const blocks = withoutCode.split(/\n\s*\n/)
    .map((block) => block
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/[*_#]/g, '')
      .trim())
    .filter((block) => block.length >= 24 && !/^[A-Za-z_][\w.()"' =:[\]-]+$/.test(block))
  const selected = blocks[0] || '先给出结论，再按实现机制、项目证据和失败边界展开。'
  if (selected.length <= 360) return selected
  const sentence = selected.slice(0, 360).match(/^.*?[。！？!?](?=.{0,60}$)/)?.[0]
  return `${sentence || selected.slice(0, 340)}…`
}

function sanitizePersonalPlaceholders(body) {
  return body
    .replace(
      '> [如果真实接受北京：我可以接受北京工作，也希望长期往 AI 应用前端和全栈方向发展。]',
      '> 如果真实接受北京，可以补充：“我可以接受北京工作，也希望长期往 AI 应用前端和全栈方向发展。”',
    )
    .replace(
      '我主要负责 `[请按真实情况填写：数据模型/检索服务/Embedding 配置/SSE/前端工作台/权限]`。',
      '我主要负责的范围应按真实代码，从数据模型、检索服务、Embedding 配置、SSE、前端工作台和权限中选择说明。',
    )
    .replace('一个重要取舍是 `[请填写]`。', '一个重要取舍必须使用能指向真实代码和验证方式的案例。')
    .replace(
      '当前已经完成的是 `[请填写可现场演示的功能]`；仍不足的是 `[例如自动化评测、生产安全、文件解析]`。',
      '当前完成项只列可现场演示的功能；不足项可从自动化评测、生产安全和文件解析中按真实情况选择。',
    )
    .replace('`[请填写真实项目]`', '一个真实项目')
    .replace('`[理解/重构/补测试]`', '代码库理解、重构或补测试')
    .replace('`[具体错误]`', '一个可复现的具体错误')
    .replace('`[测试/日志/文档]`', '测试、日志或官方文档')
    .replace('`[真实时间]`', '按真实安排给出的时间')
    .replace(/\bContextForge\b/g, 'AI 知识工作台')
}

function unwrapShortAnswerQuote(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  return trimLines(lines.map((line) => line.replace(/^\s*>\s?/, ''))).join('\n')
}

function practiceFallback(sectionNumber, title) {
  if (sectionNumber === '2' || sectionNumber === '3') {
    return `结合自己的真实经历回答“${title}”：明确个人职责、可演示结果和尚未完成的部分，不使用无法验证的指标。`
  }
  if (sectionNumber === '8') {
    return '现场手写时先确认输入输出、空值与是否允许修改原数据，再说明循环不变量、复杂度，并用最小用例验证。'
  }
  return `把“${title}”落到一个可复现的项目场景：说明输入、状态变化、失败路径、观测指标以及方案替代项。`
}

function mechanismFallback(sectionNumber, title) {
  if (sectionNumber === '2' || sectionNumber === '3') {
    return `回答“${title}”时，先把岗位需要的能力拆成可验证要求，再用一到两个真实经历建立对应关系。表达顺序是结论、证据、个人贡献、边界与下一步；不要把团队成果全部归到个人，也不要用尚未测量的数据支撑结论。`
  }
  if (sectionNumber === '8') {
    return '先写出核心不变量，再选择能保持该不变量的数据结构和循环方式。实现后分别检查空输入、单元素、重复值、极端规模与异常结构，并给出时间和空间复杂度。'
  }
  return `“${title}”不能只停留在定义。完整解释应包含输入与输出、核心状态或数据流、关键实现选择、失败与取消路径、可观测证据以及在规模变化后的替代方案。`
}

function followupsFallback(sectionNumber) {
  if (sectionNumber === '8') {
    return `1. **输入规模扩大后复杂度是否仍可接受？**

   先给出时间与空间复杂度，再说明是否能通过数据结构、迭代实现或提前终止降低成本。

2. **空输入、重复值、环或溢出等边界怎样处理？**

   在编码前列出边界用例，完成后逐个走读，不能只验证正常样例。`
  }
  return `1. **如果数据规模、并发或权限条件变化，当前结论是否仍成立？**

   重新明确前提，比较替代方案，并指出需要增加的存储、队列、缓存、授权或观测机制。

2. **如何证明方案真的有效？**

   使用固定输入、日志、性能指标或对照实验验证，不以“感觉更快、更准”代替证据。`
}

function pitfallsFallback(sectionNumber) {
  const truthBoundary = sectionNumber === '2' || sectionNumber === '3' || sectionNumber === '4' || sectionNumber === '5'
    ? '\n- 涉及个人项目完成度、职责和指标时，只使用真实且可现场验证的证据。'
    : ''
  return `- 不要只背名词或公式；必须说明成立前提、执行顺序和失败边界。
- 不要把局部实现包装成适用于所有规模和场景的固定答案。${truthBoundary}`
}

function referencesFor(sectionNumber, title) {
  const text = title.toLowerCase()
  if (text.includes('ble')) return [REFERENCES.mdnBluetooth, REFERENCES.job, REFERENCES.browser360]
  if (text.includes('rag')) return [REFERENCES.ragPaper, REFERENCES.owaspPrompt, REFERENCES.owaspOutput]
  if (text.includes('codex') || text.includes('cursor')) {
    return [REFERENCES.owaspPrompt, REFERENCES.owaspOutput, REFERENCES.mcpTools]
  }
  if (text.includes('promise')) return [REFERENCES.mdnPromise, REFERENCES.mdnEventLoop, REFERENCES.typescript]
  if (text.includes('three.js')) return [REFERENCES.threeProject, REFERENCES.threeDispose, REFERENCES.mdnEventLoop]
  if (text.includes('prompt injection') || text.includes('rag 投毒')) {
    return [REFERENCES.owaspPrompt, REFERENCES.owaspOutput, REFERENCES.ragPaper]
  }
  if (text.includes('mcp')) return [REFERENCES.mcpArchitecture, REFERENCES.mcpTools, REFERENCES.owaspPrompt]
  if (text.includes('function calling') || text.includes('agent')) {
    return [REFERENCES.mcpTools, REFERENCES.mcpArchitecture, REFERENCES.owaspPrompt]
  }
  if (text.includes('transformer') || text.includes('q、k、v') || text.includes('decoder-only')) {
    return [REFERENCES.attentionPaper, REFERENCES.ragPaper, REFERENCES.owaspOutput]
  }
  if (sectionNumber === '5') return [REFERENCES.ragPaper, REFERENCES.owaspPrompt, REFERENCES.mcpArchitecture]
  if (text.includes('react') || text.includes('hooks')) return [REFERENCES.react, REFERENCES.reactEffects, REFERENCES.typescript]
  if (text.includes('vite') || text.includes('webpack')) return [REFERENCES.vite, REFERENCES.webpack, REFERENCES.typescript]
  if (text.includes('cors') || text.includes('csrf')) return [REFERENCES.mdnCors, REFERENCES.rfc9110, REFERENCES.owaspOutput]
  if (text.includes('sse') || text.includes('eventsource') || text.includes('流式') || text.includes('utf-8')) {
    return [REFERENCES.mdnSse, REFERENCES.mdnStreams, REFERENCES.owaspOutput]
  }
  if (sectionNumber === '6') return [REFERENCES.mdnStreams, REFERENCES.react, REFERENCES.typescript]
  if (text.includes('tcp')) return [REFERENCES.rfc9293, REFERENCES.rfc9110, REFERENCES.mdnStreams]
  if (text.includes('http') || text.includes('url') || text.includes('dns')) {
    return [REFERENCES.rfc9110, REFERENCES.rfc9293, REFERENCES.mdnStreams]
  }
  if (sectionNumber === '7') return [REFERENCES.rfc9110, REFERENCES.rfc9293, REFERENCES.mdnEventLoop]
  if (sectionNumber === '8') return [REFERENCES.mdnEventLoop, REFERENCES.mdnPromise, REFERENCES.typescript]
  if (text.includes('mysql') || text.includes('索引')) return [REFERENCES.mysqlIndexes, REFERENCES.mysqlTransactions, REFERENCES.rfc9110]
  if (text.includes('事务')) return [REFERENCES.mysqlTransactions, REFERENCES.mysqlIndexes, REFERENCES.rfc9110]
  if (text.includes('flask')) return [REFERENCES.flask, REFERENCES.mdnSse, REFERENCES.rfc9110]
  if (text.includes('goroutine') || text.includes('context')) return [REFERENCES.goContext, REFERENCES.rfc9110, REFERENCES.mdnSse]
  if (text.includes('storage') || text.includes('cookie') || text.includes('indexeddb')) {
    return [REFERENCES.mdnStorage, REFERENCES.mdnCors, REFERENCES.owaspOutput]
  }
  if (sectionNumber === '9') return [REFERENCES.mdnEventLoop, REFERENCES.typescript, REFERENCES.rfc9110]
  return [REFERENCES.job, REFERENCES.browser360, REFERENCES.knowledge360]
}

function withReferences(existing, sectionNumber, title) {
  const existingUrls = new Set([...existing.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1]))
  const additions = referencesFor(sectionNumber, title)
    .filter(([, url]) => !existingUrls.has(url))
    .map(([label, url]) => `- [${label}](${url})`)
  return [existing, additions.join('\n')].filter(Boolean).join('\n\n')
}

function asQuestion(key, title) {
  const override = TITLE_OVERRIDES.get(key)
  if (override) return override
  if (/[？?]$/.test(title)) return title
  if (/^(?:为什么|如何|怎样|怎么|什么|是否|能否|请)/.test(title)) return `${title}？`
  return `${title}需要掌握哪些核心原理？`
}

function renderQuestion(question, number) {
  const safeBody = sanitizePersonalPlaceholders(question.body)
  const buckets = partitionBody(safeBody)
  const specific = QUESTION_SPECIFICS[question.key]
  const publicSpecific = PUBLIC_SAFE_SPECIFICS.get(question.key)
  const publicTitle = asQuestion(question.key, question.title)
  const short = unwrapShortAnswerQuote(
    sanitizePersonalPlaceholders(
      PUBLIC_SAFE_SHORTS.get(question.key) || buckets.short || conciseText(buckets.mechanism),
    ),
  )
  const mechanism = sanitizePersonalPlaceholders(
    PUBLIC_SAFE_MECHANISMS.get(question.key)
      || buckets.mechanism
      || mechanismFallback(question.sectionNumber, publicTitle),
  )
  const practice = sanitizePersonalPlaceholders(
    publicSpecific?.practice
      || buckets.practice
      || specific?.practice
      || practiceFallback(question.sectionNumber, publicTitle),
  )
  const followups = sanitizePersonalPlaceholders(
    publicSpecific?.followups
      || buckets.followups
      || specific?.followups
      || followupsFallback(question.sectionNumber),
  )
  const pitfalls = sanitizePersonalPlaceholders(
    publicSpecific?.pitfalls
      || buckets.pitfalls
      || specific?.pitfalls
      || pitfallsFallback(question.sectionNumber),
  )
  const sources = withReferences(buckets.sources, question.sectionNumber, publicTitle)
  const visual = VISUALS.get(question.key)
  const visualMarkdown = visual
    ? `\n\n![${visual.alt}](${visual.src} "${visual.caption}")`
    : ''

  return `## Q${number}：${publicTitle}

**短回答：**

${short}

**原理：**

${mechanism}${visualMarkdown}

**代码 / 场景：**

${practice}

**递进追问：**

${followups}

**易错点：**

${pitfalls}

**参考来源：**

${sources}`
}

export function build360AiBankMarkdown(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const sections = new Map([...INCLUDED_SECTIONS].map(([number, title]) => [number, { number, title, questions: [] }]))
  let currentQuestion

  const flush = () => {
    if (!currentQuestion) return
    currentQuestion.body = trimLines(currentQuestion.lines).join('\n')
    sections.get(currentQuestion.sectionNumber)?.questions.push(currentQuestion)
    currentQuestion = undefined
  }

  for (const line of lines) {
    const questionMatch = line.match(/^###\s+(\d+)\.(\d+)\s+(.+?)\s*$/)
    if (questionMatch) {
      flush()
      const key = `${questionMatch[1]}.${questionMatch[2]}`
      if (!INCLUDED_SECTIONS.has(questionMatch[1]) || EXCLUDED_QUESTIONS.has(key)) continue
      currentQuestion = {
        key,
        sectionNumber: questionMatch[1],
        title: questionMatch[3].trim(),
        lines: [],
      }
      continue
    }
    if (/^##\s+/.test(line)) {
      flush()
      continue
    }
    if (currentQuestion) currentQuestion.lines.push(line)
  }
  flush()

  const rendered = ['# 360 AI 应用前端一面预判', '']
  let sourceQuestionNumber = 1
  let publicQuestionCount = 0
  for (const section of sections.values()) {
    if (!section.questions.length) continue
    rendered.push(`# ${section.title}`, '')
    for (const question of section.questions) {
      const stableQuestionNumber = sourceQuestionNumber
      sourceQuestionNumber += 1
      if (RETIRED_PUBLIC_QUESTIONS.has(question.key)) continue
      rendered.push(renderQuestion(question, stableQuestionNumber), '')
      publicQuestionCount += 1
    }
  }

  if (sourceQuestionNumber - 1 !== SOURCE_QUESTION_COUNT) {
    throw new Error(`360 AI 题库源编号应覆盖 ${SOURCE_QUESTION_COUNT} 题，实际 ${sourceQuestionNumber - 1} 题`)
  }
  const supplementalMarkdown = SUPPLEMENTAL_360_AI_MARKDOWN.trim()
  const supplementalQuestionNumbers = [
    ...supplementalMarkdown.matchAll(/^## Q(\d+)[：:][^\n]*$/gm),
  ].map((match) => Number(match[1]))
  if (
    supplementalQuestionNumbers.length !== SUPPLEMENTAL_QUESTION_NUMBERS.length
    || supplementalQuestionNumbers.some(
      (number, index) => number !== SUPPLEMENTAL_QUESTION_NUMBERS[index],
    )
  ) {
    throw new Error(
      `360 AI 补充题编号应为 ${SUPPLEMENTAL_QUESTION_NUMBERS.join(', ')}，实际 ${supplementalQuestionNumbers.join(', ')}`,
    )
  }
  publicQuestionCount += supplementalQuestionNumbers.length
  if (publicQuestionCount !== PUBLIC_QUESTION_COUNT) {
    throw new Error(`360 AI 公共技术题库应生成 ${PUBLIC_QUESTION_COUNT} 题，实际 ${publicQuestionCount} 题`)
  }
  rendered.push(supplementalMarkdown, '')
  const markdown = `${rendered.join('\n').trim()}\n`
  assert360PublicContentSafe(markdown)
  return markdown
}

export function import360AiBank({
  sourcePath = SOURCE_PATH,
  outputPath = OUTPUT_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const markdown = build360AiBankMarkdown(source)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, markdown, 'utf8')
  return { questions: PUBLIC_QUESTION_COUNT, sourcePath, outputPath }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(import360AiBank(), null, 2))
}
