const VISUALS = new Map([
  ['javascript:12', {
    src: '/content/diagrams/javascript/type-coercion-v1.svg',
    alt: '宽松相等比较中的 JavaScript 类型转换步骤图',
    caption: 'false 先转为 0，空数组再经 ToPrimitive 和 ToNumber 转为 0；这与 if ([]) 的 ToBoolean 不是同一套规则。',
  }],
  ['javascript:48', {
    src: '/content/diagrams/javascript/prototype-chain-v1.svg',
    alt: 'JavaScript 实例、构造函数与原型链关系图',
    caption: '属性查找沿 [[Prototype]] 链向上进行，prototype 与对象的原型不是同一个概念。',
  }],
  ['javascript:64', {
    src: '/content/diagrams/javascript/event-loop-v1.svg',
    alt: '浏览器任务、微任务与渲染机会的事件循环顺序图',
    caption: '当前任务结束后先清空微任务，再进入渲染机会和下一个任务。',
  }],
  ['git-engineering:1', {
    src: '/content/diagrams/git-engineering/three-trees-v1.svg',
    alt: 'Git 工作区、暂存区和仓库之间的数据流图',
    caption: 'git add 更新索引，git commit 从索引生成提交，checkout/restore 改变对应区域。',
  }],
  ['vue-core:4', {
    src: '/content/diagrams/vue-core/dependency-tracking-v1.svg',
    alt: 'Vue 响应式读取 track 与写入 trigger 的依赖追踪图',
    caption: 'WeakMap → Map → Set 将目标、属性键与副作用关联起来。',
  }],
  ['react-core:32', {
    src: '/content/diagrams/react-core/render-commit-v1.svg',
    alt: 'React render 阶段与 commit 阶段职责和时序图',
    caption: 'render 负责计算且可被打断，commit 才把变更应用到宿主环境。',
  }],
  ['frontend-engineering:1', {
    src: '/content/diagrams/frontend-engineering/browser-rendering-pipeline-v1.svg',
    alt: '从输入 URL 到页面可交互的浏览器流水线图',
    caption: '网络、解析、样式布局、绘制与主线程任务共同决定可交互时间。',
  }],
  ['backend-fullstack:11', {
    src: '/content/diagrams/backend-fullstack/node-event-loop-v1.svg',
    alt: 'Node.js 事件循环阶段、微任务与线程池协作图',
    caption: 'JavaScript 回调在事件循环中调度，部分阻塞工作由操作系统或线程池承担。',
  }],
  ['backend-fullstack:14', {
    src: '/content/diagrams/backend-fullstack/stream-backpressure-v1.svg',
    alt: 'Node.js Stream 背压从消费者反馈到生产者的流程图',
    caption: '写入返回 false 后暂停生产，等待 drain 再继续，避免缓冲区无界增长。',
  }],
  ['database-cache:2', {
    src: '/content/diagrams/database-cache/b-plus-tree-v1.svg',
    alt: 'B+Tree 内部节点、叶子节点与范围扫描链路图',
    caption: '内部节点导航到叶子页，叶子有序相连，使点查与范围扫描都能减少随机 I/O。',
  }],
  ['network-deployment:10', {
    src: '/content/diagrams/network-deployment/tcp-tls-handshake-v1.svg',
    alt: 'TCP 建连、TLS 握手与加密 HTTP 数据传输时序图',
    caption: '先建立可靠传输，再验证身份并协商会话密钥，之后才发送加密应用数据。',
  }],
  ['network-deployment:23', {
    src: '/content/diagrams/network-deployment/cloudflare-tunnel-v1.svg',
    alt: '浏览器、Cloudflare 边缘、cloudflared 与本地服务之间的流量路径图',
    caption: '连接器主动建立出站隧道；公网请求经边缘路由到本地服务，无需开放家庭入站端口。',
  }],
])

export function visualForQuestion(bankId, number) {
  return VISUALS.get(`${bankId}:${number}`)
}

export function visualEntries() {
  return [...VISUALS.entries()]
}
