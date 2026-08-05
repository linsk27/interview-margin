const RULES = [
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
    title: /RAG.*(?:链路|评估)|(?:链路|评估).*RAG/,
    visual: {
      src: '/content/diagrams/360-ai-frontend/rag-pipeline-v1.svg',
      alt: 'RAG 从文档摄取、召回、重排到带引用回答的流程图',
      caption: '检索质量和生成质量需要分阶段观测，不能只用最终回答观感定位问题。',
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
