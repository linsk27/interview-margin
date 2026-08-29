import { legacySupplementFor, renderLegacySources } from './legacy-supplements.js'
import { toString } from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

// A Markdown reference definition is invisible in the reader and omitted from
// plain-text search, while still giving the transformer a stable version mark.
const CLARITY_MARKER = '[clarity-v2]: #'
const markdownParser = unified().use(remarkParse)

const SECTION_PATTERNS = [
  ['answer', /^(?:\*\*)?(?:先背答案|短回答|题解)(?:[：:])(?:\*\*)?\s*$/],
  ['glossary', /^(?:\*\*)?关键词翻译(?:[：:])(?:\*\*)?\s*$/],
  ['mechanism', /^(?:\*\*)?(?:原理(?:\s*\/?\s*流程)?|机制拆解)(?:[：:])(?:\*\*)?\s*$/],
  ['mechanism', /^(?:\*\*)?(?:技术原理|先解释为什么要这样做|为什么这样回答|为什么会搜错|先区分三种方案|先把两个问题分开|当前项目事实|当前项目流程|当前项目边界|项目边界|项目当前实现[^*]*|答题边界|简历对齐边界|可验证边界|验收边界|这样拆的好处|这段代码意味着什么|逐行理解)(?:[：:]?)(?:\*\*)?\s*$/],
  ['practice', /^(?:\*\*)?(?:代码\s*\/\s*场景|排查\s*\/\s*场景|项目\s*\/\s*场景|项目场景|项目落点)(?:[：:])(?:\*\*)?\s*$/],
  ['practice', /^(?:\*\*)?(?:场景拆解|排查顺序|量化定位|量化判据|量化验证|验证步骤|验证方法|验证清单|发布验证|迁移流程|恢复状态机|最小可用性闭环|最小流程|中性示例|示例)(?:[：:]?)(?:\*\*)?\s*$/],
  ['followups', /^(?:\*\*)?(?:继续追问|递进追问)(?:[：:])?.*?(?:\*\*)?\s*$/],
  ['followups', /^(?:\*\*)?面试官追问(?:[：:]).*?(?:\*\*)?\s*$/],
  ['pitfalls', /^(?:\*\*)?易错点(?:[：:])(?:\*\*)?\s*$/],
  ['sources', /^(?:\*\*)?参考来源(?:[：:])(?:\*\*)?\s*$/],
]

// Most questions can derive a useful first screen from their authored answer,
// mechanism and scenario. A small set of legacy questions need an explicit
// editorial summary because their opening sentence is a premise, glossary item
// or interview disclaimer rather than the answer itself. Keep these overrides
// narrow: the full authored explanation remains below the summary.
const FIRST_SCREEN_OVERRIDES = [
  {
    bankId: 'interview',
    title: /CRUD/,
    conclusion: '承认 CRUD 是基础后，用业务约束、失败后果、自己的决策和验证证据说明真正的工程复杂度。',
    reason: '面试官是在确认你是否理解业务不变量和个人贡献；只有约束与证据，才能把通用 CRUD 和真实工程难点区分开。',
    application: '按“事实→约束→行动→证据”回答：先承认增删改查，再讲一个权限、状态或并发约束，最后拿测试或故障记录验证。',
  },
  {
    bankId: 'interview',
    title: /RAG 回答不准.*定位/,
    conclusion: '先分清是“没检索到正确资料”还是“资料找到了但模型答错”：前者查入库、切块、过滤和召回，后者再查截断、提示词与模型。',
    reason: '最终答案同时取决于证据能否进入候选集，以及模型能否正确使用证据；不分层排查，就容易把检索缺陷误当成 Prompt 问题。',
    application: '用一组固定的“问题—应命中资料—可接受答案”逐层记录 Recall@K、正确片段名次、引用支持度和生成正确率。',
  },
  {
    bankId: 'interview',
    title: /token 预算.*上下文窗口/iu,
    conclusion: '上下文窗口按 Token 计算，预算要同时容纳系统提示、对话历史、检索证据、用户问题和输出预留。',
    reason: '不同模型的分词器不同，字符数只能粗估；输入占满窗口会挤掉输出或关键证据，所以要分区限额，并用接口返回的实际 usage 校准。',
    application: '先给输出保留上限，再按优先级装入系统提示、近期历史和完整证据块；接近预算时丢低分块，不要从句子中间硬截断。',
  },
  {
    bankId: 'interview',
    title: /Agent 的工具调用闭环/,
    conclusion: '最小 Agent 闭环是：模型决定工具→服务端鉴权、校参并执行→结果回填→模型继续决策；ContextForge 当前只有 RAG + SSE，还没有实现这套闭环。',
    reason: '聊天只生成文本，Agent 还要把每次工具意图变成受控、可审计、可取消的执行循环，否则模型不能安全地产生真实副作用。',
    application: '先做一个只读工具，补齐白名单、参数 schema、资源级权限、超时、调用 ID 和审计日志，再考虑写操作与多轮规划。',
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /问题说得很省略|补成完整问题/,
    conclusion: '只用上下文中已经确认的信息补全指代，同时保留原句并行检索；一旦需要新增条件或置信度很低，就反问用户。',
    reason: '改写若擅自补入人物、时间、否定词或权限条件，会把检索带向错误资料，因此必须约束语义并保留原句兜底。',
    application: '把“这个周末也行吗”补成已知对象的完整问题，但若上下文没有“加班”，就不能自行改写成“加班打车能否报销”。',
  },
  {
    bankId: 'java-backend-interviews',
    title: /Spring、Spring MVC 和 Spring Boot/,
    conclusion: 'Spring Framework 提供容器、AOP 和事务等基础能力；Spring MVC 负责 Web 请求；Spring Boot 用自动配置、Starter 和嵌入式服务器简化整套应用的装配与运行。',
    reason: 'Spring MVC 建在 Spring 容器之上，Spring Boot 又基于 Spring 组合常用能力，所以一个 Boot Web 项目通常会同时使用三者，而不是三选一。',
    application: '排查时按层定位：Bean 缺失看容器和自动配置，404 看 MVC 映射，启动与依赖组合问题再看 Boot 条件报告。',
  },
  {
    bankId: 'java-ai-applications',
    title: /Spring AI 与 LangChain4j/,
    conclusion: '已有 Spring Boot、Micrometer 和 Reactor 体系时优先验证 Spring AI；更偏接口式 AI Service、希望轻量接入时可评估 LangChain4j，最终用必需能力的 PoC 决定。',
    reason: '两者能力有重叠，但生态接入、抽象方式和版本成熟度不同；真正的成本来自现有技术栈、故障治理与以后迁移，而不是示例代码谁更短。',
    application: '固定同一模型和 50 条样本，比较流式取消、结构化输出、RAG 引用、工具参数、P95、观测能力和升级成本。',
  },
  {
    bankId: '360-ai-frontend',
    title: /SSE、WebSocket 和轮询怎么选/,
    conclusion: '低频且允许延迟用轮询；服务端单向持续推文本用 SSE 或 fetch 流；双方高频双向通信或传二进制时再用 WebSocket。',
    reason: '选型取决于数据方向、频率、恢复方式和代理兼容性；AI 问答通常是一次 POST 上行、持续流下行，不必只为流式效果引入 WebSocket。',
    application: '把停止、反馈和工具审批留在普通 HTTP 接口，回答增量走 SSE/fetch 流；只有协同编辑、游戏或语音信令再优先 WebSocket。',
  },
  {
    bankId: '360-ai-frontend',
    title: /Vite 和 Webpack/,
    conclusion: 'Webpack 通常先构建完整依赖图再打包；Vite 开发期用原生 ESM 按需转换并预构建依赖，因此冷启动和 HMR 通常更快，生产阶段两者都要打包优化。',
    reason: '差异来自开发期处理依赖的时机与粒度，并不是 Vite“完全不打包”；迁移还要考虑现有 loader、plugin、模块联邦和旧浏览器约束。',
    application: '先测真实项目的冷启动、热更新和生产产物，再盘点自定义 loader、插件与联邦模块，收益覆盖迁移风险后再切换。',
  },
  {
    bankId: '360-ai-frontend',
    title: /AI 输出场景.*XSS/,
    conclusion: 'AI、检索资料和工具结果一律按不可信数据处理：默认作为文本渲染；必须显示富文本时禁用原始 HTML，用成熟白名单清洗并限制 URL 协议。',
    reason: '模型可能输出标签、事件属性或危险链接，而 Markdown 插件和 innerHTML 会把文本送入不同执行上下文，所以仅靠 Prompt 或一次输入过滤挡不住 XSS。',
    application: '用 script、onerror、javascript: 链接和流式未闭合标签做回归；清洗是主防线，CSP 与 Trusted Types 只作为额外保护。',
  },
  {
    bankId: '360-ai-frontend',
    title: /MCP 工具接口如何设计/,
    conclusion: 'MCP 工具链要把能力发现、模型选择、受控执行和结果回传拆成明确阶段；模型只提出调用意图，Host 负责校验、授权和关联结果。',
    reason: '必须分层，是因为模型给出的工具意图带有不确定性；只有 Host 才能强制协议协商、参数约束、资源权限、调用关联以及取消和重试边界。',
    application: '先实现一个只读订单工具：用窄 schema 描述参数，调用前校验当前用户的订单权限，并用 toolCallId 关联进度、结果和日志。',
  },
  {
    bankId: '360-ai-frontend',
    title: /WebSocket 如何防御 CSWSH/,
    conclusion: 'WebSocket 防护分三层：握手校验 WSS、身份与 Origin；每条消息校验 schema 和资源权限；连接数、速率、消息大小与发送队列都设硬上限。',
    reason: 'Cookie 会让恶意站点借用户身份握手，而无限连接、超大消息和慢消费者会耗尽 CPU 或内存，所以来源鉴权与资源配额必须同时做。',
    application: '握手前检查 Origin、会话和用户/IP 配额；建连后限制帧与完整消息大小、消息速率和队列长度，持续超限就取消上游并断开。',
  },
]

const TERM_ENTRIES = [
  [/\bRAG\b/i, 'RAG', '先从资料库找出相关证据，再让模型根据证据回答；它解决的是“知识从哪里来”，不是让模型凭空记住更多事实。'],
  [/\bBM25\b/i, 'BM25', '一种关键词排序算法：词越稀有、在当前文档里越有代表性，分数通常越高；它擅长编号、专有名词和错误码。'],
  [/Embedding|向量(?:检索|召回|搜索)/i, '向量 / Embedding', '把一段文字变成一串数字，使“意思相近”的内容在数学空间里距离更近，便于按语义查找。'],
  [/Rerank(?:er)?|重排/i, '重排 / Rerank', '先用便宜方法找出一批候选，再用更精细的模型重新排序，相当于“海选之后再复试”。'],
  [/\bRRF\b/i, 'RRF', '不直接相加不同检索器的原始分数，而是按各自排名折算后融合，避免分数量纲不同造成误判。'],
  [/Chunk(?:ing)?|切块|文档切分/i, 'Chunk', '把长文档拆成可检索的小段；过大容易夹杂噪声，过小又可能丢失上下文。'],
  [/上下文窗口|context window/i, '上下文窗口', '模型一次调用真正能看到的输入和输出总长度上限，不等同于永久记忆。'],
  [/\bToken\b/i, 'Token', '模型处理文字时使用的基本片段；它可能是一个字、词的一部分或标点，因此不能简单按“一个汉字一个 Token”估算。'],
  [/Prompt Injection|提示注入/i, '提示注入', '不可信内容伪装成指令，诱导模型忽略原规则、泄露数据或调用不该调用的工具。'],
  [/Function Calling|Tool Calling|工具调用/i, '工具调用', '模型只提出“想调用哪个工具、参数是什么”；真正的鉴权、执行、超时与审计仍由应用负责。'],
  [/\bMCP\b|Model Context Protocol/i, 'MCP', '让 AI 应用用统一协议发现和调用外部工具、资源与提示模板；它是连接规范，不是自主决策能力。'],
  [/\bSkill\b|技能包/i, 'Skill', '把某类任务的步骤、边界和可复用资料组织成说明，让 Agent 知道“这件事应该怎样做”。'],
  [/\bAgent\b|智能体/i, 'Agent', '模型在目标和约束下反复规划、调用工具、观察结果，直到完成或触发停止条件的执行循环。'],
  [/\bReAct\b/, 'ReAct', '让 Agent 交替进行推理、行动和观察；重点是受控循环，而不是把模型输出直接当命令执行。'],
  [/幻觉/i, '幻觉', '模型生成了听起来合理、但没有证据支持或与事实不符的内容。'],
  [/Temperature/i, 'Temperature', '控制采样时的随机程度；值更高通常更发散，但不能把它理解成“答案质量旋钮”。'],
  [/Top[ -]?P/i, 'Top P', '只在累计概率达到阈值的一小组候选中采样，用来限制每一步可选词的范围。'],
  [/Transformer/i, 'Transformer', '通过注意力等结构让每个 Token 综合其他位置的信息，是现代大语言模型常见的基础网络。'],
  [/注意力|\bQ、?K、?V\b|\bQKV\b/i, '注意力 / QKV', 'Query 表示“我要找什么”，Key 表示“我能被怎样匹配”，Value 是匹配后真正被加权汇总的内容。'],
  [/\bSSE\b|Server-Sent Events/i, 'SSE', '基于 HTTP 的服务器单向推送；适合服务端持续发送文本事件，浏览器端不需要高频反向发送。'],
  [/WebSocket/i, 'WebSocket', '建立后可让客户端和服务端双向、持续发消息，适合双方都需要高频通信的场景。'],
  [/背压|backpressure/i, '背压', '消费者处理不过来时，把“先慢一点”的信号传回生产者，避免缓冲区无限增长。'],
  [/幂等/i, '幂等', '同一个请求执行一次或重复执行多次，最终业务结果仍一致，例如同一订单不能被重复创建。'],
  [/\bCORS\b/i, 'CORS', '浏览器限制网页脚本跨源读取响应的规则；它不是登录鉴权，也不能阻止非浏览器客户端发请求。'],
  [/\bCSRF\b/i, 'CSRF', '攻击者借用用户浏览器自动携带的登录凭据，诱导它向目标站点发起非本人意愿的操作。'],
  [/\bXSS\b/i, 'XSS', '不可信内容被当成脚本执行，从而读取页面数据、冒充用户操作或窃取可访问的凭据。'],
  [/\bJWT\b/i, 'JWT', '一段带签名的声明，服务端可验证它是否被篡改；payload 通常可读，并不是加密保险箱。'],
  [/\bRBAC\b/i, 'RBAC', '先给角色分配权限，再给用户分配角色；接口最终仍要校验当前用户是否能操作这条具体资源。'],
  [/\bDNS\b/i, 'DNS', '把域名查成 IP 地址的分层查询系统；查到地址后，浏览器还要继续建立 TCP、TLS 和 HTTP 连接。'],
  [/\bTCP\b/i, 'TCP', '提供可靠、有序的字节流；它保证传输层连接，不保证上层 HTTP 路由或业务一定成功。'],
  [/\bTLS\b|HTTPS/i, 'TLS / HTTPS', 'TLS 先验证身份并协商会话密钥，再保护 HTTP 数据的机密性和完整性。'],
  [/事件循环|event loop/i, '事件循环', 'JavaScript 执行完当前任务和微任务后，浏览器才有机会渲染并处理下一批任务。'],
  [/Promise/i, 'Promise', '表示一个未来才完成的异步结果；它统一成功和失败的传递，但本身不是线程。'],
  [/闭包/i, '闭包', '函数连同它创建时可访问的外层变量环境；即使外层函数结束，这些被引用的变量仍可继续存在。'],
  [/原型链|prototype/i, '原型链', '对象自身找不到属性时，会沿内部原型链接逐层向上查找，直到找到或到达 null。'],
  [/暂时性死区|\bTDZ\b/i, '暂时性死区', '进入作用域后、let/const 声明真正初始化前的区间；变量已经被占用，但此时访问会报错。'],
  [/\bProxy\b/i, 'Proxy', '在对象外包一层代理，统一拦截读取、写入、删除等操作。'],
  [/\bReflect\b/i, 'Reflect', '用函数形式执行对象底层操作，并返回更统一的结果，常与 Proxy 配合保留原本语义。'],
  [/防抖/i, '防抖', '连续触发时不断重新计时，等用户停下一小段时间后只执行最后一次。'],
  [/(?<!字)节流/i, '节流', '持续触发期间按固定时间窗口最多执行一次，保留持续反馈但限制频率。'],
  [/虚拟 DOM|Virtual DOM/i, '虚拟 DOM', '用 JavaScript 对象描述界面；框架比较前后描述后，再把必要变化提交到真实 DOM。'],
  [/Hydration|水合/i, 'Hydration', '客户端在服务端已经生成的 HTML 上接管事件和状态，而不是把首屏 DOM 全部推倒重建。'],
  [/\bFiber\b/i, 'Fiber', 'React 用来保存组件工作单元和调度信息的数据结构，使渲染工作可以分段和按优先级处理。'],
  [/Tree[- ]?shaking/i, 'Tree shaking', '构建时删除能静态确认未被使用的导出；动态写法和副作用会影响它的判断。'],
  [/\bSSR\b|\bCSR\b|\bSSG\b/i, 'CSR / SSR / SSG', 'CSR 在浏览器生成页面，SSR 在请求时由服务端生成 HTML，SSG 在构建时预生成 HTML。'],
  [/Web Worker/i, 'Web Worker', '浏览器里的后台线程环境，适合把重计算移出主线程，但不能直接操作 DOM。'],
  [/\bB\+?Tree\b|B\+?树/i, 'B+Tree', '数据库常用的多叉有序索引树；内部节点负责导航，叶子页有序相连，点查和范围查都较高效。'],
  [/聚簇索引|回表|覆盖索引/i, '聚簇索引 / 回表', '聚簇索引的叶子保存整行；二级索引先找到主键后再查整行叫回表，索引已含所需列则可避免回表。'],
  [/最左前缀/i, '最左前缀', '联合索引按从左到右的列顺序排列；跳过左侧列后，后续列通常无法继续缩小有序查找范围。'],
  [/\bMVCC\b/i, 'MVCC', '保存数据的多个版本，让读操作按快照取值，从而减少读写互相阻塞。'],
  [/\bACID\b/i, 'ACID', '事务需要保证原子性、一致性、隔离性和持久性；它描述目标，不代表所有业务约束会自动成立。'],
  [/redo log|undo log|binlog/i, 'redo / undo / binlog', 'redo 负责崩溃恢复，undo 保存旧版本并支持回滚/MVCC，binlog 记录逻辑变更用于复制和恢复。'],
  [/缓存穿透|缓存击穿|缓存雪崩/i, '穿透 / 击穿 / 雪崩', '分别是查不存在的数据、热点键突然失效、以及大量键同时失效，它们导致数据库压力的原因不同。'],
  [/Cache Aside/i, 'Cache Aside', '应用先读缓存，未命中再读数据库并回填；写入通常先改数据库，再让缓存失效。'],
  [/分布式锁/i, '分布式锁', '让多台服务竞争同一份互斥资格；锁必须有唯一持有者标识、过期策略和安全释放条件。'],
  [/消息队列|\bMQ\b|Kafka|RocketMQ|RabbitMQ/i, '消息队列', '生产者先把事件交给中间件，消费者异步处理，从而削峰、解耦并允许失败重试。'],
  [/\bCAP\b|\bBASE\b/, 'CAP / BASE', '网络分区发生时，分布式系统必须在强一致与可用之间取舍；BASE 强调用最终一致等方式换取可用性。'],
  [/熔断|降级|限流/i, '限流 / 熔断 / 降级', '限流控制进入量，熔断暂时停止调用持续失败的依赖，降级则用较弱但可用的能力维持核心流程。'],
  [/\bIoC\b|依赖注入/i, 'IoC / 依赖注入', '对象不再自己创建依赖，而由容器在组装应用时把依赖传进来。'],
  [/\bAOP\b/i, 'AOP', '把日志、事务等横切逻辑放到代理层统一执行，业务方法本身只保留核心逻辑。'],
  [/@Transactional|声明式事务/i, '声明式事务', 'Spring 通过代理在方法前开启事务、方法后提交或回滚；绕过代理调用时，这层事务逻辑不会生效。'],
  [/\bJVM\b/i, 'JVM', '运行 Java 字节码的虚拟机，负责类加载、执行、内存管理和垃圾回收等运行时工作。'],
  [/\bJDK\b|\bJRE\b/i, 'JDK / JRE', 'JDK 是开发工具加运行环境；JRE 是运行 Java 程序所需环境，而 JVM 是其中真正执行字节码的核心。'],
  [/垃圾回收|\bGC\b/i, 'GC', 'JVM 找出不再可达的对象并回收内存；不同收集器在停顿、吞吐和占用之间做不同取舍。'],
  [/happens-before|Java 内存模型|\bJMM\b/i, 'JMM / happens-before', 'JMM 规定线程怎样看到共享内存；happens-before 是判断一个操作结果是否保证对另一个操作可见的规则。'],
  [/\bvolatile\b/i, 'volatile', '保证对该变量的读写可见并限制部分重排序，但复合操作如 i++ 仍不是原子的。'],
  [/\bsynchronized\b/i, 'synchronized', '进入同一监视器的代码同一时刻只允许一个线程执行，并在加解锁间建立可见性保证。'],
  [/\bCAS\b/i, 'CAS', '比较内存中的旧值是否仍等于预期，只有相等才写入新值；失败者通常重试。'],
  [/\bAQS\b/i, 'AQS', '用一个同步状态、等待队列和获取/释放模板支撑 ReentrantLock、Semaphore 等并发工具。'],
  [/ThreadPoolExecutor|线程池/i, '线程池', '复用有限数量的线程处理任务，并用队列、最大线程数和拒绝策略明确过载边界。'],
  [/ThreadLocal/i, 'ThreadLocal', '为每个线程保存一份独立值；在线程池中线程会复用，因此用完需要 remove，避免串数据和长期占用。'],
  [/HashMap/i, 'HashMap', '先用哈希定位桶，再在桶内比较 key；冲突较多时链表可能树化，容量到阈值后会扩容。'],
  [/类加载|双亲委派/i, '类加载 / 双亲委派', '类加载器先把同名类的查找交给父级，父级找不到才自己尝试，避免核心类被随意替换。'],
  [/\bNIO\b|ByteBuffer|Buffer/i, 'NIO Buffer', '用 position、limit 和 capacity 描述当前可读写区间；flip 是从写模式切到读模式，不是复制数据。'],
  [/\bGit\b.*(?:暂存区|工作区)|暂存区/i, '工作区 / 暂存区 / 提交', '工作区是当前文件，暂存区是下一次提交的快照，提交则把暂存区内容永久记录进历史。'],
  [/\brebase\b/i, 'rebase', '把一串提交重新接到新的基点上，历史更直，但会改写这些提交的身份。'],
  [/\breflog\b/i, 'reflog', '记录本地引用曾经指向哪里，即使分支指针移动，也常能用它找回尚未被清理的提交。'],
  [/反向代理/i, '反向代理', '客户端只访问统一入口，由入口把请求转发给内部服务，并集中处理 TLS、路由、缓存或限流。'],
  [/负载均衡/i, '负载均衡', '把请求分配给多个健康实例，目标是避免单点过载并提高可用性。'],
  [/Cloudflare Tunnel|cloudflared|隧道/i, 'Cloudflare Tunnel', '由连接器主动向云端建立出站连接，再把公网请求转到内网服务，不需要直接开放家庭入站端口。'],
]

const CODE_RULES = [
  {
    banks: ['java-foundations'], title: /BigDecimal/,
    language: 'java', intro: '金额要用字符串构造，并显式指定舍入规则：',
    code: `BigDecimal price = new BigDecimal("19.90");
BigDecimal count = new BigDecimal("3");
BigDecimal total = price.multiply(count)
    .setScale(2, RoundingMode.HALF_UP);
System.out.println(total); // 59.70`,
  },
  {
    banks: ['java-foundations'], title: /值传递还是引用传递/,
    language: 'java', intro: '下面同时验证“改对象内容”和“改形参指向”是两回事：',
    code: `static void change(List<String> value) {
    value.add("inside");   // 修改双方指向的同一个对象
    value = new ArrayList<>(); // 只改了形参自己的副本
}

List<String> names = new ArrayList<>();
change(names);
System.out.println(names); // [inside]`,
  },
  {
    banks: ['java-foundations'], title: /equals 和 hashCode/,
    language: 'java', intro: '值对象通常同时实现 equals 与 hashCode：',
    code: `record UserId(long value) {}

Set<UserId> ids = new HashSet<>();
ids.add(new UserId(7));
System.out.println(ids.contains(new UserId(7))); // true`,
  },
  {
    banks: ['java-foundations'], title: /泛型.*类型擦除/,
    language: 'java', intro: '泛型在编译期约束类型，运行期通常只保留擦除后的边界：',
    code: `List<String> names = new ArrayList<>();
names.add("Linda");
String first = names.get(0); // 编译器插入必要的类型转换

System.out.println(names.getClass() == new ArrayList<Integer>().getClass());
// true：运行时看到的都是 ArrayList`,
  },
  {
    banks: ['java-foundations'], title: /遍历集合.*安全删除|fail-fast/i,
    language: 'java', intro: '遍历时通过当前 Iterator 删除，才能同步维护游标和修改计数：',
    code: `Iterator<String> it = names.iterator();
while (it.hasNext()) {
    if (it.next().isBlank()) {
        it.remove();
    }
}`,
  },
  {
    banks: ['java-foundations'], title: /volatile 能保证/,
    language: 'java', intro: 'volatile 能让停止信号及时可见，但不能让自增变成原子操作：',
    code: `private volatile boolean running = true;

void stop() { running = false; }
void loop() {
    while (running) {
        doOneStep();
    }
}
// volatile int count; count++ 仍可能丢失更新`,
  },
  {
    banks: ['java-foundations'], title: /ThreadPoolExecutor 的核心参数/,
    language: 'java', intro: '一个有界线程池必须把容量和拒绝策略写清楚：',
    code: `@Service
final class WorkerPool {
  private final ExecutorService pool = new ThreadPoolExecutor(
    4, 8, 30, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(200),
    new ThreadPoolExecutor.CallerRunsPolicy()
  );

  void submit(Runnable task) { pool.execute(task); }

  @PreDestroy
  void stop() { pool.shutdown(); }
}`,
  },
  {
    banks: ['java-foundations'], title: /ThreadLocal 的原理/,
    language: 'java', intro: '在线程池任务里要用 finally 清理，避免下一次任务读到旧值：',
    code: `private static final ThreadLocal<String> TRACE_ID = new ThreadLocal<>();

void handle(String traceId) {
    try {
        TRACE_ID.set(traceId);
        service.call();
    } finally {
        TRACE_ID.remove();
    }
}`,
  },
  {
    banks: ['java-foundations'], title: /CompletableFuture/,
    language: 'java', intro: '并行任务要在一个地方定义组合关系和异常出口：',
    code: `CompletableFuture<User> user = CompletableFuture
    .supplyAsync(() -> loadUser(id), ioPool);
CompletableFuture<List<Order>> orders = CompletableFuture
    .supplyAsync(() -> loadOrders(id), ioPool);

CompletableFuture<Profile> profile = user
    .thenCombine(orders, Profile::new)
    .orTimeout(800, TimeUnit.MILLISECONDS)
    .exceptionally(error -> Profile.fallback(id));`,
  },
  {
    banks: ['java-foundations'], title: /Stream 的执行模型/,
    language: 'java', intro: '中间操作是惰性的，遇到终止操作才真正拉取数据：',
    code: `List<String> result = names.stream()
    .filter(name -> !name.isBlank())
    .map(String::trim)
    .distinct()
    .limit(10)
    .toList();`,
  },
  {
    banks: ['java-foundations'], title: /Optional 应该怎样使用/,
    language: 'java', intro: 'Optional 适合作为“可能没有结果”的返回值，不适合塞进所有字段：',
    code: `Optional<User> findUser(long id) {
    return repository.findById(id);
}

String displayName = findUser(id)
    .map(User::displayName)
    .orElse("游客");`,
  },
  {
    banks: ['java-backend-interviews'], title: /Spring IoC|依赖注入/,
    language: 'java', intro: '构造器注入能让依赖在对象创建时就完整、可测试：',
    code: `@Service
class OrderService {
    private final OrderRepository repository;

    OrderService(OrderRepository repository) {
        this.repository = repository;
    }
}`,
  },
  {
    banks: ['java-backend-interviews'], title: /@Transactional 为什么会失效/,
    language: 'java', intro: '同类内部调用没有经过 Spring 代理，因此事务拦截器不会执行：',
    code: `@Service
class ImportService {
    void importAll() {
        saveOne(); // this.saveOne()：绕过代理
    }

    @Transactional
    public void saveOne() { /* ... */ }
}
// 修复：把事务方法移到另一个 Bean，或从代理边界调用。`,
  },
  {
    banks: ['java-backend-interviews'], title: /联合索引.*最左前缀/,
    language: 'sql', intro: '同一个索引对不同查询的利用程度并不一样：',
    code: `CREATE INDEX idx_order_user_status_time
ON orders(user_id, status, created_at);

-- 能连续利用 user_id、status，再对 created_at 做范围
SELECT id FROM orders
WHERE user_id = 7 AND status = 'PAID'
  AND created_at >= '2026-08-01';`,
  },
  {
    banks: ['java-backend-interviews'], title: /事务隔离级别和并发异常/,
    language: 'sql', intro: '用两个会话观察同一行，才能真正理解不可重复读：',
    code: `-- 会话 A
START TRANSACTION;
SELECT balance FROM account WHERE id = 1; -- 100

-- 会话 B 更新为 80 并提交后，会话 A 再查询
SELECT balance FROM account WHERE id = 1;
-- READ COMMITTED 可能看到 80；REPEATABLE READ 通常仍看到 100`,
  },
  {
    banks: ['java-backend-interviews'], title: /缓存穿透、击穿和雪崩/,
    language: 'java', intro: '热点键回源时可用“缓存空值 + 单飞”缩小数据库压力：',
    code: `Product value = cache.get(key);
if (value != null) return value;

return singleFlight.execute(key, () -> {
    Product loaded = repository.find(key);
    cache.put(key, loaded == null ? EMPTY : loaded, jitteredTtl());
    return loaded;
});`,
  },
  {
    banks: ['java-backend-interviews'], title: /Cache Aside/,
    language: 'java', intro: '数据库是事实源，写入成功后让缓存失效，并记录失败补偿：',
    code: `@Transactional
public void rename(long id, String name) {
    repository.rename(id, name);
    afterCommit(() -> {
        if (!cache.delete("user:" + id)) {
            retryQueue.publish(new CacheEvict(id));
        }
    });
}`,
  },
  {
    banks: ['java-backend-interviews'], title: /重复消费.*幂等/,
    language: 'sql', intro: '业务幂等应落在可靠存储的唯一约束上，而不是只靠内存标记：',
    code: `CREATE UNIQUE INDEX uk_consumer_message
ON consumed_message(consumer_name, message_id);

-- 同一事务内：先插入消费记录，再更新业务数据；
-- 唯一键冲突表示这条消息已经处理过。`,
  },
  {
    banks: ['java-backend-interviews'], title: /超时、重试和幂等/,
    language: 'java', intro: '重试必须同时带总预算、退避和幂等键：',
    code: `for (int attempt = 1; attempt <= 3; attempt++) {
    try {
        return client.createOrder(request, idempotencyKey, remainingBudget());
    } catch (RetryableException error) {
        sleep(withJitter(backoff(attempt)));
    }
}
throw new ServiceUnavailableException();`,
  },
  {
    banks: ['java-backend-interviews'], title: /#\{\} 和 \$\{\}/,
    language: 'xml', intro: '#{} 绑定参数；${} 直接拼接文本，只有白名单标识符才可考虑：',
    code: `<select id="findByName" resultType="User">
  SELECT id, name FROM user
  WHERE name = #{name}
  ORDER BY created_at DESC
</select>`,
  },
  {
    banks: ['java-ai-applications'], title: /结构化输出/,
    language: 'java', intro: '先定义业务结构，再让模型输出经过 schema 校验的对象：',
    code: `record Ticket(String category, int priority, String summary) {}

Ticket ticket = chatClient.prompt()
    .user(userMessage)
    .call()
    .entity(Ticket.class);
validate(ticket); // 业务枚举、范围和权限仍需应用校验`,
  },
  {
    banks: ['java-ai-applications'], title: /工具调用是怎样工作|ToolCallback/i,
    language: 'java', intro: '工具只暴露窄参数和窄返回值，业务权限仍在方法内部校验：',
    code: `@Tool(description = "查询当前用户自己的订单")
OrderView findOrder(@ToolParam(description = "订单号") String orderId) {
    User user = security.currentUser();
    return orders.findOwnedBy(user.id(), orderId);
}`,
  },
  {
    banks: ['java-ai-applications'], title: /MCP 是什么/,
    language: 'json', intro: 'MCP 的一次调用会明确工具名和结构化参数，服务端再做真正执行：',
    code: `{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "search_docs",
    "arguments": { "query": "退款规则", "limit": 5 }
  }
}`,
  },
  {
    banks: ['java-ai-applications'], title: /VectorStore、SearchRequest/,
    language: 'java', intro: '检索请求同时写清查询、Top K、阈值和业务过滤条件：',
    code: `UUID tenantId = security.currentUser().tenantId();
SearchRequest request = SearchRequest.builder()
    .query(question)
    .topK(12)
    .similarityThreshold(0.72)
    // tenantId 是服务端会话中的 UUID，不接收模型或用户拼接文本
    .filterExpression("tenantId == '" + tenantId + "'")
    .build();

List<Document> evidence = vectorStore.similaritySearch(request);`,
  },
  {
    banks: ['java-ai-applications'], title: /Java 流式接口.*SSE/,
    language: 'java', intro: '流必须把取消和异常沿 Reactor 链传下去，而不是只不断 onNext：',
    code: `@GetMapping(value = "/answer", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
Flux<ServerSentEvent<String>> answer() {
    return model.stream(prompt)
        .takeUntilOther(cancelSignal)
        .timeout(Duration.ofSeconds(30))
        .map(chunk -> ServerSentEvent.builder(chunk).event("delta").build());
}`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /Fetch 流式响应/,
    language: 'ts', intro: '网络 chunk 不是完整消息，必须保留半包并在取消时停止读取：',
    code: `const response = await fetch('/api/chat', { signal });
const reader = response.body!
  .pipeThrough(new TextDecoderStream())
  .getReader();

let buffer = '';
for (;;) {
  const { value = '', done } = await reader.read();
  buffer += value;
  // SSE 允许 CRLF、LF 或 CR；分隔符被拆包时会继续留在 buffer 中。
  const frames = buffer.split(/\\r\\n\\r\\n|\\n\\n|\\r\\r/);
  buffer = frames.pop() ?? '';
  frames.forEach(handleSseFrame);
  if (done) break;
}`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /iframe 沙箱|postMessage/i,
    language: 'ts', intro: '接收消息时同时校验来源窗口、origin 和消息 schema：',
    code: `window.addEventListener('message', (event) => {
  if (event.source !== preview.contentWindow) return;
  if (event.origin !== PREVIEW_ORIGIN) return;
  const message = PreviewMessage.safeParse(event.data);
  if (!message.success) return;
  handlePreviewEvent(message.data);
});`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /工具调用.*Allowlist|最小权限/i,
    language: 'ts', intro: '模型给出的名字和参数都必须重新经过应用白名单与 schema：',
    code: `const tool = allowedTools.get(call.name);
if (!tool) throw new Error('tool_not_allowed');

const args = tool.schema.parse(call.arguments);
authorize(user, tool.permission, args);
const result = await withTimeout(tool.execute(args), tool.timeoutMs);`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /Text-to-SQL/,
    language: 'ts', intro: '不要直接执行模型文本；先解析 AST，再限制语句、表、租户和成本：',
    code: `const ast = parseSql(modelOutput);
assertSelectOnly(ast);
assertTablesAllowed(ast, ['orders', 'products']);
injectTenantPredicate(ast, tenantId);
assertEstimatedRows(ast, { max: 50_000 });
return readOnlyPool.query(printSql(ast));`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /历史消息.*滚动|滚动.*不抢位置/,
    language: 'ts', intro: '只有用户仍贴近底部时才自动跟随，否则显示“有新消息”提示：',
    code: `const nearBottom = scrollHeight - scrollTop - clientHeight < 80;

function onNewChunk() {
  if (nearBottom) {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
  } else {
    setUnread((count) => count + 1);
  }
}`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /流式 Markdown/,
    language: 'ts', intro: '把已闭合内容与仍在增长的尾部拆开，避免每个 Token 重解析整篇：',
    code: `const { stable, pending } = splitStableMarkdown(buffer);

if (stable !== previousStable) {
  renderCommittedBlocks(parseMarkdown(stable));
}
renderPendingTail(escapeText(pending));
// 代码围栏闭合后，再把 pending 提交为稳定块。`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /图表配置不可信|schema 校验/i,
    language: 'ts', intro: '生成配置先通过白名单 schema，再映射成真正的图表配置：',
    code: `const ChartSpec = z.object({
  type: z.enum(['line', 'bar']),
  x: z.array(z.string()).max(500),
  series: z.array(z.object({ name: z.string(), data: z.array(z.number()) })).max(12),
}).strict();

const spec = ChartSpec.parse(JSON.parse(modelText));
chart.setOption(toSafeEChartsOption(spec));`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /Base64.*Blob|Blob.*预览/i,
    language: 'ts', intro: '大文件使用对象 URL，并在替换或卸载时主动释放：',
    code: `const objectUrl = URL.createObjectURL(fileBlob);
preview.src = objectUrl;

return () => {
  preview.removeAttribute('src');
  URL.revokeObjectURL(objectUrl);
};`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /权限过滤.*来源引用|检索前权限/i,
    language: 'ts', intro: '权限过滤必须进入检索条件，不能先召回别人的资料再在界面隐藏：',
    code: `const evidence = await vectorStore.search({
  query,
  topK: 12,
  filter: {
    tenantId: session.tenantId,
    acl: { anyOf: session.roles },
    effectiveAt: { lte: new Date() },
  },
});`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /工具链执行到一半失败|重试、回滚和交给人/,
    language: 'ts', intro: '每一步保存状态和幂等键；只对明确可重试的失败重试：',
    code: `const step = await runs.startStep({ runId, name, idempotencyKey });
try {
  const result = await tool.execute(args, { signal, idempotencyKey });
  await runs.completeStep(step.id, result);
} catch (error) {
  await runs.failStep(step.id, classify(error));
  if (!isSafeToRetry(error)) return handoffToHuman(runId);
  throw error;
}`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /模型超时、限流或卡死|熔断与故障转移/,
    language: 'ts', intro: '备用模型不是无条件重放；要先判断请求是否有副作用和剩余预算：',
    code: `try {
  return await primary.complete(request, { signal, timeoutMs: 12_000 });
} catch (error) {
  if (!isRetryable(error) || budget.remainingMs < 4_000) throw error;
  circuitBreaker.recordFailure(error);
  return fallback.complete(adaptRequest(request), { signal, timeoutMs: 4_000 });
}`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /Markdown、HTML 与链接.*安全渲染/,
    language: 'tsx', intro: 'Markdown 默认按文本渲染，并把链接协议收窄到显式白名单：',
    code: `const TRUSTED_LINK_HOSTS = new Set(['developer.mozilla.org', 'docs.example.com']);

function safeMarkdownUrl(url: string, key: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    if (key === 'src') {
      return parsed.origin === window.location.origin ? parsed.href : '';
    }
    if (parsed.origin === window.location.origin) return parsed.href;
    return parsed.protocol === 'https:' && TRUSTED_LINK_HOSTS.has(parsed.hostname)
      ? parsed.href
      : '';
  } catch {
    return '';
  }
}

<ReactMarkdown skipHtml urlTransform={safeMarkdownUrl}>
  {modelText}
</ReactMarkdown>`,
  },
  {
    banks: ['frontend-ai-interviews'], title: /幂等重试、背压与并发控制/,
    language: 'ts', intro: '每个回答运行独立取消，并用信号量限制单用户并发：',
    code: `await userSemaphore.acquire(userId, { limit: 2, signal });
try {
  return await streamAnswer({
    runId,
    idempotencyKey,
    signal,
    maxBufferedBytes: 256 * 1024,
  });
} finally {
  userSemaphore.release(userId);
}`,
  },
]

const VISUAL_RULES = [
  {
    banks: ['java-foundations'], title: /Stream 的执行模型/,
    src: '/content/diagrams/java-foundations/stream-pipeline-v1.svg',
    alt: 'Java Stream 从数据源经过惰性中间操作到终止操作的执行流程图',
    caption: '中间操作只描述流水线，终止操作才开始拉取元素；短路操作可以提前结束。',
  },
  {
    banks: ['frontend-ai-interviews', 'java-ai-applications', '360-ai-frontend'], title: /BM25.*向量|混合检索|RRF/,
    src: '/content/diagrams/ai/hybrid-retrieval-fusion-v1.svg',
    alt: 'BM25 关键词召回与向量语义召回经过排名融合和重排的流程图',
    caption: '两路原始分数量纲不同；可按名次用 RRF 融合，再由 Reranker 精排。',
  },
  {
    banks: ['frontend-ai-interviews', 'java-ai-applications', '360-ai-frontend'], title: /MCP|Skill.*工具|工具.*Skill/,
    src: '/content/diagrams/ai/mcp-agent-tool-boundary-v1.svg',
    alt: 'Agent、Skill、MCP 客户端、MCP Server 与外部系统之间的职责边界图',
    caption: 'Skill 说明做法，Agent 决定步骤，MCP 统一连接能力，真正的权限仍由可信应用与服务端控制。',
  },
  {
    banks: ['java-backend-interviews'], title: /Spring MVC 一次请求/,
    src: '/content/diagrams/java-backend/spring-request-lifecycle-v1.svg',
    alt: 'Spring MVC 请求从 Filter、DispatcherServlet 到 Controller、Service 和 Repository 的调用链图',
    caption: '认证、路由、业务事务和数据访问位于不同边界；异常也要沿统一链路转换和记录。',
  },
  {
    banks: ['java-backend-interviews'], title: /事务隔离级别|MVCC/,
    src: '/content/diagrams/database-cache/mvcc-snapshot-v1.svg',
    alt: '两个事务通过 Read View 和版本链读取不同数据版本的 MVCC 快照图',
    caption: '一致性读根据 Read View 选择可见版本；当前读和加锁读走的是另一条并发控制路径。',
  },
  {
    banks: ['frontend-ai-interviews', 'network-deployment', '360-ai-frontend'], title: /(?:SSE\s*\/\s*WebSocket.*(?:鉴权|重连|安全|攻击|防护)|WebSocket.*(?:防御|CSWSH|消息洪泛|连接耗尽|鉴权|安全)|流式请求.*(?:背压|并发))/,
    src: '/content/diagrams/network-deployment/realtime-channel-guardrails-v1.svg',
    alt: 'SSE 与 WebSocket 连接在握手、鉴权、Origin、限流和背压上的安全防线图',
    caption: '连接建立前校验身份与来源，连接期间再限制消息大小、速率、并发和空闲时间。',
  },
]

function sectionKind(line) {
  const value = line.trim()
  return SECTION_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0]
}

function fenceToken(line) {
  const match = String(line).match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
  if (!match) return undefined
  return {
    character: match[1][0],
    length: match[1].length,
    canClose: match[2].trim() === '',
  }
}

function closesFence(token, fence) {
  return Boolean(token
    && token.canClose
    && token.character === fence.character
    && token.length >= fence.length)
}

function locateSections(lines) {
  const markers = []
  let fence
  lines.forEach((line, index) => {
    const token = fenceToken(line)
    if (fence) {
      if (closesFence(token, fence)) fence = undefined
      return
    }
    if (token) {
      fence = token
      return
    }
    const kind = sectionKind(line)
    if (kind) markers.push({ kind, marker: index, start: index + 1 })
  })
  return markers.map((item, index) => ({
    ...item,
    end: markers[index + 1]?.marker ?? lines.length,
  }))
}

function hasMarkerOutsideFence(lines, marker) {
  let fence
  for (const line of lines) {
    const token = fenceToken(line)
    if (fence) {
      if (closesFence(token, fence)) fence = undefined
      continue
    }
    if (token) {
      fence = token
      continue
    }
    if (line.trim() === marker) return true
  }
  return false
}

function collapseBlankLinesOutsideFences(lines) {
  const result = []
  let fence
  let previousBlank = false
  for (const line of lines) {
    const token = fenceToken(line)
    if (fence) {
      result.push(line)
      if (closesFence(token, fence)) fence = undefined
      continue
    }
    if (token) {
      fence = token
      previousBlank = false
      result.push(line)
      continue
    }
    const blank = line.trim() === ''
    if (blank && previousBlank) continue
    result.push(line)
    previousBlank = blank
  }
  return result
}

function markdownText(value) {
  const withoutLargeBlocks = String(value ?? '')
    .replace(/(```|~~~)[\s\S]*?\1/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/(?:^|\n)(?:\s*\|[^\n]*\|\s*(?:\n|$)){2,}/g, '\n')
  return toString(markdownParser.parse(withoutLargeBlocks))
    .replace(/(?:先背答案|短回答|题解|关键词翻译|原理(?:\s*\/?\s*流程)?|机制拆解|技术原理|先解释为什么要这样做|为什么这样回答|代码\s*\/\s*场景|排查\s*\/\s*场景|项目\s*\/\s*场景|项目场景|项目落点|场景拆解|排查顺序|量化(?:定位|判据|验证)|验证(?:步骤|方法|清单))[：:]\s*/g, '')
    .replace(/(?:^|\s)答[：:]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSentences(value) {
  return markdownText(value)
    // A semicolon only separates clauses. Treating it as a sentence boundary
    // left summaries such as "按 userId 过滤；" visibly unfinished.
    .split(/(?<=[。！？])|(?<=[.!?])\s+(?=[A-Z\u4e00-\u9fff])/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 8 && !/^校验日期/.test(item))
    // Source and provenance labels are evidence about an answer, never the
    // answer or its mechanism. Legacy questions sometimes have no explicit
    // mechanism section, so without this guard the source block could become
    // the first-screen “为什么”.
    .filter((item) => !/^(?:参考来源|资料来源|题源(?:说明)?|社区题源|官方校验|来源说明)[：:]/u.test(item))
    .filter((item) => !/^(?:这道题|本题|真实面经|牛客公开面经).{0,48}(?:来自|题源|面经|延伸|不冒充)/u.test(item))
    // Removing a fenced example can leave an introduction such as
    // “长数据需要应用层 framing，例如：”.  It is useful in the full answer,
    // but it is not a complete first-screen sentence by itself.
    .filter((item) => !/(?:例如|比如|示例|如下|包括|分为|格式为|命令为|代码为|写法为|具体是|具体如下|可写成)[：:]?$/u.test(item))
}

function finishSummarySentence(value) {
  const sentence = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[，,；;：:…\s]+$/u, '')
  if (!sentence) return ''
  return /[。！？!?]$/u.test(sentence) ? sentence : `${sentence}。`
}

function clauseBreaks(value) {
  const strong = []
  const soft = []
  let inInlineCode = false
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '`') {
      inInlineCode = !inInlineCode
      continue
    }
    if (inInlineCode) continue
    if (/[。！？!?；;]/u.test(value[index])) strong.push(index)
    else if (/[，,]/u.test(value[index])) soft.push(index)
  }
  return { strong, soft }
}

function clipSummarySentence(value, maximum) {
  const sentence = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (sentence.length <= maximum) return finishSummarySentence(sentence)

  const { strong, soft } = clauseBreaks(sentence)
  const minimum = Math.floor(maximum * 0.55)
  const beforeLimit = (positions) => positions.filter((index) => index >= minimum && index < maximum).at(-1)
  const shortlyAfterLimit = (positions) => positions.find((index) => index >= maximum && index <= maximum + 32)
  const cutAt = beforeLimit(strong)
    ?? shortlyAfterLimit(strong)
    ?? beforeLimit(soft)
    ?? shortlyAfterLimit(soft)

  if (cutAt !== undefined) return finishSummarySentence(sentence.slice(0, cutAt + 1))

  // A technical identifier must not become imports… or execution…. If there is
  // no clause boundary nearby, keep a whole word and close it as a sentence.
  const window = sentence.slice(0, maximum + 24)
  const wordBreak = Math.max(window.lastIndexOf(' '), window.lastIndexOf('、'))
  const safeEnd = wordBreak >= minimum ? wordBreak : maximum
  return finishSummarySentence(window.slice(0, safeEnd))
}

function takeSentences(value, { maximum = 160, count = 2 } = {}) {
  const result = []
  let length = 0
  for (const sentence of splitSentences(value)) {
    const completed = clipSummarySentence(sentence, result.length ? maximum - length : maximum)
    if (!completed) continue
    if (result.length && length + completed.length > maximum) break
    result.push(completed)
    length += completed.length
    if (result.length >= count || length >= maximum) break
  }
  return result.join(' ').trim()
}

function normalizedComparable(value) {
  return markdownText(value).toLowerCase().replace(/[\s，,。；;：:！？!?、“”‘’`()[\]{}<>/\\_-]/g, '')
}

function characterBigrams(value) {
  if (value.length < 2) return new Set(value ? [value] : [])
  return new Set(Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2)))
}

function summarySimilarity(left, right) {
  const normalizedLeft = normalizedComparable(left)
  const normalizedRight = normalizedComparable(right)
  if (!normalizedLeft || !normalizedRight) return 0
  if (normalizedLeft === normalizedRight) return 1

  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft
  if (shorter.length >= 12 && longer.includes(shorter)) return shorter.length / longer.length >= 0.55 ? 1 : 0

  const leftPairs = characterBigrams(normalizedLeft)
  const rightPairs = characterBigrams(normalizedRight)
  const overlap = [...leftPairs].filter((pair) => rightPairs.has(pair)).length
  return (2 * overlap) / (leftPairs.size + rightPairs.size || 1)
}

function isHighlySimilar(value, excluded) {
  return excluded.some((item) => summarySimilarity(value, item) >= 0.72)
}

function sentenceScore(value, patterns) {
  return patterns.reduce((score, pattern, index) => (
    score + (pattern.test(value) ? patterns.length - index : 0)
  ), 0)
}

function bestDistinctSentence(items, excluded, patterns) {
  return items
    .filter((item) => !/[？?]$/.test(item))
    .filter((item) => !isHighlySimilar(item, excluded))
    .map((item, index) => ({ item, index, score: sentenceScore(item, patterns) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.item
}

function titleRelevance(value, title) {
  const normalizedTitle = normalizedComparable(title)
    .replace(/^q\d+(?:\.\d+)?/i, '')
    .replace(/为什么|是什么|有哪些|如何|怎样|怎么|是否|能否|分别|何时|什么|的|和|与/g, '')
  if (normalizedTitle.length < 2) return 0
  const titlePairs = characterBigrams(normalizedTitle)
  const valuePairs = characterBigrams(normalizedComparable(value))
  const overlap = [...titlePairs].filter((pair) => valuePairs.has(pair)).length
  return overlap / titlePairs.size
}

function bestReasonSentence(primary, fallback, excluded, patterns, title) {
  const usable = (items) => items
    .filter((item) => !/[？?]$/.test(item))
    .filter((item) => !isHighlySimilar(item, excluded))

  // The mechanism section is authored in explanation order.  Preserve that
  // order rather than allowing a later sentence with more title keywords to
  // win; the latter repeatedly surfaced remedies (Golden Set, PgBouncer,
  // Keyset) in the “为什么” slot instead of the mechanism they address.
  const fallbackCandidates = usable(fallback)
  const primaryCandidates = usable(primary)
  return fallbackCandidates.find((item) => !isBareOutcomeSentence(item))
    ?? fallbackCandidates[0]
    ?? primaryCandidates.find((item) => !isBareOutcomeSentence(item))
    ?? primaryCandidates[0]
}

function isBareOutcomeSentence(value) {
  const sentence = String(value ?? '').trim()
  if (sentence.replace(/\s/g, '').length > 48) return false
  if (/因为|由于|所以|因此|之所以|本质|意味着|导致|从而|使得|取决于/u.test(sentence)) return false
  return /^(?:结果(?:分别)?是|返回值是|答案是|默认结果是|通常(?:依次)?输出|表达式会抛出|主要风险是|默认会得到)/u.test(sentence)
}

function expandedReason(selected, primary, fallback, conclusion) {
  const sources = [fallback, primary]
  const source = sources.find((items) => items.includes(selected)) ?? []
  const index = source.indexOf(selected)
  if (selected.replace(/\s/g, '').length >= 52 || index < 0) {
    return takeSentences(selected, { maximum: 128, count: 1 })
  }

  const next = source.slice(index + 1).find((item) => (
    !/[？?]$/.test(item)
    && !isBareOutcomeSentence(item)
    && !isHighlySimilar(item, [conclusion, selected])
  ))
  return takeSentences(next ? `${selected} ${next}` : selected, {
    maximum: 128,
    count: next ? 2 : 1,
  })
}

function bestWhyReasonSentence(primary, fallback, excluded) {
  const usable = (items) => items
    .filter((item) => !/[？?]$/.test(item))
    .filter((item) => !isHighlySimilar(item, excluded))

  // A “为什么” question should start from the authored mechanism, not from a
  // later workaround, caveat or recommendation.  Authors consistently put the
  // causal chain at the beginning of the mechanism section, so only inspect the
  // opening window and keep source order as the strongest signal.
  const mechanismOpening = usable(fallback).slice(0, 4)
  const answerOpening = usable(primary).slice(0, 3)
  if (!mechanismOpening.length && !answerOpening.length) return undefined

  const explicitCause = /因为|由于|之所以|原因(?:是|在于)|本质(?:是|上)|核心(?:是|在于)|根本(?:是|在于)|取决于|导致|从而|使得|所以|因此/u
  const mechanismCue = /(?:不会|不能|没有|缺少|不同|不一致|冲突|竞争|阻塞|等待|扫描|丢弃|重排|批量|缓冲|分片|重渲染|多线程|并发|微任务|队列|序列号|全双工|兼容|协议头|量纲|分布|状态|太大|太小|过多|过少).{0,72}(?:会|要|需|让|使|造成|产生|触发|增加|降低|变化|失效|错误|重复|遗漏|更晚|主导|稀释|拆散)|(?:会|要|必须|只能|容易).{0,72}(?:扫描|等待|丢弃|重排|阻塞|触发|重渲染|确认|同步|兼容|占用|增加|失去|产生|放大)|^(?:如果|若|当|一旦).{8,}(?:会|就|便|则)/u
  const solutionLead = /^(?:建议|应该|可以|可用|需要改用|优先|使用|改用|通过|做法是|解决办法|落地时|排查时|实现时)/u
  const definitionLead = /^.{0,28}(?:是指|定义为|用于|负责|包括)/u

  // The remainder of a concise authored answer often contains its plainest
  // explanation (“块太大时……”“字段多时……”); use it when it actually states a
  // cause, but never let a trailing recommendation replace the mechanism.
  const firstMechanism = mechanismOpening[0]
  if (firstMechanism && explicitCause.test(firstMechanism) && !solutionLead.test(firstMechanism)) {
    return firstMechanism
  }

  const explicitAnswerCause = answerOpening.find((item) => (
    explicitCause.test(item) && !solutionLead.test(item)
  ))
  if (explicitAnswerCause) return explicitAnswerCause

  const implicitAnswerCause = answerOpening.find((item) => (
    mechanismCue.test(item) && !solutionLead.test(item)
  ))
  if (implicitAnswerCause) return implicitAnswerCause

  // Otherwise keep the first distinct mechanism sentence. Looking farther
  // ahead is exactly what used to select “改用 Keyset/PgBouncer” instead of the
  // reason the original approach is slow. Only skip a pure definition when the
  // immediately following sentence explicitly supplies the cause.
  const secondMechanism = mechanismOpening[1]
  if (definitionLead.test(firstMechanism ?? '')
    && secondMechanism
    && explicitCause.test(secondMechanism)
    && !solutionLead.test(secondMechanism)) return secondMechanism

  return firstMechanism ?? answerOpening[0]
}

function reasonSentence(value, fallbackValue, conclusion, title) {
  const primary = splitSentences(value)
  const fallback = splitSentences(fallbackValue)
  const causalPatterns = [
    /因为|所以|因此|之所以|原因|从而|导致|使得|让|为了|目的是|才(?:能|会)?|避免|防止|保证|减少|降低|影响|需要|依赖|用于|作为|来自/,
    /本质|核心|关键|取决于|意味着|通过|基于|负责|区别|不同|不能|只有|否则|代价/,
    /内部|过程|机制|触发|队列|状态|边界|协商|验证|交换|生成|转换|保存/,
  ]
  const selected = /为什么|为何|原因(?:是|在于)|怎么回事/u.test(title)
    ? bestWhyReasonSentence(primary, fallback, [conclusion])
    : bestReasonSentence(primary, fallback, [conclusion], causalPatterns, title)
  if (!selected) return '理解这道题要同时看触发条件、内部过程和最终可观察结果，不能只记住一个术语。'
  return expandedReason(selected, primary, fallback, conclusion)
}

function practiceSentence(value, fallbackValue, excluded) {
  const primary = splitSentences(value)
  const fallback = splitSentences(fallbackValue)
  const practicalPatterns = [
    /例如|实际|项目|代码|排查|实现|验证|输入|输出|日志|指标|测试/,
    /先|再|最后|检查|观察|记录|比较|模拟|压测|断言/,
  ]
  const selected = bestDistinctSentence(primary, excluded, practicalPatterns)
    ?? bestDistinctSentence(fallback, excluded, practicalPatterns)
  if (!selected) return '落地时先做一个最小可复现实验，再用日志、输出或测试结果验证理解是否正确。'
  return takeSentences(selected, { maximum: 120, count: 1 })
}

function glossaryTermApplies(label, haystack, bankId, title) {
  const javaBank = /^java(?:-|$)/i.test(bankId)
  if (label === 'NIO Buffer') {
    return /\bNIO\b|ByteBuffer|(?:\bposition\b|\blimit\b|\bcapacity\b|\bflip\b).{0,80}\bBuffer\b|\bBuffer\b.{0,80}(?:\bposition\b|\blimit\b|\bcapacity\b|\bflip\b)/i.test(haystack)
  }
  if (label === '原型链' || label === 'Proxy') return !javaBank
  if (label === 'Chunk') {
    return /\bChunk(?:ing)?\b|切块|文档切分|\bRAG\b|Embedding|content_hash|混合检索/i.test(title)
      || /文档(?:切块|切分|分段)|知识库.{0,24}(?:切块|片段)|检索.{0,24}(?:片段|文档)/i.test(haystack)
  }
  if (label === 'Token') {
    const centralToken = /\bToken\b|上下文窗口|计费|预算/i.test(title)
      || /首\s*Token|Token\s*(?:流|预算|数|计费|成本|限制|上限)|(?:输入|输出|上下文).{0,12}Token/i.test(haystack)
    return centralToken
      && /\bLLM\b|\bRAG\b|大模型|模型(?:输入|输出|生成|调用|推理|上下文)|生成式|上下文窗口|提示词|\bPrompt\b/i.test(haystack)
  }
  if (label === 'Agent') {
    return /智能体|\bAgent\b/i.test(title)
  }
  if (label === 'CAP / BASE') {
    if (/\bCAP\b/.test(haystack)) return true
    return /分布式|网络分区|分区容错|强一致|最终一致|基本可用|软状态|一致性.{0,16}可用性|可用性.{0,16}一致性/.test(haystack)
  }
  return true
}

function glossaryExplanation(label, explanation, bankId) {
  if (label !== 'GC') return explanation
  if (/^java(?:-|$)/i.test(bankId)) return explanation
  return '运行时从仍然可访问的变量和对象出发，找出程序已经够不到的内存并自动回收；JavaScript、Java 等运行时的具体算法不同，但都不能回收仍被引用的对象。'
}

function detectedGlossary(title, answer, mechanism, bankId) {
  const haystack = `${title}\n${markdownText(answer)}\n${markdownText(mechanism).slice(0, 720)}`
  return TERM_ENTRIES
    .filter(([pattern]) => pattern.test(haystack))
    .filter(([, label]) => glossaryTermApplies(label, haystack, bankId, title))
    .slice(0, 4)
    .map(([, label, explanation]) => `- **${label}：** ${glossaryExplanation(label, explanation, bankId)}`)
}

function replaceSection(lines, kind, contentLines) {
  const section = locateSections(lines).find((item) => item.kind === kind)
  if (!section) return lines
  return [
    ...lines.slice(0, section.start),
    '',
    ...contentLines,
    '',
    ...lines.slice(section.end),
  ]
}

function insertAfterSection(lines, kind, contentLines) {
  const section = locateSections(lines).find((item) => item.kind === kind)
  if (!section) return lines
  return [
    ...lines.slice(0, section.end),
    '',
    ...contentLines,
    '',
    ...lines.slice(section.end),
  ]
}

function matchingCodeRule(bankId, title) {
  return CODE_RULES.find((rule) => rule.banks.includes(bankId) && rule.title.test(title))
}

function matchingVisualRule(bankId, title) {
  return VISUAL_RULES.find((rule) => rule.banks.includes(bankId) && rule.title.test(title))
}

/**
 * Gives every built-in question a useful first screen without inventing new facts:
 * the conclusion comes from the authored answer, the reason from its mechanism,
 * and the application cue from its authored scenario. Selected high-value topics
 * receive a small runnable example or an existing, reviewed local diagram.
 */
export function enhanceQuestionClarity(markdown, { title = '', bankId = '' } = {}) {
  const source = String(markdown ?? '')
  const sourceLines = source.replace(/\r\n?/g, '\n').split('\n')
  if (hasMarkerOutsideFence(sourceLines, CLARITY_MARKER)) return source.trim()

  let lines = sourceLines
  let sections = locateSections(lines)
  const answerSection = sections.find((item) => item.kind === 'answer')
  if (!answerSection) return String(markdown ?? '').trim()

  const answer = lines.slice(answerSection.start, answerSection.end).join('\n').trim()
  const legacySupplement = bankId === 'interview' ? legacySupplementFor(title) : undefined
  const mechanismSection = sections.find((item) => item.kind === 'mechanism')
  const practiceSection = sections.find((item) => item.kind === 'practice')
  const followupSection = sections.find((item) => item.kind === 'followups')
  const mechanism = mechanismSection
    ? lines.slice(mechanismSection.start, mechanismSection.end).join('\n').trim()
    : legacySupplement?.mechanism ?? lines.slice(answerSection.end).join('\n').trim()
  const practice = practiceSection
    ? lines.slice(practiceSection.start, practiceSection.end).join('\n').trim()
    : legacySupplement?.practice
      ?? (followupSection ? lines.slice(followupSection.start, followupSection.end).join('\n').trim() : mechanism)
  let authoredAnswerToRelocate

  if (!/\*\*结论[：:]\*\*/.test(answer) || !/\*\*为什么[：:]\*\*/.test(answer)) {
    const firstScreenOverride = FIRST_SCREEN_OVERRIDES.find((item) => (
      item.bankId === bankId && item.title.test(title)
    ))
    const answerSentences = splitSentences(answer)
    const combineOpeningClauses = /[：:]$/.test(answerSentences[0] ?? '')
      && answerSentences.length > 1
      && (answerSentences[0].length + answerSentences[1].length) <= 112
    const conclusionCount = combineOpeningClauses ? 2 : 1
    const conclusionSource = answerSentences.slice(0, conclusionCount).join(' ') || markdownText(answer)
    const conclusion = firstScreenOverride?.conclusion
      ?? takeSentences(conclusionSource, { maximum: 112, count: conclusionCount })
      ?? conclusionSource
    const answerRemainder = answerSentences.slice(conclusionCount).join(' ')
    const reason = firstScreenOverride?.reason
      ?? reasonSentence(answerRemainder, mechanism || markdown, conclusion, title)
    const application = firstScreenOverride?.application
      ?? practiceSentence(practice, markdown, [conclusion, reason])
    const structuredComparable = normalizedComparable(`${conclusion} ${reason} ${application}`)
    const uncoveredSentences = answerSentences.filter((sentence) => (
      !structuredComparable.includes(normalizedComparable(sentence))
    ))
    const hasRichMarkdown = /^(?:```|~~~)/m.test(answer) || /!\[[^\]]*]\(/.test(answer)
    if (hasRichMarkdown) authoredAnswerToRelocate = answer
    else if (uncoveredSentences.length) authoredAnswerToRelocate = uncoveredSentences.join(' ')
    lines = replaceSection(lines, 'answer', [
      `- **结论：** ${conclusion}`,
      `- **为什么：** ${reason}`,
      `- **怎么用：** ${application}`,
    ])
  }

  sections = locateSections(lines)
  if (!sections.some((item) => item.kind === 'glossary')) {
    const glossary = detectedGlossary(title, answer, mechanism, bankId)
    if (glossary.length) {
      lines = insertAfterSection(lines, 'answer', ['**关键词翻译：**', '', ...glossary])
    }
  }

  if (authoredAnswerToRelocate) {
    const relocatedIntro = '原题中更完整的解释、边界或代码如下：'
    const currentMechanism = locateSections(lines).find((item) => item.kind === 'mechanism')
    if (currentMechanism) {
      lines = [
        ...lines.slice(0, currentMechanism.start),
        '',
        relocatedIntro,
        '',
        ...authoredAnswerToRelocate.split('\n'),
        '',
        ...lines.slice(currentMechanism.start),
      ]
    } else {
      const anchor = locateSections(lines).some((item) => item.kind === 'glossary') ? 'glossary' : 'answer'
      lines = insertAfterSection(lines, anchor, [
        '**原理 / 流程：**',
        '',
        relocatedIntro,
        '',
        ...authoredAnswerToRelocate.split('\n'),
      ])
    }
  }

  const supplementMarker = legacySupplement ? `[clarity-supplement-${title.match(/^Q(\d+)/i)?.[1]}]: #` : ''
  if (legacySupplement && !lines.join('\n').includes(supplementMarker)) {
    const hasMechanism = locateSections(lines).some((item) => item.kind === 'mechanism')
    if (hasMechanism) {
      const section = locateSections(lines).find((item) => item.kind === 'mechanism')
      lines = [
        ...lines.slice(0, section.end),
        '', supplementMarker, '', legacySupplement.mechanism,
        ...lines.slice(section.end),
      ]
    } else {
      const anchor = locateSections(lines).some((item) => item.kind === 'glossary') ? 'glossary' : 'answer'
      lines = insertAfterSection(lines, anchor, [
        '**原理 / 流程：**', '', supplementMarker, '', legacySupplement.mechanism,
      ])
    }

    const currentPractice = locateSections(lines).find((item) => item.kind === 'practice')
    if (currentPractice) {
      lines = [
        ...lines.slice(0, currentPractice.end),
        '', legacySupplement.practice,
        ...lines.slice(currentPractice.end),
      ]
    } else {
      lines = insertAfterSection(lines, 'mechanism', [
        '**代码 / 场景：**', '', legacySupplement.practice,
      ])
    }
    const currentSources = locateSections(lines).find((item) => item.kind === 'sources')
    if (currentSources) {
      lines = [
        ...lines.slice(0, currentSources.end),
        '', renderLegacySources(legacySupplement.sources), '', '补充校验日期：2026-08-29',
        ...lines.slice(currentSources.end),
      ]
    } else {
      const anchor = locateSections(lines).some((item) => item.kind === 'practice') ? 'practice' : 'mechanism'
      lines = insertAfterSection(lines, anchor, [
        '**参考来源：**', '', renderLegacySources(legacySupplement.sources), '', '校验日期：2026-08-29',
      ])
    }
  }

  if (!/^(?:```|~~~)/m.test(lines.join('\n'))) {
    const rule = matchingCodeRule(bankId, title)
    if (rule && locateSections(lines).some((item) => item.kind === 'practice')) {
      const section = locateSections(lines).find((item) => item.kind === 'practice')
      lines = [
        ...lines.slice(0, section.end),
        '',
        rule.intro,
        '',
        `\`\`\`${rule.language}`,
        rule.code,
        '```',
        ...lines.slice(section.end),
      ]
    }
  }

  const joined = lines.join('\n')
  if (!joined.includes('/content/diagrams/')) {
    const rule = matchingVisualRule(bankId, title)
    if (rule && locateSections(lines).some((item) => item.kind === 'mechanism')) {
      const section = locateSections(lines).find((item) => item.kind === 'mechanism')
      lines = [
        ...lines.slice(0, section.end),
        '',
        `![${rule.alt}](${rule.src} "${rule.caption}")`,
        ...lines.slice(section.end),
      ]
    }
  }

  const result = collapseBlankLinesOutsideFences(lines).join('\n').trim()
  return `${result}\n\n${CLARITY_MARKER}`
}

export function clarityRuleCounts() {
  return {
    glossaryTerms: TERM_ENTRIES.length,
    codeRules: CODE_RULES.length,
    visualRules: VISUAL_RULES.length,
  }
}

export function clarityVisualEntries() {
  return VISUAL_RULES.map(({ banks, src, alt, caption }) => ({ banks: [...banks], src, alt, caption }))
}
