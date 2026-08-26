export const BUILTIN_SECTION_GROUPS = {
  interview: [
    ['前端基础', ['Part 1：前端八股题']],
    ['项目与场景实战', ['Part 2：项目拷打题', 'Part 3：场景题']],
    ['后端与系统基础', ['Part 4：后端、网络、Redis、MQTT、SQL、BLE 补充题']],
    ['ContextForge 源码与 AI 工程', ['Part 5：ContextForge 源码对照学习（新增）']],
  ],
  javascript: [
    ['语言与类型基础', ['JavaScript 01-10：数据类型与判断', 'JavaScript 11-20：隐式转换与相等比较']],
    ['作用域、函数与对象模型', ['JavaScript 21-30：作用域、提升与闭包', 'JavaScript 31-40：函数、参数与 this', 'JavaScript 41-50：对象、属性与原型']],
    ['集合与异步编程', ['JavaScript 51-60：数组与集合操作', 'JavaScript 61-70：Promise、async 与事件循环']],
    ['浏览器与工程实践', ['JavaScript 71-80：DOM、存储与网络', 'JavaScript 81-90：模块、类与迭代器', 'JavaScript 91-100：集合、错误、安全与性能']],
  ],
  'git-engineering': [
    ['Git 基础模型与版本历史', ['Git 对象与工作区', '分支、合并与历史']],
    ['协作与发布', ['远程协作与发布']],
    ['排障与工程质量', ['排障与工程质量']],
  ],
  'vue-core': [
    ['响应式与渲染机制', ['响应式系统', '渲染与调度']],
    ['组件与状态设计', ['组件与状态设计']],
    ['工程实践与源码边界', ['性能、工程与安全', '源码与边界追问']],
  ],
  'react-core': [
    ['组件、渲染与 Hooks', ['组件与渲染模型', 'Hooks 与副作用']],
    ['状态、数据与并发性能', ['状态架构与数据请求', '并发、性能与 Fiber']],
    ['工程质量与安全', ['工程测试与安全']],
  ],
  'frontend-engineering': [
    ['浏览器、网络与性能', ['浏览器与事件循环', 'HTTP、缓存与性能']],
    ['构建、TypeScript 与发布', ['Vite、构建与发布', 'TypeScript 类型系统']],
    ['架构、质量与安全', ['架构、测试与可维护性', '安全与跨端边界']],
  ],
  'backend-fullstack': [
    ['API 与服务实现', ['API 与协议设计', 'Node.js 运行机制', 'Flask 与 Python 服务']],
    ['身份与访问安全', ['认证、会话与 RBAC']],
    ['可靠性、并发与消息', ['可靠性、并发与消息']],
    ['AI 应用后端', ['Agent 与 AI 应用后端']],
  ],
  'database-cache': [
    ['SQL、索引与查询优化', ['SQL 与索引设计', '查询优化与建模']],
    ['事务、锁与一致性', ['事务、锁与一致性']],
    ['Redis 与缓存', ['Redis 与缓存一致性']],
  ],
  'network-deployment': [
    ['网络协议与实时通信', ['网络分层与传输', 'HTTP、TLS 与实时通信']],
    ['Linux 与系统排障', ['Linux 排障与进程']],
    ['Nginx 与生产部署', ['Nginx 与生产部署']],
  ],
  'frontend-ai-interviews': [
    ['流式交互与生成式 UI', ['流式对话与长会话体验', '生成式 UI 与前端隔离']],
    ['RAG 检索与数据治理', ['RAG 检索链路与查询优化', 'RAG 数据、评估与治理']],
    ['Agent、MCP 与上下文工程', ['Agent、MCP、Skill 与 Workflow', 'Context、Memory 与模型网关']],
    ['安全、评估与产品化', ['安全、权限与可靠性', '评估、产品价值与 AI Coding']],
  ],
  'java-foundations': [
    ['Java 语言基础', ['一、Java 语言基础（14 题）']],
    ['集合框架', ['二、Java 集合高频（11 题）']],
    ['并发编程', ['三、Java 并发高频（14 题）']],
    ['JVM 与现代 Java', ['四、JVM 与垃圾回收（11 题）', '五、现代 Java 与高频补全（10 题）']],
  ],
  'java-backend-interviews': [
    ['Spring 应用基础', ['Spring 与 Spring Boot']],
    ['数据存储与缓存', ['MySQL', 'Redis']],
    ['消息与分布式系统', ['消息队列', '分布式与服务保护']],
    ['Java 工程与线上排障', ['HTTP、Linux 与线上排障', 'Spring 与 MyBatis 工程高频']],
  ],
  'java-ai-applications': [
    ['模型、Prompt 与工具调用', ['模型与 API 基础', 'Prompt 与工具调用']],
    ['RAG 与 Agent 工作流', ['RAG 核心', 'Agent 与确定性工作流']],
    ['安全、评测与可观测', ['评测、安全与可观测']],
    ['Java / Spring AI 工程接入', ['Java 工程接入', 'Spring AI 工程实践']],
  ],
  '360-ai-frontend': [
    ['项目与 AI 核心原理', ['RAG 方案选型', 'AI 编程工具安全', '项目技术原理', 'RAG、Agent 与模型原理']],
    ['AI 前端与浏览器基础', ['SSE、AI 前端与 React', '计算机基础与浏览器']],
    ['前端手写与全栈基础', ['高频手写题', '前端与全栈基础速答']],
    ['Agent 工程与实时通信安全', ['Agent 工程：MCP、Skill 与 Tool', '实时通信可靠性与攻击防护']],
  ],
}

export function groupBuiltinSections(bankId, sections) {
  const groups = BUILTIN_SECTION_GROUPS[bankId]
  if (!groups) return sections

  const actualTitles = sections.map((section) => section.title)
  const expectedTitles = groups.flatMap(([, titles]) => titles)
  if (actualTitles.length !== expectedTitles.length
    || actualTitles.some((title, index) => title !== expectedTitles[index])) {
    return sections
  }

  let offset = 0
  return groups.map(([title, sourceTitles], order) => {
    const members = sections.slice(offset, offset + sourceTitles.length)
    offset += sourceTitles.length
    return {
      ...members[0],
      title,
      order,
      questions: members.flatMap((section) => section.questions),
    }
  })
}
