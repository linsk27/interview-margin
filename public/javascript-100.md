# JavaScript 01-10：数据类型与判断

## Q1：typeof null 的结果是什么？

- A. null
- B. object
- C. undefined
- D. number

**答案：B**

**题解：** 这是 JavaScript 早期实现遗留问题。null 是空值，但 typeof null 会返回 object，判断 null 应直接使用 value === null。

## Q2：NaN === NaN 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：B**

**题解：** NaN 与任何值都不相等，包括它自己。判断 NaN 优先使用 Number.isNaN(value)。

## Q3：Number.isNaN('hello') 的结果是什么？

- A. true
- B. false
- C. NaN
- D. 抛出异常

**答案：B**

**题解：** Number.isNaN 不进行隐式类型转换，字符串不是数值 NaN，所以返回 false。

## Q4：typeof 一个从未声明的变量会得到什么？

- A. null
- B. undefined
- C. ReferenceError
- D. object

**答案：B**

**题解：** typeof 对未声明标识符会安全返回字符串 undefined；直接读取该变量才会抛出 ReferenceError。

## Q5：Symbol('id') === Symbol('id') 的结果是什么？

- A. true
- B. false
- C. 取决于浏览器
- D. 抛出异常

**答案：B**

**题解：** 每次调用 Symbol 都会创建唯一值，描述文字相同不代表同一个 Symbol。

## Q6：1n + 1 会发生什么？

- A. 得到 2
- B. 得到 2n
- C. 得到 '11'
- D. 抛出 TypeError

**答案：D**

**题解：** BigInt 与 Number 不能直接参与算术运算，需要先把两边转换成同一种数值类型。

## Q7：null 和 undefined 最准确的区别是什么？

- A. 二者完全相同
- B. null 常表示主动设置为空，undefined 常表示尚未赋值
- C. undefined 是对象
- D. null 是字符串

**答案：B**

**题解：** 二者都表示“没有值”，但语义不同。null 往往由开发者明确赋值，undefined 多见于缺少参数、属性或初始化值。

## Q8：0.1 + 0.2 === 0.3 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：B**

**题解：** JavaScript Number 使用 IEEE 754 双精度浮点数，部分十进制小数无法被二进制精确表示。比较时可使用误差范围。

## Q9：Object.is(NaN, NaN) 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 与浏览器有关

**答案：A**

**题解：** Object.is 使用 SameValue 语义，能认为两个 NaN 相同。

## Q10：Object.is(+0, -0) 的结果是什么？

- A. true
- B. false
- C. NaN
- D. 抛出异常

**答案：B**

**题解：** Object.is 能区分正零和负零，而 +0 === -0 的结果是 true。

# JavaScript 11-20：隐式转换与相等比较

## Q11：Boolean('false') 的结果是什么？

- A. false
- B. true
- C. undefined
- D. 抛出异常

**答案：B**

**题解：** 非空字符串都是真值，字符串内容是不是 false 不影响转换结果。

## Q12：[] == false 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**题解：** 宽松相等会发生类型转换：空数组先转为空字符串，再转为数值 0；false 也转为 0。

## Q13：[] + [] 的结果是什么？

- A. []
- B. 0
- C. 空字符串
- D. NaN

**答案：C**

**题解：** 加号两侧的空数组都会转成空字符串，因此结果也是空字符串。

## Q14：[] + {} 作为表达式执行时通常得到什么？

- A. 0
- B. '[object Object]'
- C. []
- D. NaN

**答案：B**

**题解：** 空数组转为空字符串，普通对象转为字符串 [object Object]，随后进行字符串拼接。

## Q15：Number('') 的结果是什么？

- A. NaN
- B. undefined
- C. 0
- D. null

**答案：C**

**题解：** Number 会先处理空白，空字符串转换为数值 0。

## Q16：parseInt('12px', 10) 的结果是什么？

- A. NaN
- B. 12
- C. '12'
- D. 0

**答案：B**

**题解：** parseInt 从左向右解析整数，遇到无法解析的字符时停止。

## Q17：全局 isNaN('hello') 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**题解：** 全局 isNaN 会先把参数转成 Number，'hello' 转换后是 NaN。它与不转换类型的 Number.isNaN 不同。

## Q18：'5' - 2 的结果是什么？

- A. '52'
- B. 3
- C. NaN
- D. '3'

**答案：B**

**题解：** 减号只执行数值运算，会把字符串 '5' 转为数字 5。

## Q19：'5' + 2 的结果是什么？

- A. 7
- B. '7'
- C. '52'
- D. NaN

**答案：C**

**题解：** 加号遇到字符串会执行字符串拼接，因此数字 2 被转成字符串。

## Q20：null == undefined 与 null === undefined 的结果分别是什么？

- A. 都是 true
- B. 都是 false
- C. true、false
- D. false、true

**答案：C**

**题解：** 宽松相等规则中特别规定 null 与 undefined 相等；严格相等还会比较类型，因此为 false。

# JavaScript 21-30：作用域、提升与闭包

## Q21：var 声明的变量主要具有什么作用域？

- A. 块级作用域
- B. 函数作用域
- C. 类作用域
- D. 模块外作用域

**答案：B**

**题解：** var 不受普通代码块限制，但会受到函数边界限制；let 和 const 才具有块级作用域。

## Q22：在 let 声明前访问变量会发生什么？

- A. 得到 undefined
- B. 得到 null
- C. 抛出 ReferenceError
- D. 自动声明为全局变量

**答案：C**

**题解：** 从作用域开始到声明语句执行前属于暂时性死区，变量存在但不能访问。

## Q23：闭包是什么？

- A. 自动关闭浏览器窗口
- B. 函数和其词法环境的组合
- C. 一个 Promise
- D. 一种数组方法

**答案：B**

**题解：** 内部函数即使离开外部函数执行环境，仍可访问定义时捕获的外层变量，这种能力来自闭包。

## Q24：用 let 循环三次，并在定时器中输出循环变量，通常输出什么？

- A. 3、3、3
- B. 0、1、2
- C. undefined 三次
- D. 抛出异常

**答案：B**

**题解：** for 循环中的 let 会为每次迭代创建新的块级绑定，定时器分别捕获对应值。

## Q25：用 var 循环三次，并在定时器中输出循环变量，通常输出什么？

- A. 0、1、2
- B. 3、3、3
- C. undefined 三次
- D. 只输出 3 一次

**答案：B**

**题解：** var 只有一个函数级绑定，定时器执行时循环已经结束，变量值为 3。

## Q26：JavaScript 采用哪种作用域规则？

- A. 动态作用域
- B. 词法作用域
- C. 数据库作用域
- D. 随机作用域

**答案：B**

**题解：** 变量能访问哪里由代码定义位置决定，而不是由函数在哪里被调用决定。

## Q27：在代码块中使用 let 声明变量，块外访问会怎样？

- A. 正常访问
- B. 得到 undefined
- C. 抛出 ReferenceError
- D. 自动变成 window 属性

**答案：C**

**题解：** let 具有块级作用域，离开花括号对应的作用域后不可访问。

## Q28：const 声明对象后能否修改对象属性？

- A. 不能
- B. 可以
- C. 只能修改一次
- D. 取决于严格模式

**答案：B**

**题解：** const 限制的是变量绑定不能重新赋值，并不会自动冻结对象内部属性。

## Q29：内层作用域声明了与外层同名变量，这称为什么？

- A. 变量提升
- B. 变量遮蔽
- C. 事件冒泡
- D. 原型继承

**答案：B**

**题解：** 内层同名变量会遮蔽外层变量，内层代码优先读取自己的绑定。

## Q30：浏览器普通脚本顶层的 var 和 let 有什么差异？

- A. 都一定成为 window 属性
- B. var 通常成为 window 属性，let 不会
- C. let 成为 window 属性，var 不会
- D. 没有任何区别

**答案：B**

**题解：** 经典脚本中顶层 var 会绑定到全局对象属性，顶层 let 会进入全局词法环境而不是 window 属性。

# JavaScript 31-40：函数、参数与 this

## Q31：函数声明能否在声明语句前调用？

- A. 通常可以
- B. 永远不可以
- C. 只在箭头函数中可以
- D. 只在异步函数中可以

**答案：A**

**题解：** 函数声明会连同函数体一起提升，因此同一作用域中通常可以先调用后声明。

## Q32：var fn = function() {} 在赋值前调用 fn() 会怎样？

- A. 正常执行
- B. fn 为 undefined，调用时抛出 TypeError
- C. 返回 null
- D. 自动等待赋值

**答案：B**

**题解：** var 声明会提升，但函数值不会提升。赋值前 fn 的值是 undefined。

## Q33：默认参数在什么时候生效？

- A. 参数是 null 时
- B. 参数是 undefined 或未传时
- C. 参数是假值时
- D. 参数是 0 时

**答案：B**

**题解：** 默认参数只在实参为 undefined 时使用，null、false、0 和空字符串都会保留原值。

## Q34：剩余参数 ...args 在函数内部是什么？

- A. 真正的数组
- B. arguments 对象
- C. Set
- D. 字符串

**答案：A**

**题解：** 剩余参数会收集未匹配的实参并生成数组，可以直接使用 map、filter 等数组方法。

## Q35：调用函数时使用 fn(...arr) 的作用是什么？

- A. 删除数组
- B. 把数组元素展开为独立实参
- C. 深拷贝数组
- D. 冻结数组

**答案：B**

**题解：** 展开语法会把可迭代对象中的元素依次作为函数参数传入。

## Q36：call 的主要作用是什么？

- A. 返回一个新函数但不执行
- B. 指定 this，并立即按参数列表调用函数
- C. 只复制对象
- D. 创建 Promise

**答案：B**

**题解：** fn.call(obj, a, b) 会让函数执行时的 this 指向 obj，并立即传入 a、b。

## Q37：apply 与 call 的主要区别是什么？

- A. apply 不会执行函数
- B. apply 的参数通过数组或类数组一次传入
- C. apply 不能修改 this
- D. apply 只能用于箭头函数

**答案：B**

**题解：** apply 与 call 都立即调用函数；call 逐个传参，apply 使用数组或类数组传参。

## Q38：bind 的返回值是什么？

- A. 原函数的执行结果
- B. 一个绑定了 this 和部分参数的新函数
- C. undefined
- D. 一个数组

**答案：B**

**题解：** bind 不会立即执行，而是返回新函数，常用于事件回调、定时器或参数预设。

## Q39：箭头函数的 this 来自哪里？

- A. 调用者
- B. 定义时的外层词法作用域
- C. 永远是 window
- D. 永远是 undefined

**答案：B**

**题解：** 箭头函数没有自己的 this，会沿词法作用域向外查找，因此 call、apply、bind 不能改变它的 this。

## Q40：对 bind 返回的函数使用 new 时，this 主要指向哪里？

- A. bind 指定的对象
- B. 新创建的实例
- C. window
- D. undefined

**答案：B**

**题解：** new 的构造绑定优先级高于 bind 的 this 绑定，但 bind 预设的参数仍然有效。

# JavaScript 41-50：对象、属性与原型

## Q41：Object.assign 的拷贝深度是什么？

- A. 深拷贝
- B. 浅拷贝
- C. 不会拷贝
- D. 只拷贝原型

**答案：B**

**题解：** Object.assign 只复制源对象自身可枚举属性的当前值，嵌套对象仍与源对象共享引用。

## Q42：对象展开 {...source} 默认属于哪种拷贝？

- A. 深拷贝
- B. 浅拷贝
- C. 二进制拷贝
- D. 原型拷贝

**答案：B**

**题解：** 对象展开和 Object.assign 类似，只复制第一层属性。

## Q43：Object.keys(obj) 会返回哪些键？

- A. 包含原型链的全部键
- B. 自身可枚举的字符串键
- C. 只返回 Symbol 键
- D. 只返回不可枚举键

**答案：B**

**题解：** Object.keys 不包含继承属性、不可枚举属性和 Symbol 键。

## Q44：'toString' in {} 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**题解：** in 操作符会检查对象自身以及原型链，普通对象可从 Object.prototype 继承 toString。

## Q45：Object.hasOwn(obj, key) 检查什么？

- A. 自身是否具有该属性
- B. 原型链是否具有该属性
- C. 属性值是否为真
- D. 属性是否可写

**答案：A**

**题解：** Object.hasOwn 只检查对象自身属性，比直接调用 obj.hasOwnProperty 更安全。

## Q46：delete obj.key 的作用是什么？

- A. 把值设置成 undefined
- B. 删除可配置的自身属性
- C. 删除整个对象
- D. 删除原型

**答案：B**

**题解：** delete 删除属性本身，而不是简单赋值 undefined；不可配置属性无法被成功删除。

## Q47：Object.freeze 是否会递归冻结嵌套对象？

- A. 会
- B. 不会，只冻结第一层
- C. 只冻结数组
- D. 取决于严格模式

**答案：B**

**题解：** Object.freeze 是浅冻结。若要深冻结，需要自行递归处理嵌套对象。

## Q48：Object.create(proto) 的作用是什么？

- A. 深拷贝 proto
- B. 创建一个以 proto 为原型的新对象
- C. 冻结 proto
- D. 删除 proto

**答案：B**

**题解：** 新对象会通过原型链继承 proto 上的属性和方法，但不会复制这些属性。

## Q49：不可枚举属性会出现在 Object.keys 中吗？

- A. 会
- B. 不会
- C. 只在数组中会
- D. 只在严格模式中会

**答案：B**

**题解：** Object.keys 只返回自身可枚举字符串属性；可用 Object.getOwnPropertyNames 查看不可枚举字符串属性。

## Q50：解构默认值在属性值为 null 时会生效吗？

- A. 会
- B. 不会
- C. 会变成 0
- D. 会抛出异常

**答案：B**

**题解：** 解构默认值只在属性值严格等于 undefined 时生效，null 会被保留。

# JavaScript 51-60：数组与集合操作

## Q51：Array.prototype.map 的返回值是什么？

- A. 原数组
- B. 一个通常与原数组等长的新数组
- C. undefined
- D. 布尔值

**答案：B**

**题解：** map 对每个已有元素执行映射函数，并把返回值组成新数组，不会直接修改原数组。

## Q52：Array.prototype.forEach 的返回值是什么？

- A. 新数组
- B. 原数组
- C. undefined
- D. true

**答案：C**

**题解：** forEach 用于遍历副作用，不会收集回调返回值。

## Q53：filter 的作用是什么？

- A. 修改每个元素
- B. 返回满足条件元素组成的新数组
- C. 找到第一个元素
- D. 对数组排序

**答案：B**

**题解：** 回调返回真值的元素会被保留，原数组通常不会被修改。

## Q54：reduce 最核心的用途是什么？

- A. 把数组累计为一个结果
- B. 只删除重复元素
- C. 只排序数字
- D. 复制 DOM

**答案：A**

**题解：** reduce 让累计值依次处理每个元素，可用于求和、分组、构建对象等。

## Q55：find 没找到匹配元素时返回什么？

- A. -1
- B. null
- C. undefined
- D. false

**答案：C**

**题解：** find 返回第一个匹配元素的值；findIndex 才会在未找到时返回 -1。

## Q56：some 在什么时候返回 true？

- A. 所有元素都满足条件
- B. 至少一个元素满足条件
- C. 数组为空
- D. 数组长度大于 10

**答案：B**

**题解：** some 遇到第一个真值就短路返回 true，适合判断“是否存在”。

## Q57：[].every(Boolean) 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**题解：** 空数组没有反例，every 对空数组返回 true，这属于数学上的空真。

## Q58：[10, 2, 1].sort() 的默认结果是什么？

- A. [1, 2, 10]
- B. [1, 10, 2]
- C. [10, 2, 1]
- D. 抛出异常

**答案：B**

**题解：** sort 默认按字符串的 UTF-16 顺序比较。数值升序应传入比较函数 (a, b) => a - b。

## Q59：splice 与 slice 的关键区别是什么？

- A. 二者都修改原数组
- B. splice 会修改原数组，slice 通常不会
- C. slice 会修改原数组，splice 不会
- D. 二者都只用于字符串

**答案：B**

**题解：** splice 可删除、插入或替换原数组元素；slice 返回指定区间的浅拷贝。

## Q60：[NaN].includes(NaN) 的结果是什么？

- A. true
- B. false
- C. undefined
- D. 抛出异常

**答案：A**

**题解：** includes 使用 SameValueZero 比较，可以识别 NaN；indexOf(NaN) 则找不到。

# JavaScript 61-70：Promise、async 与事件循环

## Q61：new Promise(executor) 中 executor 何时执行？

- A. 立即同步执行
- B. 下一轮宏任务执行
- C. 页面空闲时执行
- D. 调用 then 后执行

**答案：A**

**题解：** Promise 构造函数的执行器同步执行，但 then、catch、finally 注册的回调进入微任务队列。

## Q62：Promise.then 的回调属于哪类任务？

- A. 同步任务
- B. 微任务
- C. 宏任务
- D. 渲染任务

**答案：B**

**题解：** 当前同步代码结束后，事件循环会在进入下一个宏任务前清空微任务队列。

## Q63：setTimeout 回调通常属于哪类任务？

- A. 微任务
- B. 宏任务
- C. 同步任务
- D. 编译任务

**答案：B**

**题解：** 定时器到期后只是把回调加入宏任务队列，并不保证精确时间立即执行。

## Q64：同步日志、Promise.then、setTimeout(0) 的典型执行顺序是什么？

- A. 定时器、Promise、同步
- B. 同步、Promise、定时器
- C. Promise、同步、定时器
- D. 同步、定时器、Promise

**答案：B**

**题解：** 先执行当前调用栈的同步代码，再清空微任务，最后进入后续宏任务。

## Q65：async 函数一定返回什么？

- A. 普通值
- B. Promise
- C. Generator
- D. DOM 节点

**答案：B**

**题解：** 即使 return 一个普通值，async 函数也会返回以该值兑现的 Promise。

## Q66：await 一个已兑现 Promise 后，后续代码何时继续？

- A. 立即在当前调用栈继续
- B. 以微任务方式继续
- C. 以定时器方式继续
- D. 永远不继续

**答案：B**

**题解：** await 会暂停当前 async 函数，把后续部分安排到微任务中执行。

## Q67：Promise.all 中一个 Promise 拒绝会怎样？

- A. 等待全部成功后再拒绝
- B. 返回的 Promise 尽快拒绝
- C. 自动忽略错误
- D. 自动重试

**答案：B**

**题解：** Promise.all 具有快速失败语义，但其他已经启动的异步任务不会因此自动取消。

## Q68：想获得每个 Promise 的成功或失败结果，应使用什么？

- A. Promise.allSettled
- B. Promise.resolve
- C. Promise.reject
- D. Promise.finally

**答案：A**

**题解：** allSettled 会等待所有输入结束，并返回带 status 的结果数组。

## Q69：Promise.race 的结果由什么决定？

- A. 最后完成的 Promise
- B. 第一个落定的 Promise
- C. 第一个成功的 Promise
- D. 数组长度

**答案：B**

**题解：** 第一个兑现或拒绝的输入决定 race 的最终状态。只想取第一个成功值可了解 Promise.any。

## Q70：Promise.finally 的回调通常会得到原结果参数吗？

- A. 会得到成功值
- B. 会得到失败原因
- C. 不会直接得到原结果参数
- D. 只得到布尔值

**答案：C**

**题解：** finally 用于不依赖结果的清理。若它不抛错或返回拒绝 Promise，原状态和值会继续向后传递。

# JavaScript 71-80：DOM、存储与网络

## Q71：DOM 事件冒泡的方向是什么？

- A. 从 window 到目标元素
- B. 从目标元素向祖先传播
- C. 只在目标元素执行
- D. 随机传播

**答案：B**

**题解：** 事件先经历捕获阶段到达目标，再从目标向祖先节点冒泡。

## Q72：addEventListener 的 capture 选项为 true 表示什么？

- A. 在捕获阶段监听
- B. 禁止事件
- C. 只监听一次
- D. 自动移除监听

**答案：A**

**题解：** capture 为 true 时，监听器在事件从外向内传播的捕获阶段执行。

## Q73：event.preventDefault() 的作用是什么？

- A. 阻止事件传播
- B. 阻止浏览器默认行为
- C. 删除事件对象
- D. 阻止 JavaScript 执行

**答案：B**

**题解：** 例如阻止链接跳转或表单提交。它不会自动阻止事件继续传播。

## Q74：event.stopPropagation() 的作用是什么？

- A. 阻止默认行为
- B. 阻止事件继续传播
- C. 取消异步请求
- D. 删除 DOM

**答案：B**

**题解：** 它影响捕获或冒泡传播，但不会自动取消默认行为。

## Q75：事件委托的核心是什么？

- A. 给每个子元素都创建监听器
- B. 利用事件冒泡在祖先元素统一处理
- C. 使用 setTimeout
- D. 使用 Web Worker

**答案：B**

**题解：** 祖先监听器通过 event.target 或 closest 判断来源，适合动态列表并减少监听器数量。

## Q76：localStorage 存储的值是什么类型？

- A. 任意对象
- B. 字符串
- C. Promise
- D. Symbol

**答案：B**

**题解：** 对象需要先 JSON.stringify，读取后再 JSON.parse。localStorage 通常在同源页面间持久保存。

## Q77：sessionStorage 的生命周期通常是什么？

- A. 永久存在
- B. 当前标签页会话
- C. 一次函数调用
- D. 一次网络请求

**答案：B**

**题解：** sessionStorage 与标签页会话关联，关闭标签页后通常清除，不同标签页的数据彼此独立。

## Q78：Cookie 与 localStorage 的重要区别是什么？

- A. Cookie 永远不会发给服务器
- B. 符合条件的 Cookie 会随 HTTP 请求发送
- C. localStorage 会自动随请求发送
- D. 二者没有区别

**答案：B**

**题解：** Cookie 可用于会话，但应正确设置 HttpOnly、Secure、SameSite 等属性；localStorage 不会自动随请求发送。

## Q79：同源策略中的“源”由什么组成？

- A. 协议、主机、端口
- B. 路径、查询参数、哈希
- C. 用户名、密码、路径
- D. 浏览器、系统、设备

**答案：A**

**题解：** 协议、主机或端口任意不同，就属于不同源；路径不同不影响同源判断。

## Q80：CORS 响应头通常由谁配置？

- A. 浏览器扩展
- B. 目标服务器
- C. 前端 localStorage
- D. HTML 标签

**答案：B**

**题解：** 浏览器执行同源限制，服务器通过 Access-Control-Allow-Origin 等响应头声明哪些跨源请求可被前端读取。

# JavaScript 81-90：模块、类与迭代器

## Q81：同一作用域能否重复声明同名 let 变量？

- A. 可以
- B. 不可以，会产生语法错误
- C. 只在严格模式不可以
- D. 只在模块中可以

**答案：B**

**题解：** let 和 const 不允许在同一词法作用域重复声明同名绑定。

## Q82：导入命名导出 foo 的正确形式是什么？

- A. import foo from './mod.js'
- B. import { foo } from './mod.js'
- C. require { foo }
- D. include foo

**答案：B**

**题解：** 命名导出使用花括号导入，名称默认需要与导出名称一致，也可使用 as 起别名。

## Q83：导入默认导出的正确形式是什么？

- A. import { default } only
- B. import anyName from './mod.js'
- C. import * as default
- D. export from './mod.js'

**答案：B**

**题解：** 默认导入不使用花括号，本地名称可以由导入方自行决定。

## Q84：静态 import 声明有什么特点？

- A. 可写在任意 if 块中
- B. 在模块顶层声明，依赖可被静态分析
- C. 只能运行时解析
- D. 返回普通字符串

**答案：B**

**题解：** 静态 import 的结构在执行前已知，有利于打包器做依赖分析和 Tree Shaking；动态加载使用 import()。

## Q85：typeof class User {} 的 User 是什么？

- A. object
- B. function
- C. class
- D. undefined

**答案：B**

**题解：** class 提供更严格、更清晰的构造与继承语法，但其构造器在运行时仍属于函数。

## Q86：class 中定义的普通实例方法通常存放在哪里？

- A. 每个实例独立复制
- B. 类的 prototype 上
- C. window 上
- D. localStorage 中

**答案：B**

**题解：** 原型方法由实例共享；实例字段才通常直接成为每个实例自己的属性。

## Q87：派生类 constructor 中访问 this 前必须做什么？

- A. 调用 super()
- B. 调用 bind()
- C. 调用 Object.freeze()
- D. 调用 setTimeout()

**答案：A**

**题解：** extends 创建的派生类需要先执行父类构造逻辑，super() 返回后才能使用 this。

## Q88：Generator 函数调用后返回什么？

- A. Promise
- B. 迭代器对象
- C. 数组
- D. DOM 节点

**答案：B**

**题解：** 调用 Generator 不会立刻执行完整函数，而是返回具有 next 方法的迭代器，通过 yield 分段执行。

## Q89：对象要支持 for...of，通常需要实现什么？

- A. Symbol.iterator
- B. toJSON
- C. valueOf
- D. hasOwnProperty

**答案：A**

**题解：** Symbol.iterator 方法应返回迭代器，for...of 会不断调用 next 读取值。

## Q90：Map 的键可以是什么类型？

- A. 只能是字符串
- B. 只能是数字
- C. 任意值，包括对象
- D. 只能是 Symbol

**答案：C**

**题解：** Map 不会像普通对象那样把键统一转成字符串，对象、函数、NaN 等都可以直接作为键。

# JavaScript 91-100：集合、错误、安全与性能

## Q91：new Set([NaN, NaN]).size 是多少？

- A. 0
- B. 1
- C. 2
- D. NaN

**答案：B**

**题解：** Set 使用 SameValueZero 判断唯一性，两个 NaN 被视为同一个值。

## Q92：WeakMap 相比 Map 的主要特点是什么？

- A. 键会阻止垃圾回收
- B. 对对象键保持弱引用，且不能被整体遍历
- C. 键只能是字符串
- D. 会自动深拷贝值

**答案：B**

**题解：** 当对象键没有其他强引用时可被回收，因此 WeakMap 适合保存与对象生命周期绑定的私有元数据。

## Q93：user?.profile?.name 的作用是什么？

- A. 强制创建缺失属性
- B. 在链路为空值时短路并返回 undefined
- C. 深拷贝 user
- D. 删除 profile

**答案：B**

**题解：** 可选链只在左侧为 null 或 undefined 时短路，避免读取空值属性时报错。

## Q94：value ?? fallback 在什么情况下使用 fallback？

- A. value 为任意假值
- B. value 为 null 或 undefined
- C. value 为 0
- D. value 为空字符串

**答案：B**

**题解：** 空值合并不会把 0、false、空字符串误当成缺失值，这与 || 不同。

## Q95：try 中 return 1，finally 中 return 2，最终返回什么？

- A. 1
- B. 2
- C. undefined
- D. 抛出异常

**答案：B**

**题解：** finally 中显式 return 会覆盖 try 或 catch 的返回结果，因此实践中应避免在 finally 中 return。

## Q96：JSON.stringify 对象属性中的 undefined 通常如何处理？

- A. 转成 null
- B. 省略该属性
- C. 抛出异常
- D. 转成字符串 'undefined'

**答案：B**

**题解：** 对象中的 undefined、函数和 Symbol 属性通常会被省略；数组对应位置通常会变成 null。

## Q97：structuredClone 的优势是什么？

- A. 只能浅拷贝
- B. 能深拷贝许多内建类型并支持循环引用
- C. 能克隆函数闭包
- D. 会保留所有原型方法

**答案：B**

**题解：** structuredClone 比 JSON 序列化支持更多类型和循环引用，但函数等不可克隆值仍会报错。

## Q98：把不可信字符串直接赋给 innerHTML 的主要风险是什么？

- A. SQL 注入
- B. XSS
- C. DNS 污染
- D. 内存一定溢出

**答案：B**

**题解：** 攻击者可能注入恶意标签或事件属性。纯文本应使用 textContent，确需 HTML 时要采用可靠白名单净化。

## Q99：防抖 debounce 的典型行为是什么？

- A. 固定间隔持续执行
- B. 高频触发停止一段时间后只执行一次
- C. 每次触发都立即执行
- D. 永不执行

**答案：B**

**题解：** 防抖适合搜索输入、窗口调整结束后的处理，重点是把连续触发合并为最后一次。

## Q100：节流 throttle 的典型行为是什么？

- A. 高频触发期间限制为固定时间窗口最多执行一次
- B. 必须等停止触发才执行
- C. 深拷贝回调
- D. 取消所有事件

**答案：A**

**题解：** 节流适合滚动、拖拽等持续事件，在保证持续反馈的同时限制执行频率。
