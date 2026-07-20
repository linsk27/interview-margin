export default [
  {
    number: 1,
    title: 'typeof null 的结果是什么？',
    mechanism: '结果是字符串 object。ECMAScript 对 typeof 运算符规定：操作数值为 Null 时返回 object，这是一项为兼容早期网页而保留的历史行为，并不表示 null 真的是普通对象。null 是独立的原始值，表示“有意的空值”；它没有可读取的对象属性，也不能作为 Object.keys 等对象操作的有效输入。typeof 更适合粗分函数、字符串、数字等类型，判断 null 应使用 value === null；若要判断非空对象，应同时检查 value !== null && typeof value === object，数组还需再使用 Array.isArray 区分。这种分层判断能避免空引用进入属性访问，并让类型分支与运行时事实保持一致。',
    example: [
      '三个检查展示 typeof 的历史结果、null 的真实分类，以及稳妥的非空对象守卫。',
      '',
      '~~~js',
      'const value = null',
      "console.log(typeof value) // 'object'",
      'console.log(value === null) // true',
      "console.log(value !== null && typeof value === 'object') // false",
      'try { Object.keys(value) } catch (error) {',
      "  console.log(error.name) // 'TypeError'",
      '}',
      '~~~',
      '',
      '因此不能只用 typeof value === object 就断言 value 可安全当作对象使用。'
    ].join('\n'),
    followUps: [
      {
        question: '如何同时排除 null 并判断普通对象？',
        answer: '先检查 value !== null 与 typeof value === object，再根据业务排除数组、日期等对象；若要求精确原型，还应结合 Object.getPrototypeOf 或专用类型守卫。'
      },
      {
        question: '为什么不能修正 typeof null 的返回值？',
        answer: '大量既有网页和库可能依赖这一行为，直接改成 null 会破坏向后兼容；标准因此明确保留结果，并建议通过严格相等单独判断 null。'
      }
    ],
    pitfalls: [
      '把 typeof null 等于 object 解释成 null 继承 Object.prototype 是错误的，它仍是原始值。',
      'typeof 对数组也返回 object，数组判断必须使用 Array.isArray，而不是继续猜测对象标签。'
    ],
    sources: [
      { label: 'ECMAScript：The typeof Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-typeof-operator' },
      { label: 'MDN：typeof', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof' }
    ]
  },
  {
    number: 2,
    title: 'NaN === NaN 的结果是什么？',
    mechanism: '结果是 false。严格相等比较先处理类型，再按 Number 的比较规则判断；NaN 是一种特殊数值，规范明确规定只要任一参与比较的数是 NaN，严格相等就返回 false，所以它连自己也不严格相等。这个设计使 NaN 能传播“无有效数值结果”的状态，但意味着不能用 x === NaN 检测它。应优先使用 Number.isNaN(x)，它只在参数本身为 Number 类型且值为 NaN 时返回 true；若还要把无法转换的输入视为无效，应先按业务规则显式转换，再检查结果。Object.is 使用 SameValue 语义，会把两个 NaN 视为相同。',
    example: [
      '下面同时比较三种检测方式，输出揭示严格相等与 SameValue 的差异。',
      '',
      '~~~js',
      'const result = 0 / 0',
      'console.log(result === NaN)          // false',
      'console.log(Number.isNaN(result))    // true',
      'console.log(Object.is(result, NaN))  // true',
      "console.log(Number.isNaN('hello'))  // false",
      '~~~',
      '',
      '最后一项为 false，因为 Number.isNaN 不会先把字符串强制转换成数字。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么 x !== x 可以检测 NaN？',
        answer: 'NaN 是 JavaScript 中唯一不与自身严格相等的数值，因此 x !== x 只会在 x 为 NaN 时成立；不过 Number.isNaN 更直接、更易读。'
      },
      {
        question: '数组查找 NaN 时应选 indexOf 还是 includes？',
        answer: 'indexOf 使用严格相等，无法找到 NaN；includes 使用 SameValueZero，会认为 NaN 与 NaN 相同，所以查找包含 NaN 的数组应使用 includes。'
      }
    ],
    pitfalls: [
      'NaN 的 typeof 仍是 number，它表示数值运算的特殊结果，而不是一种独立 JavaScript 类型。',
      '不要用全局 isNaN 代替 Number.isNaN 做纯检测，前者会先转换字符串等非数值输入。'
    ],
    sources: [
      { label: 'ECMAScript：Strict Equality Comparison', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isstrictlyequal' },
      { label: 'MDN：NaN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN' }
    ]
  },
  {
    number: 3,
    title: "Number.isNaN('hello') 的结果是什么？",
    mechanism: '结果是 false。Number.isNaN 执行的是不带强制类型转换的精确检查：只有参数的 ECMAScript 类型是 Number，并且该数值满足 NaN 判定时才返回 true。字符串 hello 虽然通过 Number 转换会得到 NaN，但原参数仍是字符串，因此在第一步类型检查就返回 false。这个 API 适合验证某个计算结果是否已经成为 NaN，避免全局 isNaN 把空字符串、布尔值或其他可转换输入先改成数字而产生歧义。若接口接收文本数字，应先明确是否允许空白、指数形式等格式，再执行 Number(text) 并对转换后的结果使用 Number.isNaN。',
    example: [
      '先检测原值，再显式转换，可清楚分离“输入类型不对”和“转换得到无效数值”两个阶段。',
      '',
      '~~~js',
      "const input = 'hello'",
      'console.log(Number.isNaN(input))         // false',
      'const parsed = Number(input)',
      'console.log(parsed)                     // NaN',
      'console.log(Number.isNaN(parsed))        // true',
      "console.log(Number.isNaN(Number('')))   // false，因为 Number('') 是 0",
      '~~~',
      '',
      '因此校验文本字段时不能只看最后一行 API，还要先定义允许的文本语法。'
    ].join('\n'),
    followUps: [
      {
        question: 'Number.isNaN 与全局 isNaN 的差异是什么？',
        answer: 'Number.isNaN 不转换参数，只识别真正的数值 NaN；全局 isNaN 先执行 ToNumber，因此 hello 会被转换为 NaN 后返回 true。'
      },
      {
        question: '如何验证用户输入必须是有限数字？',
        answer: '先拒绝不符合业务格式的空字符串等值，再显式转换，最后使用 Number.isFinite 检查；它可同时排除 NaN、Infinity 和负 Infinity。'
      }
    ],
    pitfalls: [
      'Number.isNaN 返回 false 不代表输入是有效数字，它也会对任意非 Number 类型返回 false。',
      '先用 parseFloat 再判断可能接受带尾随字符的文本，是否允许这种格式必须由业务规则决定。'
    ],
    sources: [
      { label: 'ECMAScript：Number.isNaN', url: 'https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isnan' },
      { label: 'MDN：Number.isNaN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN' }
    ]
  },
  {
    number: 4,
    title: 'typeof 一个从未声明的变量会得到什么？',
    mechanism: '对真正从未声明、在任何可见环境记录中都没有绑定的简单标识符执行 typeof，会返回字符串 undefined，而不会像直接读取那样抛 ReferenceError。typeof 的求值算法会识别未解析的引用并给出这个特殊结果，这使旧代码能在不触发异常的情况下探测可选全局变量。但该豁免不是通用的：如果名称由 let、const 或 class 声明且当前仍在暂时性死区，绑定是存在但未初始化，typeof 仍会抛 ReferenceError；写成 typeof missing.prop 时，也必须先直接读取 missing，因而会报错。现代代码更适合用 globalThis 上的属性或显式能力检测。',
    example: [
      '第一个表达式安全返回字符串；第二个直接读取同名标识符会抛异常，二者不能互换。',
      '',
      '~~~js',
      "console.log(typeof neverDeclared) // 'undefined'",
      'try {',
      '  console.log(neverDeclared)',
      '} catch (error) {',
      "  console.log(error.name) // 'ReferenceError'",
      '}',
      '',
      'try {',
      '  console.log(typeof temporal)',
      '} catch (error) {',
      "  console.log(error.name) // 'ReferenceError'",
      '}',
      'let temporal = 1',
      '~~~',
      '',
      'temporal 已有词法绑定但尚未初始化，因此不享受未解析引用的特殊分支。'
    ].join('\n'),
    followUps: [
      {
        question: 'typeof undeclared === undefined 的写法有什么问题？',
        answer: 'typeof 的结果总是字符串，必须与字符串 undefined 比较；若省略引号，右侧标识符 undefined 虽通常可用，但表达含义不清且容易误写。'
      },
      {
        question: '探测浏览器能力时有什么更明确的方式？',
        answer: '可检查 globalThis 上的属性，例如 typeof globalThis.SomeAPI === function，或使用 in、特性方法调用与异常兜底，避免依赖隐式全局名称。'
      }
    ],
    pitfalls: [
      'typeof 的安全特例只针对未解析的标识符引用，不会让任意可能抛错的属性链都变安全。',
      '暂时性死区中的词法绑定不是“从未声明”，对它执行 typeof 仍会抛 ReferenceError。'
    ],
    sources: [
      { label: 'ECMAScript：The typeof Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-typeof-operator' },
      { label: 'MDN：typeof undeclared and TDZ behavior', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof' }
    ]
  },
  {
    number: 5,
    title: "Symbol('id') === Symbol('id') 的结果是什么？",
    mechanism: '结果是 false。每次调用 Symbol(description) 都创建一个新的、全局唯一的 Symbol 原始值；description 只是用于调试显示的可选文字，不参与身份计算，所以两个描述都为 id 的 Symbol 仍是不同键。严格相等比较 Symbol 时比较身份，只有保存并复用同一个 Symbol 值才相等。若确实需要跨模块或同一 realm 内按字符串名称取得共享 Symbol，应显式使用 Symbol.for(key)，它查询全局 Symbol 注册表并在不存在时登记；Symbol() 创建的普通 Symbol 不会自动进入该注册表。Symbol 适合作为避免普通字符串冲突的属性键，但并不等于真正的私有字段。',
    example: [
      '普通 Symbol 每次创建新身份，而 Symbol.for 会对同一注册表键复用身份。',
      '',
      '~~~js',
      "const a = Symbol('id')",
      "const b = Symbol('id')",
      'console.log(a === b) // false',
      '',
      "const sharedA = Symbol.for('id')",
      "const sharedB = Symbol.for('id')",
      'console.log(sharedA === sharedB) // true',
      'console.log(Symbol.keyFor(a)) // undefined',
      "console.log(Symbol.keyFor(sharedA)) // 'id'",
      '~~~',
      '',
      'description 相同只影响展示；是否进入注册表才决定能否按名称取回同一值。'
    ].join('\n'),
    followUps: [
      {
        question: 'Symbol 属性为什么不会出现在 Object.keys 中？',
        answer: 'Object.keys 只收集自身可枚举的字符串键，Symbol 键属于另一类属性键；可使用 Object.getOwnPropertySymbols 或 Reflect.ownKeys 获取。'
      },
      {
        question: 'Symbol 能否实现真正的私有属性？',
        answer: '不能。拿到对象的人仍可通过 Reflect.ownKeys 找到 Symbol 键；真正的语言级私有成员应使用 class 的 #private 字段，或用闭包隐藏状态。'
      }
    ],
    pitfalls: [
      '不要把 description 当成 Symbol 的键值或唯一标识，它可重复且甚至可以省略。',
      'Symbol.for 使用共享注册表，可能产生跨模块命名耦合；仅在确实需要协议共享时采用。'
    ],
    sources: [
      { label: 'ECMAScript：Symbol Constructor', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-constructor' },
      { label: 'MDN：Symbol', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol' }
    ]
  },
  {
    number: 6,
    title: '1n + 1 会发生什么？',
    mechanism: '表达式会抛出 TypeError。加法先对两侧执行 ToPrimitive；若没有进入字符串拼接分支，就分别执行 ToNumeric。1n 得到 BigInt，1 得到 Number，规范随后要求两个数值操作数属于同一种数值类型，否则拒绝运算，而不会像部分语言那样隐式把一侧提升。原因是 BigInt 表示任意精度整数，Number 使用 IEEE 754 双精度浮点；自动互转可能静默丢失大整数精度，或无法表达小数。调用方必须根据领域显式选择 1n + BigInt(1) 或 Number(1n) + 1，并在转为 Number 前验证值是否处于安全整数范围。',
    example: [
      '混合运算失败后，两个显式方案都能运行，但转成 Number 的方案需要考虑精度边界。',
      '',
      '~~~js',
      'try {',
      '  console.log(1n + 1)',
      '} catch (error) {',
      "  console.log(error.name) // 'TypeError'",
      '}',
      'console.log(1n + BigInt(1)) // 2n',
      'console.log(Number(1n) + 1) // 2',
      '',
      'const huge = 9007199254740993n',
      'console.log(Number(huge)) // 9007199254740992，已经丢失精度',
      '~~~',
      '',
      '显式转换让精度风险出现在代码审查点，而不是由运算符悄悄决定。'
    ].join('\n'),
    followUps: [
      {
        question: 'BigInt 能否表示小数？',
        answer: '不能。BigInt 只表示整数，BigInt(1.5) 会抛 RangeError；涉及小数时应使用 Number、十进制定点方案或专门的高精度十进制库。'
      },
      {
        question: '如何安全地把 BigInt 转成 Number？',
        answer: '转换前检查值是否位于 Number.MIN_SAFE_INTEGER 与 Number.MAX_SAFE_INTEGER 范围内，并确认业务只需要整数；超出时应保持 BigInt 或序列化为字符串。'
      }
    ],
    pitfalls: [
      '不要通过隐式运算猜测转换方向，BigInt 与 Number 算术混用会直接失败而不是自动提升。',
      'JSON.stringify 默认不能序列化 BigInt，接口传输时需设计字符串或自定义编码方案。'
    ],
    sources: [
      { label: 'ECMAScript：BigInt Objects', url: 'https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-objects' },
      { label: 'MDN：BigInt', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt' }
    ]
  },
  {
    number: 7,
    title: 'null 和 undefined 最准确的区别是什么？',
    mechanism: 'null 与 undefined 是两个不同的原始值和语言类型。undefined 通常表示绑定尚未赋值、对象缺少属性、函数没有返回值或参数未传；null 通常由程序显式写入，表达“已知这里目前没有对象或值”。这些是常见 API 语义，不是引擎强制的业务含义。严格相等会因为类型不同返回 false，宽松相等有一条专门规则让二者彼此相等。默认参数与解构默认值只在值为 undefined 时生效，不会替换 null。序列化也不同：对象属性值为 undefined 时 JSON.stringify 通常省略该属性，而 null 会被保留为 JSON 的 null。',
    example: [
      '属性访问、默认参数和 JSON 输出共同展示两个空值在实际接口中的不同传播方式。',
      '',
      '~~~js',
      "const record = { explicit: null, missingValue: undefined }",
      'console.log(record.absent) // undefined',
      'console.log(null === undefined) // false',
      'console.log(null == undefined) // true',
      '',
      "function read(value = 'default') { return value }",
      "console.log(read(undefined)) // 'default'",
      'console.log(read(null)) // null',
      "console.log(JSON.stringify(record)) // '{\"explicit\":null}'",
      '~~~',
      '',
      '是否允许 null 应由接口契约明确规定，不能只凭二者都表示“没有”就混用。'
    ].join('\n'),
    followUps: [
      {
        question: '什么时候 API 应返回 null，什么时候省略字段？',
        answer: '若需要表达字段存在且当前明确为空，可返回 null；若字段不适用、未加载或希望保持向后兼容，可省略，但必须在契约中区分这些状态。'
      },
      {
        question: '为什么 value == null 有时被有意使用？',
        answer: '宽松相等在这里可一次匹配 null 与 undefined，且不会匹配 0、false 或空字符串；若团队接受这种惯用法，应配合注释或 lint 例外保持意图清晰。'
      }
    ],
    pitfalls: [
      'null 的 typeof 为 object 是历史兼容结果，不能据此把 null 归类为对象。',
      '不要用 value || fallback 区分空值，它还会把 0、false、空字符串和 NaN 一并替换。'
    ],
    sources: [
      { label: 'ECMAScript：ECMAScript Language Types', url: 'https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types' },
      { label: 'MDN：null', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null' },
      { label: 'MDN：undefined', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined' }
    ]
  },
  {
    number: 8,
    title: '0.1 + 0.2 === 0.3 的结果是什么？',
    mechanism: '结果是 false。JavaScript 的普通 Number 采用 IEEE 754 binary64：一个符号位、有限精度的有效数和指数共同表示二进制浮点值。0.1、0.2 与 0.3 的二进制展开都不能在有限位数内精确结束，存入 Number 时各自被舍入；前两个近似值做加法后得到约 0.30000000000000004，与 0.3 所保存的另一个近似值位模式不同，所以严格相等失败。比较测量结果时应使用与数值尺度相关的容差；货币等要求确定十进制规则的领域可使用最小货币单位整数或可靠十进制库，而不是简单到处调用 toFixed。',
    example: [
      '打印实际结果与误差，并用尺度相关容差完成更稳妥的近似比较。',
      '',
      '~~~js',
      'const actual = 0.1 + 0.2',
      'const expected = 0.3',
      'console.log(actual) // 0.30000000000000004',
      'console.log(actual === expected) // false',
      '',
      'const tolerance = Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected))',
      'console.log(Math.abs(actual - expected) <= tolerance) // true',
      '~~~',
      '',
      'Number.EPSILON 是 1 附近的间隔，数值很大时应按尺度放大容差。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么不能永远只用 Number.EPSILON 比较？',
        answer: 'EPSILON 描述 1 附近相邻浮点数的距离；数值绝对值变大后可表示间隔也变大，固定 EPSILON 可能过严，应结合相对误差与业务容差。'
      },
      {
        question: '金额计算应该如何避免浮点误差？',
        answer: '可把金额转换为分等最小单位的安全整数进行运算，并明确舍入规则；金额范围更大或小数位动态时，应采用十进制定点或高精度库。'
      }
    ],
    pitfalls: [
      '浮点误差不是 JavaScript 独有 bug，而是多数采用 IEEE 754 binary64 的语言共有表示限制。',
      'toFixed 返回字符串且执行舍入，只适合展示或明确舍入环节，不能自动修复所有中间计算误差。'
    ],
    sources: [
      { label: 'ECMAScript：Number Types', url: 'https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type' },
      { label: 'MDN：Number.EPSILON', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON' },
      { label: 'IEEE 754-2019', url: 'https://standards.ieee.org/ieee/754/6210/' }
    ]
  },
  {
    number: 9,
    title: 'Object.is(NaN, NaN) 的结果是什么？',
    mechanism: '结果是 true。Object.is 使用规范中的 SameValue 比较语义：类型不同返回 false；对大多数原始值和对象身份，其结果与严格相等相同，但它对两个特殊数字有意采用不同规则。SameValue 把 NaN 与 NaN 视为相同，同时区分 +0 与 -0。严格相等则相反地让 NaN 不等于自身、让两个带不同符号的零相等。Object.is 不做类型强制转换，所以字符串数字不会等于 Number。它常用于判断某个值是否真的变化，但对集合查找还应注意 Map、Set 与 includes 使用的是 SameValueZero，会合并正负零同时识别 NaN。',
    example: [
      '四个输出完整展示 SameValue 与严格相等的两个差异点，而非只背一个 NaN 结论。',
      '',
      '~~~js',
      'console.log(Object.is(NaN, NaN)) // true',
      'console.log(NaN === NaN) // false',
      'console.log(Object.is(+0, -0)) // false',
      'console.log(+0 === -0) // true',
      "console.log(Object.is(1, '1')) // false",
      '~~~',
      '',
      'Object.is 不会把字符串 1 转成数字，因此它不是另一种宽松相等。'
    ].join('\n'),
    followUps: [
      {
        question: 'Object.is 能否用于对象深比较？',
        answer: '不能。对于对象，它只比较两个操作数是否引用同一对象；内容相同但分别创建的对象仍返回 false，深比较需要按数据结构逐字段定义规则。'
      },
      {
        question: 'Set 为什么能保存并找到 NaN？',
        answer: 'Set 的键比较使用 SameValueZero，它与 SameValue 一样认为 NaN 相同，但不区分 +0 与 -0，因此重复添加 NaN 只保留一个条目。'
      }
    ],
    pitfalls: [
      'Object.is 不是深相等工具，两个结构相同的对象字面量仍因引用身份不同而不相同。',
      '不要假设 JavaScript 只有一种相等算法，严格相等、SameValue 与 SameValueZero 的零值规则不同。'
    ],
    sources: [
      { label: 'ECMAScript：Object.is', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.is' },
      { label: 'MDN：Object.is', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is' }
    ]
  },
  {
    number: 10,
    title: 'Object.is(+0, -0) 的结果是什么？',
    mechanism: '结果是 false。IEEE 754 浮点数保留零的符号位，因此 JavaScript Number 中存在 +0 与 -0；它们在加法、普通显示和严格相等中大多表现相同，但某些运算能观察符号，例如 1 / +0 得到 Infinity，1 / -0 得到 -Infinity。Object.is 采用 SameValue，规范在两个操作数都为零时进一步比较它们是否具有相同符号，所以返回 false。严格相等与 SameValueZero 则把正负零视为相等。负零常来自向零舍入或带符号计算；只有当符号影响方向、数值算法或序列化决策时才需要特别保留。',
    example: [
      '除法结果证明两个零的符号可观察；三种比较方式随后给出不同答案。',
      '',
      '~~~js',
      'const positive = +0',
      'const negative = -0',
      'console.log(1 / positive) // Infinity',
      'console.log(1 / negative) // -Infinity',
      'console.log(Object.is(positive, negative)) // false',
      'console.log(positive === negative) // true',
      'console.log([positive].includes(negative)) // true，includes 使用 SameValueZero',
      '~~~',
      '',
      '是否区分零的符号，应根据调用场景选择对应比较语义。'
    ].join('\n'),
    followUps: [
      {
        question: '如何可靠检测一个值是负零？',
        answer: '可使用 Object.is(value, -0)，它直接表达 SameValue 语义；传统的 value === 0 && 1 / value === -Infinity 也能检测但可读性更差。'
      },
      {
        question: 'JSON 序列化会保留负零吗？',
        answer: 'JSON.stringify(-0) 通常输出字符串 0，符号信息会丢失；若领域模型必须保留方向，应使用单独字段或自定义字符串编码。'
      }
    ],
    pitfalls: [
      '控制台经常把负零显示得像普通零，不能仅凭格式化文本判断底层符号是否存在。',
      'Map、Set 和 includes 使用 SameValueZero，不会把 +0 与 -0 当作两个不同键或元素。'
    ],
    sources: [
      { label: 'ECMAScript：Object.is', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.is' },
      { label: 'MDN：Object.is', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is' },
      { label: 'IEEE 754-2019', url: 'https://standards.ieee.org/ieee/754/6210/' }
    ]
  },
  {
    number: 11,
    title: "Boolean('false') 的结果是什么？",
    mechanism: '结果是 true。Boolean 转换字符串时只检查字符串长度，不解析其中的自然语言含义；唯一的假值字符串是空字符串，包含字符的 false、0、空格与 no 都是真值。规范的 ToBoolean 对 undefined、null、+0、-0、NaN、0n 和空字符串返回 false，其他原始值以及所有对象返回 true。因而表单、查询参数和环境变量中的文本布尔值不能直接交给 Boolean 判断，应先定义接受的词法，例如只允许 true 与 false，再显式比较或解析。new Boolean(false) 还会创建对象，对象本身同样是真值，更不适合作为布尔值容器。',
    example: [
      '下面把字符串内容与长度分开观察，并展示文本配置应采用显式解析。',
      '',
      '~~~js',
      "console.log(Boolean('false')) // true",
      "console.log(Boolean('0')) // true",
      "console.log(Boolean(' ')) // true",
      "console.log(Boolean('')) // false",
      '',
      'function parseBoolean(text) {',
      "  if (text === 'true') return true",
      "  if (text === 'false') return false",
      "  throw new TypeError('expected true or false')",
      '}',
      "console.log(parseBoolean('false')) // false",
      '~~~',
      '',
      '显式解析还能拒绝拼写错误，而 Boolean 会把任何非空错误文本都视为 true。'
    ].join('\n'),
    followUps: [
      {
        question: '哪些 JavaScript 值属于假值？',
        answer: '规范中的假值包括 false、undefined、null、+0、-0、NaN、0n 与空字符串；普通对象和数组即使内容为空也始终是真值。'
      },
      {
        question: '为什么 new Boolean(false) 放进 if 仍会进入分支？',
        answer: 'new Boolean 返回包装对象，ToBoolean 对所有普通对象都返回 true；其内部包装的 false 只有调用 valueOf 时才取出，条件判断不会自动采用它。'
      }
    ],
    pitfalls: [
      '不要用 Boolean 解析接口或环境变量中的文本布尔值，非空错误文本也会被视为 true。',
      '空数组与空对象都是真值，不能依据容器是否有内容直接使用 if (container) 判断。'
    ],
    sources: [
      { label: 'ECMAScript：ToBoolean', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toboolean' },
      { label: 'MDN：Boolean', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean' }
    ]
  },
  {
    number: 12,
    title: '[] == false 的结果是什么？',
    mechanism: '结果是 true，但来自多步抽象相等转换，不表示数组在条件中是假值。比较对象 [] 与布尔值 false 时，Abstract Equality Comparison 先把 false 转成 Number 0；随后因另一侧是对象，对空数组执行 ToPrimitive。数组先尝试 valueOf 得到的仍是对象，再通过 toString 得到空字符串；空字符串与数字比较时又执行 ToNumber，结果是 +0。最终变成 0 与 0 的数值比较，因此返回 true。若写 if ([])，走的是 ToBoolean，所有数组对象都是真值。宽松相等的转换路径依赖双方类型，工程代码通常应使用严格相等并显式转换。',
    example: [
      '把规范步骤逐项写出，可验证宽松相等与条件真假使用了不同抽象操作。',
      '',
      '~~~js',
      'console.log([] == false) // true',
      'console.log(Boolean([])) // true',
      '',
      'console.log([].toString()) // 空字符串',
      'console.log(Number([].toString())) // 0',
      'console.log(Number(false)) // 0',
      'console.log(0 === 0) // true',
      '~~~',
      '',
      '第一个 true 不能推导出数组是假值；第二行直接证明空数组对象仍为真值。'
    ].join('\n'),
    followUps: [
      {
        question: '[1] == true 的结果如何推导？',
        answer: 'true 先转为 1，[1] 经 ToPrimitive 得到字符串 1，再转为数字 1，最终 1 == 1 为 true；多元素数组通常转成带逗号字符串后得到 NaN。'
      },
      {
        question: '什么时候可以有意使用 == null？',
        answer: '若目标是同时匹配 null 与 undefined，value == null 是规则明确的惯用法且不会匹配其他假值；团队应通过 lint 例外和注释限定用途。'
      }
    ],
    pitfalls: [
      '不要把 [] == false 的结果用于解释 if ([])，前者执行抽象相等，后者执行 ToBoolean。',
      '记忆个别宽松相等答案不可靠，应按布尔转换、对象转原始值和数值转换顺序推导。'
    ],
    sources: [
      { label: 'ECMAScript：IsLooselyEqual', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal' },
      { label: 'MDN：Equality operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality' }
    ]
  },
  {
    number: 13,
    title: '[] + [] 的结果是什么？',
    mechanism: '结果是空字符串。二元加号先分别对两个操作数执行 ToPrimitive；空数组的默认原始值转换会先尝试 valueOf，但它仍返回数组对象，于是继续调用数组的 toString，空数组连接零个元素得到空字符串。加号只要发现任一原始操作数是字符串，就选择字符串拼接，而不是数值加法，因此两个空字符串拼接后仍是空字符串。这里没有数组连接语义；数组拼接应使用 concat 或展开语法。若数组含元素，它的字符串转换采用逗号连接，嵌套、null 和 undefined 还会产生容易误判的文本，所以不应依赖加号序列化数组。',
    example: [
      '用 JSON.stringify 包裹输出能让不可见的空字符串显式显示为两个引号。',
      '',
      '~~~js',
      'const left = []',
      'const right = []',
      'const result = left + right',
      "console.log(typeof result) // 'string'",
      "console.log(JSON.stringify(result)) // '\"\"'",
      "console.log([1, 2] + [3, 4]) // '1,23,4'",
      'console.log([1, 2].concat([3, 4])) // [1, 2, 3, 4]',
      '~~~',
      '',
      '第三个结果是两段数组字符串拼接，不是四个数字组成的新数组。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么空数组的 ToPrimitive 会得到空字符串？',
        answer: '普通数组继承的 valueOf 返回对象本身，未得到原始值；随后 Array.prototype.toString 调用 join，空数组没有元素，join 的结果就是空字符串。'
      },
      {
        question: '如何正确合并两个数组？',
        answer: '使用 left.concat(right) 或 [...left, ...right] 创建第一层新数组；二者都不会深拷贝对象元素，若需要深复制还要另行定义策略。'
      }
    ],
    pitfalls: [
      '二元加号没有数组拼接分支，看到数组操作数也会先转原始值再决定数值相加或字符串拼接。',
      '控制台直接打印空字符串不明显，排查转换问题时可用 JSON.stringify 或同时打印 typeof。'
    ],
    sources: [
      { label: 'ECMAScript：The Addition Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-addition-operator-plus' },
      { label: 'MDN：Addition operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition' },
      { label: 'MDN：Array.prototype.toString', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toString' }
    ]
  },
  {
    number: 14,
    title: '[] + {} 作为表达式执行时通常得到什么？',
    mechanism: '在题目明确作为表达式求值时，结果通常是字符串 [object Object]。加号先将空数组转为原始值空字符串；普通对象按默认提示转换时，valueOf 仍返回对象本身，随后继承的 Object.prototype.toString 返回 [object Object]。任一操作数是字符串后，加号执行字符串拼接，因而得到该文本。需要留意语法上下文：旧示例常写 {} + [] 作为一条语句，开头花括号可能被解析为空块，后面的 +[] 则是一元加号，结果变成 0；而 [] + {} 从数组表达式开始没有这项歧义。在控制台或压缩代码中讨论结果时应明确括号与上下文。',
    example: [
      '括号强制两侧都按表达式解析，随后分解每一步的原始值转换。',
      '',
      '~~~js',
      'const result = ([] + {})',
      "console.log(result) // '[object Object]'",
      "console.log([].toString()) // ''",
      "console.log(({}).valueOf()) // 仍是对象",
      "console.log(({}).toString()) // '[object Object]'",
      '',
      "console.log(({} + [])) // '[object Object]'，括号消除块语句歧义",
      '~~~',
      '',
      '实际工程不要使用这种隐式序列化；对象文本应通过明确格式化或 JSON 规则生成。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么 {} + [] 有时显示为 0？',
        answer: '在某些脚本语句上下文中，开头的 {} 被解析为空块，不再是对象操作数，剩余 +[] 是一元加号，把空数组转为数值 0；加括号可消除歧义。'
      },
      {
        question: '自定义对象如何影响加号转换结果？',
        answer: '对象可提供 Symbol.toPrimitive，或通过 valueOf、toString 返回原始值；加号会使用该结果，再根据是否出现字符串决定拼接还是数值运算。'
      }
    ],
    pitfalls: [
      '必须说明“作为表达式”的语法前提，忽略块语句解析会让看似相同的控制台示例出现不同答案。',
      '普通对象的 [object Object] 不是 JSON，不能用于持久化、网络传输或稳定对象标识。'
    ],
    sources: [
      { label: 'ECMAScript：The Addition Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-addition-operator-plus' },
      { label: 'ECMAScript：ToPrimitive', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toprimitive' },
      { label: 'MDN：Addition operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition' }
    ]
  },
  {
    number: 15,
    title: "Number('') 的结果是什么？",
    mechanism: '结果是正零。Number 作为转换函数时对字符串执行 StringToNumber：先按数值字符串语法处理前后空白；空字符串或只含空白的字符串在该转换中产生 +0，而不是 NaN。若有非空内容，则必须整体符合受支持的数值文本语法，例如十进制、指数或特定进制前缀，否则结果为 NaN。这个行为意味着仅用 Number.isNaN(Number(input)) 验证必填数字会错误接受空白输入，表单层必须先检查修剪后的字符串是否为空。Number 与 parseInt 也不同，后者解析允许的整数前缀并在无效字符处停止，不能随意互换。',
    example: [
      '空文本与带尾随字符文本分别揭示 Number 的整体转换规则，以及必填校验为何要先检查空白。',
      '',
      '~~~js',
      "console.log(Number('')) // 0",
      "console.log(Number('   ')) // 0",
      "console.log(Number('12px')) // NaN",
      "console.log(Number('0x10')) // 16",
      '',
      'function requiredNumber(text) {',
      "  if (text.trim() === '') throw new TypeError('required')",
      '  const value = Number(text)',
      "  if (!Number.isFinite(value)) throw new TypeError('invalid number')",
      '  return value',
      '}',
      "console.log(requiredNumber(' 12 ')) // 12",
      '~~~',
      '',
      '先处理必填语义，再执行数值转换，才能区分空值和真正的数字零。'
    ].join('\n'),
    followUps: [
      {
        question: 'Number 与 parseInt 解析 12px 有何不同？',
        answer: 'Number 要求整个非空字符串符合数值语法，因此得到 NaN；parseInt 从左侧解析整数前缀，读到 p 时停止并返回已经得到的 12。'
      },
      {
        question: 'Number(null) 与 Number(undefined) 分别是什么？',
        answer: 'ToNumber 将 null 转为 +0，将 undefined 转为 NaN；这再次说明不同“空值”进入数值转换时语义不同，接口应先做类型检查。'
      }
    ],
    pitfalls: [
      '空字符串转换为 0 会让必填数字校验误通过，必须在 Number 转换前单独拒绝空白。',
      'parseInt 的宽松前缀解析不适合验证完整数字文本，接受尾随字符可能掩盖用户输入错误。'
    ],
    sources: [
      { label: 'ECMAScript：Number Constructor', url: 'https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number-constructor' },
      { label: 'ECMAScript：StringToNumber', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-stringtonumber' },
      { label: 'MDN：Number', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number' }
    ]
  },
  {
    number: 16,
    title: "parseInt('12px', 10) 的结果是什么？",
    mechanism: '结果是数值 12。parseInt 先把输入转换为字符串并去掉开头空白，再处理正负号和 radix。radix 明确为 10 时，只接受十进制数字；它从左到右累积合法数字，遇到第一个不属于该进制的字符 p 就停止，只要此前至少解析到一个数字便返回该整数。若第一个有效位置就是非法字符，则返回 NaN。parseInt 的职责是读取整数前缀，不是验证整个字符串是否为纯整数，所以 12px 能成功并不表示输入格式完全合法。严格表单校验可先用正则或专门解析器验证完整文本，再调用 Number；处理小数时也不应依赖 parseInt 截断。',
    example: [
      '四个输入展示“合法前缀”“起始非法”“小数截断”和不同进制，便于建立完整解析模型。',
      '',
      '~~~js',
      "console.log(parseInt('12px', 10)) // 12",
      "console.log(parseInt('px12', 10)) // NaN",
      "console.log(parseInt('12.9', 10)) // 12",
      "console.log(parseInt('101', 2)) // 5",
      '',
      'function parseWholeInteger(text) {',
      "  if (!/^[+-]?\\d+$/.test(text.trim())) throw new TypeError('invalid integer')",
      '  return Number(text)',
      '}',
      "console.log(parseWholeInteger('-42')) // -42",
      '~~~',
      '',
      '严格函数先验证整个字符串，因此不会把单位或小数部分静默丢弃。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么仍建议显式传 radix？',
        answer: '显式 radix 能准确表达预期进制并避免读者猜测前缀规则；尤其解析外部文本时，调用方应把十进制或其他进制作为接口契约的一部分。'
      },
      {
        question: 'parseInt(1e21, 10) 是否可靠？',
        answer: 'parseInt 会先把非字符串参数转成字符串，大数可能变成指数表示，再只读取开头部分，结果可能意外；对已有 Number 应使用 Math.trunc 等数值方法。'
      }
    ],
    pitfalls: [
      'parseInt 成功只证明存在可解析整数前缀，不证明整个输入字符串都是合法整数。',
      '不要用 parseInt 处理本来已经是 Number 的截断需求，字符串化可能引入指数表示等边界。'
    ],
    sources: [
      { label: 'ECMAScript：parseInt', url: 'https://tc39.es/ecma262/multipage/global-object.html#sec-parseint-string-radix' },
      { label: 'MDN：parseInt', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt' }
    ]
  },
  {
    number: 17,
    title: "全局 isNaN('hello') 的结果是什么？",
    mechanism: '结果是 true。全局 isNaN 的算法先对参数执行 ToNumber，再检查转换结果是否为 NaN；字符串 hello 不符合数值字符串语法，ToNumber 得到 NaN，于是最终返回 true。该 API 回答的更接近“这个值经过数值强制转换后是否会成为 NaN”，而不是“这个值本身是否就是数值 NaN”。因此它会对空字符串返回 false，因为空字符串转为 0，也会对某些布尔值返回 false。需要检查计算结果时应使用 Number.isNaN；需要接收文本数字时，应先验证输入类型和格式、显式 Number 转换，再用 Number.isFinite 或 Number.isNaN 判断。',
    example: [
      '同一组输入同时交给全局 isNaN 与 Number.isNaN，可以看到隐式转换造成的差异。',
      '',
      '~~~js',
      "console.log(isNaN('hello')) // true",
      "console.log(Number.isNaN('hello')) // false",
      "console.log(isNaN('')) // false，因为 Number('') 是 0",
      'console.log(isNaN(false)) // false，因为 Number(false) 是 0',
      '',
      "const converted = Number('hello')",
      'console.log(Number.isNaN(converted)) // true',
      '~~~',
      '',
      '显式转换版本把转换边界写在代码中，更便于审查空值和格式规则。'
    ].join('\n'),
    followUps: [
      {
        question: '全局 isNaN 与 Number.isNaN 应如何选择？',
        answer: '验证一个已经完成计算的 Number 时选 Number.isNaN；只有确实想询问 ToNumber 后是否为 NaN，且理解空值转换规则时才使用全局 isNaN。'
      },
      {
        question: '为什么验证数字通常更适合 Number.isFinite？',
        answer: 'Number.isFinite 同时要求参数本身是 Number，并排除 NaN、Infinity 与 -Infinity；多数业务字段需要有限数值而不只是“不是 NaN”。'
      }
    ],
    pitfalls: [
      '全局 isNaN 返回 false 不代表原值类型是数字，空字符串和 false 都会先转换成 0。',
      '不要让隐式 ToNumber 代替表单格式校验，否则空白、布尔值等输入可能被意外接受。'
    ],
    sources: [
      { label: 'ECMAScript：isNaN', url: 'https://tc39.es/ecma262/multipage/global-object.html#sec-isnan-number' },
      { label: 'MDN：isNaN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN' },
      { label: 'MDN：Number.isNaN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN' }
    ]
  },
  {
    number: 18,
    title: "'5' - 2 的结果是什么？",
    mechanism: '结果是数值 3。减法运算没有字符串拼接分支，它会对两个操作数执行 ToNumeric。字符串 5 先通过 ToPrimitive 保持字符串，再按 Number 数值语法转换为 5；右侧本来就是 Number 2，两个数值类型一致，于是执行 Number 减法得到 3。若字符串不能完整转换为数字，结果通常为 NaN；空字符串则会转换为 0。对象操作数还可能通过 Symbol.toPrimitive、valueOf 或 toString 参与转换。BigInt 与 Number 不能混合减法，会抛 TypeError，因此“减号总能把任何东西变成数字”也不是准确结论。',
    example: [
      '输出覆盖正常文本数字、非法文本、空文本和 BigInt 混用，展示 ToNumeric 的主要边界。',
      '',
      '~~~js',
      "const value = '5' - 2",
      'console.log(value, typeof value) // 3 number',
      "console.log('5px' - 2) // NaN",
      "console.log('' - 2) // -2",
      'try {',
      '  console.log(5n - 2)',
      '} catch (error) {',
      "  console.log(error.name) // 'TypeError'",
      '}',
      '~~~',
      '',
      '文本输入能参与减法不代表它已通过业务格式验证，转换应尽量显式。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么减号与加号处理字符串不同？',
        answer: '加号在 ToPrimitive 后若任一侧是字符串就执行拼接；减号只定义数值运算路径，对操作数执行 ToNumeric，不存在字符串相减语义。'
      },
      {
        question: '如何避免接口文本数字被隐式转换掩盖错误？',
        answer: '在数据边界先检查类型与完整格式，显式调用 Number，并用 Number.isFinite 验证；领域层只接收已规范化的 Number，避免散落隐式转换。'
      }
    ],
    pitfalls: [
      '空字符串在数值转换中是 0，直接用减法校验必填输入可能把缺失值当作合法零。',
      '运算得到 NaN 通常不会立刻抛异常，它会继续传播，必须在数据边界主动检查。'
    ],
    sources: [
      { label: 'ECMAScript：The Subtraction Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-subtraction-operator-minus' },
      { label: 'ECMAScript：ToNumeric', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumeric' },
      { label: 'MDN：Subtraction operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Subtraction' }
    ]
  },
  {
    number: 19,
    title: "'5' + 2 的结果是什么？",
    mechanism: '结果是字符串 52。二元加号是算术加法与字符串拼接共用的运算符：先按从左到右顺序求值两侧并执行 ToPrimitive；只要任一原始结果是 String，就把另一侧也执行 ToString 后拼接。左侧已经是字符串 5，所以右侧 Number 2 被转换为字符串 2，最终产生 52，而不会先把 5 转成数字。若两侧都不是字符串，则执行 ToNumeric，并要求 Number 与 BigInt 类型匹配。连续加号还受左结合影响，例如 1 + 2 + 3 先得到数值 3 再拼接为 33，而 1 + (2 + 3) 会先得到字符串 23 再变成 123。',
    example: [
      '除基本结果外，两个分组示例说明转换发生在每一次加号，而不是整条表达式最后统一决定。',
      '',
      '~~~js',
      "const result = '5' + 2",
      "console.log(result, typeof result) // '52' string",
      "console.log(1 + 2 + '3') // '33'",
      "console.log(1 + (2 + '3')) // '123'",
      "console.log(Number('5') + 2) // 7",
      '~~~',
      '',
      '若业务语义是数值相加，应在边界显式转换并验证，而不是依赖运算符猜测。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么 1 + 2 + 3 与 1 + (2 + 3) 结果不同？',
        answer: '二元加号逐次求值并且左结合；前者先做数值 1 + 2，再与字符串拼接，后者括号内先出现字符串并拼接，外层继续拼接。'
      },
      {
        question: '模板字符串是否也会执行字符串转换？',
        answer: '会。插值表达式先求值得到值，再按字符串模板规则转换为文本；对象可能触发自定义原始值转换，因此序列化结构仍应使用明确方法。'
      }
    ],
    pitfalls: [
      '不要把加号遇到数字就理解成数值运算，字符串分支在 ToPrimitive 后具有决定性。',
      '用一元加号或 Number 强制转换前必须处理 BigInt 和非法文本，否则可能抛错或得到 NaN。'
    ],
    sources: [
      { label: 'ECMAScript：The Addition Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-addition-operator-plus' },
      { label: 'MDN：Addition operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Addition' }
    ]
  },
  {
    number: 20,
    title: 'null == undefined 与 null === undefined 的结果分别是什么？',
    mechanism: '结果分别是 true 与 false。抽象相等比较对 null 和 undefined 设有明确的专门分支：一侧为 null、另一侧为 undefined 时直接返回 true，不会先把它们都转换成数字或布尔值；同时 null 与其他类型一般不会通过这条规则相等，例如 null == 0 为 false。严格相等不执行类型转换，Null 与 Undefined 是不同 ECMAScript 类型，因此立即返回 false。这个差异让 value == null 成为少数可控的宽松相等惯用法，用于一次匹配两种空值；若接口需要区分“显式为空”和“缺失”，则必须分别使用 === null 与 === undefined。',
    example: [
      '额外比较 0 可证明 null 与 undefined 的宽松相等不是把两者统一转成数字零。',
      '',
      '~~~js',
      'console.log(null == undefined) // true',
      'console.log(null === undefined) // false',
      'console.log(null == 0) // false',
      'console.log(undefined == 0) // false',
      '',
      'function isNullish(value) {',
      '  return value == null',
      '}',
      'console.log(isNullish(null), isNullish(undefined), isNullish(0))',
      '// true true false',
      '~~~',
      '',
      '若采用该惯用法，应把函数命名和 lint 例外限制在“空值合并”这个明确意图中。'
    ].join('\n'),
    followUps: [
      {
        question: 'value == null 会不会匹配 false 或空字符串？',
        answer: '不会。null 与 undefined 的抽象相等分支只互相匹配，不会继续转为 0；false、空字符串和 0 都不满足这条空值规则。'
      },
      {
        question: '空值合并运算符与 value == null 有何关系？',
        answer: 'value ?? fallback 同样只在 value 为 null 或 undefined 时采用后备值，但它返回具体值而非布尔判断，且不会替换 0、false 或空字符串。'
      }
    ],
    pitfalls: [
      '不要把结果解释成 null 与 undefined 都先转成 0；规范为这两个类型设置了直接匹配规则。',
      '接口若需要区分“字段缺失”和“字段明确清空”，使用宽松空值判断会丢失重要状态。'
    ],
    sources: [
      { label: 'ECMAScript：IsLooselyEqual', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal' },
      { label: 'ECMAScript：IsStrictlyEqual', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isstrictlyequal' },
      { label: 'MDN：Equality operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality' }
    ]
  },
  {
    number: 21,
    title: 'var 声明的变量主要具有什么作用域？',
    mechanism: 'var 主要具有函数作用域：在普通函数体中的任意 var 声明都归属于该函数的 VariableEnvironment，if、for、while 等普通花括号块不会为它创建新绑定；因此块内声明可在同一函数的块外访问。执行函数体前，var 绑定已在声明实例化阶段创建并初始化为 undefined，赋值仍要等控制流到达。若 var 位于浏览器经典脚本顶层，它属于全局环境并通常形成全局对象属性；位于 ES 模块顶层则受模块作用域约束。catch 参数与函数参数等名称冲突还有专门规则，所以“var 永远是全局变量”是错误说法。',
    example: [
      'if 块没有限制 local 的可见性，但函数边界阻止它泄漏到外部。',
      '',
      '~~~js',
      'function inspect(flag) {',
      '  console.log(local) // undefined，绑定已经建立',
      '  if (flag) {',
      "    var local = 'inside block'",
      '  }',
      "  console.log(local) // 'inside block'",
      '}',
      'inspect(true)',
      'try { console.log(local) } catch (error) {',
      "  console.log(error.name) // 'ReferenceError'",
      '}',
      '~~~',
      '',
      '声明提升解释第一行 undefined，函数作用域解释最后一行在函数外不可见。'
    ].join('\n'),
    followUps: [
      {
        question: 'var 与 let 在 for 循环中的闭包行为为何不同？',
        answer: 'var 的循环变量是函数级单一绑定，所有回调共享它；let 的 for 语义会为每次迭代创建新绑定，使每个回调捕获对应轮次的值。'
      },
      {
        question: '重复 var 声明会发生什么？',
        answer: '同一作用域内重复 var 通常复用既有绑定而不报错，但赋值仍按顺序执行；这种宽松行为容易掩盖重名，现代代码更适合 let 或 const。'
      }
    ],
    pitfalls: [
      'var 不受普通代码块限制，但仍受函数边界限制，不能简单称为“全局作用域变量”。',
      '提升只提前创建并初始化绑定，右侧赋值和副作用不会提前执行。'
    ],
    sources: [
      { label: 'ECMAScript：Variable Statement', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement' },
      { label: 'MDN：var', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var' }
    ]
  },
  {
    number: 22,
    title: '在 let 声明前访问变量会发生什么？',
    mechanism: '在同一词法作用域中、执行到 let 声明初始化之前读取该变量，会抛出 ReferenceError。进入作用域时，引擎已经在声明式环境记录中创建这个绑定，所以名称解析会命中它而不会回退到外层同名变量；但绑定状态仍是 uninitialized，GetBindingValue 必须拒绝读取。从作用域开始到初始化完成的区间称为暂时性死区。let 的“提升”若仅指绑定提前创建是存在的，但它不像 var 那样立即初始化为 undefined。typeof 对处于暂时性死区的绑定也会抛错，因为这是已解析但未初始化的引用，不属于“从未声明变量”的安全特例。',
    example: [
      '外层 value 不会被读取；内层 let 从块开始已经遮蔽它，并在声明前处于暂时性死区。',
      '',
      '~~~js',
      "const value = 'outer'",
      '{',
      '  try {',
      '    console.log(value)',
      '  } catch (error) {',
      "    console.log(error.name) // 'ReferenceError'",
      '  }',
      "  let value = 'inner'",
      "  console.log(value) // 'inner'",
      '}',
      '~~~',
      '',
      '错误不是因为变量不存在，而是当前块绑定尚未完成初始化。'
    ].join('\n'),
    followUps: [
      {
        question: 'let 到底是否会提升？',
        answer: '若提升指进入作用域时创建绑定，则会；但绑定保持未初始化，声明前读取报错。面试中应解释创建与初始化两阶段，而不是只回答会或不会。'
      },
      {
        question: 'typeof 为什么不能安全检测暂时性死区变量？',
        answer: 'typeof 的特殊 undefined 结果仅适用于无法解析的引用；暂时性死区名称已经解析到未初始化绑定，访问检查会先抛 ReferenceError。'
      }
    ],
    pitfalls: [
      '不要说 let 声明前变量完全不存在；绑定已存在并遮蔽外层，只是尚未初始化。',
      '把 TDZ 错误回答成 undefined 会混淆 var 的初始化行为与 let 的词法绑定行为。'
    ],
    sources: [
      { label: 'ECMAScript：Let and Const Declarations', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations' },
      { label: 'MDN：let and temporal dead zone', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz' }
    ]
  },
  {
    number: 23,
    title: '闭包是什么？',
    mechanism: '闭包是一个函数与其创建时可访问的词法环境之间的组合。创建函数对象时，内部 [[Environment]] 槽保存当前环境记录；函数以后即使在另一个调用位置执行，标识符仍沿该保存的环境链解析。若外层函数已经返回，但内部函数仍可达，相关环境和其中被捕获的绑定会继续存活，因此可以实现私有状态、函数工厂和回调上下文。闭包捕获的是绑定而不是创建瞬间的值快照：多个函数可以共享同一绑定，并观察后续修改。引擎可能优化未使用变量，但语义上仍必须保持所有可观察结果一致。',
    example: [
      'increment 与 read 共享同一个 count 绑定；外层 createCounter 返回后，状态仍持续存在。',
      '',
      '~~~js',
      'function createCounter() {',
      '  let count = 0',
      '  return {',
      '    increment() { count += 1; return count },',
      '    read() { return count }',
      '  }',
      '}',
      '',
      'const counter = createCounter()',
      'console.log(counter.increment()) // 1',
      'console.log(counter.increment()) // 2',
      'console.log(counter.read()) // 2',
      '~~~',
      '',
      '外部不能直接访问 count，却能通过两个闭包维护的受控接口观察同一状态。'
    ].join('\n'),
    followUps: [
      {
        question: '闭包捕获的是值还是变量绑定？',
        answer: '通常应理解为捕获词法环境中的绑定；绑定后续被修改时，所有引用该绑定的闭包会看到新值，而不是各自保存最初值快照。'
      },
      {
        question: '闭包为什么可能造成内存长期占用？',
        answer: '只要闭包仍可达，它依赖的环境也必须保留；若闭包被长生命周期监听器或缓存引用，环境中可达的大对象就无法回收，应及时解除引用。'
      }
    ],
    pitfalls: [
      '闭包不是只有“函数返回函数”才存在，任何函数都携带定义时的词法环境，只是有时不明显。',
      '不要默认每个闭包都有独立状态；同一次外层调用创建的多个闭包可能共享同一绑定。'
    ],
    sources: [
      { label: 'ECMAScript：Function Objects and Environment', url: 'https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinary-function-objects' },
      { label: 'MDN：Closures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures' }
    ]
  },
  {
    number: 24,
    title: '用 let 循环三次，并在定时器中输出循环变量，通常输出什么？',
    mechanism: '通常依次输出 0、1、2。for 语句的初始化若使用 let，规范会为迭代变量建立词法绑定，并在每轮继续下一次迭代前创建新的 per-iteration environment，把上一轮值复制后再执行更新表达式。每次定时器回调创建时保存当轮环境，因此三个回调分别解析到三个不同的 i 绑定。同步循环会先完成，定时器任务之后才有机会运行，但绑定不会因此都变成最终值。实际延迟时间只规定最早可调度时机，页面任务队列可能让回调更晚执行；在同一来源、同一延迟下通常保持注册顺序，不过核心答案是捕获值分别为 0、1、2。',
    example: [
      '同步日志先出现，随后三个回调读取各自的迭代绑定，而不是共享循环结束后的变量。',
      '',
      '~~~js',
      'for (let i = 0; i < 3; i += 1) {',
      '  setTimeout(() => console.log(i), 0)',
      '}',
      "console.log('scheduled')",
      '// 先输出 scheduled，随后通常输出 0、1、2',
      '~~~',
      '',
      '零毫秒不是立即执行；它只是让任务在当前调用栈结束后尽早进入可执行阶段。'
    ].join('\n'),
    followUps: [
      {
        question: '如果循环体内修改 i，闭包会看到什么？',
        answer: '回调读取的是该轮环境中绑定的最终状态，不是进入循环体瞬间的值快照；循环体对当轮 i 的修改会影响该轮回调和后续更新逻辑。'
      },
      {
        question: 'for...of 使用 const 也能让回调分别捕获值吗？',
        answer: '可以。for...of 每次迭代都会为 const 声明建立新的绑定，回调分别捕获各轮元素；const 只禁止该轮绑定重新赋值。'
      }
    ],
    pitfalls: [
      'setTimeout 的零延迟不表示同步调用，当前循环和调用栈一定先执行完成。',
      '不要解释为回调复制了数值，准确机制是每轮创建独立词法绑定并被闭包引用。'
    ],
    sources: [
      { label: 'ECMAScript：For Statement', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-for-statement' },
      { label: 'MDN：Closures in loops', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures#creating_closures_in_loops_a_common_mistake' },
      { label: 'HTML Standard：Timers', url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers' }
    ]
  },
  {
    number: 25,
    title: '用 var 循环三次，并在定时器中输出循环变量，通常输出什么？',
    mechanism: '通常输出 3、3、3。var i 在所在函数或全局环境中只建立一个共享绑定，普通 for 循环不会为每轮创建新的词法环境。三次执行循环体时生成的箭头函数都闭包引用这同一个 i。同步循环完成后更新表达式已把 i 增加到 3，条件检查失败才退出；定时器回调随后作为任务执行，每次沿相同环境链读取 i，得到的都是当前值 3。这个结果同时依赖闭包捕获绑定和定时器异步调度，而不是 var 把 3 复制给每个回调。修复可改用 let，或显式创建函数调用来产生每轮独立参数绑定。',
    example: [
      '第一段共享一个 var 绑定；第二段通过函数参数为每轮创建独立绑定，输出形成对照。',
      '',
      '~~~js',
      'for (var i = 0; i < 3; i += 1) {',
      '  setTimeout(() => console.log(i), 0)',
      '}',
      '// 通常输出 3、3、3',
      '',
      'for (var j = 0; j < 3; j += 1) {',
      '  ((captured) => {',
      '    setTimeout(() => console.log(captured), 0)',
      '  })(j)',
      '}',
      '// 随后通常输出 0、1、2',
      '~~~',
      '',
      '立即调用函数的参数 captured 每次都是新绑定，因此不再共享 j。'
    ].join('\n'),
    followUps: [
      {
        question: '把 setTimeout 延迟改成很大能改变 3、3、3 吗？',
        answer: '不会改变共享绑定机制；只要回调在循环完成后执行，读取的仍是最终值 3。延迟只影响执行时机，不会自动创建每轮绑定。'
      },
      {
        question: '除了改 let，还有哪些修复方法？',
        answer: '可用 IIFE 或辅助函数把当轮值作为参数传入，创建独立函数调用环境；部分定时器 API 也支持额外实参，但可移植性应查目标平台。'
      }
    ],
    pitfalls: [
      '问题不是定时器把变量缓存错了，而是所有闭包都引用同一个函数级 var 绑定。',
      '在全局经典脚本中使用 var 还可能污染全局对象，修复循环时也应一并收紧作用域。'
    ],
    sources: [
      { label: 'ECMAScript：Variable Statement', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement' },
      { label: 'MDN：Closures in loops', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures#creating_closures_in_loops_a_common_mistake' },
      { label: 'HTML Standard：Timers', url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers' }
    ]
  },
  {
    number: 26,
    title: 'JavaScript 采用哪种作用域规则？',
    mechanism: 'JavaScript 采用词法作用域，也称静态作用域。函数创建时会保存定义位置对应的外层词法环境；执行代码时，let、const、参数、函数声明等绑定被放入环境记录，并通过 Outer 指针连成作用域链。求值一个标识符时，引擎从当前环境记录向外逐层查询，找到后停止，链尾仍未找到才抛出 ReferenceError。把函数传到另一个函数中调用并不会改写它保存的定义环境，所以调用者的同名局部变量不能动态接管该标识符。with 和直接 eval 会增加解析复杂度，但不代表语言改用动态作用域。',
    example: [
      '下面的 readName 虽在 run 内执行，却仍读取定义位置外层的 name；输出可直接证明查找依据不是调用栈。',
      '',
      '~~~js',
      "const name = 'outer'",
      'function readName() { return name }',
      'function run() {',
      "  const name = 'caller'",
      '  return readName()',
      '}',
      "console.log(run()) // 'outer'",
      '~~~',
      '',
      'readName 创建时保存全局词法环境，run 的局部环境不在它的外层环境链上，因此 caller 不会被返回。'
    ].join('\n'),
    followUps: [
      {
        question: '闭包与词法作用域是什么关系？',
        answer: '闭包就是函数与其创建时词法环境的组合。即使外层函数已经返回，只要内部函数仍可达，被捕获的环境记录就会继续存活，并按定义位置解析变量。'
      },
      {
        question: '为什么说 JavaScript 不是动态作用域？',
        answer: '若是动态作用域，变量会沿当前调用者链查找，run 中的 caller 就可能被 readName 看到；实际结果由源代码嵌套结构决定，调用位置不能改变该链。'
      }
    ],
    pitfalls: [
      '不要把函数在哪里执行误当成作用域来源，普通函数的调用者不会成为它的词法外层。',
      '全局对象属性与全局词法绑定不是完全相同的概念，尤其在浏览器经典脚本和模块之间。'
    ],
    sources: [
      { label: 'ECMAScript：Lexical Environments', url: 'https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-lexical-environments' },
      { label: 'MDN：Scope', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Scope' }
    ]
  },
  {
    number: 27,
    title: '在代码块中使用 let 声明变量，块外访问会怎样？',
    mechanism: 'let 声明属于其所在的词法块作用域。进入花括号块时，引擎为该块建立新的声明式环境记录，预先创建绑定但保持未初始化；执行到声明语句后才初始化并赋值。块内读取会命中这个绑定，离开块后当前环境恢复到外层，外层作用域链中没有该绑定，因此再次按标识符访问会抛出 ReferenceError，而不是得到 undefined。块内在声明之前访问也会因为暂时性死区抛出 ReferenceError，这与离开块后的“绑定不可见”原因不同。var 不创建同样的块级绑定，所以行为不能类推。',
    example: [
      '同一个变量名在块内有效，块结束后已经不在当前作用域链中；捕获异常可观察精确类型。',
      '',
      '~~~js',
      '{',
      "  let token = 'inside'",
      "  console.log(token) // 'inside'",
      '}',
      'try {',
      '  console.log(token)',
      '} catch (error) {',
      "  console.log(error.name) // 'ReferenceError'",
      '}',
      '~~~',
      '',
      '这里不是 token 的值变成 undefined，而是外层环境根本解析不到这个绑定。'
    ].join('\n'),
    followUps: [
      {
        question: '块内声明之前访问 let 为什么也报 ReferenceError？',
        answer: '绑定在进入块时已经创建，所以不会退回外层同名变量；但执行声明前仍处于未初始化状态，读取触发暂时性死区检查并抛出 ReferenceError。'
      },
      {
        question: 'for 循环中的 let 为什么适合异步回调？',
        answer: '规范会为每次迭代创建新的词法绑定，回调分别闭包捕获各轮的值；var 只有函数级共享绑定，回调执行时通常看到循环结束后的最终值。'
      }
    ],
    pitfalls: [
      '不要把 ReferenceError 解释成变量值是 undefined；这是标识符解析失败或绑定尚未初始化。',
      '对象字面量的花括号不是声明语句的代码块，作用域边界必须结合语法位置判断。'
    ],
    sources: [
      { label: 'ECMAScript：Let and Const Declarations', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations' },
      { label: 'MDN：let', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let' }
    ]
  },
  {
    number: 28,
    title: 'const 声明对象后能否修改对象属性？',
    mechanism: 'const 约束的是词法环境中“变量名到值”的绑定不可重新赋值，并不递归改变该值所指对象的属性描述符。声明 const user = object 后，绑定 user 始终保存同一个对象引用，因此执行 user.name = value、delete user.name 或调用会修改对象的方法，是否成功仍由该属性的 writable、configurable、访问器以及对象是否可扩展决定；直接执行 user = other 才会在赋值绑定阶段抛出 TypeError。若业务要求对象第一层不可修改，应显式使用 Object.freeze；若要求深层不可变，还需递归冻结或采用不可变数据更新策略。',
    example: [
      '下面先修改对象内部状态，再尝试替换 const 绑定；两个操作分别由属性语义和绑定语义处理。',
      '',
      '~~~js',
      "const user = { name: 'Lin', profile: { score: 1 } }",
      "user.name = 'Linda'",
      'user.profile.score += 1',
      "console.log(user) // { name: 'Linda', profile: { score: 2 } }",
      'try { user = {} } catch (error) {',
      "  console.log(error.name) // 'TypeError'",
      '}',
      '~~~',
      '',
      '属性更新成功不意味着 const 可以重绑；两者发生在不同层级。'
    ].join('\n'),
    followUps: [
      {
        question: 'Object.freeze 能否让 const 对象完全不可变？',
        answer: 'Object.freeze 只冻结传入对象自身的第一层属性和扩展能力，嵌套对象仍可修改；要实现深冻结必须遍历对象图，并处理循环引用及特殊内建对象。'
      },
      {
        question: '为什么通常优先使用 const 声明对象变量？',
        answer: '它表达该变量不应被重新指向其他值，减少意外重绑并方便静态分析；对象需要演进时仍可通过受控属性更新或创建新对象表达状态变化。'
      }
    ],
    pitfalls: [
      '不要把 const 翻译成“对象常量”，它保证的是绑定稳定，不保证对象内容稳定。',
      '冻结对象与 TypeScript 的 readonly 都有各自边界，不能互相替代运行时与编译期约束。'
    ],
    sources: [
      { label: 'ECMAScript：Let and Const Declarations', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations' },
      { label: 'MDN：const', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const' }
    ]
  },
  {
    number: 29,
    title: '内层作用域声明了与外层同名变量，这称为什么？',
    mechanism: '这种现象称为变量遮蔽。每个词法作用域拥有独立环境记录；解析同名标识符时，引擎总从当前环境开始查询，内层记录一旦存在该名称就停止向外搜索，因此外层绑定在该区域内暂时不可直接通过同一标识符访问，但外层值没有被删除或覆盖。离开内层作用域后，解析起点回到外层，原绑定仍然存在。若内层用 let 或 const 声明，同名绑定从块开始就参与解析，声明前会处于暂时性死区，不能因为尚未初始化便回退读取外层变量。参数、catch 绑定和导入绑定也可能形成遮蔽。',
    example: [
      '三个输出展示遮蔽只改变当前区域的名称解析，不会修改外层绑定。',
      '',
      '~~~js',
      "const status = 'outer'",
      'function inspect() {',
      "  const status = 'inner'",
      "  console.log(status) // 'inner'",
      '}',
      'inspect()',
      "console.log(status) // 'outer'",
      '~~~',
      '',
      'inspect 内第一次查询就在函数环境中命中 status；函数返回后，全局 status 仍保持 outer。'
    ].join('\n'),
    followUps: [
      {
        question: '遮蔽与重新赋值有什么区别？',
        answer: '遮蔽创建了另一个独立绑定，修改内层变量不会改变外层变量；重新赋值则是在作用域链找到既有绑定后改变它保存的值，没有创建同名绑定。'
      },
      {
        question: '为什么过度遮蔽会降低可读性？',
        answer: '同一个名称在相邻区域代表不同数据，读代码时必须持续判断当前环境记录；重构或移动语句还可能改变解析目标，因此重要领域变量应避免无意义重名。'
      }
    ],
    pitfalls: [
      '不要说内层变量覆盖或销毁了外层变量；外层绑定只是被名称查询暂时遮住。',
      'let 的暂时性死区会阻止回退到外层同名变量，声明前访问不会得到外层值。'
    ],
    sources: [
      { label: 'ECMAScript：Lexical Environments', url: 'https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-lexical-environments' },
      { label: 'MDN：Scope', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Scope' }
    ]
  },
  {
    number: 30,
    title: '浏览器普通脚本顶层的 var 和 let 有什么差异？',
    mechanism: '在浏览器经典 script 的全局代码中，全局环境记录由对象记录与声明式记录组合而成。符合条件的顶层 var 声明进入对象记录，通常在 WindowProxy 所代表的全局对象上形成同名属性，所以既可用标识符读取，也常可用 window.name 读取；顶层 let 则进入全局声明式记录，只能通过标识符解析，不会创建 window 的自有属性。两者都可能供同一 realm 后续经典脚本解析，但属性删除、重复声明和与既有全局属性冲突的规则不同。若代码运行在 ES 模块中，顶层声明属于模块作用域，var 也不会自动成为 window 属性。',
    example: [
      '请在浏览器经典 script 中运行；模块脚本的输出不同，不能混为一谈。',
      '',
      '~~~html',
      '<script>',
      "  var legacy = 'v'",
      "  let lexical = 'l'",
      "  console.log(window.legacy) // 'v'",
      "  console.log(window.lexical) // undefined",
      "  console.log(lexical) // 'l'",
      '</script>',
      '~~~',
      '',
      'window.lexical 为 undefined 只说明没有对应对象属性，不代表词法绑定不存在。'
    ].join('\n'),
    followUps: [
      {
        question: '在 type=module 的脚本里顶层 var 会怎样？',
        answer: '模块拥有独立的模块环境记录，顶层 var、let、const 和函数声明都不会自动成为 globalThis 或 window 的属性；模块还默认采用严格模式。'
      },
      {
        question: '为什么不应依赖顶层 var 暴露跨脚本 API？',
        answer: '它会污染共享全局命名空间，并可能与浏览器已有属性或其他脚本冲突；应使用 ES 模块显式导出导入，或至少挂到唯一命名空间对象上。'
      }
    ],
    pitfalls: [
      '题目限定浏览器普通经典脚本；把该结论直接套到模块、Node.js 或 Web Worker 都不准确。',
      'window.lexical 为 undefined 不能证明标识符 lexical 不存在，两种查询走的是不同记录。'
    ],
    sources: [
      { label: 'ECMAScript：Global Environment Records', url: 'https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-global-environment-records' },
      { label: 'MDN：var', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var' },
      { label: 'MDN：let', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let' }
    ]
  },
  {
    number: 31,
    title: '函数声明能否在声明语句前调用？',
    mechanism: '在函数体、模块或全局代码开始逐条求值前，会先执行声明实例化。可提升的函数声明在这一阶段创建函数对象并初始化同名绑定，所以在同一有效作用域内，通常可以在源码声明语句之前调用它；这不同于 var 函数表达式只把变量初始化为 undefined。需要限定“同一有效作用域”：块内函数声明受块级作用域约束，浏览器非严格经典脚本还存在 Annex B 兼容行为；跨模块调用则必须等待模块链接与求值规则。工程代码可以先调用后声明，但仍应按可读性组织，不能把提升理解成源代码真的被移动。',
    example: [
      '调用发生在声明文本之前，但初始化阶段已经把完整函数对象放入当前作用域绑定。',
      '',
      '~~~js',
      "console.log(area(3, 4)) // 12",
      '',
      'function area(width, height) {',
      '  return width * height',
      '}',
      '~~~',
      '',
      '若改为 var area = function (...) {}，声明实例化阶段只有 undefined，提前调用将得到 TypeError。'
    ].join('\n'),
    followUps: [
      {
        question: '函数声明提升与 var 提升有什么关键差异？',
        answer: '函数声明的绑定在实例化阶段直接初始化为可调用函数对象；var 绑定只初始化为 undefined，右侧函数表达式要等执行到赋值语句才产生并写入。'
      },
      {
        question: '块内函数声明是否可以在块外调用？',
        answer: '标准语义下它属于块级作用域，块外不可依赖；浏览器经典非严格脚本可能应用 Annex B 兼容规则，工程代码应避免把这种历史差异作为接口。'
      }
    ],
    pitfalls: [
      '提升描述初始化时序，不是引擎把声明文本剪切到文件顶部，控制流仍按原顺序执行。',
      '不要把函数声明、函数表达式和箭头函数混为一种初始化规则，它们提前调用的结果不同。'
    ],
    sources: [
      { label: 'ECMAScript：Hoistable Declarations', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-hoistabledeclaration' },
      { label: 'MDN：function declaration', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function' }
    ]
  },
  {
    number: 32,
    title: 'var fn = function() {} 在赋值前调用 fn() 会怎样？',
    mechanism: 'var fn = function() {} 同时包含变量声明与运行时赋值。进入当前函数或全局代码时，声明实例化只创建 fn 的 var 绑定并把它初始化为 undefined；匿名或具名函数表达式要等执行流到达右侧时才求值为函数对象，再由赋值把该对象写入 fn。因此提前执行 fn() 时，标识符解析是成功的，不会因找不到变量而抛 ReferenceError，但 Call 求值发现被调用值是 undefined、没有 [[Call]] 内部方法，于是抛 TypeError。若改用 let 或 const，声明前访问会先命中未初始化绑定，错误则是 ReferenceError。',
    example: [
      '捕获错误后继续执行赋值，可以清楚地区分“绑定已存在”与“值尚不可调用”。',
      '',
      '~~~js',
      'try {',
      '  fn()',
      '} catch (error) {',
      "  console.log(error.name) // 'TypeError'",
      '}',
      '',
      "var fn = function () { return 'ready' }",
      "console.log(fn()) // 'ready'",
      '~~~',
      '',
      '第一次失败不是函数体执行失败，而是在进入函数调用前检查可调用性时失败。'
    ].join('\n'),
    followUps: [
      {
        question: '若改成 const fn = () => {}，提前调用是什么错误？',
        answer: 'const 绑定从进入作用域开始存在但未初始化，提前读取 fn 就触发暂时性死区并抛 ReferenceError，甚至还未进行“是否可调用”的检查。'
      },
      {
        question: '具名函数表达式的内部名称在哪里可见？',
        answer: '例如 var fn = function inner() {} 中，inner 通常只在函数体自己的环境内可见，便于递归或堆栈命名；外部仍通过变量 fn 引用该函数。'
      }
    ],
    pitfalls: [
      '不要回答 ReferenceError；var 绑定已经初始化为 undefined，真正失败的是调用非函数值。',
      '变量声明被提前处理不等于右侧函数表达式也提前求值，赋值仍受正常控制流影响。'
    ],
    sources: [
      { label: 'ECMAScript：Variable Statement', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement' },
      { label: 'MDN：function expression', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/function' }
    ]
  },
  {
    number: 33,
    title: '默认参数在什么时候生效？',
    mechanism: '函数调用建立参数环境时，会按形参从左到右初始化绑定。某个形参没有对应实参，或实参值严格为 undefined，且该形参写有初始化器时，才在本次调用中求值默认表达式；null、false、0、NaN 与空字符串都是明确传入的值，不会触发默认值。默认表达式每次需要时才执行，可以引用已经初始化的左侧参数，却不能安全引用尚未初始化的右侧参数。非简单参数列表还会使用独立参数环境，因此默认表达式不能读取稍后才在函数体内建立的 var 变量。对象或数组作为默认值时也是每次触发都重新创建，不会天然跨调用共享。',
    example: [
      '输出同时覆盖缺省、undefined、null 与惰性求值，能避免把默认参数误解为“所有假值兜底”。',
      '',
      '~~~js',
      'let calls = 0',
      "function label(value = (++calls, 'fallback')) { return value }",
      "console.log(label())          // 'fallback'",
      "console.log(label(undefined)) // 'fallback'",
      'console.log(label(null))      // null',
      "console.log(label(''))        // ''",
      'console.log(calls)            // 2',
      '~~~',
      '',
      '只有前两次真正执行了默认表达式，所以副作用计数是 2。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么默认参数可以引用左边参数却不宜引用右边参数？',
        answer: '参数绑定按从左到右初始化，左边在当前默认表达式运行时已经可用；右边绑定仍处于未初始化状态，读取会触发暂时性死区错误。'
      },
      {
        question: '如果 null 也应当使用兜底值，该怎么写？',
        answer: '应在函数体内明确使用空值合并，例如 const actual = value ?? fallback；它只把 null 与 undefined 视为空值，不会误伤 0、false 或空字符串。'
      }
    ],
    pitfalls: [
      '默认参数不是逻辑或运算，0、false、空字符串和 NaN 都不会自动换成默认值。',
      '默认表达式可能产生副作用且按需执行，不应在其中隐藏昂贵请求或难以追踪的状态修改。'
    ],
    sources: [
      { label: 'ECMAScript：Function Declaration Instantiation', url: 'https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-functiondeclarationinstantiation' },
      { label: 'MDN：Default parameters', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters' }
    ]
  },
  {
    number: 34,
    title: '剩余参数 ...args 在函数内部是什么？',
    mechanism: '剩余参数会把没有被前面具名形参匹配的实参，按原顺序收集到一个新建的真正 Array 中。函数每次调用都会创建自己的数组，因此 args 具有 Array.prototype，可直接使用 map、filter、reduce 和迭代协议；这与历史 arguments 对象不同，arguments 是类数组、包含全部实参，并且在部分非严格简单参数场景还可能与形参发生别名关联。语法要求剩余参数必须是最后一个形参，不能再带默认初始化器，且一个参数列表只能有一个。箭头函数没有自己的 arguments，却可以通过剩余参数显式接收实参。',
    example: [
      '具名参数 first 被单独绑定，其余三个值组成普通数组，可直接调用 reduce。',
      '',
      '~~~js',
      'function total(first, ...rest) {',
      '  console.log(Array.isArray(rest), rest)',
      '  return first + rest.reduce((sum, value) => sum + value, 0)',
      '}',
      'console.log(total(1, 2, 3, 4))',
      '// 先输出 true [2, 3, 4]，再输出 10',
      '~~~',
      '',
      'rest 不含已经匹配 first 的第一个实参，这一点与 arguments 的内容不同。'
    ].join('\n'),
    followUps: [
      {
        question: '剩余参数与 arguments 应如何选择？',
        answer: '新代码优先使用剩余参数，因为它明确表达需要收集的位置、是真数组且适用于箭头函数；只有处理未知旧接口或必须观察全部实参时才考虑 arguments。'
      },
      {
        question: '剩余参数数组会与调用方传入的数组共享吗？',
        answer: '收集容器本身是每次调用新建的数组，但元素仍按值传递；若某个元素是对象，数组中的元素与调用方仍可指向同一个对象。'
      }
    ],
    pitfalls: [
      '不要说 ...args 是 arguments 的语法糖；二者覆盖的实参范围、类型和别名行为都不同。',
      '剩余数组只新建第一层容器，不会深拷贝其中的对象、数组或其他引用类型元素。'
    ],
    sources: [
      { label: 'ECMAScript：Function Definitions', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions' },
      { label: 'MDN：Rest parameters', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters' }
    ]
  },
  {
    number: 35,
    title: '调用函数时使用 fn(...arr) 的作用是什么？',
    mechanism: '函数调用参数位置的展开语法会先求值 arr，取得它的同步迭代器，然后按迭代顺序逐个取值，把每个迭代结果加入本次 ArgumentList，最后与其他普通实参一起调用 fn。它要求值可迭代，并不限于真正数组，所以字符串、Set、生成器结果等也可展开；普通仅有 length 的类数组若没有 Symbol.iterator 则不能直接展开。这个过程既不是深拷贝，也不会把 arr 永久改写。每个元素仍按 JavaScript 传参规则传递，对象元素保持共享引用。超大集合还可能超过引擎允许的最大实参数量，应改用循环或接受数组的 API。',
    example: [
      '数组元素按位置成为三个独立形参；随后修改对象元素也证明展开没有深拷贝对象。',
      '',
      '~~~js',
      'function describe(a, b, c) { return [a, b.value, c] }',
      "const args = [1, { value: 2 }, 3]",
      "console.log(describe(...args)) // [1, 2, 3]",
      'args[1].value = 9',
      "console.log(describe(...args)) // [1, 9, 3]",
      '~~~',
      '',
      '第二次输出变化来自共享的对象引用，不是展开语法重新读取了某个深拷贝。'
    ].join('\n'),
    followUps: [
      {
        question: '展开语法与 apply 有什么主要区别？',
        answer: '展开使用迭代协议，可与普通实参任意组合，语法更直观；apply 的第二参数按类数组读取 length 和索引，不要求也不会通用消费任意 iterable。'
      },
      {
        question: '为什么不应对超大数组使用 Math.max(...values)？',
        answer: '展开会把每个元素变成独立实参，函数调用的实参数量存在实现上限，超大输入可能抛 RangeError；可用循环或 reduce 分批计算最大值。'
      }
    ],
    pitfalls: [
      '对象展开与函数参数展开使用的协议不同，普通对象不能因为可被 {...obj} 使用就一定可迭代。',
      '展开只复制参数槽位中的值，对象元素仍共享引用，不能作为深拷贝方案。'
    ],
    sources: [
      { label: 'ECMAScript：Argument Lists', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-argument-lists' },
      { label: 'MDN：Spread syntax', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax' }
    ]
  },
  {
    number: 36,
    title: 'call 的主要作用是什么？',
    mechanism: 'Function.prototype.call 会立即调用目标函数，并把第一个参数作为本次调用的 thisArgument，后续参数按当前位置逐个组成实参列表。对于普通可调用函数，严格模式会原样保留 thisArgument；非严格函数会把 null 或 undefined 替换为全局 this 值，并可能把原始值装箱。箭头函数没有自己的 this 绑定，call 无法覆盖它从外层捕获的 this。call 也不能把只能通过 new 构造的 class 当作普通函数执行。它适合在明确接收者上复用普通函数或调用脱离对象的方法，但若长期作为回调，应考虑 bind 或包装函数以保存调用上下文。',
    example: [
      '方法被取出后失去隐式接收者，call 在单次调用中显式恢复 this 并逐个传入参数。',
      '',
      '~~~js',
      'function describe(prefix, suffix) {',
      "  return prefix + this.name + suffix",
      '}',
      "const user = { name: 'Linda' }",
      "console.log(describe.call(user, '[', ']')) // '[Linda]'",
      '',
      "const arrow = () => this",
      "console.log(arrow.call(user) === user) // false",
      '~~~',
      '',
      '第二个结果说明 call 的 thisArgument 只对拥有动态 this 的普通函数生效。'
    ].join('\n'),
    followUps: [
      {
        question: 'call 与直接写 obj.method() 的 this 有何关系？',
        answer: '成员调用会把点号左侧对象作为 this 值；函数一旦被单独取出便失去该引用关系，call 可在本次调用中显式提供相同接收者。'
      },
      {
        question: 'call 能否借用数组方法处理类数组？',
        answer: '部分通用数组方法只依赖 length 和索引，可通过 call 借用；但方法是否通用、是否会修改接收者需查规范，不能假设所有内建方法都可借用。'
      }
    ],
    pitfalls: [
      'call 会立即执行函数，不会像 bind 那样返回一个以后再调用的绑定函数。',
      '对箭头函数使用 call、apply 或 bind 都不能改变其词法 this，传入对象会被忽略。'
    ],
    sources: [
      { label: 'ECMAScript：Function.prototype.call', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.call' },
      { label: 'MDN：Function.prototype.call', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call' }
    ]
  },
  {
    number: 37,
    title: 'apply 与 call 的主要区别是什么？',
    mechanism: 'apply 与 call 都会立即调用目标函数，并允许显式提供 thisArgument；主要区别在实参列表的构造方式。call 从第二个位置开始把参数逐个传入，apply 的第二参数则是数组或类数组对象，算法读取其 length 与连续索引并生成实参列表；传入 null 或 undefined 表示空参数列表。apply 并不通用消费任意 iterable，例如只有迭代器但没有 length 的 Set 不是可靠的 apply 参数容器，而展开语法可以消费 iterable。现代底层代码还可用 Reflect.apply，它以独立函数形式接收 target、thisArgument 和 argumentsList，避免属性被覆盖等问题。',
    example: [
      '同一函数通过 call 和 apply 得到相同结果；类数组示例说明 apply 依据 length 与索引取值。',
      '',
      '~~~js',
      'function sum(a, b, c) { return a + b + c }',
      'console.log(sum.call(null, 1, 2, 3)) // 6',
      'console.log(sum.apply(null, [1, 2, 3])) // 6',
      '',
      "const arrayLike = { 0: 'A', 1: 'B', length: 2 }",
      'function join(a, b) { return a + b }',
      "console.log(join.apply(null, arrayLike)) // 'AB'",
      '~~~',
      '',
      '若数据本来是 iterable，通常直接写 fn(...iterable) 更清楚。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么 apply 不等同于展开语法？',
        answer: 'apply 按类数组的 length 和数字索引建立列表，展开语法按 Symbol.iterator 消费元素；数组同时满足两者，所以常见示例掩盖了协议差异。'
      },
      {
        question: 'Reflect.apply 有什么实际价值？',
        answer: '它把目标函数作为显式参数，不依赖 target.apply 属性是否存在或被覆盖，并清楚表达底层反射调用；参数列表仍需是数组或类数组。'
      }
    ],
    pitfalls: [
      'apply 的第二参数不是任意集合，只有 iterable 的对象未必能按预期转成实参列表。',
      '对超大数组使用 apply 或展开都会触及实参数量上限，应改用循环或分批算法。'
    ],
    sources: [
      { label: 'ECMAScript：Function.prototype.apply', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.apply' },
      { label: 'MDN：Function.prototype.apply', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply' },
      { label: 'MDN：Reflect.apply', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply' }
    ]
  },
  {
    number: 38,
    title: 'bind 的返回值是什么？',
    mechanism: 'bind 不会立即执行目标函数，而是创建并返回一个绑定函数异域对象。该对象内部保存原目标函数、boundThis 以及零个或多个预置参数；以后普通调用绑定函数时，规范把预置参数放在新实参之前，并以保存的 boundThis 调用目标。再次对该绑定函数调用 call 或 bind，不能覆盖第一次保存的 this，但可继续预置更多参数。绑定函数的 name 与 length 会按规则派生，它通常没有自己的 prototype 数据属性；若目标可构造，绑定函数仍可被 new，构造路径会忽略 boundThis 并保留预置参数。箭头函数的词法 this 也不会因 bind 改变。',
    example: [
      '先绑定接收者和第一个参数，返回的新函数稍后再接收第二个参数并执行。',
      '',
      '~~~js',
      'function format(prefix, value) {',
      "  return prefix + this.unit + value",
      '}',
      "const formatKg = format.bind({ unit: 'kg:' }, 'mass=')",
      "console.log(formatKg(12)) // 'mass=kg:12'",
      '',
      "const other = { unit: 'm:' }",
      "console.log(formatKg.call(other, 5)) // 'mass=kg:5'",
      '~~~',
      '',
      '第二次 call 没有覆盖第一次 bind 保存的 this，只改变了尚未预置的实参。'
    ].join('\n'),
    followUps: [
      {
        question: '连续两次 bind 能否更换 this？',
        answer: '不能。第二次 bind 的目标已经是绑定函数，普通调用时仍使用第一次保存的 boundThis；第二次只能继续在已有预置参数后追加新的预置参数。'
      },
      {
        question: '为什么事件监听解绑时 bind 容易出错？',
        answer: '每次调用 bind 都创建新的函数对象；若注册和移除时分别 bind，两者身份不同，监听器无法匹配。应保存一次绑定结果并复用同一引用。'
      }
    ],
    pitfalls: [
      'bind 返回的是新函数对象，不是原函数的执行结果，也不会在创建时运行函数体。',
      '频繁在渲染或循环中 bind 会产生新身份，既增加分配也可能破坏缓存与监听器移除。'
    ],
    sources: [
      { label: 'ECMAScript：Function.prototype.bind', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.bind' },
      { label: 'MDN：Function.prototype.bind', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind' }
    ]
  },
  {
    number: 39,
    title: '箭头函数的 this 来自哪里？',
    mechanism: '箭头函数不会创建自己的 this 绑定；求值箭头函数时，它保存当前词法环境，函数体中的 this 像普通自由变量一样向外解析，最终取自最近一个拥有 this 绑定的外层执行上下文。因此箭头函数被作为对象属性调用、传给定时器，或经 call、apply、bind 调用，都不会根据新接收者改写 this。箭头还没有自己的 arguments、super 和 new.target，并且不可作为构造函数使用。常见正确场景是在普通方法内部创建回调，让回调捕获该方法调用时的实例 this；不适合把箭头直接用作需要动态接收者的对象方法。',
    example: [
      '普通方法建立实例 this，内部箭头捕获它；把回调交给数组方法后仍能读取同一 prefix。',
      '',
      '~~~js',
      'const formatter = {',
      "  prefix: 'ID-',",
      '  format(values) {',
      '    return values.map((value) => this.prefix + value)',
      '  }',
      '}',
      "console.log(formatter.format([1, 2])) // ['ID-1', 'ID-2']",
      '',
      "const bad = { value: 1, read: () => this?.value }",
      'console.log(bad.read()) // 通常不是 1',
      '~~~',
      '',
      'bad.read 的箭头在对象字面量外层创建，没有把 bad 设为词法 this。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么 bind 不能修复箭头函数的 this？',
        answer: '绑定函数只能为拥有动态 this 的目标提供 boundThis；箭头调用算法不建立 this 绑定，函数体始终沿保存的词法环境查找，传入值被忽略。'
      },
      {
        question: '类字段箭头函数为什么常能保持实例 this？',
        answer: '实例字段初始化在构造实例的上下文中执行，箭头在此捕获实例 this；代价是通常每个实例创建一个函数，而不是共享原型方法。'
      }
    ],
    pitfalls: [
      '对象字面量本身不创建 this 作用域，直接写箭头属性不会自动把对象设为 this。',
      '顶层 this 在经典脚本、ES 模块和不同运行环境中不同，箭头只捕获实际外层值。'
    ],
    sources: [
      { label: 'ECMAScript：Arrow Function Definitions', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions' },
      { label: 'MDN：Arrow functions', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions' }
    ]
  },
  {
    number: 40,
    title: '对 bind 返回的函数使用 new 时，this 主要指向哪里？',
    mechanism: '若原目标函数具有 [[Construct]]，对其绑定函数使用 new 会进入绑定函数的构造内部方法。该路径忽略 bind 保存的 boundThis，转而调用目标构造器并让 this 指向按构造规则创建的新实例；bind 预置的参数仍会放在 new 调用参数之前。为保持继承与 instanceof 语义，当 newTarget 就是绑定函数时，规范会把实际 newTarget 调整为原目标函数。绑定函数通常没有自己的 prototype 属性，但 new Bound() 创建的对象仍沿目标构造函数的 prototype 链，因此通常同时满足 instance instanceof Target 和 instance instanceof Bound。若目标构造器显式返回对象，普通构造返回规则仍可能以该对象作为结果。',
    example: [
      'fake 没有被写入，预置姓名仍生效，新对象继承 Person.prototype 并通过两种 instanceof。',
      '',
      '~~~js',
      'function Person(name, age) {',
      '  this.name = name',
      '  this.age = age',
      '}',
      "const fake = { name: 'fake' }",
      "const BoundPerson = Person.bind(fake, 'Linda')",
      'const person = new BoundPerson(24)',
      '',
      "console.log(person.name, person.age) // 'Linda' 24",
      "console.log(fake.name) // 'fake'",
      'console.log(person instanceof Person) // true',
      'console.log(person instanceof BoundPerson) // true',
      '~~~',
      '',
      'new 的构造绑定决定 this，bind 只保留预置参数和目标构造器关系。'
    ].join('\n'),
    followUps: [
      {
        question: '所有 bind 返回的函数都能被 new 吗？',
        answer: '不能。只有原目标函数本身可构造时，绑定函数才具有 [[Construct]]；箭头函数或普通不可构造方法经 bind 后仍不能作为构造器。'
      },
      {
        question: '为什么 BoundPerson.prototype 通常是 undefined？',
        answer: '绑定函数不自动拥有普通函数的 prototype 数据属性；构造时会委托目标函数，实例原型关系来自 Person.prototype，而不是独立的绑定原型。'
      }
    ],
    pitfalls: [
      'new 会忽略 bind 保存的 this，但不会忽略预置参数，回答时必须分别说明这两个维度。',
      '不能因为普通调用绑定函数有效，就假设它一定可构造；可构造性完全继承自原目标。'
    ],
    sources: [
      { label: 'ECMAScript：Bound Function Exotic Objects', url: 'https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-bound-function-exotic-objects' },
      { label: 'MDN：Bound functions used as constructors', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#bound_functions_used_as_constructors' }
    ]
  },
  {
    number: 41,
    title: 'Object.assign 的拷贝深度是什么？',
    mechanism: 'Object.assign 只执行浅层属性复制。它先把 target 转成对象，再按源对象出现顺序枚举每个源的自身可枚举字符串键与 Symbol 键；对每个键从源执行 [[Get]] 取得当前值，再对目标执行 [[Set]] 写入，因此 getter 和目标 setter 都可能运行，属性描述符本身不会被原样复制。若值是对象或数组，写入的只是同一引用，嵌套修改会被两边观察。assign 会直接修改并返回 target，后来的源可覆盖先前同名键；复制过程中抛错时，之前已写入的属性不会自动回滚。它不是深拷贝、事务，也不复制原型与不可枚举属性。',
    example: [
      '顶层 name 被复制为独立字符串，嵌套 profile 则共享同一个对象引用。',
      '',
      '~~~js',
      "const source = { name: 'Lin', profile: { score: 1 } }",
      'const clone = Object.assign({}, source)',
      "clone.name = 'Linda'",
      'clone.profile.score = 9',
      '',
      "console.log(source.name) // 'Lin'",
      'console.log(source.profile.score) // 9',
      'console.log(clone.profile === source.profile) // true',
      '~~~',
      '',
      '只有第一层属性槽位被复制；槽位里若存引用，目标和源仍指向同一嵌套对象。'
    ].join('\n'),
    followUps: [
      {
        question: 'Object.assign 会复制属性描述符吗？',
        answer: '不会。它读取源属性值并用普通 Set 写目标，getter 会被求值，writable、enumerable、configurable 等描述符不会原样保留；需要描述符时可组合 getOwnPropertyDescriptors。'
      },
      {
        question: 'Object.assign 与深克隆应如何区分？',
        answer: 'assign 只复制自身可枚举第一层。深克隆必须定义循环引用、Date、Map、函数和原型等策略；符合结构化克隆范围时可评估 structuredClone。'
      }
    ],
    pitfalls: [
      '第一个参数会被原地修改，若不想污染旧状态，应显式传入新的空对象作为 target。',
      'getter 与 setter 可能在复制中执行副作用，Object.assign 不是纯粹的内存字段搬运。'
    ],
    sources: [
      { label: 'ECMAScript：Object.assign', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.assign' },
      { label: 'MDN：Object.assign', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign' }
    ]
  },
  {
    number: 42,
    title: '对象展开 {...source} 默认属于哪种拷贝？',
    mechanism: '对象展开默认也是浅拷贝。对象字面量求值时，...source 通过 CopyDataProperties 收集源对象的自身可枚举字符串键与 Symbol 键，读取每个当前值，并在新对象上创建对应数据属性；嵌套对象仍只复制引用，所以后续深层修改会共享。它不复制源原型、不可枚举属性或原始 getter/setter 描述符，getter 会在展开时求值，结果成为普通值属性。虽然常见结果与 Object.assign({}, source) 接近，两者写入语义不完全相同：对象展开在新对象上创建自有数据属性，而 assign 对既有 target 使用 Set，可能触发目标继承的 setter。后出现的同名属性会覆盖前面的值。',
    example: [
      'getter 在展开时执行一次并变成数据属性；nested 仍共享引用，说明只有第一层被复制。',
      '',
      '~~~js',
      'let reads = 0',
      'const source = {',
      '  nested: { count: 1 },',
      "  get label() { reads += 1; return 'ready' }",
      '}',
      'const clone = { ...source }',
      'source.nested.count = 2',
      '',
      'console.log(clone.label, reads) // ready 1',
      'console.log(clone.nested.count) // 2',
      "console.log(Object.getOwnPropertyDescriptor(clone, 'label').get) // undefined",
      '~~~',
      '',
      'clone.label 已是普通数据值，原 getter 描述符没有被复制。'
    ].join('\n'),
    followUps: [
      {
        question: '对象展开会包含 Symbol 键吗？',
        answer: '会，只要 Symbol 属性是源对象自身且可枚举；Object.keys 不返回 Symbol，但 CopyDataProperties 会处理字符串键与 Symbol 键。'
      },
      {
        question: '对象展开与 Object.assign 是否完全等价？',
        answer: '不完全等价。两者读取源值都可能触发 getter，但展开在新字面量上创建数据属性，assign 对 target 执行 Set，可能触发已有或继承的 setter。'
      }
    ],
    pitfalls: [
      '展开一层不会深复制嵌套状态，用它做不可变更新时必须逐层复制实际发生变化的路径。',
      '展开只复制自身可枚举属性，类实例的原型方法和不可枚举内部状态不会进入普通对象。'
    ],
    sources: [
      { label: 'ECMAScript：Object Initializer', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-object-initializer' },
      { label: 'ECMAScript：CopyDataProperties', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-copydataproperties' },
      { label: 'MDN：Spread syntax in object literals', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#spread_in_object_literals' }
    ]
  },
  {
    number: 43,
    title: 'Object.keys(obj) 会返回哪些键？',
    mechanism: 'Object.keys 返回 obj 自身的、可枚举的字符串属性键组成的新数组。它不沿原型链查找，不包含 enumerable 为 false 的自有属性，也不包含任何 Symbol 键。属性键中的数组索引仍以字符串形式返回。顺序遵循规范的自有属性键次序：非负整数索引类键按数值升序排列，其他字符串键按创建顺序排列，Symbol 本来就被该 API 排除。参数会先执行 ToObject，因此字符串原始值可暴露字符索引，而 null 与 undefined 无法转换并会抛 TypeError。若需要全部自有键，应使用 Reflect.ownKeys；若要连同描述符检查，则使用 Object.getOwnPropertyDescriptors。',
    example: [
      '示例同时加入继承键、不可枚举键、Symbol 键与整数索引，输出能验证四项过滤规则。',
      '',
      '~~~js',
      "const proto = { inherited: 'p' }",
      'const obj = Object.create(proto)',
      "obj.name = 'Lin'",
      "obj[2] = 'two'",
      "obj[1] = 'one'",
      "Object.defineProperty(obj, 'hidden', { value: 1, enumerable: false })",
      "const secret = Symbol('secret')",
      'obj[secret] = 2',
      '',
      "console.log(Object.keys(obj)) // ['1', '2', 'name']",
      "console.log(Reflect.ownKeys(obj)) // ['1', '2', 'name', 'hidden', Symbol(secret)]",
      '~~~',
      '',
      'inherited 不在任何自有键结果中；Reflect.ownKeys 才包含隐藏字符串键和 Symbol。'
    ].join('\n'),
    followUps: [
      {
        question: 'Object.keys 与 for...in 有什么区别？',
        answer: 'Object.keys 只返回自身可枚举字符串键；for...in 还会遍历原型链上的可枚举字符串键，因此循环对象时通常还需配合 Object.hasOwn。'
      },
      {
        question: '为什么数字键在结果里仍是字符串？',
        answer: '普通对象属性键的语言类型只有 String 或 Symbol，数字写法在定义属性时会转换成字符串；数组索引只是满足特定格式的字符串键。'
      }
    ],
    pitfalls: [
      'Object.keys(obj).length 只统计可枚举字符串自有属性，不能代表对象所有内部或隐藏状态。',
      '不要依赖 Object.keys 获取 Symbol 元数据，应根据需求选择 getOwnPropertySymbols 或 Reflect.ownKeys。'
    ],
    sources: [
      { label: 'ECMAScript：Object.keys', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.keys' },
      { label: 'MDN：Object.keys', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys' },
      { label: 'ECMAScript：OrdinaryOwnPropertyKeys', url: 'https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryownpropertykeys' }
    ]
  },
  {
    number: 44,
    title: "'toString' in {} 的结果是什么？",
    mechanism: '结果是 true。in 运算符右侧必须是对象，它调用对象的 [[HasProperty]] 内部方法：先检查对象自身是否存在该属性键，未找到时沿 [[Prototype]] 链继续查询。普通对象字面量默认以 Object.prototype 为原型，而该原型拥有 toString，因此即使空对象没有自己的 toString，in 仍返回 true。属性值是否为 undefined 不影响“是否存在”的判断；只要属性描述存在就为 true。若对象由 Object.create(null) 创建，没有 Object.prototype，结果会是 false。若只想判断自身属性，应使用 Object.hasOwn，而不是 in 或可能被覆盖的 hasOwnProperty 方法。',
    example: [
      '普通对象、空原型对象和“存在但值为 undefined”的属性构成三个明确对照。',
      '',
      '~~~js',
      "console.log('toString' in {}) // true",
      "console.log(Object.hasOwn({}, 'toString')) // false",
      '',
      'const dictionary = Object.create(null)',
      "console.log('toString' in dictionary) // false",
      '',
      'const record = { value: undefined }',
      "console.log('value' in record) // true",
      'console.log(record.value === undefined) // true',
      '~~~',
      '',
      '最后两行说明读取到 undefined 不能区分“缺少属性”和“属性值恰为 undefined”。'
    ].join('\n'),
    followUps: [
      {
        question: 'in 与 Object.hasOwn 应如何选择？',
        answer: '需要判断对象可访问接口、包括继承方法时可用 in；处理用户数据字典或只关心当前记录字段时应使用 Object.hasOwn，避免原型属性混入。'
      },
      {
        question: '为什么 in 的右侧不能直接是字符串原始值？',
        answer: 'in 的关系运算语义要求右侧是对象，否则抛 TypeError；它不会像部分 Object 静态方法那样自动把任意原始值装箱后再查属性。'
      }
    ],
    pitfalls: [
      'in 会沿原型链查询，不能把 true 直接解释为对象拥有这个自有数据字段。',
      '属性值为 undefined 仍可能真实存在，不能仅用 obj.key === undefined 判断字段缺失。'
    ],
    sources: [
      { label: 'ECMAScript：Relational Operators and in', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-relational-operators' },
      { label: 'MDN：in operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in' }
    ]
  },
  {
    number: 45,
    title: 'Object.hasOwn(obj, key) 检查什么？',
    mechanism: 'Object.hasOwn 检查指定属性键是否直接存在于 obj 自身，而不沿原型链查找。算法把 obj 转为对象、把 key 转为属性键，然后调用 HasOwnProperty；它不要求属性可枚举、值为真或可写，所以不可枚举属性、值为 undefined 的属性和自身 Symbol 属性都能返回 true。相比 obj.hasOwnProperty(key)，静态方法不会受对象自有同名方法覆盖影响，也能处理 Object.create(null) 创建的无原型字典。它只回答所有权，不验证值类型与描述符；若需要 writable、enumerable 等信息，应继续读取 Object.getOwnPropertyDescriptor。对 null 或 undefined 调用会因无法转换对象而抛 TypeError。',
    example: [
      '无原型对象没有 hasOwnProperty 方法，但 Object.hasOwn 仍能安全识别值为 undefined 的自有字段。',
      '',
      '~~~js',
      'const dict = Object.create(null)',
      'dict.enabled = undefined',
      '',
      "console.log(Object.hasOwn(dict, 'enabled')) // true",
      "console.log(Object.hasOwn(dict, 'toString')) // false",
      "console.log(typeof dict.hasOwnProperty) // 'undefined'",
      '',
      'const child = Object.create({ inherited: 1 })',
      "console.log(Object.hasOwn(child, 'inherited')) // false",
      "console.log('inherited' in child) // true",
      '~~~',
      '',
      '最后两行把自有属性检查与原型链可见性明确区分开。'
    ].join('\n'),
    followUps: [
      {
        question: 'Object.hasOwn 会忽略不可枚举属性吗？',
        answer: '不会。它只检查是否为自有属性，与 enumerable 无关；Object.defineProperty 默认创建的不可枚举属性仍可被 hasOwn 检出。'
      },
      {
        question: '为什么不直接调用 obj.hasOwnProperty？',
        answer: '对象可能覆盖该名称，或使用 null 原型而根本没有该方法；Object.hasOwn 不依赖接收对象的方法查找，语义更安全且更清楚。'
      }
    ],
    pitfalls: [
      'hasOwn 返回 true 不表示属性值有意义，undefined、null、false 与 0 都可能是有效自有值。',
      'Object.hasOwn 只判断所有权，字段权限、可写性和可枚举性必须通过描述符或业务规则另查。'
    ],
    sources: [
      { label: 'ECMAScript：Object.hasOwn', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.hasown' },
      { label: 'MDN：Object.hasOwn', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn' }
    ]
  },
  {
    number: 46,
    title: 'delete obj.key 的作用是什么？',
    mechanism: 'delete 对属性引用执行对象的 [[Delete]] 内部操作，目标是移除属性描述符本身，而不是把值写成 undefined。普通自有属性若 configurable 为 true 可被删除，之后 hasOwn 返回 false；不可配置属性在非严格代码中删除返回 false，在严格模式中会抛 TypeError。若对象没有该自有属性，delete 通常返回 true，即使同名属性可从原型继承；删除一个遮蔽原型的自有属性后，后续读取还可能重新暴露原型值。对数组索引使用 delete 会留下空洞且通常不改变 length，若要移除并移动元素应使用 splice。词法变量和函数参数也不是可通过对象属性 delete 删除的对象状态。',
    example: [
      '删除自有属性后，读取结果从 own 切换到原型 inherited；数组示例展示 delete 不会收缩长度。',
      '',
      '~~~js',
      "const proto = { role: 'inherited' }",
      'const user = Object.create(proto)',
      "user.role = 'own'",
      '',
      "console.log(delete user.role) // true",
      "console.log(Object.hasOwn(user, 'role')) // false",
      "console.log(user.role) // 'inherited'",
      '',
      'const values = [10, 20, 30]',
      'delete values[1]',
      'console.log(values.length) // 3',
      'console.log(1 in values) // false',
      '~~~',
      '',
      '属性不存在与属性值 undefined 是不同状态，可用 hasOwn 或 in 精确验证。'
    ].join('\n'),
    followUps: [
      {
        question: 'delete 与 obj.key = undefined 有何差异？',
        answer: '赋值保留属性描述符且 hasOwn 仍为 true，只改变存储值；delete 成功后属性不再自有，枚举、in 检查和原型回退行为都会改变。'
      },
      {
        question: '为什么删除数组元素通常使用 splice？',
        answer: 'delete 只移除索引属性并留下稀疏空洞，length 不变，迭代方法处理空洞还可能不同；splice 会移动后续元素并相应缩短数组。'
      }
    ],
    pitfalls: [
      '删除遮蔽属性后，同名原型属性可能重新可见，不能只看读取值判断删除是否符合预期。',
      '严格模式删除不可配置属性会抛错，不能只依赖 delete 返回布尔值处理所有失败。'
    ],
    sources: [
      { label: 'ECMAScript：The delete Operator', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-delete-operator' },
      { label: 'MDN：delete operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete' }
    ]
  },
  {
    number: 47,
    title: 'Object.freeze 是否会递归冻结嵌套对象？',
    mechanism: '不会，Object.freeze 是浅冻结。它先阻止目标对象继续扩展，再把对象自身现有数据属性改为不可写且不可配置，把访问器属性改为不可配置；对象的 [[Prototype]] 也不能再更改。但属性值若引用另一个对象，该嵌套对象拥有独立的内部槽与属性描述符，不会被自动处理，仍可修改。访问器的 getter 或 setter 函数也不会消失，冻结对象的某些可观察状态仍可能来自外部可变数据。实现深冻结需要递归遍历对象图、处理 Symbol 键与循环引用，并评估 Date、Map、TypedArray、私有字段等特殊对象；业务上常更适合采用不可变更新和只读接口。',
    example: [
      '顶层 name 无法改变，嵌套 profile.score 却仍能修改；严格模式让失败以异常显式出现。',
      '',
      '~~~js',
      "'use strict'",
      "const user = Object.freeze({ name: 'Lin', profile: { score: 1 } })",
      '',
      'try {',
      "  user.name = 'Linda'",
      '} catch (error) {',
      "  console.log(error.name) // 'TypeError'",
      '}',
      'user.profile.score = 2',
      "console.log(user.name) // 'Lin'",
      'console.log(user.profile.score) // 2',
      'console.log(Object.isFrozen(user.profile)) // false',
      '~~~',
      '',
      'freeze 只改变 user 自身描述符，没有递归访问 profile。'
    ].join('\n'),
    followUps: [
      {
        question: '如何实现基本的 deepFreeze？',
        answer: '可用 Reflect.ownKeys 遍历自有键，对对象值递归冻结，并用 WeakSet 记录已访问对象避免循环；还要明确对内建对象和外部资源的处理边界。'
      },
      {
        question: '冻结对象后 getter 的返回值一定不变吗？',
        answer: '不一定。getter 可读取外部变量、时间或另一个可变对象；freeze 固定的是自有属性描述符与扩展能力，不保证所有方法和访问器结果恒定。'
      }
    ],
    pitfalls: [
      'Object.freeze 不等同于深不可变，嵌套对象、闭包状态和某些内建内部状态仍可能变化。',
      '非严格模式下写冻结属性可能静默失败，测试不可变约束时应检查结果或使用严格模式。'
    ],
    sources: [
      { label: 'ECMAScript：Object.freeze', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze' },
      { label: 'MDN：Object.freeze', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze' }
    ]
  },
  {
    number: 48,
    title: 'Object.create(proto) 的作用是什么？',
    mechanism: 'Object.create(proto) 创建一个新对象，并把它的 [[Prototype]] 直接设置为传入的对象或 null；它不会复制 proto 的属性，也不会调用某个构造函数。读取新对象缺少的键时，普通属性查找才会沿原型链访问 proto。可选的第二参数是属性描述符映射，规则与 Object.defineProperties 相同，省略 writable、enumerable、configurable 时默认都是 false。传入 Object.create(null) 可得到没有 Object.prototype 的纯字典，避免 toString 等继承键干扰，但该对象也没有 hasOwnProperty 和常见对象方法。proto 必须是对象或 null，否则会抛 TypeError。创建后若修改 proto 的可见属性，新对象也可能立即通过委托观察到变化，因为两者始终保持原型关联。',
    example: [
      'dog 自身只有 name，speak 来自 animal 原型；null 原型字典则没有任何默认继承方法。',
      '',
      '~~~js',
      'const animal = {',
      "  speak() { return this.name + ' speaks' }",
      '}',
      'const dog = Object.create(animal)',
      "dog.name = 'Milo'",
      "console.log(dog.speak()) // 'Milo speaks'",
      "console.log(Object.hasOwn(dog, 'speak')) // false",
      'console.log(Object.getPrototypeOf(dog) === animal) // true',
      '',
      'const dict = Object.create(null)',
      "dict.key = 'value'",
      "console.log('toString' in dict) // false",
      '~~~',
      '',
      '继承是运行时委托，不是把 speak 方法复制进 dog。'
    ].join('\n'),
    followUps: [
      {
        question: 'Object.create 与 new Constructor 有何区别？',
        answer: 'Object.create 只建立指定原型并可定义描述符，不执行构造函数；new 还会调用构造器初始化实例，并遵循构造器显式返回对象等规则。'
      },
      {
        question: '何时适合使用 Object.create(null)？',
        answer: '当对象纯粹作为字符串键字典且不需要原型方法时可用，能避免继承键冲突；但序列化、调试和工具兼容性应测试，Map 往往更明确。'
      }
    ],
    pitfalls: [
      'Object.create(proto) 不会深拷贝或浅拷贝 proto，原型属性仍由多个后代共享访问。',
      '第二参数接收的是属性描述符而非普通值对象，遗漏 writable 等字段会得到不可写属性。'
    ],
    sources: [
      { label: 'ECMAScript：Object.create', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.create' },
      { label: 'MDN：Object.create', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create' }
    ]
  },
  {
    number: 49,
    title: '不可枚举属性会出现在 Object.keys 中吗？',
    mechanism: '不会。Object.keys 的筛选条件要求属性是目标对象自身拥有、属性键类型为 String，并且属性描述符的 enumerable 为 true；不可枚举自有属性虽然仍可被直接读取、用 in 或 Object.hasOwn 检测，却会被 Object.keys 排除。Object.getOwnPropertyNames 可取得全部自有字符串键，包括不可枚举键；Object.getOwnPropertySymbols 取得自有 Symbol 键；Reflect.ownKeys 则合并两类而不按 enumerable 过滤。for...in 只遍历可枚举字符串键但会沿原型链，JSON.stringify 对普通对象通常也只考虑可枚举字符串自有属性，几个 API 不应混为一谈。设计反射逻辑时应先明确需要的所有权、键类型与枚举性，再选择对应接口。',
    example: [
      'hidden 可直接读取且确实自有，但只有更全面的键 API 才会列出它。',
      '',
      '~~~js',
      'const obj = { visible: 1 }',
      "Object.defineProperty(obj, 'hidden', {",
      '  value: 2,',
      '  enumerable: false',
      '})',
      '',
      'console.log(obj.hidden) // 2',
      "console.log(Object.hasOwn(obj, 'hidden')) // true",
      "console.log(Object.keys(obj)) // ['visible']",
      "console.log(Object.getOwnPropertyNames(obj)) // ['visible', 'hidden']",
      "console.log(JSON.stringify(obj)) // '{\"visible\":1}'",
      '~~~',
      '',
      '不可枚举只影响特定枚举机制，不等于私有或无法访问。'
    ].join('\n'),
    followUps: [
      {
        question: '不可枚举属性是否具有安全保密性？',
        answer: '没有。调用方仍可直接读取已知键，或通过 getOwnPropertyNames、Reflect.ownKeys 和属性描述符发现它；真正私有状态应使用 #字段或闭包。'
      },
      {
        question: 'for...in 会列出不可枚举属性吗？',
        answer: '不会，但它会沿原型链列出可枚举字符串属性；因此与 Object.keys 的“仅自身”范围不同，处理数据对象时应明确是否过滤继承键。'
      }
    ],
    pitfalls: [
      'enumerable 为 false 只控制枚举可见性，不会自动禁止读取、修改或删除属性。',
      'Object.getOwnPropertyNames 仍不含 Symbol 键；需要完整自有键集合应使用 Reflect.ownKeys。'
    ],
    sources: [
      { label: 'ECMAScript：Object.keys', url: 'https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.keys' },
      { label: 'MDN：Enumerability and ownership of properties', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties' },
      { label: 'MDN：Object.getOwnPropertyNames', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames' }
    ]
  },
  {
    number: 50,
    title: '解构默认值在属性值为 null 时会生效吗？',
    mechanism: '不会。对象或数组解构中带初始化器的绑定，只有取得的属性值严格为 undefined 时才求值并采用默认表达式；属性缺失也会先得到 undefined，所以同样触发。null 是明确存在的另一种原始值，会原样绑定，不会被默认值替换。默认表达式是惰性的，只有触发时才执行，可引用已经初始化的前置绑定。还要区分嵌套模式：若写 const { profile: { name } = {} } = data，profile 为 undefined 时使用空对象，但 profile 为 null 时会保留 null，随后尝试从 null 解构并抛 TypeError。若业务把 null 与 undefined 都视为空值，应在解构后使用 ??，或先规范化输入。',
    example: [
      '缺失与 undefined 触发默认值，null 保留；空值合并则能有意覆盖两种空值而保留 0。',
      '',
      '~~~js',
      "const a = { value: null }",
      'const b = { value: undefined }',
      'const c = {}',
      '',
      "const { value: av = 'default' } = a",
      "const { value: bv = 'default' } = b",
      "const { value: cv = 'default' } = c",
      "console.log(av, bv, cv) // null 'default' 'default'",
      '',
      "console.log(av ?? 'fallback') // 'fallback'",
      "console.log(0 ?? 'fallback') // 0",
      '~~~',
      '',
      '是否把 null 当作缺失必须由业务契约决定，不能依赖解构默认语法猜测。'
    ].join('\n'),
    followUps: [
      {
        question: '默认表达式什么时候会执行？',
        answer: '只有解构取得的值为 undefined 时才执行，因此可用于惰性计算；若属性为 null、false、0 或空字符串，表达式完全不会求值。'
      },
      {
        question: '嵌套对象可能为 null 时怎样安全解构？',
        answer: '先用 const profile = data.profile ?? {} 规范化，再从 profile 解构；或使用可选链逐项读取。仅写解构默认值无法替换明确的 null。'
      }
    ],
    pitfalls: [
      '解构默认值不按真假判断，null、false、0 和空字符串都会被保留而不是替换。',
      '嵌套模式的中间值为 null 时仍可能抛 TypeError，外层默认对象只处理 undefined。'
    ],
    sources: [
      { label: 'ECMAScript：Destructuring Binding Patterns', url: 'https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-destructuring-binding-patterns' },
      { label: 'MDN：Destructuring assignment and default value', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#default_value' },
      { label: 'MDN：Nullish coalescing operator', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing' }
    ]
  }
]
