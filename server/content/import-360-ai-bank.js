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
  ['7', '计算机与后端基础'],
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
  ['4.1', '常见的 20 byte 来自默认 ATT MTU 为 23 byte，再扣除写入或通知通常占用的 3 byte 协议头；它不是 BLE 永久固定上限。实际分片必须读取协商后的 MTU，并继续处理序号、重试和 UTF-8 字节边界。'],
  ['4.2', '状态机就是一张“流程交通图”：状态表示当前走到哪一步，事件表示刚发生了什么，守卫条件决定这次能不能跳转，副作用才负责连接设备或调用接口。它把合法路径集中定义，能直接排除“同时成功又失败”等非法组合，也让超时、取消和重试可以逐条测试。'],
  ['4.3', 'schema 可以先理解为一份“表单说明书”，它描述每个字段的类型、默认值、校验、显隐和权限，而不是把规则散落在组件里。字段联动用依赖关系只重算受影响项；异步校验要取消旧请求或忽略旧结果；后端仍要做最终权限与业务校验。'],
  ['5.3', 'Hybrid Retrieval 就是让两种“找资料的方法”合作：关键词检索擅长错误码、编号和原句，向量检索擅长同义表达。两路先各自找候选，再按排名融合或统一重排，能互相补漏；但效果必须用同一批问题做对照评测，不能默认混合一定更好。'],
  ['5.4', 'RRF 是“只看名次的合榜方法”。同一段资料在关键词榜和向量榜越靠前，累加得到的分数越高；它不直接相加两种含义不同的原始分数。`k` 控制榜首与后续名次的差距，常见的 60 只是实验起点，候选窗口和参数仍要按业务评测。'],
  ['5.5', 'MMR 是“边选相关资料，边避免重复”。它每轮选择一段既贴近问题、又不太像已选内容的候选，`λ` 越大越看重相关性，越小越看重多样性。它只能整理已经召回的候选，不能把第一阶段漏掉的证据重新找回来。'],
  ['5.6', '评测 RAG 不能只看最后答对没有：先检查正确资料有没有被找回、排得是否靠前；再检查回答是否覆盖要点、是否忠于证据、引用是否指对；最后看延迟、成本、失败率和越权风险。测试集和文档、索引、模型、Prompt 版本都要固定，才能知道改动究竟改善了哪一层。'],
  ['5.7', 'Embedding 是模型给文本建立的一套“坐标”。换模型就像换了一张坐标系，即使向量长度相同，新查询也不能拿去和旧文档向量直接比较。迁移时应并行重建新索引，验证数量和检索效果后一次切换查询入口，并暂留旧索引以便回滚。'],
  ['5.8', '`content_hash` 是内容的数字指纹：规范化后的字节完全相同，哈希通常相同，可用于判断是否变化和复用计算结果。它不能证明两段话语义相同，更不能证明租户、权限和引用关系相同；缓存键仍要包含内容处理版本、模型版本和权限边界。'],
  ['4.5', '先把模型中的世界坐标交给相机投影，得到范围为 `-1` 到 `1` 的标准化设备坐标（NDC），再按画布宽高换算成页面像素。标签仍可能位于相机后方或被物体遮挡，所以投影坐标只解决“画在哪里”，不等于“应该显示”。'],
  ['5.2', '切块就是把长文档拆成可检索的证据单元。块太大时无关内容会稀释检索信号，块太小时答案前提会被拆散；应先沿标题、段落、表格或函数等自然边界切，再用真实问题验证命中率和答案完整度。'],
  ['5.10', '普通聊天主要生成回答；Workflow 是程序预先写好的固定流程；Agent 则让模型根据当前结果动态选择下一步。步骤越确定、写操作风险越高，越应使用 Workflow；只有路径确实无法预先确定时才增加受约束的 Agent 自主性。'],
  ['5.11', 'Function Calling 不是模型直接执行函数。模型只返回工具名和结构化参数，应用负责校验权限与参数、执行真实函数，再把带调用 ID 的结果交回模型继续回答；结构严格不等于业务安全。'],
  ['5.13', '防失控的关键是让模型只能“建议下一步”，由编排器掌握权限、状态和停止条件。每次运行限制步骤、工具次数、时间与费用；重复无进展就停止，写操作使用幂等键，高风险动作必须由人确认。'],
  ['5.16', 'Decoder-only 模型把提示和答案放在同一条序列里，统一用“预测下一个 Token”训练，因此容易扩展到续写、对话和上下文学习。Encoder 并没有消失：它仍常用于分类和向量表示，Encoder–Decoder 仍适合输入到输出的转换任务。'],
  ['6.3', '完整链路分四层：Vue 发起请求并建立空消息，Flask 鉴权后消费模型流，WSGI/Nginx 立即转发事件，浏览器再增量解码、分帧并合并到指定消息。每层都要传递同一个运行 ID、取消和错误状态，任何一层缓冲都会让页面最后一次性显示。'],
  ['6.4', '网络分片按字节发生，不认识中文字符或 JSON 边界；一个 UTF-8 中文字符可能被拆到两块。必须复用同一个流式解码器保留半个字符，再把解码后的残留文本按 SSE 空行或 NDJSON 换行拼成完整事件，不能逐块直接 `JSON.parse`。'],
  ['6.6', '“停止生成”要沿整条链路传递：前端中止读取并标记本次运行，服务端收到断连或取消请求后继续取消模型、工具和后台任务，最后释放连接。只让页面不再显示文字，服务端仍可能继续计算和计费。'],
  ['6.7', '防串台要让每个事件携带会话 ID、消息 ID、运行 ID 和递增序号；前端按运行 ID 保存独立的解码器、缓冲区和取消器。切换页面只改变显示对象，旧请求晚到也只能更新它原来的消息。'],
  ['6.8', '模型片段到达速度可能快于屏幕刷新。若每个 token 都更新状态，就会重复触发 Markdown 解析、组件渲染和滚动；应先放入普通缓冲区，每帧或每几十毫秒合并一次，结束时再强制提交最后一批。'],
  ['6.9', '流式 Markdown 的尾部可能只有半个代码块或链接。应保存完整原文，把已经闭合的块安全渲染，不稳定尾部暂时按纯文本显示；模型与检索内容始终是不可信输入，原生 HTML 要禁用或经白名单清洗。'],
  ['6.11', 'React 和 Vue 都用组件描述界面，主要差别在更新模型：React 状态变化后重新执行组件并比较结果；Vue 通过 `ref`、`reactive` 等追踪具体依赖，再更新使用这些依赖的部分。选型应看团队、生态和业务约束，不能简单断言谁绝对更快。'],
  ['6.18', 'CSRF 利用浏览器自动携带登录 Cookie，诱导用户执行并非本人发起的操作；CORS 主要限制跨源脚本能否读取响应，不是身份认证，也不能单独阻止 CSRF。防护要用 SameSite、CSRF Token、Origin 校验和正确的请求语义。'],
  ['7.1', '浏览器先解析 URL 和缓存策略，再做 DNS、连接与 TLS，发送 HTTP 请求；收到 HTML 后并行构建 DOM、CSSOM 和加载资源，最后经过样式、布局、绘制与合成显示页面。能看到页面不等于可交互，长脚本仍可能占住主线程。'],
  ['7.4', 'HTTP 定义请求、响应、方法和状态码；HTTPS 是由 TLS 保护的 HTTP，增加加密、完整性和服务端身份校验。状态码中 2xx 表示成功，3xx 表示重定向或缓存协商，4xx 表示请求需修正，5xx 表示服务端未能完成请求。'],
  ['8.6', '防抖是在连续触发时重新计时，只保留停止后的最后一次，适合搜索输入；节流是在持续触发期间按固定频率执行，适合滚动和拖拽。实现时还要明确首次、末次执行以及取消行为。'],
  ['9.2', '对象找不到自身属性时，会沿内部原型链继续查找。构造函数的 `prototype` 用来成为新实例的原型；`instanceof` 检查这个对象是否出现在实例的原型链上；`__proto__` 只是访问内部原型的历史接口。'],
  ['9.5', 'B+ 树扇出大、层级低，叶子节点又按键有序，因此既能少读磁盘页完成等值查找，也适合范围扫描。联合索引按定义列依次排序，查询通常要从最左列连续使用；是否真正生效仍应看 `EXPLAIN`，不能只背“最左前缀”。'],
  ['9.7', 'PUT 通常表示整体替换，PATCH 表示部分修改；幂等是同一请求重复执行后资源效果与执行一次相同。小列表可用页码，持续变化或深翻页数据更适合稳定游标；错误响应应包含机器可判断的错误码和请求追踪 ID。'],
  ['9.8', 'Flask 为每个请求建立应用上下文和请求上下文，执行路由与响应钩子后再清理。流式生成器是在视图返回后继续迭代的，若还要读取 `request`，需用 `stream_with_context` 保持上下文，并让数据库连接、追踪和取消覆盖整个流生命周期。'],
  ['6.5', '后端持续 `yield` 但页面最后才显示，通常是 Flask、压缩层、Nginx、网关或 CDN 中某层把小块攒起来了。先用 `curl -N` 直连应用，再逐层经过代理测试；确认出问题的层后，只对流式路由关闭缓冲或压缩，并检查缓存和空闲超时，不能只改前端。'],
  ['6.10', '恢复要分两件事：重新连上数据流，以及让原生成任务仍能继续。服务端应让任务脱离单次 HTTP 连接，按 `runId + seq` 保存事件和最终快照；前端在 IndexedDB 保存运行游标与未发送 outbox。重连后先查任务状态，再回放 `lastSeq` 之后的事件并去重，任务已终止则明确提示重试。'],
  ['6.15', '`no-cache` 不是“不缓存”，而是缓存副本每次复用前都要向服务器验证；`no-store` 才是不应保存。带内容哈希的 JS/CSS 可长期缓存，入口 HTML 适合重新验证，聊天和鉴权响应适合 `no-store`。是否命中还受 `Vary`、ETag、共享缓存和 Service Worker 影响。'],
  ['6.17', 'XSS 是不可信内容被浏览器当成代码执行。AI 输出、检索文档和工具结果都必须按外部输入处理：优先以文本渲染；需要富文本时禁用原始 HTML，并用维护良好的 sanitizer 按白名单清洗和限制 URL 协议。CSP、Trusted Types 和 HttpOnly Cookie 只能做纵深防御，不能代替安全输出。'],
  ['6.19', 'JWT 是一段带签名的声明，不是加密保险箱。服务端必须固定允许的算法并验证签名、签发方、受众和有效期；payload 对持有者可读，不能放密码或隐私。短期 access token 仍需配合 refresh token 轮换、撤销和重放控制，浏览器存储方式要同时权衡 XSS 与 CSRF。'],
  ['7.2', 'DNS 把域名逐步解析成地址。客户端通常把请求交给递归解析器；缓存未命中时，递归解析器依次询问根、顶级域和权威服务器，最终得到 A、AAAA、CNAME 等记录并按 TTL 缓存。DNS 只负责找到目标地址，之后还要单独建立 TCP、TLS 和 HTTP 连接。'],
  ['7.5', '进程强调资源与地址空间隔离；操作系统线程是在进程内可被调度的执行流，共享进程资源但各有栈和寄存器；协程则是语言或运行时提供的可挂起任务。协程没有统一实现：JavaScript、Python asyncio 和 Go goroutine 的调度方式并不相同，能否利用多核也取决于具体运行时。'],
  ['7.6', '虚拟内存让程序使用虚拟地址，而不是直接操作物理内存。CPU 先查保存常用映射的 TLB，未命中再查页表；页尚未驻留时触发缺页异常，由操作系统装入或分配物理页后重试。它提供隔离、按需加载和共享能力，但频繁缺页会明显拖慢程序。'],
  ['7.7', '先按操作选择结构：频繁按下标读取和顺序遍历优先动态数组；已经拿到节点并频繁插删时链表才可能占优；栈表达后进先出，队列表达先进先出。复杂度成立有前提，例如动态数组尾插是均摊 `O(1)`，单链表删除是“已知前驱”时 `O(1)`。'],
  ['8.2', '先确认数字是否按低位在前存储。若是，就同步遍历两个链表：每一位计算 `sum = x + y + carry`，写入 `sum % 10`，再把 `Math.floor(sum / 10)` 留给下一位。循环必须覆盖两条链表和最后进位，时间为 `O(max(m,n))`。'],
  ['8.3', '去重方式取决于输入和“相等”的定义：无序基本类型数组要保序可用 `Set`，平均时间 `O(n)`、空间 `O(n)`；已排序数组可用快慢指针原地压缩，时间 `O(n)`、额外空间 `O(1)`；对象数组应先明确按哪个 key 去重，以及保留第一次还是最后一次。'],
  ['8.7', 'LRU 在容量满时淘汰“最久没被访问”的条目。哈希表负责按 key 平均 `O(1)` 找到节点，双向链表维护新旧顺序；每次 get 或 put 命中都要把节点移到最新端，超容量则删最旧端。JavaScript 面试实现也可利用 `Map` 的插入顺序完成同样规则。'],
  ['9.4', 'Cookie 会按作用域随 HTTP 请求发送，适合服务端需要且体积很小的会话信息；`sessionStorage` 只服务当前标签页，`localStorage` 适合少量非敏感偏好，两者都是同步 API；IndexedDB 是异步结构化数据库，适合较大的离线数据。敏感令牌、容量和跨设备同步不能只靠浏览器存储解决。'],
  ['9.9', 'goroutine 是 Go 运行时调度的并发任务；channel 用来传值并建立同步关系；context 沿调用链传递截止时间和取消信号。三者不是固定搭配：共享计数可能更适合 mutex，channel 必须有明确发送、接收和关闭责任，所有 goroutine 都要能在请求取消或超时后退出。'],
  ['9.10', 'CSR 在浏览器生成页面，SSR 每次请求由服务端生成 HTML，SSG 在构建时预生成 HTML。服务端生成的页面通常还要 hydration，即客户端接管已有 HTML。若客户端首轮渲染与服务端 HTML 不一致，就会 hydration mismatch；应让数据、时区和随机值等首屏输入确定，不能隐藏警告。'],
  ['9.11', '链路监控的关键不是多记日志，而是让一次回答从点击、检索、模型、传输到渲染共享 `traceId/runId`。指标要分阶段记录首字延迟、总时长、错误、取消、token 成本和前端卡顿；出现异常时用 trace 定位究竟慢在排队、检索、模型、代理还是渲染，同时避免记录完整 Prompt、令牌和隐私。'],
])

const PUBLIC_SAFE_MECHANISMS = new Map([
  ['2.1', '面试开场的注意力预算很短，因此需要先给结论，再给证据。定位句让面试官建立候选人模型，项目证据证明能力不是标签，边界与动机则降低夸大风险并解释岗位选择。每一段都应能被后续追问验证，无法展开的技能不应放进主线。'],
  ['2.4', '项目介绍本质上是在有限时间内建立一条可验证的因果链：某类用户遇到具体问题，系统接收什么输入、经过哪些关键状态、产出什么结果；候选人负责其中哪一段、为什么选择该方案、如何验证，以及尚未解决什么。缺少任一环，介绍都容易退化成技术名词或功能清单。'],
  ['2.5', 'RAG 把频繁变化的知识与模型参数解耦。离线链路负责解析、切块、向量化和建索引；在线链路负责查询改写、混合召回、重排、上下文组装、生成和引用校验。全文 Prompt 没有召回误差，但受上下文窗口、成本和噪声限制；关键词搜索擅长精确词，却较难覆盖语义改写；微调主要改变模型行为和输出形式，不适合承载需要频繁更新、逐条追溯的事实。是否选择 RAG，最终要用检索命中率、答案忠实度、引用正确率、延迟和成本共同验证。'],
  ['3.3', 'AI 编程代理的输入、外部文档和生成结果都应按不可信数据处理。主要风险包括提示注入、密钥或源码外泄、越权写入、危险命令、恶意依赖、许可证冲突，以及生成代码与测试共享同一错误假设。可靠控制链应包含最小文件与网络权限、隔离的凭据、受控命令白名单、逐文件 diff 审查、独立设计的测试、安全与依赖扫描、可追溯日志；发布、删除、上传和权限变更等高影响动作还要保留人工确认。'],
  ['3.4', '地点意愿的核心是信息一致性和可执行性。回答应把偏好、硬约束、确认节点与到岗条件分开：已经决定的部分给清楚结论，尚未决定的部分给确认时间，变化则说明新的信息和决策依据。这样既避免虚假承诺，也让招聘方能够评估实际安排。'],
  ['4.2', `状态机把流程从零散的 if/else 提升为一个可验证的迁移模型：

- **状态**：保存当前流程位置和继续执行必需的数据，例如 scanning、connecting、configuring。
- **事件与守卫**：事件表示“发生了什么”，守卫函数只根据当前上下文决定该迁移是否合法。
- **迁移与副作用**：迁移计算下一状态；连接蓝牙、调用接口等副作用由独立执行器启动，完成后再发回成功或失败事件。

非法事件应被拒绝或记录，不能悄悄跳步。页面刷新后只恢复可序列化状态，外设连接和未完成请求必须重新确认，这是流程状态与外部世界的边界。`],
  ['4.4', `Promise.allSettled 会为每个输入建立独立的成功和失败处理，直到所有输入都已终止才解决聚合 Promise：

- 输出数组严格保留输入顺序，与任务实际完成先后无关。
- 每个结果都是 fulfilled/value 或 rejected/reason，因此批量上传可以分别标记成功、重试失败项。
- 它只负责聚合结果，不限制并发、不取消请求、不自动重试，也不会回滚已成功项。

因此完整的批量上传器还需要并发池、AbortSignal、进度模型、幂等键和失败重试策略。如果任一文件失败都不允许继续，则应使用更强的整体事务或补偿机制，而不是只换一个 Promise API。`],
  ['5.5', `MMR 不是另一种向量检索，而是对已召回候选集做迭代选择。每轮都给未选文档计算：

- **查询相关性**：候选文档与用户问题有多匹配。
- **内容冗余度**：候选文档与已选集合中最相似的文档有多重复。
- **权衡系数 λ**：越接近 1 越重视查询相关性，越接近 0 越鼓励多样性。

算法选出当前最高分项后把它加入已选集，再重复到 Top-K 满足。两类相似度必须使用可比较的尺度，候选集过小时 MMR 也无法找回未被召回的证据。评估时应同时检查答案覆盖率和重复率，防止为了“多样”选入不相关片段。`],
  ['5.6', `RAG 评测必须拆开检索、生成和端到端三层，否则只能看到“答错了”，却不知道错在哪里：

1. **数据集**：从真实查询抽样，为每题标注可接受证据、答案要点和拒答条件，并保留时间、权限与版本。
2. **检索层**：用 Recall@K、MRR 或 nDCG 检查正确证据是否进入候选且排名足够靠前。
3. **生成层**：分别评估答案覆盖、对证据的忠实度、引用指向和无证据时的拒答行为。
4. **系统层**：记录首字延迟、总延迟、token 成本、超时、权限泄漏和用户任务成功率。

每次实验必须锁定文档、切块、Embedding、索引、Prompt 和模型版本，再按“没召回”“召回错”“有证据却生成错”分桶复盘。`],
  ['5.15', `Q、K、V 是同一批 token 表示经不同线性投影得到的三组向量，不是三份原文数据：

1. Query 表示当前位置想从其他位置获取什么关系。
2. Key 表示每个位置可被匹配的特征；Query 与 Key 点积后除以维度缩放项，再经 softmax 得到注意力权重。
3. Value 是真正被加权汇总的内容表示，输出是各 Value 的加权和。

因果掩码会把未来位置的分数设为不可选，保证 Decoder 只利用已有 token。多头注意力在不同投影子空间并行计算后再合并；某个头可以学到特定模式，但不应假设每个头都对应固定的人类语义。`],
  ['6.7', `防止串台的核心是让每个流事件都可被唯一路由，而不是依赖“当前会话”这个可变全局量：

- 服务端生成 conversationId、messageId 和 runId，每个事件还带单调递增的 seq。
- 前端用 runId 索引独立的 decoder、文本 buffer、AbortController 和状态机，事件只能更新命中 ID 的消息。
- 切换会话只改变展示选择，不会把旧 run 后续 chunk 写入新会话；取消也必须精确到 runId。

服务端同样要在队列、模型调用和存储层传递这组 ID。前端收到已终止 run、旧 seq 或归属不匹配的事件应拒绝并记录，这样才能处理重连、重复投递和乱序到达。`],
  ['6.10', `恢复未完成回答要分成“连接恢复”和“生成任务恢复”两层：

1. 服务端先创建独立 runId，生成任务不以某条 HTTP 连接的存活作为唯一生命周期。
2. 所有事件按 seq 追加到有界日志或快照，并记录 running、completed、failed、cancelled 等终态。
3. 前端可在 IndexedDB 保存 runId、lastSeq 与尚未确认发送的 outbox；刷新后先查询任务状态，再请求 after=lastSeq 的缺失事件并继续 tail，消费端按 runId+seq 幂等去重。

原生 EventSource 的 Last-Event-ID 只能帮助连接重试，无法自动让已终止的模型任务继续。outbox 也只能防止用户输入因刷新丢失，服务端是否已接收仍要靠幂等键确认。实现还必须限定日志 TTL、校验会话归属、设置最大回放量，并在无法恢复时明确告知用户需要重试。`],
  ['6.16', `CORS 是浏览器对脚本跨源读响应的约束，不是服务端身份认证：

1. 浏览器比较页面和目标的协议、主机、端口，跨源请求会携带 Origin。
2. 非简单方法、Content-Type 或自定义请求头会先发 OPTIONS 预检，询问服务端允许的来源、方法和请求头。
3. 正式响应仍需返回匹配的 Access-Control-Allow-Origin；使用 Cookie 时前端需显式携带凭据，服务端需允许 credentials，且不能使用通配来源。

预检成功不代表业务请求有权限，预检失败也不代表服务器收不到所有跨源请求。鉴权、CSRF 防护和输入校验必须独立完成。`],
  ['7.3', `TCP 建连、传输和关闭分别解决不同问题：

- **三次握手**：客户端和服务端各自公布初始序列号，并证明双向收发路径可用。最后一个 ACK 让服务端确认客户端收到了自己的序列空间。
- **四次挥手**：TCP 是全双工字节流，一方 FIN 只表示自己不再发送，另一方仍可继续发送数据，所以两个方向要独立关闭；ACK 和 FIN 在合适时可合并。
- **TIME_WAIT**：主动关闭方保留连接状态，既可重发最终 ACK，也等待旧报文过期，防止污染后续复用同一四元组的连接。

握手完成只证明传输连接已建立，不证明 TLS、HTTP 路由或业务服务正常；排障时要按层分开验证。`],
  ['7.4', `HTTP 定义请求、响应、方法、状态码和缓存等应用语义；HTTPS 则是让 HTTP 运行在 TLS 保护的连接上：

1. TLS 握手协商版本、算法和临时密钥，客户端校验证书链、域名和有效期，双方派生会话密钥。
2. 后续 HTTP 报文使用对称加密保护机密性和完整性；TLS 不会替应用判断用户是否有业务权限。
3. 状态码表达处理结果：2xx 成功，3xx 重定向或缓存协商，4xx 表示客户端需修正请求或身份，5xx 表示服务端未能履行请求。

重试策略不能只按状态码决定：还要看方法是否幂等、是否已提交副作用、Retry-After 和业务错误码，避免把一次超时放大成重复扣款或重复建单。`],
  ['7.5', `三者的核心区别是资源边界和调度责任；“协程”必须结合具体语言运行时解释：

- **进程**：通常拥有独立虚拟地址空间和资源引用，隔离强；跨进程交换数据需要管道、套接字、共享内存等 IPC。
- **线程**：共享进程地址空间和文件等资源，但拥有独立寄存器、栈和调度上下文；共享数据必须通过锁、原子操作或消息传递保护不变量。
- **协程/运行时任务**：由语言或运行时调度，可在 await、yield 或运行时安排的安全点挂起。JavaScript async 函数、Python asyncio Task 和 Go goroutine 的调度、抢占与多核能力不同，不能套用同一实现结论。

这些任务最终仍在系统线程上执行。选型应同时看故障隔离、共享状态、CPU/I/O 比例、运行时调度、取消传递和调试成本，不能只比“谁更轻”。`],
  ['7.6', `虚拟内存把程序看到的地址与实际物理页框解耦：

1. CPU 产生虚拟地址，拆成虚拟页号和页内偏移。
2. MMU 先查 TLB；未命中时按页表层级寻找页表项，检查存在位和读写执行权限。
3. 页已驻留时组成物理地址并访问缓存/内存；页不在内存时触发缺页异常，内核可从文件或 swap 载入，或为匿名页分配页框。

进程的 VIRT 是地址空间范围，RSS 是当前驻留物理内存，两者不等于进程独占内存。排查时还要区分堆、mmap、共享页、page cache 和写时复制，不能用单一数字判断泄漏。`],
  ['7.7', `选数据结构应先明确操作语义，再比较复杂度和内存布局：

- 需要按下标随机访问、紧凑遍历和尾部追加时，连续数组通常是默认选择；中间插入需要搬移后续元素。
- 链表在已持有目标节点时可常数时间插删，但定位第 k 项仍需顺序走访，且指针开销和缓存局部性较差。
- 栈表达后进先出，队列表达先进先出，双端队列能在两端做常数时间操作；它们是行为约束，可由不同底层结构实现。

大 O 只是增长趋势。真实选型还要测数据规模、对象开销、缓存命中、内存分配和并发访问模式。`],
  ['8.6', `防抖和节流都是用时间窗口合并高频调用，但保留事件的规则不同：

- **防抖**：每次调用都取消旧计时器并重新计时，只有停止触发达到 wait 后才执行 trailing 回调；适合搜索输入、表单校验等“关心最终值”的场景。
- **节流**：保证持续触发期间每个窗口最多执行一次；适合滚动、拖拽和采样等需要持续反馈的场景。
- **边界选项**：leading 决定窗口开始是否立即执行，trailing 决定结束时是否补最后一次；cancel 清除待执行调用，flush 立即提交它。

实现必须保留最新参数与 this，并用单调时间计算剩余窗口。组件卸载、页面切换或请求失效时应 cancel；搜索还要取消旧网络请求，因为防抖只减少启动次数，不能防止已发请求乱序返回。`],
  ['8.7', `LRU 要同时满足“按 key 常数时间定位”和“常数时间找到最久未使用项”：

- 哈希表从 key 直接定位缓存节点，避免 get 时遍历。
- 双向链表按最近使用顺序排列；get 命中或 put 更新时把节点移到最新端，超容量时从最旧端删除。
- 链表节点保存前后指针与 key/value，哈希表和链表删除必须在同一操作中保持一致。

JavaScript Map 保留插入顺序，因此可用 delete 再 set 将命中 key 移到末尾，用第一个迭代键淘汰。这个实现对面试和单线程小缓存足够清楚；生产环境还要处理容量为零、值为 undefined、TTL、并发、存储成本和淘汰回调，不能把访问次数最少的 LFU 与 LRU 混淆。`],
  ['9.1', `浏览器事件循环以“一次 task 执行 + 微任务检查点 + 可选渲染机会”为主线：

1. 浏览器从计时器、用户交互、网络等任务源选择一个 task，将其回调压入 JavaScript 调用栈直到返回。
2. 栈清空后执行微任务检查点，Promise reaction 和 queueMicrotask 按入队继续处理；微任务再创建微任务会延长本次检查点。
3. 微任务清空后，浏览器根据帧调度决定是否计算样式、布局、绘制并运行 requestAnimationFrame，然后进入后续 task。

“宏任务”是常用教学词，不表示所有任务只在一个全局 FIFO 队列里。递归微任务会饿死渲染和计时器；Node.js 又有自己的阶段和 nextTick 规则，不应与浏览器时序混为一谈。`],
  ['9.2', `每个普通对象都有内部 [[Prototype]] 链接，属性查找从对象自身开始，找不到才沿这条链向上：

- 构造函数的 prototype 是一个普通属性，供 new 在创建实例时设为新对象的 [[Prototype]]；它不是该函数自身的原型。
- __proto__ 通常是 Object.prototype 上的历史访问器，业务代码应优先用 Object.getPrototypeOf 和 Object.setPrototypeOf，并避免运行时频繁改链。
- instanceof 取右侧函数的 prototype，在左侧对象的 [[Prototype]] 链上查找；跨 realm、自定义 Symbol.hasInstance 和替换 prototype 都会影响结果。

方法共享的本质是多个实例链接到同一原型对象，而不是每个实例复制一份方法。类语法也使用这套原型机制。`],
  ['9.3', `这些 TypeScript 工具解决的是不同边界：

- **any** 基本关闭后续检查，适合极少量有意隔离的迁移边界，不应作为外部数据的默认类型。
- **unknown** 允许任意值进入，但读取属性、调用或赋值前必须通过 typeof、判别字段或运行时 schema 缩窄。
- **never** 表示不可到达的值，可用于 switch 的穷尽检查，让新增协议分支时编译器指出漏处。
- **interface / type**：interface 适合可扩展的对象契约和声明合并；type 可组合联合、交叉、元组和条件类型。

类型只在编译期存在，所以 API、localStorage 和消息流的 unknown 输入仍要运行时校验。对流协议使用判别联合，比一个充满可选字段的大接口更能排除非法状态。`],
  ['9.5', `B+ 树适合数据库，关键不只是 O(log n)，而是它以页为单位降低随机 I/O：

1. 内部页只保存分隔键和子页指针，单页扇出较大，根到叶的层数很少。
2. 叶子页按键有序且相互连接，定位范围起点后可以顺序扫描，同时服务排序和前缀查询。
3. 在 InnoDB 中，聚簇主键叶子保存整行，二级索引叶子保存主键；二级索引查询可能需要再回主键树取其他列。

联合索引按列定义的字典序排列，等值前缀可继续缩小范围，遇到范围条件后后续列通常不再缩小定位区间，但仍可参与覆盖或排序。是否使用索引由优化器根据统计、扫描行数、回表和排序成本决定。`],
  ['9.6', `ACID 描述事务契约，隔离级别则决定并发事务能观察到哪些中间变化：

- Read Uncommitted 可能读到未提交变更；Read Committed 每条语句通常取新快照，避免脏读但可出现不可重复读。
- Repeatable Read 通常让同一事务的普通快照读复用一致视图；Serializable 进一步约束并发，但吞吐和等待代价更高。
- MVCC 通过版本和快照减少读写互阻，锁仍用于保护当前读、写入和范围不变量；快照不会自动防止写写冲突。

脏读、不可重复读和幻读是观察现象，具体数据库对同名隔离级别的实现会不同。库存扣减等写业务应使用条件 UPDATE、版本号或显式锁表达竞争，不能因为隔离级别较高就先读再无条件写回。`],
  ['9.7', `REST 设计先确定资源身份和 HTTP 语义，再定义重试、并发与列表稳定性：

- PUT 表达对已知 URI 的完整替换，多次执行同一请求应得到同一最终状态；PATCH 表达局部变更，是否幂等取决于补丁语义，“计数加一”就不天然幂等。
- POST 创建或执行命令时，可用 Idempotency-Key 在服务端记录请求指纹和结果，防止超时重试产生重复副作用。
- offset 分页易于跳页，但深页扫描成本高且并发插入会造成重复/遗漏；游标分页用稳定排序键加唯一键继续扫描。

错误响应应同时有正确 HTTP 状态、稳定业务 code、可读 message、字段错误和 requestId。并发更新可配合 ETag/If-Match 或版本号防止静默覆盖。`],
  ['9.8', `Flask 把 WSGI 请求绑定到两层上下文，再通过 LocalProxy 让代码使用 request、g 和 current_app：

1. 请求到达时推入 application context 和 request context，执行 before_request，匹配路由并调用 view。
2. view 返回值被转为 Response，after_request 可统一加响应头；最后 teardown_request/teardown_appcontext 在成功或异常路径上释放数据库会话等资源。
3. 流式 Response 返回后，generator 的实际迭代发生在 view 之后；若 generator 仍要读 request，需用 stream_with_context 延长所需上下文。

不应让数据库事务、请求对象或大量缓冲区无界地跟随长流。客户端断开、generator 异常和 worker 超时都要进入可观测的取消与清理路径。`],
  ['9.9', `goroutine、channel 和 context 分别负责执行、通信和生命周期传递：

- goroutine 是由 Go 运行时调度到系统线程上的轻量任务；它们可以并发，在有多个可用核时也可并行，但共享内存仍会竞争。
- channel 传递有类型的值并建立同步关系；无缓冲 channel 要求发送接收会合，有缓冲 channel 可吸收有界峰值，两者都不应作为无界队列。
- context 用于沿调用链传播 deadline、取消和请求级元数据；子任务必须主动监听 Done 或把 context 传给支持取消的 I/O。

正确模式要明确谁创建、谁关闭 channel，谁等待所有 goroutine 退出。发送无接收者、永不返回的 I/O 和遗失的 ticker 都会泄漏 goroutine，应用 errgroup、并发上限和超时将失败结构化。`],
  ['9.10', `CSR、SSR 和 SSG 的主要区别是 HTML 在什么时候、由谁根据数据生成：

- CSR 通常先返回容器和 JavaScript，浏览器运行应用后再请求数据并构建页面。
- SSR 在每次请求或缓存刷新时在服务端产生含内容 HTML，浏览器随后下载 JavaScript 并 hydration，把事件和客户端状态接管回来。
- SSG 在构建阶段预生成 HTML，适合更新节奏可预期且需要 CDN 缓存的内容；增量再生成可避免每次全站重建。

hydration 要求客户端首次 render 与服务端 HTML 在结构和内容上一致。Date.now、随机数、时区、未序列化数据或首帧直接访问 window 都可导致 mismatch。修复方式是让首帧输入确定，将只属于浏览器的差异放到 Effect/mounted 之后，而不是隐藏告警。`],
  ['9.11', `端到端 AI 链路必须用同一组身份将前端、API、检索、模型和工具阶段串起来：

1. 入口生成 requestId、conversationId、messageId 和 runId，所有结构化日志、span 与流事件都带必要 ID，但不记完整 Prompt、用户文档、token 或工具密参。
2. 前端记录点击、请求排队、首字节、首个可见字符、渲染长任务、取消和重连；后端分段记录鉴权、检索、重排、模型首 token、工具调用和总生成时间。
3. 指标需按版本和阶段切分：错误率、P50/P95 延迟、TTFT、召回命中、引用正确、工具失败、token 成本和用户取消率不能混成一个平均值。

告警要绑定可执行 SLO 和故障阶段。例如 TTFT 升高时，先用 span 比较排队、检索和模型耗时；如果服务端已准时发出而用户看不到，再查代理缓冲、帧解析和前端渲染。`],
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
  openAiRetrieval: ['OpenAI：Retrieval 指南', 'https://platform.openai.com/docs/guides/retrieval'],
  openAiFineTuning: ['OpenAI：Fine-tuning 指南', 'https://platform.openai.com/docs/guides/fine-tuning'],
  attentionPaper: ['Attention Is All You Need', 'https://arxiv.org/abs/1706.03762'],
  gpt3Paper: ['GPT-3：Language Models are Few-Shot Learners', 'https://arxiv.org/abs/2005.14165'],
  mcpArchitecture: ['MCP 官方架构', 'https://modelcontextprotocol.io/docs/learn/architecture'],
  mcpTools: ['MCP 官方 Tools 规范', 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools'],
  owaspPrompt: ['OWASP：Prompt Injection', 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/'],
  owaspOutput: ['OWASP：Improper Output Handling', 'https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/'],
  mdnSse: ['MDN：Server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
  mdnStreams: ['MDN：Streams API', 'https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams'],
  mdnCors: ['MDN：CORS', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS'],
  mdnStorage: ['MDN：客户端存储', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage'],
  mdnCookies: ['MDN：HTTP Cookies', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies'],
  mdnWebStorage: ['MDN：Web Storage API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API'],
  mdnIndexedDb: ['MDN：IndexedDB API', 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API'],
  mdnAbortController: ['MDN：AbortController', 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController'],
  mdnTextDecoder: ['MDN：TextDecoder.decode()', 'https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode'],
  mdnRequestAnimationFrame: ['MDN：requestAnimationFrame()', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame'],
  mdnDebounce: ['MDN：Debounce', 'https://developer.mozilla.org/en-US/docs/Glossary/Debounce'],
  mdnThrottle: ['MDN：Throttle', 'https://developer.mozilla.org/en-US/docs/Glossary/Throttle'],
  mdnPrototypeChain: ['MDN：Inheritance and the prototype chain', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain'],
  mdnInstanceof: ['MDN：instanceof', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof'],
  mdnBrowserWork: ['MDN：How browsers work', 'https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work'],
  mdnHttpCaching: ['MDN：HTTP caching', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching'],
  mdnSet: ['MDN：Set', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set'],
  mdnMap: ['MDN：Map', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map'],
  mdnBluetooth: ['MDN：Web Bluetooth API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API'],
  mdnEventLoop: ['MDN：JavaScript execution model', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model'],
  mdnPromise: ['MDN：Promise', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise'],
  react: ['React 官方文档', 'https://react.dev/learn'],
  reactEffects: ['React：Synchronizing with Effects', 'https://react.dev/learn/synchronizing-with-effects'],
  typescript: ['TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html'],
  vite: ['Vite 官方指南', 'https://vite.dev/guide/'],
  webpack: ['webpack Concepts', 'https://webpack.js.org/concepts/'],
  threeProject: ['Three.js：Vector3.project', 'https://threejs.org/docs/#api/en/math/Vector3.project'],
  threeCameras: ['Three.js：Cameras', 'https://threejs.org/manual/en/cameras.html'],
  threeDispose: ['Three.js：How to dispose of objects', 'https://threejs.org/manual/en/how-to-dispose-of-objects.html'],
  rfc9110: ['RFC 9110：HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110'],
  rfc8446: ['RFC 8446：TLS 1.3', 'https://www.rfc-editor.org/rfc/rfc8446'],
  rfc9457: ['RFC 9457：Problem Details for HTTP APIs', 'https://www.rfc-editor.org/rfc/rfc9457'],
  idempotencyKey: ['IETF：Idempotency-Key Header 草案', 'https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-07'],
  rfc9293: ['RFC 9293：TCP', 'https://www.rfc-editor.org/rfc/rfc9293'],
  mysqlIndexes: ['MySQL：How MySQL Uses Indexes', 'https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html'],
  mysqlMultipleIndexes: ['MySQL：Multiple-Column Indexes', 'https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html'],
  mysqlInnoDbIndexes: ['MySQL：InnoDB Index Types', 'https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html'],
  mysqlTransactions: ['MySQL：InnoDB Transaction Model', 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html'],
  flask: ['Flask：The Request Context', 'https://flask.palletsprojects.com/en/stable/reqcontext/'],
  flaskStreaming: ['Flask：Streaming Contents', 'https://flask.palletsprojects.com/en/stable/patterns/streaming/'],
  goContext: ['Go：context package', 'https://pkg.go.dev/context'],
  goSpec: ['Go 语言规范：Go statements', 'https://go.dev/ref/spec#Go_statements'],
  stateMachines: ['Stately：State machines', 'https://stately.ai/docs/machines'],
  w3cScxml: ['W3C：SCXML State Machine Recommendation', 'https://www.w3.org/TR/scxml/'],
  jsonSchema: ['JSON Schema：Creating your first schema', 'https://json-schema.org/learn/getting-started-step-by-step'],
  vueWatchers: ['Vue：Watchers', 'https://vuejs.org/guide/essentials/watchers.html'],
  weaviateHybrid: ['Weaviate：Hybrid search', 'https://docs.weaviate.io/weaviate/concepts/search/hybrid-search'],
  rrfPaper: ['RRF 原论文', 'https://doi.org/10.1145/1571941.1572114'],
  mmrPaper: ['MMR 原论文', 'https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf'],
  ragasPaper: ['RAGAS 评测论文', 'https://arxiv.org/abs/2309.15217'],
  qdrantCollections: ['Qdrant：Collections 与向量参数', 'https://qdrant.tech/documentation/concepts/collections/'],
  qdrantAliases: ['Qdrant：Collection aliases', 'https://qdrant.tech/documentation/concepts/collections/#collection-aliases'],
  qdrantMmr: ['Qdrant：Maximal Marginal Relevance', 'https://qdrant.tech/documentation/search/search-relevance/#maximal-marginal-relevance-mmr'],
  nistSha256: ['NIST FIPS 180-4：Secure Hash Standard', 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final'],
  nginxProxyBuffering: ['Nginx：proxy_buffering', 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering'],
  htmlEventSource: ['WHATWG HTML：Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
  commonMark: ['CommonMark：规范与测试用例', 'https://spec.commonmark.org/'],
  rfc9111: ['RFC 9111：HTTP Caching', 'https://www.rfc-editor.org/info/rfc9111'],
  owaspXss: ['OWASP：XSS Prevention Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'],
  owaspCsrf: ['OWASP：CSRF Prevention Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'],
  domPurify: ['DOMPurify 官方仓库', 'https://github.com/cure53/DOMPurify'],
  rfc7519: ['RFC 7519：JSON Web Token', 'https://www.rfc-editor.org/info/rfc7519'],
  owaspJwt: ['OWASP：JSON Web Token Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html'],
  rfc1034: ['RFC 1034：Domain Names - Concepts and Facilities', 'https://www.rfc-editor.org/info/rfc1034'],
  rfc1035: ['RFC 1035：Domain Names - Implementation and Specification', 'https://www.rfc-editor.org/info/rfc1035'],
  pythonAsyncio: ['Python：asyncio Task', 'https://docs.python.org/3/library/asyncio-task.html'],
  linuxClone: ['Linux man-pages：clone(2)', 'https://man7.org/linux/man-pages/man2/clone.2.html'],
  linuxMemory: ['Linux Kernel：Memory Management Concepts', 'https://docs.kernel.org/admin-guide/mm/concepts.html'],
  linuxPageTables: ['Linux Kernel：Page Tables', 'https://docs.kernel.org/mm/page_tables.html'],
  openDataArrays: ['Open Data Structures：Array-Based Lists', 'https://opendatastructures.org/ods-python/2_Array_Based_Lists.html'],
  openDataLinked: ['Open Data Structures：Linked Lists', 'https://opendatastructures.org/ods-python/3_Linked_Lists.html'],
  leetcodeCycle: ['LeetCode 142：Linked List Cycle II', 'https://leetcode.com/problems/linked-list-cycle-ii/'],
  leetcodeAddTwo: ['LeetCode 2：Add Two Numbers', 'https://leetcode.com/problems/add-two-numbers/'],
  leetcodeDeduplicate: ['LeetCode 26：Remove Duplicates from Sorted Array', 'https://leetcode.com/problems/remove-duplicates-from-sorted-array/'],
  leetcodeReverse: ['LeetCode 206：Reverse Linked List', 'https://leetcode.com/problems/reverse-linked-list/'],
  leetcodeLru: ['LeetCode 146：LRU Cache', 'https://leetcode.com/problems/lru-cache/'],
  reactHydrate: ['React：hydrateRoot', 'https://react.dev/reference/react-dom/client/hydrateRoot'],
  reactStateSnapshot: ['React：State as a Snapshot', 'https://react.dev/learn/state-as-a-snapshot'],
  reactBatching: ['React：Queueing a Series of State Updates', 'https://react.dev/learn/queueing-a-series-of-state-updates'],
  vueReactivity: ['Vue：Reactivity in Depth', 'https://vuejs.org/guide/extras/reactivity-in-depth.html'],
  vueHydration: ['Vue：SSR Hydration Mismatch', 'https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch'],
  nuxtRendering: ['Nuxt：Rendering Modes', 'https://nuxt.com/docs/guide/concepts/rendering'],
  otelTraces: ['OpenTelemetry：Traces', 'https://opentelemetry.io/docs/concepts/signals/traces/'],
  otelGenAi: ['OpenTelemetry：Generative AI semantic conventions', 'https://opentelemetry.io/docs/specs/semconv/gen-ai/'],
  webVitals: ['GoogleChrome：web-vitals', 'https://github.com/GoogleChrome/web-vitals'],
  xhsAiDevInterview: ['社区题源｜小红书：AI 应用开发一面', 'https://www.xiaohongshu.com/explore/6a342fec00000000210215bc'],
  xhsTaotianAgentInterview: ['社区题源｜小红书：淘天 AI Agent 一面', 'https://www.xiaohongshu.com/explore/6a677c95000000001302f0fb'],
  nowcoderAgentQuestions: ['社区题源｜牛客：23 个 Agent 连续追问', 'https://www.nowcoder.com/discuss/864153617182355456'],
  nowcoderMinimaxMcp: ['社区题源｜牛客：MiniMax AI App MCP 追问', 'https://www.nowcoder.com/feed/main/detail/1b59cf26967b45269d1274d208e5b35b'],
  nowcoderByteSse: ['社区题源｜牛客：字节 SSE 与 WebSocket 追问', 'https://www.nowcoder.com/discuss/888046680824639488'],
  nowcoderNetEaseSse: ['社区题源｜牛客：网易互娱 SSE、长连接与鉴权', 'https://www.nowcoder.com/feed/main/detail/fcdbf2d6868347bc8256068c60dd70a0'],
  bluetoothCore: ['Bluetooth Core Specification', 'https://www.bluetooth.com/specifications/specs/core-specification/'],
  githubCopilotReview: ['GitHub：Responsible use of Copilot code review', 'https://docs.github.com/en/copilot/responsible-use/copilot-code-review'],
  langGraphWorkflows: ['LangGraph：Workflows and agents', 'https://docs.langchain.com/oss/javascript/langgraph/workflows-agents'],
  langGraphPersistence: ['LangGraph：Persistence', 'https://docs.langchain.com/oss/javascript/langgraph/persistence'],
  openAiFunctionCalling: ['OpenAI：Function Calling 指南', 'https://platform.openai.com/docs/guides/function-calling'],
  openAiAgentGuardrails: ['OpenAI Agents SDK：Guardrails', 'https://openai.github.io/openai-agents-js/guides/guardrails/'],
}

// These questions previously inherited generic chapter references. Keep their
// citations tied to the exact mechanism being taught so a learner can verify
// the answer without first filtering unrelated product or framework pages.
const DIRECT_REFERENCES = new Map([
  ['2.5', [REFERENCES.ragPaper, REFERENCES.openAiRetrieval, REFERENCES.openAiFineTuning]],
  ['3.3', [REFERENCES.githubCopilotReview, REFERENCES.owaspPrompt, REFERENCES.owaspOutput]],
  ['4.1', [REFERENCES.bluetoothCore, REFERENCES.mdnBluetooth]],
  ['4.2', [REFERENCES.stateMachines, REFERENCES.w3cScxml]],
  ['4.3', [REFERENCES.jsonSchema, REFERENCES.mdnAbortController, REFERENCES.vueWatchers]],
  ['4.5', [REFERENCES.threeProject, REFERENCES.threeCameras]],
  ['5.2', [REFERENCES.openAiRetrieval, REFERENCES.ragPaper]],
  ['5.3', [REFERENCES.weaviateHybrid, REFERENCES.rrfPaper, REFERENCES.ragPaper]],
  ['5.4', [REFERENCES.rrfPaper, REFERENCES.weaviateHybrid]],
  ['5.5', [REFERENCES.mmrPaper, REFERENCES.qdrantMmr]],
  ['5.6', [REFERENCES.ragasPaper, REFERENCES.ragPaper]],
  ['5.7', [REFERENCES.qdrantCollections, REFERENCES.qdrantAliases]],
  ['5.8', [REFERENCES.nistSha256, REFERENCES.qdrantCollections]],
  ['5.10', [REFERENCES.nowcoderAgentQuestions, REFERENCES.langGraphWorkflows, REFERENCES.openAiAgentGuardrails]],
  ['5.11', [REFERENCES.xhsAiDevInterview, REFERENCES.openAiFunctionCalling, REFERENCES.mcpTools]],
  ['5.13', [REFERENCES.nowcoderAgentQuestions, REFERENCES.openAiAgentGuardrails, REFERENCES.langGraphPersistence]],
  ['5.16', [REFERENCES.attentionPaper, REFERENCES.gpt3Paper]],
  ['6.3', [REFERENCES.flaskStreaming, REFERENCES.nginxProxyBuffering, REFERENCES.mdnTextDecoder]],
  ['6.4', [REFERENCES.mdnTextDecoder, REFERENCES.mdnStreams]],
  ['6.5', [REFERENCES.nginxProxyBuffering, REFERENCES.mdnStreams, REFERENCES.mdnSse]],
  ['6.6', [REFERENCES.mdnAbortController, REFERENCES.mdnStreams, REFERENCES.flaskStreaming]],
  ['6.7', [REFERENCES.htmlEventSource, REFERENCES.reactBatching]],
  ['6.8', [REFERENCES.mdnRequestAnimationFrame, REFERENCES.reactBatching]],
  ['6.9', [REFERENCES.commonMark, REFERENCES.domPurify, REFERENCES.owaspXss]],
  ['6.10', [REFERENCES.htmlEventSource, REFERENCES.mdnIndexedDb, REFERENCES.mdnSse]],
  ['6.11', [REFERENCES.reactStateSnapshot, REFERENCES.vueReactivity]],
  ['6.15', [REFERENCES.rfc9111, REFERENCES.mdnHttpCaching]],
  ['6.17', [REFERENCES.owaspXss, REFERENCES.domPurify]],
  ['6.18', [REFERENCES.owaspCsrf, REFERENCES.mdnCors]],
  ['6.19', [REFERENCES.rfc7519, REFERENCES.owaspJwt]],
  ['7.1', [REFERENCES.mdnBrowserWork, REFERENCES.rfc1034, REFERENCES.rfc8446, REFERENCES.rfc9110]],
  ['7.2', [REFERENCES.rfc1034, REFERENCES.rfc1035]],
  ['7.4', [REFERENCES.rfc9110, REFERENCES.rfc8446]],
  ['7.5', [REFERENCES.linuxClone, REFERENCES.pythonAsyncio, REFERENCES.goSpec]],
  ['7.6', [REFERENCES.linuxMemory, REFERENCES.linuxPageTables]],
  ['7.7', [REFERENCES.openDataArrays, REFERENCES.openDataLinked]],
  ['8.1', [REFERENCES.leetcodeCycle, REFERENCES.openDataLinked]],
  ['8.2', [REFERENCES.leetcodeAddTwo, REFERENCES.openDataLinked]],
  ['8.3', [REFERENCES.mdnSet, REFERENCES.leetcodeDeduplicate]],
  ['8.4', [REFERENCES.leetcodeReverse, REFERENCES.openDataLinked]],
  ['8.6', [REFERENCES.mdnDebounce, REFERENCES.mdnThrottle]],
  ['8.7', [REFERENCES.leetcodeLru, REFERENCES.mdnMap]],
  ['9.2', [REFERENCES.mdnPrototypeChain, REFERENCES.mdnInstanceof]],
  ['9.4', [REFERENCES.mdnCookies, REFERENCES.mdnWebStorage, REFERENCES.mdnIndexedDb]],
  ['9.5', [REFERENCES.mysqlInnoDbIndexes, REFERENCES.mysqlMultipleIndexes, REFERENCES.mysqlIndexes]],
  ['9.7', [REFERENCES.rfc9110, REFERENCES.rfc9457, REFERENCES.idempotencyKey]],
  ['9.8', [REFERENCES.flask, REFERENCES.flaskStreaming]],
  ['9.9', [REFERENCES.goSpec, REFERENCES.goContext]],
  ['9.10', [REFERENCES.reactHydrate, REFERENCES.vueHydration, REFERENCES.nuxtRendering]],
  ['9.11', [REFERENCES.otelTraces, REFERENCES.otelGenAi, REFERENCES.webVitals]],
])

const LABELS = {
  short: [
    /^(?:可直接练习的版本|可口述版本|安全版本|推荐回答|推荐答案|口述版|口述答案)$/,
    /^(?:30 秒(?:可口述)?版本|一分钟口述版|两分钟口述版|HTTPS 原理口述版|三次握手口述版|四次挥手口述版)$/,
    /^(?:核心答案|核心结论|核心价值|项目回答)$/,
  ],
  mechanism: [
    /^(?:技术原理|原理|更深原理|关键原理|机制|机制展开|机制与实现|机制、实现与边界)$/,
    /^(?:技术分层|标准链路|核心模型|核心组件|核心指标|评测设计|公式|方案对比|实现对比|落地机制|实现思路|解题思路|原理证明)$/,
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
  throw new Error(`360 AI ${sectionNumber} 节《${title}》缺少逐题编写的具体原理，禁止使用通用模板发布。`)
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
  if (text.includes('mcp')) {
    return [
      REFERENCES.xhsAiDevInterview,
      REFERENCES.xhsTaotianAgentInterview,
      REFERENCES.nowcoderMinimaxMcp,
      REFERENCES.mcpArchitecture,
      REFERENCES.mcpTools,
      REFERENCES.owaspPrompt,
    ]
  }
  if (text.includes('function calling') || text.includes('agent')) {
    return [
      REFERENCES.nowcoderAgentQuestions,
      REFERENCES.xhsAiDevInterview,
      REFERENCES.mcpTools,
      REFERENCES.mcpArchitecture,
      REFERENCES.owaspPrompt,
    ]
  }
  if (text.includes('transformer') || text.includes('q、k、v') || text.includes('decoder-only')) {
    return [REFERENCES.attentionPaper, REFERENCES.ragPaper, REFERENCES.owaspOutput]
  }
  if (sectionNumber === '5') return [REFERENCES.ragPaper, REFERENCES.owaspPrompt, REFERENCES.mcpArchitecture]
  if (text.includes('react') || text.includes('hooks')) return [REFERENCES.react, REFERENCES.reactEffects, REFERENCES.typescript]
  if (text.includes('vite') || text.includes('webpack')) return [REFERENCES.vite, REFERENCES.webpack, REFERENCES.typescript]
  if (text.includes('cors') || text.includes('csrf')) return [REFERENCES.mdnCors, REFERENCES.rfc9110, REFERENCES.owaspOutput]
  if (text.includes('sse') || text.includes('eventsource') || text.includes('流式') || text.includes('utf-8')) {
    return [
      REFERENCES.nowcoderByteSse,
      REFERENCES.nowcoderNetEaseSse,
      REFERENCES.mdnSse,
      REFERENCES.mdnStreams,
      REFERENCES.owaspOutput,
    ]
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

function withReferences(existing, questionKey, sectionNumber, title) {
  const directReferences = DIRECT_REFERENCES.get(questionKey)
  if (directReferences) {
    return directReferences
      .map(([label, url]) => `- [${label}](${url})`)
      .join('\n')
  }

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
  const sources = withReferences(buckets.sources, question.key, question.sectionNumber, publicTitle)
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
