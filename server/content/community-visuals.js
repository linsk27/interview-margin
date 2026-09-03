const RULES = [
  {
    bankId: 'frontend-ai-interviews',
    title: /Fetch 流式响应/,
    visual: {
      src: '/content/diagrams/frontend-ai/sse-framing-buffer-v1.svg',
      alt: '一条 SSE 消息被网络任意拆开，再经连续解码和缓冲区恢复成完整事件的过程图',
      caption: '下面以 SSE 为例：read() 每次拿到的只是任意一段字节，必须先连续解码，再等空行出现后解析完整事件。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /SSE/,
    visual: {
      src: '/content/diagrams/frontend-ai/streaming-answer-pipeline-v1.svg',
      alt: 'AI 回答从模型流式输出到浏览器增量渲染的完整链路图',
      caption: '协议解析、状态合并与低频渲染分层处理，取消和断线也必须沿整条链路传播。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /RAG.*(?:链路|评估|整理资料|带出处)|(?:链路|评估).*RAG/,
    visual: {
      src: '/content/diagrams/360-ai-frontend/rag-pipeline-v1.svg',
      alt: 'RAG 从文档摄取、召回、重排到带引用回答的流程图',
      caption: '检索质量和生成质量需要分阶段观测，不能只用最终回答观感定位问题。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /BM25.*语义搜索/,
    visual: {
      src: '/content/diagrams/ai/hybrid-retrieval-fusion-v1.svg',
      alt: 'BM25 关键词名单和语义搜索名单先按各自名次融合，再进行精细重排的流程图',
      caption: '两种搜索的原始分数不是同一把尺子；先比较各自名次，再融合和重排更容易解释与验证。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /传统 API.*MCP|Skill 与 MCP/,
    visual: {
      src: '/content/diagrams/ai/mcp-agent-tool-boundary-v1.svg',
      alt: '用户目标、Agent、Skill、MCP 客户端、MCP 服务和外部工具之间的职责边界图',
      caption: 'Skill 教“怎么做”，MCP 统一“怎么连接能力”，Agent 决定下一步；执行权限仍由可信应用控制。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /工具链执行到一半失败|工具调用.*最小权限/,
    visual: {
      src: '/content/diagrams/java-ai/agent-execution-guardrails-v1.svg',
      alt: 'Agent 在工具执行前经过权限、参数和人工确认，执行后记录结果并判断继续或停止的闭环图',
      caption: '模型只提出下一步；重试、幂等、权限、人工确认和停止条件由应用强制执行。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /AI 生成任务.*防重复.*续传.*负载/,
    visual: {
      src: '/content/diagrams/frontend-ai/idempotent-stream-control-v1.svg',
      alt: 'AI 生成任务通过幂等键防重复、事件序号续传、有界队列背压和并发门禁控制负载的流程图',
      caption: '幂等键、事件序号、背压和并发限制分别解决不同故障，不能用一个 loading 状态代替。',
    },
  },
  {
    bankId: 'frontend-ai-interviews',
    title: /Function Calling|工具调用.*循环/,
    visual: {
      src: '/content/diagrams/360-ai-frontend/function-calling-loop-v1.svg',
      alt: '模型提出工具调用、服务端执行并回传结果的受控循环图',
      caption: '模型只提出结构化意图，权限校验、实际执行与终止条件始终由应用层掌控。',
    },
  },
  {
    bankId: 'java-backend-interviews',
    title: /B\+Tree/,
    visual: {
      src: '/content/diagrams/database-cache/b-plus-tree-v1.svg',
      alt: 'InnoDB B+Tree 内部节点、叶子页与范围扫描关系图',
      caption: '内部节点负责导航，数据集中在有序叶子页，使点查与范围扫描兼顾较少随机 I/O。',
    },
  },
  {
    bankId: 'java-backend-interviews',
    title: /ThreadPoolExecutor/,
    visual: {
      src: '/content/diagrams/java-backend/thread-pool-admission-v1.svg',
      alt: 'ThreadPoolExecutor 从核心线程、工作队列到拒绝策略的任务接纳流程图',
      caption: '线程池先扩核心线程、再入队、队满后才扩到最大线程，最终进入明确的过载策略。',
    },
  },
  {
    bankId: 'java-backend-interviews',
    title: /缓存.*一致性|一致性.*缓存/,
    visual: {
      src: '/content/diagrams/java-backend/cache-consistency-v1.svg',
      alt: '数据库更新、缓存失效、延迟重试与消息补偿的一致性流程图',
      caption: '数据库是事实源，缓存失效失败进入可观测补偿链路，并用版本避免旧值回写。',
    },
  },
  {
    bankId: 'java-foundations',
    title: /(?:双等号|==).*equals.*hashCode/,
    visual: {
      src: '/content/diagrams/java-foundations/object-contract-v1.svg',
      alt: 'Java 引用相等、equals 语义相等与 hashCode 散列契约关系图',
      caption: '先区分引用身份与业务相等，再确保相等对象产生相同散列值，集合才能稳定定位元素。',
    },
  },
  {
    bankId: 'java-foundations',
    title: /HashMap 的 put 和 get 流程/,
    visual: {
      src: '/content/diagrams/java-foundations/hashmap-put-resize-v2.svg',
      alt: 'HashMap 从计算哈希、定位桶到链表树化和扩容的处理流程图',
      caption: '先用扰动后的哈希定位桶，再区分空桶、同键更新与冲突插入；达到阈值后统一扩容迁移。',
    },
  },
  {
    bankId: 'java-foundations',
    title: /ThreadPoolExecutor 的核心参数和执行流程/,
    visual: {
      src: '/content/diagrams/java-backend/thread-pool-admission-v1.svg',
      alt: 'ThreadPoolExecutor 从核心线程、工作队列到拒绝策略的任务接纳流程图',
      caption: '先补核心线程、再尝试入队，队满后扩到最大线程；仍无法接纳时执行明确的拒绝策略。',
    },
  },
  {
    bankId: 'java-foundations',
    title: /wait、sleep 和 join/,
    visual: {
      src: '/content/diagrams/java-foundations/thread-coordination-v1.svg',
      alt: 'Java 线程在监视器等待、通知、中断与 join 协作中的状态流转图',
      caption: '条件循环守住业务谓词，通知只让等待者重新竞争锁；中断与 join 都必须明确传播策略。',
    },
  },
  {
    bankId: 'java-foundations',
    title: /JVM 运行时数据区/,
    visual: {
      src: '/content/diagrams/java-foundations/jvm-memory-v1.svg',
      alt: 'Java 进程中堆、Metaspace、直接内存和线程栈的边界与限制图',
      caption: 'Xmx 只约束 Java 堆；容量规划还要给类元数据、直接缓冲区、线程栈和本地组件留出余量。',
    },
  },
  {
    bankId: 'java-ai-applications',
    title: /什么是 RAG|RAG.*(?:完整流程|质量)/,
    visual: {
      src: '/content/diagrams/360-ai-frontend/rag-pipeline-v1.svg',
      alt: 'Java RAG 应用从知识摄取到检索、生成和引用校验的全链路图',
      caption: '先将摄取、召回、重排和生成拆成可测阶段，再用端到端任务成功率做最终验收。',
    },
  },
  {
    bankId: 'java-ai-applications',
    title: /ReAct/,
    visual: {
      src: '/content/diagrams/java-ai/agent-execution-guardrails-v1.svg',
      alt: 'Agent 规划、工具执行、结果观察与安全终止的受控循环图',
      caption: '每一步都经过权限、预算和结构校验；达到终止条件或错误阈值后立即结束循环。',
    },
  },
  {
    bankId: 'java-ai-applications',
    title: /SSE/,
    visual: {
      src: '/content/diagrams/frontend-ai/streaming-answer-pipeline-v1.svg',
      alt: 'Java 服务端模型流到 SSE 客户端增量渲染的端到端链路图',
      caption: '服务端要传递取消、超时和完成状态，客户端再负责协议分帧、合并与节流渲染。',
    },
  },
]

export function visualForCommunityQuestion(bankId, title) {
  return RULES.find((rule) => rule.bankId === bankId && rule.title.test(title))?.visual
}

export function communityVisualEntries() {
  return RULES.map((rule) => ({ bankId: rule.bankId, title: rule.title, visual: rule.visual }))
}
