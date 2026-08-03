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
    bankId: 'java-ai-applications',
    title: /RAG.*全链路|全链路.*RAG/,
    visual: {
      src: '/content/diagrams/360-ai-frontend/rag-pipeline-v1.svg',
      alt: 'Java RAG 应用从知识摄取到检索、生成和引用校验的全链路图',
      caption: '先将摄取、召回、重排和生成拆成可测阶段，再用端到端任务成功率做最终验收。',
    },
  },
  {
    bankId: 'java-ai-applications',
    title: /ReAct 循环/,
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
