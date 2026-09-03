# React 核心与工程实践

# 组件与渲染模型

## Q1：React 组件为什么应当是纯函数？

**短回答：**

因为 React 可能重复调用、暂停，甚至丢弃一次尚未提交的渲染，组件在 render 里产生副作用就可能“执行了却没显示”。所以相同 props、state 和 context 应返回相同 JSX，写操作放到事件处理器或 Effect。

**原理：**

- 因为 render 只是“准备 UI 描述”，并不保证这次计算一定提交到页面，所以 React 要求组件渲染保持纯净。React 为了并发渲染、错误恢复和开发检查，可能多算一次或放弃中间结果；若 render 顺手改了计数、DOM 或发出请求，副作用不会随这次渲染一起撤销。
- React 因此把函数组件当作“props、state、context 对应 UI 描述”的计算：相同输入应返回相同 JSX，且渲染期间不修改外部变量、DOM、网络或父对象。服务端渲染和测试也能确定复现。事件引起的写操作放事件处理器，需要与外部系统同步的操作放 Effect。
- 开发环境 StrictMode 会额外调用组件函数和部分初始化逻辑来暴露不纯行为，但生产不会因此固定渲染两次。纯函数不等于不使用状态，而是每次 render 只读取本次快照并返回描述，状态更新交给 React。

**代码 / 场景：**

Bad 每次 render 修改模块变量 visits，StrictMode 或被放弃的 render 会让计数失真；Good 只根据 prop 返回 JSX，浏览量由明确事件或服务端记录。

~~~jsx
let visits = 0
function BadProfile({ name }) {
  visits += 1 // 渲染副作用：一次提交不一定只调用一次
  return <p>{name} visited {visits}</p>
}

function Profile({ name, visits }) {
  return <p>{name} visited {visits}</p>
}
~~~

**递进追问：**

1. **在 render 中创建新对象是否违反纯函数？**

   不一定。只创建并返回本次局部对象、没有改外部状态仍是纯的；问题在可观察副作用和同输入结果不稳定，性能再另行测量。

2. **读取 Date.now 为什么会破坏纯渲染？**

   相同 props/state 在不同调用得到不同结果，SSR 水合与重试可能不一致；应把时间作为 state/prop 输入，并在 Effect 或事件中更新。

**易错点：**

- 把 API 请求写在组件函数体会在每次 render 发起，并可能在未提交渲染中泄漏。
- StrictMode 双调用是开发诊断手段，不应靠检测第二次调用实现业务逻辑。

**参考来源：**

- [React：Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [React：StrictMode](https://react.dev/reference/react/StrictMode)

校验日期：2026-07-20

## Q2：JSX 最终是什么？

**短回答：**

JSX 经编译变为创建 React element 的调用，element 是描述类型、props 和 key 的不可变普通对象，不是真实 DOM。

**原理：**

- JSX 是 JavaScript 的语法扩展，不是浏览器直接理解的 HTML。
- 构建工具把标签转换为 jsx/jsxs runtime 调用（旧转换常见 React.createElement），调用返回普通 React element 描述对象，包含 type、props、key 等信息；React renderer 再据此协调 DOM 或其他平台节点。
- 小写标签表示内建元素，如 'div'，大写标识符按组件变量解析。花括号进入 JavaScript 表达式，className、事件函数和对象 props 遵循 JavaScript 规则；JSX 必须形成单一父级或 Fragment，并闭合标签。
- element 是不可变的渲染描述，不是真实 DOM，也不是组件实例；创建它不会立刻挂载或触发浏览器布局。

**代码 / 场景：**

下面 JSX 与概念化 jsx 调用表达同一 UI；button 在 render 阶段只是 element 描述，直到 commit 阶段 React 才创建或更新真实按钮。

~~~jsx
const element = <Button kind="primary">保存</Button>

// 新 JSX transform 的概念结果
const element2 = jsx(Button, { kind: 'primary', children: '保存' })
console.log(element.type === Button) // true
console.log(element.props.kind)      // primary
~~~

**递进追问：**

1. **为什么自定义组件名必须大写？**

   JSX 编译约定把小写标签变成字符串内建类型，把大写标识符当当前作用域变量；小写 customButton 会被当未知 DOM 标签。

2. **React element 与 DOM element 有何区别？**

   React element 是轻量不可变描述，可在任何 render 中创建；DOM element 是浏览器节点，有生命周期和方法，只在 renderer 提交时产生。

**易错点：**

- JSX 中直接写对象作为 child 通常报错，应渲染具体字段或先转换为字符串。
- 把 element 引用当 DOM 调用 focus 会失败，DOM 节点应通过 ref 在提交后取得。

**参考来源：**

- [React：Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [React API：createElement](https://react.dev/reference/react/createElement)

校验日期：2026-07-20

## Q3：state 为什么像一次渲染的快照？

**短回答：**

每次渲染中的事件处理器闭包捕获当次 state 值，setState 请求下一次渲染，不会修改当前闭包里的变量。

**原理：**

- 每次 React 调用组件都会得到该次 render 的 props、state 和由它们创建的事件处理器；这些变量在这次调用中固定，即使调用 setState，也只是请求未来渲染，不会改写当前闭包里的值。
- React 把更新加入队列，之后以新 state 再调用组件并生成新的处理器。因此一次点击处理器中多次读取 count 仍是触发该界面时的快照，异步 setTimeout 也捕获该快照。要基于队列中前一个值计算下一值，用函数式 updater；
- 要在异步回调读取“始终最新且不触发渲染”的可变值，可谨慎用 ref。快照模型能让事件与其对应的 UI 一致，也解释了 stale closure，不应通过直接改变量绕开。

**代码 / 场景：**

点击时页面显示 0，setCount(1) 后当前处理器中的 count 仍为 0；React 下一次 render 才显示 1。定时器也输出触发点击时的 0。

~~~jsx
function Counter() {
  const [count, setCount] = useState(0)
  function handleClick() {
    setCount(count + 1)
    console.log(count) // 0：当前 render 快照
    setTimeout(() => console.log(count), 1000) // 仍为 0
  }
  return <button onClick={handleClick}>{count}</button>
}
~~~

**递进追问：**

1. **为什么不能赋值 count += 1？**

   count 是本次函数调用的局部绑定，直接赋值既不更新 React 保存的状态，也不请求新 render；必须调用对应 setter。

2. **如何在定时器中读取最新 state？**

   若回调应随依赖重建，可在 Effect 中正确声明依赖；若确需逃生口，可同步维护 ref.current，但不要让 ref 替代应渲染的 state。

**易错点：**

- 调用 setter 后立即读取 state 仍是旧快照，不代表 React 更新失败。
- 用 ref.current 到处绕开闭包会失去声明式依赖，容易制造读写竞态。

**参考来源：**

- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React API：useState](https://react.dev/reference/react/useState)

校验日期：2026-07-20

## Q4：React 为什么批处理状态更新？

**短回答：**

同一事件或受支持异步边界内的更新进入队列，事件结束后统一计算和提交，减少中间渲染并保持 UI 一致。

**原理：**

- React 在一个事件或受支持异步边界中收集多个 state 更新，等当前 JavaScript 逻辑结束后统一计算下一状态并安排 render，避免每次 setter 都重渲染和提交半完成界面。
- React 18 使用 createRoot 后，Promise、定时器和原生事件中的更新也通常自动批处理；旧根或不同版本行为要实测。队列中直接值更新基于各自 render 快照，函数 updater 则按队列顺序接收前一计算结果。
- 批处理不会跨所有用户事件无限合并，React 会确保点击等独立交互保持语义。DOM 集成极少数需要同步提交时可用 flushSync，但它会迫使 React 提前 flush、影响并发和性能，不能作为日常“修时序”工具。

**代码 / 场景：**

一次点击同时更新 count 和 loading，React 通常只 render/commit 一次最终组合。三次 setCount(count+1) 都基于快照 0，结果是 1；三次 updater 才是 3。

~~~jsx
function addThreeWrong() {
  setCount(count + 1)
  setCount(count + 1)
  setCount(count + 1) // 下一次通常是 1
}
function addThree() {
  setCount(n => n + 1)
  setCount(n => n + 1)
  setCount(n => n + 1) // updater 队列结果是 3
}
~~~

**递进追问：**

1. **批处理是否让 state setter 异步返回 Promise？**

   不会。setter 没有可 await 的完成 Promise；它登记更新。需要在 DOM 提交后同步外部系统应使用 Effect，极少数 DOM 集成才用 flushSync。

2. **为什么 React 不批处理两个独立点击？**

   每次用户事件可能依赖前一次提交，例如第一次禁用按钮；跨事件合并会破坏交互正确性，因此只在安全边界内批处理。

**易错点：**

- 自动批处理的版本和 root API 有边界，迁移旧 React 时应写行为测试。
- 频繁 flushSync 会打断并发调度并可能强制显示 Suspense fallback。

**参考来源：**

- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React DOM API：flushSync](https://react.dev/reference/react-dom/flushSync)

校验日期：2026-07-20

## Q5：函数式 setState 何时必须使用？

**短回答：**

新状态依赖前一个状态或同一批次连续更新时传 updater，React 会按队列依次计算，避免读取旧快照导致丢更新。

**原理：**

- 当下一状态依赖前一状态时应传 updater，如 setCount(c => c + 1)，而不是用当前 render 的 count 计算。
- React 把 updater 加入队列，下一次 render 按顺序把前一个 pending state 传给每个函数，因此同一事件多次递增、异步完成后的合并和并发更新不会都基于旧快照。若新值完全独立，如 setOpen(false)，直接传值更清楚。
- updater 必须纯粹，只根据参数返回下一值，不修改旧对象、不发请求；开发 StrictMode 可能额外调用 updater 检查纯度。复杂的多个相关字段可用 useReducer 把状态转换集中。
- 函数式 updater解决的是同一 state 的时间依赖，不会自动解决跨请求竞态或把多个服务器写变成事务。

**代码 / 场景：**

三次 updater 依次接收 0、1、2，最终得到 3；若写三次 setScore(score+1)，它们都用当前快照 0，最终替换值通常都是 1。

~~~jsx
const [score, setScore] = useState(0)
function handleClick() {
  setScore(s => s + 1)
  setScore(s => s + 1)
  setScore(s => s + 1)
}
// 点击一次后下一次 render 显示 3
~~~

**递进追问：**

1. **updater 中可以读取其他 state 吗？**

   闭包能读取但可能是旧快照。若两个状态总要一起转换，合并为 reducer/state 对象，或让一个值从另一个派生，边界更可靠。

2. **updater 可否修改传入对象再返回？**

   不应。传入值属于前一快照，原地修改会污染历史与浅比较；应返回新对象或使用保证不可变语义的工具。

**易错点：**

- 函数 updater 不是异步回调容器，不能在其中发请求或调用其他 setter。
- 无条件把所有 setter 改成 updater 会降低可读性，独立常量更新不需要。

**参考来源：**

- [React API：useState—Updating state based on previous state](https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state)
- [React：Queueing State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)

校验日期：2026-07-20

## Q6：key 如何影响组件状态？

**短回答：**

React 用父级位置、元素类型和 key 判断身份；key 改变会卸载旧实例并创建新实例，可用于有意重置状态。

**原理：**

- React 用组件类型、在父树中的位置和 key 共同判断前后两个 element 是否代表同一身份。身份相同就复用 Fiber、DOM 和 hook state；类型或 key 改变则卸载旧子树、创建新实例，局部 state 与 Effect 生命周期重置。
- 列表中 key 只需在兄弟间唯一，应来自稳定业务 ID；数组索引在插入、删除、排序后对应不同实体，会让输入值和局部状态跟错行。key 不作为普通 prop 传给组件，需要业务 ID 应另传。
- 主动更改 key 可重置表单或切换不同聊天对象，但每次 render 用随机 key 会导致持续重建。key 也不能代替数据同步：若只是 props 更新，应让同一实例正常响应。

**代码 / 场景：**

切换 recipient.id 后 key 改变，ChatForm 的 draft state 被重置，避免把给 A 的草稿发给 B；若没有 key，相同位置的 ChatForm 会保留旧 draft。

~~~jsx
function Messenger({ recipient }) {
  return <ChatForm key={recipient.id} recipient={recipient} />
}

function ChatForm({ recipient }) {
  const [draft, setDraft] = useState('')
  return <textarea value={draft} onChange={e => setDraft(e.target.value)} />
}
~~~

**递进追问：**

1. **为什么 key 不要求全局唯一？**

   协调只在同一父节点的兄弟集合中匹配；不同父树没有直接竞争身份。但同一列表内重复 key 会产生不确定复用和警告。

2. **用 key 重置表单与 Effect 同步 props 哪个更好？**

   若业务身份变更意味着整份局部状态都应丢弃，key 清晰；只需更新个别字段时，重建整棵子树可能过重，应明确同步规则。

**易错点：**

- Math.random() key 会让每次 render 都卸载重建，输入焦点与状态持续丢失。
- 索引 key 在可重排列表中会把状态绑定到位置而非业务实体。

**参考来源：**

- [React：Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React：Rendering Lists—Keeping items in order with key](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)

校验日期：2026-07-20

## Q7：为什么不能在 render 中直接修改 state？

**短回答：**

会在渲染过程中再次安排渲染，可能形成循环并破坏纯渲染假设；应在事件、effect 或外部订阅回调中更新。

**原理：**

- render 必须是可重入、可丢弃的纯计算。若组件函数或 render 路径直接调用 setter，更新会安排新的 render，而新的 render 又执行 setter，通常形成 Too many re-renders；
- 若原地修改 state 对象，React 不知道何时按新引用调度，旧快照也被污染，并发准备或 memo 比较会观察到不一致。React 允许极少数受条件保护的“在 render 中调整当前组件 state”模式，但官方建议优先在事件中更新、从 props 派生或用 key 重置；
- 绝不能在渲染一个组件时更新另一个组件。DOM、订阅和请求放 Effect，用户动作放事件处理器。state 应视为只读快照，用新对象/数组替换，而非 push、赋字段。

**代码 / 场景：**

Bad 每次 render 都 setCount，立即循环；Mutation 原地 push 后 setItems(items) 引用未变且污染旧快照。Good 在点击事件中用新数组更新。

~~~jsx
function List() {
  const [items, setItems] = useState([])
  // setItems([...items]) // render 中调用会循环
  function addItem(item) {
    setItems(current => [...current, item])
  }
  return <button onClick={() => addItem({ id: crypto.randomUUID() })}>新增</button>
}
~~~

**递进追问：**

1. **为什么 setState 写在条件中仍可能危险？**

   条件若在更新后仍成立就继续循环；并发重试还可能重复路径。能从 props 计算的值不应存 state，身份重置优先 key。

2. **原地修改后再返回新外层对象可以吗？**

   若先修改嵌套旧对象，历史快照仍被污染。应从被修改层开始复制，保证旧树所有共享路径不被写入。

**易错点：**

- useMemo 回调也在 render 阶段，不能借它执行 setter、请求或 DOM 操作。
- 没有报错的 state 原地修改仍会破坏 memo、并发和时间旅行调试。

**参考来源：**

- [React：Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [React：Updating Objects in State](https://react.dev/learn/updating-objects-in-state)

校验日期：2026-07-20

## Q8：受控组件和非受控组件如何选择？

**短回答：**

受控输入由 React state 驱动，适合联动校验；非受控由 DOM 保存即时值，适合简单表单或文件输入，提交时读取 ref。

**原理：**

- 受控输入由 React state/props 作为当前值来源，传 value/checked 并在 onChange 同步更新，适合即时校验、联动、格式化和外部重置；代价是每次输入触发状态更新，且必须始终提供与事件配套的值。
- 非受控输入让 DOM 保存当前值，用 defaultValue/defaultChecked 设初值，提交或必要时通过 ref/FormData 读取，适合简单表单、与非 React 插件集成和文件输入。
- 组件也可在更高层设计受控 open + defaultOpen 的模式，但一次生命周期中不能从 undefined 突然切成 value，React 会警告并可能覆盖用户输入。选择依据是状态所有者和同步需求，不是认为非受控“没有状态”。
- 文件 input 的值受浏览器安全限制，通常必须非受控。

**代码 / 场景：**

email 受控，可即时显示错误；avatar 文件由 DOM 保存，提交时从 files 读取。value 使用空字符串初始化，避免从非受控切到受控。

~~~jsx
function ProfileForm() {
  const [email, setEmail] = useState('')
  const fileRef = useRef(null)
  function submit(event) {
    event.preventDefault()
    upload({ email, file: fileRef.current.files[0] })
  }
  return <form onSubmit={submit}>
    <input value={email} onChange={e => setEmail(e.target.value)} />
    <input ref={fileRef} type="file" />
    <button>保存</button>
  </form>
}
~~~

**递进追问：**

1. **大型受控表单一定性能差吗？**

   不一定。可把 state 下沉到字段、拆更新边界或使用表单库订阅；先用 Profiler 找实际重渲染热点，而不是整体改非受控。

2. **defaultValue 后续变化会更新 DOM 当前值吗？**

   它只设置初始值，用户编辑后的当前值由 DOM 持有；若要外部持续控制，改用 value/onChange 或通过 key 明确重建。

**易错点：**

- 传 value 却没有 onChange 会变成只读输入，用户键入看似无效。
- 同一输入在受控和非受控间切换会警告，并可能丢失用户正在编辑的值。

**参考来源：**

- [React：Sharing State Between Components](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components)
- [React DOM API：input](https://react.dev/reference/react-dom/components/input)

校验日期：2026-07-20

## Q9：Context 的适用边界是什么？

**短回答：**

它适合跨层传递相对稳定的依赖；value 变化会通知所有消费方，高频复杂业务状态需拆分 context 或用外部 store。

**原理：**

- Context 让组件读取最近祖先 Provider 的值，适合主题、当前认证主体、locale、路由或一棵子树共享的服务，避免仅为透传而经过许多中间层。
- Provider value 变化时，所有读取该 Context 的后代会更新，React 用 Object.is 比较前后 value；每次 render 新建大对象会扩大扇出。Context 解决依赖传递，不自动提供 reducer、缓存、异步请求、持久化和选择器。
- 高频且庞大的状态可拆成多个 Context、稳定 value、把 state 与 dispatch 分开，或使用 useSyncExternalStore/状态库提供细粒度订阅。过度 Context 会隐藏组件依赖并降低复用；若只有一两层，显式 props 或组件组合更清楚。
- 默认值仅在树中没有对应 Provider 时使用，不会因 value={undefined} 回退。

**代码 / 场景：**

ThemeProvider 用 useMemo 稳定对象，读取主题的后代会随 mode 更新；不需要主题的中间组件无需接 prop。若 value 每次包含新函数字面量，所有消费者都会无效更新。

~~~jsx
const ThemeContext = createContext(null)
function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light')
  const value = useMemo(() => ({ mode, setMode }), [mode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
function Button() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('ThemeProvider missing')
  return <button data-theme={theme.mode}>保存</button>
}
~~~

**递进追问：**

1. **React.memo 能阻止 Context 更新消费者吗？**

   不能阻止组件因其读取的 Context 值变化而更新；memo 只比较 props。要缩小影响应拆 Context 或使用细粒度外部订阅。

2. **Context 默认值适合放真实全局单例吗？**

   通常不适合。测试可能无意在缺 Provider 时使用假值；必要依赖用 null 默认并显式报错，边界更容易发现。

**易错点：**

- Provider value 每次创建新对象会让所有消费者更新，即使字段内容没变。
- 把整个应用所有状态放一个 Context 会产生巨大更新扇出和隐式依赖。

**参考来源：**

- [React：Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React API：useContext](https://react.dev/reference/react/useContext)

校验日期：2026-07-20

## Q10：Portal 为什么仍能按 React 树冒泡事件？

**短回答：**

Portal 只改变 DOM 放置位置，组件父子关系仍在 React 树中，因此 context 和合成事件沿 React 树传播。

**原理：**

- createPortal(children, domNode) 只改变子节点实际挂载的 DOM 容器，它在 React element/Fiber 树中的父子关系不变，因此 Context 仍从逻辑祖先读取，React 合成事件也沿 React 树传播。
- 点击挂在 document.body 的弹窗按钮，仍可触发声明 Portal 的 React 父组件 onClick，即使两者不是 DOM 祖先。原生 addEventListener 和 CSS 选择器则遵循真实 DOM 树，两套路径必须区分。
- Portal 常用于 modal、tooltip 和浮层以避开 overflow 或 stacking context，但不会自动完成焦点陷阱、aria-modal、背景 inert、滚动锁和返回焦点。
- 若事件冒泡造成冲突，可在 portal 内容停止传播或把 Portal 在 React 树中移到更合适位置，而不是误判 React bug。

**代码 / 场景：**

Modal DOM 位于 #modal-root，但点击关闭按钮会先执行按钮处理，再沿 React 树到 App 的 onClick；DOM 上 #app 并不是它的祖先。

~~~jsx
function App() {
  return <div onClick={() => console.log('React parent')}>
    <Modal />
  </div>
}
function Modal() {
  return createPortal(
    <button onClick={() => console.log('button')}>关闭</button>,
    document.getElementById('modal-root'),
  )
}
// 点击输出 button，然后 React parent
~~~

**递进追问：**

1. **Portal 内组件能读取外层 Context 吗？**

   能，因为 Context 按 React 树而非 DOM 树解析；这正是 Portal 与创建独立 React root 的重要区别。

2. **如何避免点击弹窗触发页面外层 onClick？**

   在明确边界调用合成事件 stopPropagation，或调整逻辑树位置；仍要考虑原生事件监听器走 DOM 路径，不能混为一谈。

**易错点：**

- Portal 不是完整可访问弹窗，必须另做焦点管理、Escape 和语义属性。
- 把 React 冒泡路径与原生 DOM 冒泡路径混用，会导致重复或漏处理。

**参考来源：**

- [React DOM API：createPortal](https://react.dev/reference/react-dom/createPortal)
- [WAI-ARIA APG：Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

校验日期：2026-07-20

# Hooks 与副作用

## Q11：Hooks 为什么不能写在条件语句里？

**短回答：**

React 依赖每次渲染相同的 Hook 调用顺序把状态槽与调用对应，条件调用会让后续槽位错位。

**原理：**

- React 在一次函数组件渲染中，按照 Hook 调用出现的顺序把 useState、useReducer、useEffect 等调用与该 Fiber 上保存的 Hook 节点逐一对应；调用本身没有业务名称可供 React 在下一次渲染重新匹配。
- 如果某个 Hook 只在条件成立时执行，后续 Hook 的序号就会前移或后移，原本属于年龄的 state 可能被当成姓名，effect 的依赖与清理函数也会错配。
- 因此组件和自定义 Hook 必须在顶层、每次渲染都以相同顺序调用 Hook，不能放进条件、循环、事件处理器、普通嵌套函数或 try/catch/finally。需要条件行为时，应始终调用 Hook，再把条件移入 effect 回调、事件回调或返回结果的分支。
- eslint-plugin-react-hooks 能静态检查常见违规，但规则的根本原因是保持渲染间的调用拓扑稳定，而不是语法偏好。

**代码 / 场景：**

第一次 enabled 为 false 时跳过第一个 state，第二个 state 占据槽位一；下一次 enabled 为 true 后，name 会读到原来 count 的值。正确写法让两个 state 始终执行，只在展示或副作用内部判断条件。

~~~jsx
function Bad({ enabled }) {
  if (enabled) useState('name')
  const [count] = useState(0)
  return <span>{count}</span>
}
function Good({ enabled }) {
  const [name] = useState('name')
  const [count] = useState(0)
  return enabled ? <span>{name}: {count}</span> : <span>{count}</span>
}
~~~

**递进追问：**

1. **提前 return 之前可以调用一部分 Hook 吗？**

   不可以让提前返回在不同渲染中跳过后续 Hook，否则调用数量仍会变化。应把所有 Hook 放在可能的提前返回之前，或把条件区域拆成独立子组件。

2. **可以在自定义 Hook 内部使用其他 Hook 吗？**

   可以，而且这是复用有状态逻辑的标准方式；但自定义 Hook 自身也必须无条件地按固定顺序调用其他 Hook，并应以 use 开头以便静态规则识别。

**易错点：**

- 把 Hook 放进 map 循环，即使数组当前长度固定，数据增删后仍会导致调用槽位错位。
- 用禁用 lint 规则掩盖条件 Hook，只会把可检测错误变成依赖运行路径的状态串位。

**参考来源：**

- [React：Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React：eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks)

校验日期：2026-07-20

## Q12：useEffect 的职责是什么？

**短回答：**

它用于让组件与网络、订阅、DOM 插件等外部系统同步，不应拿来计算可由 props/state 直接推导的数据。

**原理：**

- useEffect 用来让已经提交到页面的 React 组件与外部系统同步，例如建立 WebSocket 连接、订阅浏览器事件、驱动非 React 小部件或向分析系统报告可见状态。
- 它不是计算派生数据、响应按钮点击或串联普通状态变化的默认工具：渲染期间能由 props/state 算出的值直接计算，用户动作放事件处理器，昂贵纯计算才考虑 memo。提交后 React 运行 effect；
- 依赖改变时先用旧依赖对应的 cleanup 撤销旧同步，再以新值 setup，卸载时再清理。服务端渲染不执行 effect，因此首屏 HTML 不能依赖它。开发 Strict Mode 还可能额外执行 setup→cleanup→setup 来检查清理是否对称。
- 把职责理解为“外部系统同步”可减少多余渲染、竞态与无限循环。

**代码 / 场景：**

聊天室组件提交后才连接指定 room；切换 room 时先断开旧连接再连接新房间，卸载时断开。消息发送属于点击事件，不应通过设置 send 标记再让 effect 观察。

~~~jsx
function Chat({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])
  return <button onClick={() => sendMessage(roomId, 'hello')}>发送</button>
}
~~~

**递进追问：**

1. **获取数据一定要放 useEffect 吗？**

   不一定。框架路由加载器或支持缓存、SSR、去重的数据层通常更合适；手写客户端 effect 请求时必须处理取消、竞态、缓存和服务端首屏缺失。

2. **为什么 effect 里 setState 容易形成链式渲染？**

   effect 在一次提交后执行，再更新 state 会触发下一轮渲染和提交；若该值本可直接派生，就无端增加一轮并可能因依赖变化持续循环。

**易错点：**

- 把 props 复制到 state 的 effect 会产生一次过期画面，并需要额外处理源值与本地编辑冲突。
- 为了只执行一次而删除真实依赖，会让回调长期读取旧值，并掩盖同步模型设计错误。

**参考来源：**

- [React：Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React API：useEffect](https://react.dev/reference/react/useEffect)

校验日期：2026-07-20

## Q13：依赖数组如何判断？

**短回答：**

effect 读取的所有响应式值都应列为依赖；由组件外常量或稳定 Hook 保证不变的值可不列，不能靠手工删依赖压制 lint。

**原理：**

- 依赖数组不是开发者任选的触发条件，而是 effect、useMemo 或 useCallback 回调中读取的所有响应式值的完整声明。响应式值包括组件 props、state，以及组件函数体内声明并会随渲染改变的变量和函数；React 逐项以 Object.is 比较前后依赖。
- 模块常量、稳定的 state setter 和 ref 对象本身通常不必加入，但读取 ref.current 不会让 React 在其变化时重新执行，不能借此冒充响应性。正确做法是先写同步逻辑，再让 exhaustive-deps 检查；
- 若依赖过多，应把无关事件逻辑移出 effect、在 effect 内创建仅供同步使用的对象/函数、使用函数式更新，或把真正不随渲染变化的值移到组件外。禁止通过删依赖“控制频率”，因为那会让闭包与外部系统脱节。

**代码 / 场景：**

连接选项若在渲染中创建，每次都是新对象，effect 会重复连接。把对象创建移进 effect 后只依赖 serverUrl 与 roomId；二者任一变化，React 先清旧连接再建新连接。

~~~jsx
function Chat({ roomId }) {
  const serverUrl = 'https://chat.example.com'
  useEffect(() => {
    const options = { serverUrl, roomId }
    const connection = connect(options)
    return () => connection.close()
  }, [serverUrl, roomId])
  return <h1>{roomId}</h1>
}
~~~

**递进追问：**

1. **空依赖数组是否代表组件挂载事件？**

   更准确地说，它表示 effect 不读取会变化的响应式值；开发 Strict Mode 仍可能做额外 setup/cleanup 检查，组件因 key 改变重建也会重新执行。

2. **对象依赖如何避免每次都变化？**

   优先只依赖所需原始字段，或把仅供 effect 使用的对象放到 effect 内创建；只有对象确实跨渲染共享时才使用 useMemo 稳定身份。

**易错点：**

- 用 JSON.stringify 填依赖既增加序列化成本，也会忽略函数、循环引用和语义顺序问题。
- 把频繁变化的值塞进 ref 再省略依赖，会让同步不再自动更新，且审查者难以发现旧值。

**参考来源：**

- [React：Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)
- [React lint：exhaustive-deps](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps)

校验日期：2026-07-20

## Q14：effect cleanup 在何时执行？

**短回答：**

依赖变化重新执行前先清理上一次，组件卸载时也清理；开发 Strict Mode 还会额外执行一次 setup-cleanup 用于暴露缺陷。

**原理：**

- cleanup 是某次 effect setup 的对称撤销函数。组件首次提交后运行 setup；当依赖至少一项以 Object.is 判断发生变化，React 在运行新 setup 前先调用上一轮 cleanup，使旧订阅、计时器或请求不再影响新状态；
- 组件从树中移除时再调用最后一次 cleanup。cleanup 读取的是创建它那次渲染的闭包，因此能准确断开旧 roomId 对应的连接，而不是当前的新值。
- 开发 Strict Mode 会在首次真实使用前额外进行一次 setup→cleanup→setup 压力测试，生产环境没有这次开发检查；如果用户能看出差异，说明 cleanup 未完全还原 setup。cleanup 不应更新已经卸载组件的 UI，也不能只清理部分资源。
- 对于 fetch 可用 AbortController 取消网络工作，仍应防范服务端已处理请求或非取消异步结果。

**代码 / 场景：**

query 从 vue 变为 react 时，旧请求先收到 abort；只有当前请求能写入结果。卸载也会取消最后一个请求。若接口不支持取消，还应在 cleanup 把 ignore 设为 true，回调返回时检查。

~~~jsx
function Search({ query }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/search?q=' + encodeURIComponent(query), { signal: controller.signal })
      .then(r => r.json()).then(setItems)
      .catch(e => { if (e.name !== 'AbortError') report(e) })
    return () => controller.abort()
  }, [query])
  return <Results items={items} />
}
~~~

**递进追问：**

1. **cleanup 只在卸载时执行吗？**

   不是。依赖改变导致 effect 重新同步时，每次新 setup 之前都会执行旧 cleanup；这也是切换订阅目标不会同时保留两份连接的关键。

2. **cleanup 为什么会读到旧 props？**

   它属于建立该资源的那次渲染闭包，旧 props 正好标识要撤销的旧资源；若强行读取最新值，反而可能断开错误的连接或计时器。

**易错点：**

- addEventListener 与 removeEventListener 使用不同函数引用，会导致监听器实际没有被移除。
- 只设置 mounted 标志而不取消可取消请求，会继续浪费带宽和连接槽位，服务端工作也可能持续。

**参考来源：**

- [React API：useEffect cleanup](https://react.dev/reference/react/useEffect#parameters)
- [React：Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)

校验日期：2026-07-20

## Q15：useLayoutEffect 和 useEffect 有何区别？

**短回答：**

layout effect 在 DOM 提交后、浏览器绘制前同步执行，适合测量布局；它会阻塞绘制，普通副作用优先 useEffect。

**原理：**

- 两者都在提交阶段后用于外部同步，差异主要是相对浏览器绘制的时机。useLayoutEffect 在 React 完成 DOM 变更后、浏览器重新绘制前同步执行；
- 其中的 state 更新也会在绘制前处理，因此适合必须先测量真实布局再立即校正位置的 tooltip、恢复滚动或第三方布局控件。它会阻塞绘制，工作过多会直接延迟页面显示。useEffect 通常让浏览器先绘制，再异步处理连接、日志等非视觉同步，是默认选择。两者都不在服务端执行；
- 使用 useLayoutEffect 的组件若依赖布局，SSR 期间无法获得有意义结果，可只在客户端展示或改为无需测量的 CSS 方案。不要用 layout effect 追求“更快”，只有用户会看到错误中间布局时才值得阻塞绘制。

**代码 / 场景：**

tooltip 第一次以未知高度渲染，layout effect 在首帧绘制前读取 getBoundingClientRect，再同步把 top 改到目标上方，所以用户只看到校正后的帧。换成普通 effect 可能先闪在下方再跳动。

~~~jsx
function Tooltip({ targetRect }) {
  const ref = useRef(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    setHeight(ref.current.getBoundingClientRect().height)
  }, [])
  const top = targetRect.top - height
  return <div ref={ref} style={{ position: 'fixed', top }}>说明</div>
}
~~~

**递进追问：**

1. **useLayoutEffect 中更新 state 会发生什么？**

   React 会在浏览器绘制前立即处理该更新及剩余 effect，使首个可见帧包含校正结果；代价是主线程和绘制被更久地阻塞。

2. **服务端出现 useLayoutEffect 警告该怎么处理？**

   先确认首屏是否真的依赖布局测量；能用 CSS 就去掉 effect，否则让相关组件客户端化或显示占位，不能假装服务端能够读取 DOM 尺寸。

**易错点：**

- 把请求、日志和普通订阅放 useLayoutEffect 会无意义地阻塞首帧并放大卡顿。
- 测量后每次都写入相同 state，若缺少依赖控制可能形成反复布局和渲染抖动。

**参考来源：**

- [React API：useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- [React API：useEffect caveats](https://react.dev/reference/react/useEffect#caveats)

校验日期：2026-07-20

## Q16：useMemo 和 useCallback 是语义保证吗？

**短回答：**

它们是性能优化缓存，依赖变化会失效，React 也可能因实现需要丢弃缓存；业务正确性不能依赖缓存永久存在。

**原理：**

- useMemo 缓存一次纯计算的结果，useCallback 缓存函数身份；在依赖未以 Object.is 判为变化时，React 通常复用缓存，用于减少已测量到的昂贵计算，或配合 memo、effect 等需要稳定引用的边界。
- 它们是性能优化，不应承担程序正确性：React 文档明确可在特定原因下丢弃缓存，例如开发中编辑文件、组件初次挂载时挂起，未来也可能为虚拟列表等能力增加策略。若去掉 memo 后逻辑就错，应改用 state、ref 或清晰的数据流表达语义。
- 缓存本身也有依赖比较、闭包与内存成本，且一个每次新建的对象依赖就足以让整条 memo 链失效。当前 React Compiler 可在受支持代码中自动进行部分记忆化，但仍应通过 Profiler 证明收益并保持组件纯。

**代码 / 场景：**

filterTodos 只有在 todos 或 tab 改变时才需重算，visibleTodos 的稳定引用还能让 memo 包装的 List 跳过 theme 单独变化造成的渲染。若 options 每次新建再作为依赖，缓存会次次失效。

~~~jsx
function TodoPage({ todos, tab, theme }) {
  const visibleTodos = useMemo(() => filterTodos(todos, tab), [todos, tab])
  const select = useCallback(id => markSelected(id), [])
  return <section className={theme}><List items={visibleTodos} onSelect={select} /></section>
}
const List = memo(function List({ items, onSelect }) {
  return items.map(item => <button key={item.id} onClick={() => onSelect(item.id)}>{item.text}</button>)
})
~~~

**递进追问：**

1. **每个函数都包 useCallback 会更快吗？**

   不会。只有函数身份作为 memo 子组件属性或其他 Hook 依赖且确实造成昂贵工作时才可能受益；否则只是增加依赖维护和比较成本。

2. **useMemo 可以执行副作用吗？**

   不可以。计算函数运行在 render 阶段，可能被重试或丢弃，必须保持纯；订阅、DOM 修改和请求应进入 effect 或明确的事件处理器。

**易错点：**

- 漏掉 useMemo 依赖会缓存基于旧 props 的结果，表面性能优化实际制造数据错误。
- 把廉价加法或短数组映射全部缓存，常让依赖比较和代码复杂度超过计算本身。

**参考来源：**

- [React API：useMemo](https://react.dev/reference/react/useMemo)
- [React API：useCallback](https://react.dev/reference/react/useCallback)

校验日期：2026-07-20

## Q17：useRef 为什么修改后不触发渲染？

**短回答：**

ref 是跨渲染保持身份的可变容器，React 不跟踪 current 变化；适合 DOM、定时器和不参与展示的实例数据。

**原理：**

- useRef 在组件整个挂载生命周期内返回同一个可变对象，current 字段供开发者保存不参与界面输出的值；React 不追踪对该普通对象属性的赋值，所以修改 current 不会调度 render。
- 它适合 DOM 节点、计时器 ID、前一次值、命令式第三方实例等“需要跨渲染保留但不应显示”的数据。若一个值会决定 JSX，必须放 state，否则 UI 会停留在旧结果。
- 除初始化的可预测写法外，不应在 render 中任意读写 current，因为并发渲染可能重试或丢弃，render 期可变共享数据会破坏纯函数假设。ref 对象本身身份稳定，通常无需成为依赖；
- 但 current 变化也不会触发 effect，若需要订阅外部可变源应使用 useSyncExternalStore。转发 DOM 能力时应只暴露必要命令式句柄，而非泄露整个节点。

**代码 / 场景：**

点击开始把 interval ID 存入 ref，赋值本身不渲染；每秒真正更新 state 才刷新数字。点击停止用同一 ref 清理计时器。若把 count 也只放 ref，页面将一直显示初始值。

~~~jsx
function Timer() {
  const timerRef = useRef(null)
  const [seconds, setSeconds] = useState(0)
  function start() {
    if (timerRef.current) return
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }
  function stop() {
    clearInterval(timerRef.current)
    timerRef.current = null
  }
  return <><span>{seconds}</span><button onClick={start}>开始</button><button onClick={stop}>停止</button></>
}
~~~

**递进追问：**

1. **ref.current 可以放进依赖数组吗？**

   语法上能写，但赋值不会触发渲染，React 也就没有机会比较新依赖；它不能可靠表达响应式变化，需改用 state 或外部 store 订阅。

2. **为什么 DOM ref 通常在事件或 effect 中读取？**

   提交前真实 DOM 可能尚未创建或正处于旧树；提交后 ref 才指向当前节点，因此事件和 effect 中执行聚焦、测量更符合生命周期。

**易错点：**

- 把购物车数量只存 ref 会让业务值改变但视图不更新，刷新或别的 state 更新后才偶然显示。
- render 中累加 ref.current 会因 Strict Mode 或并发重试执行多次，产生不可预测计数。

**参考来源：**

- [React API：useRef](https://react.dev/reference/react/useRef)
- [React：Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)

校验日期：2026-07-20

## Q18：闭包导致 stale state 如何处理？

**短回答：**

使用函数式更新、正确 effect 依赖或 ref 保存最新值；不要通过禁用依赖规则掩盖闭包读取旧快照的问题。

**原理：**

- 每次 render 都创建一套绑定与事件函数，函数捕获的是那次渲染的 state 快照，不会因变量后来更新而自动改写。异步回调、计时器或省略依赖的 effect 继续调用旧函数时，就出现 stale state。
- 处理方式取决于意图：如果下一状态只基于上一状态，使用函数式 setter，让 React 把队列中的最新待处理状态传入；如果 effect 必须随某值重新同步，就声明完整依赖并正确 cleanup；
- 如果需要读取最新值但不希望它成为同步触发条件，可在支持的 React 版本使用 useEffectEvent，或谨慎维护 ref，并明确其非响应式性质。事件需要当时快照时旧值反而正确。
- 不能统一用 ref 或禁用 exhaustive-deps，因为那会隐藏数据流，且并发重试下更难推理。

**代码 / 场景：**

连续点击后定时器里的 count 是点击发生时的快照。若目标是三秒后在当时最新计数上加一，函数式更新不会读取闭包中的 count；多个回调也会按更新队列依次累加。

~~~jsx
function Counter() {
  const [count, setCount] = useState(0)
  function scheduleIncrement() {
    setTimeout(() => setCount(current => current + 1), 3000)
  }
  return <button onClick={scheduleIncrement}>{count}</button>
}
~~~

**递进追问：**

1. **为什么 setTimeout 后 alert 显示旧值不一定是 bug？**

   闭包有意保存了点击那一刻的渲染快照；若产品语义就是报告当时值，这是正确行为。只有需求是读取最新值时才需改变实现。

2. **函数式更新能解决所有 stale closure 吗？**

   不能。它只解决根据同一 state 最新值计算下一值；若回调还读取旧 prop、配置或外部对象，仍需正确依赖、重新订阅或专门的最新值通道。

**易错点：**

- 省略 effect 依赖让 interval 永久捕获初始 count，界面可能只更新一次就停止增长。
- 每次渲染都覆盖共享模块变量来保存最新值，会让多个组件实例彼此污染并破坏 SSR 隔离。

**参考来源：**

- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)

校验日期：2026-07-20

## Q19：自定义 Hook 的价值是什么？

**短回答：**

复用有状态逻辑而非共享状态实例，每次调用都有独立 state；名称以 use 开头让 lint 能检查 Hook 规则。

**原理：**

- 自定义 Hook 抽取的是可复用的有状态逻辑与外部同步协议，而不是共享 state 实例。每次组件调用 useOnlineStatus、useChatRoom 都会获得独立的 state/effect，只是执行相同规则；真正共享数据仍需 Context 或外部 store。
- 好的 Hook 以 use 开头，输入输出表达业务能力，内部封装订阅、清理、竞态和 Hook 依赖，使组件只描述界面。它还可以组合多个基础 Hook，并让 lint 规则识别其调用边界。
- 不要为了减少几行代码就机械包装，尤其不要造 useMount、useEffectOnce 来逃避依赖语义；抽象应稳定协议、减少重复错误并可单独测试。Hook 只能从 React 函数组件或其他 Hook 顶层调用，不是任意工具函数。
- 随着需求变化，返回命令和状态通常比暴露内部 setter、DOM 或缓存结构更能保持封装。

**代码 / 场景：**

两个 StatusBadge 分别调用 useOnlineStatus 时会各自建立并清理订阅；若应用只需一份全局订阅，可由外部 store 配合 useSyncExternalStore 去重。组件不必知道 online/offline 事件细节。

~~~jsx
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}
function StatusBadge() { return <span>{useOnlineStatus() ? '在线' : '离线'}</span> }
~~~

**递进追问：**

1. **两个组件调用同一自定义 Hook 会共享 state 吗？**

   不会，每次调用都在各自 Fiber 上创建独立 Hook 状态；它们只有在共同读取 Context 或同一个外部 store 时才共享底层数据。

2. **自定义 Hook 应返回对象还是数组？**

   少量且调用者会自由命名的位置值可用数组；字段较多、可选或未来会扩展时对象更清晰。关键是 API 语义稳定，不由形式本身决定。

**易错点：**

- 命名为普通函数却在内部调用 Hook，会逃过部分识别并违反调用约定，重构后容易出错。
- 返回内部所有 setter 和 ref 让调用方随意组合，会泄露状态机约束并使抽象失去价值。

**参考来源：**

- [React：Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React：Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)

校验日期：2026-07-20

## Q20：useSyncExternalStore 解决什么问题？

**短回答：**

它规定外部 store 的订阅与快照读取契约，使并发渲染下多个组件看到一致快照，并支持 SSR 的服务端快照。

**原理：**

- useSyncExternalStore 是 React 读取并订阅 React 之外可变 store 的标准接口。组件提供 subscribe 注册变更通知、getSnapshot 读取客户端快照；SSR 时还可提供 getServerSnapshot。
- React 会缓存并以 Object.is 比较快照，只在快照改变时更新，并在提交前再次检查，从而避免并发渲染期间 store 变化造成同一画面不同组件读到不同版本的 tearing。
- getSnapshot 在数据未变时必须返回同一不可变值，不能每次创建新对象，否则会形成持续重渲染；可变 store 应自行缓存派生快照。subscribe 最好定义在组件外或稳定化，避免每次 render 重新订阅。它适合浏览器在线状态、第三方状态库和遗留 store；
- 普通 React state 不需要绕道使用它，数据请求缓存也需额外处理加载、错误和去重语义。

**代码 / 场景：**

浏览器网络状态是外部可变源。subscribe 对 online/offline 注册同一通知，getSnapshot 返回布尔值；事件发生后 React 重新取快照，仅当值变化才提交。SSR 用 true 作为确定的服务端快照并在 hydration 后校正。

~~~jsx
function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}
const getSnapshot = () => navigator.onLine
const getServerSnapshot = () => true
function Status() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return <span>{online ? '在线' : '离线'}</span>
}
~~~

**递进追问：**

1. **getSnapshot 为什么不能每次返回新对象？**

   React 会用 Object.is 判断快照是否变化；每次新对象都被视为新版本，可能触发无限更新。应让 store 版本不变时复用缓存快照。

2. **SSR 时不提供 getServerSnapshot 会怎样？**

   该组件会被迫只在客户端渲染；若提供，服务端与 hydration 首次客户端调用必须返回一致内容，随后再订阅并切换到真实客户端快照。

**易错点：**

- 在组件内新建 subscribe 函数会导致每次渲染退订再订阅，增加丢事件和性能风险。
- 直接返回可变 store 对象且原地修改字段，引用不变会让 React 无法发现内容已经变化。

**参考来源：**

- [React API：useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [React WG：useSyncExternalStore overview](https://github.com/reactwg/react-18/discussions/86)

校验日期：2026-07-20

# 状态架构与数据请求

## Q21：如何判断状态应该放在哪里？

**短回答：**

优先放在需要它的最近共同父组件；只有跨远距离、跨页面或服务端缓存才提升到 context、store 或请求缓存层。

**原理：**

- 因为同一事实若在多个组件各存一份，就必须额外同步且容易出现互相覆盖，所以状态应只由一个最接近使用者的组件拥有。先区分真正会随交互变化且无法从现有输入计算的数据，再寻找所有需要读取或修改它的组件的最近公共祖先；由它通过 props 下发值与事件。
- 只被单个叶子使用的临时展开、悬停或输入草稿应留在局部，避免全局 store；需要跨远层共享但变化不频繁的主题、身份可用 Context；跨路由可分享或可刷新重建的筛选条件更适合 URL；服务端实体由请求缓存管理；跨页面高频共享并需要选择器时再考虑外部 store。
- 组件在树中的位置和 key 决定局部 state 是否保留，不能用 effect 不断在父子之间复制同一值。判断标准包括所有权、生命周期、共享范围、持久化需求和更新频率，而不是“以后可能会用”就全局化。

**代码 / 场景：**

两个温度输入要保持摄氏与华氏一致，不能各存一份互相 effect 同步；公共父组件只保存最后编辑的单位和值，两个输入都由该源派生。切换页面后不需保留的焦点状态仍留在输入内部。

~~~jsx
function Calculator() {
  const [temperature, setTemperature] = useState('')
  const [scale, setScale] = useState('c')
  const c = scale === 'f' ? toCelsius(temperature) : temperature
  const f = scale === 'c' ? toFahrenheit(temperature) : temperature
  return <>
    <TemperatureInput value={c} onChange={v => { setScale('c'); setTemperature(v) }} />
    <TemperatureInput value={f} onChange={v => { setScale('f'); setTemperature(v) }} />
  </>
}
~~~

**递进追问：**

1. **状态提升得越高越好吗？**

   不是。提升只到所有消费者的最近公共祖先即可；过高会延长生命周期、扩大重渲染范围并让局部组件难以独立复用。

2. **页面刷新后要保留的数据都应进全局 store 吗？**

   不应。可分享筛选优先 URL，认证令牌由安全会话机制管理，服务端数据可重新请求；只有明确的客户端持久状态才考虑持久化 store。

**易错点：**

- 父组件和子组件各保存同一表单值，再靠 effect 双向同步，会出现覆盖用户输入和循环更新。
- 把所有弹窗开关放全局 store，会让无关页面耦合并在返回页面时保留意外的临时状态。

**参考来源：**

- [React：Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)

校验日期：2026-07-20

## Q22：为什么不应把可推导值存进 state？

**短回答：**

源数据变化时容易忘记同步形成双源真相；在渲染中计算，昂贵时再用 memo 优化。

**原理：**

- 如果一个值在 render 时能完全由当前 props 和 state 得到，它就不是独立事实，直接计算能保证每次渲染自洽。把 fullName、过滤结果或商品总价另存 state，通常需要 effect 在源变化后再更新，于是第一次提交展示旧派生值，随后多一次 render；
- 任何遗漏依赖或更新入口都会让两份数据分叉。纯计算很昂贵时可用 useMemo 作为性能缓存，但正确性仍应来自源输入，缓存可丢失也不影响结果。只有当值代表用户独立编辑的草稿、服务器确认快照、动画历史或无法从当前输入重建的过程状态时才应单独存储。
- 设计 state 时应删除冗余、重复和互相矛盾字段，使用稳定 ID 表示选择项，渲染时再从集合查找实体，而不是保存整份可过期对象。

**代码 / 场景：**

firstName 或 lastName 改变时，fullName 在同一次 render 直接得到正确字符串，没有先显示旧姓名再由 effect 补写的闪烁。过滤列表同理，只有实际分析证明计算昂贵时再 memo。

~~~jsx
function Profile({ products, query }) {
  const [firstName, setFirstName] = useState('Ada')
  const [lastName, setLastName] = useState('Lovelace')
  const fullName = firstName + ' ' + lastName
  const visible = useMemo(
    () => products.filter(item => item.name.includes(query)),
    [products, query],
  )
  return <><h1>{fullName}</h1><ProductList items={visible} /></>
}
~~~

**递进追问：**

1. **从 prop 初始化 state 是否也算冗余？**

   若之后必须始终跟随 prop，就是冗余；若产品定义为仅取一次的可编辑草稿，应明确命名 initialValue，并用 key 或命令定义重置语义。

2. **派生值每次计算会不会太慢？**

   先测量。普通字符串和小数组计算通常远小于渲染成本；确定昂贵且依赖稳定时可用 useMemo，但不能因此复制为独立 state。

**易错点：**

- 用 effect 同步 total 会至少多一次提交，并可能在结算按钮点击时读取到尚未同步的旧总价。
- state 同时存 selectedItem 和 selectedId，列表更新后对象可能过期，应只存 ID 再查当前集合。

**参考来源：**

- [React：You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)

校验日期：2026-07-20

## Q23：useReducer 适合什么场景？

**短回答：**

状态转换由多种事件驱动、字段相关或需要可测试的状态机时，reducer 把事件与纯转换集中起来。

**原理：**

- useReducer 适合一个状态包含多个相关字段、更新规则由明确事件驱动，或多个处理器反复执行同一转移逻辑的场景。组件 dispatch 描述“发生了什么”，纯 reducer 根据旧 state 与 action 返回新 state，使转移集中、可单测且能记录重放；
- 它不会自动减少渲染，也不等于全局状态库。简单独立布尔值或文本用 useState 更直接。reducer 必须纯，不能请求、生成不稳定随机值或原地修改旧对象；副作用应在事件、effect 或框架动作层完成。初始化昂贵时传第三个 init 函数。
- 开发 Strict Mode 可能额外调用 reducer 和 initializer 检测纯度，生产只采用一次结果；如果双调用改变结果，问题是 reducer 有副作用。大型状态还应按领域拆分，避免一个万能 reducer 接受含糊 action 和深层克隆。

**代码 / 场景：**

订单编辑用 added、quantityChanged、removed 表达事件；连续 dispatch 会按队列依次应用，每个分支返回新 items。reducer 单测可输入旧订单与 action，直接断言最终数量，不依赖 DOM。

~~~jsx
function cartReducer(state, action) {
  switch (action.type) {
    case 'quantityChanged':
      return { ...state, items: state.items.map(item =>
        item.id === action.id ? { ...item, quantity: action.quantity } : item
      ) }
    case 'removed':
      return { ...state, items: state.items.filter(item => item.id !== action.id) }
    default:
      throw new Error('Unknown action: ' + action.type)
  }
}
function Cart({ initialCart }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart)
  return <CartView cart={cart} dispatch={dispatch} />
}
~~~

**递进追问：**

1. **useReducer 会比多个 useState 性能更好吗？**

   没有自动优势，dispatch 身份稳定但 state 变化仍会渲染组件。选择依据是转移规则的复杂度、可读性和可测试性，性能需另行测量。

2. **异步请求可以直接写在 reducer 里吗？**

   不可以，reducer 可能被重复调用且必须纯。请求放事件、action 层或 effect，完成后再 dispatch success/failure 描述结果。

**易错点：**

- reducer 内对 state.items.push 后返回原对象会破坏快照，React 还可能因引用相同跳过更新。
- 所有页面共享一个巨型 reducer 会让 action 命名冲突、无关变更扩散且难以按领域测试。

**参考来源：**

- [React API：useReducer](https://react.dev/reference/react/useReducer)
- [React：Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)

校验日期：2026-07-20

## Q24：Context 加 reducer 能替代所有状态库吗？

**短回答：**

可覆盖中等规模全局状态，但缺少细粒度订阅、持久化、DevTools 等能力；高频大状态需评估专用 store。

**原理：**

- Context 与 useReducer 能构建清晰的中小型共享状态：reducer 集中转移，Context 把 state 与 dispatch 传给后代，适合更新频率不高、作用域明确的会话或编辑器子树。但 Context 的订阅粒度是整个 value；
- state 对象任一字段改变，所有读取该 Context 的消费者都会重新 render，React.memo 不能阻止 Context 更新。它也没有自动提供选择器、跨切片事务、中间件、开发者时间旅行、持久化、服务端缓存、请求去重或跨标签同步。
- 可通过拆分 StateContext/DispatchContext、按领域拆 Provider、稳定 value 缩小影响；当高频大状态需要按字段订阅、复杂调试和框架外访问时，外部 store 配合 useSyncExternalStore 或成熟库更合适。
- 选择应从共享范围和能力需求出发，而不是把库数量当作架构质量指标。

**代码 / 场景：**

任务编辑器把 tasks 和 dispatch 分成两个 Context。只调用 dispatch 的 AddButton 不会因 tasks 改变而更新；TaskList 会更新。若每行只需自己的任务但整个数组高频变化，仍可能全部 render，此时选择器型 store 更合适。

~~~jsx
const TasksContext = createContext(null)
const DispatchContext = createContext(null)
function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(tasksReducer, [])
  return <TasksContext.Provider value={tasks}>
    <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
  </TasksContext.Provider>
}
function AddButton() {
  const dispatch = useContext(DispatchContext)
  return <button onClick={() => dispatch({ type: 'added', title: '复习' })}>新增</button>
}
~~~

**递进追问：**

1. **把 Provider value 包 useMemo 就能细粒度更新吗？**

   不能。它只避免内容未变时的新对象；只要 value 中任一字段真的变化，所有消费该 Context 的组件仍会收到更新。

2. **什么情况下 Context 加 reducer 已经足够？**

   状态只服务一个有限子树、更新频率低、消费者不多，并且无需持久化、选择器和复杂异步工具时，这套内置方案通常更简单可靠。

**易错点：**

- 把 state、dispatch 和每次新建的 actions 全塞一个 value，会让只发命令的按钮也随数据更新。
- 用客户端 Context 保存服务端列表却自行重做缓存与重试，容易产生重复请求和失效数据。

**参考来源：**

- [React：Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [React API：useContext](https://react.dev/reference/react/useContext)

校验日期：2026-07-20

## Q25：客户端请求为什么要处理竞态？

**短回答：**

参数快速变化时旧请求可能晚返回覆盖新结果；cleanup 中取消或用请求序号只接收当前响应。

**原理：**

- 网络响应不保证按发起顺序返回。用户从 Alice 快速切到 Bob 时，Bob 请求可能先成功，随后较慢的 Alice 响应覆盖 state，页面就显示与当前选择不一致的数据；卸载、重试和搜索输入也有同类问题。
- 每次同步必须把结果与触发它的请求身份绑定：cleanup 中用 AbortController 尽量取消旧 fetch，或用闭包 ignore 标记、递增 requestId，只允许当前请求提交结果。
- 取消并不保证服务端没有执行写操作，因此变更接口还需幂等键、版本号或服务端冲突控制。手写 effect 还要处理 loading/error 清理、缓存、去重、SSR 和瀑布请求，框架 loader 或数据请求库通常能统一这些语义。
- 最终原则不是“最后返回者获胜”，而是“当前用户意图对应的请求才有权写入”。

**代码 / 场景：**

先请求 alice，10ms 后切换 bob；cleanup 把 alice 的 ignore 设为 true。即使 alice 在 bob 之后返回，也不会覆盖 Bob。每次 person 改变先清空结果并显示 loading，最终 UI 与当前 person 一致。

~~~jsx
function Profile({ person }) {
  const [bio, setBio] = useState(null)
  useEffect(() => {
    let ignore = false
    setBio(null)
    fetchBio(person).then(result => {
      if (!ignore) setBio(result)
    })
    return () => { ignore = true }
  }, [person])
  return <p>{bio ?? '加载中…'}</p>
}
~~~

**递进追问：**

1. **使用 AbortController 后还需 ignore 吗？**

   视客户端与异步链而定。fetch 可被取消，但已完成的解析、非 fetch Promise 或服务端处理未必停止；检查当前请求身份仍是稳妥防线。

2. **POST 请求取消后是否等于没有写入？**

   不等于。客户端断开时服务器可能已经提交，因此支付或创建操作要用幂等键和服务端状态查询，不能仅凭 AbortError 判断失败。

**易错点：**

- 只在成功时检查当前请求，却让旧请求的 finally 关闭新请求 loading，会产生状态互相覆盖。
- 搜索框每个字符请求且不取消、不去重，会浪费带宽并让较旧关键字的结果覆盖当前输入。

**参考来源：**

- [React API：useEffect data fetching race conditions](https://react.dev/reference/react/useEffect#fetching-data-with-effects)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

校验日期：2026-07-20

## Q26：服务端状态和客户端状态有什么区别？

**短回答：**

服务端状态有缓存、过期、重试和并发一致性，客户端状态描述本地交互；应避免用普通全局 store 手写完整请求缓存。

**原理：**

- 服务端状态的权威来源在远端，客户端持有的只是带时间性的缓存副本；它具有加载、错误、过期、并发修改、分页、重试、重新验证和权限等语义。客户端状态由当前浏览器会话拥有，如弹窗开关、未提交草稿、当前 tab 和拖拽位置，通常可同步修改且没有远端新鲜度。
- 把二者都放普通全局 store 会迫使团队自行实现缓存键、请求去重、失效、后台刷新和乐观回滚；反过来把临时 UI 状态塞请求缓存也会让交互语义混乱。应以资源身份构造稳定 query key，让服务端数据层管理缓存生命周期，组件局部或客户端 store 管理交互。
- 提交表单后不是直接永久修改缓存，而是按服务端响应替换或使相关查询失效。SSR/路由框架还可在服务端预取并 hydration 缓存。

**代码 / 场景：**

products 是服务器资源，用 queryKey 中的 category 区分缓存并在过期后重新验证；isFilterOpen 是当前页面临时状态，直接 useState。关闭筛选框不应让产品请求失效，后台刷新产品也不应重置弹窗。

~~~jsx
function ProductsPage({ category }) {
  const [isFilterOpen, setFilterOpen] = useState(false)
  const products = useProductsQuery({ category })
  if (products.isPending) return <Spinner />
  if (products.error) return <Retry error={products.error} />
  return <>
    <button onClick={() => setFilterOpen(v => !v)}>筛选</button>
    {isFilterOpen && <Filters />}
    <ProductList items={products.data} stale={products.isStale} />
  </>
}
~~~

**递进追问：**

1. **从接口取回后复制到 Redux 就变客户端状态了吗？**

   不会，权威来源和新鲜度语义没有改变，只是换了缓存容器；仍需处理失效、重复请求、并发写入和服务器版本。

2. **表单编辑服务器实体属于哪一类？**

   已保存实体是服务端状态，尚未提交的输入是客户端草稿。提交成功后用服务器规范化结果更新缓存，取消则丢弃草稿。

**易错点：**

- 把接口结果永久存全局且没有过期策略，返回页面会展示已被其他用户修改的旧数据。
- 每个组件各自 effect 请求同一资源会造成重复网络、不同 loading 状态和互相不一致缓存。

**参考来源：**

- [React：Fetching Data](https://react.dev/learn/synchronizing-with-effects#fetching-data)
- [TanStack Query：Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)

校验日期：2026-07-20

## Q27：乐观更新如何保证失败可恢复？

**短回答：**

提交前保存可回滚快照或逆操作，先更新 UI，服务器失败时回滚并提示；并发更新需使用版本或请求序号。

**原理：**

- 乐观更新在服务器确认前先把预期结果呈现给用户，必须同时保存足够的回滚信息并给每次 mutation 唯一身份。流程通常是：取消或隔离相关后台查询，快照当前缓存；以临时 ID 或补丁写入乐观值；请求成功后用服务器返回的正式 ID、版本和规范化字段替换；
- 失败时只撤销该 mutation 造成的改动，显示可重试错误；结束后重新验证权威数据。多个并发 mutation 不能简单恢复整份旧数组，否则一次失败会抹掉另一次成功，需要按实体/补丁回滚或由 mutation 队列排序。
- React 当前版本提供 useOptimistic 来表达渲染中的暂态乐观结果，但网络提交、错误边界与最终对账仍由应用或框架负责。支付、权限变更等高风险操作不应伪装为已最终成功。

**代码 / 场景：**

新增评论先用 client-7 临时 ID显示“发送中”。服务器成功后替换为真实评论；若失败，仅删除 client-7 并保留同时成功的其他评论。示例用 useOptimistic 表达暂态列表，action 捕获错误并让表单显示失败。

~~~jsx
function Comments({ comments, createComment }) {
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (current, draft) => [...current, { ...draft, pending: true }],
  )
  async function submit(formData) {
    const draft = { id: crypto.randomUUID(), text: formData.get('text') }
    addOptimistic(draft)
    await createComment(draft)
  }
  return <><CommentList items={optimistic} /><form action={submit}><input name="text" /><button>发送</button></form></>
}
~~~

**递进追问：**

1. **为什么不能失败时直接恢复整个旧列表？**

   快照之后可能已有其他 mutation 成功或后台刷新；整表恢复会覆盖这些合法变化。应回滚该操作的补丁，或重新获取服务器权威版本。

2. **临时 ID 有什么要求？**

   必须在当前客户端和并发操作间唯一，并能在服务器响应后可靠映射为正式 ID；用数组索引会在插入和排序时错配状态。

**易错点：**

- 乐观点赞失败后只弹 toast 不恢复计数，会让客户端长期显示服务器并未接受的结果。
- 成功后不采用服务器返回的版本号与规范化值，后续更新可能基于临时数据产生冲突。

**参考来源：**

- [React API：useOptimistic](https://react.dev/reference/react/useOptimistic)
- [TanStack Query：Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

校验日期：2026-07-20

## Q28：表单状态如何避免每次输入重渲染整页？

**短回答：**

把状态下沉到字段或表单边界，使用非受控注册、细粒度订阅和 memo，避免顶层对象每次都产生全树新 props。

**原理：**

- 受控 input 每次输入更新 state 并重新执行拥有该 state 的组件，这是正常模型；问题通常是把几十个字段状态放在页面根部，使昂贵图表和列表也跟随执行。首先把表单及字段状态下沉到最小子树，让兄弟内容保持不变；
- 拆分字段组件并传稳定的原始 props，只有测量后再用 memo。无需逐键联动的简单表单可使用非受控 input，在提交时用 FormData 读取；大型表单库也常通过 ref 和字段级订阅避免整表广播。
- 需要搜索预览时仍保持输入同步，把昂贵结果包装为 deferred value 或 transition，而不是延迟 input 自身。不要通过漏传 value/onChange 破坏控制关系。
- 用 React Profiler 比较交互提交，确认耗时来自哪里，再决定拆分、虚拟化或缓存。

**代码 / 场景：**

SearchInput 自己保存即时 text，键入时只有小组件更新；父页面只在提交时改变 query，昂贵 Results 不随每个字符重渲染。若产品要求即时结果，可把 query 直接上提并让 Results 使用 useDeferredValue。

~~~jsx
function SearchPage() {
  const [query, setQuery] = useState('')
  return <><SearchForm onSearch={setQuery} /><ExpensiveResults query={query} /></>
}
function SearchForm({ onSearch }) {
  const [draft, setDraft] = useState('')
  return <form onSubmit={e => { e.preventDefault(); onSearch(draft) }}>
    <input value={draft} onChange={e => setDraft(e.target.value)} />
    <button>搜索</button>
  </form>
}
~~~

**递进追问：**

1. **非受控表单就一定性能最好吗？**

   不一定。它减少逐键 React 更新，但即时校验和字段联动会更复杂；应按交互需求选择，并用实际字段数量和 Profiler 数据验证。

2. **给整个表单加 React.memo 有用吗？**

   若 state 就在表单内部，内部更新仍会渲染它；memo 只比较父组件传入 props。更有效的是缩小状态所有者和拆分昂贵子树。

**易错点：**

- 把输入 state 放页面根组件会让无关图表、表格和弹窗在每个键击时都重新执行。
- 用 transition 更新受控 input 的 value 会让输入落后，紧急输入状态应同步更新，只延后昂贵派生内容。

**参考来源：**

- [React DOM API：input optimization](https://react.dev/reference/react-dom/components/input#optimizing-re-rendering-on-every-keystroke)
- [React API：Profiler](https://react.dev/reference/react/Profiler)

校验日期：2026-07-20

## Q29：URL 为什么也可以是状态？

**短回答：**

筛选、分页和当前资源若需分享、刷新恢复或前进后退，应编码在 URL；临时输入和敏感信息不适合放 URL。

**原理：**

- URL 的 pathname、search 参数和 hash 能表达可导航、可分享、可刷新恢复的界面状态，例如当前页码、排序、筛选、搜索词或选中的公开标签。
- 把这类值同时存 component state 与 URL 会产生两个权威源，需要 effect 双向同步并容易形成返回键失效、刷新丢失和循环更新。更稳妥的是让路由/URL 成为来源，render 时解析并提供默认值，用户操作通过导航更新参数；
- 浏览器历史自然支持前进后退，SSR 也能按请求 URL 输出相同首屏。敏感信息、巨大对象、频繁瞬时输入和不可序列化状态不应放 URL；参数必须验证、规范化并处理未知值。
- 决定 push 还是 replace：用户可感知的筛选步骤通常 push，逐键搜索或纠正默认值可 replace，避免污染历史。

**代码 / 场景：**

category 与 page 直接从 searchParams 读取；点击下一页只导航到新 URL，不再 setState 复制。用户复制链接或刷新仍看到同一筛选，浏览器后退恢复上一页。解析 page 时需限制为正整数。

~~~jsx
function Catalog() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'all'
  const rawPage = Number(params.get('page') ?? '1')
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  function next() {
    const nextParams = new URLSearchParams(params)
    nextParams.set('page', String(page + 1))
    setParams(nextParams)
  }
  return <><Products category={category} page={page} /><button onClick={next}>下一页</button></>
}
~~~

**递进追问：**

1. **输入框每个字符都应 push 一条历史吗？**

   通常不应。可保留局部草稿，在提交时 push；若需即时写 URL，则用 replace 或节流，避免返回键逐字符倒退。

2. **默认筛选是否必须写进 URL？**

   不一定，但解析必须确定且服务端一致。若需要规范链接可 replace 为标准参数，仍应避免服务端与客户端默认值不同导致 hydration 错误。

**易错点：**

- 用两个 effect 在 URL 与 local state 间互抄，会造成更新循环、瞬时旧值和历史记录异常。
- 未经校验直接信任 page 或 sort 参数，可能产生 NaN、越界请求或将危险值传到后端查询。

**参考来源：**

- [MDN：URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [React Router：useSearchParams](https://reactrouter.com/api/hooks/useSearchParams)

校验日期：2026-07-20

## Q30：状态机比多个 boolean 好在哪里？

**短回答：**

显式枚举合法状态与事件，避免 loading、success、error 等布尔组合出现不可能状态，并便于测试转移路径。

**原理：**

- 多个独立 boolean 会组合出未定义或矛盾状态：isLoading、isSuccess、isError 三个值有八种组合，但业务通常只允许 idle、loading、success、error 四种。
- 状态机用一个互斥 status 加上下文数据表示合法状态，并定义每个事件在哪些状态可发生、转移到哪里，从结构上消除“同时加载且成功”。reducer 可以实现有限状态机；复杂流程还可显式建模守卫、并行状态、超时和进入/退出动作。
- 异步请求应携带 requestId，使过期 RESOLVE 事件在当前状态或身份不匹配时被忽略。状态机不会自动解决副作用，命令执行和结果事件仍需边界；也不必把每个 hover 都过度建模。
- 价值在于可枚举、可画图、可测试每条转移，并能从当前状态推导按钮禁用和文案，而不是维护多个互相同步的标志。

**代码 / 场景：**

登录只保存 status 与 error。SUBMIT 从 idle/error 进入 submitting，RESOLVE 进入 success，REJECT 进入 error；提交中再次 SUBMIT 可明确忽略。UI 不可能同时渲染成功页和错误提示。

~~~jsx
const initial = { status: 'idle', error: null }
function reducer(state, event) {
  switch (state.status) {
    case 'idle':
    case 'error':
      if (event.type === 'SUBMIT') return { status: 'submitting', error: null }
      return state
    case 'submitting':
      if (event.type === 'RESOLVE') return { status: 'success', error: null }
      if (event.type === 'REJECT') return { status: 'error', error: event.error }
      return state
    default:
      return state
  }
}
~~~

**递进追问：**

1. **一个 status 字符串就算完整状态机吗？**

   它已能表达互斥状态，但完整模型还应说明合法事件、转移、守卫和副作用边界；仅换字段名而允许任意赋值仍可能产生非法流程。

2. **何时不值得引入状态机库？**

   只有两三个简单独立状态且转移直观时，useState 或小 reducer 更清晰；当分支、重试、并行步骤和非法组合增多再引入工具。

**易错点：**

- 同时维护 status 与 isLoading 冗余字段，会重新引入不一致，应让布尔值从 status 派生。
- 异步 RESOLVE 不校验请求身份，旧提交仍可能把新一轮 submitting 错误推进 success。

**参考来源：**

- [React：Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [XState：State machines](https://stately.ai/docs/machines)

校验日期：2026-07-20

# 并发、性能与 Fiber

## Q31：Fiber 架构解决什么问题？

**短回答：**

它把渲染工作拆成可暂停和恢复的单元，并为更新赋优先级，使 React 能在提交前调度计算；提交阶段仍保持同步一致。

**原理：**

- Fiber 是 React 协调器的内部工作单元与树节点表示，使一次大更新的 render 工作可以被拆成许多可调度单元，并按优先级暂停、恢复、放弃或重做；高优先级输入不必等待整棵低优先级树计算完。
- React 通常保留已提交的 current 树，并为候选更新构建 work-in-progress 树，只有 render 完整成功后才进入不可中断的 commit，把 DOM 变更、ref 和相关 effect 一次发布，用户不会看到半棵候选树。
- 现代实现用 lanes 表示更新优先级与批次，但 Fiber 字段、遍历和 lane 细节属于版本可变的内部实现，不应成为业务 API 假设。Fiber 本身不等于多线程，也不会让 JavaScript 计算凭空变快；
- 它提供可中断协调的结构，开发者仍需使用 transition、Suspense 等公开能力标记非紧急工作，并保持 render 纯以允许重试。

**代码 / 场景：**

用户正在输入，同时切换包含五千行的筛选结果。输入 state 作为紧急更新立即计算并提交；列表更新放 transition 后，React 可在 Fiber 单元之间让出、丢弃过期候选树并按最新关键字重算。提交前 DOM 仍是完整旧列表，不会出现只更新前一半的画面。

~~~jsx
function Search() {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  function change(event) {
    const next = event.target.value
    setText(next)
    startTransition(() => setQuery(next))
  }
  return <><input value={text} onChange={change} /><LargeResultList query={query} /></>
}
~~~

**递进追问：**

1. **Fiber 是否意味着 React 在 Web Worker 中渲染？**

   不意味着。浏览器 React 通常仍在主线程执行 JavaScript；Fiber 允许调度器在工作单元之间协作让出，但 DOM commit 仍需主线程。

2. **可以在业务代码读取 Fiber 节点和 lanes 吗？**

   不应。它们是无稳定兼容承诺的内部实现，调试可以借 DevTools；业务优先级应通过 transition、Suspense 等公开 API 表达。

**易错点：**

- 把可中断 render 误认为可中断 commit，会错误地假设 DOM 可能长期处于只提交一半的状态。
- render 中修改全局变量会在候选 Fiber 被放弃或重试时重复产生副作用，导致结果不可恢复。

**参考来源：**

- [React：Render and Commit](https://react.dev/learn/render-and-commit)
- [React source：ReactFiberWorkLoop](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)

校验日期：2026-07-20

## Q32：render phase 和 commit phase 有何区别？

**短回答：**

render 计算下一棵树，可被中断或重做；commit 把变更应用到 DOM 并运行布局 effect，不能向用户呈现半成品。

**原理：**

![React render 阶段与 commit 阶段职责和时序图](/content/diagrams/react-core/render-commit-v1.svg "render 负责计算且可被打断，commit 才把变更应用到宿主环境。")

- render phase 是 React 调用组件、展开元素并协调新旧树，计算“下一幅界面应是什么”的纯阶段。它可能因并发调度暂停、重启或因更高优先级更新而放弃，所以组件函数、state initializer、memo 计算不能写 DOM、发请求或修改外部数据。
- 候选树完整后进入 commit phase：React 以一个连续步骤应用必要 DOM 插入/更新/删除，更新 ref，并运行与布局相关的生命周期和 useLayoutEffect；浏览器获得绘制机会后，普通 useEffect 通常再运行。
- 一次 render 不保证一定 commit，而一次 commit 对应已经完成的一致候选结果。React 只修改与上次输出不同的 DOM 节点，不是把整页重建。开发 Strict Mode 会额外调用 render 路径检查纯度，但不会把候选 DOM 重复提交给用户；
- 这些时序边界比死记内部函数名更稳定。

**代码 / 场景：**

点击按钮先把更新加入队列；React 可多次调用 Counter 计算 JSX，但只有成功候选进入 commit 后 span.textContent 才变为 1、ref 才指向新节点。layout effect 在绘制前读到新 DOM，普通 effect 用于提交后的标题同步。

~~~jsx
function Counter() {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  useLayoutEffect(() => {
    console.log('committed width', ref.current.getBoundingClientRect().width)
  }, [count])
  useEffect(() => { document.title = 'Count ' + count }, [count])
  return <button ref={ref} onClick={() => setCount(c => c + 1)}>{count}</button>
}
~~~

**递进追问：**

1. **组件函数执行是否代表页面已经更新？**

   不代表。它只生成候选输出，可能暂停或被丢弃；必须等 commit 完成后真实 DOM、ref 和布局才对应这次结果。

2. **在哪个阶段可以安全测量 DOM？**

   需要阻止错误首帧时在 useLayoutEffect 测量已提交 DOM；非阻塞同步用 useEffect。render 阶段节点可能未创建或仍是旧版本。

**易错点：**

- 在 render 中调用分析上报，会因 Strict Mode、挂起或优先级重试而重复记录并污染数据。
- 把 useEffect 当成 commit 中同步 DOM 测量点，可能在它执行前浏览器已绘制错误位置造成闪烁。

**参考来源：**

- [React：Render and Commit](https://react.dev/learn/render-and-commit)
- [React：Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)

校验日期：2026-07-20

## Q33：startTransition 适合什么更新？

**短回答：**

把非紧急且可中断的更新标为 transition，例如大列表筛选；输入框自身值等紧急反馈仍应同步更新。

**原理：**

- startTransition 把同步执行作用域内调度的 state 更新标记为非阻塞 Transition，适合标签页切换、筛选大列表、路由内容等可以被更紧急输入打断并由旧内容暂时顶住的更新。文本输入 value、拖拽位置等必须立刻响应的状态不能作为 Transition；
- 常见做法是同步更新 input state，再 transition 更新昂贵查询条件。Transition 可被更高优先级更新中断并重启，多次进行中的 Transition 目前也可能被批在一起，因此逻辑必须纯且不能依赖执行次数。
- 独立 startTransition 不提供 pending 标志，需要反馈时使用 useTransition。传入 async 函数时，当前 React 文档仍要求把 await 之后的 setState 再包一次 startTransition 才能保持标记，这是已知限制；
- 请求乱序也要另行控制。它调整渲染优先级，不是延迟计时器，也不会减少网络请求或 CPU 总量。

**代码 / 场景：**

键入时 text 同步更新，输入框每个字符立即可见；query 在 transition 中更新，SlowResults 可以继续显示旧结果，若用户继续键入，过期的后台渲染被打断，只提交最新 query。pending 用于显示低干扰提示。

~~~jsx
function Search() {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  function onChange(event) {
    const value = event.target.value
    setText(value)
    startTransition(() => setQuery(value))
  }
  return <><input value={text} onChange={onChange} /><small>{isPending ? '更新中' : ''}</small><SlowResults query={query} /></>
}
~~~

**递进追问：**

1. **为什么不能用 Transition 控制 input value？**

   受控输入需要每次键击同步反映到 DOM；可中断、滞后的 Transition 会让 value 落后并产生输入卡顿，应只延后依赖它的昂贵区域。

2. **startTransition 会让计算量减少吗？**

   不保证。它允许过期工作被放弃并保护紧急更新，最终最新结果仍需计算；真正昂贵数据量还需算法、分页或虚拟化优化。

**易错点：**

- 在 setTimeout 内调用 setter却只在外层包 startTransition，异步回调不在标记作用域内，不会成为 Transition。
- 把保存订单标为 Transition 就认为已处理竞态，实际上网络写入仍需禁重、幂等与错误反馈。

**参考来源：**

- [React API：startTransition](https://react.dev/reference/react/startTransition)
- [React API：useTransition](https://react.dev/reference/react/useTransition)

校验日期：2026-07-20

## Q34：useDeferredValue 与防抖有何区别？

**短回答：**

deferred 保留旧值并让新渲染低优先级推进，不固定等待时间；防抖按时间减少触发次数，网络请求常仍需显式防抖。

**原理：**

- useDeferredValue 接收当前值，在更新时先用旧 deferred 值完成紧急渲染，再在后台尝试以新值渲染；后台工作可被新输入打断，没有固定毫秒延迟，速度取决于设备与更新优先级。
- 它用于让昂贵子树滞后而保持 input 响应，并可配合 Suspense 避免已显示内容立即退回 fallback。防抖则按墙钟时间等待一段静默期后才调用函数，适合减少搜索请求、保存或日志次数；即使设备空闲也会等待设定时长。
- deferred value 本身不会阻止 effect 或请求随原始值触发，若把请求绑定到每个新值仍会发出；数据层缓存可以让后台渲染复用响应。初次渲染 deferred 与原值相同，更新时 Object.is 相同则不产生后台工作。
- 选择标准是要降低调用频率还是要调度渲染优先级，两者也可组合。

**代码 / 场景：**

input 由 query 直接控制，始终同步；SlowList 接收 deferredQuery，输入快速变化时列表暂时显示旧词结果并降低透明度，后台只提交能完成的最新渲染。若还要避免每个词都请求，应另对请求参数防抖。

~~~jsx
function SearchPage() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const stale = query !== deferredQuery
  return <>
    <input value={query} onChange={e => setQuery(e.target.value)} />
    <div style={{ opacity: stale ? 0.6 : 1 }}>
      <SlowList query={deferredQuery} />
    </div>
  </>
}
~~~

**递进追问：**

1. **useDeferredValue 能减少 API 请求数量吗？**

   不会自动减少。若请求 effect 监听原始值仍每次发送；监听 deferred 值也没有固定静默保证。控制网络频率应使用防抖、取消与缓存。

2. **它与 startTransition 如何选择？**

   能控制 setter 时用 transition 标记更新；只能拿到上游值时用 deferred value 得到滞后副本。两者都不应用于受控 input 的 value。

**易错点：**

- 把 deferredQuery 当作固定 300ms 防抖，会在快设备或不同负载下得到完全不同的触发节奏。
- 昂贵组件未 memo 且因其他 props 更新，传 deferred 值也可能照常重渲染，需测量实际边界。

**参考来源：**

- [React API：useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- [React：Suspense deferred values](https://react.dev/reference/react/Suspense#showing-stale-content-while-fresh-content-is-loading)

校验日期：2026-07-20

## Q35：React.memo 为什么可能无效？

**短回答：**

默认浅比较 props；父组件每次创建新对象、数组或函数会破坏引用相等，且比较成本可能高于重新渲染。

**原理：**

- React.memo 可能看起来“无效”，通常是因为父组件每次都新建对象、数组、函数或 JSX children，引用已经变了；或者子组件自己的 state、读取的 Context 发生变化，这些更新本来就不受 props 比较拦截。
- memo 只在父组件重新渲染且新旧 props 按 Object.is 比较相等时，允许 React 跳过该子组件的重新执行；它是性能优化而非语义保证。自定义 arePropsEqual 若漏比函数，会让函数闭包长期读取旧 state；深比较还可能比渲染更慢。
- memo 对本来廉价的组件收益很小，并增加依赖稳定化成本。应先用 Profiler 确认组件频繁、相同输入且渲染昂贵，再缩小 props、把 state 下沉或用 useMemo/useCallback 稳定必要引用。
- 启用 React Compiler 的项目可自动覆盖许多记忆化场景，但仍不能修复可变 props、过宽 Context 或副作用 render。

**代码 / 场景：**

List 已 memo，但 visible 每次 filter 都是新数组，所以 theme 改变时仍渲染。useMemo 让 todos 与 tab 未变时复用数组，List 才能跳过；若 List 自己的选中 state 更新，它仍正常渲染。

~~~jsx
const List = memo(function List({ items }) {
  return items.map(item => <div key={item.id}>{item.text}</div>)
})
function TodoPage({ todos, tab, theme }) {
  const visible = useMemo(() => todos.filter(t => t.tab === tab), [todos, tab])
  return <main className={theme}><List items={visible} /></main>
}
~~~

**递进追问：**

1. **自定义比较函数只比数据不比回调可以吗？**

   通常不可以。回调闭包也是行为输入；返回 true 会让组件保留旧函数并读取旧 props/state，必须逐项比较包括函数在内的全部 props。

2. **memo 能阻止 Context 导致的更新吗？**

   不能。组件读取的 Context value 改变会直接触发它；可拆出外层读取 Context，再把较小的稳定 props 传给 memo 子组件。

**易错点：**

- 父组件传 style={{ color }} 或匿名回调，使 memo 每次都看到新引用并失去跳过机会。
- 盲写深度 arePropsEqual 可能冻结页面数秒，而且数据结构新增字段时容易漏比较造成旧 UI。

**参考来源：**

- [React API：memo](https://react.dev/reference/react/memo)
- [React API：useMemo with memo](https://react.dev/reference/react/useMemo#skipping-re-rendering-of-components)

校验日期：2026-07-20

## Q36：如何用 Profiler 定位 React 性能问题？

**短回答：**

记录交互，查看提交耗时和哪些组件重复渲染，再检查状态位置、props 身份和昂贵计算，用修复前后数据验证。

**原理：**

- 先在可复现的真实交互上录制 React DevTools Profiler，而不是凭肉眼给组件加 memo。
- 以 commit 为单位查看耗时峰值、火焰图和 ranked 视图，定位哪些组件渲染最久、哪些被频繁调用，并打开“为什么渲染”相关设置核对是 props、state、Context 还是父级造成。
- Profiler API 的 onRender 提供 phase、actualDuration、baseDuration、startTime 与 commitTime：actualDuration 是本次提交该子树实际渲染时间，baseDuration 估计无记忆化时整棵子树成本，可比较优化前后。
- 开发模式额外检查会扭曲绝对值，最终应在接近生产的 profiling 构建和目标设备验证，同时结合浏览器 Performance 面板区分 React render、DOM 布局、脚本和网络。一次快 commit 重复上百次也可能是主因，不能只盯最慢组件。

**代码 / 场景：**

录制在搜索框键入“react”的过程，发现每次键击 ProductTable 都提交且占 28ms，原因是筛选 state 位于页面根部。把输入草稿下沉后再次录制，表格只在提交搜索时渲染；actualDuration 从每键 28ms 降为输入子树 1ms。

~~~jsx
<Profiler id="ProductTable" onRender={(id, phase, actualDuration, baseDuration) => {
  performance.measure(id + ':' + phase, {
    start: performance.now() - actualDuration,
    end: performance.now(),
    detail: { actualDuration, baseDuration },
  })
}}>
  <ProductTable rows={rows} />
</Profiler>
~~~

**递进追问：**

1. **actualDuration 下降就证明用户体验变好吗？**

   不一定。还要观察交互延迟、提交频率、布局与绘制；优化可能把成本移到自定义比较或网络，需用浏览器时间线和真实设备共同验证。

2. **为什么开发环境录制会看到额外渲染？**

   Strict Mode 会额外执行部分 render/effect 检查，开发工具本身也有开销；它适合找相对热点，发布结论需用 profiling 生产构建复测。

**易错点：**

- 只看一次最慢 commit 就优化冷启动，可能忽略输入期间连续几十次中等耗时提交。
- 未保存优化前录制与同一操作基线，改完后只能凭感觉判断，无法确认回归或收益。

**参考来源：**

- [React API：Profiler](https://react.dev/reference/react/Profiler)
- [React DevTools：Profiler](https://react.dev/learn/react-developer-tools)

校验日期：2026-07-20

## Q37：大型列表如何优化？

**短回答：**

使用稳定 key、窗口化、分页或增量加载，把行组件隔离，并避免每行订阅整个全局状态。

**原理：**

- 大型列表的主要成本常是创建成千上万 React 元素、DOM 节点、布局与绘制，而不仅是 diff。第一优先是限制工作量：分页或虚拟化只挂载可视窗口及少量 overscan，滚动时复用位置；可变高度需可靠测量并维护滚动锚点。
- 每行使用业务稳定 ID 作为 key，避免索引在插入排序后错配输入和状态。再用 Profiler 判断是否需要 memo 行组件、稳定回调和结构共享，使修改一行不重渲染全部；把悬停或编辑 state 下沉到行或专门 store。
- 昂贵筛选可 transition/deferred，但仍应减少算法与数据量。注意虚拟列表的无障碍计数、键盘导航、焦点行被卸载、SSR 初始窗口和动态高度，不要只追求 DOM 数。
- CSS content-visibility 可减少部分渲染成本，却不会减少 React 创建元素的计算。

**代码 / 场景：**

一万条记录只渲染滚动窗口约 30 行，容器用总高度占位，每行按 index 计算 translateY；itemKey 使用 rows[index].id。编辑 id=42 时结构共享只替换该对象，memo Row 的其他行 props 不变而跳过。

~~~jsx
const Row = memo(function Row({ item, style, onOpen }) {
  return <button style={style} onClick={() => onOpen(item.id)}>{item.name}</button>
})
function Results({ rows, onOpen }) {
  return <FixedSizeList
    height={600}
    width="100%"
    itemCount={rows.length}
    itemSize={44}
    itemKey={index => rows[index].id}
    itemData={{ rows, onOpen }}
  >{VirtualRow}</FixedSizeList>
}
~~~

**递进追问：**

1. **虚拟化一定比普通列表快吗？**

   小列表不一定，虚拟化引入测量、滚动和无障碍复杂度。应在目标设备测量 DOM 数、首屏和滚动帧率，再设启用阈值。

2. **列表行用 index key 在只追加场景可以吗？**

   数据永不插入、删除、排序且行无独立状态时风险较低，但业务约束常会变化；有稳定实体 ID 时仍应优先使用它。

**易错点：**

- 虚拟列表用索引 key，筛选或排序后会把行内输入值和焦点复用到错误实体。
- itemData 每次 render 新建对象会让全部可见 memo 行收到新引用，抵消行级跳过优化。

**参考来源：**

- [React：Rendering Lists](https://react.dev/learn/rendering-lists)
- [web.dev：Virtualize long lists](https://web.dev/articles/virtualize-long-lists-react-window)

校验日期：2026-07-20

## Q38：Suspense 是否等于通用数据请求方案？

**短回答：**

Suspense 协调“等待中的渲染”与 fallback，数据源仍需框架或支持缓存与抛出 promise 的集成，不能直接包任意 useEffect 请求。

**原理：**

- Suspense 是协调“某个子树尚不能渲染”时 fallback、揭示顺序、Transition 与流式 SSR 的边界，不是自动的数据请求、缓存或错误处理器。官方支持的挂起来源包括框架集成的数据源、React.lazy 代码加载，以及读取缓存 Promise 的 use；
- 在普通 useEffect 中 fetch 后 setState 不会触发 Suspense。手工在 render 每次抛新 Promise 会无限挂起，因为渲染重试时资源身份不稳定；生产应使用支持 Suspense 的框架或缓存层。
- Promise pending 由最近 Suspense 处理，reject 的错误由 Error Boundary 处理。已显示内容因更新再次挂起时，普通紧急更新可能显示 fallback；
- 用 transition 或 deferred value 可保留旧内容并提示 stale。具体数据 API 随 React/框架版本演进，面试应分清稳定边界语义与框架请求实现。

**代码 / 场景：**

SettingsPanel 用 lazy 在首次需要时加载模块，模块 Promise pending 时最近边界显示骨架，加载成功后 React 重试并提交面板；模块加载 reject 时由外层 ErrorBoundary 显示重试。普通 effect 请求不会自动进入该 fallback。

~~~jsx
const SettingsPanel = lazy(() => import('./SettingsPanel.js'))
function SettingsRoute() {
  return <ErrorBoundary fallback={<p>模块加载失败</p>}>
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPanel />
    </Suspense>
  </ErrorBoundary>
}
~~~

**递进追问：**

1. **为什么 effect fetch 的 loading 不会触发 Suspense？**

   effect 在组件已经提交后才运行，React render 并未读取到挂起资源；需要框架资源、lazy 或支持 use 的缓存 Promise 在渲染时声明等待。

2. **Suspense 能显示请求错误吗？**

   Suspense 只处理 pending；Promise reject 或渲染异常需要 Error Boundary。实际界面通常把两种边界组合，并提供重试与缓存重置。

**易错点：**

- 在组件 render 内直接 fetch 并抛出每次新建的 Promise，会在重试时反复请求且永远无法稳定完成。
- 用一个覆盖整页的 Suspense 边界会让小模块加载时整页闪回骨架，应按可独立揭示区域规划边界。

**参考来源：**

- [React API：Suspense](https://react.dev/reference/react/Suspense)
- [React API：use](https://react.dev/reference/react/use)

校验日期：2026-07-20

## Q39：错误边界能捕获哪些错误？

**短回答：**

它捕获子树渲染、生命周期和构造错误，不捕获事件处理器、异步回调、服务端渲染或边界自身错误。

**原理：**

- Error Boundary 捕获其后代在渲染、构造以及 React 调用的生命周期中抛出的错误，改为渲染降级 UI，并可在 componentDidCatch 获取 error 与 componentStack 上报。
- 边界不能捕获它自身抛出的错误，也不会自动捕获普通事件处理器、setTimeout、原生 Promise 回调或服务端渲染中的异常；这些路径应显式 try/catch、把错误写入状态或交给框架/全局监控。
- Suspense 使用的 pending Promise 不是错误，拒绝后才走错误边界。当前 React 内置边界仍以 class 的 getDerivedStateFromError/componentDidCatch 实现，函数组件可使用成熟封装库。
- 边界粒度应围绕可独立恢复区域：过粗会让一个头像错误白掉整页，过细则重复 UI 与日志。恢复通常需要重置失败资源/状态并改变 boundary key，不能只把 hasError 改回 false 后立即重触发同一错误。

**代码 / 场景：**

ProfileCard render 访问损坏数据时抛错，最近的 ProfileBoundary 提交 fallback 并上报 componentStack，页面导航仍可用。按钮 onClick 内的请求 reject 不会被它自动捕获，事件逻辑必须 catch 后显示错误。

~~~jsx
class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { reportError(error, { componentStack: info.componentStack }) }
  render() {
    if (this.state.error) return <button onClick={this.props.onReset}>重试</button>
    return this.props.children
  }
}
function Page() {
  return <ErrorBoundary onReset={() => location.reload()}><ProfileCard /></ErrorBoundary>
}
~~~

**递进追问：**

1. **事件处理器错误为什么不由边界捕获？**

   事件发生在 React 已完成渲染之后，不会破坏当前树的生成；应在事件或异步 action 中捕获并显示失败，同时向监控上报。

2. **错误边界放在根节点一个就够吗？**

   根边界可防整页白屏，但无法局部恢复。通常在路由、关键面板或第三方组件周围再设边界，让未失败区域继续工作。

**易错点：**

- 只记录 error.message 不记录 componentStack、路由和发布版本，会很难定位是哪棵组件子树触发。
- 重试按钮只清 hasError 而未清理坏缓存或改变 key，会立即再次渲染同一异常并循环。

**参考来源：**

- [React Component API：Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React：lazy rejection and Error Boundaries](https://react.dev/reference/react/lazy)

校验日期：2026-07-20

## Q40：Strict Mode 为什么会让 effect 开发环境执行两次？

**短回答：**

开发模式用额外 setup-cleanup 周期检查副作用是否可重入且清理完整，生产环境不会做这次诊断执行。

**原理：**

- 因为 React 想在开发阶段提前暴露“副作用不能重进”或“cleanup 没有清干净”的问题，所以 StrictMode 会为纳入检查的首次挂载额外执行一次 effect setup→cleanup，再执行真实 setup，用它模拟用户离开后返回；生产构建没有这次压力测试。
- 它还可能额外调用组件 render、某些 initializer/reducer 和 ref callback，目标都是发现不纯或缺少清理，而不是生产会渲染两份 UI。正确 effect 必须让 cleanup 完全撤销 setup，使连接数量在测试后仍为一。
- 不要用 ref 标志跳过第二次 setup，因为第一次资源已被 cleanup，标志会让真实资源缺失，也掩盖导航重挂载问题。现代 React 文档还指出：若 StrictMode 不是根级而只包部分树，初始 effect 不执行父子生产中不可能出现的额外组合；
- 行为需按所用 React 版本和边界位置验证。

**代码 / 场景：**

缺少 cleanup 时开发首次挂载连接两次；补上 disconnect 后日志是 connect、disconnect、connect，最终只有一个活动连接。生产首次挂载只有一次 connect，但真实路由卸载再进入仍会验证 cleanup。

~~~jsx
function Chat({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])
  return <h1>房间 {roomId}</h1>
}
root.render(<StrictMode><Chat roomId="general" /></StrictMode>)
~~~

**递进追问：**

1. **可以为了避免双请求关闭 StrictMode 吗？**

   不应先关闭检查。读取请求应能取消、缓存或去重，写请求应由用户事件和幂等协议触发；开发双执行通常揭示真实重挂载缺陷。

2. **为什么 render 也可能打印两次？**

   Strict Mode 额外调用应保持纯的函数以发现修改 props、全局累加等副作用；只采用一次有效提交，生产不会做这项开发检查。

**易错点：**

- 用 didRun ref 阻止第二次 effect，会在首次 cleanup 后不再连接，并让真实返回页面场景继续出错。
- 把支付或创建订单写在挂载 effect 中会被重试语义放大，业务写操作应绑定明确用户动作并具备幂等性。

**参考来源：**

- [React API：StrictMode](https://react.dev/reference/react/StrictMode)
- [React：Synchronizing with Effects—development double run](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development)

校验日期：2026-07-20

# 工程测试与安全

## Q41：React 测试为什么更关注用户行为？

**短回答：**

通过角色、文本和交互断言可观察结果，比断言内部 state 或实例方法更抗重构，也更接近可访问性使用方式。

**原理：**

- React 组件的可观察契约是用户能看到的内容、可访问语义和交互结果，而不是内部 state 名称、Hook 数量或某个子组件实例。测试按角色与可访问名称查找按钮，模拟真实点击/输入，再断言页面变化，可以在 class 改成 Hook、拆分组件或重命名内部函数后继续提供信心；
- 直接读取 state、浅渲染或断言实现调用次数会让安全重构也大面积失败。Testing Library 的查询优先级鼓励 getByRole 等接近辅助技术的路径，同时暴露缺少 label/role 的可访问性问题。
- 交互会触发更新，测试工具应通过 user-event 或 React act 等待更新稳定；异步界面要等待用户可见结果，而不是固定 sleep。仍可对纯 reducer 和格式化函数做实现级单元测试，但组件层优先验证行为。不能把 snapshot 当作行为断言的替代品。

**代码 / 场景：**

登录表单测试不读取 isSubmitting，也不寻找 LoginForm 内部实例；它按标签填写账号、按角色点击“登录”，等待欢迎语出现。把实现从两个 useState 改成 useReducer 后，用户契约不变，测试无需修改。

~~~jsx
test('有效账号登录后显示用户名称', async () => {
  const user = userEvent.setup()
  render(<LoginPage api={fakeApi} />)
  await user.type(screen.getByLabelText('账号'), 'linda')
  await user.type(screen.getByLabelText('密码'), 'linda')
  await user.click(screen.getByRole('button', { name: '登录' }))
  expect(await screen.findByRole('heading', { name: '欢迎 Linda' })).toBeVisible()
})
~~~

**递进追问：**

1. **是否完全不能测试组件内部函数？**

   不是绝对禁止，但若它是纯业务算法，最好抽成独立模块单测；组件私有细节通常由公开交互覆盖，减少与实现耦合。

2. **为什么优先 getByRole 而不是 data-testid？**

   role 与 accessible name 接近用户和辅助技术的发现方式，还能促使语义正确；只有没有合适语义的元素再用 test id。

**易错点：**

- 断言按钮内部 CSS 类名或 Hook 调用次数，会让纯样式与重构改动无意义地破坏测试。
- 用 fireEvent.change 后立即断言异步结果，可能绕过真实输入序列且产生未等待更新的偶发失败。

**参考来源：**

- [Testing Library：Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [React API：act](https://react.dev/reference/react/act)

校验日期：2026-07-20

## Q42：单元、集成和 E2E 测试如何分工？

**短回答：**

纯函数与边界逻辑做单元测试，组件和 API 协作用集成测试，少量关键业务链路用 E2E 覆盖真实浏览器。

**原理：**

- 三层测试覆盖不同风险。单元测试对纯 reducer、验证器、金额算法输入输出，运行快且精确覆盖边界；
- 集成测试在 jsdom 或真实浏览器组件环境中渲染一段 React 子树，连同 Context、路由和请求 mock 验证表单提交、loading/error、权限与状态协作，是前端主要覆盖层；
- E2E 在真实部署栈中操作浏览器，验证登录、支付或面试作答等少量关键旅程，能发现路由、Cookie、后端、构建和浏览器集成问题，但更慢且定位成本高。不要在每层重复所有组合：算法边界留单元，组件协作留集成，只有跨系统关键路径进入 E2E。
- 请求 mock 应在网络边界而非 mock 每个 Hook；E2E 数据要隔离并可重置。CI 可让快速层每次提交执行，关键 E2E 并行运行，并保留 trace、截图和日志定位偶发失败。

**代码 / 场景：**

优惠金额的舍入规则用表驱动单测；CheckoutPage 集成测试用测试服务器模拟库存 409，断言错误和重试按钮；E2E 只保留“注册→下单→订单页可见”旅程，真实验证 Cookie、API 与路由。

~~~js
it('库存冲突后保留购物车并允许重试', async () => {
  server.use(http.post('/api/orders', () => HttpResponse.json({}, { status: 409 })))
  render(<TestApp initialEntry="/checkout" />)
  await userEvent.click(screen.getByRole('button', { name: '提交订单' }))
  expect(await screen.findByText('库存已变化')).toBeVisible()
  expect(screen.getByRole('list', { name: '购物车' })).toBeVisible()
})
~~~

**递进追问：**

1. **组件集成测试是否要 mock 所有子组件？**

   通常不要。过度 mock 只验证接线且遗漏真实协作；保留本地组件，mock 网络、时间、支付 SDK 等昂贵或非确定的系统边界。

2. **哪些流程值得做 E2E？**

   收入、安全、核心留存和跨系统高风险旅程优先，如登录、权限、支付、保存与恢复；纯显示排列组合留在更快层。

**易错点：**

- 所有逻辑只靠 E2E 覆盖会导致反馈慢、数据互相污染且失败难定位到具体规则。
- 集成测试 mock useAuth、useQuery 和路由所有内部 Hook，最终无法发现 Provider 与缓存配置错误。

**参考来源：**

- [Testing Library：React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright：Best Practices](https://playwright.dev/docs/best-practices)

校验日期：2026-07-20

## Q43：SSR hydration mismatch 如何排查？

**短回答：**

比较服务端与客户端首屏输入，排查随机数、时间、浏览器 API、无效 HTML 和数据版本差异，保证首次输出确定。

**原理：**

- hydrateRoot 要求客户端第一次 render 与服务端 HTML 产生相同内容，React 才能在保留 DOM 的同时绑定事件。
- 常见不一致来自 render 中 Date.now、Math.random、时区/locale，不同端数据版本，typeof window 条件分支，无效 HTML 嵌套被浏览器纠正，CSS-in-JS 顺序或扩展修改 DOM。
- 排查先保存原始服务器响应，再与关闭 JavaScript后的 DOM、hydration 首次 props 和控制台 component stack 对比；
- 确保服务端数据序列化给客户端，随机 ID 用 useId 或服务端种子，客户端专属内容先渲染稳定占位再在 effect 更新。suppressHydrationWarning 只是一层深的逃生口，不会修复结构差异，不应全局覆盖。
- 当前 hydrateRoot 可通过 onRecoverableError 收集可恢复错误；生产 React 可能为正确性重新生成受影响树，但这有性能与状态丢失风险，不能依赖自动修复。

**代码 / 场景：**

服务器在 UTC 输出 08:00，客户端按上海时区直接输出 16:00 会 mismatch。先让两端都渲染 ISO 文本，hydration 后 effect 再格式化为本地时间；首个客户端结果与 HTML 一致，随后是正常更新。

~~~jsx
function LocalTime({ iso }) {
  const [label, setLabel] = useState(iso)
  useEffect(() => {
    setLabel(new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(iso)))
  }, [iso])
  return <time dateTime={iso}>{label}</time>
}
hydrateRoot(document.getElementById('root'), <App bootstrap={window.__BOOTSTRAP__} />, {
  onRecoverableError: error => reportHydration(error),
})
~~~

**递进追问：**

1. **用 suppressHydrationWarning 是否就解决了问题？**

   没有。它只抑制特定一层不可避免的文本/属性警告，React 不保证修补差异；结构、事件和状态不一致仍需让初始输出确定。

2. **useId 为什么比 Math.random 适合 SSR ID？**

   useId 按 React 树生成可在服务端与客户端协调的标识，适合 aria 关联；随机值两端不同，会导致属性 mismatch。

**易错点：**

- render 中用 typeof window 切换完全不同的节点树，会让首个客户端输出与服务器 HTML 不同。
- 服务端请求数据后客户端 hydration 又立即取另一版本，却没传 bootstrap 快照，会产生内容与列表 key 差异。

**参考来源：**

- [React DOM API：hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
- [React API：useId](https://react.dev/reference/react/useId)

校验日期：2026-07-20

## Q44：React 中如何防 XSS？

**短回答：**

普通 JSX 文本默认转义，dangerouslySetInnerHTML 绕过保护；富文本必须在可信边界前消毒并配合 CSP。

**原理：**

- React 默认把 JSX 中的字符串子节点和大多数属性值编码为文本，因此把用户名放入 <p>{name}</p> 不会当 HTML 执行；但这不是全局安全保证。
- dangerouslySetInnerHTML 会绕过转义，只有经过可信、上下文正确的 HTML sanitizer 处理的内容才能使用，并应尽量在单一封装组件中审计。
- href/src 等 URL 要限定允许协议与来源，不能把 javascript:、不受控 data URL 或用户输入直接交给导航；第三方 DOM 插件、服务端模板、富文本粘贴也可能绕过 React。避免 eval、字符串构造脚本和把秘密写进前端。
- 服务端仍要做输入验证和输出上下文编码，并用 CSP、Trusted Types 等作为纵深防御；它们不能替代净化。不要自己用正则删除 script 标签，因为事件属性、SVG、编码和命名空间有大量绕过方式。

**代码 / 场景：**

评论 API 返回允许少量格式的 HTML，先由维护良好的 sanitizer 按白名单清洗，再交给唯一的 SafeHtml 组件；普通昵称继续作为文本渲染。外链先用 URL 解析，只允许 https/http。

~~~jsx
import DOMPurify from 'dompurify'
function SafeHtml({ html }) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
function SafeLink({ href, children }) {
  const url = new URL(href, location.origin)
  if (!['https:', 'http:'].includes(url.protocol)) return <span>{children}</span>
  return <a href={url.href} rel="noreferrer">{children}</a>
}
~~~

**递进追问：**

1. **后端已经过滤，前端还需要注意吗？**

   需要明确后端过滤的输出上下文和策略版本；存储内容可能进入 HTML、URL、CSS 等不同位置，前端危险 sink 仍应集中封装并做纵深校验。

2. **CSP 能代替 HTML sanitizer 吗？**

   不能。CSP 可限制部分脚本执行和上报违规，但配置可能有缺口，恶意 HTML 仍可钓鱼或改页面；源内容仍需按白名单净化。

**易错点：**

- 用正则删除 script 标签会漏掉 onerror、SVG、编码变体等大量 XSS 向量。
- 把用户提供的 URL 直接放 href，即使文本被 React 转义，也可能允许危险协议或开放重定向。

**参考来源：**

- [React DOM：dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [OWASP：Cross Site Scripting Prevention](https://owasp.org/www-community/attacks/xss/)
- [DOMPurify project](https://github.com/cure53/DOMPurify)

校验日期：2026-07-20

## Q45：代码分割应该以什么边界实施？

**短回答：**

优先路由和低频重功能，用 lazy 与 Suspense 提供加载状态；过度碎片会增加请求与瀑布，需结合打包分析。

**原理：**

- 代码分割应围绕用户不会在首屏同时需要、且能够独立显示加载与失败状态的边界：路由页面、管理员后台、富文本编辑器、图表或打开后才出现的设置面板通常合适。
- React.lazy 缓存动态 import 的 Promise 与已解析模块，最近 Suspense 提供加载占位，Error Boundary 处理 chunk 加载失败。切得过细会增加网络往返、请求优先级竞争和多个 fallback 闪烁；切得过粗则首包包含大而低频功能。
- 结合 bundle 分析器看体积与重复依赖，按导航/悬停意图预加载高概率下一块，并让框架处理 SSR、流式和资源提示。模块必须提供 default 导出或用薄适配层。
- 边界还要与产品揭示顺序一致：同一骨架内必须一起出现的内容宜同块或同 SuspenseList/框架策略，而不是机械按组件文件拆分。

**代码 / 场景：**

题库页首屏不下载 400KB Markdown 编辑器；用户点击“编辑”后才加载，面板区域显示固定尺寸骨架，失败由局部边界重试，导航栏不受影响。可在按钮 focus/hover 时提前触发同一 import 降低等待。

~~~jsx
const loadEditor = () => import('./MarkdownEditor.js')
const MarkdownEditor = lazy(loadEditor)
function QuestionPage({ editing }) {
  return <ArticleLayout>
    <QuestionPreview />
    {editing && <EditorErrorBoundary>
      <Suspense fallback={<EditorSkeleton />}><MarkdownEditor /></Suspense>
    </EditorErrorBoundary>}
    <button onMouseEnter={loadEditor} onFocus={loadEditor}>编辑</button>
  </ArticleLayout>
}
~~~

**递进追问：**

1. **每个组件都 lazy 是否能让首包最小？**

   可能变小却更慢：大量小 chunk 带来请求和解析调度开销，并产生层层 fallback。应按用户任务与体积数据确定粗粒度边界。

2. **lazy chunk 加载失败如何恢复？**

   用 Error Boundary 展示重试，并考虑部署后旧 HTML 指向已删除 hash 的情况；保留旧资源、刷新版本或让加载器重新 import。

**易错点：**

- 路由切换时整页只有一个全局 fallback，会把导航和已加载内容一起隐藏，造成强烈闪烁。
- 多个 chunk 各打包一份大型依赖说明分包配置不当，首屏减少但总下载和缓存成本反而增加。

**参考来源：**

- [React API：lazy](https://react.dev/reference/react/lazy)
- [React API：Suspense](https://react.dev/reference/react/Suspense)

校验日期：2026-07-20

## Q46：如何设计可访问的复合组件？

**短回答：**

先使用语义元素，再实现键盘导航、焦点管理和 ARIA 状态；弹窗打开聚焦、关闭还原焦点并限制背景交互。

**原理：**

- 复合组件如 Tabs、Listbox、Menu 不是给多个 div 加 click 即可，需要把语义、焦点和键盘交互作为同一状态机设计。
- 以 Tabs 为例：容器 role=tablist，每个触发器 role=tab、aria-selected，并通过 aria-controls 关联 role=tabpanel；
- 通常只有当前或最近聚焦 tab 的 tabIndex=0，其余为 -1，方向键移动焦点，Home/End 跳首尾，Enter/Space 是否激活按自动或手动模式确定。使用 useId 生成 SSR 稳定关联 ID，ref 管理聚焦，禁用项要跳过；
- DOM 顺序、视觉顺序和读屏顺序应一致。API 可用组合/Context 共享选中值，支持受控与非受控，但消费者自定义样式不能移除可见焦点。实现应参照 WAI-ARIA APG 并用键盘、读屏器和自动化工具验证，因为 ARIA 只声明语义，不会自动实现行为。

**代码 / 场景：**

右箭头从第二个 tab 移到第三个并聚焦，激活后 aria-selected 与 tabpanel 同步；隐藏面板不进入 tab 顺序。简化代码展示关联字段，完整实现还需方向键、禁用项和焦点管理测试。

~~~jsx
function Tab({ id, panelId, selected, onSelect, children }) {
  return <button
    id={id}
    role="tab"
    aria-selected={selected}
    aria-controls={panelId}
    tabIndex={selected ? 0 : -1}
    onClick={onSelect}
  >{children}</button>
}
function Panel({ id, tabId, active, children }) {
  return <section id={id} role="tabpanel" aria-labelledby={tabId} hidden={!active}>{children}</section>
}
~~~

**递进追问：**

1. **为什么所有 tab 都设 tabIndex=0 不合适？**

   复合控件通常应在页面 Tab 顺序中只占一个停靠点，再用方向键内部导航；全部为零会让键盘用户逐项 Tab，效率很低。

2. **加上 role 就会自动支持键盘吗？**

   不会。ARIA 只改变辅助技术语义，焦点移动、按键、选中状态和禁用逻辑都必须由组件实现并保持同步。

**易错点：**

- 用 div role=button 却没有 Enter/Space 和焦点支持，鼠标可用但键盘用户无法操作。
- 切换 tab 只改视觉类名却不更新 aria-selected 与关联 panel，会向读屏器报告错误状态。

**参考来源：**

- [WAI-ARIA APG：Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [React API：useId](https://react.dev/reference/react/useId)

校验日期：2026-07-20

## Q47：React 组件库如何避免样式和状态耦合？

**短回答：**

把无样式行为、设计 token 与视觉组件分层，受控/非受控 API 一致，并为组合、主题和可访问性写契约测试。

**原理：**

- 组件库应把行为状态、可访问语义和视觉主题分成稳定契约。无样式/轻样式 primitive 管理 open、selected、disabled、焦点和键盘；
- 通过受控 value/open 与 defaultValue/defaultOpen 同时支持外部编排和局部默认，生命周期中不切换模式。
- 样式层读取公开的 data-state、data-disabled、slot 或 className，而不是依赖内部 DOM 层级、私有类名和 Hook；设计 token 用 CSS 自定义属性表达颜色、间距与层级，使主题替换不改状态逻辑。
- 组合组件/slot 允许消费者替换触发器，但库仍保证 ref、事件与 aria 属性正确合并。不要把状态编码进颜色名称，或让 CSS 动画回调成为唯一业务转移来源。版本升级要保持公开 DOM/属性契约或明确 breaking change，并用交互、键盘与视觉回归共同测试。

**代码 / 场景：**

AccordionItem 的逻辑只公开 data-state="open/closed" 与 aria-expanded；默认主题、品牌主题都按同一属性选择样式。受控页面传 open/onOpenChange，普通页面用 defaultOpen，二者共享同一焦点与键盘实现。

~~~jsx
function AccordionItem({ open, onOpenChange, title, children }) {
  const panelId = useId()
  return <div data-state={open ? 'open' : 'closed'}>
    <button aria-expanded={open} aria-controls={panelId} onClick={() => onOpenChange(!open)}>
      {title}
    </button>
    <div id={panelId} hidden={!open}>{children}</div>
  </div>
}
// 主题只依赖公开状态：.accordion[data-state="open"] { --chevron-angle: 90deg; }
~~~

**递进追问：**

1. **为什么 data-state 比内部类名更适合作为契约？**

   它直接表达有限行为状态，主题无需猜内部结构；类名可留给消费者布局，库升级内部实现时仍能保持公开状态选择器。

2. **受控与非受控 API 如何避免冲突？**

   明确 value/open 优先并要求配套回调，defaultValue/defaultOpen 仅初始化；开发期警告生命周期中从 undefined 切为受控值。

**易错点：**

- 主题 CSS 依赖 .root > div:nth-child(2)，库增加包装节点就全部失效，说明样式契约不稳定。
- 消费者 onClick 覆盖库内部键盘/状态处理却未合并事件，会让外观正常但 aria 与 open 不同步。

**参考来源：**

- [React：Controlled and uncontrolled components](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components)
- [MDN：Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)
- [WAI-ARIA APG：Accordion Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)

校验日期：2026-07-20

## Q48：前端错误监控应记录哪些 React 上下文？

**短回答：**

错误堆栈、组件栈、路由、版本、用户动作和请求关联 ID；上报前脱敏并使用 source map 还原。

**原理：**

- 一条可行动的 React 错误事件至少包含异常类型、消息、原始 stack 与 sourcemap 后 stack，React componentStack/边界名称，路由与参数模板，发布版本和构建 commit，浏览器/设备，以及匿名会话关联 ID。
- 还应记录有限的 feature flags、最近用户动作、请求/查询 key 与 trace ID、当前 loading/transition 状态，帮助还原“哪个版本、哪棵子树、哪次操作”。
- Error Boundary 的 componentDidCatch 负责已捕获渲染错误；
- 当前 createRoot/hydrateRoot 版本还可配置 onCaughtError、onUncaughtError 与 onRecoverableError 统一采集边界错误、根级未捕获和 hydration 恢复错误，旧版本需按支持项降级。
- 必须去重 Strict Mode/重复边界报告，标明是否已展示 fallback；过滤密码、令牌、题目私密答案和完整请求体，遵守采样与保留政策。监控还要有错误率、受影响用户数和发布维度，而非只堆日志。

**代码 / 场景：**

根入口把未捕获和 hydration 可恢复错误送到同一 reporter，边界再补 componentStack。事件携带 release=2026.07.20、route=/questions/:id 与 traceId，而不是上传输入框全文；同一错误指纹一分钟内聚合计数。

~~~jsx
const root = createRoot(document.getElementById('root'), {
  onUncaughtError(error, info) {
    report(error, { kind: 'uncaught', componentStack: info.componentStack, release: BUILD_ID })
  },
  onCaughtError(error, info) {
    report(error, { kind: 'caught', componentStack: info.componentStack, release: BUILD_ID })
  },
  onRecoverableError(error, info) {
    report(error, { kind: 'recoverable', cause: error.cause, componentStack: info.componentStack })
  },
})
root.render(<App />)
~~~

**递进追问：**

1. **为什么只记录 JavaScript stack 不够？**

   压缩后的函数名很难映射业务组件，且同一工具函数可由多棵子树调用；componentStack、路由和 release 能把错误定位到具体 UI 与版本。

2. **哪些数据不应上传监控？**

   密码、认证令牌、身份证号、完整聊天/答题内容和未经同意的个人信息都应过滤；只记录排障所需的枚举、哈希或脱敏标识。

**易错点：**

- 没有 release 与 sourcemap 的压缩堆栈无法对应源代码，发布回滚和责任提交都难定位。
- window.onerror、根回调和 Error Boundary 同时报同一异常却不去重，会虚高错误率并触发错误告警。

**参考来源：**

- [React DOM API：createRoot error handlers](https://react.dev/reference/react-dom/client/createRoot#error-logging-in-production)
- [React Component API：componentDidCatch](https://react.dev/reference/react/Component#componentdidcatch)

校验日期：2026-07-20

## Q49：如何渐进迁移旧 React 项目？

**短回答：**

先建立测试与构建基线，按叶子组件或路由迁移，使用适配层保持数据契约，避免一次重写所有业务。

**原理：**

- 渐进迁移先建立可回滚基线：锁定关键用户流程测试、错误率和性能，再盘点 React/ReactDOM、路由、状态库、构建器和不兼容依赖。按一个主版本逐级升级并阅读官方 upgrade guide，先修弃用警告与严格模式暴露的问题；
- React 18 将 ReactDOM.render 迁到 createRoot、hydrate 迁到 hydrateRoot，React 19 已移除这些旧 API，并提供官方 codemod。class 组件与函数组件可以长期共存，不必一次重写；
- 在高变更叶子或明确边界逐块替换，保持 props 契约和测试。第三方库先验证 peerDependencies 与并发安全，服务端项目另测 hydration、流式与数据缓存。每批小提交在预发布比较功能、bundle、Web Vitals 和监控，再扩大比例。
- 不要同时替换框架、状态、UI 库和业务逻辑，否则回归无法归因；只有旧根之间需要共享状态时才设计桥接层。

**代码 / 场景：**

先把一个旧入口从 ReactDOM.render 改为 createRoot，保留 LegacyDashboard class 与 Redux，不同时重写 Hook。测试通过后，在边缘页面逐个把 class 改函数组件；SSR 入口单独改 hydrateRoot 并验证 mismatch。

~~~jsx
import { createRoot } from 'react-dom/client'
const container = document.getElementById('dashboard-root')
const root = createRoot(container)
root.render(
  <LegacyStoreProvider store={store}>
    <LegacyDashboard />
  </LegacyStoreProvider>,
)
// 卸载旧微前端时调用 root.unmount()，不再使用 ReactDOM.unmountComponentAtNode
~~~

**递进追问：**

1. **升级 React 时必须把所有 class 改 Hook 吗？**

   不必。class 组件仍可被新 root 渲染；优先处理已移除 API、依赖兼容和真实缺陷，再在有收益的业务变更中渐进重构。

2. **为什么不要一次升级所有基础设施？**

   React、路由、构建和状态同时变化会扩大故障面，测试失败难归因也难回滚；分批迁移能用指标判断每一步是否安全。

**易错点：**

- 直接跨多个主版本且忽略官方迁移指南，会把已弃用 API、第三方 peer 依赖与行为变化混成一团。
- 只在本地开发验证，不检查生产构建、SSR hydration 和真实监控，容易上线后才发现环境差异。

**参考来源：**

- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

校验日期：2026-07-20

## Q50：面试时如何解释 Vue 与 React 的差异？

**短回答：**

从更新粒度、编译优化、状态模型和生态约束比较，并回到项目场景；不要简化为“一个双向绑定、一个虚拟 DOM”。

**原理：**

- 应比较默认心智模型而不是下“谁更快”结论。React 把 state 视为一次 render 的快照，setter 调度组件重新执行，JSX 是 JavaScript 表达式，协调器依据元素类型与 key 比较并提交最小 DOM 变化；
- 依赖通常由 props/state 数据流与 Hook 依赖显式表达。Vue 3 以 ref/reactive 的 getter/setter 或 Proxy 跟踪响应式读取，组件渲染 effect 在依赖触发时更新；
- 模板编译器还能生成静态提升、patch flags 等信息缩小运行时工作，SFC 将 template/script/style 组织在一起。两者都有组件、单向 props、key、虚拟 DOM、SSR 与生态状态方案；
- Vue 的 computed/watch 不应机械等同 React 的 useMemo/useEffect，前者依赖追踪方式不同，React effect 强调外部同步。选择还要看团队语言偏好、框架生态、招聘和既有资产，并以具体版本和场景测量。
- React Compiler 与 Vue 编译优化都在演进，不能拿旧版本刻板印象作结论。

**代码 / 场景：**

同一个 double count：React 点击后 setCount 调度新 render，函数再次执行并从本次快照计算 count * 2；Vue ref 的 value 写入触发已追踪该 ref 的渲染 effect，computed 按响应式依赖失效。最终两者都显示 count=1、double=2，但更新依赖的发现方式不同。

~~~jsx
function ReactCounter() {
  const [count, setCount] = useState(0)
  const doubled = count * 2
  return <button onClick={() => setCount(c => c + 1)}>{count} / {doubled}</button>
}
~~~

~~~vue
<script setup>
import { ref, computed } from 'vue'
const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
<template><button @click="count++">{{ count }} / {{ doubled }}</button></template>
~~~

**递进追问：**

1. **Vue 是细粒度响应式，所以一定不需要组件重渲染吗？**

   不准确。Vue 会跟踪组件渲染读取的依赖并调度组件更新，再结合编译提示优化 patch；具体粒度与模板、组件边界和版本有关。

2. **React JSX 和 Vue template 谁能力更强？**

   JSX 直接使用 JavaScript 组合，模板提供声明式约束和编译优化；两者都能表达复杂 UI，差异更多是工具链与团队心智模型。

**易错点：**

- 只说“Vue 双向绑定、React 单向数据流”过于粗糙；Vue props 也单向，v-model 是约定化 value/update 通道。
- 拿单个 benchmark 宣称框架绝对更快，会忽略编译配置、组件结构、设备、更新类型与版本差异。

**参考来源：**

- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React：Render and Commit](https://react.dev/learn/render-and-commit)
- [Vue：Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue：Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)

校验日期：2026-07-20
