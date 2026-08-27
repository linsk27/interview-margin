const COMMUNITY = {
  aiBackend: {
    label: '牛客：快手 AI 应用服务端开发二面',
    url: 'https://www.nowcoder.com/discuss/872512773710696448',
    kind: 'community-interview',
  },
  javaAi: {
    label: '牛客：Java 后端与 AI 工程真题汇总',
    url: 'https://www.nowcoder.com/discuss/864594486704291840?sourceSSR=post',
    kind: 'community-interview',
  },
  agent: {
    label: '牛客：智能体与大模型应用工程实习一面',
    url: 'https://www.nowcoder.com/discuss/894720138258173952?sourceSSR=enterprise',
    kind: 'community-interview',
  },
  agentRoundup: {
    label: '牛客：阿里、蚂蚁、字节 Agent 开发面经总结',
    url: 'https://www.nowcoder.com/discuss/877151327091027968',
    kind: 'community-interview',
  },
  ragBackend: {
    label: '牛客：云鲸智能平台开发面经',
    url: 'https://www.nowcoder.com/discuss/904837245251637248',
    kind: 'community-interview',
  },
}

const GUIDES = {
  llm: {
    label: 'JavaGuide：大模型基础面试题总结',
    url: 'https://javaguide.cn/ai/interview-questions/llm-interview-questions.html',
    kind: 'curated-guide',
  },
  rag: {
    label: 'JavaGuide：RAG 面试题总结',
    url: 'https://javaguide.cn/ai/interview-questions/rag-interview-questions.html',
    kind: 'curated-guide',
  },
  agent: {
    label: 'JavaGuide：AI Agent 面试题总结',
    url: 'https://javaguide.cn/ai/interview-questions/agent-interview-questions.html',
    kind: 'curated-guide',
  },
  system: {
    label: 'JavaGuide：AI 系统设计面试题总结',
    url: 'https://javaguide.cn/ai/interview-questions/ai-system-design-interview-questions.html',
    kind: 'curated-guide',
  },
  javaProject: {
    label: 'JavaGuide：Spring AI 面试平台与 RAG 知识库项目',
    url: 'https://javaguide.cn/zhuanlan/interview-guide.html',
    kind: 'curated-guide',
  },
  xiaolinLlm: {
    label: '小林面试笔记：大模型工程面试题介绍',
    url: 'https://xiaolinnote.com/ai/llm/llm_info.html',
    kind: 'curated-guide',
  },
  xiaolinRag: {
    label: '小林面试笔记：RAG 面试题介绍',
    url: 'https://xiaolinnote.com/ai/rag/rag_info.html',
    kind: 'curated-guide',
  },
  xiaolinTools: {
    label: '小林面试笔记：LLM 工具调用面试题介绍',
    url: 'https://xiaolinnote.com/ai/tools/tools_info.html',
    kind: 'curated-guide',
  },
}

const OFFICIAL = {
  springAi: {
    label: 'Spring AI Reference',
    url: 'https://docs.spring.io/spring-ai/reference/',
    kind: 'official',
  },
  springChatClient: {
    label: 'Spring AI：Chat Client API',
    url: 'https://docs.spring.io/spring-ai/reference/api/chatclient.html',
    kind: 'official',
  },
  springStructuredOutput: {
    label: 'Spring AI：Structured Output',
    url: 'https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html',
    kind: 'official',
  },
  springTools: {
    label: 'Spring AI：Tool Calling',
    url: 'https://docs.spring.io/spring-ai/reference/api/tools.html',
    kind: 'official',
  },
  springRag: {
    label: 'Spring AI：Retrieval Augmented Generation',
    url: 'https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html',
    kind: 'official',
  },
  springEmbeddings: {
    label: 'Spring AI：Embeddings Model API',
    url: 'https://docs.spring.io/spring-ai/reference/api/embeddings.html',
    kind: 'official',
  },
  springVectorDb: {
    label: 'Spring AI：Vector Databases',
    url: 'https://docs.spring.io/spring-ai/reference/api/vectordbs.html',
    kind: 'official',
  },
  springMemory: {
    label: 'Spring AI：Chat Memory',
    url: 'https://docs.spring.io/spring-ai/reference/api/chat-memory.html',
    kind: 'official',
  },
  springObservability: {
    label: 'Spring AI：Observability',
    url: 'https://docs.spring.io/spring-ai/reference/observability/',
    kind: 'official',
  },
  langchain4j: {
    label: 'LangChain4j 官方文档',
    url: 'https://docs.langchain4j.dev/',
    kind: 'official',
  },
  langchain4jRag: {
    label: 'LangChain4j：RAG',
    url: 'https://docs.langchain4j.dev/tutorials/rag/',
    kind: 'official',
  },
  langchain4jTools: {
    label: 'LangChain4j：Tools',
    url: 'https://docs.langchain4j.dev/tutorials/tools/',
    kind: 'official',
  },
  openAiText: {
    label: 'OpenAI：Text generation',
    url: 'https://platform.openai.com/docs/guides/text',
    kind: 'official',
  },
  openAiStreaming: {
    label: 'OpenAI：Streaming API responses',
    url: 'https://platform.openai.com/docs/guides/streaming-responses',
    kind: 'official',
  },
  openAiStructured: {
    label: 'OpenAI：Structured Outputs',
    url: 'https://platform.openai.com/docs/guides/structured-outputs',
    kind: 'official',
  },
  openAiTools: {
    label: 'OpenAI：Function Calling',
    url: 'https://platform.openai.com/docs/guides/function-calling',
    kind: 'official',
  },
  openAiEmbeddings: {
    label: 'OpenAI：Embeddings',
    url: 'https://platform.openai.com/docs/guides/embeddings',
    kind: 'official',
  },
  openAiEvals: {
    label: 'OpenAI：Evals',
    url: 'https://platform.openai.com/docs/guides/evals',
    kind: 'official',
  },
  openAiLatency: {
    label: 'OpenAI：Latency optimization',
    url: 'https://platform.openai.com/docs/guides/latency-optimization',
    kind: 'official',
  },
  elasticHybrid: {
    label: 'Elastic：Hybrid search',
    url: 'https://www.elastic.co/docs/solutions/search/hybrid-search',
    kind: 'official',
  },
  elasticKnn: {
    label: 'Elastic：kNN vector search',
    url: 'https://www.elastic.co/docs/solutions/search/vector/knn',
    kind: 'official',
  },
  pgvector: {
    label: 'pgvector 官方项目文档',
    url: 'https://github.com/pgvector/pgvector',
    kind: 'official',
  },
  webflux: {
    label: 'Spring Framework：WebFlux Reactive Core',
    url: 'https://docs.spring.io/spring-framework/reference/web/webflux/reactive-spring.html',
    kind: 'official',
  },
  reactor: {
    label: 'Project Reactor Reference',
    url: 'https://projectreactor.io/docs/core/release/reference/',
    kind: 'official',
  },
  sse: {
    label: 'WHATWG：Server-sent events',
    url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html',
    kind: 'official',
  },
  owasp: {
    label: 'OWASP Top 10 for LLM Applications',
    url: 'https://genai.owasp.org/llm-top-10/',
    kind: 'official',
  },
  genAiSemconv: {
    label: 'OpenTelemetry：Generative AI semantic conventions',
    url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/',
    kind: 'official',
  },
  mcp: {
    label: 'Model Context Protocol 规范',
    url: 'https://modelcontextprotocol.io/specification/latest',
    kind: 'official',
  },
}

function question({ title, summary, mechanism, example, followUps, pitfalls, sources }) {
  return {
    title,
    summary,
    mechanism: mechanism.map((item) => `- ${item}`).join('\n'),
    example,
    followUps: followUps.map(([followUpQuestion, answer]) => ({ question: followUpQuestion, answer })),
    pitfalls,
    sources,
  }
}

export const javaAiInterviewBank = {
  id: 'java-ai-applications',
  idPrefix: 'java-ai-applications-v2',
  title: 'Java + AI 应用高频 35 题',
  shortTitle: 'Java + AI',
  kicker: 'JAVA AI APPLICATIONS',
  category: 'AI 应用开发',
  description: '面向 Java 后端转 AI 应用开发，覆盖模型 API、Prompt、工具调用、RAG、Agent、评测安全与 Spring AI 工程接入。',
  baseTags: ['Java', 'AI 应用', 'Spring AI', 'LangChain4j', 'RAG', 'Agent'],
  tone: 'green',
  sourcePolicy: 'community-guide-official',
  source: 'public/question-banks/java-ai-applications.md',
  verifiedAt: '2026-08-06',
  sections: [
    {
      title: '模型与 API 基础',
      questions: [
        question({
          title: 'Token 是什么？',
          summary: 'Token 是模型处理文本时使用的离散单元，不一定等于一个汉字或一个英文单词。输入、输出、工具描述和检索上下文都会占用 Token，并共同影响窗口、费用和延迟。',
          mechanism: [
            '文本先由 tokenizer 编码成 Token ID，模型基于这些 ID 进行计算；同一句话在不同模型的分词器下，Token 数可能不同。',
            '请求用量通常分为输入 Token 与输出 Token；历史消息、system 指令、RAG 片段和工具 schema 都属于输入，不只是用户最后一句话。',
            '工程上应调用目标模型对应的计数器或读取返回的 usage，按任务统计 P50、P95，而不是用“中文字符数除以二”这类经验公式。',
            'Token 预算应在调用前分配：固定保留输出空间，再对历史、证据和工具定义限额，超出时去重、重检索或摘要，不能直接截断关键规则。',
          ],
          example: '一个 Java 知识助手把 20 轮历史、8 段文档和 30 个工具定义全部发送，用户只问一句话却很贵。服务改为只注册本轮可用工具，保留最近完整轮次并按预算选证据，同时记录实际 usage，成本和首 Token 延迟都会下降。',
          followUps: [
            ['为什么中文字符数不能直接当作 Token 数？', '分词器会按词片、符号和上下文编码，同一个汉字组合可能被拆成不同数量的 Token；模型版本变化后映射也可能变化。'],
            ['输出上限设置得越大越好吗？', '不是。过大的最大输出会占用窗口和配额，也放大长尾延迟与费用；应按任务需要设置上限，并在完成条件满足时及时停止。'],
          ],
          pitfalls: ['只统计用户输入，漏掉 system、历史、检索证据和工具 schema。', '用固定字符比例估算全部模型，导致预算判断和成本告警失真。'],
          sources: [COMMUNITY.aiBackend, GUIDES.llm, OFFICIAL.openAiText],
        }),
        question({
          title: '上下文窗口是什么？',
          summary: '上下文窗口是一次模型调用可处理的 Token 总容量，通常同时容纳输入与预期输出。窗口更大不代表信息越多越好，噪声、冲突和关键内容位置仍会影响回答。',
          mechanism: [
            'Java 服务在发起请求前要计算 system、历史、RAG、工具定义与最大输出的总预算，并为框架附加内容留出余量。',
            '超限时应按优先级处理：保留安全规则和当前目标，删除重复内容，按权限重新检索证据，再压缩较旧的完整会话轮次。',
            '直接从字符串头尾截断可能切断工具结果、代码块或一问一答关系，也可能删掉 system 规则，产生格式错误和行为漂移。',
            '窗口治理要记录每类上下文的 Token 占比、被裁剪原因和最终清单，配合固定评测集验证压缩后没有事实或任务成功率回退。',
          ],
          example: '合同问答请求超出窗口时，服务保留合同版本、用户问题和相关条款，删除重复页眉并重新检索前六条证据，再把早期闲聊摘要为结构化事实。若仍不足则要求缩小范围，而不是静默丢掉合同结论。',
          followUps: [
            ['上下文窗口大是否可以不用 RAG？', '不能直接画等号。长窗口只扩大一次调用可携带的内容，并没有解决知识持续更新、按用户做检索前 ACL、定位引用版本和删除过期内容；全文越大还会增加 Token、延迟、噪声与关键信息被淹没的风险。少量、固定、一次性材料可直接放入长窗口；企业知识则通常仍用 RAG。选型应按材料规模、更新频率、权限与引用要求分桶，并比较答案忠实度、P95 和每次成功回答成本。'],
            ['摘要历史有什么风险？', '摘要可能遗漏否定条件、错误固化模型猜测或失去来源，因此应保存原事件，摘要带版本和来源指针，并对关键事实重新校验。'],
          ],
          pitfalls: ['把模型标称最大窗口当作应用每次都应使用的目标容量。', '按字符直接截断消息，破坏角色、工具调用或文档证据的完整性。'],
          sources: [COMMUNITY.javaAi, GUIDES.xiaolinLlm, OFFICIAL.springChatClient],
        }),
        question({
          title: 'Temperature 控制什么？',
          summary: 'Temperature 调整采样分布的平坦程度：值较低通常更稳定，值较高通常更多样，但它不等于事实正确率，也不能把概率模型变成完全确定的程序。',
          mechanism: [
            '模型先产生候选 Token 的概率分布，Temperature 对 logits 做缩放；较低值强化高概率候选，较高值让次高概率候选更容易被采样。',
            '参数效果依赖模型和任务，不能跨模型照搬；分类、抽取与工具参数通常偏低，创意生成可以更高，但都要通过任务评测决定。',
            '即使值为零，服务端实现、模型版本、并行计算与隐含路由也可能造成差异，因此关键业务结果仍需结构化校验和确定性代码。',
            '生产配置要把模型版本、Temperature、Prompt 版本一起记录，变更时在同一评测集上比较成功率、格式通过率和多次运行方差。',
          ],
          example: '发票字段抽取使用低 Temperature，并以 JSON Schema 和金额规则校验；营销标题生成允许更高值并一次产生多个候选。两类任务都记录参数与模型版本，而不是在全站共用一个“推荐值”。',
          followUps: [
            ['Temperature 为零就一定返回相同答案吗？', '不保证。相同最高概率、模型更新、服务路由或底层非确定性都可能带来差异，高风险流程不能依赖文本完全一致。'],
            ['什么时候应该提高 Temperature？', '需要创意、多样候选且错误成本可控时可以提高；仍应限定输出范围，并用人工或自动评分选择结果。'],
          ],
          pitfalls: ['把高 Temperature 直接解释为“更聪明”，忽略它主要改变采样随机性。', '只调采样参数却不做任务评测，凭单次回答判断配置优劣。'],
          sources: [COMMUNITY.aiBackend, GUIDES.llm, OFFICIAL.openAiText],
        }),
        question({
          title: 'Top P 控制什么？',
          summary: 'Top P 是核采样阈值：模型按概率从高到低保留累计概率达到阈值的候选，再从其中采样。它动态改变候选集合，通常不要和 Temperature 同时大幅调节。',
          mechanism: [
            '与固定保留前 k 个候选不同，Top P 根据每一步概率分布决定候选数量；分布尖锐时集合小，分布平坦时集合会更大。',
            '较小 Top P 往往减少低概率词进入结果，输出更保守；较大值保留更多尾部候选，但多样性提升不代表推理或事实能力提升。',
            'Temperature 先改变分布形状，Top P 再裁剪候选时，两者会相互影响；排障时应固定一个，只改变另一个并重复运行。',
            'Java 配置层应按任务保存参数模板并限制范围，响应日志记录最终参数，避免某个客户端自由传入极端值污染质量与成本。',
          ],
          example: '代码解释任务固定较低 Temperature，只对 Top P 做小范围实验；每个配置重复运行 20 次，比较正确率、格式通过率和答案差异。若没有稳定收益就保持默认值，而不是凭“听起来更自然”上线。',
          followUps: [
            ['Top P 与 Top K 有什么区别？', 'Top K 固定保留概率最高的 k 个候选，Top P 按累计概率动态决定候选数；两者都约束采样集合，但控制方式不同。'],
            ['Temperature 和 Top P 应怎样一起调？', '多数场景先固定其中一个并只调另一个，配合重复实验和任务指标；同时大幅修改会让效果难以归因。'],
          ],
          pitfalls: ['把 Top P 当作答案置信度阈值，它控制的是采样候选集合。', '一次同时修改多个采样参数，结果变化后无法判断真正原因。'],
          sources: [COMMUNITY.javaAi, GUIDES.xiaolinLlm, OFFICIAL.openAiText],
        }),
        question({
          title: '流式输出是怎样工作的？',
          summary: '流式输出让服务在完整答案生成前持续接收增量事件，主要改善首屏等待感，不会自动减少总生成时间。Java 端应解析上游事件，再转换为自己的稳定协议。',
          mechanism: [
            '模型服务通过流式 HTTP 返回文本增量、工具调用片段、结束原因和用量等事件；网络数据块不等于完整 Token，也不保证一个块就是一个 JSON。',
            '适配层先按供应商协议组装事件，再归一为 start、delta、tool、error、usage、done 等业务事件，避免前端绑定某家供应商格式。',
            'WebFlux 或异步客户端需要把取消和超时传播到上游；浏览器断开后若仍继续生成，会浪费连接、模型额度和服务器资源。',
            '展示阶段可增量渲染纯文本，但最终 Markdown、引用和结构化数据应由结束快照校正，避免半个代码块或中间草稿被持久化。',
          ],
          example: '聊天接口收到模型增量后，通过 SSE 发送带 runId、seq、type 的事件。客户端按 seq 去重，done 后用 messageId 获取最终消息；用户点停止时取消 Reactor 订阅并终止上游请求，数据库只保存完整结果或明确的取消状态。',
          followUps: [
            ['流式输出为什么不一定降低总时延？', '它主要提前返回首个可见内容，模型仍需生成后续 Token；协议转换、代理缓冲和渲染还可能增加少量开销。'],
            ['为什么不能直接透传供应商流？', '不同供应商的事件、工具参数和错误语义不同，直传会让前端难迁移，也容易暴露内部字段和敏感工具信息。'],
          ],
          pitfalls: ['把网络 chunk 当作完整 Token 或 JSON，遇到拆包后解析失败。', '客户端断开却不取消上游，造成隐藏的 Token 消耗和连接泄漏。'],
          sources: [COMMUNITY.aiBackend, GUIDES.llm, OFFICIAL.openAiStreaming, OFFICIAL.webflux],
        }),
        question({
          title: '什么是结构化输出？',
          summary: '结构化输出要求模型按给定 schema 返回字段，适合抽取、分类和工作流参数。它提高格式稳定性，但不能证明字段事实正确，Java 端仍要完成解析、校验和授权。',
          mechanism: [
            '优先使用模型原生 JSON Schema 约束，而不是只在 Prompt 中写“返回 JSON”；schema 应限制类型、枚举、必填字段和不允许的额外属性。',
            'Java 端先反序列化为 record 或 DTO，再执行 Bean Validation、跨字段不变量、资源存在性与权限检查，任何一层失败都不能直接执行副作用。',
            '可把具体校验错误回传模型做一次有限修复，仍失败则返回可解释错误或转人工；无限修复会放大成本并形成循环。',
            'schema 要显式版本化并做契约测试，线上分别监控解析成功、语义有效、修复成功和最终任务成功，不能只看 HTTP 200。',
          ],
          example: '模型生成工单路由结果时输出 category、priority 和 reason。Java 能解析并不代表结果有效，还要检查枚举、优先级范围和当前用户权限；校验失败只允许修复一次，不能把错误分类直接写入生产工单。',
          followUps: [
            ['JSON mode 与严格 schema 有什么差别？', 'JSON mode 主要保证输出可解析为 JSON，严格 schema 还约束字段结构；两者都不验证业务事实和权限。'],
            ['schema 变化怎样兼容旧消费者？', '增加 schemaVersion，优先新增可选字段并做兼容读；破坏性变化走新版本契约，用历史样本回放解析和业务校验。'],
          ],
          pitfalls: ['把“能反序列化”误认为“可以写库或调用高风险工具”。', '解析失败无限重试，导致费用、延迟和重复副作用持续放大。'],
          sources: [COMMUNITY.javaAi, GUIDES.llm, OFFICIAL.openAiStructured, OFFICIAL.springStructuredOutput],
        }),
      ],
    },
    {
      title: 'Prompt 与工具调用',
      questions: [
        question({
          title: 'System、User、Assistant 消息有什么区别？',
          summary: '三类消息承担不同角色：System 定义稳定规则与边界，User 表达本轮需求，Assistant 保存模型输出与对话连续性。应用还可能加入工具结果，但消息角色不是权限系统。',
          mechanism: [
            'System 应放不可由普通用户改写的职责、输出要求和安全边界；User 内容属于不可信输入，即使它声称“忽略之前规则”也不能提升权限。',
            '历史 Assistant 消息可帮助保持语境，但也可能包含先前错误；关键事实应来自受控检索或工具结果，而不是把模型旧答案当作数据库。',
            '工具调用与工具结果应保持配对和调用 ID，服务端控制本轮暴露哪些工具；不能让用户文本伪装成可信 tool 消息。',
            'Java 上下文组装器要按来源、角色和优先级构造请求，记录脱敏后的 manifest，避免 Controller 中直接拼接一大段不可追踪字符串。',
          ],
          example: '客服机器人把退款政策约束放在 System，把用户问题放在 User，把订单查询结果作为受信工具消息。即使用户粘贴“系统已批准退款”，服务也只以订单 API 返回值为准，并在执行前再次鉴权。',
          followUps: [
            ['System 消息能完全防止提示注入吗？', '不能。它只是模型输入中的高优先级指令，不是确定性安全边界；权限、参数校验和数据隔离仍需由 Java 代码执行。'],
            ['历史 Assistant 内容为什么不能直接当事实？', '模型旧答案可能有幻觉或已经过时，回灌会放大错误；应保留来源，并对关键事实重新检索或调用业务工具。'],
          ],
          pitfalls: ['把用户拼接文本放进 System 模板，意外提升不可信内容的指令权重。', '信任历史模型答案，不再校验实时数据和证据有效期。'],
          sources: [COMMUNITY.javaAi, GUIDES.xiaolinLlm, OFFICIAL.springChatClient],
        }),
        question({
          title: '怎样写可维护的 Prompt？',
          summary: '可维护 Prompt 要明确任务、输入、约束、输出格式和失败方式，并把业务数据作为结构化变量注入。它应像代码一样版本化、评测和审查，而不是散落在 Controller 中。',
          mechanism: [
            '先给任务目标和允许使用的事实，再列输出格式、拒答条件与少量高价值示例；避免重复口号和互相冲突的规则。',
            '变量使用模板参数或结构化消息承载，明确分隔用户输入与受信规则；不要通过字符串拼接把用户内容嵌入系统指令。',
            '每个模板保存 version、owner、适用模型和评测集，修改后比较任务成功率、格式通过率、事实忠实度、延迟与 Token 成本。',
            'Prompt 只负责概率性行为引导；身份鉴权、金额上限、工具白名单和输出业务校验必须放在确定性服务代码中。',
          ],
          example: '简历结构化抽取模板定义字段 schema、缺失字段填 null 和不得猜测，简历正文作为独立变量传入。上线前用真实脱敏样本回放，比较字段准确率和解析率；权限与文件类型校验仍由 Java 接口负责。',
          followUps: [
            ['Few-shot 示例越多越好吗？', '不是。示例会占用窗口，也可能让模型过拟合某种格式；应选择覆盖关键边界的少量样本，并用评测证明增益。'],
            ['Prompt 版本为什么要和模型版本一起记录？', '同一模板在不同模型上的遵循度可能不同，缺少联合版本就无法复现线上结果，也无法判断回退来自哪里。'],
          ],
          pitfalls: ['Prompt 散落在业务代码中，无法统一评测、灰度和回滚。', '用自然语言规则代替鉴权与业务校验，把概率约束当成安全边界。'],
          sources: [COMMUNITY.aiBackend, GUIDES.llm, OFFICIAL.openAiText, OFFICIAL.springChatClient],
        }),
        question({
          title: '工具调用是怎样工作的？',
          summary: '工具调用不是模型直接执行 Java 方法，而是模型返回工具名和参数建议，应用校验后执行真实代码，再把结果作为新上下文交给模型决定下一步或生成答案。',
          mechanism: [
            '应用先向模型提供允许使用的工具名称、用途和参数 schema；模型根据当前上下文选择工具，并生成结构化调用参数与调用标识。',
            'Java 编排层验证工具是否在白名单、参数类型、用户权限、资源范围和业务不变量，通过后才调用服务，模型本身没有越权执行能力。',
            '工具结果应返回必要的结构化事实和错误类别，避免把整张数据库记录或敏感日志塞回上下文；模型可以基于结果继续调用或结束。',
            '循环必须有最大步数、deadline、预算和重复调用检测；完整记录每步输入摘要、工具结果、耗时与结束原因，便于审计和评测。',
          ],
          example: '用户问订单物流时，模型选择 queryShipment(orderId)。Java 先确认订单属于当前用户，再调用物流服务并返回脱敏状态；模型只负责组织解释。若模型传入他人 orderId，调用在执行前被拒绝。',
          followUps: [
            ['工具描述为什么会影响选择准确率？', '模型依据名称、描述和 schema 判断何时调用；描述重叠、参数含糊或工具过多会增加误选，需要清晰边界和离线评测。'],
            ['工具结果是否应该原样返回模型？', '通常不应。应按最小必要原则过滤字段、限制长度、标记来源和错误类型，避免泄露敏感数据或让不可信结果注入后续指令。'],
          ],
          pitfalls: ['把模型生成的参数直接反射调用方法，没有权限、范围和字段校验。', '工具循环没有步数与预算上限，异常时反复调用并产生副作用。'],
          sources: [COMMUNITY.agent, GUIDES.xiaolinTools, OFFICIAL.springTools, OFFICIAL.openAiTools],
        }),
        question({
          title: '有副作用的工具怎样保证安全？',
          summary: '写库、转账、发消息等工具必须把模型输出视为不可信建议，通过授权、幂等、确认、审计和状态机后才能执行。重试只能重试可安全重放的步骤。',
          mechanism: [
            '执行前验证当前身份、资源归属、参数范围和业务状态；高风险动作采用“计划—预览—用户确认—执行”两阶段流程，确认绑定具体参数。',
            '每个副作用调用携带业务幂等键，服务端以唯一约束或执行记录去重；模型生成的 toolCallId 只用于关联，不能替代业务幂等键。',
            '超时不代表执行失败，重试前先查询结果或状态；对可补偿动作记录补偿信息，对不可逆动作默认不自动重试。',
            '审计日志记录用户、模型、Prompt 版本、工具、参数摘要、授权结果和最终状态，敏感值脱敏；模型不能自行删除或改写审计记录。',
          ],
          example: '邮件 Agent 先生成收件人、主题和正文预览，用户确认后服务生成 sendRequestId 并调用邮件系统。网络超时时先按该 ID 查询发送状态，确认未发送才重试，避免模型重复调用导致一封邮件发多次。',
          followUps: [
            ['为什么 toolCallId 不能直接作为业务幂等键？', '它由一次模型响应产生，模型重试或供应商切换可能生成新 ID；业务幂等键应由稳定操作语义和服务端状态决定。'],
            ['用户确认后参数还能修改吗？', '不能静默修改。确认应绑定参数摘要或版本，任何关键字段变化都必须重新展示并获得确认。'],
          ],
          pitfalls: ['把模型工具调用当成授权决定，绕过业务服务已有的权限校验。', '超时后无条件重试写操作，造成重复扣款、发送或数据写入。'],
          sources: [COMMUNITY.agentRoundup, GUIDES.agent, OFFICIAL.springTools, OFFICIAL.owasp],
        }),
        question({
          title: 'MCP 是什么？它和工具调用有什么关系？',
          summary: 'MCP（Model Context Protocol）是 AI 应用连接外部上下文与能力的开放协议，统一资源、Prompt 和工具的发现与调用方式。工具调用是模型生成“调用哪个工具及参数”的能力；MCP 负责 Host 与外部 Server 怎样交换能力和结果，两者处在不同层。',
          mechanism: [
            'MCP 采用 Host—Client—Server 架构：AI 应用是 Host，通过 Client 连接一个或多个 Server；连接建立后先完成初始化与能力协商，再使用双方声明支持的功能。',
            'Server 可以暴露 resources、prompts 和 tools。Java Host 只把本轮允许的工具转换成模型可见 schema；模型返回 tool call 后，Host 校验参数和权限，再通过 MCP Client 调用对应 Server。',
            'MCP 解决的是接入协议与能力互操作，不等于模型原生 function calling，也不替代业务 API；MCP Server 内部仍可能调用 HTTP API、数据库或本地进程。',
            '认证、租户隔离、用户确认、幂等、超时和审计仍由 Host 与业务服务负责；来自 MCP Server 的文本和资源也属于外部输入，不能自动提升为系统指令。',
          ],
          example: 'Java 知识助手连接订单 MCP Server，初始化后发现 queryOrder 工具。模型只提出查询参数，Host 先检查订单归属再发起 MCP 调用，并把脱敏结果交给模型；退款工具不对普通会话暴露，不能因为接入 MCP 就绕过原有审批。',
          followUps: [
            ['MCP 与普通 REST API 有什么区别？', 'REST API 定义某个业务服务的网络接口；MCP 面向 AI Host，统一能力发现、上下文交换和工具调用。MCP Server 可以在内部继续调用现有 REST API。'],
            ['MCP 与模型的 function calling 是替代关系吗？', '不是。function calling 让模型产生结构化调用意图，MCP 让 Host 用统一协议发现并调用外部能力；应用常把两者组合起来。'],
          ],
          pitfalls: ['把 MCP 当成模型直接连接并执行外部系统，跳过 Host 的校验与授权。', '连接 Server 后把全部工具无条件暴露给模型，扩大误调用、越权和提示注入风险。'],
          sources: [COMMUNITY.javaAi, GUIDES.agent, OFFICIAL.mcp, OFFICIAL.springTools],
        }),
      ],
    },
    {
      title: 'RAG 核心',
      questions: [
        question({
          title: 'Embedding 是什么？',
          summary: 'Embedding 把文本映射为固定维度向量，使语义相近的内容在向量空间中更接近。它用于召回候选，不等于生成答案，也不天然包含权限和事实时效。',
          mechanism: [
            '文档 chunk 与查询通常用兼容的 Embedding 模型编码，向量库按余弦距离、内积或欧氏距离寻找近邻；具体分数不能跨模型直接比较。',
            '向量表示擅长语义相似，但对精确编号、产品码、缩写和否定条件可能不敏感，因此常与关键词检索、元数据过滤组合。',
            '切换模型可能改变维度和空间分布，必须新建索引并重新嵌入文档；不能把新查询向量直接用于旧索引。',
            '向量只是内容派生数据，写入时应保存文档版本、chunkId、租户与 ACL；召回后仍需做权限检查和内容有效期判断。',
          ],
          example: '制度问答将每个条款切分后生成向量，同时保存制度版本和部门权限。查询先按 tenantId、department 过滤再做相似搜索；产品编号额外走关键词通道，避免语义向量漏掉精确匹配。',
          followUps: [
            ['Embedding 维度越高越好吗？', '不一定。更高维度会增加存储和搜索成本，效果取决于模型训练与任务；应在同一标注集上比较召回率、延迟和成本。'],
            ['为什么向量相似不等于答案相关？', '相似度只反映模型空间中的接近程度，可能忽略时效、权限和具体问题意图；还需要过滤、重排和生成阶段校验。'],
          ],
          pitfalls: ['更换 Embedding 模型却复用旧索引，导致查询和文档不在同一向量空间。', '只存向量不存版本与 ACL，召回后无法追溯或隔离租户数据。'],
          sources: [COMMUNITY.ragBackend, GUIDES.rag, OFFICIAL.openAiEmbeddings, OFFICIAL.springEmbeddings],
        }),
        question({
          title: '文档为什么要切分？',
          summary: '切分把长文档变成可检索、可放入上下文的证据单元。块太大噪声多且昂贵，块太小会丢失语义关系；边界应根据文档结构和问答粒度决定。',
          mechanism: [
            '优先保留标题、段落、列表、表格和代码块等自然结构，再在超长节点内按长度切分；固定字符切割容易拆散定义与限定条件。',
            '适量 overlap 可保留跨边界语义，但过大会产生重复候选、浪费存储和上下文；父子切分可用小块召回、较大父块提供上下文。',
            '每个 chunk 保存文档 ID、章节路径、页码、版本、权限和内容哈希，便于引用、增量更新、去重与删除。',
            '切分方案必须用真实问题计算 Recall@k 和引用完整性；不能只凭平均字数判断，表格、FAQ、代码和合同可能需要不同策略。',
          ],
          example: '员工手册按“章节—条款—列表”切分，FAQ 保留一问一答，跨页表格先恢复结构再切。评测发现固定 500 字会拆散“适用范围”和“例外”，改为标题边界加父子块后，相关证据召回和引用可读性同时提升。',
          followUps: [
            ['Overlap 越大是否召回越好？', '不一定。它可能减少边界丢失，也会制造大量重复块、挤占 topK 和上下文；要比较去重后的证据召回与成本。'],
            ['表格文档怎样切分？', '先解析行列和表头关系，把表头与相关行一起表达；不能按 PDF 文本顺序硬切，否则数值会失去字段含义。'],
          ],
          pitfalls: ['所有文档统一固定长度切分，不考虑标题、表格和代码边界。', '修改文档只新增向量，不按内容哈希删除旧版本，导致答案引用过期证据。'],
          sources: [COMMUNITY.ragBackend, GUIDES.xiaolinRag, OFFICIAL.springRag, OFFICIAL.langchain4jRag],
        }),
        question({
          title: '向量召回的 Top K 和相似度阈值怎样设置？',
          summary: 'Top K 决定候选数量，阈值过滤低相关候选；二者需要基于标注查询集联合调节。目标不是让分数好看，而是在可接受成本下提高相关证据进入候选集的概率。',
          mechanism: [
            '先构建带应命中文档或 chunk 的查询集，计算 Recall@k、无结果率和候选噪声；不同任务、语言与 Embedding 模型应分别统计。',
            'K 太小会漏召回，太大则增加重排、Token 与噪声成本；阈值太高导致拒答增多，太低会把不相关证据交给生成模型。',
            '向量库的距离度量和归一化方式会改变分数含义，阈值不能从另一模型或索引直接复制，应通过分数分布和业务错误成本校准。',
            '生产上可按问题类型动态设置候选数，但要限制最大值，记录原始分数、过滤原因和最终引用，以便回放和调优。',
          ],
          example: '客服知识库先按租户和有效期缩小可检索范围，再在受权数据中召回向量 Top 30，重排后送入前 5 条。团队用 300 条标注问题比较 K=10/20/30 的 Recall@k 与总时延，发现 K=30 只小幅增益却显著增加成本，最终按问题类型选择 15 或 20。',
          followUps: [
            ['相似度分数可以跨模型比较吗？', '通常不能。不同模型、距离函数和归一化产生的分布不同，阈值应在当前索引和真实查询集上重新校准。'],
            ['为什么 Top K 增大后答案可能变差？', '更多候选会引入重复、冲突和低相关证据，挤占上下文并干扰模型；需要重排、去重和证据预算。'],
          ],
          pitfalls: ['拍脑袋固定 K 和阈值，没有用标注证据计算 Recall@k。', '只看向量分数，不检查 ACL、版本和候选是否真的支持问题。'],
          sources: [COMMUNITY.ragBackend, GUIDES.rag, OFFICIAL.elasticKnn, OFFICIAL.springVectorDb],
        }),
        question({
          title: '什么是混合检索？',
          summary: '混合检索把向量语义召回与关键词检索组合起来，兼顾同义表达和精确术语、编号、错误码。各通道结果需要归一化、融合、去重，再进入重排。',
          mechanism: [
            '向量检索擅长语义改写，BM25 等关键词检索擅长产品码、专有名词和原文词匹配；两者覆盖的失败模式不同。',
            '不能直接相加未经校准的原始分数，可使用 RRF 按排名融合，或在标注集上训练权重；融合后按文档与内容去重。',
            '元数据过滤应尽早应用并保证各通道一致，否则向量通道和关键词通道可能返回不同租户或过期版本的内容。',
            '评测应拆分普通语义问题、精确实体、缩写与否定条件，比较单通道和混合后的 Recall@k、延迟及后续答案忠实度。',
          ],
          example: '用户搜索错误码 E1047 时，向量通道召回了“登录失败”说明，关键词通道准确命中该编号。系统用 RRF 融合两路候选并按文档版本去重，再由 Reranker 排序，既保留精确手册也补充相关排障步骤。',
          followUps: [
            ['为什么不能直接相加 BM25 和向量分数？', '两类分数尺度和分布不同，直接相加会让某一路无意占优；可用排名融合或基于标注集做归一化与权重学习。'],
            ['所有问题都需要混合检索吗？', '不一定。小型语义库可能单路已足够，混合会增加延迟和维护；应按题型评测增益并允许策略路由。'],
          ],
          pitfalls: ['直接把不同量纲的原始分数相加，融合结果不可解释。', '两路检索使用不同 ACL 或版本过滤，造成数据越权和证据冲突。'],
          sources: [COMMUNITY.ragBackend, GUIDES.xiaolinRag, OFFICIAL.elasticHybrid],
        }),
        question({
          title: 'Reranker 有什么作用？',
          summary: 'Reranker 对第一阶段召回的少量候选做更精细的查询—文档相关性判断，再选出最终上下文。它能改善排序，不能找回根本没被召回的证据。',
          mechanism: [
            '双塔 Embedding 可预计算文档向量，适合大规模快速召回；交叉编码或模型重排同时读取查询和候选，判断更细但计算更贵。',
            '典型流程是多路召回几十条、融合去重、Reranker 排序、按文档多样性和 Token 预算选前几条，不能让相邻重复 chunk 占满上下文。',
            '重排效果用 MRR、NDCG、前 k 命中率和最终答案指标验证，同时监控 P95 与超时；失败时应可降级到原召回排序。',
            '若目标证据未进入候选，问题在摄取、切分或召回；先扩大或修复候选，再调 Reranker，避免把所有检索问题归到一个模型。',
          ],
          example: '向量和关键词共召回 40 条制度片段，Reranker 将真正回答“试用期年假”的条款排到第一，再按章节去重选 5 条。若重排服务超时，则返回融合排名前 5 条并标记降级，接口不会无限等待。',
          followUps: [
            ['Reranker 为什么不能替代第一阶段召回？', '它只对已有候选排序，目标证据根本不在候选中时无法凭空恢复；第一阶段仍需保证较高召回率。'],
            ['重排候选越多越好吗？', '候选增多可能提高覆盖，也线性增加计算和延迟；应在真实分布上寻找召回收益与成本的拐点。'],
          ],
          pitfalls: ['召回不到目标证据时继续调重排模型，方向完全错误。', '只看排序离线指标，不监控重排超时和最终答案是否真的改善。'],
          sources: [COMMUNITY.ragBackend, GUIDES.rag, OFFICIAL.springRag, OFFICIAL.elasticHybrid],
        }),
        question({
          title: '什么是 RAG？完整流程有哪些？',
          summary: 'RAG（Retrieval-Augmented Generation）是在生成答案前从外部知识源检索证据，再把问题与证据一起交给模型生成。它适合私有、实时或需要出处的知识，但只能缓解幻觉，不能保证答案天然正确。',
          mechanism: [
            '离线链路负责接入、解析、清洗、按结构切分、生成 Embedding 和建立索引；每个 chunk 同时保存文档版本、位置、租户与 ACL，保证后续可引用、更新和删除。',
            '在线链路先理解或改写查询，在受权范围内做向量、关键词或混合召回，再经过融合、去重和 Reranker，按 Token 预算选择最终证据。',
            '生成阶段把问题、证据和回答约束组装为上下文；证据不足、冲突或过期时应澄清或拒答，不能要求模型凭参数记忆补全事实。',
            '答案引用必须绑定本次受权检索结果，并由服务端生成可访问链接；评测要把解析、召回、重排和生成分段观测，才能定位质量损失发生在哪一步。',
          ],
          example: 'Java 制度助手收到文档后由任务表驱动解析、切分、嵌入和索引。用户提问时先按 tenantId 与有效版本过滤，再混合召回、重排并把前几条证据交给模型；答案通过 SSE 返回引用，若没有足够证据则明确说无法确认。',
          followUps: [
            ['RAG 与微调分别解决什么问题？', 'RAG 更适合补充可更新、可引用的外部知识；微调更适合改变模型的行为、风格或特定任务模式。两者可以组合，但微调不能替代实时知识检索。'],
            ['使用 RAG 后还会产生幻觉吗？', '会。解析、切分、召回、重排或证据选择都可能出错，模型也可能忽略证据；需要拒答、引用校验和分阶段评测。'],
          ],
          pitfalls: ['只实现“向量检索后拼 Prompt”，忽略清洗、版本、权限、重排和评测。', '检索不到可靠证据时仍强制生成确定答案，把模型参数记忆冒充知识库事实。'],
          sources: [COMMUNITY.javaAi, GUIDES.rag, OFFICIAL.springRag],
        }),
        question({
          title: 'RAG 应该怎样评测？',
          summary: 'RAG 评测要把检索和生成分开：检索看相关证据是否进入候选，生成看答案是否正确、忠实且引用有效；最终再看真实任务成功率、延迟和成本。',
          mechanism: [
            '建立覆盖常见、边界、无答案、过期和权限场景的 Golden Set，为每个问题标注可接受答案、相关文档或证据和拒答期望。',
            '检索阶段计算 Recall@k、MRR、NDCG 和过滤误杀；生成阶段评估正确性、忠实度、引用支持率、完整性与拒答准确率。',
            'LLM-as-judge 可以扩大覆盖，但要用人工样本校准，固定评审模型与 rubric，并监控位置偏差、长度偏差和自我偏好。',
            '每次修改切分、Embedding、Prompt 或模型只改变一个主要变量，保存配置与检索快照；上线再监控用户纠错、无答案率和任务完成。',
          ],
          example: '团队用 500 条脱敏客服问题标注标准证据，其中包含 60 条知识库无答案题。切分改动先比较 Recall@10，生成改动再比较忠实度与拒答准确率；两项通过后才看端到端 P95 和每成功回答成本。',
          followUps: [
            ['只看最终答案准确率有什么问题？', '无法区分证据没召回、召回后排错、模型忽略证据等原因，后续优化容易用 Prompt 掩盖检索缺陷。'],
            ['LLM-as-judge 可以完全替代人工吗？', '不能。评审模型可能受答案顺序、篇幅、措辞和“与自己相似”的输出影响，模型或 Prompt 升级还会让评分标尺漂移，因此高分不等于业务正确。应先用人工金标集测一致率、相关性和分桶误差，交换候选顺序并多次采样；只有达到预设门槛才用于规模化筛查，高风险、低置信和评委分歧样本仍由人工复核。'],
          ],
          pitfalls: ['没有标注证据，只凭几次人工体验评价整个 RAG 系统。', '同时修改多个组件，指标变化后无法归因或安全回滚。'],
          sources: [COMMUNITY.ragBackend, GUIDES.rag, OFFICIAL.openAiEvals, OFFICIAL.springRag],
        }),
        question({
          title: 'RAG 质量差时怎样排查？',
          summary: '按摄取、切分、召回、过滤、融合、重排、上下文和生成逐段排查。先确认正确证据在哪里消失，再改对应环节；目标证据没进上下文时，修改 Prompt 通常无效。',
          mechanism: [
            '第一步检查原文是否解析成功、目标内容是否形成完整 chunk、版本和权限元数据是否正确，排除“数据根本不存在”。',
            '第二步记录各通道候选与分数，确认目标 chunk 是否召回、是否被阈值或 ACL 误杀、是否在融合和重排中被降下去。',
            '第三步查看最终上下文是否被截断、重复或被冲突证据淹没；证据已正确进入时，再评估模型是否忠实遵循和引用。',
            '排查使用固定失败样本和 traceId，每次只改一个变量，比较阶段指标；修复后加入回归集，防止相似故障再次出现。',
          ],
          example: '“年假能否跨年”回答错误。trace 显示目标条款从未进入索引，因为 PDF 表格按列打散；改 Prompt 没有意义。修复解析并按标题切分后，目标证据进入 Top 5，随后再检查引用与答案忠实度。',
          followUps: [
            ['目标证据在候选中却没进最终上下文，检查什么？', '不要只看最终列表，要用稳定 chunkId 记录每一阶段的输入、得分、排名和淘汰原因：先确认 ACL/版本过滤是否误删，再比较融合与去重前后，随后检查 reranker 排名，最后检查 Token packing 是否被重复相邻块挤占。对同一查询固定索引与配置做逐段回放，才能判断该修过滤、融合、重排还是证据预算，而不是盲目增大 Top K。'],
            ['证据已进入上下文但答案仍错，下一步是什么？', '检查冲突证据、指令顺序、引用绑定和生成忠实度，再考虑 Prompt、模型或输出校验，而不是继续扩大召回。'],
          ],
          pitfalls: ['没有阶段日志，看到错误答案就盲目修改 Prompt 和模型参数。', '一次更换切分、Embedding、K 和 Reranker，无法知道哪个改动有效。'],
          sources: [COMMUNITY.ragBackend, GUIDES.xiaolinRag, OFFICIAL.springRag, OFFICIAL.elasticHybrid],
        }),
      ],
    },
    {
      title: 'Agent 与确定性工作流',
      questions: [
        question({
          title: '什么是 AI Agent？',
          summary: 'AI Agent 是围绕目标反复观察状态、选择动作、调用工具并根据结果继续决策的应用系统。模型负责非确定性判断，应用负责状态、权限、工具执行、预算和终止。',
          mechanism: [
            '一次循环通常包含读取目标与状态、模型提出下一步、Java 校验并执行工具、保存结果、判断继续或结束；每步都有明确 runId 和 stepId。',
            'Agent 能处理路径不固定的开放任务，但也带来循环、误调用、费用和不可复现风险，因此不应替代简单的 if/else、规则引擎或固定流程。',
            '工具集合按本轮权限最小化暴露，状态由服务端保存；模型输出只是计划建议，所有副作用动作都经过确定性校验和必要确认。',
            '运行时设置最大步数、deadline、Token 与费用预算、重复动作检测和终止原因，并记录完整轨迹供评测、审计与失败恢复。',
          ],
          example: '故障排查 Agent 可选择查指标、检索手册或读取受权日志，但不能直接重启生产服务。每一步由 Java 执行器检查环境与权限，达到 8 步、预算耗尽或证据不足就停止，并输出已验证事实和下一步人工建议。',
          followUps: [
            ['Agent 与普通聊天机器人有什么区别？', '关键不是“能否调用一次工具”，而是 Agent 会围绕目标重复执行“观察状态—选择动作—执行工具—读取新结果”的闭环，因此后一步取决于真实工具观察，而普通聊天通常一次或少量生成后结束。这个闭环会引入重复副作用、无限循环和状态恢复问题，所以应用必须持久化步骤，并以权限、幂等、预算、最大步数和无进展检测控制动作与终止。'],
            ['什么时候不应该使用 Agent？', '步骤固定、规则明确或副作用风险高且无需动态规划时，确定性工作流更易测试、审计和控制。'],
          ],
          pitfalls: ['把能调用一次工具的聊天接口都宣传成 Agent，却没有状态和循环治理。', '让模型同时决定权限、执行与终止，缺少服务端的确定性边界。'],
          sources: [COMMUNITY.agent, GUIDES.agent, OFFICIAL.springTools, OFFICIAL.langchain4jTools],
        }),
        question({
          title: 'ReAct 模式是什么？',
          summary: 'ReAct 把“判断下一步”和“执行动作后的观察”交替进行，使模型能基于工具结果调整计划。生产实现应保存结构化动作与结果，不依赖暴露或解析模型的自由文本思维过程。',
          mechanism: [
            '模型收到当前目标和可用工具后输出结构化 tool call；Java 执行器校验并执行，把结果作为 observation 回传，直到模型给出最终答案或满足终止条件。',
            '每步只传必要状态与工具结果，结果要标注成功、可重试、业务拒绝或未知；错误分类能避免模型对永久错误反复调用。',
            '循环治理包括最大步数、相同参数重复检测、每工具次数、deadline 和预算；高风险动作在 observation 前插入用户确认状态。',
            '调试时记录结构化轨迹、选择的工具和结果摘要即可，不应要求或存储隐藏思维链；质量用任务成功率和工具选择准确率衡量。',
          ],
          example: '出行助手先调用天气，再根据降雨结果查询室内场馆，最后生成路线。若天气工具返回参数错误，模型可修正一次；同一参数连续失败两次则停止。每个 step 都落库，用户取消后不会继续调用。',
          followUps: [
            ['为什么不应解析自由文本中的“Action:”执行工具？', '自由文本格式脆弱且可能被用户内容注入；应使用模型原生工具调用和严格 schema，并由服务端白名单校验。'],
            ['Agent 怎样避免无限循环？', '设置最大步数、deadline、成本和重复动作检测，对错误分类，并在无进展时终止或转人工。'],
          ],
          pitfalls: ['依赖正则从自然语言提取动作，格式一变就误执行。', '只限制循环次数，不检测相同失败动作和已无进展状态。'],
          sources: [COMMUNITY.agentRoundup, GUIDES.agent, OFFICIAL.openAiTools, OFFICIAL.langchain4jTools],
        }),
        question({
          title: 'Agent 与确定性工作流怎样选择？',
          summary: '路径固定、规则清楚和副作用较强时优先确定性工作流；步骤需要根据开放信息动态选择时才使用 Agent。常见最佳实践是工作流控制主干，模型只负责局部判断。',
          mechanism: [
            '先列出步骤是否已知、分支是否可枚举、错误成本、审计要求和重试语义；能用状态机表达的流程不必交给模型自由规划。',
            '确定性工作流由代码控制顺序、补偿、超时和幂等，容易测试；Agent 擅长处理自然语言、模糊目标和动态工具选择，但结果方差更大。',
            '混合方式把模型放在分类、检索查询改写、候选选择等窄点，外层 Java 状态机决定能否进入下一步和是否执行副作用。',
            '两者都要保存状态与事件；评测不仅比较答案，还要比较成功路径、工具调用数、人工接管率、P95、费用和失败可恢复性。',
          ],
          example: '退款流程由 Java 状态机固定执行资格查询、金额计算、用户确认和退款；模型只把用户诉求分类并解释政策。故障探索任务路径不固定，可用 Agent 选择查日志或指标，但重启服务仍进入审批工作流。',
          followUps: [
            ['为什么工作流通常更适合支付场景？', '支付步骤、授权和补偿规则明确，确定性状态机更容易保证幂等、审计和恢复，不应让模型自由改变执行顺序。'],
            ['混合架构的核心边界是什么？', '模型输出候选或建议，代码掌握状态迁移、权限、业务不变量和副作用执行，任何高风险动作都不能只凭模型文本。'],
          ],
          pitfalls: ['为展示“智能”把固定审批流改成 Agent，反而降低可控性。', '把模型包在工作流里就认为安全，却没有校验模型输出与状态迁移条件。'],
          sources: [COMMUNITY.agentRoundup, GUIDES.system, OFFICIAL.springTools, OFFICIAL.owasp],
        }),
        question({
          title: 'Agent 的状态和记忆怎样设计？',
          summary: '会话历史、短期状态和长期记忆用途不同：历史用于审计，状态描述当前任务，长期记忆只保存经确认的稳定事实。不能把全部消息每轮原样回灌模型。',
          mechanism: [
            '完整历史以不可变事件保存，包含用户消息、工具调用和结果；任务状态用结构化字段记录目标、已完成步骤、待确认项和版本，便于恢复。',
            '短期上下文只选择最近完整轮次与必要状态，旧内容可摘要但保留来源；长期记忆经过筛选、用户确认和去重，带来源、置信度、有效期与删除能力。',
            '每个 conversationId、runId 都绑定用户与租户，读取记忆和工具结果时重新鉴权；不能依赖模型在 Prompt 中自行遵守隔离。',
            '并发更新采用乐观锁或事件序号，恢复时从最后已提交 step 继续；已执行副作用通过幂等记录判断，不能因重放再次执行。',
          ],
          example: '旅行 Agent 保存全部对话事件，当前状态只含目的地、日期和待确认项；“偏好无障碍酒店”经用户确认后才进入长期记忆。服务重启后按 run version 恢复，已经订票的步骤读取幂等记录，不会再次下单。',
          followUps: [
            ['Chat Memory 与 Chat History 有什么区别？', 'History 是完整事实记录，Memory 是为当前模型调用筛选出的有限上下文；Memory 会摘要和淘汰，不能替代审计历史。'],
            ['为什么模型推测不能自动写入长期记忆？', '推测可能错误或敏感，一旦跨会话复用会持续污染结果；写入应有来源、置信度、用户确认和删除机制。'],
          ],
          pitfalls: ['每轮发送完整历史，导致成本无限增长并扩大隐私暴露。', '恢复任务时重放已成功的副作用工具，造成重复订单或通知。'],
          sources: [COMMUNITY.agent, GUIDES.agent, OFFICIAL.springMemory, OFFICIAL.owasp],
        }),
      ],
    },
    {
      title: '评测、安全与可观测',
      questions: [
        question({
          title: 'AI 应用应该怎样建立评测集？',
          summary: '评测集应来自真实任务并覆盖常见、困难、无答案、安全和历史故障样本。每条样本需要输入、期望行为、证据或判分规则，而不是只收集“看起来不错”的演示问题。',
          mechanism: [
            '从脱敏线上日志、产品需求、客服纠错和故障复盘采样，按任务、语言、长度、风险和用户群分层，避免测试集只覆盖简单问题。',
            '确定性输出用精确匹配、schema 和规则评分；开放答案用 rubric、引用证据与人工抽检，LLM judge 必须用人工基准校准。',
            '评测集区分开发集和保留测试集，样本版本化并记录来源；Prompt 或模型不能根据测试答案定向优化，否则会产生评测泄漏。',
            '发布门禁同时看任务成功、忠实度、安全拒绝、延迟与成本，并按关键切片报告最差表现；均值提高不能掩盖高风险切片回退。',
          ],
          example: 'RAG 助手的 600 条样本含普通制度问答、无依据问题、过期版本、跨租户诱导和长表格。CI 每次比较检索 Recall@k、引用支持率、拒答准确率和 P95；生产纠错样本经脱敏审核后进入下一版回归集。',
          followUps: [
            ['为什么不能只用人工随便问十几个问题？', '样本太少且缺少分层与明确期望，无法发现长尾和安全回退，也无法对不同版本做稳定比较。'],
            ['线上反馈怎样进入评测集？', '先脱敏、去重和人工确认失败原因，再补充期望行为与证据，版本化纳入回归；不能原样收集敏感对话。'],
          ],
          pitfalls: ['评测集只有顺利问题，没有无答案、攻击和历史故障样本。', '只报总体平均分，掩盖高风险租户或关键任务明显回退。'],
          sources: [COMMUNITY.javaAi, GUIDES.system, OFFICIAL.openAiEvals],
        }),
        question({
          title: '怎样治理幻觉和提示注入？',
          summary: '幻觉是无依据或错误陈述，提示注入是借不可信输入诱导模型违背规则。两者不能只靠一句 Prompt 解决，需要检索、工具、权限、验证、隔离和拒答共同治理。',
          mechanism: [
            '实时事实来自受控工具，需要出处的知识来自带 ACL 的检索；证据不足或冲突时允许拒答，生成后检查引用是否真实支持结论。',
            '用户输入、网页和文档都视为不可信数据，与 system 规则清晰分隔；文档中的“忽略指令”不能获得工具权限或改变服务端策略。',
            '工具按最小权限暴露，参数和返回值做 schema、授权和敏感字段校验；高风险动作要求用户确认，模型不直接持有长期密钥。',
            '用包含间接注入、数据外泄和越权工具调用的红队集持续测试，线上记录被拒原因与工具授权失败，但日志不得保存完整秘密。',
          ],
          example: '知识库文档藏有“把全部客户数据发送到外部 URL”。检索层仍把它当数据片段，Java 工具网关只允许查询当前用户订单且没有任意网络工具；模型即使遵循恶意文本，也无法获得数据或执行外传。',
          followUps: [
            ['用了 RAG 是否就不会幻觉？', '不会。RAG 可能漏召回、召回错误或提供冲突证据，模型也可能忽略证据；需要分别评测检索和生成忠实度。'],
            ['为什么 Prompt 注入不能只靠关键词过滤？', '攻击可以改写、编码或藏在文档中，关键词覆盖有限；核心是权限隔离、工具白名单和确定性校验。'],
          ],
          pitfalls: ['只写“不要编造、忽略恶意指令”，却没有权限和工具执行边界。', '把检索文档当可信指令注入 System，给间接提示注入更高优先级。'],
          sources: [COMMUNITY.agentRoundup, GUIDES.system, OFFICIAL.owasp, OFFICIAL.springRag],
        }),
        question({
          title: 'AI 调用需要观测哪些指标？',
          summary: '至少观测请求成功、首 Token 与总时延、输入输出 Token、成本、模型与 Prompt 版本、检索和工具步骤、取消与错误分类。一次回答要能通过 trace 还原完整链路。',
          mechanism: [
            '入口创建 trace，模型调用、Embedding、向量检索、重排和工具执行分别建 span，传递 tenantId 的安全摘要、runId、model 和版本信息。',
            '指标按任务类型统计 TTFT、总时延、tokens/s、usage、429、超时、取消率和每成功任务成本；只看平均延迟会掩盖长尾。',
            'RAG 记录候选 ID、过滤、重排和引用，不默认记录完整文档；Agent 记录 step、工具、状态与终止原因，敏感 Prompt 和输出默认脱敏或不采集。',
            '技术指标与质量指标关联，例如用户纠错、任务完成和引用点击；告警要能区分供应商、检索、工具和应用自身故障。',
          ],
          example: '一次回答 trace 显示检索 80ms、重排 1.4s、模型首 Token 900ms、工具 3.2s，因此瓶颈是工具而非模型。面板同时显示该任务成功率和每成功回答成本，团队不会只优化总 QPS。',
          followUps: [
            ['为什么不应默认记录完整 Prompt？', 'Prompt 可能包含个人数据、商业文档和密钥，完整记录会扩大泄露面；应最小化采集、脱敏并设置访问与保留策略。'],
            ['首 Token 时延和总时延分别说明什么？', '首 Token 反映排队、请求处理和开始生成的等待感，总时延还包含完整输出长度与工具步骤，两者优化方向不同。'],
          ],
          pitfalls: ['只有接口耗时和 500 数量，看不到模型、检索与工具各阶段。', '为了排障记录完整上下文和密钥，造成新的数据安全风险。'],
          sources: [COMMUNITY.aiBackend, GUIDES.system, OFFICIAL.springObservability, OFFICIAL.genAiSemconv],
        }),
        question({
          title: '怎样优化 AI 服务的延迟、成本与可靠性？',
          summary: '先按链路测量，再减少不必要工作：选择合适模型、控制上下文和输出、并行独立步骤、缓存稳定前缀并治理重试。优化目标应是每个成功任务的成本，而非单纯少用 Token。',
          mechanism: [
            '分解排队、检索、重排、工具、首 Token 和生成耗时，按任务查看 P50/P95；未定位瓶颈就扩容 Java 实例通常无效。',
            '先删重复上下文和无关工具 schema，限制输出长度；低风险简单任务可路由小模型，高风险任务保持经过评测的强模型。',
            '相互独立的检索与工具调用可受控并行，稳定 system 前缀可利用缓存；所有并发都受 deadline、舱壁和供应商 RPM/TPM 配额约束。',
            '仅对可重试错误采用指数退避和抖动，副作用工具依赖业务幂等；熔断与降级必须记录实际模型，不能静默牺牲质量。',
          ],
          example: '客服服务发现 35% 输入来自重复工具定义，便只注册当前意图需要的工具，并将两路独立检索并行。429 按 Retry-After 退避，超出 deadline 直接失败；上线后比较任务成功率、P95 与每成功回答费用。',
          followUps: [
            ['为什么增加 Java 实例可能不降低模型延迟？', '瓶颈可能在供应商排队、TPM 配额、工具或输出长度，增加入口实例只会制造更多在途请求。'],
            ['什么请求不应该自动降级模型？', '当请求绑定固定模型评测、数据地域合规、特定上下文长度、工具调用或严格 schema 能力，以及医疗、财务等高风险判断时，不应静默切换。原因是备用模型可能改变数据流向、截断输入、拒绝不同工具或破坏输出契约，结果虽返回 200 却已不满足原任务。路由前应做能力与合规门禁；不兼容就 fail-closed 或请求用户确认，并用固定回归集验证每个允许的降级组合。'],
          ],
          pitfalls: ['所有错误都立刻重试，造成重试风暴和重复工具副作用。', '只追求 Token 少，导致关键信息被删、任务成功率下降而总成本反升。'],
          sources: [COMMUNITY.aiBackend, GUIDES.system, OFFICIAL.openAiLatency, OFFICIAL.springObservability],
        }),
      ],
    },
    {
      title: 'Java 工程接入',
      questions: [
        question({
          title: 'Spring AI 与 LangChain4j 怎样选择？',
          summary: '选型看团队栈、所需抽象和退出成本。Spring AI 更贴近 Spring 生态与 Advisor、可观测体系；LangChain4j 的 AI Services、RAG 和工具抽象直接。框架不会替代业务治理。',
          mechanism: [
            '用需求矩阵比较模型供应商、流式、结构化输出、RAG、工具、记忆、观测、版本稳定性和社区维护，不按示例代码长度下结论。',
            '在同一模型和数据集上做 spike，验证错误映射、工具参数、流式取消、引用、监控与升级；记录 P95、成功率、实现成本和故障行为。',
            '领域层定义 Chat、Embedding、Retrieval 与 ToolExecutor 端口，框架对象留在适配器；这样可做双写验证、逐步迁移和供应商降级。',
            'Spring Boot 团队可优先验证 Spring AI，强调接口式 AI Service 的团队可验证 LangChain4j，但最终结论必须来自自己的场景评测。',
          ],
          example: '企业知识助手已使用 Spring Boot、Micrometer 和 Reactor，先用 Spring AI 实现 RAG、SSE 与工具调用；同时用 50 条样本做 LangChain4j spike。比较取消传播、引用、P95 和升级成本后再决定，而不是保留两套框架长期混用。',
          followUps: [
            ['为什么要再包一层自己的接口？', '框架和模型升级快，自有端口能隔离供应商类型，支持契约测试、灰度迁移和故障降级，避免领域代码被 SDK 渗透。'],
            ['框架提供 RAG 是否代表质量已经可用？', '不代表。切分、索引、权限、评测与拒答仍是应用责任，框架只提供组合组件和接入抽象。'],
          ],
          pitfalls: ['只比较功能列表和热度，没有验证错误、取消和升级等生产路径。', '业务代码直接依赖框架 DTO，切换模型或框架时大面积修改。'],
          sources: [COMMUNITY.javaAi, GUIDES.javaProject, OFFICIAL.springAi, OFFICIAL.langchain4j],
        }),
        question({
          title: 'Java 流式接口怎样处理 SSE、背压和取消？',
          summary: '服务端应把上游模型流转换为版本化 SSE 事件，并让超时、客户端断开和主动停止沿 Reactor 链传播。SSE 提供单向推送，背压更多依靠限流、缓冲上限和取消治理。',
          mechanism: [
            '事件协议至少包含 runId、seq、type 和 schemaVersion，并区分 start、text_delta、tool、usage、error、done；前端不依赖供应商原始 JSON。',
            'WebFlux 链使用 timeout、doOnCancel 或等价机制释放上游订阅；阻塞工具调用放到受控调度器，不能阻塞事件循环线程。',
            '浏览器消费慢时设置有界缓冲和明确溢出策略，必要时合并细小 delta；连接、租户和模型并发由舱壁限制，不能无限积压。',
            '最终消息在 done 后原子提交，过程可批量 checkpoint；断线恢复按 runId 获取快照或从序号续传，不能把每个 delta 当独立最终消息。',
          ],
          example: '用户点击停止后，前端调用 cancel run，服务端更新状态并取消模型订阅；SSE 发送 cancelled 后关闭。一个阻塞搜索工具在 boundedElastic 上执行且受 deadline 控制，慢消费者最多缓存有限事件，超限则中止而非撑爆内存。',
          followUps: [
            ['SSE 与 WebSocket 怎样选？', '先看通信方向和消息类型，而不是笼统比较“谁更快”。一次提问、服务端持续返回 UTF-8 事件时，SSE/HTTP 流可复用现有鉴权、代理和自动重连语义；客户端也持续上传音频、协同操作或二进制帧时，WebSocket 的全双工消息通道更合适。两者都要自行定义游标、心跳、取消和幂等恢复；用首事件时间、断线恢复率、代理兼容与连接成本做同链路压测后再选。'],
            ['为什么不能每个 delta 都写一次数据库？', '会放大事务和存储压力，也会暴露大量不完整状态；应批量 checkpoint，并在结束时提交服务端聚合的最终快照。'],
          ],
          pitfalls: ['在 Netty 事件循环中执行阻塞工具调用，拖慢所有流式连接。', '浏览器关闭后上游仍生成，隐藏消耗 Token、连接和线程资源。'],
          sources: [COMMUNITY.aiBackend, GUIDES.javaProject, OFFICIAL.webflux, OFFICIAL.reactor, OFFICIAL.sse],
        }),
        question({
          title: '会话状态与向量数据怎样存储？',
          summary: '业务事实、会话事件和向量索引用途不同，应分层存储并用稳定 ID 关联。关系库保存权威状态与审计，向量库保存可重建索引，缓存只保存可丢失的热点数据。',
          mechanism: [
            '关系库保存 conversation、message、run、step、tool execution 和权限元数据，通过事务、版本号与幂等键保证状态一致；大文本可放对象存储。',
            '向量库保存 chunkId、embedding、documentVersion、tenantId 和过滤字段，原文与权限主数据仍以权威存储为准；索引损坏时应能从源文档重建。',
            '文档摄取采用 outbox 或任务表驱动解析与嵌入，状态区分 pending、indexed、failed、deleted；更新按内容哈希去重，删除必须同步清理旧向量。',
            '查询先确定用户与租户，再把 ACL 过滤带入检索并在返回后复核；Redis 可缓存短期结果和限流计数，但不能成为唯一审计记录。',
          ],
          example: 'PostgreSQL 保存文档版本、ACL、会话和 Agent step，pgvector 表保存带 tenantId 的 chunk 向量。文档更新写入 outbox，异步重建新版本并原子切换 activeVersion，随后清理旧向量；失败任务可重试且不会重复入库。',
          followUps: [
            ['为什么向量库不应成为文档唯一来源？', '向量索引是派生数据，可能重建、换模型或丢失精确结构；原文、版本和权限应保存在权威存储。'],
            ['文档删除怎样避免旧内容继续被召回？', '先标记版本不可检索并让查询过滤立即生效，再异步物理删除向量与缓存，最后通过审计任务验证没有残留。'],
          ],
          pitfalls: ['只保存向量不保存文档版本和 chunk 来源，无法引用、更新或删除。', '文档更新只追加新向量，旧版本仍可被召回并与新内容冲突。'],
          sources: [COMMUNITY.ragBackend, GUIDES.javaProject, OFFICIAL.springVectorDb, OFFICIAL.pgvector],
        }),
      ],
    },
    {
      title: 'Spring AI 工程实践',
      questions: [
        question({
          title: 'ChatModel 与 ChatClient 的边界是什么？',
          summary: 'ChatModel 负责模型请求与响应；ChatClient 在其上组合消息、参数、Advisor 和工具。业务层宜依赖自有用例接口，框架类型留在适配层。',
          mechanism: [
            'ChatModel 适合框架适配、精确控制 Prompt 和响应元数据，便于做模型适配器与契约测试；ChatClient 适合应用编排，用 fluent API 统一请求级配置和同步、流式调用。',
            '一个 ChatClient.Builder 通常围绕注入的 ChatModel 创建，可配置默认 system 文本、options、advisors 和 tools；请求级配置只覆盖当前调用，不应通过修改共享可变对象串扰并发请求。',
            '领域层定义例如 AnswerQuestion、GenerateSummary 等用例端口，适配层才持有 ChatClient；需要读取 token usage、finish reason 或供应商扩展字段时，在适配层下探 ChatResponse。',
            '切换模型时先用同一契约评测结构化输出、工具调用、流式取消和异常映射，再替换适配器；抽象统一的是调用形态，不保证各模型能力和参数语义完全一致。',
          ],
          example: '知识问答服务对外只暴露 answer(QueryContext)；Spring 适配器用 ChatClient 组装租户规则、RAG Advisor 和输出格式。离线评测工具需要 finish reason 与 usage 时直接调用 ChatModel，但这些框架类型都不会进入领域实体。',
          followUps: [
            ['什么时候应该直接使用 ChatModel？', '需要精确控制 Prompt、批量做模型契约测试、读取完整 ChatResponse 元数据，或正在实现更高层编排组件时可直接使用；普通业务用例通常用 ChatClient 更简洁。'],
            ['使用 ChatClient 后还能切换模型吗？', '可以重新以目标 ChatModel 构建客户端或适配器，但必须重跑能力与质量回归；统一接口不代表工具、参数、流式事件和结构化输出在不同供应商间完全等价。'],
          ],
          pitfalls: ['控制器直接拼 Prompt 并到处注入 ChatModel，导致默认规则、观测和错误处理重复。', '把 ChatClient 当成跨请求保存用户上下文的会话对象，造成状态串扰；会话状态应由应用显式管理。'],
          sources: [COMMUNITY.javaAi, GUIDES.javaProject, GUIDES.xiaolinLlm, OFFICIAL.springAi, OFFICIAL.springChatClient],
        }),
        question({
          title: 'Advisor 链怎样组织，顺序为什么重要？',
          summary: 'Advisor 是 ChatClient 前后的拦截链，可改写请求并处理响应。顺序决定后续节点看到的上下文及返回次序，应显式配置 order，并分别测试同步、流式链路。',
          mechanism: [
            '请求进入链时，Advisor 可以扩充 Prompt、上下文参数或调用下一个节点；响应返回时可补充元数据、记录指标或转换结果，形成类似中间件的包裹关系。',
            '先做身份与租户校验，再做带权限过滤的检索，随后才把证据装配进 Prompt；若先检索后鉴权，即使最终没有展示，也可能已经造成跨租户数据访问。',
            '用明确的 order 和集中配置声明顺序，并分别验证同步与流式路径；新增 Advisor 时做链路快照或集成测试，确认 Prompt、上下文和响应没有被重复修改。',
            'Advisor 只承载横切编排，不替代确定性业务事务；扣款、写库和权限决策仍放在受控服务或工具网关中，并以 trace 标注每个 Advisor 的耗时与结果。',
          ],
          example: '企业问答链按“认证上下文 → ACL 过滤 → Query 改写 → RAG 检索 → 引用校验 → 观测”组织。集成测试使用两个租户的同名文档，断言检索前已带 tenantId 过滤，并检查流式与非流式请求得到一致的引用集合。',
          followUps: [
            ['记忆 Advisor 和 RAG Advisor 谁先执行？', '没有脱离场景的固定答案；如果检索问题需要结合近期对话，应先生成受控的会话上下文或独立改写查询，再执行带 ACL 的检索，但不能让整段历史无界进入检索。'],
            ['为什么不把所有逻辑都写进一个 Advisor？', '会失去单一职责和独立测试能力，也难以定位耗时与权限边界；拆分后可明确每步输入输出，但顺序与共享上下文契约必须集中管理。'],
          ],
          pitfalls: ['检索 Advisor 在租户过滤之前执行，造成越权召回或敏感数据进入上下文。', '只测试普通 call 路径，流式路径的 Advisor 未执行、重复执行或无法正确传播取消。'],
          sources: [COMMUNITY.ragBackend, GUIDES.javaProject, GUIDES.xiaolinRag, OFFICIAL.springChatClient, OFFICIAL.springRag],
        }),
        question({
          title: 'ToolCallback 怎样定义、注册并完成一次调用？',
          summary: 'ToolCallback 用定义对象声明工具和输入 schema，以 call 接收参数并返回字符串。ChatClient 可直接注册或按名称解析；流式调用不会让回调自动异步。',
          mechanism: [
            '可用 @Tool 标注方法，或显式构造 MethodToolCallback、FunctionToolCallback；框架可依据方法参数或函数输入类型生成 JSON Schema，也允许在需要时提供自定义 schema。',
            '请求可通过 toolCallbacks 直接携带回调，默认配置可用 defaultToolCallbacks；若只传 toolNames，则由 ToolCallbackResolver 在运行时按名称找到对应回调。',
            '一次完整循环是：模型读取 ToolDefinition 后返回 tool call，框架解析 JSON 参数并调用 callback，再把 callback 的字符串结果作为 tool response 发回模型，直到得到最终回答；returnDirect 可让结果跳过下一次模型调用。',
            'ToolCallback.call 是同步返回契约。即使使用 ChatClient.stream()，工具执行也不会自动变成非阻塞；耗时 I/O 需要显式调度或自定义执行编排，并处理超时、取消和下一轮模型调用。',
          ],
          example: '天气工具用 record WeatherRequest(String city) 生成输入 schema，以 FunctionToolCallback 注册为 weatherNow。ChatClient 通过 toolNames("weatherNow") 交给 resolver 查找；模型发出 {"city":"杭州"} 后，callback 返回 JSON 字符串，框架再发起下一轮模型调用生成自然语言答案。',
          followUps: [
            ['toolCallbacks 与 toolNames 有什么区别？', 'toolCallbacks 把具体回调直接放进当前请求；toolNames 只声明名称，再由 ToolCallbackResolver 查找实现，适合集中注册和按名称选择。'],
            ['returnDirect 什么时候使用？', '当 callback 返回值本身就是面向调用方的最终结果、不需要模型再次改写时可启用；否则默认把工具结果交回模型生成最终回答。'],
          ],
          pitfalls: ['自定义 schema 与 Java 入参类型不一致，模型给出的 JSON 无法被 callback 正确解析。', '误以为 stream() 会异步执行阻塞 callback，结果阻塞响应链并延长首个流式事件。'],
          sources: [COMMUNITY.agent, GUIDES.javaProject, GUIDES.xiaolinTools, OFFICIAL.springTools],
        }),
        question({
          title: 'VectorStore、SearchRequest 与元数据过滤怎样配合？',
          summary: 'VectorStore 负责文档写入、删除和相似度检索；SearchRequest 承载 query、topK、阈值和过滤表达式。字段支持、索引要求与性能仍取决于具体适配器。',
          mechanism: [
            'add 接收包含文本和 metadata 的 Document，适配器调用 EmbeddingModel 后写入后端；delete 按 ID 删除，similaritySearch(SearchRequest) 返回匹配 Document。',
            'SearchRequest.Builder 设置 query、topK、similarityThreshold 和 filterExpression；过滤可用便携表达式字符串或 Filter.Expression 构造，随后由具体 VectorStore 转成后端查询。',
            '不同适配器对 metadata 类型、比较运算、逻辑组合和可过滤字段有不同限制；部分后端还要求预先建立 metadata 索引，不能只凭统一接口假设行为完全一致。',
            '适配器验收至少覆盖写入、删除、阈值边界、复合过滤与空结果，并记录实际返回顺序和分数；切换向量库时用同一数据夹具跑契约测试，而不是只验证能连接。',
          ],
          example: 'Document metadata 保存 tenantId、department 和 version。查询用 SearchRequest.builder().query(question).topK(8).similarityThreshold(0.72).filterExpression("tenantId == \'t-42\' && version == 7").build()；在 pgvector 与 Elasticsearch 适配器上分别验证字段类型、索引配置和空结果行为。',
          followUps: [
            ['filterExpression 会在所有向量库上产生完全相同的查询吗？', '不会。Spring AI 提供便携表达式，但适配器仍要映射到底层语法；运算符、字段类型、索引要求和性能可能不同，需要查看对应 VectorStore 文档并做契约测试。'],
            ['为什么过滤应写进 SearchRequest，而不是取回后再用 Java filter？', 'SearchRequest 让后端在候选检索阶段缩小范围，避免先取无关候选再丢弃；后置过滤还可能让最终数量远小于 topK。'],
          ],
          pitfalls: ['把 metadata 中的数字写成字符串，却按数值比较，导致适配器过滤结果不一致。', '把某个后端的分数范围和阈值经验原样搬到另一适配器，召回数量突然变化。'],
          sources: [COMMUNITY.ragBackend, GUIDES.rag, GUIDES.xiaolinRag, OFFICIAL.springVectorDb],
        }),
        question({
          title: '模型切换时怎样做评测、观测和回归？',
          summary: '模型迁移应把模型、Prompt、Advisor、工具、检索快照和采样参数冻结成版本包，在同一评测集上对照，再按用户或会话稳定分桶灰度。回滚恢复整包配置，不能只改模型名。',
          mechanism: [
            '先生成不可变配置包，记录 provider、model、options、Prompt、Advisor 顺序、工具 schema、检索与知识库版本；基线与候选除模型变量外保持一致。',
            '用同一版本化评测集和同一判分规则重复运行，比较任务成功、结构通过、引用与工具结果，同时记录延迟和用量；测试样本与输出都绑定配置包 ID。',
            '灰度用 userId 或 conversationId 稳定哈希分桶，使同一用户持续命中同一配置；逐级扩量时只改变流量比例，避免跨请求切换污染会话比较。',
            '为质量、错误和延迟设停止阈值；回滚直接恢复上一配置包，连同 Prompt、工具、Advisor 和检索版本一起还原，随后用相同样本确认基线恢复。',
          ],
          example: '团队冻结 baseline-17 与 candidate-18 两个配置包，在同一 500 条样本上对照；通过后把 5% conversationId 稳定路由到 candidate-18。若任务成功率跌破门槛，路由立即恢复 baseline-17，所有相关参数随包一起回退。',
          followUps: [
            ['为什么灰度要稳定分桶？', '同一用户或会话若在两个模型间跳动，会污染上下文并让问题难以归因；稳定分桶能形成可比较的候选组和基线组。'],
            ['为什么回滚不能只改回模型名？', '候选模型可能配套修改参数、Prompt、工具 schema 或检索版本；只改模型名会留下不兼容组合，无法真正恢复已验证基线。'],
          ],
          pitfalls: ['基线与候选同时改变 Prompt 和检索数据，结果差异无法归因到模型。', '只保存逻辑模型别名，没有可恢复的完整配置包和历史路由版本。'],
          sources: [COMMUNITY.aiBackend, GUIDES.system, GUIDES.xiaolinLlm, OFFICIAL.springAi, OFFICIAL.springObservability, OFFICIAL.openAiEvals],
        }),
      ],
    },
  ],
}
