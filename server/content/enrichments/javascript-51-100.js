export default [
  {
    number: 51,
    title: 'Array.prototype.map 的返回值是什么？',
    mechanism: `map 会创建并返回一个新数组，新数组的长度在调用开始时就按原数组长度确定。它依次处理原数组中实际存在的索引，把回调函数的返回值写到新数组的对应位置；回调接收当前元素、索引和原数组三个参数。map 不会自动修改原数组，但回调仍可能主动修改对象或原数组，因此“使用 map”并不等于没有副作用。稀疏数组中的空槽不会执行回调，结果中对应位置仍为空槽。它是浅层映射：若返回的是原对象引用，新旧数组仍会共享该对象。`,
    example: `下面的回调明确返回计算结果，所以输出是新数组 [2, 4, 6]，原数组仍为 [1, 2, 3]；若漏写 return，三个位置都会得到 undefined。\n\n~~~js\nconst source = [1, 2, 3]\nconst doubled = source.map((value, index) => value * 2)\nconsole.log(doubled) // [2, 4, 6]\nconsole.log(source)  // [1, 2, 3]\n~~~`,
    followUps: [
      { question: 'map 与 Array.from 的映射能力有什么差别？', answer: `map 只处理已有的数组或类数组实例，并保留稀疏数组的空槽；Array.from 可以从可迭代对象或类数组创建新数组，并可在创建过程中执行映射函数，空槽通常会被读取为 undefined。` },
      { question: '为什么不建议只为执行副作用而调用 map？', answer: `map 的语义是把每个输入映射为输出，它必然分配一个结果数组。若调用者完全不用该结果，既误导读者又产生无谓分配；此时应使用 forEach、for...of 或明确的循环。` },
    ],
    pitfalls: [
      `箭头函数使用花括号后必须显式 return，否则新数组会被填入 undefined。`,
      `map 只复制数组容器，不会深拷贝元素对象，修改嵌套对象仍可能影响原数据。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.map', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map' },
      { label: 'MDN：Array.prototype.map()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map' },
    ],
  },
  {
    number: 52,
    title: 'Array.prototype.forEach 的返回值是什么？',
    mechanism: `forEach 的规范返回值始终是 undefined，不会收集回调的返回值。它按升序访问调用开始时已确定长度范围内实际存在的元素，并把元素、索引和原数组交给回调。除非回调抛出异常，否则没有内建的 break 或提前返回机制；在回调中写 return 只结束本次回调。forEach 本身是同步算法，不会等待回调返回的 Promise，因此把 async 回调直接传入时，外层 forEach 会在异步工作完成前返回，也无法自然汇总拒绝结果。`,
    example: `回调虽然返回 value * 2，forEach 仍返回 undefined；副作用只体现在 total 被更新。若需要得到映射数组，应改用 map，而不是误以为 forEach 会收集返回值。\n\n~~~js\nlet total = 0\nconst result = [1, 2, 3].forEach((value) => {\n  total += value\n  return value * 2\n})\nconsole.log(result) // undefined\nconsole.log(total)  // 6\n~~~`,
    followUps: [
      { question: '需要顺序等待多个异步任务时应怎样写？', answer: `使用 for...of 搭配 await，可让下一轮在上一轮兑现后开始；若任务可以并行，则先用 map 生成 Promise 数组，再交给 Promise.all 或 allSettled 汇总。` },
      { question: '什么情况下 forEach 的遍历结果会受数组修改影响？', answer: `调用开始时长度上限已被记录，后来追加到上限之外的元素不会访问；尚未访问的元素若被删除会跳过，若被改值则读取访问当时的值，因此遍历中修改数组很难推理。` },
    ],
    pitfalls: [
      `不要用回调中的 return 试图结束整个 forEach，它只能结束当前一次调用。`,
      `async forEach 不会等待 Promise，异常拒绝也不会自动进入外层的 try/catch。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.forEach', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.foreach' },
      { label: 'MDN：Array.prototype.forEach()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach' },
    ],
  },
  {
    number: 53,
    title: 'filter 的作用是什么？',
    mechanism: `filter 用于按谓词筛选元素，并返回一个新的浅拷贝数组。算法按原顺序访问实际存在的索引，只有回调结果经 ToBoolean 转换为 true 的元素才会被追加到结果中，因此结果长度可能从零到原长度不等。它不会直接改变原数组，入选元素却仍是原来的值或对象引用，并非深拷贝。调用开始时会固定遍历长度上限；空槽不会调用回调，也不会在结果中保留占位，所以稀疏数组经过 filter 后通常变为紧凑数组。`,
    example: `示例同时说明筛选条件和浅拷贝边界：结果只保留 active 为 true 的对象，但对象引用仍共享，因此随后修改 activeUsers[0].name 也会改变 users[0].name。\n\n~~~js\nconst users = [{ name: 'A', active: true }, { name: 'B', active: false }]\nconst activeUsers = users.filter((user) => user.active)\nactiveUsers[0].name = 'Ada'\nconsole.log(activeUsers.length) // 1\nconsole.log(users[0].name)      // 'Ada'\n~~~`,
    followUps: [
      { question: '如何同时完成筛选和映射而避免两次遍历？', answer: `可以使用 reduce 在一次循环中判断后再 push 转换值，或写清晰的 for...of；但若数据量不大，连续 filter 与 map 往往可读性更高，应先测量再优化。` },
      { question: 'filter(Boolean) 会意外过滤哪些有效业务值？', answer: `它会移除所有假值，包括数字 0、空字符串、false、NaN、null 和 undefined；若 0 或空字符串具有业务意义，应写出只排除 nullish 值的明确谓词。` },
    ],
    pitfalls: [
      `回调返回对象本身也会被视为真值，不能把“非空对象”误当成严格布尔判断。`,
      `结果数组虽是新的，元素对象仍共享引用，不能把 filter 当作深拷贝工具。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.filter', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.filter' },
      { label: 'MDN：Array.prototype.filter()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter' },
    ],
  },
  {
    number: 54,
    title: 'reduce 最核心的用途是什么？',
    mechanism: `reduce 的核心是把一列元素按顺序折叠成一个累加结果。每轮回调接收 accumulator、currentValue、currentIndex 和原数组，并把本轮返回值作为下一轮的 accumulator。显式提供 initialValue 时，第一项从索引零开始参与；未提供时会把第一个实际存在的元素当初值，从下一项开始，并且空数组会抛出 TypeError。累加结果可以是数字、对象、Map、Promise 链等任意值，但每轮都应返回与设计一致的累加器，才能保持状态转换可推理。稀疏数组的空槽不会进入回调；选择原地修改累加器还是每轮返回新值，也应在整个归约中保持一致。`,
    example: `这里用对象作为明确初值，把订单金额按类别汇总。每轮都返回 accumulator；最终输出 { book: 50, food: 20 }，输入订单数组没有被修改。\n\n~~~js\nconst orders = [\n  { kind: 'book', amount: 30 },\n  { kind: 'food', amount: 20 },\n  { kind: 'book', amount: 20 },\n]\nconst totals = orders.reduce((acc, order) => {\n  acc[order.kind] = (acc[order.kind] ?? 0) + order.amount\n  return acc\n}, {})\nconsole.log(totals) // { book: 50, food: 20 }\n~~~`,
    followUps: [
      { question: '为什么生产代码通常应显式传 initialValue？', answer: `显式初值能固定累加器类型，让空数组也得到合理结果，并避免第一项被特殊处理。对 TypeScript 推断、泛型工具和边界测试而言，行为都会更稳定清晰。` },
      { question: 'reduce 是否一定比普通循环更好？', answer: `不一定。复杂累加器、多个提前退出条件或大量可变状态会让 reduce 难读，而且 reduce 没有内建 break。此时命名清楚的 for...of 往往更易调试和维护。` },
    ],
    pitfalls: [
      `回调某个分支忘记返回累加器，会让下一轮 accumulator 变成 undefined。`,
      `空数组未提供 initialValue 会直接抛出 TypeError，不能假设返回 undefined。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.reduce', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reduce' },
      { label: 'MDN：Array.prototype.reduce()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce' },
    ],
  },
  {
    number: 55,
    title: 'find 没找到匹配元素时返回什么？',
    mechanism: `find 会按索引升序调用谓词，并在第一次得到真值时立即返回该元素；遍历结束仍未匹配则返回 undefined。这个返回协议有歧义：如果数组本来就包含 undefined 且它满足条件，仅看结果无法判断是“找到 undefined”还是“没找到”。需要判断存在性时可使用 findIndex，未找到会返回 -1。与 map、filter 不同，find 会对长度范围内每个索引执行读取，稀疏数组的空槽会被当作 undefined 传给回调；算法同样在开始时确定长度上限。`,
    example: `第一次年龄不小于 18 的对象会被直接返回，后面的元素不再测试；第二次没有匹配项，因此输出 undefined。对象是原数组中的同一个引用，并非副本。\n\n~~~js\nconst users = [{ name: 'A', age: 16 }, { name: 'B', age: 20 }, { name: 'C', age: 30 }]\nconsole.log(users.find((user) => user.age >= 18)) // { name: 'B', age: 20 }\nconsole.log(users.find((user) => user.age > 40))  // undefined\n~~~`,
    followUps: [
      { question: 'find、findIndex 和 findLast 应如何选择？', answer: `要元素本身用 find，要位置或需区分 undefined 元素用 findIndex；若业务要求从末尾找最近匹配项，可用 findLast 或 findLastIndex，并确认目标运行环境支持。` },
      { question: '为什么 find 适合昂贵谓词的提前终止？', answer: `它在首个匹配后立刻返回，不再调用后续谓词；相比先 filter 再取第一项，可避免无谓检查和结果数组分配，但最坏情况下仍需扫描全部元素。` },
    ],
    pitfalls: [
      `不能用 if (found) 判断是否找到，因为匹配元素可能是 0、空字符串或 false。`,
      `find 返回的是原元素引用，修改找到的对象会同时改变原数组中的对象。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.find', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.find' },
      { label: 'MDN：Array.prototype.find()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find' },
    ],
  },
  {
    number: 56,
    title: 'some 在什么时候返回 true？',
    mechanism: `some 用来回答“是否至少有一个元素满足条件”。它按升序检查数组中实际存在的元素，只要某次回调结果转为布尔值后为 true，就立即停止并返回 true；全部不满足或数组为空则返回 false。因此它体现存在量词，适合权限命中、校验失败检测等场景。调用开始时读取并固定长度，之后追加到该范围外的元素不会参与；尚未访问的删除项会被跳过。回调接收元素、索引和原数组，稀疏数组的空槽不会被调用。`,
    example: `第三个数满足大于 10，some 随即停止，所以 visited 是 3 而不是 4；这说明它不仅返回布尔值，还具备短路特性。\n\n~~~js\nlet visited = 0\nconst matched = [2, 4, 12, 100].some((value) => {\n  visited += 1\n  return value > 10\n})\nconsole.log(matched) // true\nconsole.log(visited) // 3\n~~~`,
    followUps: [
      { question: 'some 与 includes 的语义差别是什么？', answer: `some 接受自定义谓词，可按对象字段或范围判断；includes 只检查是否含有给定值，并使用 SameValueZero 比较。固定值成员判断用 includes 通常更直接。` },
      { question: '如何表达“没有任何元素满足条件”？', answer: `可以写 !array.some(predicate)，其短路行为清楚；也可用 every 对谓词取反，但双重否定更易写错，应选择最贴近业务语义且团队易读的形式。` },
    ],
    pitfalls: [
      `空数组调用 some 返回 false，因为不存在任何一个可让谓词成立的元素。`,
      `回调返回非布尔值会做真值转换，返回字符串或对象可能造成意外命中。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.some', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.some' },
      { label: 'MDN：Array.prototype.some()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some' },
    ],
  },
  {
    number: 57,
    title: '[].every(Boolean) 的结果是什么？',
    mechanism: `结果是 true。every 表达“所有被检查元素都满足条件”，空数组没有反例，所以按数学上的空真原则返回 true，回调一次也不会执行。算法遇到第一个假值就短路返回 false；只有遍历完仍无反例才返回 true。它只访问实际存在的索引，稀疏数组的空槽会跳过，因此一个只有空槽、没有实际元素的数组也可能得到 true。Boolean 作为谓词会对元素做真值转换，并不是检查值的类型是否为 boolean。`,
    example: `第一个结果是 true，因为空数组不存在假值；第二个结果是 false，因为数字 0 经 Boolean 转换后为 false。计数还能证明空数组时回调没有运行。\n\n~~~js\nlet calls = 0\nconst emptyResult = [].every((value) => { calls += 1; return Boolean(value) })\nconst valuesResult = [1, 2, 0].every(Boolean)\nconsole.log(emptyResult, calls) // true 0\nconsole.log(valuesResult)      // false\n~~~`,
    followUps: [
      { question: '表单字段数组为空时，every 校验为何可能产生业务漏洞？', answer: `若业务要求“至少有一个字段且全部有效”，只写 fields.every(isValid) 会让空数组通过。应先验证 fields.length > 0，再检查 every，明确存在性与全称条件。` },
      { question: '稀疏数组对 every 有什么影响？', answer: `空槽不会执行谓词，所以 new Array(3).every(() => false) 仍为 true。若必须把空槽当 undefined 校验，可先用 Array.from 将其实体化或改用显式索引循环。` },
    ],
    pitfalls: [
      `不要把空数组返回 true 误判为实现错误，这是全称量词的规范定义。`,
      `every(Boolean) 会拒绝 0、空字符串和 false，即使它们可能是合法业务值。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.every', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.every' },
      { label: 'MDN：Array.prototype.every()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every' },
    ],
  },
  {
    number: 58,
    title: '[10, 2, 1].sort() 的默认结果是什么？',
    mechanism: `默认结果是 [1, 10, 2]。sort 在没有 compareFn 时，会把非 undefined 元素转换为字符串，再按 UTF-16 码元序列升序比较，因此字符串 "10" 排在 "2" 前面。sort 会原地重排并返回同一个数组引用，不是纯函数；现代 ECMAScript 还要求排序稳定，即比较结果为零的元素保持原相对顺序。数值升序必须提供 (a, b) => a - b。undefined 会排到数组末尾，稀疏数组的空槽则被保留并移动到 undefined 之后。比较器返回负数、零或正数来表达相对顺序，而不是必须返回固定的负一、零和正一。`,
    example: `第一次输出体现默认字符串排序并证明原数组已被修改；第二次复制数组后传数值比较器，得到真正的数值升序 [1, 2, 10]。\n\n~~~js\nconst values = [10, 2, 1]\nconst returned = values.sort()\nconsole.log(values)             // [1, 10, 2]\nconsole.log(returned === values) // true\nconsole.log([10, 2, 1].sort((a, b) => a - b)) // [1, 2, 10]\n~~~`,
    followUps: [
      { question: '比较器需要满足哪些基本性质？', answer: `比较器应保持纯净，并满足自反、反对称和传递等一致性要求；同一对输入不能随机返回不同符号，否则不同引擎或不同运行可能产生不可预测顺序。` },
      { question: '不想修改原数组时怎样排序？', answer: `现代环境可使用 toSorted，它返回新数组；兼容旧环境时可先用展开语法或 slice 复制，再调用 sort。复制仍是浅复制，元素对象引用不会被克隆。` },
    ],
    pitfalls: [
      `直接对数字数组调用默认 sort 会按字符串排序，结果常与数值大小不符。`,
      `sort 会修改调用它的数组，共享该数组的组件或状态可能因此出现隐蔽副作用。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.sort', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort' },
      { label: 'MDN：Array.prototype.sort()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort' },
    ],
  },
  {
    number: 59,
    title: 'splice 与 slice 的关键区别是什么？',
    mechanism: `splice 是原地编辑方法，可从 start 开始删除 deleteCount 个元素并插入新元素，返回值是由被删除元素组成的新数组，因此会改变原数组长度和内容。slice 是读取方法，按左闭右开区间提取元素，返回新的浅拷贝数组而不修改原数组；省略 end 时复制到末尾。两者都支持负索引，都只复制元素引用而不会深克隆对象。要在不可变状态管理中替代 splice，可使用 toSpliced，或组合 slice 与展开语法创建新数组。`,
    example: `splice 从索引 1 删除两个元素并插入 X，原数组被改成 ['a','X','d']，返回 ['b','c']；随后 slice 只读取前两项，不再改变原数组。\n\n~~~js\nconst items = ['a', 'b', 'c', 'd']\nconst removed = items.splice(1, 2, 'X')\nconsole.log(items)   // ['a', 'X', 'd']\nconsole.log(removed) // ['b', 'c']\nconst copy = items.slice(0, 2)\nconsole.log(copy)    // ['a', 'X']\nconsole.log(items)   // ['a', 'X', 'd']\n~~~`,
    followUps: [
      { question: 'splice(2) 与 splice(2, undefined) 为什么不同？', answer: `省略 deleteCount 表示删除从索引 2 到末尾的全部元素；显式传 undefined 会经数值转换成为 0，因而不删除。需要插入参数时若想删到末尾，可传 Infinity。` },
      { question: '在 React 或 Redux 状态中为什么偏向 slice 或 toSpliced？', answer: `状态更新依赖新引用识别变化，原地 splice 可能让旧状态也被改写并破坏时间旅行或浅比较。返回新数组的方法能保留旧快照，更新边界更清晰。` },
    ],
    pitfalls: [
      `splice 的返回值是删除项而不是修改后的原数组，赋值时很容易取错结果。`,
      `slice 和 splice 都是浅层操作，嵌套对象依然与原数组共享引用。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.splice', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.splice' },
      { label: 'MDN：Array.prototype.slice()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice' },
    ],
  },
  {
    number: 60,
    title: '[NaN].includes(NaN) 的结果是什么？',
    mechanism: `结果是 true，因为 includes 使用 SameValueZero 比较，而不是严格相等。SameValueZero 把 NaN 与 NaN 视为相同，同时把 +0 与 -0 也视为相同，所以它比 indexOf 更适合判断 NaN 是否存在。includes 从可选的 fromIndex 开始线性读取，找到即返回 true；负索引会相对数组长度换算。它会读取稀疏数组的空槽并把空槽当作 undefined，因此 new Array(1).includes(undefined) 也为 true。该方法只返回存在性，不返回索引位置。对于对象、数组和函数仍采用引用身份比较，两个结构相同但独立创建的值不会互相命中。`,
    example: `严格相等无法识别 NaN，但 includes 可以；indexOf 仍使用严格相等式语义而返回 -1。第三行还展示 SameValueZero 不区分正零和负零。\n\n~~~js\nconsole.log(NaN === NaN)          // false\nconsole.log([NaN].includes(NaN))  // true\nconsole.log([NaN].indexOf(NaN))   // -1\nconsole.log([-0].includes(+0))    // true\n~~~`,
    followUps: [
      { question: 'Object.is、SameValueZero 和严格相等如何区分零与 NaN？', answer: `Object.is 认为 NaN 相同但区分 +0 与 -0；SameValueZero 认为 NaN 相同且不区分两种零；严格相等不认 NaN 相同，也不区分两种零。` },
      { question: 'includes 的 fromIndex 超出范围时会怎样？', answer: `正向索引大于等于数组长度时直接返回 false；负索引先与长度相加，结果小于零则从零开始。它不会因为越界而抛异常。` },
    ],
    pitfalls: [
      `不要用 indexOf(value) !== -1 完全替代 includes，遇到 NaN 时语义不同。`,
      `includes 对对象仍比较引用，内容相同的两个对象字面量不会因此相等。`,
    ],
    sources: [
      { label: 'ECMAScript：Array.prototype.includes', url: 'https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.includes' },
      { label: 'MDN：Array.prototype.includes()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes' },
    ],
  },
  {
    number: 61,
    title: 'new Promise(executor) 中 executor 何时执行？',
    mechanism: `executor 会在 Promise 构造函数被调用时同步执行，而且发生在 new Promise 返回之前。构造器把只能生效一次的 resolve 和 reject 函数传给 executor；首次解决会锁定状态，后续再次调用不会改写结果。executor 同步抛出的异常会被构造器捕获并用于拒绝该 Promise，但如果状态此前已经解决，之后的抛错也不能反转它。真正异步的是 then、catch、finally 注册的反应回调：即使 Promise 已经兑现，它们也会通过 Promise Jobs 队列在当前调用栈结束后运行。`,
    example: `构造器里的日志先于 end，说明 executor 同步执行；then 回调被排入微任务，最后输出。完整顺序是 executor、end、then:ok。\n\n~~~js\nconst promise = new Promise((resolve) => {\n  console.log('executor')\n  resolve('ok')\n})\npromise.then((value) => console.log('then:' + value))\nconsole.log('end')\n// executor\n// end\n// then:ok\n~~~`,
    followUps: [
      { question: '为什么把同步函数随意包进 new Promise 可能是反模式？', answer: `executor 本来就同步运行，包装不会把昂贵计算自动移出主线程，反而增加状态与错误通道。只有要把回调式异步 API 适配为 Promise 时才通常需要显式构造。` },
      { question: 'executor 中 resolve 后再 throw 会发生什么？', answer: `第一次 resolve 已经锁定 Promise 的解决结果，随后抛出的异常会被构造过程捕获但无法把已解决的 Promise 改为拒绝，因此调用方最终仍会观察到原兑现值。` },
    ],
    pitfalls: [
      `new Promise 不会自动创建线程，executor 中的重计算仍会同步阻塞当前线程。`,
      `executor 设计为立即调用，不能依赖构造完成后才初始化的外部变量。`,
    ],
    sources: [
      { label: 'ECMAScript：Promise Constructor', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-constructor' },
      { label: 'MDN：Promise() constructor', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise' },
    ],
  },
  {
    number: 62,
    title: 'Promise.then 的回调属于哪类任务？',
    mechanism: `then 注册的兑现或拒绝反应通过 ECMAScript 的 Promise Jobs 调度；在浏览器事件循环中，这类 Job 通常作为微任务执行。回调不会在 then 调用的同一调用栈里同步运行，即使原 Promise 已经兑现也一样。当前任务的 JavaScript 栈清空后，事件循环会持续清空微任务队列，再进入渲染机会或下一个任务。每次 then 都立即返回一个新的 Promise，其状态由回调返回值、抛错或返回的 thenable 决定；连续 then 因此前后形成异步链，而不是复用原 Promise。`,
    example: `Promise 已用 resolve 兑现，回调仍不会插入同步代码中间。输出先是 A、C，再是 B；then 返回的新 Promise 会采用 value + 1 的结果。\n\n~~~js\nconsole.log('A')\nconst next = Promise.resolve(1).then((value) => {\n  console.log('B')\n  return value + 1\n})\nconsole.log('C')\nnext.then((value) => console.log(value))\n// A, C, B, 2\n~~~`,
    followUps: [
      { question: 'then 中 return 普通值与 return Promise 有何区别？', answer: `普通值会让 then 返回的 Promise 以该值兑现；返回 Promise 或 thenable 时会执行状态吸收，新 Promise 要等待它解决，若它拒绝则沿链传播拒绝原因。` },
      { question: '微任务不断追加微任务会有什么风险？', answer: `事件循环会在进入下一个任务前持续排空微任务。若每个微任务都无界地追加下一个，定时器、输入处理和渲染可能长期得不到机会，形成微任务饥饿。` },
    ],
    pitfalls: [
      `不要把“微任务”理解为绝对立即执行，它仍要等待当前同步调用栈清空。`,
      `then 回调忘记 return 会让下一环收到 undefined，而不是自动继承局部计算值。`,
    ],
    sources: [
      { label: 'ECMAScript：PerformPromiseThen', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromisethen' },
      { label: 'HTML Standard：Microtask queuing', url: 'https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint' },
    ],
  },
  {
    number: 63,
    title: 'setTimeout 回调通常属于哪类任务？',
    mechanism: `在浏览器中，setTimeout 到期后会把回调加入定时器任务源对应的任务队列，通常口语称为宏任务；HTML 标准使用的正式术语是 task。delay 表示回调在至少等待这段时间后才有资格排队，并不是准确执行时刻。只有当前任务结束、微任务检查点完成且事件循环选择到该任务时，回调才会运行。嵌套定时器会受到最小延迟钳制，后台页面还可能被更强地节流。清除定时器只需把 handle 传给 clearTimeout，不会影响已经开始执行的回调。`,
    example: `即使延迟写 0，定时器也不能打断当前脚本；Promise 微任务会在当前任务结束后先清空。因此输出顺序是 sync、microtask、timer，而不是按源码登记顺序直接执行。\n\n~~~js\nsetTimeout(() => console.log('timer'), 0)\nPromise.resolve().then(() => console.log('microtask'))\nconsole.log('sync')\n// sync\n// microtask\n// timer\n~~~`,
    followUps: [
      { question: '为什么 setTimeout(fn, 0) 也可能延迟很久？', answer: `零只代表没有主动增加的最低等待，回调仍要等当前长任务、所有微任务和排在前面的任务完成；后台节流、主线程繁忙与嵌套钳制都会继续增加延迟。` },
      { question: '动画为什么通常使用 requestAnimationFrame 而非 setTimeout？', answer: `requestAnimationFrame 与浏览器下一次绘制时机协调，后台通常暂停，并给出高精度时间戳；固定间隔定时器容易与刷新周期错位，产生抖动或无效绘制。` },
    ],
    pitfalls: [
      `setTimeout 的 delay 不是执行期限，不能用于需要硬实时保证的业务。`,
      `向 setTimeout 传字符串会进行类似动态代码求值，既难调试又带来注入风险。`,
    ],
    sources: [
      { label: 'HTML Standard：Timers', url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers' },
      { label: 'MDN：setTimeout()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout' },
    ],
  },
  {
    number: 64,
    title: '同步日志、Promise.then、setTimeout(0) 的典型执行顺序是什么？',
    mechanism: `典型浏览器脚本中，先执行当前任务里的全部同步代码；调用 then 只登记 Promise 反应微任务，setTimeout(0) 则登记后续定时器任务。当前调用栈清空后，事件循环执行微任务检查点，按队列顺序清空已就绪的 Promise 回调；之后才可能进行渲染并选择下一个任务，所以常见顺序是同步日志、then 回调、定时器回调。这个结论依赖它们在同一轮中登记且 Promise 已解决；若代码嵌套、Promise 尚未解决，或运行在 Node 等宿主，具体先后还要结合各自宿主的事件循环阶段分析。`,
    example: `源码登记顺序不是最终运行顺序。当前脚本先输出 1 与 4，随后微任务输出 3，最后定时器任务输出 2，所以完整结果是 1、4、3、2。\n\n~~~js\nconsole.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nconsole.log(4)\n// 1\n// 4\n// 3\n// 2\n~~~`,
    followUps: [
      { question: 'then 回调里再次注册微任务，会在定时器前运行吗？', answer: `通常会。微任务检查点会持续处理队列，执行中的微任务追加的新微任务也会在离开检查点前运行；无界追加则可能推迟定时器和页面渲染。` },
      { question: '为什么不能把这套顺序机械套到所有 Node.js 代码？', answer: `Node 有 timers、poll、check 等阶段，并额外维护 process.nextTick 队列；不同版本和 I/O 回调所在阶段会改变相对顺序，必须结合 Node 官方事件循环规则判断。` },
    ],
    pitfalls: [
      `“先登记先执行”不适用于跨任务队列比较，队列类型和检查点优先级更关键。`,
      `不要把 Promise 回调称为同步代码，即便已兑现 Promise 的回调也会延后。`,
    ],
    sources: [
      { label: 'HTML Standard：Event loops', url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loops' },
      { label: 'MDN：In-depth guide to microtasks', url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth' },
    ],
  },
  {
    number: 65,
    title: 'async 函数一定返回什么？',
    mechanism: `async 函数每次调用一定返回一个 Promise。函数体正常 return 普通值时，返回的 Promise 以该值兑现；执行到末尾没有 return 时以 undefined 兑现；同步 throw 或 await 到拒绝值时则以相同原因拒绝。若 return 另一个 Promise 或 thenable，外层 Promise 会采用其最终状态，但 async 调用创建的 Promise 通常不是传入 Promise 的同一个对象引用。async 只改变返回与暂停语义，不会把函数体开头的同步计算移到后台；函数会同步执行到首次 await 或结束。调用方因此应统一按异步失败通道处理结果，而不是期待同步抛错直接穿过调用语句。`,
    example: `三个函数调用都立刻得到 Promise。普通返回值成为兑现值，抛错成为拒绝原因；日志依次得到 42 与 boom，调用方必须通过 await 或 Promise 链观察。\n\n~~~js\nasync function value() { return 42 }\nasync function failure() { throw new Error('boom') }\nconsole.log(value() instanceof Promise) // true\nvalue().then(console.log)               // 42\nfailure().catch((error) => console.log(error.message)) // boom\n~~~`,
    followUps: [
      { question: 'async 函数在第一个 await 之前如何执行？', answer: `调用后会像普通函数一样同步执行，直到遇到 await、return 或 throw。若前半段包含大循环，它仍会阻塞线程，async 关键字不会自动并行化 CPU 任务。` },
      { question: 'async 返回已有 Promise 时引用是否保持相同？', answer: `外层 async 调用会返回自身创建的 Promise，并采用内部 Promise 的状态；它与直接 Promise.resolve(existingPromise) 的引用复用行为不同，通常不能用 === 假设二者相同。` },
    ],
    pitfalls: [
      `调用 async 函数却不 await 或 catch，拒绝可能演变成未处理 Promise rejection。`,
      `async 不等于多线程，首次 await 前的昂贵同步代码照样阻塞主线程。`,
    ],
    sources: [
      { label: 'ECMAScript：Async Function Definitions', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-async-function-definitions' },
      { label: 'MDN：async function', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function' },
    ],
  },
  {
    number: 66,
    title: 'await 一个已兑现 Promise 后，后续代码何时继续？',
    mechanism: `即使 await 的 Promise 已经兑现，await 之后的代码也不会在当前调用栈中立即继续。async 函数先暂停，把函数其余部分安排为 Promise 反应 Job；当前同步代码执行完后，它通常在微任务检查点恢复，并取得兑现值。await 会先把表达式结果转换或吸收为 Promise：普通值同样产生一次异步让出；若结果拒绝，恢复时会在 await 位置抛出该拒绝原因，可由函数内 try/catch 捕获。每次 await 都可能引入新的调度边界，因此不应在可并行任务间无意串行等待。`,
    example: `Promise.resolve 已兑现，但函数仍先输出 before 并暂停，外层同步日志 sync 随后出现，最后才输出 after 1。结果是 before、sync、after 1。\n\n~~~js\nasync function run() {\n  console.log('before')\n  const value = await Promise.resolve(1)\n  console.log('after', value)\n}\nrun()\nconsole.log('sync')\n// before\n// sync\n// after 1\n~~~`,
    followUps: [
      { question: '连续 await 两个独立请求有什么性能问题？', answer: `第二个请求若在第一个完成后才创建，会把本可并行的网络等待串行化。应先同时创建两个 Promise，再用 Promise.all 等待，前提是它们没有数据依赖。` },
      { question: 'await 普通数字为什么也会暂停？', answer: `await 会按规范把值交给 Promise 解决过程，并通过异步 Job 恢复函数；所以 await 1 仍产生调度边界，不会像普通赋值一样在同一栈继续。` },
    ],
    pitfalls: [
      `不要假设已兑现 Promise 的 await 是同步操作，它仍会让出当前调用栈。`,
      `循环内逐项 await 可能无意串行化独立任务，应根据依赖关系决定并发策略。`,
    ],
    sources: [
      { label: 'ECMAScript：Await', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#await' },
      { label: 'MDN：await', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await' },
    ],
  },
  {
    number: 67,
    title: 'Promise.all 中一个 Promise 拒绝会怎样？',
    mechanism: `Promise.all 返回的新 Promise 会在任一输入首先拒绝时立即以该原因拒绝，不再等待其他结果来决定外层状态；若全部兑现，则按输入迭代顺序返回值数组，而不是按完成顺序排列。所谓“快速失败”不等于取消：已启动的请求、定时器或计算仍会继续，除非任务本身支持 AbortSignal 等取消协议并由调用方主动触发。非 Promise 输入会按兑现值处理，空迭代对象返回一个已兑现的空数组 Promise。迭代、thenable 访问等过程自身抛错也会导致拒绝。`,
    example: `fast 在十毫秒后拒绝，all 进入 catch 并输出 fail；slow 定时器仍继续运行并输出 slow finished，证明 Promise.all 不会自动取消其他任务。\n\n~~~js\nconst slow = new Promise((resolve) => setTimeout(() => {\n  console.log('slow finished')\n  resolve('slow')\n}, 50))\nconst fast = Promise.reject(new Error('fail'))\nPromise.all([slow, fast]).catch((error) => console.log(error.message))\n// fail\n// slow finished\n~~~`,
    followUps: [
      { question: '如何在 Promise.all 失败后取消其余 fetch？', answer: `为相关 fetch 共享或分别传入 AbortController 的 signal，在 catch 或业务超时处调用 abort。取消是任务协议提供的能力，并非 Promise.all 自带。` },
      { question: '为什么结果数组仍按输入顺序排列？', answer: `all 为每个输入记录固定索引，某项兑现时把值写到对应位置；只有剩余计数归零才整体兑现，因此并发完成先后不会改变调用方预期的数据对应关系。` },
    ],
    pitfalls: [
      `Promise.all 拒绝不会停止其他副作用，重复提交或资源消耗仍需单独治理。`,
      `若只 catch 外层失败，会丢失其余任务的结果视图；需要全量结果时用 allSettled。`,
    ],
    sources: [
      { label: 'ECMAScript：Promise.all', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all' },
      { label: 'MDN：Promise.all()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all' },
    ],
  },
  {
    number: 68,
    title: '想获得每个 Promise 的成功或失败结果，应使用什么？',
    mechanism: `通常使用 Promise.allSettled。它等待输入中的每一项都结束，并返回一个按输入顺序排列的结果数组：兑现项是 { status: 'fulfilled', value }，拒绝项是 { status: 'rejected', reason }。正常的单项拒绝不会让外层 Promise 拒绝，因此适合批量任务报告、部分成功上传或并行健康检查。它与逐项 catch 后再 Promise.all 的手写方案相比，结果结构统一且不会误把业务失败伪装成普通值。allSettled 同样不会取消任务，也不会替你重试、记录或吞掉 reason 中的敏感信息。调用方必须逐项解释状态，才能计算真正的成功率和补偿范围。`,
    example: `两个任务分别成功和失败，allSettled 仍正常兑现并给出两条结构化记录；输出顺序保持与输入一致，而不是取决于谁先结束。\n\n~~~js\nconst results = await Promise.allSettled([\n  Promise.resolve('saved'),\n  Promise.reject(new Error('offline')),\n])\nconsole.log(results[0]) // { status: 'fulfilled', value: 'saved' }\nconsole.log(results[1].status, results[1].reason.message) // rejected offline\n~~~`,
    followUps: [
      { question: '怎样从 allSettled 结果中安全取得成功值？', answer: `先按 result.status 判别，再访问 value 或 reason；在 TypeScript 中这是判别联合，分支检查能完成类型收窄，不能不判断就统一读取 value。` },
      { question: '什么时候仍应选择 Promise.all？', answer: `当所有子结果都是继续执行的必要条件，任一失败就应让整体立即失败时，Promise.all 更准确；allSettled 会等待最慢任务，可能延迟本可提前终止的流程。` },
    ],
    pitfalls: [
      `allSettled 外层成功不代表业务全部成功，必须逐项检查 status。`,
      `直接把 reason 序列化给用户可能泄露堆栈、地址或服务端敏感信息。`,
    ],
    sources: [
      { label: 'ECMAScript：Promise.allSettled', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled' },
      { label: 'MDN：Promise.allSettled()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled' },
    ],
  },
  {
    number: 69,
    title: 'Promise.race 的结果由什么决定？',
    mechanism: `Promise.race 返回的 Promise 由输入中最先解决的那一项决定：最先兑现就以其值兑现，最先拒绝就以其原因拒绝，之后其他输入的结果不再改变外层状态。这里比较的是 settle 而不是只比较成功。非 Promise 值会被 Promise.resolve 式吸收，因而也可很快成为胜者；但 race 的外层仍异步解决，不会在调用栈内同步执行回调。空可迭代对象没有任何竞争者，返回的 Promise 会永久保持 pending。race 不会取消输家，所以用它实现超时还必须显式中止底层请求。`,
    example: `十毫秒后的 timeout 先拒绝，因此 race 进入 catch；五十毫秒后的 slow 仍会运行。若 slow 是 fetch，应配合 AbortController，而不能只丢弃晚到结果。\n\n~~~js\nconst slow = new Promise((resolve) => setTimeout(() => resolve('data'), 50))\nconst timeout = new Promise((_, reject) =>\n  setTimeout(() => reject(new Error('timeout')), 10)\n)\ntry {\n  await Promise.race([slow, timeout])\n} catch (error) {\n  console.log(error.message) // timeout\n}\n~~~`,
    followUps: [
      { question: 'race 与 Promise.any 的失败语义有何不同？', answer: `race 接受第一个 settled 结果，首个拒绝就会整体拒绝；any 忽略单项拒绝并等待第一个兑现值，只有全部拒绝时才以 AggregateError 拒绝。` },
      { question: '如何实现不会泄漏请求的 fetch 超时？', answer: `创建 AbortController，把 signal 传给 fetch；定时器到期时先 controller.abort() 再拒绝，并在 finally 清除定时器，确保超时后网络工作也真正停止。` },
    ],
    pitfalls: [
      `Promise.race 的“最快”包含最快拒绝，不保证返回第一个成功结果。`,
      `仅与超时 Promise 竞争不会取消真实任务，可能继续占用连接并产生副作用。`,
    ],
    sources: [
      { label: 'ECMAScript：Promise.race', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.race' },
      { label: 'MDN：Promise.race()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race' },
    ],
  },
  {
    number: 70,
    title: 'Promise.finally 的回调通常会得到原结果参数吗？',
    mechanism: `finally 的 onFinally 通常不接收原兑现值或拒绝原因，因为同一清理逻辑应同时服务两条路径。若回调正常完成或返回一个最终兑现的 Promise，finally 返回的新 Promise 会透明保留原状态与原结果；若回调抛错或返回拒绝的 Promise，则新的拒绝原因会覆盖原结果。finally 回调的返回普通值不会像 then 那样替换原兑现值。它适合关闭加载状态、释放锁或清理临时资源，但若清理失败确实重要，就应允许新拒绝传播并保留必要的原错误上下文。`,
    example: `回调参数为 undefined，普通 return 999 不会覆盖原值，最终 then 仍输出 42；若把 return 改成 Promise.reject，后续会转入 catch。\n\n~~~js\nPromise.resolve(42)\n  .finally((value) => {\n    console.log(value) // undefined\n    return 999\n  })\n  .then((value) => console.log(value)) // 42\n~~~`,
    followUps: [
      { question: 'finally 与 then(onFulfilled, onRejected) 的透明性有何区别？', answer: `finally 不需复制两套分支，正常完成时保留原值或原原因；then 的处理函数若返回普通值，会把链条转成以该值兑现，因此更容易意外吞掉拒绝。` },
      { question: '清理函数本身失败时应该怎样处理？', answer: `若清理失败影响一致性，应让其拒绝传播，并在日志中同时关联原操作与清理错误；若只是非关键遥测，则可在 finally 内部捕获，避免覆盖主要业务结果。` },
    ],
    pitfalls: [
      `不要指望 finally 参数拿到响应数据或错误对象，应在 then 或 catch 中处理。`,
      `finally 中抛错会覆盖原来的成功值或失败原因，可能掩盖真正根因。`,
    ],
    sources: [
      { label: 'ECMAScript：Promise.prototype.finally', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.finally' },
      { label: 'MDN：Promise.prototype.finally()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally' },
    ],
  },
  {
    number: 71,
    title: 'DOM 事件冒泡的方向是什么？',
    mechanism: `事件传播通常先沿事件路径从 Window、Document 和祖先元素向目标移动，这是捕获阶段；到达目标后再进入目标阶段；若事件的 bubbles 为 true，随后从目标的父元素逐级向外返回到更高祖先，这一段就是冒泡。event.target 表示原始或经 Shadow DOM 重定向后的目标，event.currentTarget 则是当前正在执行监听器的节点。并非所有事件都会冒泡，例如 mouseenter 不冒泡，focus 本身不冒泡但可使用会冒泡的 focusin。传播路径在派发开始时确定，具体还受 composed 与 Shadow DOM 边界影响。`,
    example: `点击 button 时，按钮监听器先输出 button，随后父容器监听器输出 parent；父监听器里的 target 仍是 BUTTON，而 currentTarget 是父 DIV，体现冒泡由内向外。\n\n~~~html\n<div id="parent"><button id="child">保存</button></div>\n<script>\nchild.addEventListener('click', () => console.log('button'))\nparent.addEventListener('click', (event) => {\n  console.log('parent', event.target.tagName, event.currentTarget.id)\n})\n// 点击按钮：button，然后 parent BUTTON parent\n</script>\n~~~`,
    followUps: [
      { question: 'event.target 与 currentTarget 为什么不能混用？', answer: `target 用于识别事件最初来自哪个后代，currentTarget 表示监听器绑定位置。事件委托靠 target 匹配业务节点，而解绑或读取容器数据通常使用 currentTarget。` },
      { question: 'Shadow DOM 会怎样影响事件路径？', answer: `只有 composed 事件可穿过影子边界，且浏览器会对外部监听器重定向 target 以保持封装；需要完整路径时可查看 composedPath，但仍应尊重组件边界。` },
    ],
    pitfalls: [
      `冒泡只描述从目标向祖先的阶段，不能忽略此前发生的捕获阶段。`,
      `不要假设所有事件都冒泡，mouseenter、load 等事件需要不同代理策略。`,
    ],
    sources: [
      { label: 'DOM Standard：Event dispatch', url: 'https://dom.spec.whatwg.org/#concept-event-dispatch' },
      { label: 'MDN：Event bubbling', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling' },
    ],
  },
  {
    number: 72,
    title: 'addEventListener 的 capture 选项为 true 表示什么？',
    mechanism: `capture: true 表示该监听器在事件沿路径向目标传播的捕获阶段被调用，而不是等冒泡阶段从目标返回时调用。祖先捕获监听器通常按从外到内的路径运行；同一目标节点上，捕获监听器也会在非捕获监听器之前参与目标阶段。capture 只改变监听器所处阶段，不会让原本不可穿过 Shadow DOM 的事件越界，也不会改变事件是否具有默认动作。移除监听器时，removeEventListener 至少要使用相同的事件类型、回调引用和 capture 标志，否则匹配不到原注册记录。`,
    example: `点击按钮时，document 的捕获监听器先于按钮自身监听器运行，最后才是 div 的冒泡监听器；典型输出为 document capture、button target、div bubble。\n\n~~~js\ndocument.addEventListener('click', () => console.log('document capture'), { capture: true })\ndiv.addEventListener('click', () => console.log('div bubble'))\nbutton.addEventListener('click', () => console.log('button target'))\n~~~`,
    followUps: [
      { question: 'capture 适合哪些实际场景？', answer: `它可用于在后代冒泡处理前进行全局观察、处理某些不冒泡但可捕获的事件，或构建外层交互策略；不应只为“优先级更高”而滥用。` },
      { question: 'once、passive 与 capture 分别控制什么？', answer: `capture 决定传播阶段，once 让监听器调用一次后自动移除，passive 声明监听器不会调用 preventDefault；三者可同时配置但解决的是不同问题。` },
    ],
    pitfalls: [
      `解绑时遗漏相同 capture 标志，会让监听器继续存在并造成重复处理或泄漏。`,
      `capture 为 true 不代表可以绕过 stopPropagation，传播仍可能在更外层被终止。`,
    ],
    sources: [
      { label: 'DOM Standard：addEventListener', url: 'https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener' },
      { label: 'MDN：EventTarget.addEventListener()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener' },
    ],
  },
  {
    number: 73,
    title: 'event.preventDefault() 的作用是什么？',
    mechanism: `preventDefault 用来请求取消事件关联的默认动作，例如链接导航、表单提交或复选框切换，但它不会停止事件继续捕获或冒泡。只有 event.cancelable 为 true 时调用才可能生效，成功取消后 defaultPrevented 会变为 true。对 passive: true 的监听器，浏览器会忽略 preventDefault，因为注册者已经承诺不阻止默认动作，并可能给出控制台警告。取消默认动作不等于撤销监听器里已经执行的 JavaScript 副作用；表单校验、路由拦截等逻辑仍需自行保证状态一致。`,
    example: `监听器阻止链接导航，但事件仍会冒泡到 document；控制台先输出 canceled true，随后输出 document click，页面地址保持不变。\n\n~~~js\nlink.addEventListener('click', (event) => {\n  event.preventDefault()\n  console.log('canceled', event.defaultPrevented) // true\n})\ndocument.addEventListener('click', () => console.log('document click'))\n~~~`,
    followUps: [
      { question: 'return false 在原生 addEventListener 中能替代 preventDefault 吗？', answer: `不能。原生 addEventListener 会忽略监听器返回值；return false 的组合语义来自某些内联处理器或框架封装，通用原生代码应显式调用 preventDefault。` },
      { question: '如何判断自定义事件能否被取消？', answer: `创建 CustomEvent 时要设置 cancelable: true，派发方可检查 dispatchEvent 的返回值或 event.defaultPrevented；未设置时监听器调用 preventDefault 不会产生取消效果。` },
    ],
    pitfalls: [
      `preventDefault 不会停止传播，需要阻止祖先监听器时应单独使用传播控制方法。`,
      `在 passive 监听器里调用 preventDefault 不生效，触摸与滚轮事件尤其常见。`,
    ],
    sources: [
      { label: 'DOM Standard：preventDefault', url: 'https://dom.spec.whatwg.org/#dom-event-preventdefault' },
      { label: 'MDN：Event.preventDefault()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault' },
    ],
  },
  {
    number: 74,
    title: 'event.stopPropagation() 的作用是什么？',
    mechanism: `stopPropagation 会设置停止传播标志，使事件不再沿传播路径前往后续节点；在捕获阶段调用可阻止它继续到达更内层节点，在目标或冒泡阶段调用则阻止它继续到祖先。它不会取消元素的默认动作，也不会阻止当前节点上其他符合条件的监听器继续执行。若连同一节点后注册的监听器也要停止，应使用 stopImmediatePropagation。过度停止传播会破坏页面级快捷键、埋点和可访问性逻辑，组件通常应优先通过明确状态或目标过滤避免冲突。`,
    example: `按钮上两个监听器都会运行，但父容器不会收到该点击，说明 stopPropagation 只截断后续节点而不截断同节点监听器。链接若有默认导航，导航也不会因此自动取消。\n\n~~~js\nbutton.addEventListener('click', (event) => {\n  console.log('first')\n  event.stopPropagation()\n})\nbutton.addEventListener('click', () => console.log('second'))\nparent.addEventListener('click', () => console.log('parent'))\n// 点击后输出 first、second；不输出 parent\n~~~`,
    followUps: [
      { question: 'stopImmediatePropagation 比 stopPropagation 多做了什么？', answer: `它除了阻止事件继续到其他节点，还阻止当前节点上尚未执行的同类型监听器；这会形成更强耦合，使用前要确认不会屏蔽其他模块。` },
      { question: '点击弹窗内部不关闭弹窗，一定要停止冒泡吗？', answer: `不一定。更稳健的外层处理可判断 event.target 是否就是遮罩层，或用 closest 检查交互区域；这样不会阻断全局统计与其他祖先行为。` },
    ],
    pitfalls: [
      `stopPropagation 不会阻止链接导航或表单提交，默认动作要另外处理。`,
      `它不会停止当前元素上的其他监听器，误解这一点会导致重复业务执行。`,
    ],
    sources: [
      { label: 'DOM Standard：stopPropagation', url: 'https://dom.spec.whatwg.org/#dom-event-stoppropagation' },
      { label: 'MDN：Event.stopPropagation()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation' },
    ],
  },
  {
    number: 75,
    title: '事件委托的核心是什么？',
    mechanism: `事件委托的核心是利用事件传播，在稳定的祖先节点注册少量监听器，再根据 event.target 或 composedPath 判断真正触发交互的后代并执行对应逻辑。这样动态新增的子节点无需逐个绑定，长列表也能降低监听器注册与清理成本。实际实现通常用 target.closest(selector) 找到可能被图标、文本等深层节点包裹的业务元素，并确认匹配节点仍位于委托容器内部。它依赖事件能够传播到容器；focus、mouseenter 等不冒泡事件应改用 focusin、mouseover 或捕获监听器，并考虑 Shadow DOM 的重定向边界。`,
    example: `列表只绑定一次 click。无论点击按钮文字还是以后动态加入的新按钮，closest 都能找到 data-id；contains 检查防止匹配到容器外节点，最后输出对应编号。\n\n~~~js\nlist.addEventListener('click', (event) => {\n  const button = event.target.closest('button[data-id]')\n  if (!button || !list.contains(button)) return\n  console.log('remove', button.dataset.id)\n})\nlist.insertAdjacentHTML('beforeend', '<button data-id="42"><span>删除</span></button>')\n~~~`,
    followUps: [
      { question: '为什么只检查 event.target.matches("button") 不够稳健？', answer: `用户可能点到按钮内部的 span、svg 或 path，此时 target 不是 button。closest 可沿祖先寻找业务节点，再配合容器边界检查避免误匹配。` },
      { question: '事件委托是否总比逐项监听更高效？', answer: `不是。子项很少或事件不冒泡时，直接绑定更简单；委托还会让每次事件执行选择器匹配。应根据节点生命周期、数量和交互边界选择。` },
    ],
    pitfalls: [
      `closest 可能匹配到委托容器之外的祖先，必须再检查匹配节点是否属于容器。`,
      `不能假设所有事件都冒泡，对 focus、mouseenter 等需要替代事件或捕获方案。`,
    ],
    sources: [
      { label: 'DOM Standard：Event dispatch', url: 'https://dom.spec.whatwg.org/#concept-event-dispatch' },
      { label: 'MDN：Event bubbling and delegation', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling' },
    ],
  },
  {
    number: 76,
    title: 'localStorage 存储的值是什么类型？',
    mechanism: `localStorage 的键和值都通过 DOMString 接口保存为字符串；赋入数字、布尔值或普通对象时会先发生字符串转换，对象直接写入通常得到 "[object Object]"，因此结构化数据要显式 JSON.stringify，并在读取时 JSON.parse。存储按源隔离，数据通常跨页面重载和浏览器会话保留，但用户清理站点数据、隐私模式策略或配额限制都可能让它不可用。API 是同步的，大对象序列化和频繁写入会阻塞主线程；StorageEvent 通常通知同源的其他文档，不会在发起写入的当前文档自身触发。`,
    example: `直接保存对象会丢失结构，正确方案是序列化。读取不存在的键返回 null，因此解析前要判断；示例最终还原出对象并输出 Linda。\n\n~~~js\nconst profile = { name: 'Linda', level: 2 }\nlocalStorage.setItem('profile', JSON.stringify(profile))\nconst raw = localStorage.getItem('profile')\nconst restored = raw === null ? null : JSON.parse(raw)\nconsole.log(restored.name) // Linda\n~~~`,
    followUps: [
      { question: '为什么敏感令牌不宜放 localStorage？', answer: `同源页面中运行的 JavaScript 都可读取它，XSS 一旦发生便可直接窃取并外传。会话凭据通常优先使用具备 HttpOnly、Secure、SameSite 属性的 Cookie。` },
      { question: '大量离线结构化数据应选择什么存储？', answer: `IndexedDB 提供异步事务、索引和结构化克隆，适合较大数据集；localStorage 更适合少量简单偏好，并且所有写入都要处理配额与安全异常。` },
    ],
    pitfalls: [
      `直接 setItem 写对象只会得到 [object Object]，必须明确序列化格式与版本。`,
      `localStorage 访问可能抛 SecurityError 或配额异常，不能假定任何环境都可写。`,
    ],
    sources: [
      { label: 'HTML Standard：Web storage', url: 'https://html.spec.whatwg.org/multipage/webstorage.html' },
      { label: 'MDN：Window.localStorage', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage' },
    ],
  },
  {
    number: 77,
    title: 'sessionStorage 的生命周期通常是什么？',
    mechanism: `sessionStorage 按“源 + 顶层浏览上下文”划分，一个标签页中的同源文档共享该页会话数据，但另一个独立标签页通常拥有不同存储区。数据在刷新、同标签页导航和恢复页面时一般仍存在，关闭对应标签页或窗口后页面会话通常结束，数据随之清除。通过带 opener 的方式打开新页面时，新页面的初始 sessionStorage 可能从 opener 复制一份，但之后两边独立变化；使用 noopener 可避免这种初始复制与反向引用。它与 localStorage 一样只保存字符串、使用同步 API，并受隐私与存储策略约束。`,
    example: `计数值在同一标签页刷新后继续增加，但新开一个独立标签页会从自己的存储区开始。关闭原标签页后重新打开普通页面，不能依赖旧值仍存在。\n\n~~~js\nconst visits = Number(sessionStorage.getItem('visits') ?? 0) + 1\nsessionStorage.setItem('visits', String(visits))\nconsole.log(visits) // 同一标签页刷新：1、2、3……\n~~~`,
    followUps: [
      { question: 'sessionStorage 与 session Cookie 的边界有什么不同？', answer: `sessionStorage 只供页面脚本读取且不会随 HTTP 请求发送；会话 Cookie 可由浏览器自动发往匹配服务端，并可设置 HttpOnly，使脚本无法读取。` },
      { question: '为什么不能把“关标签即必删”当作绝对业务保证？', answer: `浏览器可能支持崩溃恢复或会话恢复，隐私策略也因实现而异。安全注销必须由服务端撤销会话，不能只依赖前端存储的生命周期。` },
    ],
    pitfalls: [
      `同源不代表所有标签页共享 sessionStorage，它还按顶层浏览上下文分区。`,
      `不要用 sessionStorage 是否存在作为服务端登录有效性的唯一判断依据。`,
    ],
    sources: [
      { label: 'HTML Standard：The sessionStorage attribute', url: 'https://html.spec.whatwg.org/multipage/webstorage.html#the-sessionstorage-attribute' },
      { label: 'MDN：Window.sessionStorage', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage' },
    ],
  },
  {
    number: 78,
    title: 'Cookie 与 localStorage 的重要区别是什么？',
    mechanism: `Cookie 的核心用途是让浏览器按 Domain、Path、Secure、SameSite、过期时间等规则随匹配的 HTTP 请求自动携带少量状态，服务端也可通过 Set-Cookie 写入；HttpOnly Cookie 还能禁止 JavaScript 读取。localStorage 是同源页面脚本主动读写的持久字符串存储，不会自动进入请求头，容量通常更大但 API 同步。二者安全边界不同：Cookie 的自动发送带来 CSRF 考量，localStorage 中的令牌则容易被 XSS 直接读取。现代浏览器还会按站点、第三方上下文或隐私策略进一步分区和限制存储。`,
    example: `服务端设置 HttpOnly 会话 Cookie 后，浏览器在匹配请求中自动携带它，但 document.cookie 看不到该值；localStorage 里的偏好只在脚本主动读取时出现，不会发送给服务器。\n\n~~~http\nSet-Cookie: session=abc; Path=/; Secure; HttpOnly; SameSite=Lax\n~~~\n\n~~~js\nlocalStorage.setItem('theme', 'dark')\nconsole.log(localStorage.getItem('theme')) // dark\n~~~`,
    followUps: [
      { question: 'HttpOnly Cookie 能单独防住 CSRF 吗？', answer: `不能。HttpOnly 只阻止脚本读取，浏览器仍会自动发送 Cookie。还需 SameSite、Origin 或 Referer 校验、CSRF token，并保证 GET 等安全方法无副作用。` },
      { question: '为什么 localStorage 也不能称为永久存储？', answer: `用户可清除站点数据，浏览器可在隐私或配额策略下回收，应用也可能主动覆盖。持久业务事实仍应写入受控服务端或具备同步策略的存储。` },
    ],
    pitfalls: [
      `不要仅按容量选择存储，是否自动随请求发送和脚本可读性才是关键边界。`,
      `把访问令牌放 localStorage 会扩大 XSS 后果，不能靠前端混淆解决。`,
    ],
    sources: [
      { label: 'RFC 6265bis：Cookies', url: 'https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html' },
      { label: 'HTML Standard：Web storage', url: 'https://html.spec.whatwg.org/multipage/webstorage.html' },
    ],
  },
  {
    number: 79,
    title: '同源策略中的“源”由什么组成？',
    mechanism: `对普通 HTTP(S) URL，源由协议、主机和端口三元组组成，三者都相同才是同源；路径、查询参数和片段不参与。省略端口时按协议默认端口规范化，因此 https://example.com 与显式 443 通常同源，但 http 与 https、不同子域或不同端口均不是同源。同源策略限制一个源的脚本读取另一个源的 DOM 和响应数据，但网络写请求仍可能被发送，所以它不能替代 CSRF 防护。data: 等 URL 可能产生不透明源，file: 的处理还存在浏览器实现差异，不应依赖它构建安全模型。`,
    example: `基准是 https://app.example.com:443。第一个 URL 同源，因为默认 HTTPS 端口就是 443；后面三个分别在协议、主机和端口上不同，因此都跨源。\n\n~~~text\nhttps://app.example.com/profile       同源\nhttp://app.example.com/profile        不同源：协议\nhttps://api.example.com/profile       不同源：主机\nhttps://app.example.com:8443/profile  不同源：端口\n~~~`,
    followUps: [
      { question: '跨源与跨站是同一个概念吗？', answer: `不是。源比较协议、主机和端口，站点概念通常围绕可注册域及方案。两个子域可能跨源但同站，这会影响 SameSite Cookie 与浏览器安全判断。` },
      { question: 'document.domain 为什么不再是推荐的跨子域方案？', answer: `它会弱化源隔离并只影响部分检查，且已被标准标记为弃用方向。跨文档通信应使用 postMessage 并严格校验 origin 与消息结构。` },
    ],
    pitfalls: [
      `路径不同不会形成新源，不能靠把管理页面放在不同路径实现安全隔离。`,
      `同源策略主要限制读取而非阻止请求发出，因此仍需服务端防 CSRF。`,
    ],
    sources: [
      { label: 'HTML Standard：Origins', url: 'https://html.spec.whatwg.org/multipage/browsers.html#origins' },
      { label: 'MDN：Same-origin policy', url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy' },
    ],
  },
  {
    number: 80,
    title: 'CORS 响应头通常由谁配置？',
    mechanism: `CORS 响应头应由目标资源的服务端或代表它的受信反向代理配置，浏览器负责依据 Fetch/CORS 协议执行检查；前端 JavaScript 不能自行添加 Access-Control-Allow-Origin 来获得读取权限。跨源请求中，浏览器会发送 Origin；对非简单方法或头部可能先发 OPTIONS 预检，服务端必须明确允许来源、方法和请求头。携带凭据时，响应不能用通配符来源，必须返回与请求匹配的具体来源并允许 credentials。CORS 只控制浏览器脚本能否读取响应，不是认证、授权或阻止非浏览器客户端调用的机制。`,
    example: `API 根据可信白名单返回具体来源，并让缓存区分 Origin。若前端只在 fetch 请求头里伪造同名响应头，浏览器仍会拦截，因为许可必须出现在服务器响应中。\n\n~~~http\nHTTP/1.1 200 OK\nAccess-Control-Allow-Origin: https://app.example.com\nAccess-Control-Allow-Credentials: true\nVary: Origin\nContent-Type: application/json\n~~~`,
    followUps: [
      { question: '为什么 Postman 能调用而浏览器前端被 CORS 拦截？', answer: `CORS 是浏览器对脚本读取跨源响应施加的安全策略，Postman 等独立客户端不受该浏览器沙箱约束；这不表示服务端授权配置正确。` },
      { question: '预检成功后实际请求还需要 CORS 响应头吗？', answer: `需要。预检只确认实际请求可发送，浏览器仍会检查实际响应中的允许来源等头；缺失时脚本依旧不能读取响应。` },
    ],
    pitfalls: [
      `不要把 CORS 当作后端访问控制，攻击者可绕过浏览器直接请求接口。`,
      `动态回显任意 Origin 并允许凭据会破坏隔离，必须使用严格白名单。`,
    ],
    sources: [
      { label: 'Fetch Standard：CORS protocol', url: 'https://fetch.spec.whatwg.org/#http-cors-protocol' },
      { label: 'MDN：Cross-Origin Resource Sharing', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS' },
    ],
  },
  {
    number: 81,
    title: '同一作用域能否重复声明同名 let 变量？',
    mechanism: `不能。在同一个词法作用域内，两个同名 let 声明会构成早期语法错误，代码在执行前就无法实例化；let 与同作用域的 const、class，或与会冲突的 var、函数声明组合，也可能产生同名绑定冲突。原因是词法环境必须为该标识符建立唯一绑定，并从作用域开始到初始化前处于暂时性死区。内外两个嵌套块拥有不同词法环境，因此内层可重新声明并遮蔽外层变量；两个先后但不嵌套的独立块也各有自己的绑定。是否“同一作用域”必须按语法块、模块或函数环境判断，不能只看源码行距。`,
    example: `第一段会在解析阶段抛 SyntaxError，任何日志都不会运行；第二段合法，内层 x 只遮蔽外层 x，依次输出 inner 与 outer。\n\n~~~js\n// let x = 1\n// let x = 2 // SyntaxError: Identifier 'x' has already been declared\n\nlet x = 'outer'\n{\n  let x = 'inner'\n  console.log(x) // inner\n}\nconsole.log(x)   // outer\n~~~`,
    followUps: [
      { question: '为什么重复 let 通常无法用 try/catch 捕获？', answer: `它属于代码求值前发现的早期语法错误，脚本或模块尚未开始执行，try 语句本身也没有机会运行；动态 import 的失败可通过其 Promise 观察。` },
      { question: 'let 与 var 的重复声明规则为何不同？', answer: `var 绑定在函数或全局变量环境中，规范允许部分重复声明；let 创建块级词法绑定并要求唯一。二者在同一作用域冲突时仍会产生语法错误。` },
    ],
    pitfalls: [
      `不要把内层合法遮蔽误认为同作用域重复声明，两者对应不同词法环境。`,
      `多个传统 script 标签也可能共享全局词法环境，顶层 let 重名仍会失败。`,
    ],
    sources: [
      { label: 'ECMAScript：Let and Const Declarations', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations' },
      { label: 'MDN：let', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let' },
    ],
  },
  {
    number: 82,
    title: '导入命名导出 foo 的正确形式是什么？',
    mechanism: `若模块通过 export const foo、export function foo 或 export { foo } 提供命名导出，导入语法是 import { foo } from './module.js'。花括号中的名字必须匹配导出名，也可写 import { foo as localFoo } 为当前模块建立别名。导入得到的是指向导出绑定的只读实时视图：导出模块更新其绑定后，读取方能看到新值，但导入方不能给该绑定重新赋值。静态 import 只能出现在模块顶层，并在模块求值前完成解析和链接；浏览器相对说明符通常还需要明确扩展名或由打包器解析。`,
    example: `counter.js 提供命名导出，main.js 用花括号导入。inc 修改导出模块中的绑定后，导入的 count 会实时反映为 1，但 main.js 不能执行 count = 5。\n\n~~~js\n// counter.js\nexport let count = 0\nexport const inc = () => { count += 1 }\n\n// main.js\nimport { count, inc } from './counter.js'\ninc()\nconsole.log(count) // 1\n~~~`,
    followUps: [
      { question: '命名导出如何在导入时重命名？', answer: `使用 import { foo as localFoo } from './module.js'。重命名只改变当前模块的本地标识符，不会改变源模块的导出名或其他导入者。` },
      { question: 'import * as namespace 得到的是什么？', answer: `它得到模块命名空间对象，属性对应所有命名导出并体现实时绑定。该对象不是普通可随意增删改的对象，通常用 namespace.foo 读取。` },
    ],
    pitfalls: [
      `命名导入必须使用花括号，漏掉花括号会被解释为导入默认导出。`,
      `导入绑定只读不代表导入对象深度只读，对象自身属性仍可能被修改。`,
    ],
    sources: [
      { label: 'ECMAScript：Imports', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-imports' },
      { label: 'MDN：import', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import' },
    ],
  },
  {
    number: 83,
    title: '导入默认导出的正确形式是什么？',
    mechanism: `默认导出使用 import localName from './module.js' 导入，不写花括号，而且 localName 可由导入方自行命名。源模块可写 export default expression，或默认导出函数、类；每个模块最多只有一个 default 导出。默认导出在模块记录中对应名为 default 的特殊导出项，不是“自动导入模块中唯一变量”。它可与命名导出一起导入，例如 import client, { timeout } from './api.js'。静态导入仍是实时模块链接的一部分，但默认导出表达式与导出已有绑定在细节上可能不同，不应依赖重新赋值技巧。`,
    example: `math.js 默认导出函数，导入方可把它命名为 add，无需与源文件中的函数名一致；命名导出 version 则仍需花括号。输出依次是 5 和 1。\n\n~~~js\n// math.js\nexport default function sum(a, b) { return a + b }\nexport const version = 1\n\n// main.js\nimport add, { version } from './math.js'\nconsole.log(add(2, 3)) // 5\nconsole.log(version)   // 1\n~~~`,
    followUps: [
      { question: '如何把另一个模块的默认导出重新导出？', answer: `可以写 export { default } from './module.js'，也可写 export { default as named } 将其转换为当前模块的命名导出，便于统一入口文件组织 API。` },
      { question: '默认导出与命名导出在重构上有何取舍？', answer: `命名导入由导出方固定名称，工具更容易安全重命名并保持团队一致；默认导入允许任意本地名，单一主入口方便但可能造成同物多名。` },
    ],
    pitfalls: [
      `import { value } 不会取得默认导出，除非源模块确实还有名为 value 的命名导出。`,
      `一个模块不能声明多个 default 导出，多个主要能力应改用命名导出组织。`,
    ],
    sources: [
      { label: 'ECMAScript：Exports', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-exports' },
      { label: 'MDN：export', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export' },
    ],
  },
  {
    number: 84,
    title: '静态 import 声明有什么特点？',
    mechanism: `静态 import 的模块说明符和导入列表在语法上固定，只能写在 ECMAScript 模块的顶层。宿主可在执行模块代码前解析完整依赖图，完成加载、链接和循环依赖绑定，因此导入声明看起来具有提升效果，导入绑定也具有实时只读语义。这种静态结构让浏览器预加载、打包器 tree shaking 和依赖审计成为可能。它不能放进 if、函数或 try 块来按运行条件选择模块；需要运行时条件或变量说明符时应调用 import()，后者返回 Promise。静态可分析不代表依赖一定同步下载，加载策略由宿主决定。`,
    example: `第一行静态导入在模块求值前完成链接；条件分支中要使用动态 import()。将静态 import 直接写进 if 会产生语法错误，而动态导入可按需得到模块命名空间。\n\n~~~js\nimport { render } from './view.js'\nrender()\n\nif (location.hash === '#admin') {\n  const admin = await import('./admin.js')\n  admin.mount()\n}\n~~~`,
    followUps: [
      { question: '静态 import 为什么有利于 tree shaking？', answer: `导入与导出关系在执行前可确定，打包器能构建符号依赖图并证明部分导出未被使用；动态属性访问或有副作用模块仍会限制安全删除。` },
      { question: '循环依赖一定会导致 undefined 吗？', answer: `ES 模块通过实时绑定支持许多循环，但若模块在对方绑定完成初始化前就读取，会触及暂时性死区或观察到时序问题；应重构初始化依赖而非赌执行顺序。` },
    ],
    pitfalls: [
      `静态 import 不能放在条件语句内部，条件加载必须使用 import() 表达式。`,
      `tree shaking 不是语言自动删除代码，仍依赖打包器、模块格式与副作用标注。`,
    ],
    sources: [
      { label: 'ECMAScript：Import Declarations', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-imports' },
      { label: 'MDN：import', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import' },
    ],
  },
  {
    number: 85,
    title: 'typeof class User {} 的 User 是什么？',
    mechanism: `对已经完成声明初始化的 class User {} 执行 typeof User，结果是字符串 "function"。类在运行时由特殊的函数对象表示，具有 prototype，可作为 new 的构造目标；但它与传统 function 声明并不完全等同：类构造器不能不带 new 直接调用，类体代码按严格模式执行，类声明存在暂时性死区，且原型方法默认不可枚举。typeof 反映的是运行时可调用对象类别，不会告诉你这是 class 语法创建的，也不能据此断言它可像普通函数那样直接调用。检查类来源通常不应依赖 toString 文本。`,
    example: `typeof 输出 function，但 User() 直接调用会抛 TypeError；只有 new User() 才进行构造。这个对比说明 typeof 的粗粒度分类不会表达类的调用限制。\n\n~~~js\nclass User {}\nconsole.log(typeof User)       // 'function'\nconsole.log(new User() instanceof User) // true\ntry {\n  User()\n} catch (error) {\n  console.log(error.name)      // TypeError\n}\n~~~`,
    followUps: [
      { question: '为什么类声明在声明语句前不能安全访问？', answer: `类绑定会提升到词法环境，但在执行声明初始化前处于暂时性死区；即使使用 typeof 访问该绑定也会抛 ReferenceError，而不是返回 undefined。` },
      { question: 'class 与构造函数的继承底层有什么共同点？', answer: `二者都通过构造函数对象及其 prototype 建立实例原型链；class 提供更明确的语法、严格模式、super 语义和不可直接调用等约束。` },
    ],
    pitfalls: [
      `typeof 为 function 不代表类构造器可以像普通函数一样直接调用。`,
      `不要用 typeof value === 'function' 作为可靠的“是否由 class 声明”检测。`,
    ],
    sources: [
      { label: 'ECMAScript：Class Definitions', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions' },
      { label: 'MDN：Classes', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes' },
    ],
  },
  {
    number: 86,
    title: 'class 中定义的普通实例方法通常存放在哪里？',
    mechanism: `class 体中以 method() {} 语法定义的普通实例方法会创建在构造器的 prototype 对象上，而不是为每个实例复制一份。实例读取方法时沿原型链找到同一个函数，因此不同实例的 user1.method === user2.method 通常为 true。方法描述符默认可写、可配置但不可枚举。static 方法则定义在类构造器对象本身；实例字段和箭头函数字段在构造时为每个实例创建，后者常用于固定 this，但也意味着每个实例拥有独立函数并增加分配。私有方法还有独立的私有名称访问规则，不能简单当作字符串属性读取。`,
    example: `两个实例都没有自己的 greet 属性，方法来自 User.prototype，而且引用相同；Object.keys(instance) 也不会列出原型方法。\n\n~~~js\nclass User {\n  greet() { return 'hello ' + this.name }\n  constructor(name) { this.name = name }\n}\nconst a = new User('A')\nconst b = new User('B')\nconsole.log(a.greet === b.greet) // true\nconsole.log(a.hasOwnProperty('greet')) // false\nconsole.log(User.prototype.greet.call(a)) // hello A\n~~~`,
    followUps: [
      { question: '箭头函数字段与原型方法如何选择？', answer: `原型方法共享函数、内存更省，并通过调用方式取得动态 this；箭头字段为每实例创建并词法绑定 this，传给回调方便但继承覆盖和测试替换成本不同。` },
      { question: '为什么解构实例方法后调用可能丢失 this？', answer: `原型只提供函数，this 由调用点决定。const fn = user.greet; fn() 不再以 user 为接收者，类体严格模式下 this 为 undefined，需要 bind 或包装调用。` },
    ],
    pitfalls: [
      `不要以为 class 内所有函数都复制到实例，普通方法默认位于 prototype。`,
      `把实例方法直接作为回调传递可能丢失接收者，必须明确绑定 this。`,
    ],
    sources: [
      { label: 'ECMAScript：Method Definitions', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-method-definitions' },
      { label: 'MDN：Classes—Methods', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#methods' },
    ],
  },
  {
    number: 87,
    title: '派生类 constructor 中访问 this 前必须做什么？',
    mechanism: `派生类构造器在读取或写入 this 之前必须先调用 super()。与基类构造器不同，派生构造器进入时尚未创建并绑定 this；super() 会以当前 new.target 调用父类构造器，由父类完成实例初始化并把结果绑定给派生构造器。提前访问 this、调用引用 this 的实例逻辑，或在 super() 前普通 return，都会触发 ReferenceError；super() 也只能调用一次。例外是派生构造器显式返回一个对象，此时可用该对象作为构造结果而不使用 this，但这种写法罕见且会破坏常规类初始化预期。`,
    example: `Good 在 super(name) 后才能设置 role，最终得到完整实例；Bad 在 super 前访问 this 会抛 ReferenceError。super 还把父类参数和 new.target 语义传入构造链。\n\n~~~js\nclass Person {\n  constructor(name) { this.name = name }\n}\nclass Admin extends Person {\n  constructor(name) {\n    super(name)\n    this.role = 'admin'\n  }\n}\nconsole.log(new Admin('Linda')) // Admin { name: 'Linda', role: 'admin' }\n~~~`,
    followUps: [
      { question: '派生类完全不写 constructor 时会怎样？', answer: `语言提供等价于 constructor(...args) { super(...args) } 的默认派生构造器，参数传给父类，因此实例仍能得到父类初始化。` },
      { question: '为什么 super() 不是普通函数调用？', answer: `它依赖当前类的 [[GetPrototypeOf]]、new.target 和派生构造语义来创建并返回 this 绑定，不能保存为变量后脱离构造器任意调用。` },
    ],
    pitfalls: [
      `super 前即便只读取 this 也会报错，不是只有给 this 赋值才受限制。`,
      `不要为绕过 super 而随意返回其他对象，否则 instanceof 与字段初始化可能偏离预期。`,
    ],
    sources: [
      { label: 'ECMAScript：Runtime Semantics for ClassDefinitionEvaluation', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-runtime-semantics-classdefinitionevaluation' },
      { label: 'MDN：Derived class constructor', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/constructor' },
    ],
  },
  {
    number: 88,
    title: 'Generator 函数调用后返回什么？',
    mechanism: `调用 generator function 不会立即执行函数体，而是返回一个 Generator 对象。该对象同时遵循迭代器和可迭代协议：next() 推进执行到下一个 yield 或 return，并得到 { value, done }；它的 Symbol.iterator 方法通常返回自身，所以可被 for...of 消费。第一次 next 传入的参数没有可恢复的 yield 接收位置，通常会被忽略；后续 next(value) 的参数成为上一个 yield 表达式的结果。return(value) 可提前结束，throw(error) 则在暂停位置注入异常。Generator 是有状态、一次性推进的流程，不是可随意并发复用的数组。`,
    example: `调用 steps() 时没有输出 start；第一次 next 才执行到 yield 1，第二次 next 取得 yield 2，第三次结束并返回 3。for...of 不会包含最终 return 值。\n\n~~~js\nfunction* steps() {\n  console.log('start')\n  yield 1\n  yield 2\n  return 3\n}\nconst iterator = steps()\nconsole.log(iterator.next()) // 先输出 start，再得到 { value: 1, done: false }\nconsole.log(iterator.next()) // { value: 2, done: false }\nconsole.log(iterator.next()) // { value: 3, done: true }\n~~~`,
    followUps: [
      { question: 'yield* 的作用是什么？', answer: `yield* 会把迭代控制委托给另一个可迭代对象，逐项转发值，并在被委托迭代器结束后把其最终返回值作为 yield* 表达式结果。` },
      { question: 'Generator 与 async generator 有何区别？', answer: `普通 Generator 的 next 返回 IteratorResult；async generator 的 next 返回 Promise，并可在函数体使用 await，消费端通常通过 for await...of 迭代。` },
    ],
    pitfalls: [
      `仅调用 Generator 函数不会执行函数体，必须 next 或通过迭代协议推进。`,
      `for...of 只消费 done 为 false 的 yield 值，不会把最终 return 值加入序列。`,
    ],
    sources: [
      { label: 'ECMAScript：Generator Function Definitions', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generator-function-definitions' },
      { label: 'MDN：Generator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator' },
    ],
  },
  {
    number: 89,
    title: '对象要支持 for...of，通常需要实现什么？',
    mechanism: `对象需要在 Symbol.iterator 键上提供一个无参数方法，该方法返回迭代器；迭代器的 next() 每次返回形如 { value, done } 的对象，done 为 true 表示序列结束。for...of 会先取得 iterable[Symbol.iterator]()，再反复调用 next，并在循环提前退出时尝试调用迭代器的 return() 进行清理。数组、字符串、Map、Set 已内建该协议，普通对象默认不可迭代。常见实现是把 Symbol.iterator 写成 generator 方法，因为 generator 自动满足 next 和可迭代迭代器协议。可迭代不等于类数组，length 与数字索引不是 for...of 的必要条件。`,
    example: `range 通过 generator 形式的 Symbol.iterator 依次 yield 2、3、4，所以展开运算得到 [2, 3, 4]；对象不需要 length 或数字属性。\n\n~~~js\nconst range = {\n  from: 2,\n  to: 4,\n  *[Symbol.iterator]() {\n    for (let value = this.from; value <= this.to; value += 1) yield value\n  },\n}\nconsole.log([...range]) // [2, 3, 4]\n~~~`,
    followUps: [
      { question: 'iterator 与 iterable 有什么区别？', answer: `iterator 具有 next 方法并表示一次遍历状态；iterable 具有 Symbol.iterator 并能创建 iterator。一个迭代器也可让 Symbol.iterator 返回自身，从而同时满足两者。` },
      { question: '为什么迭代器最好实现 return 方法？', answer: `for...of 因 break、throw 或 return 提前退出时会执行 IteratorClose 并调用 return，资源型迭代器可借此关闭文件句柄、订阅或网络游标。` },
    ],
    pitfalls: [
      `给对象增加 length 不能自动支持 for...of，必须提供 Symbol.iterator 协议。`,
      `next 返回普通值而非 { value, done } 对象会违反协议并导致消费失败。`,
    ],
    sources: [
      { label: 'ECMAScript：The Iterable Interface', url: 'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterable-interface' },
      { label: 'MDN：Iteration protocols', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols' },
    ],
  },
  {
    number: 90,
    title: 'Map 的键可以是什么类型？',
    mechanism: `Map 的键可以是任意 ECMAScript 值，包括字符串、数字、Symbol、对象、函数，甚至 NaN。键匹配使用 SameValueZero：NaN 可与自身匹配，+0 与 -0 视为同一键；对象和函数则按引用身份比较，内容相同但分别创建的两个对象是不同键。Map 按首次插入顺序迭代键值；对已有键 set 新值不会把它移到末尾，删除后重新插入才形成新的顺序位置。与普通对象相比，Map 不会把键强制转成字符串，也不会混入原型属性，并直接提供 size、迭代和清空能力。`,
    example: `对象键按引用匹配，original 可取到值，而新建的相同字面量取不到；NaN 则按 SameValueZero 可稳定作为键。最终 size 为 2。\n\n~~~js\nconst original = { id: 1 }\nconst cache = new Map()\ncache.set(original, 'object value')\ncache.set(NaN, 'not a number')\nconsole.log(cache.get(original))    // object value\nconsole.log(cache.get({ id: 1 }))  // undefined\nconsole.log(cache.get(NaN))        // not a number\nconsole.log(cache.size)            // 2\n~~~`,
    followUps: [
      { question: '对象键可能造成什么内存问题？', answer: `Map 会强引用键和值，只要 Map 存活，对象键通常不能回收。若只需随对象生命周期保存附加数据，可考虑键为对象的 WeakMap。` },
      { question: '什么时候普通对象比 Map 更合适？', answer: `数据天然是固定字符串字段、需要对象字面量语法或直接 JSON 序列化时，普通对象更方便；动态键集合、频繁增删和任意类型键更适合 Map。` },
    ],
    pitfalls: [
      `内容相同的两个对象不是同一个 Map 键，必须保留并复用原引用。`,
      `Map 不能直接由 JSON.stringify 完整序列化，需要先定义键值转换协议。`,
    ],
    sources: [
      { label: 'ECMAScript：Map Objects', url: 'https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects' },
      { label: 'MDN：Map', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map' },
    ],
  },
  {
    number: 91,
    title: 'new Set([NaN, NaN]).size 是多少？',
    mechanism: `结果是 1。Set 保证集合中的值唯一，判断已有值时使用 SameValueZero；该比较把 NaN 与 NaN 视为相同，因此第二个 NaN 不会新增元素。SameValueZero 也把 +0 与 -0 视为相同。Set 按成功插入的先后顺序迭代，并可存放任意类型；对象仍按引用身份去重，两个内容相同但独立创建的对象会同时存在。重复 add 已存在的值不会改变 size 或插入顺序。Set 适合成员关系与去重，但数组转 Set 只按这套相等语义处理，不能按对象字段自动合并记录。`,
    example: `两个 NaN 被折叠为一个值，所以 size 是 1；两个独立对象引用不会折叠，加入后集合大小变成 3。展开结果仍保留首次插入顺序。\n\n~~~js\nconst values = new Set([NaN, NaN])\nconsole.log(values.size) // 1\nvalues.add({ id: 1 })\nvalues.add({ id: 1 })\nconsole.log(values.size) // 3\nconsole.log(values.has(NaN)) // true\n~~~`,
    followUps: [
      { question: '如何按对象的 id 去重而不是按引用去重？', answer: `可用 Map 以 id 为键保存对象，例如 new Map(items.map(item => [item.id, item]))；还要明确重复 id 时保留第一条还是最后一条。` },
      { question: 'Set 与 Array.includes 的查找语义相同吗？', answer: `二者都使用 SameValueZero，所以对 NaN 和正负零的判断一致；Set 面向多次成员查询，而数组 includes 每次通常需要线性扫描。` },
    ],
    pitfalls: [
      `不要用 NaN !== NaN 推断 Set 会保留两个 NaN，它采用的是 SameValueZero。`,
      `Set 对对象只比较引用，无法直接完成按字段内容的业务去重。`,
    ],
    sources: [
      { label: 'ECMAScript：Set Objects', url: 'https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set-objects' },
      { label: 'MDN：Set', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set' },
    ],
  },
  {
    number: 92,
    title: 'WeakMap 相比 Map 的主要特点是什么？',
    mechanism: `WeakMap 不会因为自身持有键而阻止该键被垃圾回收，适合把缓存、私有元数据或状态关联到对象生命周期。当前规范允许可垃圾回收的键，即对象或非注册 Symbol；传统和许多旧运行环境主要只支持对象键，字符串、数字以及 Symbol.for 创建的注册 Symbol 不能作为键。值可以是任意类型。为了不暴露垃圾回收这种不可预测行为，WeakMap 没有 size、keys、entries 和整体遍历能力，只提供 get、set、has、delete 等按已知键操作。它不是“会自动删除所有数据的 Map”，只是在没有其他强引用时允许键值关联被回收。`,
    example: `metadata 与 user 建立关联，但不能枚举 WeakMap。当应用丢弃 user 的最后一个强引用后，这条关联可被回收；具体回收时间不可观察也不可作为业务逻辑条件。\n\n~~~js\nconst metadata = new WeakMap()\nlet user = { id: 1 }\nmetadata.set(user, { lastSeen: Date.now() })\nconsole.log(metadata.get(user).lastSeen > 0) // true\nuser = null // 若再无强引用，键及关联数据现在具备被回收资格\n~~~`,
    followUps: [
      { question: '为什么 WeakMap 不能提供 size 或遍历？', answer: `垃圾回收时间由实现决定，若能枚举或读取 size，程序便可观察回收行为并产生非确定结果；隐藏键集合可保持 GC 策略自由度。` },
      { question: 'WeakMap 能替代所有缓存吗？', answer: `不能。它只能按已知可回收键查询，无法按字符串键、遍历淘汰或统计命中。需要容量限制、过期策略和可观察性时通常使用 Map 加显式缓存策略。` },
    ],
    pitfalls: [
      `弱引用只针对键；若其他地方仍强引用该键，关联不会神奇地立即消失。`,
      `不能依赖垃圾回收发生的时间完成注销、关连接等确定性资源清理。`,
    ],
    sources: [
      { label: 'ECMAScript：WeakMap Objects', url: 'https://tc39.es/ecma262/multipage/keyed-collections.html#sec-weakmap-objects' },
      { label: 'MDN：WeakMap', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap' },
    ],
  },
  {
    number: 93,
    title: 'user?.profile?.name 的作用是什么？',
    mechanism: `可选链会逐段检查链左侧是否为 null 或 undefined；user 为 nullish 时，整个连续链直接得到 undefined，user 存在但 profile 为 nullish 时也得到 undefined，否则正常读取 name。它不会把 0、false、空字符串当作缺失，也不会吞掉 getter 内抛出的异常。短路只沿同一个连续可选链传播，使用括号把中间结果分组后再普通取属性会重新可能抛错。根标识符若根本未声明，undeclared?.x 仍会产生 ReferenceError。可选链还支持 obj.method?.() 和 obj?.[expression]，后者短路时不会求值 expression。方法存在但不是可调用值时，使用可选调用仍会抛出 TypeError，而不是悄悄返回 undefined。`,
    example: `前两个读取分别得到 Linda 与 undefined。第三行证明假值 0 不会触发空值短路；只有 null 和 undefined 才会停止属性访问。\n\n~~~js\nconst user = { profile: { name: 'Linda', score: 0 } }\nconsole.log(user?.profile?.name)       // Linda\nconsole.log(null?.profile?.name)       // undefined\nconsole.log(user?.profile?.score)      // 0\nconsole.log(user?.missing?.name ?? 'anonymous') // anonymous\n~~~`,
    followUps: [
      { question: 'obj.method?.() 是否保证方法里的 this 正确？', answer: `以 obj.method?.() 这种引用形式调用时仍保留 obj 作为接收者；若先解构或保存为独立变量再调用，this 仍可能丢失，需另行绑定。` },
      { question: '为什么可选链不应到处用于必需字段？', answer: `它会把本应尽早暴露的数据契约错误转成 undefined，根因可能在更远处才表现。只有字段在模型上确实可缺失时才应使用。` },
    ],
    pitfalls: [
      `可选链不能用于赋值目标，例如 object?.name = value 是语法错误。`,
      `把链中间用括号截断后再取属性，后半段不会继续享受可选短路。`,
    ],
    sources: [
      { label: 'ECMAScript：Optional Chaining Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-optional-chaining-operator' },
      { label: 'MDN：Optional chaining', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining' },
    ],
  },
  {
    number: 94,
    title: 'value ?? fallback 在什么情况下使用 fallback？',
    mechanism: `空值合并运算符只在左操作数为 null 或 undefined 时才求值并返回 fallback；数字 0、空字符串、false 和 NaN 都会原样保留。这使它适合为“缺失值”提供默认值，而不会像逻辑或运算符那样误覆盖合法假值。该运算符具有短路性质：左侧非 nullish 时，右侧表达式不会执行。为避免与 &&、|| 的优先级产生歧义，语法禁止在没有括号时直接混用这些运算符。对应的 ??= 只在当前属性为 nullish 时赋值，并且目标引用只求值一次。`,
    example: `端口 0 与空标签都是刻意配置，?? 会保留它们；只有 null 和 undefined 使用默认值。右侧函数仅在确实缺失时才调用。\n\n~~~js\nconsole.log(0 ?? 8080)          // 0\nconsole.log('' ?? 'untitled')   // ''\nconsole.log(false ?? true)      // false\nconsole.log(null ?? 'fallback') // fallback\nconsole.log(undefined ?? 10)    // 10\n~~~`,
    followUps: [
      { question: '?? 与 || 在配置默认值时如何选择？', answer: `若 0、false 或空字符串是合法配置，用 ??；只有业务明确把所有假值都视为缺失时才用 ||，并应在代码中表达该业务规则。` },
      { question: '为什么 a ?? b || c 必须加括号？', answer: `规范把 ?? 与 &&、|| 的无括号混用定义为语法错误，避免读者误判组合优先级；应明确写成 (a ?? b) || c 或 a ?? (b || c)。` },
    ],
    pitfalls: [
      `不要把 NaN 当作 nullish；若 NaN 也需回退，必须额外用 Number.isNaN 判断。`,
      `右侧可能有副作用且会被短路，不能依赖它每次都执行日志或状态更新。`,
    ],
    sources: [
      { label: 'ECMAScript：CoalesceExpression', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-binary-logical-operators-runtime-semantics-evaluation' },
      { label: 'MDN：Nullish coalescing operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing' },
    ],
  },
  {
    number: 95,
    title: 'try 中 return 1，finally 中 return 2，最终返回什么？',
    mechanism: `最终返回 2。执行 try 的 return 1 时，函数先形成一个待完成的 return Completion，但在真正离开函数前必须执行 finally。finally 中若正常结束，原来的 return 1 会继续生效；本题 finally 又执行 return 2，产生新的 abrupt completion，并覆盖之前保存的返回结果。相同规则也意味着 finally 中的 throw 可覆盖 try 中的 return 或原异常，break、continue 在相应上下文中也可能改变完成方式。因为这种覆盖会隐藏控制流和错误，finally 通常只做不改变完成状态的资源清理，不应从中 return。只有 finally 正常结束时，进入它之前保存的完成记录才会继续向外传播。`,
    example: `调用 answer 输出 2，而不是 1。去掉 finally 中的 return 后才会输出 1；若 finally 抛错，调用方会看到新异常而不是任何返回值。\n\n~~~js\nfunction answer() {\n  try {\n    return 1\n  } finally {\n    return 2\n  }\n}\nconsole.log(answer()) // 2\n~~~`,
    followUps: [
      { question: 'try 抛错而 finally return 时会发生什么？', answer: `finally 的 return 会覆盖正在传播的异常，函数改为正常返回该值；这会悄悄吞掉根因，因此代码审查通常应禁止 finally 中 return。` },
      { question: 'try 已 return 时 finally 还能修改返回对象吗？', answer: `待返回的是对象引用时，finally 可修改该对象的属性，调用方会观察到修改；但把局部变量重新指向另一对象不会自动替换已保存的返回引用。` },
    ],
    pitfalls: [
      `finally 中 return 会吞掉 try 或 catch 的异常，严重降低故障可观测性。`,
      `不要误以为 return 后 finally 不执行，它正是在函数真正退出前强制执行。`,
    ],
    sources: [
      { label: 'ECMAScript：The try Statement', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-try-statement' },
      { label: 'MDN：try...catch—Returning from a finally block', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#returning_from_a_finally_block' },
    ],
  },
  {
    number: 96,
    title: 'JSON.stringify 对象属性中的 undefined 通常如何处理？',
    mechanism: `对象中值为 undefined 的可枚举自有字符串键属性通常会被省略，所以 JSON.stringify({ a: 1, b: undefined }) 得到 {"a":1}。数组必须保持索引位置，undefined、函数或 Symbol 元素会序列化为 null；若顶层值本身是 undefined、函数或 Symbol，JSON.stringify 返回 JavaScript 的 undefined 而不是字符串。replacer 函数可把这些值显式转换为 null 或其他协议值。JSON 还不支持 BigInt，默认会抛 TypeError；循环引用同样会失败。序列化只处理约定的数据模型，原型、方法、undefined 与部分数值语义不会完整往返。Date 通常会先通过 toJSON 转成字符串，自定义对象也可能用 toJSON 改写最终表示。`,
    example: `对象属性 missing 被省略，数组里的 undefined 变成 null，顶层 stringify(undefined) 则直接返回 undefined。输出分别是 {"ok":1}、[1,null,3] 和 undefined。\n\n~~~js\nconsole.log(JSON.stringify({ ok: 1, missing: undefined })) // {"ok":1}\nconsole.log(JSON.stringify([1, undefined, 3]))             // [1,null,3]\nconsole.log(JSON.stringify(undefined))                     // undefined\n~~~`,
    followUps: [
      { question: 'PATCH 请求需要表达“清空字段”时应怎样处理？', answer: `不要依赖 undefined，因为它会在对象 JSON 中消失。应在接口契约中明确使用 null、专用操作字段或 JSON Patch，并由服务端区分缺省与清空。` },
      { question: 'replacer 如何保留 undefined 的位置信息？', answer: `可传 replacer 函数，在 value === undefined 时返回 null 或约定标记；接收方必须知道该标记语义，否则无法无损恢复原值。` },
    ],
    pitfalls: [
      `对象字段静默消失可能让更新接口误判为“未提供”，必须先定义空值协议。`,
      `数组中的 undefined 不会被删除而是变为 null，对象与数组行为不能混为一谈。`,
    ],
    sources: [
      { label: 'ECMAScript：JSON.stringify', url: 'https://tc39.es/ecma262/multipage/structured-data.html#sec-json.stringify' },
      { label: 'MDN：JSON.stringify()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify' },
    ],
  },
  {
    number: 97,
    title: 'structuredClone 的优势是什么？',
    mechanism: `structuredClone 使用浏览器结构化克隆算法创建深层副本，能处理循环引用，并原生支持 Array、Map、Set、Date、RegExp、ArrayBuffer、TypedArray 等许多 JSON 无法正确往返的类型。它还支持 transfer 选项：可把 ArrayBuffer 等可转移对象的底层资源移交给副本，原对象随即被分离，避免大块内存复制。它并非任意 JavaScript 对象的完美克隆：Function、DOM 节点会抛 DataCloneError，属性描述符、访问器和自定义原型链通常不会原样保留，私有字段也不在克隆范围。能克隆数据不代表适合保存行为对象或领域实体。`,
    example: `JSON 无法处理这里的循环引用和 Map，而 structuredClone 可以；副本中的 self 指回副本本身，Map 也保持为 Map，修改副本不会改原对象。\n\n~~~js\nconst source = { map: new Map([['count', 1]]) }\nsource.self = source\nconst copy = structuredClone(source)\nconsole.log(copy !== source)             // true\nconsole.log(copy.self === copy)          // true\nconsole.log(copy.map instanceof Map)     // true\ncopy.map.set('count', 2)\nconsole.log(source.map.get('count'))     // 1\n~~~`,
    followUps: [
      { question: 'transfer ArrayBuffer 与普通克隆有什么差别？', answer: `普通克隆复制缓冲区内容；transfer 会把底层资源所有权移动到副本，原 ArrayBuffer 的 byteLength 变为 0，适合大数据跨线程且原方不再使用。` },
      { question: '为什么 structuredClone 后类实例方法可能丢失？', answer: `结构化克隆关注可序列化数据，不承诺保留用户自定义原型链和方法。领域实例应克隆原始数据后显式通过构造器重建行为。` },
    ],
    pitfalls: [
      `structuredClone 不能克隆函数和 DOM 节点，遇到它们会抛 DataCloneError。`,
      `深克隆可能占用大量时间与内存，不能用来掩盖不清晰的状态所有权。`,
    ],
    sources: [
      { label: 'HTML Standard：Structured clone', url: 'https://html.spec.whatwg.org/multipage/structured-data.html#structured-cloning' },
      { label: 'MDN：structuredClone()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone' },
    ],
  },
  {
    number: 98,
    title: '把不可信字符串直接赋给 innerHTML 的主要风险是什么？',
    mechanism: `主要风险是 DOM 型 XSS。不可信字符串会被 HTML 解析器当作标记，而不是普通文本；攻击者可注入带事件处理器、危险 URL、SVG 等可执行能力的节点，在站点源权限下读取页面数据、冒充用户发请求或篡改界面。仅认为 innerHTML 中插入的 script 标签常不执行并不能消除风险，其他活跃内容仍可触发。首选 textContent 显示纯文本；确需富文本时应采用经过维护的白名单净化器、限制输入语法，并配合严格 CSP 与 Trusted Types 降低危险 sink 的使用。输出编码必须与 HTML 属性、URL、脚本等具体上下文匹配。`,
    example: `第一种写法会创建真实 img 元素，图片加载失败后 onerror 可执行；第二种只展示字符，不解析标签。实际项目不要运行攻击字符串，而应以单元测试验证净化结果。\n\n~~~js\nconst untrusted = '<img src=x onerror="alert(document.domain)">'\n// 危险：preview.innerHTML = untrusted\npreview.textContent = untrusted\n// 页面只显示原文字，不创建 img，也不会执行 onerror\n~~~`,
    followUps: [
      { question: 'CSP 能否让 innerHTML 直接变得安全？', answer: `不能。严格 CSP 能限制部分脚本执行并降低后果，但配置可能存在缺口，且 HTML 注入还能钓鱼或篡改界面。根本措施仍是避免危险 sink 与正确净化。` },
      { question: '为什么自写正则删除 script 标签不可靠？', answer: `HTML 有复杂解析规则、编码、命名空间和大量可执行上下文，攻击载荷不限于 script。应使用成熟、持续更新并按白名单解析 DOM 的净化库。` },
    ],
    pitfalls: [
      `只过滤 script 标签远远不够，事件属性、SVG 和危险 URL 都可能执行代码。`,
      `净化后的字符串若再次拼接未净化内容或进入不同上下文，仍可能重新产生漏洞。`,
    ],
    sources: [
      { label: 'OWASP：Cross Site Scripting Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html' },
      { label: 'MDN：Element.innerHTML—Security considerations', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations' },
    ],
  },
  {
    number: 99,
    title: '防抖 debounce 的典型行为是什么？',
    mechanism: `防抖把一串密集触发合并为一次调用：典型 trailing 模式每次触发都取消旧定时器并重新计时，只有连续 wait 毫秒没有新事件后才执行最新调用。它适合搜索建议、输入校验、窗口尺寸稳定后的计算等“关心最终状态”的场景。成熟实现还需明确 leading、trailing、maxWait、cancel、flush，以及如何保留最后一次 this 和参数；组件卸载时要清除定时器。防抖不会取消已经发出的网络请求，搜索场景仍需 AbortController 或序列号防止旧响应覆盖新结果。持续不断的事件在纯 trailing 且无 maxWait 时可能永远不执行。`,
    example: `三次调用间隔都小于 100 毫秒，每次都会重置计时，最终只在最后一次调用后安静 100 毫秒输出 abc。实现保留最后一组参数。\n\n~~~js\nfunction debounce(fn, wait) {\n  let timer\n  return function (...args) {\n    clearTimeout(timer)\n    timer = setTimeout(() => fn.apply(this, args), wait)\n  }\n}\nconst search = debounce((query) => console.log(query), 100)\nsearch('a')\nsearch('ab')\nsearch('abc')\n// 约 100ms 后仅输出 abc\n~~~`,
    followUps: [
      { question: 'leading 与 trailing 防抖有什么区别？', answer: `leading 在一轮连续触发的开头立即执行，trailing 在安静窗口后执行最后一次；两者同时启用时还要定义只有一次调用时是否再次尾随执行。` },
      { question: '搜索框防抖后为什么仍会出现旧结果覆盖新结果？', answer: `前一次请求可能已在防抖触发后发出，网络完成顺序不受输入顺序保证。应中止旧请求，或只接受与当前查询版本一致的响应。` },
    ],
    pitfalls: [
      `组件卸载后不取消定时器，回调可能访问已销毁状态并造成泄漏或警告。`,
      `持续触发且没有 maxWait 时，尾随防抖可能长期不执行关键业务。`,
    ],
    sources: [
      { label: 'Lodash：_.debounce', url: 'https://lodash.com/docs/#debounce' },
      { label: 'MDN：setTimeout()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout' },
    ],
  },
  {
    number: 100,
    title: '节流 throttle 的典型行为是什么？',
    mechanism: `节流限制函数在连续事件期间最多每隔 wait 时间执行一次，不要求事件先停止，因此适合滚动位置采样、拖拽更新和限频上报。常见实现支持 leading：窗口开始立即执行，以及 trailing：窗口结束用最后一次参数补执行；具体第一次与最后一次是否发生必须由 API 约定。与防抖相比，节流能在持续输入中周期性给出中间结果。基于时间戳的实现和基于定时器的实现，在边界、系统时钟变化、this 与参数保留方面行为可能不同。视觉更新常用 requestAnimationFrame 把调用限制为每个绘制帧一次，但它是按帧对齐，不等价于任意毫秒间隔节流。`,
    example: `这个简单实现采用 leading 节流：第一次立即输出，100 毫秒窗口内的调用被忽略；窗口结束后的下一次调用才能再次执行。生产实现若需最后一次参数，应额外实现 trailing。\n\n~~~js\nfunction throttle(fn, wait) {\n  let ready = true\n  return function (...args) {\n    if (!ready) return\n    ready = false\n    fn.apply(this, args)\n    setTimeout(() => { ready = true }, wait)\n  }\n}\nconst report = throttle((y) => console.log(y), 100)\nreport(10) // 立即输出 10\nreport(20) // 被本窗口忽略\n~~~`,
    followUps: [
      { question: '节流与防抖应如何按业务选择？', answer: `需要持续过程中的周期反馈选节流，例如滚动进度；只关心一轮输入最终值选防抖，例如搜索。关键是先定义允许丢哪些中间状态。` },
      { question: 'requestAnimationFrame 节流适合什么场景？', answer: `适合把 DOM 读写或画布更新对齐到浏览器绘制帧，避免一帧重复渲染；它不保证固定毫秒频率，后台页面通常还会暂停回调。` },
    ],
    pitfalls: [
      `只实现 leading 会丢失窗口末尾最新状态，不适合必须提交最终值的业务。`,
      `节流回调若自身耗时超过间隔，仍会形成长任务，限频不能替代性能优化。`,
    ],
    sources: [
      { label: 'Lodash：_.throttle', url: 'https://lodash.com/docs/#throttle' },
      { label: 'MDN：requestAnimationFrame()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame' },
    ],
  },
]
