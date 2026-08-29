const SUPPLEMENTS = new Map([
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
  }],
  [10, {
    mechanism: `Map 通常使用哈希表或等价结构：先把 key 计算成哈希值，再由哈希定位到很小的桶，最后在桶内比较真正的 key。理想分布下桶很短，所以 get/has 的平均复杂度常写作 O(1)；这不代表一步完成，也不代表最坏情况永远是常数。碰撞严重、频繁扩容或恶意输入都可能增加成本。JavaScript 规范只要求 Map 的平均访问时间“次线性”，并没有强制所有引擎必须使用某一种哈希表实现。`,
    practice: `用 Map 按 ID 查用户适合频繁随机查找；若需求是“按创建时间范围扫描”，还需要有序结构或数据库索引。性能验证应使用接近真实 key 分布和数据量的基准，并同时观察内存与构建成本，不能只拿十个元素比较一次 get。`,
    sources: [
      ['MDN：Map', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map'],
      ['ECMAScript：Map Objects', 'https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects'],
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
  }],
  [21, {
    mechanism: `常说的 20 字节来自默认 ATT MTU 23 减去写入协议常见的 3 字节头，是兼容性经验值，不是 BLE 永久固定上限。连接后双方可能协商更大的 MTU，不同平台、特征属性和设备固件仍会限制单次有效载荷。应用层分片应给每帧加入消息 ID、序号、总片数、长度和校验，并根据设备确认或流量控制继续发送；只把字符串每 20 个字符切开还会破坏 UTF-8 多字节字符。`,
    practice: `发送 Wi-Fi 配置前先编码为 Uint8Array，再按有效字节数分片。设备逐片返回 ACK，超时只重传缺失序号；最后比较总长度与校验和。压测应覆盖中文 SSID、较长密码、MTU 协商失败、断线重连和重复包，而不是只验证一条短英文字符串。`,
    sources: [
      ['Bluetooth Core Specification', 'https://www.bluetooth.com/specifications/specs/core-specification/'],
      ['Web Bluetooth：writeValueWithResponse()', 'https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/writeValueWithResponse'],
    ],
  }],
  [22, {
    mechanism: `Raycaster 把屏幕坐标转换成从相机出发的射线，再与场景对象求交；递归参数、相机矩阵、对象可见性和坐标归一化都会影响是否命中。资源释放则要区分“从场景树移除”和“释放 GPU 资源”：remove 只断开场景引用，geometry、material、texture 和 renderer 的内部缓存仍需在确认不再共享后调用 dispose。过早释放共享材质会让其他模型失效，漏释放则会在反复切换场景时持续占用显存。`,
    practice: `点击检测前把鼠标换算到 canvas 的 -1~1 坐标，并对需要的子树递归求交；销毁模型时遍历 mesh，利用引用计数或资源注册表只释放不再共享的资源。用 renderer.info.memory、浏览器 GPU 面板和连续进入/退出 50 次的稳定值验证，而不是只看 JS heap。`,
    sources: [
      ['Three.js：Raycaster', 'https://threejs.org/docs/#api/en/core/Raycaster'],
      ['Three.js：How to dispose of objects', 'https://threejs.org/manual/#en/how-to-dispose-of-objects'],
    ],
  }],
  [26, {
    mechanism: `schema 应描述稳定的业务结构，而不是直接保存某个 UI 组件的全部 props。可分为字段身份与数据类型、展示组件、校验规则、权限/可见性、默认值、选项数据源和版本；复杂联动单独放规则层，通过字段 ID 引用，避免在多个字段里互相嵌套回调。前端先用运行时 schema 校验配置，再映射到白名单组件；后端仍要按同一业务约束校验提交数据。配置升级还要有 schemaVersion 和迁移函数。`,
    practice: `一个供应商类型字段可以声明 enum 数据、Select 展示器和 required 规则；“选海外供应商后显示海关编码”写成独立条件规则。导入配置时拒绝未知组件和额外属性，保存旧版本样本做迁移测试，并验证隐藏字段是否应清空、保留还是禁止提交。`,
    sources: [
      ['JSON Schema：Understanding JSON Schema', 'https://json-schema.org/understanding-json-schema/'],
      ['Vue：动态组件', 'https://vuejs.org/guide/essentials/component-basics.html#dynamic-components'],
    ],
  }],
  [27, {
    mechanism: `字段联动最好建成“依赖图 + 纯规则”，而不是每个组件 watch 整个 form。规则显式声明输入字段、输出动作和优先级；字段变化时只找到受影响的规则，基于当前快照计算 visible、required、options 或 value，再一次性提交结果。这样可以检测循环依赖、记录规则命中链，并让同一规则在前端预览和后端校验中复用。异步选项还需要版本号或 AbortController，防止旧请求覆盖新选择。`,
    practice: `A=供应商类型，B=国家，C=税率：A 改为海外时显示 B；B 变化后请求 C 的选项。测试输入“国内→海外→快速切回国内”，预期旧国家请求被取消、B 隐藏且按策略清理、C 不被旧响应重新写回。日志记录 ruleId、输入快照和输出补丁，出现问题能还原是哪条规则造成。`,
    sources: [
      ['Vue：watch()', 'https://vuejs.org/api/reactivity-core.html#watch'],
      ['MDN：AbortController', 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController'],
    ],
  }],
  [28, {
    mechanism: `状态机的价值不是替代所有 if/else，而是把“允许的状态、事件和转移”集中成可检查的模型。转移函数只根据当前状态、事件和上下文计算下一状态；调用接口、跳路由等副作用由转移成功后的执行器负责。这样页面按钮、接口权限、日志和测试都能围绕同一张转移表，非法路径会被明确拒绝。状态较少时普通条件足够，只有分支、角色、失败恢复和并发增加后才值得引入。`,
    practice: `审批流至少测试 DRAFT+SUBMIT→APPROVING、APPROVING+REJECT→REJECTED，以及 EFFECTIVE+SUBMIT 被拒绝。两个审批请求并发到达时，后端在事务里按当前状态和 version 条件更新；影响行数为 0 就返回冲突，前端重新拉取，而不是相信本地状态机能防住并发。`,
    sources: [
      ['XState：State machines', 'https://stately.ai/docs/machines'],
      ['W3C：State Chart XML (SCXML)', 'https://www.w3.org/TR/scxml/'],
    ],
  }],
  [31, {
    mechanism: `性能排查先把“慢”变成可重复的数据：固定设备、表单 schema 和操作步骤，用 Performance 录制一次交互，区分脚本计算、样式布局、渲染和网络。再通过组件 Profiler、规则命中次数和请求日志定位是整表单响应式依赖、重复校验、选项请求、深拷贝还是大列表渲染。每次只改一个假设，例如把全表 watch 改成字段依赖图，并用同一输入复测 p50/p95、长任务数和渲染次数。`,
    practice: `在 300 字段表单里连续切换供应商类型 20 次：记录联动规则执行数、组件 render 次数、字典请求数和最长任务。修复后要求只有受影响字段更新，旧请求可取消，输入响应不丢帧；如果只是主观说“感觉快了”，不能证明改动有效，也无法防止以后回归。`,
    sources: [
      ['Chrome：Performance 面板', 'https://developer.chrome.com/docs/devtools/performance/'],
      ['Vue：性能最佳实践', 'https://vuejs.org/guide/best-practices/performance.html'],
    ],
  }],
  [33, {
    mechanism: `sessionStorage 中的数据仍是外部输入：用户可修改，旧版本页面可能写入旧结构，JSON 也可能损坏。读取时应先安全解析，再用运行时 schema 校验字段、类型和枚举；数据带 schemaVersion，能迁移的按顺序迁移，不能迁移的只清理当前业务命名空间并回到安全默认状态。存储只负责恢复体验，后端权限和业务事实不能依赖它。多标签页、隐私模式和浏览器清理也会让数据消失。`,
    practice: `读取草稿时用 try/catch 包裹 JSON.parse，再执行 DraftV3.safeParse；v1→v2 补字段，v2→v3 改枚举。迁移失败记录匿名错误码并删除 interview:draft，而不是 localStorage.clear()。测试手工改成非法 JSON、未知版本、缺字段和超大字符串，页面都应可恢复且不能绕过后端校验。`,
    sources: [
      ['MDN：sessionStorage', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage'],
      ['OWASP：HTML5 Security Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html'],
    ],
  }],
  [35, {
    mechanism: `低代码平台的核心不是拖拽，而是把页面结构、数据源、权限、校验、动作和发布版本变成受约束的模型。编辑器修改的是 schema，渲染器把 schema 映射到白名单组件；动作编排必须限制可调用接口和参数，AI 生成的配置也先过 schema、安全和权限校验。平台还要处理版本比较、预览隔离、灰度发布、回滚和旧数据迁移，否则只是把手写代码换成难以调试的 JSON。`,
    practice: `让 AI 生成一个客户列表页时，只允许 Table、Filter、Button 等注册组件和 readCustomer 能力。保存前检查未知属性、危险 URL、越权动作和循环依赖；发布生成不可变版本，预览运行在隔离环境。验收既测搭建速度，也测可访问性、错误恢复、版本回滚和生成配置被恶意 Prompt 污染时是否会被拒绝。`,
    sources: [
      ['OWASP：LLM Prompt Injection Prevention', 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html'],
      ['JSON Schema', 'https://json-schema.org/'],
    ],
  }],
  [37, {
    mechanism: `数字孪生的亮点应落在“真实数据如何映射到三维对象并可持续更新”，而不是只展示模型。典型链路是资产 ID 绑定 mesh、实时数据进入状态层、规则把状态映射到颜色/动画/告警，再由渲染循环只更新发生变化的实例。大场景需要层级裁剪、LOD、InstancedMesh、纹理压缩和按需加载；交互还要处理 Raycaster、标签遮挡、相机定位和资源释放。数据时间戳、离线状态与错误值必须可见，不能把旧数据画成实时事实。`,
    practice: `给 5000 台设备建立 assetId→Object3D 索引，MQTT 消息只更新命中设备的状态，不遍历整棵 scene。相同模型用 InstancedMesh，远处切 LOD；离线超过阈值显示灰色并标注最后更新时间。验证 FPS、draw calls、GPU 内存、消息到画面的延迟，以及连续切换楼层后资源是否稳定。`,
    sources: [
      ['Three.js：InstancedMesh', 'https://threejs.org/docs/#api/en/objects/InstancedMesh'],
      ['Three.js：LOD', 'https://threejs.org/docs/#api/en/objects/LOD'],
    ],
  }],
  [39, {
    mechanism: `复杂表单“卡”不能只靠感觉定位。先固定数据量、设备和操作步骤，把一次交互拆成网络等待、JavaScript 长任务、样式布局、绘制和组件更新；再用 Performance 火焰图、Vue Devtools、请求日志与规则命中次数找到真正放大的环节。常见根因包括整表 deep watch、联动规则互相触发、字典重复请求、同步深拷贝以及重组件一次性挂载。每次只改一个假设，并用同一输入复测，才能确认收益来自这次修改。`,
    practice: `用 300 字段、20 个联动规则的固定表单录制“切换供应商类型”操作：记录 p95 输入响应时间、长任务数量、组件更新次数、规则执行次数和字典请求数。若发现所有规则都执行，就改成字段依赖图；若首屏一次挂载所有上传和表格组件，就按区块懒挂载。优化后用相同脚本复测，并设置性能预算防止以后回归。`,
    sources: [
      ['Chrome DevTools：Performance', 'https://developer.chrome.com/docs/devtools/performance/'],
      ['Vue：Performance Best Practices', 'https://vuejs.org/guide/best-practices/performance.html'],
    ],
  }],
  [40, {
    mechanism: `全表单刷新通常来自依赖粒度过粗：父组件读取了整个 form、deep watch 遍历全部字段、Context/Provider value 每次创建新对象，或规则引擎每次都返回全量新 schema。修复顺序是先用 Profiler 证明哪些组件重复更新，再把状态按字段或区域订阅，让规则返回最小 patch，稳定无关 props，并把昂贵校验移到受影响字段。不能一上来给所有组件加 memo；依赖仍然变化时缓存没有意义，还会增加比较成本。`,
    practice: `字段 A 只影响 B 的 visible 和 C 的 options：A 变化后规则返回 {B:{visible:true}, C:{optionsVersion:4}}，状态层只通知 B、C。压测比较修复前后 300 个字段的 render 次数、规则执行数和最长任务；同时测试快速切换 A 时旧选项请求不会覆盖新版。`,
    sources: [
      ['Vue：性能最佳实践', 'https://vuejs.org/guide/best-practices/performance.html'],
      ['React：memo', 'https://react.dev/reference/react/memo'],
    ],
  }],
  [58, {
    mechanism: `先按访问语义选结构，而不是按熟悉程度：String 适合单值、计数和带条件写；Hash 适合一个实体的多个字段；List 表达有序队列但消费可靠性有限；Set 去重并做集合运算；Sorted Set 用 score 做排行榜和延时任务候选；Stream 提供可持久化消息、消费组和确认。结构选择还要考虑原子命令、过期粒度、单键大小、热点、持久化和集群 slot，不能把 Redis 当成没有约束的内存对象。`,
    practice: `验证码用带 TTL 的 String，在线用户去重用 Set，排行榜用 Sorted Set，可靠异步任务优先评估 Stream 或专业 MQ。压测时检查内存编码、Big Key、Hot Key、慢命令和故障恢复；若一个 Hash 塞进几十万字段，即使命令语义匹配，也可能造成迁移和阻塞风险。`,
    sources: [
      ['Redis：Data types', 'https://redis.io/docs/latest/develop/data-types/'],
      ['Redis：Streams', 'https://redis.io/docs/latest/develop/data-types/streams/'],
    ],
  }],
  [71, {
    mechanism: `SSE 不是新的传输层协议，而是一个长期保持的 HTTP 响应，Content-Type 为 text/event-stream。服务端按 UTF-8 文本发送 data、event、id、retry 等字段，空行结束一条事件；代理和框架必须及时 flush，不能把整段响应缓存后一次返回。原生 EventSource 负责断线重连并可携带 Last-Event-ID，但只支持服务器到客户端单向推送；使用 fetch 读取 SSE 格式时需要自己处理分帧、取消和重连。HTTP/1.1 的每域连接数与 HTTP/2 多路复用也会影响并发。`,
    practice: `AI 回答服务每个事件带 runId、seq 和 event:id。前端维护 pending buffer，按空行切帧并幂等去重；断线后携带 lastEventId 请求缺失事件。Nginx 关闭该路由的响应缓冲，客户端取消时向下游 AbortSignal 传播。验证中文被网络任意分片、代理心跳、断线重连和慢消费者，而不是只在 localhost 观察逐字出现。`,
    sources: [
      ['MDN：Using server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
      ['HTML Standard：Server-sent events', 'https://html.spec.whatwg.org/multipage/server-sent-events.html'],
    ],
  }],
])

export function legacySupplementFor(title) {
  const match = String(title ?? '').match(/^Q(\d+(?:\.\d+)?)(?=[：:\s])/i)
  if (!match || match[1].includes('.')) return undefined
  const number = Number(match[1])
  return Number.isFinite(number) ? SUPPLEMENTS.get(number) : undefined
}

export function renderLegacySources(sources) {
  return sources.map(([label, url]) => `- [${label}](${url})`).join('\n')
}

export function legacySupplementCount() {
  return SUPPLEMENTS.size
}
