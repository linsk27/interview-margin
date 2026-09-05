const SUPPLEMENTS = new Map([
  [1, {
    pitfalls: [
      '不要说成 Vue3 的 Proxy “一定更快”：代理能力更完整，但深层遍历、组件更新范围和数据规模仍决定实际性能。',
      'Vue2 不是完全不能处理新增属性；可以用 Vue.set 或替换对象，但直接赋值不会被已建立的依赖可靠观察。',
    ],
    sources: [
      ['Vue：响应式原理', 'https://vuejs.org/guide/extras/reactivity-in-depth.html'],
      ['MDN：Proxy', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy'],
    ],
  }],
  [2, {
    pitfalls: [
      'track 只发生在当前 effect 同步读取依赖时；把读取放进异步回调，不能自动得到同样的依赖收集结果。',
      'trigger 不等于立即同步重绘：Vue 还会经过调度、去重和批处理，不能用“赋值后立刻查 DOM”验证更新是否完成。',
    ],
    sources: [
      ['Vue：Reactivity in Depth', 'https://vuejs.org/guide/extras/reactivity-in-depth.html'],
      ['Vue：响应式基础', 'https://vuejs.org/guide/essentials/reactivity-fundamentals.html'],
    ],
  }],
  [3, {
    pitfalls: [
      'receiver 不是永远等于 target 或 proxy；继承对象访问 getter 时，它可能是实际发起访问的子对象。',
      '拦截 get 时直接写 target[key] 会让 getter 的 this 指向原对象，可能绕过代理依赖；需要按语义使用 Reflect.get(target, key, receiver)。',
    ],
    sources: [
      ['MDN：handler.get()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get'],
      ['MDN：Reflect.get()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/get'],
    ],
  }],
  [4, {
    pitfalls: [
      'Reflect.get/set 只提供默认内部方法，不会自动替你做权限校验、类型校验或深层响应式；这些仍需在 handler 中明确实现。',
      'set trap 必须返回布尔成功值，并遵守不可配置/不可写属性等 Proxy 不变量；随意返回 true 可能在严格模式下抛错。',
    ],
    sources: [
      ['MDN：Reflect.get()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/get'],
      ['MDN：Reflect.set()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/set'],
    ],
  }],
  [5, {
    mechanism: `三者解决的不是同一类问题：

1. **computed** 根据已有响应式状态派生新值，依赖不变时复用缓存，适合模板需要反复读取的计算结果。
2. **watch** 监听明确的数据源，拿到新旧值后执行异步请求、持久化或日志等副作用，并可控制 immediate、deep 和 flush。
3. **watchEffect** 立即执行一次，在同步执行期间自动收集被读取的依赖，适合依赖较分散的轻量副作用，但依赖边界不如 watch 明确。

选择时先问“我要一个值，还是要发生一件事”。能由现有状态计算出来的值不要再复制进 state；副作用还要处理清理、竞态和组件卸载。`,
    practice: `例如商品总价用 computed；筛选条件变化后请求列表用 watch，并在下一次执行前取消旧请求：

~~~ts
const total = computed(() => price.value * count.value)

watch(keyword, async (value, _oldValue, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  rows.value = await search(value, controller.signal)
})
~~~`,
    sources: [
      ['Vue：computed()', 'https://vuejs.org/api/reactivity-core.html#computed'],
      ['Vue：watch() 与 watchEffect()', 'https://vuejs.org/api/reactivity-core.html#watch'],
    ],
    pitfalls: [
      'computed getter 应保持无副作用；在 getter 里发请求、改状态会让缓存和更新顺序难以推断。',
      'watchEffect 只会收集同步执行阶段读取的依赖；异步回调第一次 await 之后才读取的数据不会按预期自动追踪。',
    ],
  }],
  [6, {
    pitfalls: [
      'deep watch 会递归访问整个对象，字段越多、嵌套越深成本越高；它也不会告诉你业务上是哪条规则触发了联动。',
      '用字段依赖图替代 deep watch 时，仍要处理循环依赖、异步选项乱序和隐藏字段旧值是否清理，不能只把监听器数量减少。',
    ],
    sources: [
      ['Vue：watch() 深度监听', 'https://vuejs.org/api/reactivity-core.html#watch'],
      ['Vue：性能最佳实践', 'https://vuejs.org/guide/best-practices/performance.html'],
    ],
  }],
  [7, {
    mechanism: `Vue 修改响应式状态后不会立刻为每一次赋值都同步重绘 DOM，而是把相关组件更新放进调度队列，同一轮事件循环中的重复更新会被合并。nextTick 返回的 Promise 会在当前这批 DOM 更新提交后解决，因此它表达的是“等 Vue 把已经排队的视图更新做完”，不是固定等待几毫秒，也不是等图片、网络请求或浏览器所有绘制都结束。若只是需要根据状态计算值，应直接使用状态；只有确实要读取更新后的 DOM 尺寸、焦点或滚动位置时才用 nextTick。`,
    practice: `新增一行后要滚动到列表底部，可先改数据，再等待本轮 DOM 提交：

~~~ts
items.value.push(newItem)
await nextTick()
listRef.value?.lastElementChild?.scrollIntoView({ block: 'nearest' })
~~~

验证时比较 nextTick 前后的子节点数量；不要用 setTimeout(0) 猜测框架何时更新。`,
    sources: [
      ['Vue：nextTick()', 'https://vuejs.org/api/general.html#nexttick'],
      ['Vue：响应式更新时机', 'https://vuejs.org/guide/essentials/reactivity-fundamentals.html#dom-update-timing'],
    ],
    pitfalls: [
      'nextTick 只等待 Vue 已排队的 DOM 更新，不等待图片加载、网络请求或下一帧动画；这些要使用对应事件或 requestAnimationFrame。',
      '如果只是计算派生值，不应靠 nextTick 读取 DOM 再回写状态，否则容易形成额外布局和更新循环。',
    ],
  }],
  [10, {
    mechanism: `Map 通常使用哈希表或等价结构：先把 key 计算成哈希值，再由哈希定位到很小的桶，最后在桶内比较真正的 key。理想分布下桶很短，所以 get/has 的平均复杂度常写作 O(1)；这不代表一步完成，也不代表最坏情况永远是常数。碰撞严重、频繁扩容或恶意输入都可能增加成本。JavaScript 规范只要求 Map 的平均访问时间“次线性”，并没有强制所有引擎必须使用某一种哈希表实现。`,
    practice: `用 Map 按 ID 查用户适合频繁随机查找；若需求是“按创建时间范围扫描”，还需要有序结构或数据库索引。性能验证应使用接近真实 key 分布和数据量的基准，并同时观察内存与构建成本，不能只拿十个元素比较一次 get。`,
    sources: [
      ['MDN：Map', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map'],
      ['ECMAScript：Map Objects', 'https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects'],
    ],
    pitfalls: [
      'O(1) 是平均访问复杂度，不是最坏情况保证；碰撞、扩容、恶意 key 和哈希实现都会改变实际耗时。',
      'Map 适合按 key 查找，不等于适合范围查询、按时间排序或持久化；这些需求应评估有序结构或数据库索引。',
    ],
  }],
  [11, {
    mechanism: `两者都会并发等待输入中的 Promise，并按输入顺序组织结果，区别在失败语义：

- Promise.all 只要任一项拒绝，返回的 Promise 就立即拒绝；其他任务不会被自动取消，可能仍在后台继续产生副作用。
- Promise.allSettled 一定等全部任务结束，每项都返回 fulfilled/value 或 rejected/reason，适合批量任务逐项展示结果。

因此选型取决于业务是否允许部分成功，而不是“哪个更快”。需要整体失败时还要显式传递 AbortSignal 或补偿已完成的副作用。`,
    practice: `三个独立资料源只要缺一个就不能生成报告，可用 all 并在失败时取消其余请求；批量上传十个附件允许成功七个、失败三个，则用 allSettled：

~~~ts
const results = await Promise.allSettled(files.map(upload))
const failed = results.flatMap((result, index) =>
  result.status === 'rejected' ? [{ file: files[index], error: result.reason }] : []
)
~~~`,
    sources: [
      ['MDN：Promise.all()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all'],
      ['MDN：Promise.allSettled()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled'],
    ],
    pitfalls: [
      'Promise.all reject 不会自动取消其他请求；若任务有副作用，必须传 AbortSignal 或设计补偿，否则“失败”仍可能留下已完成操作。',
      'allSettled 会等待全部任务结束，不能用它掩盖核心请求失败；应按结果逐项区分核心失败和可降级项。',
    ],
  }],
  [12, {
    mechanism: `登录成功后，服务端签发一个带签名的 access token，客户端后续请求携带它；服务端固定允许的算法并校验签名、签发方 iss、受众 aud、过期时间 exp 和必要业务声明，再根据当前用户与资源执行授权。JWT 只证明声明未被篡改，payload 对持有者通常可读，不能放密码或隐私。短期 access token 还要配合 refresh token 轮换、撤销记录、设备会话和重放控制；把 token 存在 Cookie 或浏览器存储时分别要评估 CSRF 与 XSS。`,
    practice: `接口中间件只完成“身份是谁”，业务层继续完成“能否操作这条订单”：

~~~ts
const claims = await jwtVerify(token, key, {
  issuer: 'https://auth.example.com',
  audience: 'interview-api',
  algorithms: ['RS256'],
})
authorize(claims.payload.sub, 'order:read', order.ownerId)
~~~`,
    sources: [
      ['RFC 7519：JSON Web Token', 'https://www.rfc-editor.org/rfc/rfc7519'],
      ['OWASP：JWT for Java Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html'],
    ],
    pitfalls: [
      'JWT payload 默认只是 Base64URL 编码，不是加密；密码、密钥和隐私字段不能直接放进 payload。',
      '验签通过不等于有资源权限：仍需校验 issuer、audience、过期时间和当前用户是否能操作目标资源，并防止算法降级。',
    ],
  }],
  [16, {
    mechanism: `response.json() 会等响应体结束并一次性解析；SSE 则要求边到边显示。用 response.body.getReader() 读取字节，复用 TextDecoder 增量解码，把文本放入 buffer，遇到空行才取出一条完整事件；流结束时再处理最后残留内容。`,
    pitfalls: [
      'response.json() 会消费并锁定响应体；先调用它再拿 response.body.getReader() 会遇到 body 已使用，不能同时获得完整 JSON 和增量流。',
      '一次 read() 只代表收到一段字节，不保证是完整事件或完整中文字符；必须复用 TextDecoder、保留 buffer，并按 SSE 空行边界解析。',
    ],
    sources: [
      ['WHATWG：Fetch response body', 'https://fetch.spec.whatwg.org/#body-mixin'],
      ['WHATWG：Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
    ],
  }],
  [17, {
    pitfalls: [
      '接入向量库不等于答案一定正确：问题可能出在解析、切块、召回、权限过滤、版本选择或生成，必须分层评测而不是只看最终文本。',
      'RAG 的上下文仍是不可信输入；检索片段要带租户、版本和权限信息，并要求模型在没有证据时明确说不知道，不能把整库内容无条件塞进提示词。',
    ],
    sources: [
      ['Lewis 等：Retrieval-Augmented Generation 原论文', 'https://arxiv.org/abs/2005.11401'],
      ['Microsoft：检索增强生成（RAG）概览', 'https://learn.microsoft.com/en-us/azure/developer/ai/intro-rag'],
    ],
  }],
  [18, {
    pitfalls: [
      '向量相似只表示模型空间里的“像不像”，不代表版本、权限、时效和事实都正确；错误码、编号和专有名词通常还要保留关键词检索。',
      '更换 Embedding 模型、维度或归一化方式后，旧向量不能直接混用；必须记录模型与索引版本并重建或分区迁移，否则相似度排序没有可比性。',
    ],
    sources: [
      ['Google Machine Learning：Embeddings', 'https://developers.google.com/machine-learning/crash-course/embeddings'],
      ['OpenAI：Embeddings 指南', 'https://platform.openai.com/docs/guides/embeddings'],
    ],
  }],
  [19, {
    pitfalls: [
      'Agent 不是把模型输出直接当命令执行；工具必须白名单、校验参数和资源权限，写入、删除等危险动作还要二次确认。',
      '工具结果和外部资料同样是不可信输入；要限制最大步数、超时和预算，防止 prompt injection、循环调用或错误结果被继续放大。',
    ],
    sources: [
      ['Anthropic：Building effective agents', 'https://www.anthropic.com/research/building-effective-agents'],
      ['OWASP：LLM Prompt Injection Prevention', 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html'],
    ],
  }],
  [8, {
    pitfalls: [
      'Pinia 不强制 mutation 不代表可以绕过业务边界随处改 state；复杂流程仍应在 action/store 方法中集中约束和记录。',
      'Vuex 迁移到 Pinia 不是改 import 就结束，还要检查 module 命名空间、插件、持久化和 SSR 请求间状态隔离。',
    ],
    sources: [
      ['Pinia：核心概念', 'https://pinia.vuejs.org/core-concepts/'],
      ['Vuex：开始', 'https://vuex.vuejs.org/guide/'],
    ],
  }],
  [9, {
    mechanism: `TypeScript 的类型只参与编译期检查：编译器根据变量声明、控制流和类型守卫发现一部分错误，但生成的 JavaScript 不会自动检查接口返回值。运行时边界（HTTP JSON、表单、localStorage）仍要用 schema 或类型守卫解析；unknown 迫使调用方先缩小类型，any 和断言则可能把错误推迟到生产。`,
    pitfalls: [
      'TypeScript 只在编译期提供静态检查，不能替代接口运行时校验；服务端 JSON、用户输入和 localStorage 仍需解析验证。',
      'any 会关闭关键检查，类型断言也不会改变运行时值；应优先使用 unknown、类型守卫和明确的错误分支。',
    ],
    sources: [
      ['TypeScript Handbook：Narrowing', 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html'],
      ['TypeScript Handbook：The Basics', 'https://www.typescriptlang.org/docs/handbook/2/basic-types.html'],
    ],
  }],
  [14, {
    mechanism: `三者区分的是 HTML 在什么时候、在哪里生成：CSR 让浏览器下载 JavaScript 后生成页面；SSR 在每次请求时由服务端生成 HTML，再由客户端 hydration 接管交互；SSG 在构建阶段提前生成 HTML，访问时直接分发静态文件。SSR/SSG 有利于首屏内容和搜索抓取，但会增加服务端、缓存或构建复杂度；CSR 交互灵活，却更依赖脚本下载与执行。实际项目可以按路由混合使用，不必整站只选一种。`,
    practice: `营销介绍和公开题目详情适合 SSG 或 SSR；登录后的学习工作台高度个性化，可用 CSR。验收时分别测首字节、LCP、JavaScript 体积、hydration 错误和缓存命中，不能只凭“首屏看起来快”。服务端与客户端首轮输入还必须保持确定，否则会出现 hydration mismatch。`,
    sources: [
      ['web.dev：Rendering on the Web', 'https://web.dev/articles/rendering-on-the-web'],
      ['React：hydrateRoot()', 'https://react.dev/reference/react-dom/client/hydrateRoot'],
    ],
  }],
  [20, {
    mechanism: `条件编译是在构建阶段根据目标平台保留或移除代码，用来处理微信、H5、App 等平台 API 和组件差异；它不能替代运行时能力检测，也不应把整套业务逻辑复制多份。小程序页面栈则是运行时的导航历史，navigateTo 会继续压栈，redirectTo 替换当前页，reLaunch 重建栈。多步骤流程若每一步都 navigateTo，可能超过平台栈深或产生返回路径混乱，因此要先设计“哪一步可返回、哪一步应替换”。`,
    practice: `设备配网页面只在小程序端调用蓝牙 API，可用条件编译包住适配器；步骤 1→2→3 若不需要逐页返回，2→3 应考虑 redirectTo。测试时记录 getCurrentPages() 的长度和路由，连续完成、返回、失败重试各走一遍，验证没有重复页面和状态丢失。`,
    sources: [
      ['uni-app：条件编译', 'https://uniapp.dcloud.net.cn/tutorial/platform.html'],
      ['微信小程序：路由', 'https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html'],
    ],
    pitfalls: [
      '条件编译是在构建时裁剪代码，不是运行时能力检测；跨端共享逻辑仍要处理 API 缺失、权限和失败回退，不能只靠 #ifdef 隐藏问题。',
      '页面栈限制和返回语义要按平台实测；连续 navigateTo 可能堆满栈，redirectTo/reLaunch 会改变返回路径，不能把几个 API 当成同义跳转。',
    ],
  }],
  [21, {
    mechanism: `常说的 20 字节来自默认 ATT MTU 23 减去写入协议常见的 3 字节头，是兼容性经验值，不是 BLE 永久固定上限。连接后双方可能协商更大的 MTU，不同平台、特征属性和设备固件仍会限制单次有效载荷。应用层分片应给每帧加入消息 ID、序号、总片数、长度和校验，并根据设备确认或流量控制继续发送；只把字符串每 20 个字符切开还会破坏 UTF-8 多字节字符。`,
    practice: `发送 Wi-Fi 配置前先编码为 Uint8Array，再按有效字节数分片。设备逐片返回 ACK，超时只重传缺失序号；最后比较总长度与校验和。压测应覆盖中文 SSID、较长密码、MTU 协商失败、断线重连和重复包，而不是只验证一条短英文字符串。`,
    sources: [
      ['Bluetooth Core Specification', 'https://www.bluetooth.com/specifications/specs/core-specification/'],
      ['Web Bluetooth：writeValueWithResponse()', 'https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/writeValueWithResponse'],
    ],
    pitfalls: [
      '20 bytes 是默认 ATT MTU 23 减去协议头的常见经验值，不是所有设备都固定如此；应读取协商后的 MTU 和特征属性再确定载荷长度。',
      '不能按 JavaScript 字符数切分中文或 emoji；要按 UTF-8 字节分片，并携带序号、总长度/校验和，按设备确认节奏发送。',
    ],
  }],
  [22, {
    mechanism: `Raycaster 把屏幕坐标转换成从相机出发的射线，再与场景对象求交；递归参数、相机矩阵、对象可见性和坐标归一化都会影响是否命中。资源释放则要区分“从场景树移除”和“释放 GPU 资源”：remove 只断开场景引用，geometry、material、texture 和 renderer 的内部缓存仍需在确认不再共享后调用 dispose。过早释放共享材质会让其他模型失效，漏释放则会在反复切换场景时持续占用显存。`,
    practice: `点击检测前把鼠标换算到 canvas 的 -1~1 坐标，并对需要的子树递归求交；销毁模型时遍历 mesh，利用引用计数或资源注册表只释放不再共享的资源。用 renderer.info.memory、浏览器 GPU 面板和连续进入/退出 50 次的稳定值验证，而不是只看 JS heap。`,
    sources: [
      ['Three.js：Raycaster', 'https://threejs.org/docs/#api/en/core/Raycaster'],
      ['Three.js：How to dispose of objects', 'https://threejs.org/manual/#en/how-to-dispose-of-objects'],
    ],
    pitfalls: [
      '从 scene.remove() 只是移除引用，不会自动释放 geometry、material、texture 的 GPU 资源；共享资源要确认没有其他模型使用后再 dispose。',
      'Raycaster 命中失败不一定是库问题：canvas 偏移、CSS 缩放、DPR、相机矩阵或递归参数错误都会让 NDC 不正确，应该先核对坐标和对象树。',
    ],
  }],
  [23, {
    pitfalls: [
      '不要把“公网可访问”说成“生产级”：备份恢复、监控告警、容量、故障演练和数据口径都要分别说明，不能用一个部署截图代替证据。',
      '团队做过、设计过和自己实现过必须分开；没有可复现的代码入口、测试或运行证据，就应降级为参与/设计中的能力，不要把规划写成已上线。',
    ],
    sources: [
      ['Git：查看提交历史', 'https://git-scm.com/book/en/v2/Git-Basics-Viewing-the-Commit-History'],
      ['IEEE：Code of Ethics', 'https://www.ieee.org/about/corporate/governance/p7-8.html'],
    ],
  }],
  [24, {
    pitfalls: [
      '不要为了反驳“CRUD”而堆砌微服务、缓存或 AI 名词；如果说不清业务约束、失败后果和自己的代码证据，复杂度反而会变成扣分点。',
      '权限、状态、并发和恢复等约束必须对应真实实现或测试；只有通用设计方案而没有落地，就要明确说是方案，不要冒充项目现状。',
    ],
    sources: [
      ['OWASP：Business Logic Vulnerability', 'https://owasp.org/www-community/attacks/Business_logic_vulnerability'],
      ['IEEE：Code of Ethics', 'https://www.ieee.org/about/corporate/governance/p7-8.html'],
    ],
  }],
  [26, {
    mechanism: `schema 应描述稳定的业务结构，而不是直接保存某个 UI 组件的全部 props。可分为字段身份与数据类型、展示组件、校验规则、权限/可见性、默认值、选项数据源和版本；复杂联动单独放规则层，通过字段 ID 引用，避免在多个字段里互相嵌套回调。前端先用运行时 schema 校验配置，再映射到白名单组件；后端仍要按同一业务约束校验提交数据。配置升级还要有 schemaVersion 和迁移函数。`,
    practice: `一个供应商类型字段可以声明 enum 数据、Select 展示器和 required 规则；“选海外供应商后显示海关编码”写成独立条件规则。导入配置时拒绝未知组件和额外属性，保存旧版本样本做迁移测试，并验证隐藏字段是否应清空、保留还是禁止提交。`,
    sources: [
      ['JSON Schema：Understanding JSON Schema', 'https://json-schema.org/understanding-json-schema/'],
      ['Vue：动态组件', 'https://vuejs.org/guide/essentials/component-basics.html#dynamic-components'],
    ],
    pitfalls: [
      'schema 不是把所有业务逻辑塞进 JSON：复杂、易变或需要调试的规则应留在类型安全的业务函数，并给 schema 做版本迁移。',
      '前端根据 schema 渲染不等于后端可信；未知组件、危险 URL、隐藏字段和越权值仍要在服务端按白名单和业务规则重新校验。',
    ],
  }],
  [27, {
    mechanism: `字段联动最好建成“依赖图 + 纯规则”，而不是每个组件 watch 整个 form。规则显式声明输入字段、输出动作和优先级；字段变化时只找到受影响的规则，基于当前快照计算 visible、required、options 或 value，再一次性提交结果。这样可以检测循环依赖、记录规则命中链，并让同一规则在前端预览和后端校验中复用。异步选项还需要版本号或 AbortController，防止旧请求覆盖新选择。`,
    practice: `A=供应商类型，B=国家，C=税率：A 改为海外时显示 B；B 变化后请求 C 的选项。测试输入“国内→海外→快速切回国内”，预期旧国家请求被取消、B 隐藏且按策略清理、C 不被旧响应重新写回。日志记录 ruleId、输入快照和输出补丁，出现问题能还原是哪条规则造成。`,
    sources: [
      ['Vue：watch()', 'https://vuejs.org/api/reactivity-core.html#watch'],
      ['MDN：AbortController', 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController'],
    ],
    pitfalls: [
      '只监听整个 form 会让无关字段也触发规则；应维护 sourceField 到 affectedFields 的依赖表，并检测 A→B→A 这类循环。',
      '异步字典请求可能乱序返回；需要 AbortController、请求版本或响应序号，不能让旧选项覆盖用户最新选择。',
    ],
  }],
  [28, {
    mechanism: `状态机的价值不是替代所有 if/else，而是把“允许的状态、事件和转移”集中成可检查的模型。转移函数只根据当前状态、事件和上下文计算下一状态；调用接口、跳路由等副作用由转移成功后的执行器负责。这样页面按钮、接口权限、日志和测试都能围绕同一张转移表，非法路径会被明确拒绝。状态较少时普通条件足够，只有分支、角色、失败恢复和并发增加后才值得引入。`,
    practice: `审批流至少测试 DRAFT+SUBMIT→APPROVING、APPROVING+REJECT→REJECTED，以及 EFFECTIVE+SUBMIT 被拒绝。两个审批请求并发到达时，后端在事务里按当前状态和 version 条件更新；影响行数为 0 就返回冲突，前端重新拉取，而不是相信本地状态机能防住并发。`,
    sources: [
      ['XState：State machines', 'https://stately.ai/docs/machines'],
      ['W3C：State Chart XML (SCXML)', 'https://www.w3.org/TR/scxml/'],
    ],
    pitfalls: [
      '状态机只能约束显式状态转移，不能替代后端事务和并发控制；最终更新仍要带当前状态/version 条件。',
      '不要为了形式化把两个简单状态过度建模；状态、事件和副作用分离，副作用失败还要定义重试、补偿或回滚路径。',
    ],
  }],
  [30, {
    pitfalls: [
      'pendingMap 和 dictCache 的 key 必须包含租户、语言和权限范围；只用字典名可能把一个组织的选项返回给另一个组织。',
      '失败请求不能写入成功缓存，且 finally 必须删除 pending；否则一次超时就会让后续调用永远复用已拒绝的 Promise。',
    ],
    sources: [
      ['MDN：Map', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map'],
      ['MDN：Promise.prototype.finally()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally'],
    ],
  }],
  [31, {
    mechanism: `性能排查先把“慢”变成可重复的数据：固定设备、表单 schema 和操作步骤，用 Performance 录制一次交互，区分脚本计算、样式布局、渲染和网络。再通过组件 Profiler、规则命中次数和请求日志定位是整表单响应式依赖、重复校验、选项请求、深拷贝还是大列表渲染。每次只改一个假设，例如把全表 watch 改成字段依赖图，并用同一输入复测 p50/p95、长任务数和渲染次数。`,
    practice: `在 300 字段表单里连续切换供应商类型 20 次：记录联动规则执行数、组件 render 次数、字典请求数和最长任务。修复后要求只有受影响字段更新，旧请求可取消，输入响应不丢帧；如果只是主观说“感觉快了”，不能证明改动有效，也无法防止以后回归。`,
    pitfalls: [
      'Performance 面板中的一次长任务不能直接归因于 Vue；要结合 Network、组件更新和规则日志确认是脚本、布局还是接口等待。',
      '懒挂载只把成本推迟到首次展开，不会凭空消除成本；展开仍卡顿时还要拆分组件、缓存字典或降低单次渲染量。',
    ],
    sources: [
      ['Chrome：Performance 面板', 'https://developer.chrome.com/docs/devtools/performance/'],
      ['Vue：性能最佳实践', 'https://vuejs.org/guide/best-practices/performance.html'],
    ],
  }],
  [32, {
    pitfalls: [
      '只把 step 写进 URL 或 sessionStorage 不能证明前置步骤已完成；用户可以直接改 URL，恢复时必须重新校验快照和前置条件。',
      '连续点击下一步可能并发提交两次；按钮禁用只是体验保护，关键写入仍要用请求幂等键或服务端版本校验防重复。',
    ],
    sources: [
      ['Vue Router：Navigation Guards', 'https://router.vuejs.org/guide/advanced/navigation-guards'],
      ['MDN：Window.sessionStorage', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage'],
    ],
  }],
  [33, {
    mechanism: `sessionStorage 中的数据仍是外部输入：用户可修改，旧版本页面可能写入旧结构，JSON 也可能损坏。读取时应先安全解析，再用运行时 schema 校验字段、类型和枚举；数据带 schemaVersion，能迁移的按顺序迁移，不能迁移的只清理当前业务命名空间并回到安全默认状态。存储只负责恢复体验，后端权限和业务事实不能依赖它。多标签页、隐私模式和浏览器清理也会让数据消失。`,
    practice: `读取草稿时用 try/catch 包裹 JSON.parse，再执行 DraftV3.safeParse；v1→v2 补字段，v2→v3 改枚举。迁移失败记录匿名错误码并删除 interview:draft，而不是 localStorage.clear()。测试手工改成非法 JSON、未知版本、缺字段和超大字符串，页面都应可恢复且不能绕过后端校验。`,
    pitfalls: [
      'sessionStorage 可被用户直接修改，不能据此判断流程已支付、已审批或拥有权限；这些事实必须由服务端重新计算。',
      '迁移失败时不要调用 localStorage.clear() 影响其他应用数据；只清理当前命名空间并回到可用默认值。',
    ],
    sources: [
      ['MDN：sessionStorage', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage'],
      ['OWASP：HTML5 Security Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html'],
    ],
  }],
  [34, {
    pitfalls: [
      '有向量检索不等于已经做成 RAG：若没有切块、元数据过滤、召回结果检查和引用回传，模型仍可能凭记忆生成答案。',
      '把“当前项目支持”说成“生产级能力”会过度承诺；没有独立重排、耗时观测或文件解析时，应明确哪些只是现有实现、哪些是后续方案。',
    ],
    sources: [
      ['OpenAI：Retrieval guide', 'https://platform.openai.com/docs/guides/retrieval'],
      ['LangChain.js：Retrieval concepts', 'https://js.langchain.com/docs/concepts/retrieval/'],
    ],
  }],
  [35, {
    mechanism: `低代码平台的核心不是拖拽，而是把页面结构、数据源、权限、校验、动作和发布版本变成受约束的模型。编辑器修改的是 schema，渲染器把 schema 映射到白名单组件；动作编排必须限制可调用接口和参数，AI 生成的配置也先过 schema、安全和权限校验。平台还要处理版本比较、预览隔离、灰度发布、回滚和旧数据迁移，否则只是把手写代码换成难以调试的 JSON。`,
    practice: `让 AI 生成一个客户列表页时，只允许 Table、Filter、Button 等注册组件和 readCustomer 能力。保存前检查未知属性、危险 URL、越权动作和循环依赖；发布生成不可变版本，预览运行在隔离环境。验收既测搭建速度，也测可访问性、错误恢复、版本回滚和生成配置被恶意 Prompt 污染时是否会被拒绝。`,
    pitfalls: [
      'schema 校验通过不等于安全：事件、URL、接口能力仍要走白名单，不能因为结构合法就执行任意脚本或越权动作。',
      '只展示拖拽速度而没有版本、回滚和错误恢复，不能证明低代码平台可用于生产；要说明发布边界和失败处理。',
    ],
    sources: [
      ['OWASP：LLM Prompt Injection Prevention', 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html'],
      ['JSON Schema', 'https://json-schema.org/'],
    ],
  }],
  [36, {
    pitfalls: [
      'BLE 的 characteristic 写入长度受 MTU、属性和设备固件限制；不能把一整段 Wi-Fi JSON 直接写入一次，也不能按 JavaScript 字符数而不是 UTF-8 字节数分片。',
      '退出页面只断开连接还不够，扫描、notify 和特征值监听都要移除；否则重复进入会收到多份回调，表现为进度跳跃或完成多次。',
    ],
    sources: [
      ['微信小程序：wx.writeBLECharacteristicValue', 'https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth-ble/wx.writeBLECharacteristicValue.html'],
      ['微信小程序：wx.notifyBLECharacteristicValueChange', 'https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth-ble/wx.notifyBLECharacteristicValueChange.html'],
    ],
  }],
  [37, {
    mechanism: `数字孪生的亮点应落在“真实数据如何映射到三维对象并可持续更新”，而不是只展示模型。典型链路是资产 ID 绑定 mesh、实时数据进入状态层、规则把状态映射到颜色/动画/告警，再由渲染循环只更新发生变化的实例。大场景需要层级裁剪、LOD、InstancedMesh、纹理压缩和按需加载；交互还要处理 Raycaster、标签遮挡、相机定位和资源释放。数据时间戳、离线状态与错误值必须可见，不能把旧数据画成实时事实。`,
    practice: `给 5000 台设备建立 assetId→Object3D 索引，MQTT 消息只更新命中设备的状态，不遍历整棵 scene。相同模型用 InstancedMesh，远处切 LOD；离线超过阈值显示灰色并标注最后更新时间。验证 FPS、draw calls、GPU 内存、消息到画面的延迟，以及连续切换楼层后资源是否稳定。`,
    pitfalls: [
      '从场景树移除 mesh 不等于释放 GPU 资源；geometry、material、texture 可能仍被缓存，必须确认不共享后再 dispose。',
      '模型名称不能当作稳定业务主键；实时消息应通过 assetId 映射，且要显示时间戳和离线状态，避免把旧数据误当实时。',
    ],
    sources: [
      ['Three.js：InstancedMesh', 'https://threejs.org/docs/#api/en/objects/InstancedMesh'],
      ['Three.js：LOD', 'https://threejs.org/docs/#api/en/objects/LOD'],
    ],
  }],
  [38, {
    pitfalls: [
      '不要把“接触过很多技术”当成深度证据；面试官会继续追入口、异常、测试和个人提交，答不出就应区分参与和独立负责。',
      '回答不足时不能用背好的架构术语或虚构指标补洞；应直接说明规模、权限和结果边界，再给出下一步可验证的成长计划。',
    ],
    sources: [
      ['IEEE Code of Ethics', 'https://www.ieee.org/about/corporate/governance/p7-8.html'],
      ['ACM Code of Ethics', 'https://www.acm.org/code-of-ethics'],
    ],
  }],
  [39, {
    mechanism: `复杂表单“卡”不能只靠感觉定位。先固定数据量、设备和操作步骤，把一次交互拆成网络等待、JavaScript 长任务、样式布局、绘制和组件更新；再用 Performance 火焰图、Vue Devtools、请求日志与规则命中次数找到真正放大的环节。常见根因包括整表 deep watch、联动规则互相触发、字典重复请求、同步深拷贝以及重组件一次性挂载。每次只改一个假设，并用同一输入复测，才能确认收益来自这次修改。`,
    practice: `用 300 字段、20 个联动规则的固定表单录制“切换供应商类型”操作：记录 p95 输入响应时间、长任务数量、组件更新次数、规则执行次数和字典请求数。若发现所有规则都执行，就改成字段依赖图；若首屏一次挂载所有上传和表格组件，就按区块懒挂载。优化后用相同脚本复测，并设置性能预算防止以后回归。`,
    pitfalls: [
      '不能只凭“感觉变快了”或单次平均耗时下结论；设备、数据量和操作路径不一致时，p95 与长任务对比没有意义。',
      '把所有问题都归因于 deep watch 会漏掉重复字典请求、同步深拷贝和大组件挂载，应先用火焰图和请求日志验证。',
    ],
    sources: [
      ['Chrome DevTools：Performance', 'https://developer.chrome.com/docs/devtools/performance/'],
      ['Vue：Performance Best Practices', 'https://vuejs.org/guide/best-practices/performance.html'],
    ],
  }],
  [40, {
    mechanism: `全表单刷新通常来自依赖粒度过粗：父组件读取了整个 form、deep watch 遍历全部字段、Context/Provider value 每次创建新对象，或规则引擎每次都返回全量新 schema。修复顺序是先用 Profiler 证明哪些组件重复更新，再把状态按字段或区域订阅，让规则返回最小 patch，稳定无关 props，并把昂贵校验移到受影响字段。不能一上来给所有组件加 memo；依赖仍然变化时缓存没有意义，还会增加比较成本。`,
    practice: `字段 A 只影响 B 的 visible 和 C 的 options：A 变化后规则返回 {B:{visible:true}, C:{optionsVersion:4}}，状态层只通知 B、C。压测比较修复前后 300 个字段的 render 次数、规则执行数和最长任务；同时测试快速切换 A 时旧选项请求不会覆盖新版。`,
    pitfalls: [
      '把整个 form 放进 computed 或 deep watch 会让无关字段也成为依赖；应按 source→targets 缩小订阅范围，而不是给所有组件盲目加 memo。',
      '依赖图仍可能出现 A→B→A 循环；需要 visited set/transactionId 和新旧值比较，避免规则反复触发。',
    ],
    sources: [
      ['Vue：性能最佳实践', 'https://vuejs.org/guide/best-practices/performance.html'],
      ['React：memo', 'https://react.dev/reference/react/memo'],
    ],
  }],
  [41, {
    pitfalls: [
      '只比较响应序号仍要在组件卸载或题目切换时使请求失效；否则旧请求回来后可能更新已经不存在的页面状态或产生无意义提示。',
      'AbortController 取消的是 fetch 等支持 signal 的请求，不会自动取消服务端已经执行的校验；提交接口仍需后端按最新值再次校验。',
    ],
    sources: [
      ['MDN：AbortController', 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController'],
      ['Vue：watch() 清理副作用', 'https://vuejs.org/api/reactivity-core.html#onwatchercleanup'],
    ],
  }],
  [58, {
    mechanism: `先按访问语义选结构，而不是按熟悉程度：String 适合单值、计数和带条件写；Hash 适合一个实体的多个字段；List 表达有序队列但消费可靠性有限；Set 去重并做集合运算；Sorted Set 用 score 做排行榜和延时任务候选；Stream 提供可持久化消息、消费组和确认。结构选择还要考虑原子命令、过期粒度、单键大小、热点、持久化和集群 slot，不能把 Redis 当成没有约束的内存对象。`,
    practice: `验证码用带 TTL 的 String，在线用户去重用 Set，排行榜用 Sorted Set，可靠异步任务优先评估 Stream 或专业 MQ。压测时检查内存编码、Big Key、Hot Key、慢命令和故障恢复；若一个 Hash 塞进几十万字段，即使命令语义匹配，也可能造成迁移和阻塞风险。`,
    sources: [
      ['Redis：Data types', 'https://redis.io/docs/latest/develop/data-types/'],
      ['Redis：Streams', 'https://redis.io/docs/latest/develop/data-types/streams/'],
    ],
    pitfalls: [
      'List 能模拟简单队列但没有完整消费确认、重试和死信语义；可靠任务应评估 Stream 或专业消息队列，不能只看数据结构名字。',
      '选择结构后仍要评估单键大小、热点、过期粒度和持久化；一个超大 Hash 或热点 ZSet 可能造成阻塞和迁移风险。',
    ],
  }],
  [71, {
    mechanism: `SSE 不是新的传输层协议，而是一个长期保持的 HTTP 响应，Content-Type 为 text/event-stream。服务端按 UTF-8 文本发送 data、event、id、retry 等字段，空行结束一条事件；代理和框架必须及时 flush，不能把整段响应缓存后一次返回。原生 EventSource 负责断线重连并可携带 Last-Event-ID，但只支持服务器到客户端单向推送；使用 fetch 读取 SSE 格式时需要自己处理分帧、取消和重连。HTTP/1.1 的每域连接数与 HTTP/2 多路复用也会影响并发。`,
    practice: `AI 回答服务每个事件带 runId、seq 和 event:id。前端维护 pending buffer，按空行切帧并幂等去重；断线后携带 lastEventId 请求缺失事件。Nginx 关闭该路由的响应缓冲，客户端取消时向下游 AbortSignal 传播。验证中文被网络任意分片、代理心跳、断线重连和慢消费者，而不是只在 localhost 观察逐字出现。`,
    sources: [
      ['MDN：Using server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
      ['HTML Standard：Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
    ],
    pitfalls: [
      'SSE 是单向服务端推送，不等于 WebSocket 全双工；客户端提交问题、取消和重试仍要走普通 HTTP 或 fetch。',
      '代理缓冲、空闲超时和 HTTP/1.1 连接数都会让本地正常的流在生产环境卡住；必须配置心跳、禁用响应缓冲并做公网测试。',
    ],
  }],
  [13, {
    mechanism: `RBAC 先解决“角色通常能做什么”，请求进入服务端后还要把认证主体、动作、资源归属和当前状态组合起来授权。前端只负责隐藏入口；服务端从会话或令牌得到主体，再在查询和更新条件中约束 tenant/owner，最后记录高风险操作审计。`,
    pitfalls: [
      '隐藏按钮不是安全边界；攻击者可以直接构造请求，后端必须独立做对象级授权。',
      '只校验角色名不够，同一角色也可能无权操作别的租户、负责人或当前状态不允许的资源。',
    ],
    sources: [
      ['OWASP：Authorization Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html'],
      ['OWASP API Security：BOLA', 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/'],
    ],
  }],
  [14, {
    mechanism: `CSR 在浏览器下载 JavaScript 后生成页面；SSR 在请求时由服务端生成 HTML，再由 hydration 接管交互；SSG 在构建期生成静态 HTML。三者的速度差异来自首字节、HTML/JS 体积、数据请求和 hydration 成本，不能只按渲染地点下结论。`,
    pitfalls: [
      'SSR/SSG 不会自动解决接口慢、JS 包大或 hydration 阻塞；必须同时测 TTFB、LCP、脚本执行和可交互时间。',
      '服务端和客户端首屏数据不一致会产生 hydration mismatch；时间、随机数和浏览器专属 API 需要稳定初始值或延后执行。',
    ],
    sources: [
      ['web.dev：Rendering on the Web', 'https://web.dev/articles/rendering-on-the-web'],
      ['React：hydrateRoot()', 'https://react.dev/reference/react-dom/client/hydrateRoot'],
    ],
  }],
  [15, {
    mechanism: `AI 问答通常是一次 POST 上行、服务端持续下行，所以 fetch 响应流能复用 HTTP 鉴权、限流和代理；原生 EventSource 便于自动重连但只支持 GET；WebSocket 则适合双方都高频主动发消息。选择依据是方向、二进制、重连和代理约束，不是哪个协议更“高级”。`,
    pitfalls: [
      'fetch 流不会自动提供 EventSource 的断线续传；取消、重试、事件去重和 Last-Event-ID 需要应用层自己定义。',
      'WebSocket 也不能替代业务鉴权、消息 schema 和连接配额；只为逐字输出引入它会增加心跳、状态和代理治理成本。',
    ],
    sources: [
      ['MDN：Streams API', 'https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams'],
      ['MDN：WebSocket API', 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket'],
    ],
  }],
  [18, {
    mechanism: `Embedding 把文本映射到固定维度向量，检索时在同一模型空间计算相似度。它只表达训练模型认为的语义接近，不携带权限、时效和事实真假；切块、查询改写、关键词补充、过滤和重排共同决定最终候选。`,
    pitfalls: [
      '语义相似不代表版本、租户和权限正确；错误码、编号等精确字符串仍应保留关键词通道。',
      '切换模型、维度或归一化方式后不能混用旧向量；要记录索引版本并分批重建和回归 Recall@K。',
    ],
    sources: [
      ['Google Machine Learning：Embeddings', 'https://developers.google.com/machine-learning/crash-course/embeddings'],
      ['OpenAI：Embeddings 指南', 'https://platform.openai.com/docs/guides/embeddings'],
    ],
  }],
  [25, {
    mechanism: `SRM 的复杂度来自业务不变量叠加：供应商类型、角色、流程状态、资质与数据归属共同决定字段可见性、可编辑性和允许动作。回答时把一个真实操作拆成约束、决策、失败后果和验证证据，比堆框架名更能证明工程深度。`,
    pitfalls: [
      '不要把页面数量或 CRUD 操作数量当成复杂度；要能指出一个约束冲突和系统如何拒绝非法操作。',
      '团队已有能力、设计方案和自己实现的模块必须分开陈述，指标没有数据集和基线就不能当成果。',
    ],
    sources: [
      ['OWASP：Business Logic Vulnerability', 'https://owasp.org/www-community/attacks/Business_logic_vulnerability'],
      ['IEEE：Code of Ethics', 'https://www.ieee.org/about/corporate/governance/p7-8.html'],
    ],
  }],
  [46, {
    mechanism: `把 RAG 错误拆成检索层、排序层、上下文装配层和生成层：先确认正确 chunk 是否进入候选，再看权限/版本过滤、topK、重排和 token 截断，最后检查提示词、模型参数和引用要求。每层都用固定问题集和可观测字段验证，不能只改 prompt。`,
    pitfalls: [
      '召回不到正确片段时，继续调模型温度不会修复切块、过滤或索引问题；先记录候选和淘汰原因。',
      '片段命中也不代表答案正确，模型可能忽略证据或跨片段拼错；要保留引用、支持度和“无证据”回退。',
    ],
    sources: [
      ['Microsoft：RAG 概览', 'https://learn.microsoft.com/en-us/azure/developer/ai/intro-rag'],
      ['Lewis 等：RAG 原论文', 'https://arxiv.org/abs/2005.11401'],
    ],
  }],
  [47, {
    mechanism: `把 Embedding 服务视为可降级依赖：连续失败或延迟超阈值时停止盲重试，切到关键词召回并标注 retrieval_mode；冷却后用少量探测请求恢复，期间将缺失或版本不匹配的 chunk 放入补建队列，待队列清空并抽样通过才解除恢复状态。`,
    pitfalls: [
      '回退关键词检索只能保证可用，不等于语义质量相同；响应要提示降级并记录比例、失败原因和待补建数量。',
      'Embedding 服务恢复不代表旧索引已补齐；向量模型/维度不匹配的 chunk 仍需重建，不能只看健康检查。',
    ],
    sources: [
      ['Google Cloud：Graceful degradation', 'https://cloud.google.com/architecture/framework/reliability/graceful-degradation'],
      ['OpenAI：Embeddings 指南', 'https://platform.openai.com/docs/guides/embeddings'],
    ],
  }],
  [48, {
    mechanism: `网络 chunk、UTF-8 字节和 SSE 事件边界互相独立：TextDecoder 要复用并以 stream 模式解码，文本 buffer 要保留半包，只有遇到空行才解析完整事件。前端还要区分 start/delta/done/error、abort 和网络断开，重试时用 runId/seq 去重已展示内容。`,
    pitfalls: [
      '每个 read() 不一定是一条 JSON；直接 JSON.parse 会在半包、粘包或中文跨字节时随机失败。',
      '用户主动 abort、上游超时和服务端 error 不是同一种状态；不能把取消显示成失败，也不能在断线重试时重复追加 delta。',
    ],
    sources: [
      ['WHATWG：Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
      ['MDN：Using readable streams', 'https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams'],
    ],
  }],
  [52, {
    mechanism: `小程序页面栈是导航历史，不是业务状态存储；navigateTo 保留旧页并压栈，redirectTo 替换当前页，switchTab 回到 tabBar，reLaunch 重置全流程。线性步骤不需要逐级返回时应替换页面，刷新恢复则依赖带版本的快照。`,
    pitfalls: [
      '把所有跳转都换成 reLaunch 会破坏返回和 tab 语义；先按“该步骤是否允许回退”设计转移。',
      '页面栈修复不等于表单可恢复；还要单独校验快照版本、缺字段、冷启动和重复点击。',
    ],
    sources: [
      ['微信小程序：路由', 'https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html'],
      ['uni-app：页面与路由', 'https://uniapp.dcloud.net.cn/api/router.html'],
    ],
  }],
  [56, {
    mechanism: `把 SSR 首屏拆成 TTFB/服务端数据、HTML 传输、关键资源、JavaScript 执行和 hydration 五段，用同一数据集和网络条件对比。SSR 只提前生成 HTML，接口慢、HTML/JS 过大或主线程长任务仍会拖慢可交互。`,
    pitfalls: [
      '只看首字节或首屏截图会漏掉 hydration 和输入延迟；要同时看 FCP、LCP、INP、TTFB 与脚本执行。',
      'SSR 页面内容与客户端首轮计算不一致会 hydration mismatch；时间、随机值和浏览器 API 需延迟到客户端。',
    ],
    sources: [
      ['web.dev：Rendering on the Web', 'https://web.dev/articles/rendering-on-the-web'],
      ['web.dev：Core Web Vitals', 'https://web.dev/articles/vitals'],
    ],
  }],
  [57, {
    mechanism: `是否引入 Redis 取决于测得的访问模式和故障边界：单实例、低流量且数据库稳定时直接查库更简单；多实例共享状态、热点读取压垮数据库或需要跨实例限流/会话时，才用 Redis，并同时设计失效、一致性、降级和运维成本。`,
    pitfalls: [
      '没有命中率、回源量和延迟基线就引入 Redis，可能只是增加网络跳数和故障点；先测瓶颈再做决策。',
      'Redis 不是数据库事实来源；缓存失效、回源击穿、旧值容忍时间和不可用时的降级策略必须明确。',
    ],
    sources: [
      ['Redis：Cache-Aside', 'https://redis.io/docs/latest/develop/use-cases/cache-aside/'],
      ['Redis：FAQ', 'https://redis.io/docs/latest/develop/get-started/faq/'],
    ],
  }],
  [59, {
    pitfalls: [
      '锁只能限制热点回源，不能替代数据库限流、连接池和超时；Redis 故障时仍要有可预期的旧值或快速失败路径。',
      '释放分布式锁必须校验唯一 token；锁过期后被新请求取得时，旧请求直接 DEL 会误删新锁。',
    ],
    sources: [
      ['Redis：Distributed locks', 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/'],
      ['Redis：Cache-Aside', 'https://redis.io/docs/latest/develop/use-cases/cache-aside/'],
    ],
  }],
  [60, {
    mechanism: `RDB/AOF 解决 Redis 自身重启后的恢复窗口，缓存一致性解决数据库变更后何时失效/更新 Redis。两者层次不同：即使 AOF 每次落盘，数据库提交成功而删除缓存失败仍会保留旧值，所以要按业务容忍度配置 TTL、重试补偿和变更日志。`,
    pitfalls: [
      '持久化成功不代表缓存与主库一致；不能用 AOF 代替失效、回填和补偿策略。',
      '“先更新数据库再删缓存”只是常见基线，删除失败和并发读仍有窗口，必须用故障注入验证陈旧时间。',
    ],
    sources: [
      ['Redis：Persistence', 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/'],
      ['Redis：Cache-Aside', 'https://redis.io/docs/latest/develop/use-cases/cache-aside/'],
    ],
  }],
  [61, {
    pitfalls: [
      'Topic 中写了 tenantId/deviceId 不代表已经隔离；Broker ACL 必须按认证身份限制 publish/subscribe，并默认拒绝越界路径。',
      '通配符 # 会放大凭据泄露后的读取范围；设备凭据只授予自己的 telemetry/state/command 路径，管理订阅要单独隔离。',
    ],
    sources: [
      ['OASIS：MQTT Version 5.0', 'https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html'],
      ['OWASP：IoT Security Testing Guide', 'https://owasp.org/www-project-iot-security-testing-guide/'],
    ],
  }],
  [62, {
    pitfalls: [
      'QoS 1 的“至少一次”只描述 MQTT 投递，不能保证设备动作只执行一次；业务端仍要用设备范围内的 messageId、状态和结果记录去重。',
      '只在 Redis 内存 key 去重会被重启、TTL 过期和跨服务并发打破；关键命令应由持久化唯一约束和事务兜底。',
    ],
    sources: [
      ['OASIS：MQTT Version 5.0 - QoS', 'https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html'],
      ['Microsoft：Idempotent Consumer pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/idempotent-consumer'],
    ],
  }],
  [71.1, {
    pitfalls: [
      'Nginx 默认可能缓冲上游响应；应用已经 yield 不代表浏览器马上收到，需对 SSE 路由关闭 proxy_buffering 并验证响应头。',
      '只把 proxy_read_timeout 调大不能解决断线和慢消费者；还要发心跳、限制连接数，并在客户端取消时释放上游资源。',
    ],
    sources: [
      ['NGINX：ngx_http_proxy_module', 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html'],
      ['MDN：Using server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
    ],
  }],
  [63, {
    mechanism: `高并发先按请求链路找瓶颈，再用限流/削峰保护下游：入口鉴权限次，热点读用缓存，突发写进队列，服务横向扩容，数据库用正确索引和连接池，最后准备降级、熔断和外部监测。每项都要有容量线和失败时的可预期结果。`,
    pitfalls: [
      '前端防抖只能减少正常用户重复请求，不能替代服务端限流、鉴权、幂等和库存保护。',
      '“加缓存/加队列”不是自动提速；热点 key、队列积压、连接池耗尽和重试风暴可能把压力转移到更脆弱的下游。',
    ],
    sources: [
      ['Google SRE：Handling Overload', 'https://sre.google/sre-book/handling-overload/'],
      ['AWS Well-Architected：Reliability Pillar', 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html'],
    ],
  }],
  [64, {
    mechanism: `防超卖要把库存判断和扣减做成原子操作，成功后再异步创建订单；数据库用事务、唯一约束和 available > 0 条件更新做最终兜底。Redis 预扣成功而订单失败时必须可靠重试或补偿归还，不能把缓存扣减当成最终事实。`,
    pitfalls: [
      '先 GET 库存再 DECR 存在并发间隙；应使用 Lua/原子命令或数据库条件更新，并检查受影响行数。',
      '消息队列成功入队不等于订单成功；支付、落库和消费者重试仍可能失败，需要幂等和补偿状态。',
    ],
    sources: [
      ['Redis：Lua scripting', 'https://redis.io/docs/latest/develop/interact/programmability/eval-intro/'],
      ['MySQL：InnoDB Locking', 'https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html'],
    ],
  }],
  [66, {
    mechanism: `联合索引按从左到右的有序键查找：先利用等值条件缩小范围，再用范围列扫描并尽量复用排序。候选索引只是假设，必须用真实数据的 EXPLAIN/EXPLAIN ANALYZE 比较扫描行、回表、排序、P95 和写入代价。`,
    pitfalls: [
      '“字段都在索引里”不代表一定高效；范围条件、低选择性、回表和排序仍可能扫描大量行。',
      '每新增一个索引都会占空间并拖慢写入；要检查重复索引、真实查询分布和回滚方案，不要只按最左前缀背答案。',
    ],
    sources: [
      ['MySQL：EXPLAIN 语句', 'https://dev.mysql.com/doc/refman/8.4/en/explain.html'],
      ['MySQL：Optimization and Indexes', 'https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html'],
    ],
  }],
  [67, {
    pitfalls: [
      'EXPLAIN 显示使用索引不等于查询足够快；仍要看实际扫描行、回表、排序、锁等待和端到端 P95。',
      '只用一组理想参数验证会误导优化器判断；应覆盖数据倾斜、空结果、热点租户和写入压力，并准备删除索引回滚。',
    ],
    sources: [
      ['MySQL：EXPLAIN 语句', 'https://dev.mysql.com/doc/refman/8.4/en/explain.html'],
      ['MySQL：索引优化', 'https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html'],
    ],
  }],
  [68, {
    mechanism: `分层是观察一次请求的不同职责：应用协议（HTTP/MQTT/SSE）定义消息，TCP/UDP 负责传输，IP 负责寻址，链路层负责局域网帧；HTTPS 还在 HTTP 与传输之间用 TLS 提供身份和加密。浏览器访问通常经历 DNS、TCP/QUIC、TLS、HTTP 和渲染。`,
    pitfalls: [
      '能 ping 通只证明 ICMP 可达，不代表 DNS、443 端口、TLS、反向代理和应用都正常。',
      'OSI 七层是学习模型，实际协议可能跨层；不要把 SSE 说成传输层协议，SSE 仍是 HTTP 响应格式。',
    ],
    sources: [
      ['MDN：HTTP Overview', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview'],
      ['IETF：RFC 9293 TCP', 'https://www.rfc-editor.org/rfc/rfc9293'],
    ],
  }],
  [69, {
    pitfalls: [
      'ERR_CONNECTION_CLOSED 不是一个具体根因；必须用 DNS、TCP、TLS、代理和应用各自日志定位，不能只重启前端。',
      'Cloudflare Tunnel 1033 指向连接器不可解析或不健康，不代表源站代码有错；应先查 cloudflared 服务、网络和隧道配置。',
    ],
    sources: [
      ['Cloudflare：Error 1033', 'https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/'],
      ['MDN：连接管理与 HTTP', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management_in_HTTP_1.x'],
    ],
  }],
  [70, {
    mechanism: `持续可访问是进程托管、入口代理、DNS/证书、数据备份和外部监测的组合。systemd/容器保证进程重启，健康检查区分存活与就绪，反向代理和证书配置纳入版本管理；发布后还要重启、故障注入、回滚并验证关键 API，而不是只看一次首页 200。`,
    pitfalls: [
      'Restart=always 只能重启进程，无法修复错误配置、损坏数据或不可达上游；还需要启动频率限制、告警和回滚。',
      'Tunnel、DNS 或证书到期会让应用进程健康却公网不可达；监测必须从服务器外部验证完整域名链路。',
    ],
    sources: [
      ['systemd：Service 管理', 'https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html'],
      ['Cloudflare：Tunnel 持久运行', 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/run-tunnel-as-a-service/'],
    ],
  }],
  [72, {
    mechanism: `BLE 外设广播，中心设备扫描后建立连接并发现 GATT service/characteristic；characteristic 的 read/write/notify 属性决定数据方向。BLE 适合近距离配网，设备联网后的远程状态通常交给 MQTT 等协议，二者不是替代关系。`,
    pitfalls: [
      'service/characteristic UUID、写入属性和 notify 权限必须以设备协议为准；只照抄示例 UUID 会导致“能连接但写不进去”。',
      'BLE 连接成功不代表业务完成，还要处理权限、超时、断线、重复监听、MTU/分片和退出页面的清理。',
    ],
    sources: [
      ['Bluetooth SIG：Core Specification', 'https://www.bluetooth.com/specifications/specs/core-specification/'],
      ['MDN：Web Bluetooth API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API'],
    ],
  }],
  [73, {
    mechanism: `当前 ContextForge 先规范化资料、按字符和 overlap 分块并写入 chunk 表，再按配置生成向量；查询时关键词召回与可用的向量相似度合并，按权限和 token 预算挑选片段，给模型加 [S1] 引用后通过 SSE 输出。每个阶段都要保留版本和可追溯字段。`,
    pitfalls: [
      '当前实现不是“上传任意 PDF/Word 自动解析”，也没有独立 reranker；面试时必须把已上线链路和设计中的能力分开。',
      '整篇资料塞进 Prompt 会增加成本和噪声；块过大丢检索精度，过小丢上下文，需用固定集评估 chunk/overlap。',
    ],
    sources: [
      ['Microsoft：RAG 概览', 'https://learn.microsoft.com/en-us/azure/developer/ai/intro-rag'],
      ['Lewis 等：RAG 原论文', 'https://arxiv.org/abs/2005.11401'],
    ],
  }],
  [74, {
    mechanism: `SHA-256 把规范化后的 UTF-8 文本映射成 256-bit 指纹，可用于检测内容版本变化；真正去重还需要业务范围、唯一约束和冲突处理。当前按 (source_id, chunk_index) 保证同一来源位置稳定，不能把相同 hash 自动当作跨来源唯一记录。`,
    pitfalls: [
      'hash 相同只说明输入相同（或极小概率碰撞），不代表两个 chunk 的权限、来源和有效期可以合并。',
      '规范化规则变化会改变 hash；必须记录算法/版本并在事务或唯一索引中处理并发插入，不能只在应用层先查后写。',
    ],
    sources: [
      ['NIST：FIPS 180-4 Secure Hash Standard', 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final'],
      ['SQLite：UNIQUE Constraints', 'https://www.sqlite.org/lang_createtable.html#unique_constraints'],
    ],
  }],
  [75, {
    mechanism: `Embedding 切换要建立独立索引版本并后台补建；记录 provider、模型、维度、距离、切块和索引版本，固定评测集通过后才切换 active。切换期间旧索引继续服务，新旧向量不混算，失败可把读取指针切回旧版本。`,
    pitfalls: [
      '维度相同也不代表语义空间兼容；模型、归一化和切块版本任一变化都可能要求重建。',
      '只把新旧向量写进同一张 active 索引会造成排序不可比；要按版本隔离、限速补建并记录失败队列。',
    ],
    sources: [
      ['OpenAI：Embeddings 指南', 'https://platform.openai.com/docs/guides/embeddings'],
      ['Google Cloud：向量搜索最佳实践', 'https://cloud.google.com/vertex-ai/docs/vector-search/overview'],
    ],
  }],
  [76, {
    mechanism: `当前项目是关键词分数与同模型余弦相似度的加权融合，不是 RRF/MMR。RRF 只按各检索器的排名做融合，避免原始分数量纲不一致；MMR 在候选质量之外加入与已选结果的差异度，减少重复片段。引入前要用固定集比较 Recall、引用支持率、重复率、延迟和成本。`,
    pitfalls: [
      '不能把“混合检索”直接说成 RRF；RRF 需要多个排名列表，MMR 还需要定义相似度和多样性权重。',
      '分数加权的系数、模型和数据分布变化会改变排序；没有离线标注集就无法证明换算法变好。',
    ],
    sources: [
      ['Microsoft：Azure AI Search hybrid search', 'https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview'],
      ['Elasticsearch：Reciprocal rank fusion', 'https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html'],
    ],
  }],
  [77, {
    mechanism: `模型按 tokenizer 产生 token，预算要同时容纳系统提示、历史、检索证据、用户问题和输出预留。当前项目的字符比例只是快速估算，接近上限时按优先级丢弃低分块并在段落边界截断，生产计费和上下文校准应读取供应商 usage。`,
    pitfalls: [
      '中文、英文、代码、URL 和 emoji 的 token 比例不同；字符数除以固定常数只能估算，不能直接当计费或上下文事实。',
      '把输入装满会挤掉输出或关键证据；预算必须给输出留余量，并在超过限制时返回可解释的截断/降级状态。',
    ],
    sources: [
      ['OpenAI：Tokenizer', 'https://platform.openai.com/tokenizer'],
      ['Anthropic：Context windows', 'https://docs.anthropic.com/en/docs/build-with-claude/context-windows'],
    ],
  }],
  [78, {
    mechanism: `Flask 以 ` + "`data: JSON\\n\\n`" + ` 产生事件，但 yield、TCP/代理 chunk 与 SSE 空行边界无关；Vue 端需复用 TextDecoder，保存半个 UTF-8 字符和不完整事件，解析后按 type 更新状态。取消要把 AbortSignal 贯穿请求和上游生成器，断线重连要用 runId/seq 去重。`,
    pitfalls: [
      '不能把每个 Flask yield 或网络 read 当成完整 JSON；粘包、拆包和中文跨字节都可能发生。',
      '代理缓冲和空闲超时会让 SSE 看似没有流；需要正确响应头、心跳、关闭缓冲并在公网链路验证。',
    ],
    sources: [
      ['WHATWG：Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
      ['MDN：Using readable streams', 'https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams'],
    ],
  }],
  [79, {
    mechanism: `分层按变化原因和测试边界拆开：route 处理鉴权、入参和 HTTP/SSE；service 编排检索、降级和 Prompt；repository 只负责 SQL/映射；schema 负责迁移与索引。

请求沿层向下，结果再向上，避免路由同时写业务和拼 SQL，便于单测和替换。`,
    pitfalls: [
      '分层不是机械增加文件；如果 service 只是转发、repository 偷藏业务规则，复杂度只会换位置。',
      '接口响应、鉴权和事务边界仍要统一；拆层不能让每一层各自捕获错误或重复校验，导致行为不一致。',
    ],
    sources: [
      ['Spring：Organizing a REST API', 'https://spring.io/guides/tutorials/rest/'],
      ['Martin Fowler：Layered Architecture', 'https://martinfowler.com/eaaCatalog/layeredArchitecture.html'],
    ],
  }],
  [80, {
    mechanism: `最小 Agent 闭环是模型提出结构化 tool_call，服务端校验白名单、参数和资源权限后执行，把 tool_result 回填，再决定继续或输出最终答案。每次调用都要有超时、最大步数、取消、审计和预算；当前 ContextForge 只有检索、Prompt 注入和 SSE，没有自主工具循环。`,
    pitfalls: [
      '模型输出不能直接执行；工具结果和检索资料同样是不可信输入，写入/删除动作要二次确认和资源级授权。',
      '没有最大步数、超时和调用预算会产生循环或费用失控；重试还要区分幂等读工具与有副作用写工具。',
    ],
    sources: [
      ['Anthropic：Building effective agents', 'https://www.anthropic.com/research/building-effective-agents'],
      ['OWASP：LLM Prompt Injection Prevention', 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html'],
    ],
  }],
])

// A few older records already carry the source marker but still lack a
// learner-facing follow-up or reproducible scenario. Keep these additions in
// a small overlay so content fixes remain idempotent and do not duplicate the
// authored answer.
const LEGACY_FOLLOWUPS = new Map([
  [24, '**继续追问：**\n\n1. 你说的并发约束如何用测试证明？\n\n   给出冲突请求、预期状态码和数据库受影响行数。\n\n2. 如果这是方案而不是已上线能力，怎样向面试官说明边界？\n\n   区分已实现、已验证与后续设计，避免把设想说成事实。'],
  [52, '**继续追问：**\n\n1. 哪些步骤必须支持返回，哪些步骤可以替换当前页面？\n\n   先画状态图，再用页面栈长度和返回路径逐条验证。\n\n2. 冷启动后如何恢复中途表单？\n\n   使用带版本和过期时间的快照，不把业务状态寄托在页面栈。'],
  [61, '**继续追问：**\n\n1. 设备凭据泄露后怎样缩小影响范围？\n\n   按设备吊销证书并收紧 Broker ACL，不能只修改 payload。\n\n2. QoS 1 重复命令怎样避免重复执行？\n\n   用 commandId 做幂等记录，并在执行前后检查设备状态。'],
  [71.1, '**继续追问：**\n\n1. 关闭 proxy_buffering 后普通接口是否也要关闭？\n\n   不需要，只对 SSE 路由关闭并保持其他接口的缓存策略。\n\n2. 客户端断开时如何避免上游生成继续计费？\n\n   监听连接关闭，把 AbortSignal 传到上游并释放连接配额。'],
  [79, '**继续追问：**\n\n1. 哪一层负责事务边界，为什么？\n\n   由 service 编排事务，repository 只执行数据访问，避免路由和 SQL 各自提交。\n\n2. 如果分层后只是文件变多，怎样判断应该合并？\n\n   看是否存在可复用的业务规则和独立测试边界，而不是按目录数量判断。'],
])

const LEGACY_PRACTICE = new Map([
  [14, '**示例场景：** 同一篇公开文章分别用 CSR、SSR、SSG 构建：记录 TTFB、LCP 和 hydration 错误，观察 SSR 的 HTML 首屏与 CSR 的脚本启动差异；若数据每次变化，再说明为什么不能直接把页面静态化。'],
  [47, '**示例场景：** Embedding 服务超时，先把请求标记为可重试并切换关键词检索；记录 provider、耗时和降级次数，恢复后再补齐向量。\n\n```ts\nconst result = await withTimeout(embed(text), 800).catch(() => ({ degraded: true }))\n// degraded 时走 BM25，不把空向量写进正式索引\n```'],
  [56, '**示例场景：** 用浏览器 Performance、服务端 TTFB 和 hydration 时间拆分 SSR 首屏慢的问题；若 TTFB 正常但 LCP 慢，优先查脚本和图片，而不是盲目关闭 SSR。'],
  [59, '**示例场景：** 让 100 个并发请求同时让热点 key 失效，观察数据库 QPS、锁等待和 P95；只有单飞重建、随机 TTL 和超时降级都通过，才算证明不会击穿。'],
  [67, '**示例场景：** 对真实查询执行 `EXPLAIN ANALYZE`，比较联合索引前后的扫描行、回表和排序耗时；再用一条跳过最左列的查询验证索引并未按想象生效。'],
  [69, '**示例场景：** 从 DNS、TCP、TLS 到反向代理逐层执行 curl 和日志对照；若源站直连成功但域名失败，就检查代理、隧道和防火墙，而不是只重试浏览器。'],
  [70, '**示例场景：** 发布后连续重启应用并从公网访问，检查 systemd、健康检查、隧道连接和反向代理日志；一次 curl 200 不能证明重启后仍会自动恢复。'],
  [75, '**示例场景：** 为新 Embedding 建 v2 索引并用固定问题集比较 Recall@K；切换读取指针后故意制造失败，再回滚到 v1，确认旧索引仍可服务。'],
])

export function legacySupplementFor(title) {
  const match = String(title ?? '').match(/^Q(\d+(?:\.\d+)?)(?=[：:\s])/i)
  if (!match) return undefined
  const number = Number(match[1])
  if (!Number.isFinite(number)) return undefined
  const base = SUPPLEMENTS.get(number)
  const followups = LEGACY_FOLLOWUPS.get(number)
  const practice = LEGACY_PRACTICE.get(number)
  if (!base && !followups && !practice) return undefined
  return { ...(base ?? {}), ...(followups ? { followups } : {}), ...(practice ? { practice } : {}) }
}

export function renderLegacySources(sources) {
  return sources.map(([label, url]) => `- [${label}](${url})`).join('\n')
}

export function legacySupplementCount() {
  return SUPPLEMENTS.size
}
