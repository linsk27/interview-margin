# JavaScript 01-10：数据类型与判断

## Q1：typeof null 的结果是什么？

- A. null
- B. object
- C. undefined
- D. number

**答案：B**

**短回答：**

这是 JavaScript 早期实现遗留问题。null 是空值，但 typeof null 会返回 object，判断 null 应直接使用 value === null。

**原理：**

结果是字符串 object。ECMAScript 对 typeof 运算符规定：操作数值为 Null 时返回 object，这是一项为兼容早期网页而保留的历史行为，并不表示 null 真的是普通对象。null 是独立的原始值，表示“有意的空值”；它没有可读取的对象属性，也不能作为 Object.keys 等对象操作的有效输入。typeof 更适合粗分函数、字符串、数字等类型，判断 null 应使用 value === null；若要判断非空对象，应同时检查 value !== null && typeof value === object，数组还需再使用 Array.isArray 区分。这种分层判断能避免空引用进入属性访问，并让类型分支与运行时事实保持一致。

**代码 / 场景：**

三个检查展示 typeof 的历史结果、null 的真实分类，以及稳妥的非空对象守卫。

~~~js
const value = null
console.log(typeof value) // 'object'
console.log(value === null) // true
console.log(value !== null && typeof value === 'object') // false
try { Object.keys(value) } catch (error) {
  console.log(error.name) // 'TypeError'
}
~~~

因此不能只用 typeof value === object 就断言 value 可安全当作对象使用。

**递进追问：**

1. **如何同时排除 null 并判断普通对象？**

   先检查 value !== null 与 typeof value === object，再根据业务排除数组、日期等对象；若要求精确原型，还应结合 Object.getPrototypeOf 或专用类型守卫。

2. **为什么不能修正 typeof null 的返回值？**

   大量既有网页和库可能依赖这一行为，直接改成 null 会破坏向后兼容；标准因此明确保留结果，并建议通过严格相等单独判断 null。

**易错点：**

- 把 typeof null 等于 object 解释成 null 继承 Object.prototype 是错误的，它仍是原始值。
- typeof 对数组也返回 object，数组判断必须使用 Array.isArray，而不是继续猜测对象标签。

**参考来源：**

- [ECMAScript：The typeof Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-typeof-operator)
- [MDN：typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)

校验日期：2026-07-20

## Q2：NaN === NaN 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：B**

**短回答：**

NaN 与任何值都不相等，包括它自己。判断 NaN 优先使用 Number.isNaN(value)。

**原理：**

结果是 false。严格相等比较先处理类型，再按 Number 的比较规则判断；NaN 是一种特殊数值，规范明确规定只要任一参与比较的数是 NaN，严格相等就返回 false，所以它连自己也不严格相等。这个设计使 NaN 能传播“无有效数值结果”的状态，但意味着不能用 x === NaN 检测它。应优先使用 Number.isNaN(x)，它只在参数本身为 Number 类型且值为 NaN 时返回 true；若还要把无法转换的输入视为无效，应先按业务规则显式转换，再检查结果。Object.is 使用 SameValue 语义，会把两个 NaN 视为相同。

**代码 / 场景：**

下面同时比较三种检测方式，输出揭示严格相等与 SameValue 的差异。

~~~js
const result = 0 / 0
console.log(result === NaN)          // false
console.log(Number.isNaN(result))    // true
console.log(Object.is(result, NaN))  // true
console.log(Number.isNaN('hello'))  // false
~~~

最后一项为 false，因为 Number.isNaN 不会先把字符串强制转换成数字。

**递进追问：**

1. **为什么 x !== x 可以检测 NaN？**

   NaN 是 JavaScript 中唯一不与自身严格相等的数值，因此 x !== x 只会在 x 为 NaN 时成立；不过 Number.isNaN 更直接、更易读。

2. **数组查找 NaN 时应选 indexOf 还是 includes？**

   indexOf 使用严格相等，无法找到 NaN；includes 使用 SameValueZero，会认为 NaN 与 NaN 相同，所以查找包含 NaN 的数组应使用 includes。

**易错点：**

- NaN 的 typeof 仍是 number，它表示数值运算的特殊结果，而不是一种独立 JavaScript 类型。
- 不要用全局 isNaN 代替 Number.isNaN 做纯检测，前者会先转换字符串等非数值输入。

**参考来源：**

- [ECMAScript：Strict Equality Comparison](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isstrictlyequal)
- [MDN：NaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN)

校验日期：2026-07-20

## Q3：Number.isNaN('hello') 的结果是什么？

- A. true
- B. false
- C. NaN
- D. 抛出异常

**答案：B**

**短回答：**

Number.isNaN 不进行隐式类型转换，字符串不是数值 NaN，所以返回 false。

**原理：**

结果是 false。Number.isNaN 执行的是不带强制类型转换的精确检查：只有参数的 ECMAScript 类型是 Number，并且该数值满足 NaN 判定时才返回 true。字符串 hello 虽然通过 Number 转换会得到 NaN，但原参数仍是字符串，因此在第一步类型检查就返回 false。这个 API 适合验证某个计算结果是否已经成为 NaN，避免全局 isNaN 把空字符串、布尔值或其他可转换输入先改成数字而产生歧义。若接口接收文本数字，应先明确是否允许空白、指数形式等格式，再执行 Number(text) 并对转换后的结果使用 Number.isNaN。

**代码 / 场景：**

先检测原值，再显式转换，可清楚分离“输入类型不对”和“转换得到无效数值”两个阶段。

~~~js
const input = 'hello'
console.log(Number.isNaN(input))         // false
const parsed = Number(input)
console.log(parsed)                     // NaN
console.log(Number.isNaN(parsed))        // true
console.log(Number.isNaN(Number('')))   // false，因为 Number('') 是 0
~~~

因此校验文本字段时不能只看最后一行 API，还要先定义允许的文本语法。

**递进追问：**

1. **Number.isNaN 与全局 isNaN 的差异是什么？**

   Number.isNaN 不转换参数，只识别真正的数值 NaN；全局 isNaN 先执行 ToNumber，因此 hello 会被转换为 NaN 后返回 true。

2. **如何验证用户输入必须是有限数字？**

   先拒绝不符合业务格式的空字符串等值，再显式转换，最后使用 Number.isFinite 检查；它可同时排除 NaN、Infinity 和负 Infinity。

**易错点：**

- Number.isNaN 返回 false 不代表输入是有效数字，它也会对任意非 Number 类型返回 false。
- 先用 parseFloat 再判断可能接受带尾随字符的文本，是否允许这种格式必须由业务规则决定。

**参考来源：**

- [ECMAScript：Number.isNaN](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isnan)
- [MDN：Number.isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)

校验日期：2026-07-20

## Q4：typeof 一个从未声明的变量会得到什么？

- A. null
- B. undefined
- C. ReferenceError
- D. object

**答案：B**

**短回答：**

typeof 对未声明标识符会安全返回字符串 undefined；直接读取该变量才会抛出 ReferenceError。

**原理：**

对真正从未声明、在任何可见环境记录中都没有绑定的简单标识符执行 typeof，会返回字符串 undefined，而不会像直接读取那样抛 ReferenceError。typeof 的求值算法会识别未解析的引用并给出这个特殊结果，这使旧代码能在不触发异常的情况下探测可选全局变量。但该豁免不是通用的：如果名称由 let、const 或 class 声明且当前仍在暂时性死区，绑定是存在但未初始化，typeof 仍会抛 ReferenceError；写成 typeof missing.prop 时，也必须先直接读取 missing，因而会报错。现代代码更适合用 globalThis 上的属性或显式能力检测。

**代码 / 场景：**

第一个表达式安全返回字符串；第二个直接读取同名标识符会抛异常，二者不能互换。

~~~js
console.log(typeof neverDeclared) // 'undefined'
try {
  console.log(neverDeclared)
} catch (error) {
  console.log(error.name) // 'ReferenceError'
}

try {
  console.log(typeof temporal)
} catch (error) {
  console.log(error.name) // 'ReferenceError'
}
let temporal = 1
~~~

temporal 已有词法绑定但尚未初始化，因此不享受未解析引用的特殊分支。

**递进追问：**

1. **typeof undeclared === undefined 的写法有什么问题？**

   typeof 的结果总是字符串，必须与字符串 undefined 比较；若省略引号，右侧标识符 undefined 虽通常可用，但表达含义不清且容易误写。

2. **探测浏览器能力时有什么更明确的方式？**

   可检查 globalThis 上的属性，例如 typeof globalThis.SomeAPI === function，或使用 in、特性方法调用与异常兜底，避免依赖隐式全局名称。

**易错点：**

- typeof 的安全特例只针对未解析的标识符引用，不会让任意可能抛错的属性链都变安全。
- 暂时性死区中的词法绑定不是“从未声明”，对它执行 typeof 仍会抛 ReferenceError。

**参考来源：**

- [ECMAScript：The typeof Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-typeof-operator)
- [MDN：typeof undeclared and TDZ behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)

校验日期：2026-07-20

## Q5：Symbol('id') === Symbol('id') 的结果是什么？

- A. true
- B. false
- C. 取决于浏览器
- D. 抛出异常

**答案：B**

**短回答：**

每次调用 Symbol 都会创建唯一值，描述文字相同不代表同一个 Symbol。

**原理：**

结果是 false。每次调用 Symbol(description) 都创建一个新的、全局唯一的 Symbol 原始值；description 只是用于调试显示的可选文字，不参与身份计算，所以两个描述都为 id 的 Symbol 仍是不同键。严格相等比较 Symbol 时比较身份，只有保存并复用同一个 Symbol 值才相等。若确实需要跨模块或同一 realm 内按字符串名称取得共享 Symbol，应显式使用 Symbol.for(key)，它查询全局 Symbol 注册表并在不存在时登记；Symbol() 创建的普通 Symbol 不会自动进入该注册表。Symbol 适合作为避免普通字符串冲突的属性键，但并不等于真正的私有字段。

**代码 / 场景：**

普通 Symbol 每次创建新身份，而 Symbol.for 会对同一注册表键复用身份。

~~~js
const a = Symbol('id')
const b = Symbol('id')
console.log(a === b) // false

const sharedA = Symbol.for('id')
const sharedB = Symbol.for('id')
console.log(sharedA === sharedB) // true
console.log(Symbol.keyFor(a)) // undefined
console.log(Symbol.keyFor(sharedA)) // 'id'
~~~

description 相同只影响展示；是否进入注册表才决定能否按名称取回同一值。

**递进追问：**

1. **Symbol 属性为什么不会出现在 Object.keys 中？**

   Object.keys 只收集自身可枚举的字符串键，Symbol 键属于另一类属性键；可使用 Object.getOwnPropertySymbols 或 Reflect.ownKeys 获取。

2. **Symbol 能否实现真正的私有属性？**

   不能。拿到对象的人仍可通过 Reflect.ownKeys 找到 Symbol 键；真正的语言级私有成员应使用 class 的 #private 字段，或用闭包隐藏状态。

**易错点：**

- 不要把 description 当成 Symbol 的键值或唯一标识，它可重复且甚至可以省略。
- Symbol.for 使用共享注册表，可能产生跨模块命名耦合；仅在确实需要协议共享时采用。

**参考来源：**

- [ECMAScript：Symbol Constructor](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-constructor)
- [MDN：Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)

校验日期：2026-07-20

## Q6：1n + 1 会发生什么？

- A. 得到 2
- B. 得到 2n
- C. 得到 '11'
- D. 抛出 TypeError

**答案：D**

**短回答：**

BigInt 与 Number 不能直接参与算术运算，需要先把两边转换成同一种数值类型。

**原理：**

表达式会抛出 TypeError。加法先对两侧执行 ToPrimitive；若没有进入字符串拼接分支，就分别执行 ToNumeric。1n 得到 BigInt，1 得到 Number，规范随后要求两个数值操作数属于同一种数值类型，否则拒绝运算，而不会像部分语言那样隐式把一侧提升。原因是 BigInt 表示任意精度整数，Number 使用 IEEE 754 双精度浮点；自动互转可能静默丢失大整数精度，或无法表达小数。调用方必须根据领域显式选择 1n + BigInt(1) 或 Number(1n) + 1，并在转为 Number 前验证值是否处于安全整数范围。

**代码 / 场景：**

混合运算失败后，两个显式方案都能运行，但转成 Number 的方案需要考虑精度边界。

~~~js
try {
  console.log(1n + 1)
} catch (error) {
  console.log(error.name) // 'TypeError'
}
console.log(1n + BigInt(1)) // 2n
console.log(Number(1n) + 1) // 2

const huge = 9007199254740993n
console.log(Number(huge)) // 9007199254740992，已经丢失精度
~~~

显式转换让精度风险出现在代码审查点，而不是由运算符悄悄决定。

**递进追问：**

1. **BigInt 能否表示小数？**

   不能。BigInt 只表示整数，BigInt(1.5) 会抛 RangeError；涉及小数时应使用 Number、十进制定点方案或专门的高精度十进制库。

2. **如何安全地把 BigInt 转成 Number？**

   转换前检查值是否位于 Number.MIN_SAFE_INTEGER 与 Number.MAX_SAFE_INTEGER 范围内，并确认业务只需要整数；超出时应保持 BigInt 或序列化为字符串。

**易错点：**

- 不要通过隐式运算猜测转换方向，BigInt 与 Number 算术混用会直接失败而不是自动提升。
- JSON.stringify 默认不能序列化 BigInt，接口传输时需设计字符串或自定义编码方案。

**参考来源：**

- [ECMAScript：BigInt Objects](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-objects)
- [MDN：BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)

校验日期：2026-07-20

## Q7：null 和 undefined 最准确的区别是什么？

- A. 二者完全相同
- B. null 常表示主动设置为空，undefined 常表示尚未赋值
- C. undefined 是对象
- D. null 是字符串

**答案：B**

**短回答：**

二者都表示“没有值”，但语义不同。null 往往由开发者明确赋值，undefined 多见于缺少参数、属性或初始化值。

**原理：**

null 与 undefined 是两个不同的原始值和语言类型。undefined 通常表示绑定尚未赋值、对象缺少属性、函数没有返回值或参数未传；null 通常由程序显式写入，表达“已知这里目前没有对象或值”。这些是常见 API 语义，不是引擎强制的业务含义。严格相等会因为类型不同返回 false，宽松相等有一条专门规则让二者彼此相等。默认参数与解构默认值只在值为 undefined 时生效，不会替换 null。序列化也不同：对象属性值为 undefined 时 JSON.stringify 通常省略该属性，而 null 会被保留为 JSON 的 null。

**代码 / 场景：**

属性访问、默认参数和 JSON 输出共同展示两个空值在实际接口中的不同传播方式。

~~~js
const record = { explicit: null, missingValue: undefined }
console.log(record.absent) // undefined
console.log(null === undefined) // false
console.log(null == undefined) // true

function read(value = 'default') { return value }
console.log(read(undefined)) // 'default'
console.log(read(null)) // null
console.log(JSON.stringify(record)) // '{"explicit":null}'
~~~

是否允许 null 应由接口契约明确规定，不能只凭二者都表示“没有”就混用。

**递进追问：**

1. **什么时候 API 应返回 null，什么时候省略字段？**

   若需要表达字段存在且当前明确为空，可返回 null；若字段不适用、未加载或希望保持向后兼容，可省略，但必须在契约中区分这些状态。

2. **为什么 value == null 有时被有意使用？**

   宽松相等在这里可一次匹配 null 与 undefined，且不会匹配 0、false 或空字符串；若团队接受这种惯用法，应配合注释或 lint 例外保持意图清晰。

**易错点：**

- null 的 typeof 为 object 是历史兼容结果，不能据此把 null 归类为对象。
- 不要用 value || fallback 区分空值，它还会把 0、false、空字符串和 NaN 一并替换。

**参考来源：**

- [ECMAScript：ECMAScript Language Types](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types)
- [MDN：null](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null)
- [MDN：undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined)

校验日期：2026-07-20

## Q8：0.1 + 0.2 === 0.3 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：B**

**短回答：**

JavaScript Number 使用 IEEE 754 双精度浮点数，部分十进制小数无法被二进制精确表示。比较时可使用误差范围。

**原理：**

结果是 false。JavaScript 的普通 Number 采用 IEEE 754 binary64：一个符号位、有限精度的有效数和指数共同表示二进制浮点值。0.1、0.2 与 0.3 的二进制展开都不能在有限位数内精确结束，存入 Number 时各自被舍入；前两个近似值做加法后得到约 0.30000000000000004，与 0.3 所保存的另一个近似值位模式不同，所以严格相等失败。比较测量结果时应使用与数值尺度相关的容差；货币等要求确定十进制规则的领域可使用最小货币单位整数或可靠十进制库，而不是简单到处调用 toFixed。

**代码 / 场景：**

打印实际结果与误差，并用尺度相关容差完成更稳妥的近似比较。

~~~js
const actual = 0.1 + 0.2
const expected = 0.3
console.log(actual) // 0.30000000000000004
console.log(actual === expected) // false

const tolerance = Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected))
console.log(Math.abs(actual - expected) <= tolerance) // true
~~~

Number.EPSILON 是 1 附近的间隔，数值很大时应按尺度放大容差。

**递进追问：**

1. **为什么不能永远只用 Number.EPSILON 比较？**

   EPSILON 描述 1 附近相邻浮点数的距离；数值绝对值变大后可表示间隔也变大，固定 EPSILON 可能过严，应结合相对误差与业务容差。

2. **金额计算应该如何避免浮点误差？**

   可把金额转换为分等最小单位的安全整数进行运算，并明确舍入规则；金额范围更大或小数位动态时，应采用十进制定点或高精度库。

**易错点：**

- 浮点误差不是 JavaScript 独有 bug，而是多数采用 IEEE 754 binary64 的语言共有表示限制。
- toFixed 返回字符串且执行舍入，只适合展示或明确舍入环节，不能自动修复所有中间计算误差。

**参考来源：**

- [ECMAScript：Number Types](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type)
- [MDN：Number.EPSILON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON)
- [IEEE 754-2019](https://standards.ieee.org/ieee/754/6210/)

校验日期：2026-07-20

## Q9：Object.is(NaN, NaN) 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 与浏览器有关

**答案：A**

**短回答：**

Object.is 使用 SameValue 语义，能认为两个 NaN 相同。

**原理：**

结果是 true。Object.is 使用规范中的 SameValue 比较语义：类型不同返回 false；对大多数原始值和对象身份，其结果与严格相等相同，但它对两个特殊数字有意采用不同规则。SameValue 把 NaN 与 NaN 视为相同，同时区分 +0 与 -0。严格相等则相反地让 NaN 不等于自身、让两个带不同符号的零相等。Object.is 不做类型强制转换，所以字符串数字不会等于 Number。它常用于判断某个值是否真的变化，但对集合查找还应注意 Map、Set 与 includes 使用的是 SameValueZero，会合并正负零同时识别 NaN。

**代码 / 场景：**

四个输出完整展示 SameValue 与严格相等的两个差异点，而非只背一个 NaN 结论。

~~~js
console.log(Object.is(NaN, NaN)) // true
console.log(NaN === NaN) // false
console.log(Object.is(+0, -0)) // false
console.log(+0 === -0) // true
console.log(Object.is(1, '1')) // false
~~~

Object.is 不会把字符串 1 转成数字，因此它不是另一种宽松相等。

**递进追问：**

1. **Object.is 能否用于对象深比较？**

   不能。对于对象，它只比较两个操作数是否引用同一对象；内容相同但分别创建的对象仍返回 false，深比较需要按数据结构逐字段定义规则。

2. **Set 为什么能保存并找到 NaN？**

   Set 的键比较使用 SameValueZero，它与 SameValue 一样认为 NaN 相同，但不区分 +0 与 -0，因此重复添加 NaN 只保留一个条目。

**易错点：**

- Object.is 不是深相等工具，两个结构相同的对象字面量仍因引用身份不同而不相同。
- 不要假设 JavaScript 只有一种相等算法，严格相等、SameValue 与 SameValueZero 的零值规则不同。

**参考来源：**

- [ECMAScript：Object.is](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.is)
- [MDN：Object.is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)

校验日期：2026-07-20

## Q10：Object.is(+0, -0) 的结果是什么？

- A. true
- B. false
- C. NaN
- D. 抛出异常

**答案：B**

**短回答：**

Object.is 能区分正零和负零，而 +0 === -0 的结果是 true。

**原理：**

结果是 false。IEEE 754 浮点数保留零的符号位，因此 JavaScript Number 中存在 +0 与 -0；它们在加法、普通显示和严格相等中大多表现相同，但某些运算能观察符号，例如 1 / +0 得到 Infinity，1 / -0 得到 -Infinity。Object.is 采用 SameValue，规范在两个操作数都为零时进一步比较它们是否具有相同符号，所以返回 false。严格相等与 SameValueZero 则把正负零视为相等。负零常来自向零舍入或带符号计算；只有当符号影响方向、数值算法或序列化决策时才需要特别保留。

**代码 / 场景：**

除法结果证明两个零的符号可观察；三种比较方式随后给出不同答案。

~~~js
const positive = +0
const negative = -0
console.log(1 / positive) // Infinity
console.log(1 / negative) // -Infinity
console.log(Object.is(positive, negative)) // false
console.log(positive === negative) // true
console.log([positive].includes(negative)) // true，includes 使用 SameValueZero
~~~

是否区分零的符号，应根据调用场景选择对应比较语义。

**递进追问：**

1. **如何可靠检测一个值是负零？**

   可使用 Object.is(value, -0)，它直接表达 SameValue 语义；传统的 value === 0 && 1 / value === -Infinity 也能检测但可读性更差。

2. **JSON 序列化会保留负零吗？**

   JSON.stringify(-0) 通常输出字符串 0，符号信息会丢失；若领域模型必须保留方向，应使用单独字段或自定义字符串编码。

**易错点：**

- 控制台经常把负零显示得像普通零，不能仅凭格式化文本判断底层符号是否存在。
- Map、Set 和 includes 使用 SameValueZero，不会把 +0 与 -0 当作两个不同键或元素。

**参考来源：**

- [ECMAScript：Object.is](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.is)
- [MDN：Object.is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
- [IEEE 754-2019](https://standards.ieee.org/ieee/754/6210/)

校验日期：2026-07-20

# JavaScript 11-20：隐式转换与相等比较

## Q11：Boolean('false') 的结果是什么？

- A. false
- B. true
- C. undefined
- D. 抛出异常

**答案：B**

**短回答：**

非空字符串都是真值，字符串内容是不是 false 不影响转换结果。

**原理：**

结果是 true。Boolean 转换字符串时只检查字符串长度，不解析其中的自然语言含义；唯一的假值字符串是空字符串，包含字符的 false、0、空格与 no 都是真值。规范的 ToBoolean 对 undefined、null、+0、-0、NaN、0n 和空字符串返回 false，其他原始值以及所有对象返回 true。因而表单、查询参数和环境变量中的文本布尔值不能直接交给 Boolean 判断，应先定义接受的词法，例如只允许 true 与 false，再显式比较或解析。new Boolean(false) 还会创建对象，对象本身同样是真值，更不适合作为布尔值容器。

**代码 / 场景：**

下面把字符串内容与长度分开观察，并展示文本配置应采用显式解析。

~~~js
console.log(Boolean('false')) // true
console.log(Boolean('0')) // true
console.log(Boolean(' ')) // true
console.log(Boolean('')) // false

function parseBoolean(text) {
  if (text === 'true') return true
  if (text === 'false') return false
  throw new TypeError('expected true or false')
}
console.log(parseBoolean('false')) // false
~~~

显式解析还能拒绝拼写错误，而 Boolean 会把任何非空错误文本都视为 true。

**递进追问：**

1. **哪些 JavaScript 值属于假值？**

   规范中的假值包括 false、undefined、null、+0、-0、NaN、0n 与空字符串；普通对象和数组即使内容为空也始终是真值。

2. **为什么 new Boolean(false) 放进 if 仍会进入分支？**

   new Boolean 返回包装对象，ToBoolean 对所有普通对象都返回 true；其内部包装的 false 只有调用 valueOf 时才取出，条件判断不会自动采用它。

**易错点：**

- 不要用 Boolean 解析接口或环境变量中的文本布尔值，非空错误文本也会被视为 true。
- 空数组与空对象都是真值，不能依据容器是否有内容直接使用 if (container) 判断。

**参考来源：**

- [ECMAScript：ToBoolean](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toboolean)
- [MDN：Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

校验日期：2026-07-20

## Q12：[] == false 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**短回答：**

宽松相等会发生类型转换：空数组先转为空字符串，再转为数值 0；false 也转为 0。

**原理：**

结果是 true，但来自多步抽象相等转换，不表示数组在条件中是假值。比较对象 [] 与布尔值 false 时，Abstract Equality Comparison 先把 false 转成 Number 0；随后因另一侧是对象，对空数组执行 ToPrimitive。数组先尝试 valueOf 得到的仍是对象，再通过 toString 得到空字符串；空字符串与数字比较时又执行 ToNumber，结果是 +0。最终变成 0 与 0 的数值比较，因此返回 true。若写 if ([])，走的是 ToBoolean，所有数组对象都是真值。宽松相等的转换路径依赖双方类型，工程代码通常应使用严格相等并显式转换。

![宽松相等比较中的 JavaScript 类型转换步骤图](/content/diagrams/javascript/type-coercion-v1.svg "先做 ToPrimitive 与数值转换，再比较最终值；不要凭表面类型猜结果。")

**代码 / 场景：**

把规范步骤逐项写出，可验证宽松相等与条件真假使用了不同抽象操作。

~~~js
console.log([] == false) // true
console.log(Boolean([])) // true

console.log([].toString()) // 空字符串
console.log(Number([].toString())) // 0
console.log(Number(false)) // 0
console.log(0 === 0) // true
~~~

第一个 true 不能推导出数组是假值；第二行直接证明空数组对象仍为真值。

**递进追问：**

1. **[1] == true 的结果如何推导？**

   true 先转为 1，[1] 经 ToPrimitive 得到字符串 1，再转为数字 1，最终 1 == 1 为 true；多元素数组通常转成带逗号字符串后得到 NaN。

2. **什么时候可以有意使用 == null？**

   若目标是同时匹配 null 与 undefined，value == null 是规则明确的惯用法且不会匹配其他假值；团队应通过 lint 例外和注释限定用途。

**易错点：**

- 不要把 [] == false 的结果用于解释 if ([])，前者执行抽象相等，后者执行 ToBoolean。
- 记忆个别宽松相等答案不可靠，应按布尔转换、对象转原始值和数值转换顺序推导。

**参考来源：**

- [ECMAScript：IsLooselyEqual](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal)
- [MDN：Equality operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality)

校验日期：2026-07-20

## Q13：[] + [] 的结果是什么？

- A. []
- B. 0
- C. 空字符串
- D. NaN

**答案：C**

**短回答：**

加号两侧的空数组都会转成空字符串，因此结果也是空字符串。

**原理：**

结果是空字符串。二元加号先分别对两个操作数执行 ToPrimitive；空数组的默认原始值转换会先尝试 valueOf，但它仍返回数组对象，于是继续调用数组的 toString，空数组连接零个元素得到空字符串。加号只要发现任一原始操作数是字符串，就选择字符串拼接，而不是数值加法，因此两个空字符串拼接后仍是空字符串。这里没有数组连接语义；数组拼接应使用 concat 或展开语法。若数组含元素，它的字符串转换采用逗号连接，嵌套、null 和 undefined 还会产生容易误判的文本，所以不应依赖加号序列化数组。

**代码 / 场景：**

用 JSON.stringify 包裹输出能让不可见的空字符串显式显示为两个引号。

~~~js
const left = []
const right = []
const result = left + right
console.log(typeof result) // 'string'
console.log(JSON.stringify(result)) // '""'
console.log([1, 2] + [3, 4]) // '1,23,4'
console.log([1, 2].concat([3, 4])) // [1, 2, 3, 4]
~~~

第三个结果是两段数组字符串拼接，不是四个数字组成的新数组。

**递进追问：**

1. **为什么空数组的 ToPrimitive 会得到空字符串？**

   普通数组继承的 valueOf 返回对象本身，未得到原始值；随后 Array.prototype.toString 调用 join，空数组没有元素，join 的结果就是空字符串。

2. **如何正确合并两个数组？**

   使用 left.concat(right) 或 [...left, ...right] 创建第一层新数组；二者都不会深拷贝对象元素，若需要深复制还要另行定义策略。

**易错点：**

- 二元加号没有数组拼接分支，看到数组操作数也会先转原始值再决定数值相加或字符串拼接。
- 控制台直接打印空字符串不明显，排查转换问题时可用 JSON.stringify 或同时打印 typeof。

**参考来源：**

- [ECMAScript：The Addition Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-addition-operator-plus)
- [MDN：Addition operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition)
- [MDN：Array.prototype.toString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toString)

校验日期：2026-07-20

## Q14：[] + {} 作为表达式执行时通常得到什么？

- A. 0
- B. '[object Object]'
- C. []
- D. NaN

**答案：B**

**短回答：**

空数组转为空字符串，普通对象转为字符串 [object Object]，随后进行字符串拼接。

**原理：**

在题目明确作为表达式求值时，结果通常是字符串 [object Object]。加号先将空数组转为原始值空字符串；普通对象按默认提示转换时，valueOf 仍返回对象本身，随后继承的 Object.prototype.toString 返回 [object Object]。任一操作数是字符串后，加号执行字符串拼接，因而得到该文本。需要留意语法上下文：旧示例常写 {} + [] 作为一条语句，开头花括号可能被解析为空块，后面的 +[] 则是一元加号，结果变成 0；而 [] + {} 从数组表达式开始没有这项歧义。在控制台或压缩代码中讨论结果时应明确括号与上下文。

**代码 / 场景：**

括号强制两侧都按表达式解析，随后分解每一步的原始值转换。

~~~js
const result = ([] + {})
console.log(result) // '[object Object]'
console.log([].toString()) // ''
console.log(({}).valueOf()) // 仍是对象
console.log(({}).toString()) // '[object Object]'

console.log(({} + [])) // '[object Object]'，括号消除块语句歧义
~~~

实际工程不要使用这种隐式序列化；对象文本应通过明确格式化或 JSON 规则生成。

**递进追问：**

1. **为什么 {} + [] 有时显示为 0？**

   在某些脚本语句上下文中，开头的 {} 被解析为空块，不再是对象操作数，剩余 +[] 是一元加号，把空数组转为数值 0；加括号可消除歧义。

2. **自定义对象如何影响加号转换结果？**

   对象可提供 Symbol.toPrimitive，或通过 valueOf、toString 返回原始值；加号会使用该结果，再根据是否出现字符串决定拼接还是数值运算。

**易错点：**

- 必须说明“作为表达式”的语法前提，忽略块语句解析会让看似相同的控制台示例出现不同答案。
- 普通对象的 [object Object] 不是 JSON，不能用于持久化、网络传输或稳定对象标识。

**参考来源：**

- [ECMAScript：The Addition Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-addition-operator-plus)
- [ECMAScript：ToPrimitive](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toprimitive)
- [MDN：Addition operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition)

校验日期：2026-07-20

## Q15：Number('') 的结果是什么？

- A. NaN
- B. undefined
- C. 0
- D. null

**答案：C**

**短回答：**

Number 会先处理空白，空字符串转换为数值 0。

**原理：**

结果是正零。Number 作为转换函数时对字符串执行 StringToNumber：先按数值字符串语法处理前后空白；空字符串或只含空白的字符串在该转换中产生 +0，而不是 NaN。若有非空内容，则必须整体符合受支持的数值文本语法，例如十进制、指数或特定进制前缀，否则结果为 NaN。这个行为意味着仅用 Number.isNaN(Number(input)) 验证必填数字会错误接受空白输入，表单层必须先检查修剪后的字符串是否为空。Number 与 parseInt 也不同，后者解析允许的整数前缀并在无效字符处停止，不能随意互换。

**代码 / 场景：**

空文本与带尾随字符文本分别揭示 Number 的整体转换规则，以及必填校验为何要先检查空白。

~~~js
console.log(Number('')) // 0
console.log(Number('   ')) // 0
console.log(Number('12px')) // NaN
console.log(Number('0x10')) // 16

function requiredNumber(text) {
  if (text.trim() === '') throw new TypeError('required')
  const value = Number(text)
  if (!Number.isFinite(value)) throw new TypeError('invalid number')
  return value
}
console.log(requiredNumber(' 12 ')) // 12
~~~

先处理必填语义，再执行数值转换，才能区分空值和真正的数字零。

**递进追问：**

1. **Number 与 parseInt 解析 12px 有何不同？**

   Number 要求整个非空字符串符合数值语法，因此得到 NaN；parseInt 从左侧解析整数前缀，读到 p 时停止并返回已经得到的 12。

2. **Number(null) 与 Number(undefined) 分别是什么？**

   ToNumber 将 null 转为 +0，将 undefined 转为 NaN；这再次说明不同“空值”进入数值转换时语义不同，接口应先做类型检查。

**易错点：**

- 空字符串转换为 0 会让必填数字校验误通过，必须在 Number 转换前单独拒绝空白。
- parseInt 的宽松前缀解析不适合验证完整数字文本，接受尾随字符可能掩盖用户输入错误。

**参考来源：**

- [ECMAScript：Number Constructor](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number-constructor)
- [ECMAScript：StringToNumber](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-stringtonumber)
- [MDN：Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number)

校验日期：2026-07-20

## Q16：parseInt('12px', 10) 的结果是什么？

- A. NaN
- B. 12
- C. '12'
- D. 0

**答案：B**

**短回答：**

parseInt 从左向右解析整数，遇到无法解析的字符时停止。

**原理：**

结果是数值 12。parseInt 先把输入转换为字符串并去掉开头空白，再处理正负号和 radix。radix 明确为 10 时，只接受十进制数字；它从左到右累积合法数字，遇到第一个不属于该进制的字符 p 就停止，只要此前至少解析到一个数字便返回该整数。若第一个有效位置就是非法字符，则返回 NaN。parseInt 的职责是读取整数前缀，不是验证整个字符串是否为纯整数，所以 12px 能成功并不表示输入格式完全合法。严格表单校验可先用正则或专门解析器验证完整文本，再调用 Number；处理小数时也不应依赖 parseInt 截断。

**代码 / 场景：**

四个输入展示“合法前缀”“起始非法”“小数截断”和不同进制，便于建立完整解析模型。

~~~js
console.log(parseInt('12px', 10)) // 12
console.log(parseInt('px12', 10)) // NaN
console.log(parseInt('12.9', 10)) // 12
console.log(parseInt('101', 2)) // 5

function parseWholeInteger(text) {
  if (!/^[+-]?\d+$/.test(text.trim())) throw new TypeError('invalid integer')
  return Number(text)
}
console.log(parseWholeInteger('-42')) // -42
~~~

严格函数先验证整个字符串，因此不会把单位或小数部分静默丢弃。

**递进追问：**

1. **为什么仍建议显式传 radix？**

   显式 radix 能准确表达预期进制并避免读者猜测前缀规则；尤其解析外部文本时，调用方应把十进制或其他进制作为接口契约的一部分。

2. **parseInt(1e21, 10) 是否可靠？**

   parseInt 会先把非字符串参数转成字符串，大数可能变成指数表示，再只读取开头部分，结果可能意外；对已有 Number 应使用 Math.trunc 等数值方法。

**易错点：**

- parseInt 成功只证明存在可解析整数前缀，不证明整个输入字符串都是合法整数。
- 不要用 parseInt 处理本来已经是 Number 的截断需求，字符串化可能引入指数表示等边界。

**参考来源：**

- [ECMAScript：parseInt](https://tc39.es/ecma262/multipage/global-object.html#sec-parseint-string-radix)
- [MDN：parseInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt)

校验日期：2026-07-20

## Q17：全局 isNaN('hello') 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**短回答：**

全局 isNaN 会先把参数转成 Number，'hello' 转换后是 NaN。它与不转换类型的 Number.isNaN 不同。

**原理：**

结果是 true。全局 isNaN 的算法先对参数执行 ToNumber，再检查转换结果是否为 NaN；字符串 hello 不符合数值字符串语法，ToNumber 得到 NaN，于是最终返回 true。该 API 回答的更接近“这个值经过数值强制转换后是否会成为 NaN”，而不是“这个值本身是否就是数值 NaN”。因此它会对空字符串返回 false，因为空字符串转为 0，也会对某些布尔值返回 false。需要检查计算结果时应使用 Number.isNaN；需要接收文本数字时，应先验证输入类型和格式、显式 Number 转换，再用 Number.isFinite 或 Number.isNaN 判断。

**代码 / 场景：**

同一组输入同时交给全局 isNaN 与 Number.isNaN，可以看到隐式转换造成的差异。

~~~js
console.log(isNaN('hello')) // true
console.log(Number.isNaN('hello')) // false
console.log(isNaN('')) // false，因为 Number('') 是 0
console.log(isNaN(false)) // false，因为 Number(false) 是 0

const converted = Number('hello')
console.log(Number.isNaN(converted)) // true
~~~

显式转换版本把转换边界写在代码中，更便于审查空值和格式规则。

**递进追问：**

1. **全局 isNaN 与 Number.isNaN 应如何选择？**

   验证一个已经完成计算的 Number 时选 Number.isNaN；只有确实想询问 ToNumber 后是否为 NaN，且理解空值转换规则时才使用全局 isNaN。

2. **为什么验证数字通常更适合 Number.isFinite？**

   Number.isFinite 同时要求参数本身是 Number，并排除 NaN、Infinity 与 -Infinity；多数业务字段需要有限数值而不只是“不是 NaN”。

**易错点：**

- 全局 isNaN 返回 false 不代表原值类型是数字，空字符串和 false 都会先转换成 0。
- 不要让隐式 ToNumber 代替表单格式校验，否则空白、布尔值等输入可能被意外接受。

**参考来源：**

- [ECMAScript：isNaN](https://tc39.es/ecma262/multipage/global-object.html#sec-isnan-number)
- [MDN：isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN)
- [MDN：Number.isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)

校验日期：2026-07-20

## Q18：'5' - 2 的结果是什么？

- A. '52'
- B. 3
- C. NaN
- D. '3'

**答案：B**

**短回答：**

减号只执行数值运算，会把字符串 '5' 转为数字 5。

**原理：**

结果是数值 3。减法运算没有字符串拼接分支，它会对两个操作数执行 ToNumeric。字符串 5 先通过 ToPrimitive 保持字符串，再按 Number 数值语法转换为 5；右侧本来就是 Number 2，两个数值类型一致，于是执行 Number 减法得到 3。若字符串不能完整转换为数字，结果通常为 NaN；空字符串则会转换为 0。对象操作数还可能通过 Symbol.toPrimitive、valueOf 或 toString 参与转换。BigInt 与 Number 不能混合减法，会抛 TypeError，因此“减号总能把任何东西变成数字”也不是准确结论。

**代码 / 场景：**

输出覆盖正常文本数字、非法文本、空文本和 BigInt 混用，展示 ToNumeric 的主要边界。

~~~js
const value = '5' - 2
console.log(value, typeof value) // 3 number
console.log('5px' - 2) // NaN
console.log('' - 2) // -2
try {
  console.log(5n - 2)
} catch (error) {
  console.log(error.name) // 'TypeError'
}
~~~

文本输入能参与减法不代表它已通过业务格式验证，转换应尽量显式。

**递进追问：**

1. **为什么减号与加号处理字符串不同？**

   加号在 ToPrimitive 后若任一侧是字符串就执行拼接；减号只定义数值运算路径，对操作数执行 ToNumeric，不存在字符串相减语义。

2. **如何避免接口文本数字被隐式转换掩盖错误？**

   在数据边界先检查类型与完整格式，显式调用 Number，并用 Number.isFinite 验证；领域层只接收已规范化的 Number，避免散落隐式转换。

**易错点：**

- 空字符串在数值转换中是 0，直接用减法校验必填输入可能把缺失值当作合法零。
- 运算得到 NaN 通常不会立刻抛异常，它会继续传播，必须在数据边界主动检查。

**参考来源：**

- [ECMAScript：The Subtraction Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-subtraction-operator-minus)
- [ECMAScript：ToNumeric](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumeric)
- [MDN：Subtraction operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Subtraction)

校验日期：2026-07-20

## Q19：'5' + 2 的结果是什么？

- A. 7
- B. '7'
- C. '52'
- D. NaN

**答案：C**

**短回答：**

加号遇到字符串会执行字符串拼接，因此数字 2 被转成字符串。

**原理：**

结果是字符串 52。二元加号是算术加法与字符串拼接共用的运算符：先按从左到右顺序求值两侧并执行 ToPrimitive；只要任一原始结果是 String，就把另一侧也执行 ToString 后拼接。左侧已经是字符串 5，所以右侧 Number 2 被转换为字符串 2，最终产生 52，而不会先把 5 转成数字。若两侧都不是字符串，则执行 ToNumeric，并要求 Number 与 BigInt 类型匹配。连续加号还受左结合影响，例如 1 + 2 + 3 先得到数值 3 再拼接为 33，而 1 + (2 + 3) 会先得到字符串 23 再变成 123。

**代码 / 场景：**

除基本结果外，两个分组示例说明转换发生在每一次加号，而不是整条表达式最后统一决定。

~~~js
const result = '5' + 2
console.log(result, typeof result) // '52' string
console.log(1 + 2 + '3') // '33'
console.log(1 + (2 + '3')) // '123'
console.log(Number('5') + 2) // 7
~~~

若业务语义是数值相加，应在边界显式转换并验证，而不是依赖运算符猜测。

**递进追问：**

1. **为什么 1 + 2 + 3 与 1 + (2 + 3) 结果不同？**

   二元加号逐次求值并且左结合；前者先做数值 1 + 2，再与字符串拼接，后者括号内先出现字符串并拼接，外层继续拼接。

2. **模板字符串是否也会执行字符串转换？**

   会。插值表达式先求值得到值，再按字符串模板规则转换为文本；对象可能触发自定义原始值转换，因此序列化结构仍应使用明确方法。

**易错点：**

- 不要把加号遇到数字就理解成数值运算，字符串分支在 ToPrimitive 后具有决定性。
- 用一元加号或 Number 强制转换前必须处理 BigInt 和非法文本，否则可能抛错或得到 NaN。

**参考来源：**

- [ECMAScript：The Addition Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-addition-operator-plus)
- [MDN：Addition operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition)

校验日期：2026-07-20

## Q20：null == undefined 与 null === undefined 的结果分别是什么？

- A. 都是 true
- B. 都是 false
- C. true、false
- D. false、true

**答案：C**

**短回答：**

宽松相等规则中特别规定 null 与 undefined 相等；严格相等还会比较类型，因此为 false。

**原理：**

结果分别是 true 与 false。抽象相等比较对 null 和 undefined 设有明确的专门分支：一侧为 null、另一侧为 undefined 时直接返回 true，不会先把它们都转换成数字或布尔值；同时 null 与其他类型一般不会通过这条规则相等，例如 null == 0 为 false。严格相等不执行类型转换，Null 与 Undefined 是不同 ECMAScript 类型，因此立即返回 false。这个差异让 value == null 成为少数可控的宽松相等惯用法，用于一次匹配两种空值；若接口需要区分“显式为空”和“缺失”，则必须分别使用 === null 与 === undefined。

**代码 / 场景：**

额外比较 0 可证明 null 与 undefined 的宽松相等不是把两者统一转成数字零。

~~~js
console.log(null == undefined) // true
console.log(null === undefined) // false
console.log(null == 0) // false
console.log(undefined == 0) // false

function isNullish(value) {
  return value == null
}
console.log(isNullish(null), isNullish(undefined), isNullish(0))
// true true false
~~~

若采用该惯用法，应把函数命名和 lint 例外限制在“空值合并”这个明确意图中。

**递进追问：**

1. **value == null 会不会匹配 false 或空字符串？**

   不会。null 与 undefined 的抽象相等分支只互相匹配，不会继续转为 0；false、空字符串和 0 都不满足这条空值规则。

2. **空值合并运算符与 value == null 有何关系？**

   value ?? fallback 同样只在 value 为 null 或 undefined 时采用后备值，但它返回具体值而非布尔判断，且不会替换 0、false 或空字符串。

**易错点：**

- 不要把结果解释成 null 与 undefined 都先转成 0；规范为这两个类型设置了直接匹配规则。
- 接口若需要区分“字段缺失”和“字段明确清空”，使用宽松空值判断会丢失重要状态。

**参考来源：**

- [ECMAScript：IsLooselyEqual](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal)
- [ECMAScript：IsStrictlyEqual](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isstrictlyequal)
- [MDN：Equality operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality)

校验日期：2026-07-20

# JavaScript 21-30：作用域、提升与闭包

## Q21：var 声明的变量主要具有什么作用域？

- A. 块级作用域
- B. 函数作用域
- C. 类作用域
- D. 模块外作用域

**答案：B**

**短回答：**

var 不受普通代码块限制，但会受到函数边界限制；let 和 const 才具有块级作用域。

**原理：**

var 主要具有函数作用域：在普通函数体中的任意 var 声明都归属于该函数的 VariableEnvironment，if、for、while 等普通花括号块不会为它创建新绑定；因此块内声明可在同一函数的块外访问。执行函数体前，var 绑定已在声明实例化阶段创建并初始化为 undefined，赋值仍要等控制流到达。若 var 位于浏览器经典脚本顶层，它属于全局环境并通常形成全局对象属性；位于 ES 模块顶层则受模块作用域约束。catch 参数与函数参数等名称冲突还有专门规则，所以“var 永远是全局变量”是错误说法。

**代码 / 场景：**

if 块没有限制 local 的可见性，但函数边界阻止它泄漏到外部。

~~~js
function inspect(flag) {
  console.log(local) // undefined，绑定已经建立
  if (flag) {
    var local = 'inside block'
  }
  console.log(local) // 'inside block'
}
inspect(true)
try { console.log(local) } catch (error) {
  console.log(error.name) // 'ReferenceError'
}
~~~

声明提升解释第一行 undefined，函数作用域解释最后一行在函数外不可见。

**递进追问：**

1. **var 与 let 在 for 循环中的闭包行为为何不同？**

   var 的循环变量是函数级单一绑定，所有回调共享它；let 的 for 语义会为每次迭代创建新绑定，使每个回调捕获对应轮次的值。

2. **重复 var 声明会发生什么？**

   同一作用域内重复 var 通常复用既有绑定而不报错，但赋值仍按顺序执行；这种宽松行为容易掩盖重名，现代代码更适合 let 或 const。

**易错点：**

- var 不受普通代码块限制，但仍受函数边界限制，不能简单称为“全局作用域变量”。
- 提升只提前创建并初始化绑定，右侧赋值和副作用不会提前执行。

**参考来源：**

- [ECMAScript：Variable Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement)
- [MDN：var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)

校验日期：2026-07-20

## Q22：在 let 声明前访问变量会发生什么？

- A. 得到 undefined
- B. 得到 null
- C. 抛出 ReferenceError
- D. 自动声明为全局变量

**答案：C**

**短回答：**

从作用域开始到声明语句执行前属于暂时性死区，变量存在但不能访问。

**原理：**

在同一词法作用域中、执行到 let 声明初始化之前读取该变量，会抛出 ReferenceError。进入作用域时，引擎已经在声明式环境记录中创建这个绑定，所以名称解析会命中它而不会回退到外层同名变量；但绑定状态仍是 uninitialized，GetBindingValue 必须拒绝读取。从作用域开始到初始化完成的区间称为暂时性死区。let 的“提升”若仅指绑定提前创建是存在的，但它不像 var 那样立即初始化为 undefined。typeof 对处于暂时性死区的绑定也会抛错，因为这是已解析但未初始化的引用，不属于“从未声明变量”的安全特例。

**代码 / 场景：**

外层 value 不会被读取；内层 let 从块开始已经遮蔽它，并在声明前处于暂时性死区。

~~~js
const value = 'outer'
{
  try {
    console.log(value)
  } catch (error) {
    console.log(error.name) // 'ReferenceError'
  }
  let value = 'inner'
  console.log(value) // 'inner'
}
~~~

错误不是因为变量不存在，而是当前块绑定尚未完成初始化。

**递进追问：**

1. **let 到底是否会提升？**

   若提升指进入作用域时创建绑定，则会；但绑定保持未初始化，声明前读取报错。面试中应解释创建与初始化两阶段，而不是只回答会或不会。

2. **typeof 为什么不能安全检测暂时性死区变量？**

   typeof 的特殊 undefined 结果仅适用于无法解析的引用；暂时性死区名称已经解析到未初始化绑定，访问检查会先抛 ReferenceError。

**易错点：**

- 不要说 let 声明前变量完全不存在；绑定已存在并遮蔽外层，只是尚未初始化。
- 把 TDZ 错误回答成 undefined 会混淆 var 的初始化行为与 let 的词法绑定行为。

**参考来源：**

- [ECMAScript：Let and Const Declarations](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations)
- [MDN：let and temporal dead zone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz)

校验日期：2026-07-20

## Q23：闭包是什么？

- A. 自动关闭浏览器窗口
- B. 函数和其词法环境的组合
- C. 一个 Promise
- D. 一种数组方法

**答案：B**

**短回答：**

内部函数即使离开外部函数执行环境，仍可访问定义时捕获的外层变量，这种能力来自闭包。

**原理：**

闭包是一个函数与其创建时可访问的词法环境之间的组合。创建函数对象时，内部 [[Environment]] 槽保存当前环境记录；函数以后即使在另一个调用位置执行，标识符仍沿该保存的环境链解析。若外层函数已经返回，但内部函数仍可达，相关环境和其中被捕获的绑定会继续存活，因此可以实现私有状态、函数工厂和回调上下文。闭包捕获的是绑定而不是创建瞬间的值快照：多个函数可以共享同一绑定，并观察后续修改。引擎可能优化未使用变量，但语义上仍必须保持所有可观察结果一致。

**代码 / 场景：**

increment 与 read 共享同一个 count 绑定；外层 createCounter 返回后，状态仍持续存在。

~~~js
function createCounter() {
  let count = 0
  return {
    increment() { count += 1; return count },
    read() { return count }
  }
}

const counter = createCounter()
console.log(counter.increment()) // 1
console.log(counter.increment()) // 2
console.log(counter.read()) // 2
~~~

外部不能直接访问 count，却能通过两个闭包维护的受控接口观察同一状态。

**递进追问：**

1. **闭包捕获的是值还是变量绑定？**

   通常应理解为捕获词法环境中的绑定；绑定后续被修改时，所有引用该绑定的闭包会看到新值，而不是各自保存最初值快照。

2. **闭包为什么可能造成内存长期占用？**

   只要闭包仍可达，它依赖的环境也必须保留；若闭包被长生命周期监听器或缓存引用，环境中可达的大对象就无法回收，应及时解除引用。

**易错点：**

- 闭包不是只有“函数返回函数”才存在，任何函数都携带定义时的词法环境，只是有时不明显。
- 不要默认每个闭包都有独立状态；同一次外层调用创建的多个闭包可能共享同一绑定。

**参考来源：**

- [ECMAScript：Function Objects and Environment](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinary-function-objects)
- [MDN：Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)

校验日期：2026-07-20

## Q24：用 let 循环三次，并在定时器中输出循环变量，通常输出什么？

- A. 3、3、3
- B. 0、1、2
- C. undefined 三次
- D. 抛出异常

**答案：B**

**短回答：**

for 循环中的 let 会为每次迭代创建新的块级绑定，定时器分别捕获对应值。

**原理：**

通常依次输出 0、1、2。for 语句的初始化若使用 let，规范会为迭代变量建立词法绑定，并在每轮继续下一次迭代前创建新的 per-iteration environment，把上一轮值复制后再执行更新表达式。每次定时器回调创建时保存当轮环境，因此三个回调分别解析到三个不同的 i 绑定。同步循环会先完成，定时器任务之后才有机会运行，但绑定不会因此都变成最终值。实际延迟时间只规定最早可调度时机，页面任务队列可能让回调更晚执行；在同一来源、同一延迟下通常保持注册顺序，不过核心答案是捕获值分别为 0、1、2。

**代码 / 场景：**

同步日志先出现，随后三个回调读取各自的迭代绑定，而不是共享循环结束后的变量。

~~~js
for (let i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0)
}
console.log('scheduled')
// 先输出 scheduled，随后通常输出 0、1、2
~~~

零毫秒不是立即执行；它只是让任务在当前调用栈结束后尽早进入可执行阶段。

**递进追问：**

1. **如果循环体内修改 i，闭包会看到什么？**

   回调读取的是该轮环境中绑定的最终状态，不是进入循环体瞬间的值快照；循环体对当轮 i 的修改会影响该轮回调和后续更新逻辑。

2. **for...of 使用 const 也能让回调分别捕获值吗？**

   可以。for...of 每次迭代都会为 const 声明建立新的绑定，回调分别捕获各轮元素；const 只禁止该轮绑定重新赋值。

**易错点：**

- setTimeout 的零延迟不表示同步调用，当前循环和调用栈一定先执行完成。
- 不要解释为回调复制了数值，准确机制是每轮创建独立词法绑定并被闭包引用。

**参考来源：**

- [ECMAScript：For Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-for-statement)
- [MDN：Closures in loops](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures#creating_closures_in_loops_a_common_mistake)
- [HTML Standard：Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

校验日期：2026-07-20

## Q25：用 var 循环三次，并在定时器中输出循环变量，通常输出什么？

- A. 0、1、2
- B. 3、3、3
- C. undefined 三次
- D. 只输出 3 一次

**答案：B**

**短回答：**

var 只有一个函数级绑定，定时器执行时循环已经结束，变量值为 3。

**原理：**

通常输出 3、3、3。var i 在所在函数或全局环境中只建立一个共享绑定，普通 for 循环不会为每轮创建新的词法环境。三次执行循环体时生成的箭头函数都闭包引用这同一个 i。同步循环完成后更新表达式已把 i 增加到 3，条件检查失败才退出；定时器回调随后作为任务执行，每次沿相同环境链读取 i，得到的都是当前值 3。这个结果同时依赖闭包捕获绑定和定时器异步调度，而不是 var 把 3 复制给每个回调。修复可改用 let，或显式创建函数调用来产生每轮独立参数绑定。

**代码 / 场景：**

第一段共享一个 var 绑定；第二段通过函数参数为每轮创建独立绑定，输出形成对照。

~~~js
for (var i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0)
}
// 通常输出 3、3、3

for (var j = 0; j < 3; j += 1) {
  ((captured) => {
    setTimeout(() => console.log(captured), 0)
  })(j)
}
// 随后通常输出 0、1、2
~~~

立即调用函数的参数 captured 每次都是新绑定，因此不再共享 j。

**递进追问：**

1. **把 setTimeout 延迟改成很大能改变 3、3、3 吗？**

   不会改变共享绑定机制；只要回调在循环完成后执行，读取的仍是最终值 3。延迟只影响执行时机，不会自动创建每轮绑定。

2. **除了改 let，还有哪些修复方法？**

   可用 IIFE 或辅助函数把当轮值作为参数传入，创建独立函数调用环境；部分定时器 API 也支持额外实参，但可移植性应查目标平台。

**易错点：**

- 问题不是定时器把变量缓存错了，而是所有闭包都引用同一个函数级 var 绑定。
- 在全局经典脚本中使用 var 还可能污染全局对象，修复循环时也应一并收紧作用域。

**参考来源：**

- [ECMAScript：Variable Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement)
- [MDN：Closures in loops](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures#creating_closures_in_loops_a_common_mistake)
- [HTML Standard：Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

校验日期：2026-07-20

## Q26：JavaScript 采用哪种作用域规则？

- A. 动态作用域
- B. 词法作用域
- C. 数据库作用域
- D. 随机作用域

**答案：B**

**短回答：**

变量能访问哪里由代码定义位置决定，而不是由函数在哪里被调用决定。

**原理：**

JavaScript 采用词法作用域，也称静态作用域。函数创建时会保存定义位置对应的外层词法环境；执行代码时，let、const、参数、函数声明等绑定被放入环境记录，并通过 Outer 指针连成作用域链。求值一个标识符时，引擎从当前环境记录向外逐层查询，找到后停止，链尾仍未找到才抛出 ReferenceError。把函数传到另一个函数中调用并不会改写它保存的定义环境，所以调用者的同名局部变量不能动态接管该标识符。with 和直接 eval 会增加解析复杂度，但不代表语言改用动态作用域。

**代码 / 场景：**

下面的 readName 虽在 run 内执行，却仍读取定义位置外层的 name；输出可直接证明查找依据不是调用栈。

~~~js
const name = 'outer'
function readName() { return name }
function run() {
  const name = 'caller'
  return readName()
}
console.log(run()) // 'outer'
~~~

readName 创建时保存全局词法环境，run 的局部环境不在它的外层环境链上，因此 caller 不会被返回。

**递进追问：**

1. **闭包与词法作用域是什么关系？**

   闭包就是函数与其创建时词法环境的组合。即使外层函数已经返回，只要内部函数仍可达，被捕获的环境记录就会继续存活，并按定义位置解析变量。

2. **为什么说 JavaScript 不是动态作用域？**

   若是动态作用域，变量会沿当前调用者链查找，run 中的 caller 就可能被 readName 看到；实际结果由源代码嵌套结构决定，调用位置不能改变该链。

**易错点：**

- 不要把函数在哪里执行误当成作用域来源，普通函数的调用者不会成为它的词法外层。
- 全局对象属性与全局词法绑定不是完全相同的概念，尤其在浏览器经典脚本和模块之间。

**参考来源：**

- [ECMAScript：Lexical Environments](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-lexical-environments)
- [MDN：Scope](https://developer.mozilla.org/en-US/docs/Glossary/Scope)

校验日期：2026-07-20

## Q27：在代码块中使用 let 声明变量，块外访问会怎样？

- A. 正常访问
- B. 得到 undefined
- C. 抛出 ReferenceError
- D. 自动变成 window 属性

**答案：C**

**短回答：**

let 具有块级作用域，离开花括号对应的作用域后不可访问。

**原理：**

let 声明属于其所在的词法块作用域。进入花括号块时，引擎为该块建立新的声明式环境记录，预先创建绑定但保持未初始化；执行到声明语句后才初始化并赋值。块内读取会命中这个绑定，离开块后当前环境恢复到外层，外层作用域链中没有该绑定，因此再次按标识符访问会抛出 ReferenceError，而不是得到 undefined。块内在声明之前访问也会因为暂时性死区抛出 ReferenceError，这与离开块后的“绑定不可见”原因不同。var 不创建同样的块级绑定，所以行为不能类推。

**代码 / 场景：**

同一个变量名在块内有效，块结束后已经不在当前作用域链中；捕获异常可观察精确类型。

~~~js
{
  let token = 'inside'
  console.log(token) // 'inside'
}
try {
  console.log(token)
} catch (error) {
  console.log(error.name) // 'ReferenceError'
}
~~~

这里不是 token 的值变成 undefined，而是外层环境根本解析不到这个绑定。

**递进追问：**

1. **块内声明之前访问 let 为什么也报 ReferenceError？**

   绑定在进入块时已经创建，所以不会退回外层同名变量；但执行声明前仍处于未初始化状态，读取触发暂时性死区检查并抛出 ReferenceError。

2. **for 循环中的 let 为什么适合异步回调？**

   规范会为每次迭代创建新的词法绑定，回调分别闭包捕获各轮的值；var 只有函数级共享绑定，回调执行时通常看到循环结束后的最终值。

**易错点：**

- 不要把 ReferenceError 解释成变量值是 undefined；这是标识符解析失败或绑定尚未初始化。
- 对象字面量的花括号不是声明语句的代码块，作用域边界必须结合语法位置判断。

**参考来源：**

- [ECMAScript：Let and Const Declarations](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations)
- [MDN：let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)

校验日期：2026-07-20

## Q28：const 声明对象后能否修改对象属性？

- A. 不能
- B. 可以
- C. 只能修改一次
- D. 取决于严格模式

**答案：B**

**短回答：**

const 限制的是变量绑定不能重新赋值，并不会自动冻结对象内部属性。

**原理：**

const 约束的是词法环境中“变量名到值”的绑定不可重新赋值，并不递归改变该值所指对象的属性描述符。声明 const user = object 后，绑定 user 始终保存同一个对象引用，因此执行 user.name = value、delete user.name 或调用会修改对象的方法，是否成功仍由该属性的 writable、configurable、访问器以及对象是否可扩展决定；直接执行 user = other 才会在赋值绑定阶段抛出 TypeError。若业务要求对象第一层不可修改，应显式使用 Object.freeze；若要求深层不可变，还需递归冻结或采用不可变数据更新策略。

**代码 / 场景：**

下面先修改对象内部状态，再尝试替换 const 绑定；两个操作分别由属性语义和绑定语义处理。

~~~js
const user = { name: 'Lin', profile: { score: 1 } }
user.name = 'Linda'
user.profile.score += 1
console.log(user) // { name: 'Linda', profile: { score: 2 } }
try { user = {} } catch (error) {
  console.log(error.name) // 'TypeError'
}
~~~

属性更新成功不意味着 const 可以重绑；两者发生在不同层级。

**递进追问：**

1. **Object.freeze 能否让 const 对象完全不可变？**

   Object.freeze 只冻结传入对象自身的第一层属性和扩展能力，嵌套对象仍可修改；要实现深冻结必须遍历对象图，并处理循环引用及特殊内建对象。

2. **为什么通常优先使用 const 声明对象变量？**

   它表达该变量不应被重新指向其他值，减少意外重绑并方便静态分析；对象需要演进时仍可通过受控属性更新或创建新对象表达状态变化。

**易错点：**

- 不要把 const 翻译成“对象常量”，它保证的是绑定稳定，不保证对象内容稳定。
- 冻结对象与 TypeScript 的 readonly 都有各自边界，不能互相替代运行时与编译期约束。

**参考来源：**

- [ECMAScript：Let and Const Declarations](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations)
- [MDN：const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)

校验日期：2026-07-20

## Q29：内层作用域声明了与外层同名变量，这称为什么？

- A. 变量提升
- B. 变量遮蔽
- C. 事件冒泡
- D. 原型继承

**答案：B**

**短回答：**

内层同名变量会遮蔽外层变量，内层代码优先读取自己的绑定。

**原理：**

这种现象称为变量遮蔽。每个词法作用域拥有独立环境记录；解析同名标识符时，引擎总从当前环境开始查询，内层记录一旦存在该名称就停止向外搜索，因此外层绑定在该区域内暂时不可直接通过同一标识符访问，但外层值没有被删除或覆盖。离开内层作用域后，解析起点回到外层，原绑定仍然存在。若内层用 let 或 const 声明，同名绑定从块开始就参与解析，声明前会处于暂时性死区，不能因为尚未初始化便回退读取外层变量。参数、catch 绑定和导入绑定也可能形成遮蔽。

**代码 / 场景：**

三个输出展示遮蔽只改变当前区域的名称解析，不会修改外层绑定。

~~~js
const status = 'outer'
function inspect() {
  const status = 'inner'
  console.log(status) // 'inner'
}
inspect()
console.log(status) // 'outer'
~~~

inspect 内第一次查询就在函数环境中命中 status；函数返回后，全局 status 仍保持 outer。

**递进追问：**

1. **遮蔽与重新赋值有什么区别？**

   遮蔽创建了另一个独立绑定，修改内层变量不会改变外层变量；重新赋值则是在作用域链找到既有绑定后改变它保存的值，没有创建同名绑定。

2. **为什么过度遮蔽会降低可读性？**

   同一个名称在相邻区域代表不同数据，读代码时必须持续判断当前环境记录；重构或移动语句还可能改变解析目标，因此重要领域变量应避免无意义重名。

**易错点：**

- 不要说内层变量覆盖或销毁了外层变量；外层绑定只是被名称查询暂时遮住。
- let 的暂时性死区会阻止回退到外层同名变量，声明前访问不会得到外层值。

**参考来源：**

- [ECMAScript：Lexical Environments](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-lexical-environments)
- [MDN：Scope](https://developer.mozilla.org/en-US/docs/Glossary/Scope)

校验日期：2026-07-20

## Q30：浏览器普通脚本顶层的 var 和 let 有什么差异？

- A. 都一定成为 window 属性
- B. var 通常成为 window 属性，let 不会
- C. let 成为 window 属性，var 不会
- D. 没有任何区别

**答案：B**

**短回答：**

经典脚本中顶层 var 会绑定到全局对象属性，顶层 let 会进入全局词法环境而不是 window 属性。

**原理：**

在浏览器经典 script 的全局代码中，全局环境记录由对象记录与声明式记录组合而成。符合条件的顶层 var 声明进入对象记录，通常在 WindowProxy 所代表的全局对象上形成同名属性，所以既可用标识符读取，也常可用 window.name 读取；顶层 let 则进入全局声明式记录，只能通过标识符解析，不会创建 window 的自有属性。两者都可能供同一 realm 后续经典脚本解析，但属性删除、重复声明和与既有全局属性冲突的规则不同。若代码运行在 ES 模块中，顶层声明属于模块作用域，var 也不会自动成为 window 属性。

**代码 / 场景：**

请在浏览器经典 script 中运行；模块脚本的输出不同，不能混为一谈。

~~~html
<script>
  var legacy = 'v'
  let lexical = 'l'
  console.log(window.legacy) // 'v'
  console.log(window.lexical) // undefined
  console.log(lexical) // 'l'
</script>
~~~

window.lexical 为 undefined 只说明没有对应对象属性，不代表词法绑定不存在。

**递进追问：**

1. **在 type=module 的脚本里顶层 var 会怎样？**

   模块拥有独立的模块环境记录，顶层 var、let、const 和函数声明都不会自动成为 globalThis 或 window 的属性；模块还默认采用严格模式。

2. **为什么不应依赖顶层 var 暴露跨脚本 API？**

   它会污染共享全局命名空间，并可能与浏览器已有属性或其他脚本冲突；应使用 ES 模块显式导出导入，或至少挂到唯一命名空间对象上。

**易错点：**

- 题目限定浏览器普通经典脚本；把该结论直接套到模块、Node.js 或 Web Worker 都不准确。
- window.lexical 为 undefined 不能证明标识符 lexical 不存在，两种查询走的是不同记录。

**参考来源：**

- [ECMAScript：Global Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-global-environment-records)
- [MDN：var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)
- [MDN：let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)

校验日期：2026-07-20

# JavaScript 31-40：函数、参数与 this

## Q31：函数声明能否在声明语句前调用？

- A. 通常可以
- B. 永远不可以
- C. 只在箭头函数中可以
- D. 只在异步函数中可以

**答案：A**

**短回答：**

函数声明会连同函数体一起提升，因此同一作用域中通常可以先调用后声明。

**原理：**

在函数体、模块或全局代码开始逐条求值前，会先执行声明实例化。可提升的函数声明在这一阶段创建函数对象并初始化同名绑定，所以在同一有效作用域内，通常可以在源码声明语句之前调用它；这不同于 var 函数表达式只把变量初始化为 undefined。需要限定“同一有效作用域”：块内函数声明受块级作用域约束，浏览器非严格经典脚本还存在 Annex B 兼容行为；跨模块调用则必须等待模块链接与求值规则。工程代码可以先调用后声明，但仍应按可读性组织，不能把提升理解成源代码真的被移动。

**代码 / 场景：**

调用发生在声明文本之前，但初始化阶段已经把完整函数对象放入当前作用域绑定。

~~~js
console.log(area(3, 4)) // 12

function area(width, height) {
  return width * height
}
~~~

若改为 var area = function (...) {}，声明实例化阶段只有 undefined，提前调用将得到 TypeError。

**递进追问：**

1. **函数声明提升与 var 提升有什么关键差异？**

   函数声明的绑定在实例化阶段直接初始化为可调用函数对象；var 绑定只初始化为 undefined，右侧函数表达式要等执行到赋值语句才产生并写入。

2. **块内函数声明是否可以在块外调用？**

   标准语义下它属于块级作用域，块外不可依赖；浏览器经典非严格脚本可能应用 Annex B 兼容规则，工程代码应避免把这种历史差异作为接口。

**易错点：**

- 提升描述初始化时序，不是引擎把声明文本剪切到文件顶部，控制流仍按原顺序执行。
- 不要把函数声明、函数表达式和箭头函数混为一种初始化规则，它们提前调用的结果不同。

**参考来源：**

- [ECMAScript：Hoistable Declarations](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-hoistabledeclaration)
- [MDN：function declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)

校验日期：2026-07-20

## Q32：var fn = function() {} 在赋值前调用 fn() 会怎样？

- A. 正常执行
- B. fn 为 undefined，调用时抛出 TypeError
- C. 返回 null
- D. 自动等待赋值

**答案：B**

**短回答：**

var 声明会提升，但函数值不会提升。赋值前 fn 的值是 undefined。

**原理：**

var fn = function() {} 同时包含变量声明与运行时赋值。进入当前函数或全局代码时，声明实例化只创建 fn 的 var 绑定并把它初始化为 undefined；匿名或具名函数表达式要等执行流到达右侧时才求值为函数对象，再由赋值把该对象写入 fn。因此提前执行 fn() 时，标识符解析是成功的，不会因找不到变量而抛 ReferenceError，但 Call 求值发现被调用值是 undefined、没有 [[Call]] 内部方法，于是抛 TypeError。若改用 let 或 const，声明前访问会先命中未初始化绑定，错误则是 ReferenceError。

**代码 / 场景：**

捕获错误后继续执行赋值，可以清楚地区分“绑定已存在”与“值尚不可调用”。

~~~js
try {
  fn()
} catch (error) {
  console.log(error.name) // 'TypeError'
}

var fn = function () { return 'ready' }
console.log(fn()) // 'ready'
~~~

第一次失败不是函数体执行失败，而是在进入函数调用前检查可调用性时失败。

**递进追问：**

1. **若改成 const fn = () => {}，提前调用是什么错误？**

   const 绑定从进入作用域开始存在但未初始化，提前读取 fn 就触发暂时性死区并抛 ReferenceError，甚至还未进行“是否可调用”的检查。

2. **具名函数表达式的内部名称在哪里可见？**

   例如 var fn = function inner() {} 中，inner 通常只在函数体自己的环境内可见，便于递归或堆栈命名；外部仍通过变量 fn 引用该函数。

**易错点：**

- 不要回答 ReferenceError；var 绑定已经初始化为 undefined，真正失败的是调用非函数值。
- 变量声明被提前处理不等于右侧函数表达式也提前求值，赋值仍受正常控制流影响。

**参考来源：**

- [ECMAScript：Variable Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement)
- [MDN：function expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/function)

校验日期：2026-07-20

## Q33：默认参数在什么时候生效？

- A. 参数是 null 时
- B. 参数是 undefined 或未传时
- C. 参数是假值时
- D. 参数是 0 时

**答案：B**

**短回答：**

默认参数只在实参为 undefined 时使用，null、false、0 和空字符串都会保留原值。

**原理：**

函数调用建立参数环境时，会按形参从左到右初始化绑定。某个形参没有对应实参，或实参值严格为 undefined，且该形参写有初始化器时，才在本次调用中求值默认表达式；null、false、0、NaN 与空字符串都是明确传入的值，不会触发默认值。默认表达式每次需要时才执行，可以引用已经初始化的左侧参数，却不能安全引用尚未初始化的右侧参数。非简单参数列表还会使用独立参数环境，因此默认表达式不能读取稍后才在函数体内建立的 var 变量。对象或数组作为默认值时也是每次触发都重新创建，不会天然跨调用共享。

**代码 / 场景：**

输出同时覆盖缺省、undefined、null 与惰性求值，能避免把默认参数误解为“所有假值兜底”。

~~~js
let calls = 0
function label(value = (++calls, 'fallback')) { return value }
console.log(label())          // 'fallback'
console.log(label(undefined)) // 'fallback'
console.log(label(null))      // null
console.log(label(''))        // ''
console.log(calls)            // 2
~~~

只有前两次真正执行了默认表达式，所以副作用计数是 2。

**递进追问：**

1. **为什么默认参数可以引用左边参数却不宜引用右边参数？**

   参数绑定按从左到右初始化，左边在当前默认表达式运行时已经可用；右边绑定仍处于未初始化状态，读取会触发暂时性死区错误。

2. **如果 null 也应当使用兜底值，该怎么写？**

   应在函数体内明确使用空值合并，例如 const actual = value ?? fallback；它只把 null 与 undefined 视为空值，不会误伤 0、false 或空字符串。

**易错点：**

- 默认参数不是逻辑或运算，0、false、空字符串和 NaN 都不会自动换成默认值。
- 默认表达式可能产生副作用且按需执行，不应在其中隐藏昂贵请求或难以追踪的状态修改。

**参考来源：**

- [ECMAScript：Function Declaration Instantiation](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-functiondeclarationinstantiation)
- [MDN：Default parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)

校验日期：2026-07-20

## Q34：剩余参数 ...args 在函数内部是什么？

- A. 真正的数组
- B. arguments 对象
- C. Set
- D. 字符串

**答案：A**

**短回答：**

剩余参数会收集未匹配的实参并生成数组，可以直接使用 map、filter 等数组方法。

**原理：**

剩余参数会把没有被前面具名形参匹配的实参，按原顺序收集到一个新建的真正 Array 中。函数每次调用都会创建自己的数组，因此 args 具有 Array.prototype，可直接使用 map、filter、reduce 和迭代协议；这与历史 arguments 对象不同，arguments 是类数组、包含全部实参，并且在部分非严格简单参数场景还可能与形参发生别名关联。语法要求剩余参数必须是最后一个形参，不能再带默认初始化器，且一个参数列表只能有一个。箭头函数没有自己的 arguments，却可以通过剩余参数显式接收实参。

**代码 / 场景：**

具名参数 first 被单独绑定，其余三个值组成普通数组，可直接调用 reduce。

~~~js
function total(first, ...rest) {
  console.log(Array.isArray(rest), rest)
  return first + rest.reduce((sum, value) => sum + value, 0)
}
console.log(total(1, 2, 3, 4))
// 先输出 true [2, 3, 4]，再输出 10
~~~

rest 不含已经匹配 first 的第一个实参，这一点与 arguments 的内容不同。

**递进追问：**

1. **剩余参数与 arguments 应如何选择？**

   新代码优先使用剩余参数，因为它明确表达需要收集的位置、是真数组且适用于箭头函数；只有处理未知旧接口或必须观察全部实参时才考虑 arguments。

2. **剩余参数数组会与调用方传入的数组共享吗？**

   收集容器本身是每次调用新建的数组，但元素仍按值传递；若某个元素是对象，数组中的元素与调用方仍可指向同一个对象。

**易错点：**

- 不要说 ...args 是 arguments 的语法糖；二者覆盖的实参范围、类型和别名行为都不同。
- 剩余数组只新建第一层容器，不会深拷贝其中的对象、数组或其他引用类型元素。

**参考来源：**

- [ECMAScript：Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions)
- [MDN：Rest parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)

校验日期：2026-07-20

## Q35：调用函数时使用 fn(...arr) 的作用是什么？

- A. 删除数组
- B. 把数组元素展开为独立实参
- C. 深拷贝数组
- D. 冻结数组

**答案：B**

**短回答：**

展开语法会把可迭代对象中的元素依次作为函数参数传入。

**原理：**

函数调用参数位置的展开语法会先求值 arr，取得它的同步迭代器，然后按迭代顺序逐个取值，把每个迭代结果加入本次 ArgumentList，最后与其他普通实参一起调用 fn。它要求值可迭代，并不限于真正数组，所以字符串、Set、生成器结果等也可展开；普通仅有 length 的类数组若没有 Symbol.iterator 则不能直接展开。这个过程既不是深拷贝，也不会把 arr 永久改写。每个元素仍按 JavaScript 传参规则传递，对象元素保持共享引用。超大集合还可能超过引擎允许的最大实参数量，应改用循环或接受数组的 API。

**代码 / 场景：**

数组元素按位置成为三个独立形参；随后修改对象元素也证明展开没有深拷贝对象。

~~~js
function describe(a, b, c) { return [a, b.value, c] }
const args = [1, { value: 2 }, 3]
console.log(describe(...args)) // [1, 2, 3]
args[1].value = 9
console.log(describe(...args)) // [1, 9, 3]
~~~

第二次输出变化来自共享的对象引用，不是展开语法重新读取了某个深拷贝。

**递进追问：**

1. **展开语法与 apply 有什么主要区别？**

   展开使用迭代协议，可与普通实参任意组合，语法更直观；apply 的第二参数按类数组读取 length 和索引，不要求也不会通用消费任意 iterable。

2. **为什么不应对超大数组使用 Math.max(...values)？**

   展开会把每个元素变成独立实参，函数调用的实参数量存在实现上限，超大输入可能抛 RangeError；可用循环或 reduce 分批计算最大值。

**易错点：**

- 对象展开与函数参数展开使用的协议不同，普通对象不能因为可被 {...obj} 使用就一定可迭代。
- 展开只复制参数槽位中的值，对象元素仍共享引用，不能作为深拷贝方案。

**参考来源：**

- [ECMAScript：Argument Lists](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-argument-lists)
- [MDN：Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)

校验日期：2026-07-20

## Q36：call 的主要作用是什么？

- A. 返回一个新函数但不执行
- B. 指定 this，并立即按参数列表调用函数
- C. 只复制对象
- D. 创建 Promise

**答案：B**

**短回答：**

fn.call(obj, a, b) 会让函数执行时的 this 指向 obj，并立即传入 a、b。

**原理：**

Function.prototype.call 会立即调用目标函数，并把第一个参数作为本次调用的 thisArgument，后续参数按当前位置逐个组成实参列表。对于普通可调用函数，严格模式会原样保留 thisArgument；非严格函数会把 null 或 undefined 替换为全局 this 值，并可能把原始值装箱。箭头函数没有自己的 this 绑定，call 无法覆盖它从外层捕获的 this。call 也不能把只能通过 new 构造的 class 当作普通函数执行。它适合在明确接收者上复用普通函数或调用脱离对象的方法，但若长期作为回调，应考虑 bind 或包装函数以保存调用上下文。

**代码 / 场景：**

方法被取出后失去隐式接收者，call 在单次调用中显式恢复 this 并逐个传入参数。

~~~js
function describe(prefix, suffix) {
  return prefix + this.name + suffix
}
const user = { name: 'Linda' }
console.log(describe.call(user, '[', ']')) // '[Linda]'

const arrow = () => this
console.log(arrow.call(user) === user) // false
~~~

第二个结果说明 call 的 thisArgument 只对拥有动态 this 的普通函数生效。

**递进追问：**

1. **call 与直接写 obj.method() 的 this 有何关系？**

   成员调用会把点号左侧对象作为 this 值；函数一旦被单独取出便失去该引用关系，call 可在本次调用中显式提供相同接收者。

2. **call 能否借用数组方法处理类数组？**

   部分通用数组方法只依赖 length 和索引，可通过 call 借用；但方法是否通用、是否会修改接收者需查规范，不能假设所有内建方法都可借用。

**易错点：**

- call 会立即执行函数，不会像 bind 那样返回一个以后再调用的绑定函数。
- 对箭头函数使用 call、apply 或 bind 都不能改变其词法 this，传入对象会被忽略。

**参考来源：**

- [ECMAScript：Function.prototype.call](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.call)
- [MDN：Function.prototype.call](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)

校验日期：2026-07-20

## Q37：apply 与 call 的主要区别是什么？

- A. apply 不会执行函数
- B. apply 的参数通过数组或类数组一次传入
- C. apply 不能修改 this
- D. apply 只能用于箭头函数

**答案：B**

**短回答：**

apply 与 call 都立即调用函数；call 逐个传参，apply 使用数组或类数组传参。

**原理：**

apply 与 call 都会立即调用目标函数，并允许显式提供 thisArgument；主要区别在实参列表的构造方式。call 从第二个位置开始把参数逐个传入，apply 的第二参数则是数组或类数组对象，算法读取其 length 与连续索引并生成实参列表；传入 null 或 undefined 表示空参数列表。apply 并不通用消费任意 iterable，例如只有迭代器但没有 length 的 Set 不是可靠的 apply 参数容器，而展开语法可以消费 iterable。现代底层代码还可用 Reflect.apply，它以独立函数形式接收 target、thisArgument 和 argumentsList，避免属性被覆盖等问题。

**代码 / 场景：**

同一函数通过 call 和 apply 得到相同结果；类数组示例说明 apply 依据 length 与索引取值。

~~~js
function sum(a, b, c) { return a + b + c }
console.log(sum.call(null, 1, 2, 3)) // 6
console.log(sum.apply(null, [1, 2, 3])) // 6

const arrayLike = { 0: 'A', 1: 'B', length: 2 }
function join(a, b) { return a + b }
console.log(join.apply(null, arrayLike)) // 'AB'
~~~

若数据本来是 iterable，通常直接写 fn(...iterable) 更清楚。

**递进追问：**

1. **为什么 apply 不等同于展开语法？**

   apply 按类数组的 length 和数字索引建立列表，展开语法按 Symbol.iterator 消费元素；数组同时满足两者，所以常见示例掩盖了协议差异。

2. **Reflect.apply 有什么实际价值？**

   它把目标函数作为显式参数，不依赖 target.apply 属性是否存在或被覆盖，并清楚表达底层反射调用；参数列表仍需是数组或类数组。

**易错点：**

- apply 的第二参数不是任意集合，只有 iterable 的对象未必能按预期转成实参列表。
- 对超大数组使用 apply 或展开都会触及实参数量上限，应改用循环或分批算法。

**参考来源：**

- [ECMAScript：Function.prototype.apply](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.apply)
- [MDN：Function.prototype.apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [MDN：Reflect.apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply)

校验日期：2026-07-20

## Q38：bind 的返回值是什么？

- A. 原函数的执行结果
- B. 一个绑定了 this 和部分参数的新函数
- C. undefined
- D. 一个数组

**答案：B**

**短回答：**

bind 不会立即执行，而是返回新函数，常用于事件回调、定时器或参数预设。

**原理：**

bind 不会立即执行目标函数，而是创建并返回一个绑定函数异域对象。该对象内部保存原目标函数、boundThis 以及零个或多个预置参数；以后普通调用绑定函数时，规范把预置参数放在新实参之前，并以保存的 boundThis 调用目标。再次对该绑定函数调用 call 或 bind，不能覆盖第一次保存的 this，但可继续预置更多参数。绑定函数的 name 与 length 会按规则派生，它通常没有自己的 prototype 数据属性；若目标可构造，绑定函数仍可被 new，构造路径会忽略 boundThis 并保留预置参数。箭头函数的词法 this 也不会因 bind 改变。

**代码 / 场景：**

先绑定接收者和第一个参数，返回的新函数稍后再接收第二个参数并执行。

~~~js
function format(prefix, value) {
  return prefix + this.unit + value
}
const formatKg = format.bind({ unit: 'kg:' }, 'mass=')
console.log(formatKg(12)) // 'mass=kg:12'

const other = { unit: 'm:' }
console.log(formatKg.call(other, 5)) // 'mass=kg:5'
~~~

第二次 call 没有覆盖第一次 bind 保存的 this，只改变了尚未预置的实参。

**递进追问：**

1. **连续两次 bind 能否更换 this？**

   不能。第二次 bind 的目标已经是绑定函数，普通调用时仍使用第一次保存的 boundThis；第二次只能继续在已有预置参数后追加新的预置参数。

2. **为什么事件监听解绑时 bind 容易出错？**

   每次调用 bind 都创建新的函数对象；若注册和移除时分别 bind，两者身份不同，监听器无法匹配。应保存一次绑定结果并复用同一引用。

**易错点：**

- bind 返回的是新函数对象，不是原函数的执行结果，也不会在创建时运行函数体。
- 频繁在渲染或循环中 bind 会产生新身份，既增加分配也可能破坏缓存与监听器移除。

**参考来源：**

- [ECMAScript：Function.prototype.bind](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.bind)
- [MDN：Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)

校验日期：2026-07-20

## Q39：箭头函数的 this 来自哪里？

- A. 调用者
- B. 定义时的外层词法作用域
- C. 永远是 window
- D. 永远是 undefined

**答案：B**

**短回答：**

箭头函数没有自己的 this，会沿词法作用域向外查找，因此 call、apply、bind 不能改变它的 this。

**原理：**

箭头函数不会创建自己的 this 绑定；求值箭头函数时，它保存当前词法环境，函数体中的 this 像普通自由变量一样向外解析，最终取自最近一个拥有 this 绑定的外层执行上下文。因此箭头函数被作为对象属性调用、传给定时器，或经 call、apply、bind 调用，都不会根据新接收者改写 this。箭头还没有自己的 arguments、super 和 new.target，并且不可作为构造函数使用。常见正确场景是在普通方法内部创建回调，让回调捕获该方法调用时的实例 this；不适合把箭头直接用作需要动态接收者的对象方法。

**代码 / 场景：**

普通方法建立实例 this，内部箭头捕获它；把回调交给数组方法后仍能读取同一 prefix。

~~~js
const formatter = {
  prefix: 'ID-',
  format(values) {
    return values.map((value) => this.prefix + value)
  }
}
console.log(formatter.format([1, 2])) // ['ID-1', 'ID-2']

const bad = { value: 1, read: () => this?.value }
console.log(bad.read()) // 通常不是 1
~~~

bad.read 的箭头在对象字面量外层创建，没有把 bad 设为词法 this。

**递进追问：**

1. **为什么 bind 不能修复箭头函数的 this？**

   绑定函数只能为拥有动态 this 的目标提供 boundThis；箭头调用算法不建立 this 绑定，函数体始终沿保存的词法环境查找，传入值被忽略。

2. **类字段箭头函数为什么常能保持实例 this？**

   实例字段初始化在构造实例的上下文中执行，箭头在此捕获实例 this；代价是通常每个实例创建一个函数，而不是共享原型方法。

**易错点：**

- 对象字面量本身不创建 this 作用域，直接写箭头属性不会自动把对象设为 this。
- 顶层 this 在经典脚本、ES 模块和不同运行环境中不同，箭头只捕获实际外层值。

**参考来源：**

- [ECMAScript：Arrow Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions)
- [MDN：Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)

校验日期：2026-07-20

## Q40：对 bind 返回的函数使用 new 时，this 主要指向哪里？

- A. bind 指定的对象
- B. 新创建的实例
- C. window
- D. undefined

**答案：B**

**短回答：**

new 的构造绑定优先级高于 bind 的 this 绑定，但 bind 预设的参数仍然有效。

**原理：**

若原目标函数具有 [[Construct]]，对其绑定函数使用 new 会进入绑定函数的构造内部方法。该路径忽略 bind 保存的 boundThis，转而调用目标构造器并让 this 指向按构造规则创建的新实例；bind 预置的参数仍会放在 new 调用参数之前。为保持继承与 instanceof 语义，当 newTarget 就是绑定函数时，规范会把实际 newTarget 调整为原目标函数。绑定函数通常没有自己的 prototype 属性，但 new Bound() 创建的对象仍沿目标构造函数的 prototype 链，因此通常同时满足 instance instanceof Target 和 instance instanceof Bound。若目标构造器显式返回对象，普通构造返回规则仍可能以该对象作为结果。

**代码 / 场景：**

fake 没有被写入，预置姓名仍生效，新对象继承 Person.prototype 并通过两种 instanceof。

~~~js
function Person(name, age) {
  this.name = name
  this.age = age
}
const fake = { name: 'fake' }
const BoundPerson = Person.bind(fake, 'Linda')
const person = new BoundPerson(24)

console.log(person.name, person.age) // 'Linda' 24
console.log(fake.name) // 'fake'
console.log(person instanceof Person) // true
console.log(person instanceof BoundPerson) // true
~~~

new 的构造绑定决定 this，bind 只保留预置参数和目标构造器关系。

**递进追问：**

1. **所有 bind 返回的函数都能被 new 吗？**

   不能。只有原目标函数本身可构造时，绑定函数才具有 [[Construct]]；箭头函数或普通不可构造方法经 bind 后仍不能作为构造器。

2. **为什么 BoundPerson.prototype 通常是 undefined？**

   绑定函数不自动拥有普通函数的 prototype 数据属性；构造时会委托目标函数，实例原型关系来自 Person.prototype，而不是独立的绑定原型。

**易错点：**

- new 会忽略 bind 保存的 this，但不会忽略预置参数，回答时必须分别说明这两个维度。
- 不能因为普通调用绑定函数有效，就假设它一定可构造；可构造性完全继承自原目标。

**参考来源：**

- [ECMAScript：Bound Function Exotic Objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-bound-function-exotic-objects)
- [MDN：Bound functions used as constructors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#bound_functions_used_as_constructors)

校验日期：2026-07-20

# JavaScript 41-50：对象、属性与原型

## Q41：Object.assign 的拷贝深度是什么？

- A. 深拷贝
- B. 浅拷贝
- C. 不会拷贝
- D. 只拷贝原型

**答案：B**

**短回答：**

Object.assign 只复制源对象自身可枚举属性的当前值，嵌套对象仍与源对象共享引用。

**原理：**

Object.assign 只执行浅层属性复制。它先把 target 转成对象，再按源对象出现顺序枚举每个源的自身可枚举字符串键与 Symbol 键；对每个键从源执行 [[Get]] 取得当前值，再对目标执行 [[Set]] 写入，因此 getter 和目标 setter 都可能运行，属性描述符本身不会被原样复制。若值是对象或数组，写入的只是同一引用，嵌套修改会被两边观察。assign 会直接修改并返回 target，后来的源可覆盖先前同名键；复制过程中抛错时，之前已写入的属性不会自动回滚。它不是深拷贝、事务，也不复制原型与不可枚举属性。

**代码 / 场景：**

顶层 name 被复制为独立字符串，嵌套 profile 则共享同一个对象引用。

~~~js
const source = { name: 'Lin', profile: { score: 1 } }
const clone = Object.assign({}, source)
clone.name = 'Linda'
clone.profile.score = 9

console.log(source.name) // 'Lin'
console.log(source.profile.score) // 9
console.log(clone.profile === source.profile) // true
~~~

只有第一层属性槽位被复制；槽位里若存引用，目标和源仍指向同一嵌套对象。

**递进追问：**

1. **Object.assign 会复制属性描述符吗？**

   不会。它读取源属性值并用普通 Set 写目标，getter 会被求值，writable、enumerable、configurable 等描述符不会原样保留；需要描述符时可组合 getOwnPropertyDescriptors。

2. **Object.assign 与深克隆应如何区分？**

   assign 只复制自身可枚举第一层。深克隆必须定义循环引用、Date、Map、函数和原型等策略；符合结构化克隆范围时可评估 structuredClone。

**易错点：**

- 第一个参数会被原地修改，若不想污染旧状态，应显式传入新的空对象作为 target。
- getter 与 setter 可能在复制中执行副作用，Object.assign 不是纯粹的内存字段搬运。

**参考来源：**

- [ECMAScript：Object.assign](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.assign)
- [MDN：Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)

校验日期：2026-07-20

## Q42：对象展开 {...source} 默认属于哪种拷贝？

- A. 深拷贝
- B. 浅拷贝
- C. 二进制拷贝
- D. 原型拷贝

**答案：B**

**短回答：**

对象展开和 Object.assign 类似，只复制第一层属性。

**原理：**

对象展开默认也是浅拷贝。对象字面量求值时，...source 通过 CopyDataProperties 收集源对象的自身可枚举字符串键与 Symbol 键，读取每个当前值，并在新对象上创建对应数据属性；嵌套对象仍只复制引用，所以后续深层修改会共享。它不复制源原型、不可枚举属性或原始 getter/setter 描述符，getter 会在展开时求值，结果成为普通值属性。虽然常见结果与 Object.assign({}, source) 接近，两者写入语义不完全相同：对象展开在新对象上创建自有数据属性，而 assign 对既有 target 使用 Set，可能触发目标继承的 setter。后出现的同名属性会覆盖前面的值。

**代码 / 场景：**

getter 在展开时执行一次并变成数据属性；nested 仍共享引用，说明只有第一层被复制。

~~~js
let reads = 0
const source = {
  nested: { count: 1 },
  get label() { reads += 1; return 'ready' }
}
const clone = { ...source }
source.nested.count = 2

console.log(clone.label, reads) // ready 1
console.log(clone.nested.count) // 2
console.log(Object.getOwnPropertyDescriptor(clone, 'label').get) // undefined
~~~

clone.label 已是普通数据值，原 getter 描述符没有被复制。

**递进追问：**

1. **对象展开会包含 Symbol 键吗？**

   会，只要 Symbol 属性是源对象自身且可枚举；Object.keys 不返回 Symbol，但 CopyDataProperties 会处理字符串键与 Symbol 键。

2. **对象展开与 Object.assign 是否完全等价？**

   不完全等价。两者读取源值都可能触发 getter，但展开在新字面量上创建数据属性，assign 对 target 执行 Set，可能触发已有或继承的 setter。

**易错点：**

- 展开一层不会深复制嵌套状态，用它做不可变更新时必须逐层复制实际发生变化的路径。
- 展开只复制自身可枚举属性，类实例的原型方法和不可枚举内部状态不会进入普通对象。

**参考来源：**

- [ECMAScript：Object Initializer](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-object-initializer)
- [ECMAScript：CopyDataProperties](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-copydataproperties)
- [MDN：Spread syntax in object literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#spread_in_object_literals)

校验日期：2026-07-20

## Q43：Object.keys(obj) 会返回哪些键？

- A. 包含原型链的全部键
- B. 自身可枚举的字符串键
- C. 只返回 Symbol 键
- D. 只返回不可枚举键

**答案：B**

**短回答：**

Object.keys 不包含继承属性、不可枚举属性和 Symbol 键。

**原理：**

Object.keys 返回 obj 自身的、可枚举的字符串属性键组成的新数组。它不沿原型链查找，不包含 enumerable 为 false 的自有属性，也不包含任何 Symbol 键。属性键中的数组索引仍以字符串形式返回。顺序遵循规范的自有属性键次序：非负整数索引类键按数值升序排列，其他字符串键按创建顺序排列，Symbol 本来就被该 API 排除。参数会先执行 ToObject，因此字符串原始值可暴露字符索引，而 null 与 undefined 无法转换并会抛 TypeError。若需要全部自有键，应使用 Reflect.ownKeys；若要连同描述符检查，则使用 Object.getOwnPropertyDescriptors。

**代码 / 场景：**

示例同时加入继承键、不可枚举键、Symbol 键与整数索引，输出能验证四项过滤规则。

~~~js
const proto = { inherited: 'p' }
const obj = Object.create(proto)
obj.name = 'Lin'
obj[2] = 'two'
obj[1] = 'one'
Object.defineProperty(obj, 'hidden', { value: 1, enumerable: false })
const secret = Symbol('secret')
obj[secret] = 2

console.log(Object.keys(obj)) // ['1', '2', 'name']
console.log(Reflect.ownKeys(obj)) // ['1', '2', 'name', 'hidden', Symbol(secret)]
~~~

inherited 不在任何自有键结果中；Reflect.ownKeys 才包含隐藏字符串键和 Symbol。

**递进追问：**

1. **Object.keys 与 for...in 有什么区别？**

   Object.keys 只返回自身可枚举字符串键；for...in 还会遍历原型链上的可枚举字符串键，因此循环对象时通常还需配合 Object.hasOwn。

2. **为什么数字键在结果里仍是字符串？**

   普通对象属性键的语言类型只有 String 或 Symbol，数字写法在定义属性时会转换成字符串；数组索引只是满足特定格式的字符串键。

**易错点：**

- Object.keys(obj).length 只统计可枚举字符串自有属性，不能代表对象所有内部或隐藏状态。
- 不要依赖 Object.keys 获取 Symbol 元数据，应根据需求选择 getOwnPropertySymbols 或 Reflect.ownKeys。

**参考来源：**

- [ECMAScript：Object.keys](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.keys)
- [MDN：Object.keys](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
- [ECMAScript：OrdinaryOwnPropertyKeys](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryownpropertykeys)

校验日期：2026-07-20

## Q44：'toString' in {} 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**短回答：**

in 操作符会检查对象自身以及原型链，普通对象可从 Object.prototype 继承 toString。

**原理：**

结果是 true。in 运算符右侧必须是对象，它调用对象的 [[HasProperty]] 内部方法：先检查对象自身是否存在该属性键，未找到时沿 [[Prototype]] 链继续查询。普通对象字面量默认以 Object.prototype 为原型，而该原型拥有 toString，因此即使空对象没有自己的 toString，in 仍返回 true。属性值是否为 undefined 不影响“是否存在”的判断；只要属性描述存在就为 true。若对象由 Object.create(null) 创建，没有 Object.prototype，结果会是 false。若只想判断自身属性，应使用 Object.hasOwn，而不是 in 或可能被覆盖的 hasOwnProperty 方法。

**代码 / 场景：**

普通对象、空原型对象和“存在但值为 undefined”的属性构成三个明确对照。

~~~js
console.log('toString' in {}) // true
console.log(Object.hasOwn({}, 'toString')) // false

const dictionary = Object.create(null)
console.log('toString' in dictionary) // false

const record = { value: undefined }
console.log('value' in record) // true
console.log(record.value === undefined) // true
~~~

最后两行说明读取到 undefined 不能区分“缺少属性”和“属性值恰为 undefined”。

**递进追问：**

1. **in 与 Object.hasOwn 应如何选择？**

   需要判断对象可访问接口、包括继承方法时可用 in；处理用户数据字典或只关心当前记录字段时应使用 Object.hasOwn，避免原型属性混入。

2. **为什么 in 的右侧不能直接是字符串原始值？**

   in 的关系运算语义要求右侧是对象，否则抛 TypeError；它不会像部分 Object 静态方法那样自动把任意原始值装箱后再查属性。

**易错点：**

- in 会沿原型链查询，不能把 true 直接解释为对象拥有这个自有数据字段。
- 属性值为 undefined 仍可能真实存在，不能仅用 obj.key === undefined 判断字段缺失。

**参考来源：**

- [ECMAScript：Relational Operators and in](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-relational-operators)
- [MDN：in operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)

校验日期：2026-07-20

## Q45：Object.hasOwn(obj, key) 检查什么？

- A. 自身是否具有该属性
- B. 原型链是否具有该属性
- C. 属性值是否为真
- D. 属性是否可写

**答案：A**

**短回答：**

Object.hasOwn 只检查对象自身属性，比直接调用 obj.hasOwnProperty 更安全。

**原理：**

Object.hasOwn 检查指定属性键是否直接存在于 obj 自身，而不沿原型链查找。算法把 obj 转为对象、把 key 转为属性键，然后调用 HasOwnProperty；它不要求属性可枚举、值为真或可写，所以不可枚举属性、值为 undefined 的属性和自身 Symbol 属性都能返回 true。相比 obj.hasOwnProperty(key)，静态方法不会受对象自有同名方法覆盖影响，也能处理 Object.create(null) 创建的无原型字典。它只回答所有权，不验证值类型与描述符；若需要 writable、enumerable 等信息，应继续读取 Object.getOwnPropertyDescriptor。对 null 或 undefined 调用会因无法转换对象而抛 TypeError。

**代码 / 场景：**

无原型对象没有 hasOwnProperty 方法，但 Object.hasOwn 仍能安全识别值为 undefined 的自有字段。

~~~js
const dict = Object.create(null)
dict.enabled = undefined

console.log(Object.hasOwn(dict, 'enabled')) // true
console.log(Object.hasOwn(dict, 'toString')) // false
console.log(typeof dict.hasOwnProperty) // 'undefined'

const child = Object.create({ inherited: 1 })
console.log(Object.hasOwn(child, 'inherited')) // false
console.log('inherited' in child) // true
~~~

最后两行把自有属性检查与原型链可见性明确区分开。

**递进追问：**

1. **Object.hasOwn 会忽略不可枚举属性吗？**

   不会。它只检查是否为自有属性，与 enumerable 无关；Object.defineProperty 默认创建的不可枚举属性仍可被 hasOwn 检出。

2. **为什么不直接调用 obj.hasOwnProperty？**

   对象可能覆盖该名称，或使用 null 原型而根本没有该方法；Object.hasOwn 不依赖接收对象的方法查找，语义更安全且更清楚。

**易错点：**

- hasOwn 返回 true 不表示属性值有意义，undefined、null、false 与 0 都可能是有效自有值。
- Object.hasOwn 只判断所有权，字段权限、可写性和可枚举性必须通过描述符或业务规则另查。

**参考来源：**

- [ECMAScript：Object.hasOwn](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.hasown)
- [MDN：Object.hasOwn](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)

校验日期：2026-07-20

## Q46：delete obj.key 的作用是什么？

- A. 把值设置成 undefined
- B. 删除可配置的自身属性
- C. 删除整个对象
- D. 删除原型

**答案：B**

**短回答：**

delete 删除属性本身，而不是简单赋值 undefined；不可配置属性无法被成功删除。

**原理：**

delete 对属性引用执行对象的 [[Delete]] 内部操作，目标是移除属性描述符本身，而不是把值写成 undefined。普通自有属性若 configurable 为 true 可被删除，之后 hasOwn 返回 false；不可配置属性在非严格代码中删除返回 false，在严格模式中会抛 TypeError。若对象没有该自有属性，delete 通常返回 true，即使同名属性可从原型继承；删除一个遮蔽原型的自有属性后，后续读取还可能重新暴露原型值。对数组索引使用 delete 会留下空洞且通常不改变 length，若要移除并移动元素应使用 splice。词法变量和函数参数也不是可通过对象属性 delete 删除的对象状态。

**代码 / 场景：**

删除自有属性后，读取结果从 own 切换到原型 inherited；数组示例展示 delete 不会收缩长度。

~~~js
const proto = { role: 'inherited' }
const user = Object.create(proto)
user.role = 'own'

console.log(delete user.role) // true
console.log(Object.hasOwn(user, 'role')) // false
console.log(user.role) // 'inherited'

const values = [10, 20, 30]
delete values[1]
console.log(values.length) // 3
console.log(1 in values) // false
~~~

属性不存在与属性值 undefined 是不同状态，可用 hasOwn 或 in 精确验证。

**递进追问：**

1. **delete 与 obj.key = undefined 有何差异？**

   赋值保留属性描述符且 hasOwn 仍为 true，只改变存储值；delete 成功后属性不再自有，枚举、in 检查和原型回退行为都会改变。

2. **为什么删除数组元素通常使用 splice？**

   delete 只移除索引属性并留下稀疏空洞，length 不变，迭代方法处理空洞还可能不同；splice 会移动后续元素并相应缩短数组。

**易错点：**

- 删除遮蔽属性后，同名原型属性可能重新可见，不能只看读取值判断删除是否符合预期。
- 严格模式删除不可配置属性会抛错，不能只依赖 delete 返回布尔值处理所有失败。

**参考来源：**

- [ECMAScript：The delete Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-delete-operator)
- [MDN：delete operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete)

校验日期：2026-07-20

## Q47：Object.freeze 是否会递归冻结嵌套对象？

- A. 会
- B. 不会，只冻结第一层
- C. 只冻结数组
- D. 取决于严格模式

**答案：B**

**短回答：**

Object.freeze 是浅冻结。若要深冻结，需要自行递归处理嵌套对象。

**原理：**

不会，Object.freeze 是浅冻结。它先阻止目标对象继续扩展，再把对象自身现有数据属性改为不可写且不可配置，把访问器属性改为不可配置；对象的 [[Prototype]] 也不能再更改。但属性值若引用另一个对象，该嵌套对象拥有独立的内部槽与属性描述符，不会被自动处理，仍可修改。访问器的 getter 或 setter 函数也不会消失，冻结对象的某些可观察状态仍可能来自外部可变数据。实现深冻结需要递归遍历对象图、处理 Symbol 键与循环引用，并评估 Date、Map、TypedArray、私有字段等特殊对象；业务上常更适合采用不可变更新和只读接口。

**代码 / 场景：**

顶层 name 无法改变，嵌套 profile.score 却仍能修改；严格模式让失败以异常显式出现。

~~~js
'use strict'
const user = Object.freeze({ name: 'Lin', profile: { score: 1 } })

try {
  user.name = 'Linda'
} catch (error) {
  console.log(error.name) // 'TypeError'
}
user.profile.score = 2
console.log(user.name) // 'Lin'
console.log(user.profile.score) // 2
console.log(Object.isFrozen(user.profile)) // false
~~~

freeze 只改变 user 自身描述符，没有递归访问 profile。

**递进追问：**

1. **如何实现基本的 deepFreeze？**

   可用 Reflect.ownKeys 遍历自有键，对对象值递归冻结，并用 WeakSet 记录已访问对象避免循环；还要明确对内建对象和外部资源的处理边界。

2. **冻结对象后 getter 的返回值一定不变吗？**

   不一定。getter 可读取外部变量、时间或另一个可变对象；freeze 固定的是自有属性描述符与扩展能力，不保证所有方法和访问器结果恒定。

**易错点：**

- Object.freeze 不等同于深不可变，嵌套对象、闭包状态和某些内建内部状态仍可能变化。
- 非严格模式下写冻结属性可能静默失败，测试不可变约束时应检查结果或使用严格模式。

**参考来源：**

- [ECMAScript：Object.freeze](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze)
- [MDN：Object.freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)

校验日期：2026-07-20

## Q48：Object.create(proto) 的作用是什么？

- A. 深拷贝 proto
- B. 创建一个以 proto 为原型的新对象
- C. 冻结 proto
- D. 删除 proto

**答案：B**

**短回答：**

新对象会通过原型链继承 proto 上的属性和方法，但不会复制这些属性。

**原理：**

Object.create(proto) 创建一个新对象，并把它的 [[Prototype]] 直接设置为传入的对象或 null；它不会复制 proto 的属性，也不会调用某个构造函数。读取新对象缺少的键时，普通属性查找才会沿原型链访问 proto。可选的第二参数是属性描述符映射，规则与 Object.defineProperties 相同，省略 writable、enumerable、configurable 时默认都是 false。传入 Object.create(null) 可得到没有 Object.prototype 的纯字典，避免 toString 等继承键干扰，但该对象也没有 hasOwnProperty 和常见对象方法。proto 必须是对象或 null，否则会抛 TypeError。创建后若修改 proto 的可见属性，新对象也可能立即通过委托观察到变化，因为两者始终保持原型关联。

![JavaScript 实例、构造函数与原型链关系图](/content/diagrams/javascript/prototype-chain-v1.svg "属性查找沿 [[Prototype]] 链向上进行，prototype 与对象的原型不是同一个概念。")

**代码 / 场景：**

dog 自身只有 name，speak 来自 animal 原型；null 原型字典则没有任何默认继承方法。

~~~js
const animal = {
  speak() { return this.name + ' speaks' }
}
const dog = Object.create(animal)
dog.name = 'Milo'
console.log(dog.speak()) // 'Milo speaks'
console.log(Object.hasOwn(dog, 'speak')) // false
console.log(Object.getPrototypeOf(dog) === animal) // true

const dict = Object.create(null)
dict.key = 'value'
console.log('toString' in dict) // false
~~~

继承是运行时委托，不是把 speak 方法复制进 dog。

**递进追问：**

1. **Object.create 与 new Constructor 有何区别？**

   Object.create 只建立指定原型并可定义描述符，不执行构造函数；new 还会调用构造器初始化实例，并遵循构造器显式返回对象等规则。

2. **何时适合使用 Object.create(null)？**

   当对象纯粹作为字符串键字典且不需要原型方法时可用，能避免继承键冲突；但序列化、调试和工具兼容性应测试，Map 往往更明确。

**易错点：**

- Object.create(proto) 不会深拷贝或浅拷贝 proto，原型属性仍由多个后代共享访问。
- 第二参数接收的是属性描述符而非普通值对象，遗漏 writable 等字段会得到不可写属性。

**参考来源：**

- [ECMAScript：Object.create](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.create)
- [MDN：Object.create](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create)

校验日期：2026-07-20

## Q49：不可枚举属性会出现在 Object.keys 中吗？

- A. 会
- B. 不会
- C. 只在数组中会
- D. 只在严格模式中会

**答案：B**

**短回答：**

Object.keys 只返回自身可枚举字符串属性；可用 Object.getOwnPropertyNames 查看不可枚举字符串属性。

**原理：**

不会。Object.keys 的筛选条件要求属性是目标对象自身拥有、属性键类型为 String，并且属性描述符的 enumerable 为 true；不可枚举自有属性虽然仍可被直接读取、用 in 或 Object.hasOwn 检测，却会被 Object.keys 排除。Object.getOwnPropertyNames 可取得全部自有字符串键，包括不可枚举键；Object.getOwnPropertySymbols 取得自有 Symbol 键；Reflect.ownKeys 则合并两类而不按 enumerable 过滤。for...in 只遍历可枚举字符串键但会沿原型链，JSON.stringify 对普通对象通常也只考虑可枚举字符串自有属性，几个 API 不应混为一谈。设计反射逻辑时应先明确需要的所有权、键类型与枚举性，再选择对应接口。

**代码 / 场景：**

hidden 可直接读取且确实自有，但只有更全面的键 API 才会列出它。

~~~js
const obj = { visible: 1 }
Object.defineProperty(obj, 'hidden', {
  value: 2,
  enumerable: false
})

console.log(obj.hidden) // 2
console.log(Object.hasOwn(obj, 'hidden')) // true
console.log(Object.keys(obj)) // ['visible']
console.log(Object.getOwnPropertyNames(obj)) // ['visible', 'hidden']
console.log(JSON.stringify(obj)) // '{"visible":1}'
~~~

不可枚举只影响特定枚举机制，不等于私有或无法访问。

**递进追问：**

1. **不可枚举属性是否具有安全保密性？**

   没有。调用方仍可直接读取已知键，或通过 getOwnPropertyNames、Reflect.ownKeys 和属性描述符发现它；真正私有状态应使用 #字段或闭包。

2. **for...in 会列出不可枚举属性吗？**

   不会，但它会沿原型链列出可枚举字符串属性；因此与 Object.keys 的“仅自身”范围不同，处理数据对象时应明确是否过滤继承键。

**易错点：**

- enumerable 为 false 只控制枚举可见性，不会自动禁止读取、修改或删除属性。
- Object.getOwnPropertyNames 仍不含 Symbol 键；需要完整自有键集合应使用 Reflect.ownKeys。

**参考来源：**

- [ECMAScript：Object.keys](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.keys)
- [MDN：Enumerability and ownership of properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties)
- [MDN：Object.getOwnPropertyNames](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames)

校验日期：2026-07-20

## Q50：解构默认值在属性值为 null 时会生效吗？

- A. 会
- B. 不会
- C. 会变成 0
- D. 会抛出异常

**答案：B**

**短回答：**

解构默认值只在属性值严格等于 undefined 时生效，null 会被保留。

**原理：**

不会。对象或数组解构中带初始化器的绑定，只有取得的属性值严格为 undefined 时才求值并采用默认表达式；属性缺失也会先得到 undefined，所以同样触发。null 是明确存在的另一种原始值，会原样绑定，不会被默认值替换。默认表达式是惰性的，只有触发时才执行，可引用已经初始化的前置绑定。还要区分嵌套模式：若写 const { profile: { name } = {} } = data，profile 为 undefined 时使用空对象，但 profile 为 null 时会保留 null，随后尝试从 null 解构并抛 TypeError。若业务把 null 与 undefined 都视为空值，应在解构后使用 ??，或先规范化输入。

**代码 / 场景：**

缺失与 undefined 触发默认值，null 保留；空值合并则能有意覆盖两种空值而保留 0。

~~~js
const a = { value: null }
const b = { value: undefined }
const c = {}

const { value: av = 'default' } = a
const { value: bv = 'default' } = b
const { value: cv = 'default' } = c
console.log(av, bv, cv) // null 'default' 'default'

console.log(av ?? 'fallback') // 'fallback'
console.log(0 ?? 'fallback') // 0
~~~

是否把 null 当作缺失必须由业务契约决定，不能依赖解构默认语法猜测。

**递进追问：**

1. **默认表达式什么时候会执行？**

   只有解构取得的值为 undefined 时才执行，因此可用于惰性计算；若属性为 null、false、0 或空字符串，表达式完全不会求值。

2. **嵌套对象可能为 null 时怎样安全解构？**

   先用 const profile = data.profile ?? {} 规范化，再从 profile 解构；或使用可选链逐项读取。仅写解构默认值无法替换明确的 null。

**易错点：**

- 解构默认值不按真假判断，null、false、0 和空字符串都会被保留而不是替换。
- 嵌套模式的中间值为 null 时仍可能抛 TypeError，外层默认对象只处理 undefined。

**参考来源：**

- [ECMAScript：Destructuring Binding Patterns](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-destructuring-binding-patterns)
- [MDN：Destructuring assignment and default value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#default_value)
- [MDN：Nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)

校验日期：2026-07-20

# JavaScript 51-60：数组与集合操作

## Q51：Array.prototype.map 的返回值是什么？

- A. 原数组
- B. 一个通常与原数组等长的新数组
- C. undefined
- D. 布尔值

**答案：B**

**短回答：**

map 对每个已有元素执行映射函数，并把返回值组成新数组，不会直接修改原数组。

**原理：**

map 会创建并返回一个新数组，新数组的长度在调用开始时就按原数组长度确定。它依次处理原数组中实际存在的索引，把回调函数的返回值写到新数组的对应位置；回调接收当前元素、索引和原数组三个参数。map 不会自动修改原数组，但回调仍可能主动修改对象或原数组，因此“使用 map”并不等于没有副作用。稀疏数组中的空槽不会执行回调，结果中对应位置仍为空槽。它是浅层映射：若返回的是原对象引用，新旧数组仍会共享该对象。

**代码 / 场景：**

下面的回调明确返回计算结果，所以输出是新数组 [2, 4, 6]，原数组仍为 [1, 2, 3]；若漏写 return，三个位置都会得到 undefined。

~~~js
const source = [1, 2, 3]
const doubled = source.map((value, index) => value * 2)
console.log(doubled) // [2, 4, 6]
console.log(source)  // [1, 2, 3]
~~~

**递进追问：**

1. **map 与 Array.from 的映射能力有什么差别？**

   map 只处理已有的数组或类数组实例，并保留稀疏数组的空槽；Array.from 可以从可迭代对象或类数组创建新数组，并可在创建过程中执行映射函数，空槽通常会被读取为 undefined。

2. **为什么不建议只为执行副作用而调用 map？**

   map 的语义是把每个输入映射为输出，它必然分配一个结果数组。若调用者完全不用该结果，既误导读者又产生无谓分配；此时应使用 forEach、for...of 或明确的循环。

**易错点：**

- 箭头函数使用花括号后必须显式 return，否则新数组会被填入 undefined。
- map 只复制数组容器，不会深拷贝元素对象，修改嵌套对象仍可能影响原数据。

**参考来源：**

- [ECMAScript：Array.prototype.map](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map)
- [MDN：Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)

校验日期：2026-07-20

## Q52：Array.prototype.forEach 的返回值是什么？

- A. 新数组
- B. 原数组
- C. undefined
- D. true

**答案：C**

**短回答：**

forEach 用于遍历副作用，不会收集回调返回值。

**原理：**

forEach 的规范返回值始终是 undefined，不会收集回调的返回值。它按升序访问调用开始时已确定长度范围内实际存在的元素，并把元素、索引和原数组交给回调。除非回调抛出异常，否则没有内建的 break 或提前返回机制；在回调中写 return 只结束本次回调。forEach 本身是同步算法，不会等待回调返回的 Promise，因此把 async 回调直接传入时，外层 forEach 会在异步工作完成前返回，也无法自然汇总拒绝结果。

**代码 / 场景：**

回调虽然返回 value * 2，forEach 仍返回 undefined；副作用只体现在 total 被更新。若需要得到映射数组，应改用 map，而不是误以为 forEach 会收集返回值。

~~~js
let total = 0
const result = [1, 2, 3].forEach((value) => {
  total += value
  return value * 2
})
console.log(result) // undefined
console.log(total)  // 6
~~~

**递进追问：**

1. **需要顺序等待多个异步任务时应怎样写？**

   使用 for...of 搭配 await，可让下一轮在上一轮兑现后开始；若任务可以并行，则先用 map 生成 Promise 数组，再交给 Promise.all 或 allSettled 汇总。

2. **什么情况下 forEach 的遍历结果会受数组修改影响？**

   调用开始时长度上限已被记录，后来追加到上限之外的元素不会访问；尚未访问的元素若被删除会跳过，若被改值则读取访问当时的值，因此遍历中修改数组很难推理。

**易错点：**

- 不要用回调中的 return 试图结束整个 forEach，它只能结束当前一次调用。
- async forEach 不会等待 Promise，异常拒绝也不会自动进入外层的 try/catch。

**参考来源：**

- [ECMAScript：Array.prototype.forEach](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.foreach)
- [MDN：Array.prototype.forEach()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)

校验日期：2026-07-20

## Q53：filter 的作用是什么？

- A. 修改每个元素
- B. 返回满足条件元素组成的新数组
- C. 找到第一个元素
- D. 对数组排序

**答案：B**

**短回答：**

回调返回真值的元素会被保留，原数组通常不会被修改。

**原理：**

filter 用于按谓词筛选元素，并返回一个新的浅拷贝数组。算法按原顺序访问实际存在的索引，只有回调结果经 ToBoolean 转换为 true 的元素才会被追加到结果中，因此结果长度可能从零到原长度不等。它不会直接改变原数组，入选元素却仍是原来的值或对象引用，并非深拷贝。调用开始时会固定遍历长度上限；空槽不会调用回调，也不会在结果中保留占位，所以稀疏数组经过 filter 后通常变为紧凑数组。

**代码 / 场景：**

示例同时说明筛选条件和浅拷贝边界：结果只保留 active 为 true 的对象，但对象引用仍共享，因此随后修改 activeUsers[0].name 也会改变 users[0].name。

~~~js
const users = [{ name: 'A', active: true }, { name: 'B', active: false }]
const activeUsers = users.filter((user) => user.active)
activeUsers[0].name = 'Ada'
console.log(activeUsers.length) // 1
console.log(users[0].name)      // 'Ada'
~~~

**递进追问：**

1. **如何同时完成筛选和映射而避免两次遍历？**

   可以使用 reduce 在一次循环中判断后再 push 转换值，或写清晰的 for...of；但若数据量不大，连续 filter 与 map 往往可读性更高，应先测量再优化。

2. **filter(Boolean) 会意外过滤哪些有效业务值？**

   它会移除所有假值，包括数字 0、空字符串、false、NaN、null 和 undefined；若 0 或空字符串具有业务意义，应写出只排除 nullish 值的明确谓词。

**易错点：**

- 回调返回对象本身也会被视为真值，不能把“非空对象”误当成严格布尔判断。
- 结果数组虽是新的，元素对象仍共享引用，不能把 filter 当作深拷贝工具。

**参考来源：**

- [ECMAScript：Array.prototype.filter](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.filter)
- [MDN：Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)

校验日期：2026-07-20

## Q54：reduce 最核心的用途是什么？

- A. 把数组累计为一个结果
- B. 只删除重复元素
- C. 只排序数字
- D. 复制 DOM

**答案：A**

**短回答：**

reduce 让累计值依次处理每个元素，可用于求和、分组、构建对象等。

**原理：**

reduce 的核心是把一列元素按顺序折叠成一个累加结果。每轮回调接收 accumulator、currentValue、currentIndex 和原数组，并把本轮返回值作为下一轮的 accumulator。显式提供 initialValue 时，第一项从索引零开始参与；未提供时会把第一个实际存在的元素当初值，从下一项开始，并且空数组会抛出 TypeError。累加结果可以是数字、对象、Map、Promise 链等任意值，但每轮都应返回与设计一致的累加器，才能保持状态转换可推理。稀疏数组的空槽不会进入回调；选择原地修改累加器还是每轮返回新值，也应在整个归约中保持一致。

**代码 / 场景：**

这里用对象作为明确初值，把订单金额按类别汇总。每轮都返回 accumulator；最终输出 { book: 50, food: 20 }，输入订单数组没有被修改。

~~~js
const orders = [
  { kind: 'book', amount: 30 },
  { kind: 'food', amount: 20 },
  { kind: 'book', amount: 20 },
]
const totals = orders.reduce((acc, order) => {
  acc[order.kind] = (acc[order.kind] ?? 0) + order.amount
  return acc
}, {})
console.log(totals) // { book: 50, food: 20 }
~~~

**递进追问：**

1. **为什么生产代码通常应显式传 initialValue？**

   显式初值能固定累加器类型，让空数组也得到合理结果，并避免第一项被特殊处理。对 TypeScript 推断、泛型工具和边界测试而言，行为都会更稳定清晰。

2. **reduce 是否一定比普通循环更好？**

   不一定。复杂累加器、多个提前退出条件或大量可变状态会让 reduce 难读，而且 reduce 没有内建 break。此时命名清楚的 for...of 往往更易调试和维护。

**易错点：**

- 回调某个分支忘记返回累加器，会让下一轮 accumulator 变成 undefined。
- 空数组未提供 initialValue 会直接抛出 TypeError，不能假设返回 undefined。

**参考来源：**

- [ECMAScript：Array.prototype.reduce](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reduce)
- [MDN：Array.prototype.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)

校验日期：2026-07-20

## Q55：find 没找到匹配元素时返回什么？

- A. -1
- B. null
- C. undefined
- D. false

**答案：C**

**短回答：**

find 返回第一个匹配元素的值；findIndex 才会在未找到时返回 -1。

**原理：**

find 会按索引升序调用谓词，并在第一次得到真值时立即返回该元素；遍历结束仍未匹配则返回 undefined。这个返回协议有歧义：如果数组本来就包含 undefined 且它满足条件，仅看结果无法判断是“找到 undefined”还是“没找到”。需要判断存在性时可使用 findIndex，未找到会返回 -1。与 map、filter 不同，find 会对长度范围内每个索引执行读取，稀疏数组的空槽会被当作 undefined 传给回调；算法同样在开始时确定长度上限。

**代码 / 场景：**

第一次年龄不小于 18 的对象会被直接返回，后面的元素不再测试；第二次没有匹配项，因此输出 undefined。对象是原数组中的同一个引用，并非副本。

~~~js
const users = [{ name: 'A', age: 16 }, { name: 'B', age: 20 }, { name: 'C', age: 30 }]
console.log(users.find((user) => user.age >= 18)) // { name: 'B', age: 20 }
console.log(users.find((user) => user.age > 40))  // undefined
~~~

**递进追问：**

1. **find、findIndex 和 findLast 应如何选择？**

   要元素本身用 find，要位置或需区分 undefined 元素用 findIndex；若业务要求从末尾找最近匹配项，可用 findLast 或 findLastIndex，并确认目标运行环境支持。

2. **为什么 find 适合昂贵谓词的提前终止？**

   它在首个匹配后立刻返回，不再调用后续谓词；相比先 filter 再取第一项，可避免无谓检查和结果数组分配，但最坏情况下仍需扫描全部元素。

**易错点：**

- 不能用 if (found) 判断是否找到，因为匹配元素可能是 0、空字符串或 false。
- find 返回的是原元素引用，修改找到的对象会同时改变原数组中的对象。

**参考来源：**

- [ECMAScript：Array.prototype.find](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.find)
- [MDN：Array.prototype.find()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find)

校验日期：2026-07-20

## Q56：some 在什么时候返回 true？

- A. 所有元素都满足条件
- B. 至少一个元素满足条件
- C. 数组为空
- D. 数组长度大于 10

**答案：B**

**短回答：**

some 遇到第一个真值就短路返回 true，适合判断“是否存在”。

**原理：**

some 用来回答“是否至少有一个元素满足条件”。它按升序检查数组中实际存在的元素，只要某次回调结果转为布尔值后为 true，就立即停止并返回 true；全部不满足或数组为空则返回 false。因此它体现存在量词，适合权限命中、校验失败检测等场景。调用开始时读取并固定长度，之后追加到该范围外的元素不会参与；尚未访问的删除项会被跳过。回调接收元素、索引和原数组，稀疏数组的空槽不会被调用。

**代码 / 场景：**

第三个数满足大于 10，some 随即停止，所以 visited 是 3 而不是 4；这说明它不仅返回布尔值，还具备短路特性。

~~~js
let visited = 0
const matched = [2, 4, 12, 100].some((value) => {
  visited += 1
  return value > 10
})
console.log(matched) // true
console.log(visited) // 3
~~~

**递进追问：**

1. **some 与 includes 的语义差别是什么？**

   some 接受自定义谓词，可按对象字段或范围判断；includes 只检查是否含有给定值，并使用 SameValueZero 比较。固定值成员判断用 includes 通常更直接。

2. **如何表达“没有任何元素满足条件”？**

   可以写 !array.some(predicate)，其短路行为清楚；也可用 every 对谓词取反，但双重否定更易写错，应选择最贴近业务语义且团队易读的形式。

**易错点：**

- 空数组调用 some 返回 false，因为不存在任何一个可让谓词成立的元素。
- 回调返回非布尔值会做真值转换，返回字符串或对象可能造成意外命中。

**参考来源：**

- [ECMAScript：Array.prototype.some](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.some)
- [MDN：Array.prototype.some()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some)

校验日期：2026-07-20

## Q57：[].every(Boolean) 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**短回答：**

空数组没有反例，every 对空数组返回 true，这属于数学上的空真。

**原理：**

结果是 true。every 表达“所有被检查元素都满足条件”，空数组没有反例，所以按数学上的空真原则返回 true，回调一次也不会执行。算法遇到第一个假值就短路返回 false；只有遍历完仍无反例才返回 true。它只访问实际存在的索引，稀疏数组的空槽会跳过，因此一个只有空槽、没有实际元素的数组也可能得到 true。Boolean 作为谓词会对元素做真值转换，并不是检查值的类型是否为 boolean。

**代码 / 场景：**

第一个结果是 true，因为空数组不存在假值；第二个结果是 false，因为数字 0 经 Boolean 转换后为 false。计数还能证明空数组时回调没有运行。

~~~js
let calls = 0
const emptyResult = [].every((value) => { calls += 1; return Boolean(value) })
const valuesResult = [1, 2, 0].every(Boolean)
console.log(emptyResult, calls) // true 0
console.log(valuesResult)      // false
~~~

**递进追问：**

1. **表单字段数组为空时，every 校验为何可能产生业务漏洞？**

   若业务要求“至少有一个字段且全部有效”，只写 fields.every(isValid) 会让空数组通过。应先验证 fields.length > 0，再检查 every，明确存在性与全称条件。

2. **稀疏数组对 every 有什么影响？**

   空槽不会执行谓词，所以 new Array(3).every(() => false) 仍为 true。若必须把空槽当 undefined 校验，可先用 Array.from 将其实体化或改用显式索引循环。

**易错点：**

- 不要把空数组返回 true 误判为实现错误，这是全称量词的规范定义。
- every(Boolean) 会拒绝 0、空字符串和 false，即使它们可能是合法业务值。

**参考来源：**

- [ECMAScript：Array.prototype.every](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.every)
- [MDN：Array.prototype.every()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every)

校验日期：2026-07-20

## Q58：[10, 2, 1].sort() 的默认结果是什么？

- A. [1, 2, 10]
- B. [1, 10, 2]
- C. [10, 2, 1]
- D. 抛出异常

**答案：B**

**短回答：**

sort 默认按字符串的 UTF-16 顺序比较。数值升序应传入比较函数 (a, b) => a - b。

**原理：**

默认结果是 [1, 10, 2]。sort 在没有 compareFn 时，会把非 undefined 元素转换为字符串，再按 UTF-16 码元序列升序比较，因此字符串 "10" 排在 "2" 前面。sort 会原地重排并返回同一个数组引用，不是纯函数；现代 ECMAScript 还要求排序稳定，即比较结果为零的元素保持原相对顺序。数值升序必须提供 (a, b) => a - b。undefined 会排到数组末尾，稀疏数组的空槽则被保留并移动到 undefined 之后。比较器返回负数、零或正数来表达相对顺序，而不是必须返回固定的负一、零和正一。

**代码 / 场景：**

第一次输出体现默认字符串排序并证明原数组已被修改；第二次复制数组后传数值比较器，得到真正的数值升序 [1, 2, 10]。

~~~js
const values = [10, 2, 1]
const returned = values.sort()
console.log(values)             // [1, 10, 2]
console.log(returned === values) // true
console.log([10, 2, 1].sort((a, b) => a - b)) // [1, 2, 10]
~~~

**递进追问：**

1. **比较器需要满足哪些基本性质？**

   比较器应保持纯净，并满足自反、反对称和传递等一致性要求；同一对输入不能随机返回不同符号，否则不同引擎或不同运行可能产生不可预测顺序。

2. **不想修改原数组时怎样排序？**

   现代环境可使用 toSorted，它返回新数组；兼容旧环境时可先用展开语法或 slice 复制，再调用 sort。复制仍是浅复制，元素对象引用不会被克隆。

**易错点：**

- 直接对数字数组调用默认 sort 会按字符串排序，结果常与数值大小不符。
- sort 会修改调用它的数组，共享该数组的组件或状态可能因此出现隐蔽副作用。

**参考来源：**

- [ECMAScript：Array.prototype.sort](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort)
- [MDN：Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)

校验日期：2026-07-20

## Q59：splice 与 slice 的关键区别是什么？

- A. 二者都修改原数组
- B. splice 会修改原数组，slice 通常不会
- C. slice 会修改原数组，splice 不会
- D. 二者都只用于字符串

**答案：B**

**短回答：**

splice 可删除、插入或替换原数组元素；slice 返回指定区间的浅拷贝。

**原理：**

splice 是原地编辑方法，可从 start 开始删除 deleteCount 个元素并插入新元素，返回值是由被删除元素组成的新数组，因此会改变原数组长度和内容。slice 是读取方法，按左闭右开区间提取元素，返回新的浅拷贝数组而不修改原数组；省略 end 时复制到末尾。两者都支持负索引，都只复制元素引用而不会深克隆对象。要在不可变状态管理中替代 splice，可使用 toSpliced，或组合 slice 与展开语法创建新数组。

**代码 / 场景：**

splice 从索引 1 删除两个元素并插入 X，原数组被改成 ['a','X','d']，返回 ['b','c']；随后 slice 只读取前两项，不再改变原数组。

~~~js
const items = ['a', 'b', 'c', 'd']
const removed = items.splice(1, 2, 'X')
console.log(items)   // ['a', 'X', 'd']
console.log(removed) // ['b', 'c']
const copy = items.slice(0, 2)
console.log(copy)    // ['a', 'X']
console.log(items)   // ['a', 'X', 'd']
~~~

**递进追问：**

1. **splice(2) 与 splice(2, undefined) 为什么不同？**

   省略 deleteCount 表示删除从索引 2 到末尾的全部元素；显式传 undefined 会经数值转换成为 0，因而不删除。需要插入参数时若想删到末尾，可传 Infinity。

2. **在 React 或 Redux 状态中为什么偏向 slice 或 toSpliced？**

   状态更新依赖新引用识别变化，原地 splice 可能让旧状态也被改写并破坏时间旅行或浅比较。返回新数组的方法能保留旧快照，更新边界更清晰。

**易错点：**

- splice 的返回值是删除项而不是修改后的原数组，赋值时很容易取错结果。
- slice 和 splice 都是浅层操作，嵌套对象依然与原数组共享引用。

**参考来源：**

- [ECMAScript：Array.prototype.splice](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.splice)
- [MDN：Array.prototype.slice()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)

校验日期：2026-07-20

## Q60：[NaN].includes(NaN) 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**短回答：**

includes 使用 SameValueZero 比较，可以识别 NaN；indexOf(NaN) 则找不到。

**原理：**

结果是 true，因为 includes 使用 SameValueZero 比较，而不是严格相等。SameValueZero 把 NaN 与 NaN 视为相同，同时把 +0 与 -0 也视为相同，所以它比 indexOf 更适合判断 NaN 是否存在。includes 从可选的 fromIndex 开始线性读取，找到即返回 true；负索引会相对数组长度换算。它会读取稀疏数组的空槽并把空槽当作 undefined，因此 new Array(1).includes(undefined) 也为 true。该方法只返回存在性，不返回索引位置。对于对象、数组和函数仍采用引用身份比较，两个结构相同但独立创建的值不会互相命中。

**代码 / 场景：**

严格相等无法识别 NaN，但 includes 可以；indexOf 仍使用严格相等式语义而返回 -1。第三行还展示 SameValueZero 不区分正零和负零。

~~~js
console.log(NaN === NaN)          // false
console.log([NaN].includes(NaN))  // true
console.log([NaN].indexOf(NaN))   // -1
console.log([-0].includes(+0))    // true
~~~

**递进追问：**

1. **Object.is、SameValueZero 和严格相等如何区分零与 NaN？**

   Object.is 认为 NaN 相同但区分 +0 与 -0；SameValueZero 认为 NaN 相同且不区分两种零；严格相等不认 NaN 相同，也不区分两种零。

2. **includes 的 fromIndex 超出范围时会怎样？**

   正向索引大于等于数组长度时直接返回 false；负索引先与长度相加，结果小于零则从零开始。它不会因为越界而抛异常。

**易错点：**

- 不要用 indexOf(value) !== -1 完全替代 includes，遇到 NaN 时语义不同。
- includes 对对象仍比较引用，内容相同的两个对象字面量不会因此相等。

**参考来源：**

- [ECMAScript：Array.prototype.includes](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.includes)
- [MDN：Array.prototype.includes()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)

校验日期：2026-07-20

# JavaScript 61-70：Promise、async 与事件循环

## Q61：new Promise(executor) 中 executor 何时执行？

- A. 立即同步执行
- B. 下一轮宏任务执行
- C. 页面空闲时执行
- D. 调用 then 后执行

**答案：A**

**短回答：**

Promise 构造函数的执行器同步执行，但 then、catch、finally 注册的回调进入微任务队列。

**原理：**

executor 会在 Promise 构造函数被调用时同步执行，而且发生在 new Promise 返回之前。构造器把只能生效一次的 resolve 和 reject 函数传给 executor；首次解决会锁定状态，后续再次调用不会改写结果。executor 同步抛出的异常会被构造器捕获并用于拒绝该 Promise，但如果状态此前已经解决，之后的抛错也不能反转它。真正异步的是 then、catch、finally 注册的反应回调：即使 Promise 已经兑现，它们也会通过 Promise Jobs 队列在当前调用栈结束后运行。

**代码 / 场景：**

构造器里的日志先于 end，说明 executor 同步执行；then 回调被排入微任务，最后输出。完整顺序是 executor、end、then:ok。

~~~js
const promise = new Promise((resolve) => {
  console.log('executor')
  resolve('ok')
})
promise.then((value) => console.log('then:' + value))
console.log('end')
// executor
// end
// then:ok
~~~

**递进追问：**

1. **为什么把同步函数随意包进 new Promise 可能是反模式？**

   executor 本来就同步运行，包装不会把昂贵计算自动移出主线程，反而增加状态与错误通道。只有要把回调式异步 API 适配为 Promise 时才通常需要显式构造。

2. **executor 中 resolve 后再 throw 会发生什么？**

   第一次 resolve 已经锁定 Promise 的解决结果，随后抛出的异常会被构造过程捕获但无法把已解决的 Promise 改为拒绝，因此调用方最终仍会观察到原兑现值。

**易错点：**

- new Promise 不会自动创建线程，executor 中的重计算仍会同步阻塞当前线程。
- executor 设计为立即调用，不能依赖构造完成后才初始化的外部变量。

**参考来源：**

- [ECMAScript：Promise Constructor](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-constructor)
- [MDN：Promise() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise)

校验日期：2026-07-20

## Q62：Promise.then 的回调属于哪类任务？

- A. 同步任务
- B. 微任务
- C. 宏任务
- D. 渲染任务

**答案：B**

**短回答：**

当前同步代码结束后，事件循环会在进入下一个宏任务前清空微任务队列。

**原理：**

then 注册的兑现或拒绝反应通过 ECMAScript 的 Promise Jobs 调度；在浏览器事件循环中，这类 Job 通常作为微任务执行。回调不会在 then 调用的同一调用栈里同步运行，即使原 Promise 已经兑现也一样。当前任务的 JavaScript 栈清空后，事件循环会持续清空微任务队列，再进入渲染机会或下一个任务。每次 then 都立即返回一个新的 Promise，其状态由回调返回值、抛错或返回的 thenable 决定；连续 then 因此前后形成异步链，而不是复用原 Promise。

**代码 / 场景：**

Promise 已用 resolve 兑现，回调仍不会插入同步代码中间。输出先是 A、C，再是 B；then 返回的新 Promise 会采用 value + 1 的结果。

~~~js
console.log('A')
const next = Promise.resolve(1).then((value) => {
  console.log('B')
  return value + 1
})
console.log('C')
next.then((value) => console.log(value))
// A, C, B, 2
~~~

**递进追问：**

1. **then 中 return 普通值与 return Promise 有何区别？**

   普通值会让 then 返回的 Promise 以该值兑现；返回 Promise 或 thenable 时会执行状态吸收，新 Promise 要等待它解决，若它拒绝则沿链传播拒绝原因。

2. **微任务不断追加微任务会有什么风险？**

   事件循环会在进入下一个任务前持续排空微任务。若每个微任务都无界地追加下一个，定时器、输入处理和渲染可能长期得不到机会，形成微任务饥饿。

**易错点：**

- 不要把“微任务”理解为绝对立即执行，它仍要等待当前同步调用栈清空。
- then 回调忘记 return 会让下一环收到 undefined，而不是自动继承局部计算值。

**参考来源：**

- [ECMAScript：PerformPromiseThen](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromisethen)
- [HTML Standard：Microtask queuing](https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint)

校验日期：2026-07-20

## Q63：setTimeout 回调通常属于哪类任务？

- A. 微任务
- B. 宏任务
- C. 同步任务
- D. 编译任务

**答案：B**

**短回答：**

定时器到期后只是把回调加入宏任务队列，并不保证精确时间立即执行。

**原理：**

在浏览器中，setTimeout 到期后会把回调加入定时器任务源对应的任务队列，通常口语称为宏任务；HTML 标准使用的正式术语是 task。delay 表示回调在至少等待这段时间后才有资格排队，并不是准确执行时刻。只有当前任务结束、微任务检查点完成且事件循环选择到该任务时，回调才会运行。嵌套定时器会受到最小延迟钳制，后台页面还可能被更强地节流。清除定时器只需把 handle 传给 clearTimeout，不会影响已经开始执行的回调。

**代码 / 场景：**

即使延迟写 0，定时器也不能打断当前脚本；Promise 微任务会在当前任务结束后先清空。因此输出顺序是 sync、microtask、timer，而不是按源码登记顺序直接执行。

~~~js
setTimeout(() => console.log('timer'), 0)
Promise.resolve().then(() => console.log('microtask'))
console.log('sync')
// sync
// microtask
// timer
~~~

**递进追问：**

1. **为什么 setTimeout(fn, 0) 也可能延迟很久？**

   零只代表没有主动增加的最低等待，回调仍要等当前长任务、所有微任务和排在前面的任务完成；后台节流、主线程繁忙与嵌套钳制都会继续增加延迟。

2. **动画为什么通常使用 requestAnimationFrame 而非 setTimeout？**

   requestAnimationFrame 与浏览器下一次绘制时机协调，后台通常暂停，并给出高精度时间戳；固定间隔定时器容易与刷新周期错位，产生抖动或无效绘制。

**易错点：**

- setTimeout 的 delay 不是执行期限，不能用于需要硬实时保证的业务。
- 向 setTimeout 传字符串会进行类似动态代码求值，既难调试又带来注入风险。

**参考来源：**

- [HTML Standard：Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [MDN：setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)

校验日期：2026-07-20

## Q64：同步日志、Promise.then、setTimeout(0) 的典型执行顺序是什么？

- A. 定时器、Promise、同步
- B. 同步、Promise、定时器
- C. Promise、同步、定时器
- D. 同步、定时器、Promise

**答案：B**

**短回答：**

先执行当前调用栈的同步代码，再清空微任务，最后进入后续宏任务。

**原理：**

典型浏览器脚本中，先执行当前任务里的全部同步代码；调用 then 只登记 Promise 反应微任务，setTimeout(0) 则登记后续定时器任务。当前调用栈清空后，事件循环执行微任务检查点，按队列顺序清空已就绪的 Promise 回调；之后才可能进行渲染并选择下一个任务，所以常见顺序是同步日志、then 回调、定时器回调。这个结论依赖它们在同一轮中登记且 Promise 已解决；若代码嵌套、Promise 尚未解决，或运行在 Node 等宿主，具体先后还要结合各自宿主的事件循环阶段分析。

![浏览器任务、微任务与渲染机会的事件循环顺序图](/content/diagrams/javascript/event-loop-v1.svg "当前任务结束后先清空微任务，再进入渲染机会和下一个任务。")

**代码 / 场景：**

源码登记顺序不是最终运行顺序。当前脚本先输出 1 与 4，随后微任务输出 3，最后定时器任务输出 2，所以完整结果是 1、4、3、2。

~~~js
console.log(1)
setTimeout(() => console.log(2), 0)
Promise.resolve().then(() => console.log(3))
console.log(4)
// 1
// 4
// 3
// 2
~~~

**递进追问：**

1. **then 回调里再次注册微任务，会在定时器前运行吗？**

   通常会。微任务检查点会持续处理队列，执行中的微任务追加的新微任务也会在离开检查点前运行；无界追加则可能推迟定时器和页面渲染。

2. **为什么不能把这套顺序机械套到所有 Node.js 代码？**

   Node 有 timers、poll、check 等阶段，并额外维护 process.nextTick 队列；不同版本和 I/O 回调所在阶段会改变相对顺序，必须结合 Node 官方事件循环规则判断。

**易错点：**

- “先登记先执行”不适用于跨任务队列比较，队列类型和检查点优先级更关键。
- 不要把 Promise 回调称为同步代码，即便已兑现 Promise 的回调也会延后。

**参考来源：**

- [HTML Standard：Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [MDN：In-depth guide to microtasks](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)

校验日期：2026-07-20

## Q65：async 函数一定返回什么？

- A. 普通值
- B. Promise
- C. Generator
- D. DOM 节点

**答案：B**

**短回答：**

即使 return 一个普通值，async 函数也会返回以该值兑现的 Promise。

**原理：**

async 函数每次调用一定返回一个 Promise。函数体正常 return 普通值时，返回的 Promise 以该值兑现；执行到末尾没有 return 时以 undefined 兑现；同步 throw 或 await 到拒绝值时则以相同原因拒绝。若 return 另一个 Promise 或 thenable，外层 Promise 会采用其最终状态，但 async 调用创建的 Promise 通常不是传入 Promise 的同一个对象引用。async 只改变返回与暂停语义，不会把函数体开头的同步计算移到后台；函数会同步执行到首次 await 或结束。调用方因此应统一按异步失败通道处理结果，而不是期待同步抛错直接穿过调用语句。

**代码 / 场景：**

三个函数调用都立刻得到 Promise。普通返回值成为兑现值，抛错成为拒绝原因；日志依次得到 42 与 boom，调用方必须通过 await 或 Promise 链观察。

~~~js
async function value() { return 42 }
async function failure() { throw new Error('boom') }
console.log(value() instanceof Promise) // true
value().then(console.log)               // 42
failure().catch((error) => console.log(error.message)) // boom
~~~

**递进追问：**

1. **async 函数在第一个 await 之前如何执行？**

   调用后会像普通函数一样同步执行，直到遇到 await、return 或 throw。若前半段包含大循环，它仍会阻塞线程，async 关键字不会自动并行化 CPU 任务。

2. **async 返回已有 Promise 时引用是否保持相同？**

   外层 async 调用会返回自身创建的 Promise，并采用内部 Promise 的状态；它与直接 Promise.resolve(existingPromise) 的引用复用行为不同，通常不能用 === 假设二者相同。

**易错点：**

- 调用 async 函数却不 await 或 catch，拒绝可能演变成未处理 Promise rejection。
- async 不等于多线程，首次 await 前的昂贵同步代码照样阻塞主线程。

**参考来源：**

- [ECMAScript：Async Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-async-function-definitions)
- [MDN：async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

校验日期：2026-07-20

## Q66：await 一个已兑现 Promise 后，后续代码何时继续？

- A. 立即在当前调用栈继续
- B. 以微任务方式继续
- C. 以定时器方式继续
- D. 永远不继续

**答案：B**

**短回答：**

await 会暂停当前 async 函数，把后续部分安排到微任务中执行。

**原理：**

即使 await 的 Promise 已经兑现，await 之后的代码也不会在当前调用栈中立即继续。async 函数先暂停，把函数其余部分安排为 Promise 反应 Job；当前同步代码执行完后，它通常在微任务检查点恢复，并取得兑现值。await 会先把表达式结果转换或吸收为 Promise：普通值同样产生一次异步让出；若结果拒绝，恢复时会在 await 位置抛出该拒绝原因，可由函数内 try/catch 捕获。每次 await 都可能引入新的调度边界，因此不应在可并行任务间无意串行等待。

**代码 / 场景：**

Promise.resolve 已兑现，但函数仍先输出 before 并暂停，外层同步日志 sync 随后出现，最后才输出 after 1。结果是 before、sync、after 1。

~~~js
async function run() {
  console.log('before')
  const value = await Promise.resolve(1)
  console.log('after', value)
}
run()
console.log('sync')
// before
// sync
// after 1
~~~

**递进追问：**

1. **连续 await 两个独立请求有什么性能问题？**

   第二个请求若在第一个完成后才创建，会把本可并行的网络等待串行化。应先同时创建两个 Promise，再用 Promise.all 等待，前提是它们没有数据依赖。

2. **await 普通数字为什么也会暂停？**

   await 会按规范把值交给 Promise 解决过程，并通过异步 Job 恢复函数；所以 await 1 仍产生调度边界，不会像普通赋值一样在同一栈继续。

**易错点：**

- 不要假设已兑现 Promise 的 await 是同步操作，它仍会让出当前调用栈。
- 循环内逐项 await 可能无意串行化独立任务，应根据依赖关系决定并发策略。

**参考来源：**

- [ECMAScript：Await](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#await)
- [MDN：await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)

校验日期：2026-07-20

## Q67：Promise.all 中一个 Promise 拒绝会怎样？

- A. 等待全部成功后再拒绝
- B. 返回的 Promise 尽快拒绝
- C. 自动忽略错误
- D. 自动重试

**答案：B**

**短回答：**

Promise.all 具有快速失败语义，但其他已经启动的异步任务不会因此自动取消。

**原理：**

Promise.all 返回的新 Promise 会在任一输入首先拒绝时立即以该原因拒绝，不再等待其他结果来决定外层状态；若全部兑现，则按输入迭代顺序返回值数组，而不是按完成顺序排列。所谓“快速失败”不等于取消：已启动的请求、定时器或计算仍会继续，除非任务本身支持 AbortSignal 等取消协议并由调用方主动触发。非 Promise 输入会按兑现值处理，空迭代对象返回一个已兑现的空数组 Promise。迭代、thenable 访问等过程自身抛错也会导致拒绝。

**代码 / 场景：**

fast 在十毫秒后拒绝，all 进入 catch 并输出 fail；slow 定时器仍继续运行并输出 slow finished，证明 Promise.all 不会自动取消其他任务。

~~~js
const slow = new Promise((resolve) => setTimeout(() => {
  console.log('slow finished')
  resolve('slow')
}, 50))
const fast = Promise.reject(new Error('fail'))
Promise.all([slow, fast]).catch((error) => console.log(error.message))
// fail
// slow finished
~~~

**递进追问：**

1. **如何在 Promise.all 失败后取消其余 fetch？**

   为相关 fetch 共享或分别传入 AbortController 的 signal，在 catch 或业务超时处调用 abort。取消是任务协议提供的能力，并非 Promise.all 自带。

2. **为什么结果数组仍按输入顺序排列？**

   all 为每个输入记录固定索引，某项兑现时把值写到对应位置；只有剩余计数归零才整体兑现，因此并发完成先后不会改变调用方预期的数据对应关系。

**易错点：**

- Promise.all 拒绝不会停止其他副作用，重复提交或资源消耗仍需单独治理。
- 若只 catch 外层失败，会丢失其余任务的结果视图；需要全量结果时用 allSettled。

**参考来源：**

- [ECMAScript：Promise.all](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all)
- [MDN：Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

校验日期：2026-07-20

## Q68：想获得每个 Promise 的成功或失败结果，应使用什么？

- A. Promise.allSettled
- B. Promise.resolve
- C. Promise.reject
- D. Promise.finally

**答案：A**

**短回答：**

allSettled 会等待所有输入结束，并返回带 status 的结果数组。

**原理：**

通常使用 Promise.allSettled。它等待输入中的每一项都结束，并返回一个按输入顺序排列的结果数组：兑现项是 { status: 'fulfilled', value }，拒绝项是 { status: 'rejected', reason }。正常的单项拒绝不会让外层 Promise 拒绝，因此适合批量任务报告、部分成功上传或并行健康检查。它与逐项 catch 后再 Promise.all 的手写方案相比，结果结构统一且不会误把业务失败伪装成普通值。allSettled 同样不会取消任务，也不会替你重试、记录或吞掉 reason 中的敏感信息。调用方必须逐项解释状态，才能计算真正的成功率和补偿范围。

**代码 / 场景：**

两个任务分别成功和失败，allSettled 仍正常兑现并给出两条结构化记录；输出顺序保持与输入一致，而不是取决于谁先结束。

~~~js
const results = await Promise.allSettled([
  Promise.resolve('saved'),
  Promise.reject(new Error('offline')),
])
console.log(results[0]) // { status: 'fulfilled', value: 'saved' }
console.log(results[1].status, results[1].reason.message) // rejected offline
~~~

**递进追问：**

1. **怎样从 allSettled 结果中安全取得成功值？**

   先按 result.status 判别，再访问 value 或 reason；在 TypeScript 中这是判别联合，分支检查能完成类型收窄，不能不判断就统一读取 value。

2. **什么时候仍应选择 Promise.all？**

   当所有子结果都是继续执行的必要条件，任一失败就应让整体立即失败时，Promise.all 更准确；allSettled 会等待最慢任务，可能延迟本可提前终止的流程。

**易错点：**

- allSettled 外层成功不代表业务全部成功，必须逐项检查 status。
- 直接把 reason 序列化给用户可能泄露堆栈、地址或服务端敏感信息。

**参考来源：**

- [ECMAScript：Promise.allSettled](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled)
- [MDN：Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)

校验日期：2026-07-20

## Q69：Promise.race 的结果由什么决定？

- A. 最后完成的 Promise
- B. 第一个落定的 Promise
- C. 第一个成功的 Promise
- D. 数组长度

**答案：B**

**短回答：**

第一个兑现或拒绝的输入决定 race 的最终状态。只想取第一个成功值可了解 Promise.any。

**原理：**

Promise.race 返回的 Promise 由输入中最先解决的那一项决定：最先兑现就以其值兑现，最先拒绝就以其原因拒绝，之后其他输入的结果不再改变外层状态。这里比较的是 settle 而不是只比较成功。非 Promise 值会被 Promise.resolve 式吸收，因而也可很快成为胜者；但 race 的外层仍异步解决，不会在调用栈内同步执行回调。空可迭代对象没有任何竞争者，返回的 Promise 会永久保持 pending。race 不会取消输家，所以用它实现超时还必须显式中止底层请求。

**代码 / 场景：**

十毫秒后的 timeout 先拒绝，因此 race 进入 catch；五十毫秒后的 slow 仍会运行。若 slow 是 fetch，应配合 AbortController，而不能只丢弃晚到结果。

~~~js
const slow = new Promise((resolve) => setTimeout(() => resolve('data'), 50))
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('timeout')), 10)
)
try {
  await Promise.race([slow, timeout])
} catch (error) {
  console.log(error.message) // timeout
}
~~~

**递进追问：**

1. **race 与 Promise.any 的失败语义有何不同？**

   race 接受第一个 settled 结果，首个拒绝就会整体拒绝；any 忽略单项拒绝并等待第一个兑现值，只有全部拒绝时才以 AggregateError 拒绝。

2. **如何实现不会泄漏请求的 fetch 超时？**

   创建 AbortController，把 signal 传给 fetch；定时器到期时先 controller.abort() 再拒绝，并在 finally 清除定时器，确保超时后网络工作也真正停止。

**易错点：**

- Promise.race 的“最快”包含最快拒绝，不保证返回第一个成功结果。
- 仅与超时 Promise 竞争不会取消真实任务，可能继续占用连接并产生副作用。

**参考来源：**

- [ECMAScript：Promise.race](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.race)
- [MDN：Promise.race()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race)

校验日期：2026-07-20

## Q70：Promise.finally 的回调通常会得到原结果参数吗？

- A. 会得到成功值
- B. 会得到失败原因
- C. 不会直接得到原结果参数
- D. 只得到布尔值

**答案：C**

**短回答：**

finally 用于不依赖结果的清理。若它不抛错或返回拒绝 Promise，原状态和值会继续向后传递。

**原理：**

finally 的 onFinally 通常不接收原兑现值或拒绝原因，因为同一清理逻辑应同时服务两条路径。若回调正常完成或返回一个最终兑现的 Promise，finally 返回的新 Promise 会透明保留原状态与原结果；若回调抛错或返回拒绝的 Promise，则新的拒绝原因会覆盖原结果。finally 回调的返回普通值不会像 then 那样替换原兑现值。它适合关闭加载状态、释放锁或清理临时资源，但若清理失败确实重要，就应允许新拒绝传播并保留必要的原错误上下文。

**代码 / 场景：**

回调参数为 undefined，普通 return 999 不会覆盖原值，最终 then 仍输出 42；若把 return 改成 Promise.reject，后续会转入 catch。

~~~js
Promise.resolve(42)
  .finally((value) => {
    console.log(value) // undefined
    return 999
  })
  .then((value) => console.log(value)) // 42
~~~

**递进追问：**

1. **finally 与 then(onFulfilled, onRejected) 的透明性有何区别？**

   finally 不需复制两套分支，正常完成时保留原值或原原因；then 的处理函数若返回普通值，会把链条转成以该值兑现，因此更容易意外吞掉拒绝。

2. **清理函数本身失败时应该怎样处理？**

   若清理失败影响一致性，应让其拒绝传播，并在日志中同时关联原操作与清理错误；若只是非关键遥测，则可在 finally 内部捕获，避免覆盖主要业务结果。

**易错点：**

- 不要指望 finally 参数拿到响应数据或错误对象，应在 then 或 catch 中处理。
- finally 中抛错会覆盖原来的成功值或失败原因，可能掩盖真正根因。

**参考来源：**

- [ECMAScript：Promise.prototype.finally](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.finally)
- [MDN：Promise.prototype.finally()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally)

校验日期：2026-07-20

# JavaScript 71-80：DOM、存储与网络

## Q71：DOM 事件冒泡的方向是什么？

- A. 从 window 到目标元素
- B. 从目标元素向祖先传播
- C. 只在目标元素执行
- D. 随机传播

**答案：B**

**短回答：**

事件先经历捕获阶段到达目标，再从目标向祖先节点冒泡。

**原理：**

事件传播通常先沿事件路径从 Window、Document 和祖先元素向目标移动，这是捕获阶段；到达目标后再进入目标阶段；若事件的 bubbles 为 true，随后从目标的父元素逐级向外返回到更高祖先，这一段就是冒泡。event.target 表示原始或经 Shadow DOM 重定向后的目标，event.currentTarget 则是当前正在执行监听器的节点。并非所有事件都会冒泡，例如 mouseenter 不冒泡，focus 本身不冒泡但可使用会冒泡的 focusin。传播路径在派发开始时确定，具体还受 composed 与 Shadow DOM 边界影响。

**代码 / 场景：**

点击 button 时，按钮监听器先输出 button，随后父容器监听器输出 parent；父监听器里的 target 仍是 BUTTON，而 currentTarget 是父 DIV，体现冒泡由内向外。

~~~html
<div id="parent"><button id="child">保存</button></div>
<script>
child.addEventListener('click', () => console.log('button'))
parent.addEventListener('click', (event) => {
  console.log('parent', event.target.tagName, event.currentTarget.id)
})
// 点击按钮：button，然后 parent BUTTON parent
</script>
~~~

**递进追问：**

1. **event.target 与 currentTarget 为什么不能混用？**

   target 用于识别事件最初来自哪个后代，currentTarget 表示监听器绑定位置。事件委托靠 target 匹配业务节点，而解绑或读取容器数据通常使用 currentTarget。

2. **Shadow DOM 会怎样影响事件路径？**

   只有 composed 事件可穿过影子边界，且浏览器会对外部监听器重定向 target 以保持封装；需要完整路径时可查看 composedPath，但仍应尊重组件边界。

**易错点：**

- 冒泡只描述从目标向祖先的阶段，不能忽略此前发生的捕获阶段。
- 不要假设所有事件都冒泡，mouseenter、load 等事件需要不同代理策略。

**参考来源：**

- [DOM Standard：Event dispatch](https://dom.spec.whatwg.org/#concept-event-dispatch)
- [MDN：Event bubbling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)

校验日期：2026-07-20

## Q72：addEventListener 的 capture 选项为 true 表示什么？

- A. 在捕获阶段监听
- B. 禁止事件
- C. 只监听一次
- D. 自动移除监听

**答案：A**

**短回答：**

capture 为 true 时，监听器在事件从外向内传播的捕获阶段执行。

**原理：**

capture: true 表示该监听器在事件沿路径向目标传播的捕获阶段被调用，而不是等冒泡阶段从目标返回时调用。祖先捕获监听器通常按从外到内的路径运行；同一目标节点上，捕获监听器也会在非捕获监听器之前参与目标阶段。capture 只改变监听器所处阶段，不会让原本不可穿过 Shadow DOM 的事件越界，也不会改变事件是否具有默认动作。移除监听器时，removeEventListener 至少要使用相同的事件类型、回调引用和 capture 标志，否则匹配不到原注册记录。

**代码 / 场景：**

点击按钮时，document 的捕获监听器先于按钮自身监听器运行，最后才是 div 的冒泡监听器；典型输出为 document capture、button target、div bubble。

~~~js
document.addEventListener('click', () => console.log('document capture'), { capture: true })
div.addEventListener('click', () => console.log('div bubble'))
button.addEventListener('click', () => console.log('button target'))
~~~

**递进追问：**

1. **capture 适合哪些实际场景？**

   它可用于在后代冒泡处理前进行全局观察、处理某些不冒泡但可捕获的事件，或构建外层交互策略；不应只为“优先级更高”而滥用。

2. **once、passive 与 capture 分别控制什么？**

   capture 决定传播阶段，once 让监听器调用一次后自动移除，passive 声明监听器不会调用 preventDefault；三者可同时配置但解决的是不同问题。

**易错点：**

- 解绑时遗漏相同 capture 标志，会让监听器继续存在并造成重复处理或泄漏。
- capture 为 true 不代表可以绕过 stopPropagation，传播仍可能在更外层被终止。

**参考来源：**

- [DOM Standard：addEventListener](https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener)
- [MDN：EventTarget.addEventListener()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)

校验日期：2026-07-20

## Q73：event.preventDefault() 的作用是什么？

- A. 阻止事件传播
- B. 阻止浏览器默认行为
- C. 删除事件对象
- D. 阻止 JavaScript 执行

**答案：B**

**短回答：**

例如阻止链接跳转或表单提交。它不会自动阻止事件继续传播。

**原理：**

preventDefault 用来请求取消事件关联的默认动作，例如链接导航、表单提交或复选框切换，但它不会停止事件继续捕获或冒泡。只有 event.cancelable 为 true 时调用才可能生效，成功取消后 defaultPrevented 会变为 true。对 passive: true 的监听器，浏览器会忽略 preventDefault，因为注册者已经承诺不阻止默认动作，并可能给出控制台警告。取消默认动作不等于撤销监听器里已经执行的 JavaScript 副作用；表单校验、路由拦截等逻辑仍需自行保证状态一致。

**代码 / 场景：**

监听器阻止链接导航，但事件仍会冒泡到 document；控制台先输出 canceled true，随后输出 document click，页面地址保持不变。

~~~js
link.addEventListener('click', (event) => {
  event.preventDefault()
  console.log('canceled', event.defaultPrevented) // true
})
document.addEventListener('click', () => console.log('document click'))
~~~

**递进追问：**

1. **return false 在原生 addEventListener 中能替代 preventDefault 吗？**

   不能。原生 addEventListener 会忽略监听器返回值；return false 的组合语义来自某些内联处理器或框架封装，通用原生代码应显式调用 preventDefault。

2. **如何判断自定义事件能否被取消？**

   创建 CustomEvent 时要设置 cancelable: true，派发方可检查 dispatchEvent 的返回值或 event.defaultPrevented；未设置时监听器调用 preventDefault 不会产生取消效果。

**易错点：**

- preventDefault 不会停止传播，需要阻止祖先监听器时应单独使用传播控制方法。
- 在 passive 监听器里调用 preventDefault 不生效，触摸与滚轮事件尤其常见。

**参考来源：**

- [DOM Standard：preventDefault](https://dom.spec.whatwg.org/#dom-event-preventdefault)
- [MDN：Event.preventDefault()](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)

校验日期：2026-07-20

## Q74：event.stopPropagation() 的作用是什么？

- A. 阻止默认行为
- B. 阻止事件继续传播
- C. 取消异步请求
- D. 删除 DOM

**答案：B**

**短回答：**

它影响捕获或冒泡传播，但不会自动取消默认行为。

**原理：**

stopPropagation 会设置停止传播标志，使事件不再沿传播路径前往后续节点；在捕获阶段调用可阻止它继续到达更内层节点，在目标或冒泡阶段调用则阻止它继续到祖先。它不会取消元素的默认动作，也不会阻止当前节点上其他符合条件的监听器继续执行。若连同一节点后注册的监听器也要停止，应使用 stopImmediatePropagation。过度停止传播会破坏页面级快捷键、埋点和可访问性逻辑，组件通常应优先通过明确状态或目标过滤避免冲突。

**代码 / 场景：**

按钮上两个监听器都会运行，但父容器不会收到该点击，说明 stopPropagation 只截断后续节点而不截断同节点监听器。链接若有默认导航，导航也不会因此自动取消。

~~~js
button.addEventListener('click', (event) => {
  console.log('first')
  event.stopPropagation()
})
button.addEventListener('click', () => console.log('second'))
parent.addEventListener('click', () => console.log('parent'))
// 点击后输出 first、second；不输出 parent
~~~

**递进追问：**

1. **stopImmediatePropagation 比 stopPropagation 多做了什么？**

   它除了阻止事件继续到其他节点，还阻止当前节点上尚未执行的同类型监听器；这会形成更强耦合，使用前要确认不会屏蔽其他模块。

2. **点击弹窗内部不关闭弹窗，一定要停止冒泡吗？**

   不一定。更稳健的外层处理可判断 event.target 是否就是遮罩层，或用 closest 检查交互区域；这样不会阻断全局统计与其他祖先行为。

**易错点：**

- stopPropagation 不会阻止链接导航或表单提交，默认动作要另外处理。
- 它不会停止当前元素上的其他监听器，误解这一点会导致重复业务执行。

**参考来源：**

- [DOM Standard：stopPropagation](https://dom.spec.whatwg.org/#dom-event-stoppropagation)
- [MDN：Event.stopPropagation()](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation)

校验日期：2026-07-20

## Q75：事件委托的核心是什么？

- A. 给每个子元素都创建监听器
- B. 利用事件冒泡在祖先元素统一处理
- C. 使用 setTimeout
- D. 使用 Web Worker

**答案：B**

**短回答：**

祖先监听器通过 event.target 或 closest 判断来源，适合动态列表并减少监听器数量。

**原理：**

事件委托的核心是利用事件传播，在稳定的祖先节点注册少量监听器，再根据 event.target 或 composedPath 判断真正触发交互的后代并执行对应逻辑。这样动态新增的子节点无需逐个绑定，长列表也能降低监听器注册与清理成本。实际实现通常用 target.closest(selector) 找到可能被图标、文本等深层节点包裹的业务元素，并确认匹配节点仍位于委托容器内部。它依赖事件能够传播到容器；focus、mouseenter 等不冒泡事件应改用 focusin、mouseover 或捕获监听器，并考虑 Shadow DOM 的重定向边界。

**代码 / 场景：**

列表只绑定一次 click。无论点击按钮文字还是以后动态加入的新按钮，closest 都能找到 data-id；contains 检查防止匹配到容器外节点，最后输出对应编号。

~~~js
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]')
  if (!button || !list.contains(button)) return
  console.log('remove', button.dataset.id)
})
list.insertAdjacentHTML('beforeend', '<button data-id="42"><span>删除</span></button>')
~~~

**递进追问：**

1. **为什么只检查 event.target.matches("button") 不够稳健？**

   用户可能点到按钮内部的 span、svg 或 path，此时 target 不是 button。closest 可沿祖先寻找业务节点，再配合容器边界检查避免误匹配。

2. **事件委托是否总比逐项监听更高效？**

   不是。子项很少或事件不冒泡时，直接绑定更简单；委托还会让每次事件执行选择器匹配。应根据节点生命周期、数量和交互边界选择。

**易错点：**

- closest 可能匹配到委托容器之外的祖先，必须再检查匹配节点是否属于容器。
- 不能假设所有事件都冒泡，对 focus、mouseenter 等需要替代事件或捕获方案。

**参考来源：**

- [DOM Standard：Event dispatch](https://dom.spec.whatwg.org/#concept-event-dispatch)
- [MDN：Event bubbling and delegation](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)

校验日期：2026-07-20

## Q76：localStorage 存储的值是什么类型？

- A. 任意对象
- B. 字符串
- C. Promise
- D. Symbol

**答案：B**

**短回答：**

对象需要先 JSON.stringify，读取后再 JSON.parse。localStorage 通常在同源页面间持久保存。

**原理：**

localStorage 的键和值都通过 DOMString 接口保存为字符串；赋入数字、布尔值或普通对象时会先发生字符串转换，对象直接写入通常得到 "[object Object]"，因此结构化数据要显式 JSON.stringify，并在读取时 JSON.parse。存储按源隔离，数据通常跨页面重载和浏览器会话保留，但用户清理站点数据、隐私模式策略或配额限制都可能让它不可用。API 是同步的，大对象序列化和频繁写入会阻塞主线程；StorageEvent 通常通知同源的其他文档，不会在发起写入的当前文档自身触发。

**代码 / 场景：**

直接保存对象会丢失结构，正确方案是序列化。读取不存在的键返回 null，因此解析前要判断；示例最终还原出对象并输出 Linda。

~~~js
const profile = { name: 'Linda', level: 2 }
localStorage.setItem('profile', JSON.stringify(profile))
const raw = localStorage.getItem('profile')
const restored = raw === null ? null : JSON.parse(raw)
console.log(restored.name) // Linda
~~~

**递进追问：**

1. **为什么敏感令牌不宜放 localStorage？**

   同源页面中运行的 JavaScript 都可读取它，XSS 一旦发生便可直接窃取并外传。会话凭据通常优先使用具备 HttpOnly、Secure、SameSite 属性的 Cookie。

2. **大量离线结构化数据应选择什么存储？**

   IndexedDB 提供异步事务、索引和结构化克隆，适合较大数据集；localStorage 更适合少量简单偏好，并且所有写入都要处理配额与安全异常。

**易错点：**

- 直接 setItem 写对象只会得到 [object Object]，必须明确序列化格式与版本。
- localStorage 访问可能抛 SecurityError 或配额异常，不能假定任何环境都可写。

**参考来源：**

- [HTML Standard：Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- [MDN：Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

校验日期：2026-07-20

## Q77：sessionStorage 的生命周期通常是什么？

- A. 永久存在
- B. 当前标签页会话
- C. 一次函数调用
- D. 一次网络请求

**答案：B**

**短回答：**

sessionStorage 与标签页会话关联，关闭标签页后通常清除，不同标签页的数据彼此独立。

**原理：**

sessionStorage 按“源 + 顶层浏览上下文”划分，一个标签页中的同源文档共享该页会话数据，但另一个独立标签页通常拥有不同存储区。数据在刷新、同标签页导航和恢复页面时一般仍存在，关闭对应标签页或窗口后页面会话通常结束，数据随之清除。通过带 opener 的方式打开新页面时，新页面的初始 sessionStorage 可能从 opener 复制一份，但之后两边独立变化；使用 noopener 可避免这种初始复制与反向引用。它与 localStorage 一样只保存字符串、使用同步 API，并受隐私与存储策略约束。

**代码 / 场景：**

计数值在同一标签页刷新后继续增加，但新开一个独立标签页会从自己的存储区开始。关闭原标签页后重新打开普通页面，不能依赖旧值仍存在。

~~~js
const visits = Number(sessionStorage.getItem('visits') ?? 0) + 1
sessionStorage.setItem('visits', String(visits))
console.log(visits) // 同一标签页刷新：1、2、3……
~~~

**递进追问：**

1. **sessionStorage 与 session Cookie 的边界有什么不同？**

   sessionStorage 只供页面脚本读取且不会随 HTTP 请求发送；会话 Cookie 可由浏览器自动发往匹配服务端，并可设置 HttpOnly，使脚本无法读取。

2. **为什么不能把“关标签即必删”当作绝对业务保证？**

   浏览器可能支持崩溃恢复或会话恢复，隐私策略也因实现而异。安全注销必须由服务端撤销会话，不能只依赖前端存储的生命周期。

**易错点：**

- 同源不代表所有标签页共享 sessionStorage，它还按顶层浏览上下文分区。
- 不要用 sessionStorage 是否存在作为服务端登录有效性的唯一判断依据。

**参考来源：**

- [HTML Standard：The sessionStorage attribute](https://html.spec.whatwg.org/multipage/webstorage.html#the-sessionstorage-attribute)
- [MDN：Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

校验日期：2026-07-20

## Q78：Cookie 与 localStorage 的重要区别是什么？

- A. Cookie 永远不会发给服务器
- B. 符合条件的 Cookie 会随 HTTP 请求发送
- C. localStorage 会自动随请求发送
- D. 二者没有区别

**答案：B**

**短回答：**

Cookie 可用于会话，但应正确设置 HttpOnly、Secure、SameSite 等属性；localStorage 不会自动随请求发送。

**原理：**

Cookie 的核心用途是让浏览器按 Domain、Path、Secure、SameSite、过期时间等规则随匹配的 HTTP 请求自动携带少量状态，服务端也可通过 Set-Cookie 写入；HttpOnly Cookie 还能禁止 JavaScript 读取。localStorage 是同源页面脚本主动读写的持久字符串存储，不会自动进入请求头，容量通常更大但 API 同步。二者安全边界不同：Cookie 的自动发送带来 CSRF 考量，localStorage 中的令牌则容易被 XSS 直接读取。现代浏览器还会按站点、第三方上下文或隐私策略进一步分区和限制存储。

**代码 / 场景：**

服务端设置 HttpOnly 会话 Cookie 后，浏览器在匹配请求中自动携带它，但 document.cookie 看不到该值；localStorage 里的偏好只在脚本主动读取时出现，不会发送给服务器。

~~~http
Set-Cookie: session=abc; Path=/; Secure; HttpOnly; SameSite=Lax
~~~

~~~js
localStorage.setItem('theme', 'dark')
console.log(localStorage.getItem('theme')) // dark
~~~

**递进追问：**

1. **HttpOnly Cookie 能单独防住 CSRF 吗？**

   不能。HttpOnly 只阻止脚本读取，浏览器仍会自动发送 Cookie。还需 SameSite、Origin 或 Referer 校验、CSRF token，并保证 GET 等安全方法无副作用。

2. **为什么 localStorage 也不能称为永久存储？**

   用户可清除站点数据，浏览器可在隐私或配额策略下回收，应用也可能主动覆盖。持久业务事实仍应写入受控服务端或具备同步策略的存储。

**易错点：**

- 不要仅按容量选择存储，是否自动随请求发送和脚本可读性才是关键边界。
- 把访问令牌放 localStorage 会扩大 XSS 后果，不能靠前端混淆解决。

**参考来源：**

- [RFC 6265bis：Cookies](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)
- [HTML Standard：Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)

校验日期：2026-07-20

## Q79：同源策略中的“源”由什么组成？

- A. 协议、主机、端口
- B. 路径、查询参数、哈希
- C. 用户名、密码、路径
- D. 浏览器、系统、设备

**答案：A**

**短回答：**

协议、主机或端口任意不同，就属于不同源；路径不同不影响同源判断。

**原理：**

对普通 HTTP(S) URL，源由协议、主机和端口三元组组成，三者都相同才是同源；路径、查询参数和片段不参与。省略端口时按协议默认端口规范化，因此 https://example.com 与显式 443 通常同源，但 http 与 https、不同子域或不同端口均不是同源。同源策略限制一个源的脚本读取另一个源的 DOM 和响应数据，但网络写请求仍可能被发送，所以它不能替代 CSRF 防护。data: 等 URL 可能产生不透明源，file: 的处理还存在浏览器实现差异，不应依赖它构建安全模型。

**代码 / 场景：**

基准是 https://app.example.com:443。第一个 URL 同源，因为默认 HTTPS 端口就是 443；后面三个分别在协议、主机和端口上不同，因此都跨源。

~~~text
https://app.example.com/profile       同源
http://app.example.com/profile        不同源：协议
https://api.example.com/profile       不同源：主机
https://app.example.com:8443/profile  不同源：端口
~~~

**递进追问：**

1. **跨源与跨站是同一个概念吗？**

   不是。源比较协议、主机和端口，站点概念通常围绕可注册域及方案。两个子域可能跨源但同站，这会影响 SameSite Cookie 与浏览器安全判断。

2. **document.domain 为什么不再是推荐的跨子域方案？**

   它会弱化源隔离并只影响部分检查，且已被标准标记为弃用方向。跨文档通信应使用 postMessage 并严格校验 origin 与消息结构。

**易错点：**

- 路径不同不会形成新源，不能靠把管理页面放在不同路径实现安全隔离。
- 同源策略主要限制读取而非阻止请求发出，因此仍需服务端防 CSRF。

**参考来源：**

- [HTML Standard：Origins](https://html.spec.whatwg.org/multipage/browsers.html#origins)
- [MDN：Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)

校验日期：2026-07-20

## Q80：CORS 响应头通常由谁配置？

- A. 浏览器扩展
- B. 目标服务器
- C. 前端 localStorage
- D. HTML 标签

**答案：B**

**短回答：**

浏览器执行同源限制，服务器通过 Access-Control-Allow-Origin 等响应头声明哪些跨源请求可被前端读取。

**原理：**

CORS 响应头应由目标资源的服务端或代表它的受信反向代理配置，浏览器负责依据 Fetch/CORS 协议执行检查；前端 JavaScript 不能自行添加 Access-Control-Allow-Origin 来获得读取权限。跨源请求中，浏览器会发送 Origin；对非简单方法或头部可能先发 OPTIONS 预检，服务端必须明确允许来源、方法和请求头。携带凭据时，响应不能用通配符来源，必须返回与请求匹配的具体来源并允许 credentials。CORS 只控制浏览器脚本能否读取响应，不是认证、授权或阻止非浏览器客户端调用的机制。

**代码 / 场景：**

API 根据可信白名单返回具体来源，并让缓存区分 Origin。若前端只在 fetch 请求头里伪造同名响应头，浏览器仍会拦截，因为许可必须出现在服务器响应中。

~~~http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Vary: Origin
Content-Type: application/json
~~~

**递进追问：**

1. **为什么 Postman 能调用而浏览器前端被 CORS 拦截？**

   CORS 是浏览器对脚本读取跨源响应施加的安全策略，Postman 等独立客户端不受该浏览器沙箱约束；这不表示服务端授权配置正确。

2. **预检成功后实际请求还需要 CORS 响应头吗？**

   需要。预检只确认实际请求可发送，浏览器仍会检查实际响应中的允许来源等头；缺失时脚本依旧不能读取响应。

**易错点：**

- 不要把 CORS 当作后端访问控制，攻击者可绕过浏览器直接请求接口。
- 动态回显任意 Origin 并允许凭据会破坏隔离，必须使用严格白名单。

**参考来源：**

- [Fetch Standard：CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [MDN：Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

校验日期：2026-07-20

# JavaScript 81-90：模块、类与迭代器

## Q81：同一作用域能否重复声明同名 let 变量？

- A. 可以
- B. 不可以，会产生语法错误
- C. 只在严格模式不可以
- D. 只在模块中可以

**答案：B**

**短回答：**

let 和 const 不允许在同一词法作用域重复声明同名绑定。

**原理：**

不能。在同一个词法作用域内，两个同名 let 声明会构成早期语法错误，代码在执行前就无法实例化；let 与同作用域的 const、class，或与会冲突的 var、函数声明组合，也可能产生同名绑定冲突。原因是词法环境必须为该标识符建立唯一绑定，并从作用域开始到初始化前处于暂时性死区。内外两个嵌套块拥有不同词法环境，因此内层可重新声明并遮蔽外层变量；两个先后但不嵌套的独立块也各有自己的绑定。是否“同一作用域”必须按语法块、模块或函数环境判断，不能只看源码行距。

**代码 / 场景：**

第一段会在解析阶段抛 SyntaxError，任何日志都不会运行；第二段合法，内层 x 只遮蔽外层 x，依次输出 inner 与 outer。

~~~js
// let x = 1
// let x = 2 // SyntaxError: Identifier 'x' has already been declared

let x = 'outer'
{
  let x = 'inner'
  console.log(x) // inner
}
console.log(x)   // outer
~~~

**递进追问：**

1. **为什么重复 let 通常无法用 try/catch 捕获？**

   它属于代码求值前发现的早期语法错误，脚本或模块尚未开始执行，try 语句本身也没有机会运行；动态 import 的失败可通过其 Promise 观察。

2. **let 与 var 的重复声明规则为何不同？**

   var 绑定在函数或全局变量环境中，规范允许部分重复声明；let 创建块级词法绑定并要求唯一。二者在同一作用域冲突时仍会产生语法错误。

**易错点：**

- 不要把内层合法遮蔽误认为同作用域重复声明，两者对应不同词法环境。
- 多个传统 script 标签也可能共享全局词法环境，顶层 let 重名仍会失败。

**参考来源：**

- [ECMAScript：Let and Const Declarations](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations)
- [MDN：let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)

校验日期：2026-07-20

## Q82：导入命名导出 foo 的正确形式是什么？

- A. import foo from './mod.js'
- B. import { foo } from './mod.js'
- C. require { foo }
- D. include foo

**答案：B**

**短回答：**

命名导出使用花括号导入，名称默认需要与导出名称一致，也可使用 as 起别名。

**原理：**

若模块通过 export const foo、export function foo 或 export { foo } 提供命名导出，导入语法是 import { foo } from './module.js'。花括号中的名字必须匹配导出名，也可写 import { foo as localFoo } 为当前模块建立别名。导入得到的是指向导出绑定的只读实时视图：导出模块更新其绑定后，读取方能看到新值，但导入方不能给该绑定重新赋值。静态 import 只能出现在模块顶层，并在模块求值前完成解析和链接；浏览器相对说明符通常还需要明确扩展名或由打包器解析。

**代码 / 场景：**

counter.js 提供命名导出，main.js 用花括号导入。inc 修改导出模块中的绑定后，导入的 count 会实时反映为 1，但 main.js 不能执行 count = 5。

~~~js
// counter.js
export let count = 0
export const inc = () => { count += 1 }

// main.js
import { count, inc } from './counter.js'
inc()
console.log(count) // 1
~~~

**递进追问：**

1. **命名导出如何在导入时重命名？**

   使用 import { foo as localFoo } from './module.js'。重命名只改变当前模块的本地标识符，不会改变源模块的导出名或其他导入者。

2. **import * as namespace 得到的是什么？**

   它得到模块命名空间对象，属性对应所有命名导出并体现实时绑定。该对象不是普通可随意增删改的对象，通常用 namespace.foo 读取。

**易错点：**

- 命名导入必须使用花括号，漏掉花括号会被解释为导入默认导出。
- 导入绑定只读不代表导入对象深度只读，对象自身属性仍可能被修改。

**参考来源：**

- [ECMAScript：Imports](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-imports)
- [MDN：import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

校验日期：2026-07-20

## Q83：导入默认导出的正确形式是什么？

- A. import { default } only
- B. import anyName from './mod.js'
- C. import * as default
- D. export from './mod.js'

**答案：B**

**短回答：**

默认导入不使用花括号，本地名称可以由导入方自行决定。

**原理：**

默认导出使用 import localName from './module.js' 导入，不写花括号，而且 localName 可由导入方自行命名。源模块可写 export default expression，或默认导出函数、类；每个模块最多只有一个 default 导出。默认导出在模块记录中对应名为 default 的特殊导出项，不是“自动导入模块中唯一变量”。它可与命名导出一起导入，例如 import client, { timeout } from './api.js'。静态导入仍是实时模块链接的一部分，但默认导出表达式与导出已有绑定在细节上可能不同，不应依赖重新赋值技巧。

**代码 / 场景：**

math.js 默认导出函数，导入方可把它命名为 add，无需与源文件中的函数名一致；命名导出 version 则仍需花括号。输出依次是 5 和 1。

~~~js
// math.js
export default function sum(a, b) { return a + b }
export const version = 1

// main.js
import add, { version } from './math.js'
console.log(add(2, 3)) // 5
console.log(version)   // 1
~~~

**递进追问：**

1. **如何把另一个模块的默认导出重新导出？**

   可以写 export { default } from './module.js'，也可写 export { default as named } 将其转换为当前模块的命名导出，便于统一入口文件组织 API。

2. **默认导出与命名导出在重构上有何取舍？**

   命名导入由导出方固定名称，工具更容易安全重命名并保持团队一致；默认导入允许任意本地名，单一主入口方便但可能造成同物多名。

**易错点：**

- import { value } 不会取得默认导出，除非源模块确实还有名为 value 的命名导出。
- 一个模块不能声明多个 default 导出，多个主要能力应改用命名导出组织。

**参考来源：**

- [ECMAScript：Exports](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-exports)
- [MDN：export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)

校验日期：2026-07-20

## Q84：静态 import 声明有什么特点？

- A. 可写在任意 if 块中
- B. 在模块顶层声明，依赖可被静态分析
- C. 只能运行时解析
- D. 返回普通字符串

**答案：B**

**短回答：**

静态 import 的结构在执行前已知，有利于打包器做依赖分析和 Tree Shaking；动态加载使用 import()。

**原理：**

静态 import 的模块说明符和导入列表在语法上固定，只能写在 ECMAScript 模块的顶层。宿主可在执行模块代码前解析完整依赖图，完成加载、链接和循环依赖绑定，因此导入声明看起来具有提升效果，导入绑定也具有实时只读语义。这种静态结构让浏览器预加载、打包器 tree shaking 和依赖审计成为可能。它不能放进 if、函数或 try 块来按运行条件选择模块；需要运行时条件或变量说明符时应调用 import()，后者返回 Promise。静态可分析不代表依赖一定同步下载，加载策略由宿主决定。

**代码 / 场景：**

第一行静态导入在模块求值前完成链接；条件分支中要使用动态 import()。将静态 import 直接写进 if 会产生语法错误，而动态导入可按需得到模块命名空间。

~~~js
import { render } from './view.js'
render()

if (location.hash === '#admin') {
  const admin = await import('./admin.js')
  admin.mount()
}
~~~

**递进追问：**

1. **静态 import 为什么有利于 tree shaking？**

   导入与导出关系在执行前可确定，打包器能构建符号依赖图并证明部分导出未被使用；动态属性访问或有副作用模块仍会限制安全删除。

2. **循环依赖一定会导致 undefined 吗？**

   ES 模块通过实时绑定支持许多循环，但若模块在对方绑定完成初始化前就读取，会触及暂时性死区或观察到时序问题；应重构初始化依赖而非赌执行顺序。

**易错点：**

- 静态 import 不能放在条件语句内部，条件加载必须使用 import() 表达式。
- tree shaking 不是语言自动删除代码，仍依赖打包器、模块格式与副作用标注。

**参考来源：**

- [ECMAScript：Import Declarations](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-imports)
- [MDN：import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

校验日期：2026-07-20

## Q85：typeof class User {} 的 User 是什么？

- A. object
- B. function
- C. class
- D. undefined

**答案：B**

**短回答：**

class 提供更严格、更清晰的构造与继承语法，但其构造器在运行时仍属于函数。

**原理：**

对已经完成声明初始化的 class User {} 执行 typeof User，结果是字符串 "function"。类在运行时由特殊的函数对象表示，具有 prototype，可作为 new 的构造目标；但它与传统 function 声明并不完全等同：类构造器不能不带 new 直接调用，类体代码按严格模式执行，类声明存在暂时性死区，且原型方法默认不可枚举。typeof 反映的是运行时可调用对象类别，不会告诉你这是 class 语法创建的，也不能据此断言它可像普通函数那样直接调用。检查类来源通常不应依赖 toString 文本。

**代码 / 场景：**

typeof 输出 function，但 User() 直接调用会抛 TypeError；只有 new User() 才进行构造。这个对比说明 typeof 的粗粒度分类不会表达类的调用限制。

~~~js
class User {}
console.log(typeof User)       // 'function'
console.log(new User() instanceof User) // true
try {
  User()
} catch (error) {
  console.log(error.name)      // TypeError
}
~~~

**递进追问：**

1. **为什么类声明在声明语句前不能安全访问？**

   类绑定会提升到词法环境，但在执行声明初始化前处于暂时性死区；即使使用 typeof 访问该绑定也会抛 ReferenceError，而不是返回 undefined。

2. **class 与构造函数的继承底层有什么共同点？**

   二者都通过构造函数对象及其 prototype 建立实例原型链；class 提供更明确的语法、严格模式、super 语义和不可直接调用等约束。

**易错点：**

- typeof 为 function 不代表类构造器可以像普通函数一样直接调用。
- 不要用 typeof value === 'function' 作为可靠的“是否由 class 声明”检测。

**参考来源：**

- [ECMAScript：Class Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions)
- [MDN：Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)

校验日期：2026-07-20

## Q86：class 中定义的普通实例方法通常存放在哪里？

- A. 每个实例独立复制
- B. 类的 prototype 上
- C. window 上
- D. localStorage 中

**答案：B**

**短回答：**

原型方法由实例共享；实例字段才通常直接成为每个实例自己的属性。

**原理：**

class 体中以 method() {} 语法定义的普通实例方法会创建在构造器的 prototype 对象上，而不是为每个实例复制一份。实例读取方法时沿原型链找到同一个函数，因此不同实例的 user1.method === user2.method 通常为 true。方法描述符默认可写、可配置但不可枚举。static 方法则定义在类构造器对象本身；实例字段和箭头函数字段在构造时为每个实例创建，后者常用于固定 this，但也意味着每个实例拥有独立函数并增加分配。私有方法还有独立的私有名称访问规则，不能简单当作字符串属性读取。

**代码 / 场景：**

两个实例都没有自己的 greet 属性，方法来自 User.prototype，而且引用相同；Object.keys(instance) 也不会列出原型方法。

~~~js
class User {
  greet() { return 'hello ' + this.name }
  constructor(name) { this.name = name }
}
const a = new User('A')
const b = new User('B')
console.log(a.greet === b.greet) // true
console.log(a.hasOwnProperty('greet')) // false
console.log(User.prototype.greet.call(a)) // hello A
~~~

**递进追问：**

1. **箭头函数字段与原型方法如何选择？**

   原型方法共享函数、内存更省，并通过调用方式取得动态 this；箭头字段为每实例创建并词法绑定 this，传给回调方便但继承覆盖和测试替换成本不同。

2. **为什么解构实例方法后调用可能丢失 this？**

   原型只提供函数，this 由调用点决定。const fn = user.greet; fn() 不再以 user 为接收者，类体严格模式下 this 为 undefined，需要 bind 或包装调用。

**易错点：**

- 不要以为 class 内所有函数都复制到实例，普通方法默认位于 prototype。
- 把实例方法直接作为回调传递可能丢失接收者，必须明确绑定 this。

**参考来源：**

- [ECMAScript：Method Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-method-definitions)
- [MDN：Classes—Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#methods)

校验日期：2026-07-20

## Q87：派生类 constructor 中访问 this 前必须做什么？

- A. 调用 super()
- B. 调用 bind()
- C. 调用 Object.freeze()
- D. 调用 setTimeout()

**答案：A**

**短回答：**

extends 创建的派生类需要先执行父类构造逻辑，super() 返回后才能使用 this。

**原理：**

派生类构造器在读取或写入 this 之前必须先调用 super()。与基类构造器不同，派生构造器进入时尚未创建并绑定 this；super() 会以当前 new.target 调用父类构造器，由父类完成实例初始化并把结果绑定给派生构造器。提前访问 this、调用引用 this 的实例逻辑，或在 super() 前普通 return，都会触发 ReferenceError；super() 也只能调用一次。例外是派生构造器显式返回一个对象，此时可用该对象作为构造结果而不使用 this，但这种写法罕见且会破坏常规类初始化预期。

**代码 / 场景：**

Good 在 super(name) 后才能设置 role，最终得到完整实例；Bad 在 super 前访问 this 会抛 ReferenceError。super 还把父类参数和 new.target 语义传入构造链。

~~~js
class Person {
  constructor(name) { this.name = name }
}
class Admin extends Person {
  constructor(name) {
    super(name)
    this.role = 'admin'
  }
}
console.log(new Admin('Linda')) // Admin { name: 'Linda', role: 'admin' }
~~~

**递进追问：**

1. **派生类完全不写 constructor 时会怎样？**

   语言提供等价于 constructor(...args) { super(...args) } 的默认派生构造器，参数传给父类，因此实例仍能得到父类初始化。

2. **为什么 super() 不是普通函数调用？**

   它依赖当前类的 [[GetPrototypeOf]]、new.target 和派生构造语义来创建并返回 this 绑定，不能保存为变量后脱离构造器任意调用。

**易错点：**

- super 前即便只读取 this 也会报错，不是只有给 this 赋值才受限制。
- 不要为绕过 super 而随意返回其他对象，否则 instanceof 与字段初始化可能偏离预期。

**参考来源：**

- [ECMAScript：Runtime Semantics for ClassDefinitionEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-runtime-semantics-classdefinitionevaluation)
- [MDN：Derived class constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/constructor)

校验日期：2026-07-20

## Q88：Generator 函数调用后返回什么？

- A. Promise
- B. 迭代器对象
- C. 数组
- D. DOM 节点

**答案：B**

**短回答：**

调用 Generator 不会立刻执行完整函数，而是返回具有 next 方法的迭代器，通过 yield 分段执行。

**原理：**

调用 generator function 不会立即执行函数体，而是返回一个 Generator 对象。该对象同时遵循迭代器和可迭代协议：next() 推进执行到下一个 yield 或 return，并得到 { value, done }；它的 Symbol.iterator 方法通常返回自身，所以可被 for...of 消费。第一次 next 传入的参数没有可恢复的 yield 接收位置，通常会被忽略；后续 next(value) 的参数成为上一个 yield 表达式的结果。return(value) 可提前结束，throw(error) 则在暂停位置注入异常。Generator 是有状态、一次性推进的流程，不是可随意并发复用的数组。

**代码 / 场景：**

调用 steps() 时没有输出 start；第一次 next 才执行到 yield 1，第二次 next 取得 yield 2，第三次结束并返回 3。for...of 不会包含最终 return 值。

~~~js
function* steps() {
  console.log('start')
  yield 1
  yield 2
  return 3
}
const iterator = steps()
console.log(iterator.next()) // 先输出 start，再得到 { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: true }
~~~

**递进追问：**

1. **yield* 的作用是什么？**

   yield* 会把迭代控制委托给另一个可迭代对象，逐项转发值，并在被委托迭代器结束后把其最终返回值作为 yield* 表达式结果。

2. **Generator 与 async generator 有何区别？**

   普通 Generator 的 next 返回 IteratorResult；async generator 的 next 返回 Promise，并可在函数体使用 await，消费端通常通过 for await...of 迭代。

**易错点：**

- 仅调用 Generator 函数不会执行函数体，必须 next 或通过迭代协议推进。
- for...of 只消费 done 为 false 的 yield 值，不会把最终 return 值加入序列。

**参考来源：**

- [ECMAScript：Generator Function Definitions](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generator-function-definitions)
- [MDN：Generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)

校验日期：2026-07-20

## Q89：对象要支持 for...of，通常需要实现什么？

- A. Symbol.iterator
- B. toJSON
- C. valueOf
- D. hasOwnProperty

**答案：A**

**短回答：**

Symbol.iterator 方法应返回迭代器，for...of 会不断调用 next 读取值。

**原理：**

对象需要在 Symbol.iterator 键上提供一个无参数方法，该方法返回迭代器；迭代器的 next() 每次返回形如 { value, done } 的对象，done 为 true 表示序列结束。for...of 会先取得 iterable[Symbol.iterator]()，再反复调用 next，并在循环提前退出时尝试调用迭代器的 return() 进行清理。数组、字符串、Map、Set 已内建该协议，普通对象默认不可迭代。常见实现是把 Symbol.iterator 写成 generator 方法，因为 generator 自动满足 next 和可迭代迭代器协议。可迭代不等于类数组，length 与数字索引不是 for...of 的必要条件。

**代码 / 场景：**

range 通过 generator 形式的 Symbol.iterator 依次 yield 2、3、4，所以展开运算得到 [2, 3, 4]；对象不需要 length 或数字属性。

~~~js
const range = {
  from: 2,
  to: 4,
  *[Symbol.iterator]() {
    for (let value = this.from; value <= this.to; value += 1) yield value
  },
}
console.log([...range]) // [2, 3, 4]
~~~

**递进追问：**

1. **iterator 与 iterable 有什么区别？**

   iterator 具有 next 方法并表示一次遍历状态；iterable 具有 Symbol.iterator 并能创建 iterator。一个迭代器也可让 Symbol.iterator 返回自身，从而同时满足两者。

2. **为什么迭代器最好实现 return 方法？**

   for...of 因 break、throw 或 return 提前退出时会执行 IteratorClose 并调用 return，资源型迭代器可借此关闭文件句柄、订阅或网络游标。

**易错点：**

- 给对象增加 length 不能自动支持 for...of，必须提供 Symbol.iterator 协议。
- next 返回普通值而非 { value, done } 对象会违反协议并导致消费失败。

**参考来源：**

- [ECMAScript：The Iterable Interface](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterable-interface)
- [MDN：Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)

校验日期：2026-07-20

## Q90：Map 的键可以是什么类型？

- A. 只能是字符串
- B. 只能是数字
- C. 任意值，包括对象
- D. 只能是 Symbol

**答案：C**

**短回答：**

Map 不会像普通对象那样把键统一转成字符串，对象、函数、NaN 等都可以直接作为键。

**原理：**

Map 的键可以是任意 ECMAScript 值，包括字符串、数字、Symbol、对象、函数，甚至 NaN。键匹配使用 SameValueZero：NaN 可与自身匹配，+0 与 -0 视为同一键；对象和函数则按引用身份比较，内容相同但分别创建的两个对象是不同键。Map 按首次插入顺序迭代键值；对已有键 set 新值不会把它移到末尾，删除后重新插入才形成新的顺序位置。与普通对象相比，Map 不会把键强制转成字符串，也不会混入原型属性，并直接提供 size、迭代和清空能力。

**代码 / 场景：**

对象键按引用匹配，original 可取到值，而新建的相同字面量取不到；NaN 则按 SameValueZero 可稳定作为键。最终 size 为 2。

~~~js
const original = { id: 1 }
const cache = new Map()
cache.set(original, 'object value')
cache.set(NaN, 'not a number')
console.log(cache.get(original))    // object value
console.log(cache.get({ id: 1 }))  // undefined
console.log(cache.get(NaN))        // not a number
console.log(cache.size)            // 2
~~~

**递进追问：**

1. **对象键可能造成什么内存问题？**

   Map 会强引用键和值，只要 Map 存活，对象键通常不能回收。若只需随对象生命周期保存附加数据，可考虑键为对象的 WeakMap。

2. **什么时候普通对象比 Map 更合适？**

   数据天然是固定字符串字段、需要对象字面量语法或直接 JSON 序列化时，普通对象更方便；动态键集合、频繁增删和任意类型键更适合 Map。

**易错点：**

- 内容相同的两个对象不是同一个 Map 键，必须保留并复用原引用。
- Map 不能直接由 JSON.stringify 完整序列化，需要先定义键值转换协议。

**参考来源：**

- [ECMAScript：Map Objects](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)
- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)

校验日期：2026-07-20

# JavaScript 91-100：集合、错误、安全与性能

## Q91：new Set([NaN, NaN]).size 是多少？

- A. 0
- B. 1
- C. 2
- D. NaN

**答案：B**

**短回答：**

Set 使用 SameValueZero 判断唯一性，两个 NaN 被视为同一个值。

**原理：**

结果是 1。Set 保证集合中的值唯一，判断已有值时使用 SameValueZero；该比较把 NaN 与 NaN 视为相同，因此第二个 NaN 不会新增元素。SameValueZero 也把 +0 与 -0 视为相同。Set 按成功插入的先后顺序迭代，并可存放任意类型；对象仍按引用身份去重，两个内容相同但独立创建的对象会同时存在。重复 add 已存在的值不会改变 size 或插入顺序。Set 适合成员关系与去重，但数组转 Set 只按这套相等语义处理，不能按对象字段自动合并记录。

**代码 / 场景：**

两个 NaN 被折叠为一个值，所以 size 是 1；两个独立对象引用不会折叠，加入后集合大小变成 3。展开结果仍保留首次插入顺序。

~~~js
const values = new Set([NaN, NaN])
console.log(values.size) // 1
values.add({ id: 1 })
values.add({ id: 1 })
console.log(values.size) // 3
console.log(values.has(NaN)) // true
~~~

**递进追问：**

1. **如何按对象的 id 去重而不是按引用去重？**

   可用 Map 以 id 为键保存对象，例如 new Map(items.map(item => [item.id, item]))；还要明确重复 id 时保留第一条还是最后一条。

2. **Set 与 Array.includes 的查找语义相同吗？**

   二者都使用 SameValueZero，所以对 NaN 和正负零的判断一致；Set 面向多次成员查询，而数组 includes 每次通常需要线性扫描。

**易错点：**

- 不要用 NaN !== NaN 推断 Set 会保留两个 NaN，它采用的是 SameValueZero。
- Set 对对象只比较引用，无法直接完成按字段内容的业务去重。

**参考来源：**

- [ECMAScript：Set Objects](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set-objects)
- [MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)

校验日期：2026-07-20

## Q92：WeakMap 相比 Map 的主要特点是什么？

- A. 键会阻止垃圾回收
- B. 对对象键保持弱引用，且不能被整体遍历
- C. 键只能是字符串
- D. 会自动深拷贝值

**答案：B**

**短回答：**

当对象键没有其他强引用时可被回收，因此 WeakMap 适合保存与对象生命周期绑定的私有元数据。

**原理：**

WeakMap 不会因为自身持有键而阻止该键被垃圾回收，适合把缓存、私有元数据或状态关联到对象生命周期。当前规范允许可垃圾回收的键，即对象或非注册 Symbol；传统和许多旧运行环境主要只支持对象键，字符串、数字以及 Symbol.for 创建的注册 Symbol 不能作为键。值可以是任意类型。为了不暴露垃圾回收这种不可预测行为，WeakMap 没有 size、keys、entries 和整体遍历能力，只提供 get、set、has、delete 等按已知键操作。它不是“会自动删除所有数据的 Map”，只是在没有其他强引用时允许键值关联被回收。

**代码 / 场景：**

metadata 与 user 建立关联，但不能枚举 WeakMap。当应用丢弃 user 的最后一个强引用后，这条关联可被回收；具体回收时间不可观察也不可作为业务逻辑条件。

~~~js
const metadata = new WeakMap()
let user = { id: 1 }
metadata.set(user, { lastSeen: Date.now() })
console.log(metadata.get(user).lastSeen > 0) // true
user = null // 若再无强引用，键及关联数据现在具备被回收资格
~~~

**递进追问：**

1. **为什么 WeakMap 不能提供 size 或遍历？**

   垃圾回收时间由实现决定，若能枚举或读取 size，程序便可观察回收行为并产生非确定结果；隐藏键集合可保持 GC 策略自由度。

2. **WeakMap 能替代所有缓存吗？**

   不能。它只能按已知可回收键查询，无法按字符串键、遍历淘汰或统计命中。需要容量限制、过期策略和可观察性时通常使用 Map 加显式缓存策略。

**易错点：**

- 弱引用只针对键；若其他地方仍强引用该键，关联不会神奇地立即消失。
- 不能依赖垃圾回收发生的时间完成注销、关连接等确定性资源清理。

**参考来源：**

- [ECMAScript：WeakMap Objects](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-weakmap-objects)
- [MDN：WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)

校验日期：2026-07-20

## Q93：user?.profile?.name 的作用是什么？

- A. 强制创建缺失属性
- B. 在链路为空值时短路并返回 undefined
- C. 深拷贝 user
- D. 删除 profile

**答案：B**

**短回答：**

可选链只在左侧为 null 或 undefined 时短路，避免读取空值属性时报错。

**原理：**

可选链会逐段检查链左侧是否为 null 或 undefined；user 为 nullish 时，整个连续链直接得到 undefined，user 存在但 profile 为 nullish 时也得到 undefined，否则正常读取 name。它不会把 0、false、空字符串当作缺失，也不会吞掉 getter 内抛出的异常。短路只沿同一个连续可选链传播，使用括号把中间结果分组后再普通取属性会重新可能抛错。根标识符若根本未声明，undeclared?.x 仍会产生 ReferenceError。可选链还支持 obj.method?.() 和 obj?.[expression]，后者短路时不会求值 expression。方法存在但不是可调用值时，使用可选调用仍会抛出 TypeError，而不是悄悄返回 undefined。

**代码 / 场景：**

前两个读取分别得到 Linda 与 undefined。第三行证明假值 0 不会触发空值短路；只有 null 和 undefined 才会停止属性访问。

~~~js
const user = { profile: { name: 'Linda', score: 0 } }
console.log(user?.profile?.name)       // Linda
console.log(null?.profile?.name)       // undefined
console.log(user?.profile?.score)      // 0
console.log(user?.missing?.name ?? 'anonymous') // anonymous
~~~

**递进追问：**

1. **obj.method?.() 是否保证方法里的 this 正确？**

   以 obj.method?.() 这种引用形式调用时仍保留 obj 作为接收者；若先解构或保存为独立变量再调用，this 仍可能丢失，需另行绑定。

2. **为什么可选链不应到处用于必需字段？**

   它会把本应尽早暴露的数据契约错误转成 undefined，根因可能在更远处才表现。只有字段在模型上确实可缺失时才应使用。

**易错点：**

- 可选链不能用于赋值目标，例如 object?.name = value 是语法错误。
- 把链中间用括号截断后再取属性，后半段不会继续享受可选短路。

**参考来源：**

- [ECMAScript：Optional Chaining Operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-optional-chaining-operator)
- [MDN：Optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)

校验日期：2026-07-20

## Q94：value ?? fallback 在什么情况下使用 fallback？

- A. value 为任意假值
- B. value 为 null 或 undefined
- C. value 为 0
- D. value 为空字符串

**答案：B**

**短回答：**

空值合并不会把 0、false、空字符串误当成缺失值，这与 || 不同。

**原理：**

空值合并运算符只在左操作数为 null 或 undefined 时才求值并返回 fallback；数字 0、空字符串、false 和 NaN 都会原样保留。这使它适合为“缺失值”提供默认值，而不会像逻辑或运算符那样误覆盖合法假值。该运算符具有短路性质：左侧非 nullish 时，右侧表达式不会执行。为避免与 &&、|| 的优先级产生歧义，语法禁止在没有括号时直接混用这些运算符。对应的 ??= 只在当前属性为 nullish 时赋值，并且目标引用只求值一次。

**代码 / 场景：**

端口 0 与空标签都是刻意配置，?? 会保留它们；只有 null 和 undefined 使用默认值。右侧函数仅在确实缺失时才调用。

~~~js
console.log(0 ?? 8080)          // 0
console.log('' ?? 'untitled')   // ''
console.log(false ?? true)      // false
console.log(null ?? 'fallback') // fallback
console.log(undefined ?? 10)    // 10
~~~

**递进追问：**

1. **?? 与 || 在配置默认值时如何选择？**

   若 0、false 或空字符串是合法配置，用 ??；只有业务明确把所有假值都视为缺失时才用 ||，并应在代码中表达该业务规则。

2. **为什么 a ?? b || c 必须加括号？**

   规范把 ?? 与 &&、|| 的无括号混用定义为语法错误，避免读者误判组合优先级；应明确写成 (a ?? b) || c 或 a ?? (b || c)。

**易错点：**

- 不要把 NaN 当作 nullish；若 NaN 也需回退，必须额外用 Number.isNaN 判断。
- 右侧可能有副作用且会被短路，不能依赖它每次都执行日志或状态更新。

**参考来源：**

- [ECMAScript：CoalesceExpression](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-binary-logical-operators-runtime-semantics-evaluation)
- [MDN：Nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)

校验日期：2026-07-20

## Q95：try 中 return 1，finally 中 return 2，最终返回什么？

- A. 1
- B. 2
- C. undefined
- D. 抛出异常

**答案：B**

**短回答：**

finally 中显式 return 会覆盖 try 或 catch 的返回结果，因此实践中应避免在 finally 中 return。

**原理：**

最终返回 2。执行 try 的 return 1 时，函数先形成一个待完成的 return Completion，但在真正离开函数前必须执行 finally。finally 中若正常结束，原来的 return 1 会继续生效；本题 finally 又执行 return 2，产生新的 abrupt completion，并覆盖之前保存的返回结果。相同规则也意味着 finally 中的 throw 可覆盖 try 中的 return 或原异常，break、continue 在相应上下文中也可能改变完成方式。因为这种覆盖会隐藏控制流和错误，finally 通常只做不改变完成状态的资源清理，不应从中 return。只有 finally 正常结束时，进入它之前保存的完成记录才会继续向外传播。

**代码 / 场景：**

调用 answer 输出 2，而不是 1。去掉 finally 中的 return 后才会输出 1；若 finally 抛错，调用方会看到新异常而不是任何返回值。

~~~js
function answer() {
  try {
    return 1
  } finally {
    return 2
  }
}
console.log(answer()) // 2
~~~

**递进追问：**

1. **try 抛错而 finally return 时会发生什么？**

   finally 的 return 会覆盖正在传播的异常，函数改为正常返回该值；这会悄悄吞掉根因，因此代码审查通常应禁止 finally 中 return。

2. **try 已 return 时 finally 还能修改返回对象吗？**

   待返回的是对象引用时，finally 可修改该对象的属性，调用方会观察到修改；但把局部变量重新指向另一对象不会自动替换已保存的返回引用。

**易错点：**

- finally 中 return 会吞掉 try 或 catch 的异常，严重降低故障可观测性。
- 不要误以为 return 后 finally 不执行，它正是在函数真正退出前强制执行。

**参考来源：**

- [ECMAScript：The try Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-try-statement)
- [MDN：try...catch—Returning from a finally block](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#returning_from_a_finally_block)

校验日期：2026-07-20

## Q96：JSON.stringify 对象属性中的 undefined 通常如何处理？

- A. 转成 null
- B. 省略该属性
- C. 抛出异常
- D. 转成字符串 'undefined'

**答案：B**

**短回答：**

对象中的 undefined、函数和 Symbol 属性通常会被省略；数组对应位置通常会变成 null。

**原理：**

对象中值为 undefined 的可枚举自有字符串键属性通常会被省略，所以 JSON.stringify({ a: 1, b: undefined }) 得到 {"a":1}。数组必须保持索引位置，undefined、函数或 Symbol 元素会序列化为 null；若顶层值本身是 undefined、函数或 Symbol，JSON.stringify 返回 JavaScript 的 undefined 而不是字符串。replacer 函数可把这些值显式转换为 null 或其他协议值。JSON 还不支持 BigInt，默认会抛 TypeError；循环引用同样会失败。序列化只处理约定的数据模型，原型、方法、undefined 与部分数值语义不会完整往返。Date 通常会先通过 toJSON 转成字符串，自定义对象也可能用 toJSON 改写最终表示。

**代码 / 场景：**

对象属性 missing 被省略，数组里的 undefined 变成 null，顶层 stringify(undefined) 则直接返回 undefined。输出分别是 {"ok":1}、[1,null,3] 和 undefined。

~~~js
console.log(JSON.stringify({ ok: 1, missing: undefined })) // {"ok":1}
console.log(JSON.stringify([1, undefined, 3]))             // [1,null,3]
console.log(JSON.stringify(undefined))                     // undefined
~~~

**递进追问：**

1. **PATCH 请求需要表达“清空字段”时应怎样处理？**

   不要依赖 undefined，因为它会在对象 JSON 中消失。应在接口契约中明确使用 null、专用操作字段或 JSON Patch，并由服务端区分缺省与清空。

2. **replacer 如何保留 undefined 的位置信息？**

   可传 replacer 函数，在 value === undefined 时返回 null 或约定标记；接收方必须知道该标记语义，否则无法无损恢复原值。

**易错点：**

- 对象字段静默消失可能让更新接口误判为“未提供”，必须先定义空值协议。
- 数组中的 undefined 不会被删除而是变为 null，对象与数组行为不能混为一谈。

**参考来源：**

- [ECMAScript：JSON.stringify](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.stringify)
- [MDN：JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)

校验日期：2026-07-20

## Q97：structuredClone 的优势是什么？

- A. 只能浅拷贝
- B. 能深拷贝许多内建类型并支持循环引用
- C. 能克隆函数闭包
- D. 会保留所有原型方法

**答案：B**

**短回答：**

structuredClone 比 JSON 序列化支持更多类型和循环引用，但函数等不可克隆值仍会报错。

**原理：**

structuredClone 使用浏览器结构化克隆算法创建深层副本，能处理循环引用，并原生支持 Array、Map、Set、Date、RegExp、ArrayBuffer、TypedArray 等许多 JSON 无法正确往返的类型。它还支持 transfer 选项：可把 ArrayBuffer 等可转移对象的底层资源移交给副本，原对象随即被分离，避免大块内存复制。它并非任意 JavaScript 对象的完美克隆：Function、DOM 节点会抛 DataCloneError，属性描述符、访问器和自定义原型链通常不会原样保留，私有字段也不在克隆范围。能克隆数据不代表适合保存行为对象或领域实体。

**代码 / 场景：**

JSON 无法处理这里的循环引用和 Map，而 structuredClone 可以；副本中的 self 指回副本本身，Map 也保持为 Map，修改副本不会改原对象。

~~~js
const source = { map: new Map([['count', 1]]) }
source.self = source
const copy = structuredClone(source)
console.log(copy !== source)             // true
console.log(copy.self === copy)          // true
console.log(copy.map instanceof Map)     // true
copy.map.set('count', 2)
console.log(source.map.get('count'))     // 1
~~~

**递进追问：**

1. **transfer ArrayBuffer 与普通克隆有什么差别？**

   普通克隆复制缓冲区内容；transfer 会把底层资源所有权移动到副本，原 ArrayBuffer 的 byteLength 变为 0，适合大数据跨线程且原方不再使用。

2. **为什么 structuredClone 后类实例方法可能丢失？**

   结构化克隆关注可序列化数据，不承诺保留用户自定义原型链和方法。领域实例应克隆原始数据后显式通过构造器重建行为。

**易错点：**

- structuredClone 不能克隆函数和 DOM 节点，遇到它们会抛 DataCloneError。
- 深克隆可能占用大量时间与内存，不能用来掩盖不清晰的状态所有权。

**参考来源：**

- [HTML Standard：Structured clone](https://html.spec.whatwg.org/multipage/structured-data.html#structured-cloning)
- [MDN：structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)

校验日期：2026-07-20

## Q98：把不可信字符串直接赋给 innerHTML 的主要风险是什么？

- A. SQL 注入
- B. XSS
- C. DNS 污染
- D. 内存一定溢出

**答案：B**

**短回答：**

攻击者可能注入恶意标签或事件属性。纯文本应使用 textContent，确需 HTML 时要采用可靠白名单净化。

**原理：**

主要风险是 DOM 型 XSS。不可信字符串会被 HTML 解析器当作标记，而不是普通文本；攻击者可注入带事件处理器、危险 URL、SVG 等可执行能力的节点，在站点源权限下读取页面数据、冒充用户发请求或篡改界面。仅认为 innerHTML 中插入的 script 标签常不执行并不能消除风险，其他活跃内容仍可触发。首选 textContent 显示纯文本；确需富文本时应采用经过维护的白名单净化器、限制输入语法，并配合严格 CSP 与 Trusted Types 降低危险 sink 的使用。输出编码必须与 HTML 属性、URL、脚本等具体上下文匹配。

**代码 / 场景：**

第一种写法会创建真实 img 元素，图片加载失败后 onerror 可执行；第二种只展示字符，不解析标签。实际项目不要运行攻击字符串，而应以单元测试验证净化结果。

~~~js
const untrusted = '<img src=x onerror="alert(document.domain)">'
// 危险：preview.innerHTML = untrusted
preview.textContent = untrusted
// 页面只显示原文字，不创建 img，也不会执行 onerror
~~~

**递进追问：**

1. **CSP 能否让 innerHTML 直接变得安全？**

   不能。严格 CSP 能限制部分脚本执行并降低后果，但配置可能存在缺口，且 HTML 注入还能钓鱼或篡改界面。根本措施仍是避免危险 sink 与正确净化。

2. **为什么自写正则删除 script 标签不可靠？**

   HTML 有复杂解析规则、编码、命名空间和大量可执行上下文，攻击载荷不限于 script。应使用成熟、持续更新并按白名单解析 DOM 的净化库。

**易错点：**

- 只过滤 script 标签远远不够，事件属性、SVG 和危险 URL 都可能执行代码。
- 净化后的字符串若再次拼接未净化内容或进入不同上下文，仍可能重新产生漏洞。

**参考来源：**

- [OWASP：Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN：Element.innerHTML—Security considerations](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations)

校验日期：2026-07-20

## Q99：防抖 debounce 的典型行为是什么？

- A. 固定间隔持续执行
- B. 高频触发停止一段时间后只执行一次
- C. 每次触发都立即执行
- D. 永不执行

**答案：B**

**短回答：**

防抖适合搜索输入、窗口调整结束后的处理，重点是把连续触发合并为最后一次。

**原理：**

防抖把一串密集触发合并为一次调用：典型 trailing 模式每次触发都取消旧定时器并重新计时，只有连续 wait 毫秒没有新事件后才执行最新调用。它适合搜索建议、输入校验、窗口尺寸稳定后的计算等“关心最终状态”的场景。成熟实现还需明确 leading、trailing、maxWait、cancel、flush，以及如何保留最后一次 this 和参数；组件卸载时要清除定时器。防抖不会取消已经发出的网络请求，搜索场景仍需 AbortController 或序列号防止旧响应覆盖新结果。持续不断的事件在纯 trailing 且无 maxWait 时可能永远不执行。

**代码 / 场景：**

三次调用间隔都小于 100 毫秒，每次都会重置计时，最终只在最后一次调用后安静 100 毫秒输出 abc。实现保留最后一组参数。

~~~js
function debounce(fn, wait) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), wait)
  }
}
const search = debounce((query) => console.log(query), 100)
search('a')
search('ab')
search('abc')
// 约 100ms 后仅输出 abc
~~~

**递进追问：**

1. **leading 与 trailing 防抖有什么区别？**

   leading 在一轮连续触发的开头立即执行，trailing 在安静窗口后执行最后一次；两者同时启用时还要定义只有一次调用时是否再次尾随执行。

2. **搜索框防抖后为什么仍会出现旧结果覆盖新结果？**

   前一次请求可能已在防抖触发后发出，网络完成顺序不受输入顺序保证。应中止旧请求，或只接受与当前查询版本一致的响应。

**易错点：**

- 组件卸载后不取消定时器，回调可能访问已销毁状态并造成泄漏或警告。
- 持续触发且没有 maxWait 时，尾随防抖可能长期不执行关键业务。

**参考来源：**

- [Lodash：_.debounce](https://lodash.com/docs/#debounce)
- [MDN：setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)

校验日期：2026-07-20

## Q100：节流 throttle 的典型行为是什么？

- A. 高频触发期间限制为固定时间窗口最多执行一次
- B. 必须等停止触发才执行
- C. 深拷贝回调
- D. 取消所有事件

**答案：A**

**短回答：**

节流适合滚动、拖拽等持续事件，在保证持续反馈的同时限制执行频率。

**原理：**

节流限制函数在连续事件期间最多每隔 wait 时间执行一次，不要求事件先停止，因此适合滚动位置采样、拖拽更新和限频上报。常见实现支持 leading：窗口开始立即执行，以及 trailing：窗口结束用最后一次参数补执行；具体第一次与最后一次是否发生必须由 API 约定。与防抖相比，节流能在持续输入中周期性给出中间结果。基于时间戳的实现和基于定时器的实现，在边界、系统时钟变化、this 与参数保留方面行为可能不同。视觉更新常用 requestAnimationFrame 把调用限制为每个绘制帧一次，但它是按帧对齐，不等价于任意毫秒间隔节流。

**代码 / 场景：**

这个简单实现采用 leading 节流：第一次立即输出，100 毫秒窗口内的调用被忽略；窗口结束后的下一次调用才能再次执行。生产实现若需最后一次参数，应额外实现 trailing。

~~~js
function throttle(fn, wait) {
  let ready = true
  return function (...args) {
    if (!ready) return
    ready = false
    fn.apply(this, args)
    setTimeout(() => { ready = true }, wait)
  }
}
const report = throttle((y) => console.log(y), 100)
report(10) // 立即输出 10
report(20) // 被本窗口忽略
~~~

**递进追问：**

1. **节流与防抖应如何按业务选择？**

   需要持续过程中的周期反馈选节流，例如滚动进度；只关心一轮输入最终值选防抖，例如搜索。关键是先定义允许丢哪些中间状态。

2. **requestAnimationFrame 节流适合什么场景？**

   适合把 DOM 读写或画布更新对齐到浏览器绘制帧，避免一帧重复渲染；它不保证固定毫秒频率，后台页面通常还会暂停回调。

**易错点：**

- 只实现 leading 会丢失窗口末尾最新状态，不适合必须提交最终值的业务。
- 节流回调若自身耗时超过间隔，仍会形成长任务，限频不能替代性能优化。

**参考来源：**

- [Lodash：_.throttle](https://lodash.com/docs/#throttle)
- [MDN：requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

校验日期：2026-07-20
