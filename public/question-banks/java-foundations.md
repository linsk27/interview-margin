# Java 基础 100 题

# Java 高频基础与语言机制

## Q1：Java 的基本类型、引用类型与变量默认值应怎样区分？

**短回答：**

Java 的类型先分基本类型与引用类型；默认值只由字段和数组元素自动获得，方法局部变量必须通过确定赋值检查后才能读取。

**原理：**

八种基本类型直接表示布尔值、整数、浮点数或 UTF-16 代码单元，引用类型的变量保存的是对对象或数组的引用，空引用用 null 表示。JLS 没有规定 boolean 的存储位数，也不能把整数直接当布尔值使用。实例字段、静态字段和新建数组元素会被初始化为零值、false 或 null；局部变量不会自动填默认值，编译器通过确定赋值规则分析每条控制流路径。引用变量本身可以重新指向别处，这与被引用对象是否可变是两件事；final 引用只禁止变量再次赋值，并不会递归冻结对象内部状态。

**代码 / 场景：**

例如 `class Box { int count; String name; }` 中，新建 Box 后 count 为 0、name 为 null；但方法内写 `int n; System.out.println(n);` 会编译失败。若写 `final List<String> names = new ArrayList<>();`，不能让 names 指向新列表，却仍可执行 `names.add("A")` 修改原列表。

**递进追问：**

1. **为什么局部变量没有默认值反而更安全？**

   编译期强制每条可达路径先赋值，可以尽早暴露遗漏分支，避免把无意的零值或 null 当成真实业务状态继续传播。

2. **char 是否等同于一个完整的 Unicode 字符？**

   不等同。char 是单个 UTF-16 代码单元，补充平面字符需要一对代理项表示，按用户可见字符处理时应使用代码点相关 API。

**易错点：**

- 声称 boolean 固定占用一字节或四字节，混淆语言规范与 JVM 实现细节。
- 把 final 引用理解成深度不可变，忽略对象字段和集合内容仍可能改变。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)
- [技术校准：JLS 14：语句与控制流](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)

校验日期：2026-08-05

## Q2：JDK、JRE、JVM 和字节码是什么关系，Java 为什么能跨平台？

**短回答：**

JDK 用来开发并包含运行工具，JRE 是传统意义上的运行环境，JVM 负责执行字节码；Java 先编译为面向 JVM 的 `.class`，再由各平台上的 JVM 实现解释或编译为本机代码，因此实现“一份字节码、多平台运行”。

**原理：**

源文件由 `javac` 编译为符合 Class File 规范的字节码。类加载器把字节码装入 JVM，验证、链接并初始化后，执行引擎可解释执行，也可把热点代码交给 JIT 编译为机器码。跨平台并不是 JVM 自己没有平台差异，而是 Windows、Linux 等平台各自提供兼容规范的 JVM，把同一套字节码映射到不同指令集。JDK 还包含编译、诊断和打包工具；从模块化 JDK 开始，生产运行时可以按模块裁剪，不应再死背“JRE 一定是 JDK 目录里的固定子目录”。面试回答要区分语言规范、JVM 规范和某个 HotSpot 实现，避免把实现细节说成所有 JVM 的保证。

**代码 / 场景：**

排查“本机能跑、服务器不能跑”时，先确认编译目标版本与生产 JVM 版本：用 Java 21 编译出的高版本 Class 文件不能直接交给 Java 8 JVM。构建中可使用 `--release` 固定目标平台，再用同版本容器镜像做集成测试；JNI、本地字体、默认字符集和文件路径等平台资源仍可能破坏应用层的跨平台性。

**递进追问：**

1. **Java 是编译型还是解释型语言？**

   更准确的回答是编译与运行时执行并存：源码先编译为字节码，JVM 实现可以解释字节码，也可以通过 JIT 或 AOT 转成本机代码。

2. **JDK 21 还需要单独安装 JRE 吗？**

   通常不需要。现代 JDK 已包含运行所需模块，也可用 jlink 制作定制运行时；部署时更应关注实际运行镜像和模块依赖。

**易错点：**

- 把跨平台理解成任何 Java 程序都不依赖操作系统资源。
- 只检查 `java -version`，不检查 Class 文件版本、构建目标和第三方本地依赖。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JVMS 4：Class 文件格式](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-05

## Q3：浮点数为何不能直接表示多数十进制小数，金额又该怎样计算？

**短回答：**

float 与 double 使用二进制浮点表示，很多有限十进制小数在二进制中是无限循环；精确十进制业务通常应使用 BigDecimal。

**原理：**

Java 浮点运算遵循 IEEE 754 语义，有限位的符号、指数和有效数字只能近似保存多数十进制分数，因此 0.1 与 0.2 的内部值并非数学上的精确十分之一和五分之一。浮点还包含正负零、无穷大和 NaN；NaN 与任何值包括自身做 `==` 都为 false。BigDecimal 用任意精度整数加 scale 表示十进制值，构造时应优先传字符串或使用 valueOf，避免把 double 已有误差原样带入。除法可能得到无限小数，必须按业务指定精度与舍入模式；`equals` 同时比较数值和 scale，而 `compareTo` 比较数值大小。

**代码 / 场景：**

例如 `0.1 + 0.2 == 0.3` 通常为 false。订单金额可写 `new BigDecimal("19.90").multiply(BigDecimal.valueOf(3))`，分摊时显式调用 `divide(count, 2, RoundingMode.HALF_UP)`。`new BigDecimal("1.0").equals(new BigDecimal("1.00"))` 为 false，但 compareTo 返回 0。

**递进追问：**

1. **科学计算是否也应该全部换成 BigDecimal？**

   不一定。科学计算常接受可量化误差并重视硬件浮点吞吐，应根据误差模型比较容差，而不是追求十进制逐位相等。

2. **BigDecimal 为什么不能直接用 `==` 比较？**

   `==` 比较两个引用是否指向同一对象，不比较数值内容；业务上应根据是否关心 scale 选择 equals 或 compareTo。

**易错点：**

- 用 `new BigDecimal(0.1)` 构造金额，把二进制近似值完整带进十进制对象。
- 调用 BigDecimal.divide 时不指定无法整除情况下的精度或舍入策略。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)
- [技术校准：Java 21 BigDecimal API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html)

校验日期：2026-08-05

## Q4：自动装箱、拆箱与包装类缓存会怎样影响比较和空值？

**短回答：**

装箱把基本值转换为包装对象，拆箱反向取值；引用相等、缓存区间与 null 拆箱共同构成常见的线上空指针和比较陷阱。

**原理：**

赋值、方法调用和运算上下文可触发装箱或拆箱。对 Integer 等包装类使用 `==` 时，如果两边都是引用，比较的是对象身份而非数值；规范要求部分常量装箱结果在一定范围内共享，例如 int 的 -128 到 127，但实现可以缓存更多，业务逻辑不能依赖范围外身份。只要包装值进入算术、关系运算或赋给基本类型，就会执行拆箱；null 没有可提取的基本值，因此会抛 NullPointerException。泛型集合只能保存引用类型，所以基本值进入 `List<Integer>` 会产生装箱，热点路径还需关注分配与拆箱成本。

**代码 / 场景：**

例如 `Integer a = 127, b = 127; a == b` 通常且按规范为 true，而值为 128 时不能依赖该结果；统一写 `Objects.equals(a, b)` 可处理 null。`Map<String,Integer> counts` 中 `int n = counts.get("x")` 在键不存在时会因 null 自动拆箱失败，可改用 `getOrDefault("x", 0)`。

**递进追问：**

1. **两个包装类做 `<` 比较时比较的是什么？**

   关系运算要求数值操作数，因此包装对象先拆箱，再按数值提升规则比较；若任一引用为 null，拆箱阶段就会失败。

2. **为什么方法重载中装箱与可变参数可能改变选择结果？**

   重载解析按适用阶段选择候选，固定元数且无需装箱的转换通常先于装箱，再先于可变参数，因此新增重载可能改变绑定。

**易错点：**

- 用包装对象的 `==` 判断业务数值相等，让结果偶然依赖缓存范围。
- 把可能为 null 的包装值直接参与算术或赋给基本类型，忽略隐式拆箱。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 5：转换与上下文](https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-05

## Q5：Java 为什么只有值传递，修改对象却仍可能被调用方看见？

**短回答：**

Java 方法调用始终复制实参的值；对象参数复制的是引用值，因此双方可经各自引用访问同一对象，却不能替调用方重绑变量。

**原理：**

调用方法时，每个形参都会得到一个独立的参数变量。基本类型复制具体数值，引用类型复制指向对象的引用值；这仍然是值传递，而不是把调用方变量本身交给方法。方法内修改共享对象的字段或集合内容，调用方随后能观察到同一对象的状态变化；方法内把形参重新赋为新对象，只改变形参这份引用副本。数组也是对象，传入数组后修改元素可见，但把形参数组指向另一个数组不可见。想让方法显式返回新的绑定，应使用返回值、结果对象或可读的状态容器，而不是称其为“引用传递”。

**代码 / 场景：**

例如 `void rename(User u) { u.name = "Li"; u = new User("Wang"); }`：第一次修改作用于双方共享的原 User，第二次只让局部形参指向新对象。交换方法 `swap(User a, User b)` 即使交换 a、b，也无法交换调用方两个变量；应返回二元结果并由调用方重新赋值。

**递进追问：**

1. **传入不可变对象时为什么看起来完全不能修改？**

   传递规则没有变化，只是该对象没有可观察的原地修改操作；所谓修改通常会创建新对象并让局部引用重新绑定。

2. **可变参数是否属于特殊的引用传递？**

   不是。可变参数在调用处被组织成数组，方法得到的仍是数组引用值的副本，元素修改和形参重绑遵循同一规则。

**易错点：**

- 把“引用值被复制”简称为引用传递，错误推导出方法能够重绑调用方变量。
- 为避免副作用只复制最外层引用或集合，实际仍与调用方共享内部可变元素。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)
- [技术校准：JLS 10：数组](https://docs.oracle.com/javase/specs/jls/se21/html/jls-10.html)

校验日期：2026-08-05

## Q6：final、finally 与 finalize 为什么不是同一类概念？

**短回答：**

final 是限制继承或再次赋值的语言修饰符，finally 是异常控制流结构，finalize 则是已弃用并等待移除的对象终结机制。

**原理：**

final 可修饰变量、方法和类：变量只能完成一次赋值，但 final 引用指向的对象仍可能可变；实例方法不可被子类重写，类不可被继承。finally 属于 try 语句的清理分支，在 try 或 catch 正常结束、return 或抛异常时通常都会执行，但进程强制终止、JVM 崩溃等情况下不能保证运行；更危险的是 finally 自己 return 或抛异常会替代此前的返回值或异常。finalize 是 Object 上历史遗留的回调，在 Java 21 已弃用并标记待移除，执行时间和是否执行都没有可靠保证，还会带来对象复活、性能与安全问题，不能承担文件、连接等资源释放。确定性清理应使用 AutoCloseable 与 try-with-resources。

**代码 / 场景：**

例如 `final List<String> names = new ArrayList<>();` 禁止 names 重新指向别处，却允许 `names.add("A")`。`try { return 1; } finally { return 2; }` 最终返回 2，并吞掉前面的控制结果，因此应禁止在 finally 中 return。数据库连接应放进 try-with-resources，而不是等待重写 finalize 后由 GC 顺便关闭。

**递进追问：**

1. **final 方法与 private 方法都不能重写，原因相同吗？**

   不同。final 方法是被继承但明确禁止重写；private 方法对子类不可继承，子类出现同名方法只是声明了一个无关的新成员。

2. **finally 是否适合关闭多个可能抛异常的资源？**

   手写 finally 容易覆盖主异常并遗漏部分关闭动作；try-with-resources 能按逆序关闭，并把关闭异常保存为 suppressed，更适合该场景。

**易错点：**

- 把 final 引用误认为深度不可变，忽略其内部对象仍可被修改。
- 在 finally 中 return 或抛出新异常，覆盖真正需要诊断的原始结果。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 14：语句与控制流](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：Java 21 AutoCloseable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/AutoCloseable.html)

校验日期：2026-08-05

## Q7：数组协变与泛型不变为什么采用不同的安全策略？

**短回答：**

Java 数组是具体化且协变的，错误写入通过运行时检查阻止；泛型通常不变且被擦除，类型不兼容会尽量在编译期被拒绝。

**原理：**

若 Dog 是 Animal 的子类型，Dog[] 也是 Animal[] 的子类型，所以可以把 Dog[] 赋给 Animal[]；但数组运行时知道真实组件类型，每次引用写入都要检查，写入 Cat 会抛 ArrayStoreException。这种协变保留了早期语言兼容性，却把部分错误推迟到运行时。`List<Dog>` 不是 `List<Animal>` 的子类型，因为若允许赋值，就能经后者加入 Cat，破坏原列表承诺。泛型通过通配符表达受控的型变视图：`? extends Animal` 适合读取生产者，不能安全加入具体 Animal；`? super Dog` 适合接收 Dog，读取时只能当 Object。

**代码 / 场景：**

例如 `Animal[] animals = new Dog[2]; animals[0] = new Cat();` 编译通过但运行抛 ArrayStoreException。批量复制可设计为 `static <T> void copy(List<? extends T> src, List<? super T> dst)`，源列表只读出 T，目标列表可写入 T，同时由编译器阻止不安全方向。

**递进追问：**

1. **为什么不能直接创建 `new List<String>[10]`？**

   数组必须在运行时检查真实组件类型，而泛型实参通常已擦除，无法可靠检查元素参数化类型，因此禁止这类泛型数组创建。

2. **`List<?>` 能加入 null 吗？**

   可以加入 null，因为它可转换为任意引用类型；但不能加入任何确定的非 null 对象，因为通配符代表的实际元素类型未知。

**易错点：**

- 把数组协变当成完全类型安全，忽略错误可能延迟到运行时写入检查。
- 认为 `List<子类>` 天然是 `List<父类>`，从而试图绕过泛型不变性。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 10：数组](https://docs.oracle.com/javase/specs/jls/se21/html/jls-10.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)

校验日期：2026-08-05

## Q8：Java 为什么说是“编译与解释并存”，JIT 在什么时候发挥作用？

**短回答：**

源码先由 `javac` 编译为字节码；运行时 JVM 可以先解释执行，并把频繁执行的热点方法编译为优化后的机器码。两条执行路径共同兼顾启动速度、可移植性和长期运行性能。

**原理：**

字节码是稳定的中间表示，不等于逐行源码解释。以 HotSpot 为例，方法最初可能由解释器执行，同时收集调用次数、分支概率和类型分布；达到阈值后进入分层编译，JIT 可做内联、逃逸分析和无用检查消除。优化依赖运行时假设，如果之后加载的新类型使假设失效，JVM 可以去优化并回到较保守的执行路径。规范并不要求所有 JVM 采用完全相同的解释器和编译器，所以回答时应把“HotSpot 常见实现”与“Java/JVM 规范承诺”分开。预热、代码形状和真实负载会影响基准，不能用一次冷启动耗时证明 Java 的稳态性能。

**代码 / 场景：**

接口服务刚启动时延迟偏高，可能同时受到类加载、连接池建立和 JIT 预热影响。应通过 JFR、编译日志和分阶段压测定位，而不是盲目循环调用接口“暖机”。微基准应使用 JMH 避免死代码消除和错误预热；短命 CLI 程序则更关注启动时间，未必能获得热点编译的长期收益。

**递进追问：**

1. **JIT 编译后的代码是否永久不变？**

   不是。JVM 可能基于运行时画像重新编译，也可能在假设失效时去优化，恢复解释执行或进入另一层编译。

2. **为什么生产压测需要预热阶段？**

   预热可让类加载、缓存和热点编译进入较稳定状态，从而把冷启动成本与稳态吞吐、延迟分开观察。

**易错点：**

- 把字节码说成 CPU 可以直接执行的机器码。
- 用手写循环做微基准，忽略 JIT 的死代码消除、内联和预热效应。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JVMS 4：Class 文件格式](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html)
- [技术校准：JDK 21 HotSpot 性能增强](https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html)

校验日期：2026-08-05

## Q9：重载调用中的基本类型转换、装箱与可变参数如何排序？

**短回答：**

重载在编译期按分阶段适用性和最具体规则选择；通常先考虑无需装箱的固定参数，再考虑装箱，最后才使用可变参数。

**原理：**

编译器先根据方法名和编译期参数类型收集候选，不会根据运行时参数对象重新选择重载。解析分阶段进行：第一阶段允许子类型转换和基本类型宽化，但不做装箱或可变参数；之后才考虑装箱、拆箱结合允许的转换；最后考虑可变参数调用。进入同一阶段的多个候选还要比较谁更具体，无法确定唯一结果就编译失败。基本类型宽化与包装类继承不是同一条转换链，例如 int 可宽化为 long，也可装箱为 Integer，但不能在一次方法调用转换中先装箱再把 Integer 宽化成 Long。null 可匹配多个无关引用重载，常导致歧义。

**代码 / 场景：**

若同时有 `pick(long x)`、`pick(Integer x)`、`pick(int... x)`，调用 `pick(1)` 会选择 long，因为基本类型宽化在无需装箱阶段就适用；若只有后两者则选 Integer，最后才轮到可变参数。若存在 `pick(String)` 与 `pick(Integer)`，调用 `pick(null)` 无法判断谁更具体，会编译失败。

**递进追问：**

1. **运行时对象是子类时为何不选择子类参数的重载？**

   重载是静态绑定，候选由表达式的编译期类型决定；运行时类型参与的是已选签名下实例方法的重写分派。

2. **新增一个重载为什么可能破坏旧源码编译？**

   新候选可能比原方法更具体，也可能与现有候选对某些 null、lambda 或方法引用形成歧义，导致重新编译时绑定改变或失败。

**易错点：**

- 用“宽化永远优先装箱”替代完整阶段规则，忽略具体候选与适用性条件。
- 认为返回值类型可以单独区分重载，实际方法签名解析不能只靠返回类型。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 5：转换与上下文](https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-05

## Q10：Java 为什么不支持类的多继承，却允许实现多个接口？

**短回答：**

类的多继承会让状态布局、构造顺序和同名实现的选择变复杂；Java 让类只继承一个直接父类，同时允许实现多个接口来组合能力契约。接口默认方法发生冲突时，编译器要求按明确规则消解。

**原理：**

继承不仅复用方法，还继承可见状态、初始化过程与可重写行为。若一个类同时继承两个带状态父类，菱形结构中同一祖先状态该保留几份、先调用哪个构造器、同名方法选谁都会增加模型复杂度。接口主要描述类型能力，可多实现；Java 8 之后接口虽可提供 default 方法，但不拥有普通实例字段。冲突规则是：类方法优先于接口默认方法，更具体的子接口优先；两个无继承关系接口提供同签名默认实现时，实现类必须显式重写，并可用 `InterfaceName.super.method()` 选择。工程上也不应把“允许多接口”理解成鼓励巨型接口，仍需按职责拆分。

**代码 / 场景：**

一个 `CachedUserRepository` 可以继承单一抽象基类获得模板流程，同时实现 `UserRepository`、`HealthChecked` 和 `Closeable` 等小接口。若 `A` 与 `B` 都定义 `default String name()`，实现类必须自己决定组合规则。业务能力复用优先考虑组合对象，而不是继续加深继承树。

**递进追问：**

1. **接口能有状态吗？**

   接口字段隐式为 `public static final`，属于类型常量而非每个实例的可变状态；实例状态仍由实现类或组合对象持有。

2. **两个接口声明相同抽象方法会冲突吗？**

   若方法签名与返回类型兼容，它们可归并为同一个实现契约；真正需要显式消解的常见情况是互不相关接口提供冲突的默认实现。

**易错点：**

- 把接口 default 方法等同于带实例状态的第二父类。
- 为复用几行代码建立脆弱继承层级，忽略组合与委托更容易演进。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)

校验日期：2026-08-05

# 面向对象、String 与 Object 契约

## Q11：封装、继承与多态应如何协作，而不是只背三个定义？

**短回答：**

封装维护对象不变量，继承表达可替换的“是一个”关系，多态让调用方依赖稳定抽象；三者服务于降低变化传播范围。

**原理：**

封装不是简单把字段设为 private，而是把状态变化集中到能检查前置条件并维护不变量的方法中。继承同时复用实现并建立子类型关系，只有子类在父类所有有效使用场景中都可替换父类时才合理，否则组合通常更安全。多态包含实例方法的动态分派：调用点先按静态类型确定合法签名，运行时再按接收者实际类型选择重写实现。字段、静态方法和 private 方法不参与同样的动态分派。良好的抽象应隐藏容易变化的实现细节，并让失败条件、生命周期和并发约束进入契约，而不是只提供一组 getter/setter。

**代码 / 场景：**

支付模块可定义 `PaymentMethod.pay(Money)`，银行卡和余额实现各自校验；订单服务只依赖接口。若为了复用日志让 `OrderService extends Logger`，并不存在“订单服务是日志器”的替换关系，应改为组合 Logger。账户余额应通过 `debit` 校验后修改，而不是暴露 `setBalance` 破坏非负不变量。

**递进追问：**

1. **组合为什么通常比实现继承更稳健？**

   组合只依赖被组合对象的公开契约，不会继承受保护状态和可重写钩子的隐式耦合，也能在运行时更换策略。

2. **多态是否只存在于接口调用？**

   不是。普通类继承中的实例方法重写同样进行动态分派；接口只是更明确地把抽象契约与具体实现分离。

**易错点：**

- 把封装等同于自动生成 getter/setter，实际上仍把全部状态修改权交给外部。
- 为了少写几行代码滥用继承，建立不满足可替换原则的脆弱层次。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)

校验日期：2026-08-05

## Q12：方法重写与方法隐藏在绑定时机上有什么根本区别？

**短回答：**

实例方法重写根据运行时接收者动态分派；静态方法只能被隐藏，字段也按编译期类型解析，因此同名并不代表同一种多态。

**原理：**

子类实例方法在签名、返回类型协变、访问权限和受检异常约束满足时可以重写父类方法，调用点最终执行接收者实际类中最具体的实现。`@Override` 能让编译器验证开发者意图。static 方法属于声明它的类，子类同签名 static 方法只是隐藏，具体选择由限定表达式或引用的编译期类型决定；实例字段同样不存在重写。private 方法对子类不可继承，子类声明同名方法是全新成员。构造器也不被继承。调用 `super.m()` 可显式绕过动态选择，进入直接父类实现，但不能任意跨越层次。

**代码 / 场景：**

若 `Parent p = new Child()`，两类都定义实例 `name()`，则 `p.name()` 调 Child；若两类定义 static `kind()`，`p.kind()` 按 Parent 解析且不建议经实例调用。两类都有字段 label 时，`p.label` 也读 Parent 字段。给预期重写的方法加 `@Override` 可发现参数拼错造成的意外重载。

**递进追问：**

1. **重写方法为什么不能缩小访问权限？**

   调用方按父类型契约本来有权调用该方法，子类若缩小权限会破坏可替换性，因此只能保持或扩大可见性。

2. **返回类型协变是什么意思？**

   子类重写方法可返回父方法返回类型的子类型，让调用者仍满足原契约，同时获得更具体的结果类型。

**易错点：**

- 把 static 同名方法称为运行时多态，忽略它由编译期声明类型决定。
- 省略 Override 注解后意外改变参数列表，把本想重写的方法变成新重载。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-05

## Q13：接口与抽象类该怎样按状态、契约和演进能力选择？

**短回答：**

接口适合描述跨层次能力与公共契约，抽象类适合共享受控状态和构造逻辑；是否能写默认方法不是选型的唯一标准。

**原理：**

类只能直接继承一个类，却可实现多个接口，因此接口更适合把角色能力正交组合。接口字段隐含 public static final，不能保存每个实例的可变状态；可以声明抽象、default、static 和 private 辅助方法，但 default 方法主要用于兼容性演进和共享少量行为。抽象类可拥有构造器、实例字段、不同访问级别方法以及受保护的实现骨架，适合强关联类型共同维护状态。接口默认方法冲突时，类方法优先于接口默认方法，更具体的子接口优先；仍歧义则实现类必须显式重写并选择。选择时应先问调用方需要什么稳定契约，再看实现是否真有共同状态。

**代码 / 场景：**

缓存组件可暴露 `Cache<K,V>` 接口，让本地和远程实现并存；若多个文件解析器都要维护不可绕过的字符集、资源关闭状态和模板流程，可继承 `AbstractParser`。两个接口都提供同签名 default 方法时，实现类可写 `A.super.reset()` 明确选择，避免隐式歧义。

**递进追问：**

1. **接口新增 default 方法一定二进制兼容吗？**

   通常能避免旧实现立刻缺少方法，但可能与实现类现有方法或另一个接口默认方法冲突，仍需评估源兼容和行为变化。

2. **抽象类能否完全替代接口？**

   不能。单继承限制会占用类型层次，且抽象类往往携带实现和状态耦合，不适合表达可由无关类共同具备的能力。

**易错点：**

- 仅因接口支持 default 方法就把大量状态相关模板逻辑塞进接口。
- 只按“能否多继承”背答案，忽略构造、不变量和版本演进等实际约束。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q14：对象初始化顺序为何会让构造器调用可重写方法变得危险？

**短回答：**

对象先完成存储默认初始化，再沿父类到子类执行实例初始化和构造器；父构造阶段动态调用可能进入尚未初始化完的子类方法。

**原理：**

创建对象时先为全部实例字段赋语言默认值，然后执行构造链。进入子类构造器后，显式或隐式 `super(...)` 必须先执行；父类实例字段初始化器、实例初始化块和构造器主体完成后，才轮到子类对应步骤，各类内部大体按源码顺序执行。static 初始化属于类初始化，只在类首次主动使用前按规范触发，并先初始化父类。危险点是实例方法即使在父类构造器中调用也会动态分派到子类重写，而此时子类字段仍可能是 0 或 null，子类不变量尚未建立。构造阶段应使用 private/final 辅助方法或只处理本层状态。

**代码 / 场景：**

若父构造器调用 `render()`，Child 重写的 render 读取 `config.length()`，而 config 的字段初始化要等父构造结束后才执行，就会空指针。更稳妥的做法是构造器只保存并校验参数，完整对象创建后由工厂调用初始化流程，或让构造期方法不可重写。

**递进追问：**

1. **字段初始化器与实例初始化块谁先执行？**

   在同一个类中按它们出现在源码中的顺序执行，并且都发生在父类构造完成之后、本类构造器主体之前。

2. **静态字段初始化失败后再次使用类会怎样？**

   初始化线程先收到 ExceptionInInitializerError 等错误，类会被标记为初始化失败，后续主动使用通常得到 NoClassDefFoundError。

**易错点：**

- 在构造器中调用可重写方法，让子类代码观察到仅完成一半的对象状态。
- 把字段声明处初始化误认为发生在父类构造之前，错误推断子类字段已就绪。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q15：public、protected、包访问与 private 的可见边界如何精确判断？

**短回答：**

访问控制同时受成员声明、包关系、继承关系和访问表达式静态类型影响；protected 在跨包子类中的规则尤其容易误判。

**原理：**

public 对可读该模块导出包的代码开放，private 只在声明它的顶层类或其嵌套成员组成的 nest 内按语言规则访问；未写修饰符的包访问仅对同包代码可见。protected 包含两部分：同包代码可像包访问一样使用；跨包时只有子类代码可通过继承关系访问，并且对实例成员，访问所经引用必须是当前子类类型或其子类型，不能拿任意父类实例读取 protected 成员。顶层类只能是 public 或包访问。模块系统还会在 public 之外增加包是否 exports、反射是否 opens 的边界。

**代码 / 场景：**

包 a 的 Parent 有 protected `id`，包 b 的 Child 继承 Parent。Child 内可写 `this.id` 或通过 Child 引用访问，却不能写 `new Parent().id`。如果只是希望外部读取标识，应提供稳定 public 方法，而不是扩大字段权限；跨模块还需在 module-info.java 中导出相应包。

**递进追问：**

1. **子类对象为什么不代表子类代码一定能访问所有 private 成员？**

   访问权限由成员声明位置和当前代码位置决定，private 不因对象运行时类型而向子类开放，应通过父类公开或受保护行为访问。

2. **public 类放在未导出的模块包中能被外部模块使用吗？**

   通常不能。成员和类的 public 只解决语言级可见性，命名模块还要求所在包被 exports 给调用方模块。

**易错点：**

- 把 protected 简化成“所有子类都能通过任意父类对象访问”。
- 直接把字段设为 public 解决编译错误，破坏封装且忽略模块导出边界。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：Java 21 模块系统 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/module/package-summary.html)

校验日期：2026-08-05

## Q16：`equals` 与 `hashCode` 契约为什么必须成对设计？

**短回答：**

逻辑相等必须满足等价关系，并保证相等对象具有相同哈希值；否则基于哈希的集合会出现查找失败、重复元素等反直觉行为。

**原理：**

Object.equals 默认是引用身份相等，值对象通常按参与身份的字段重写，并满足自反、对称、传递、一致以及对 null 返回 false。hashCode 要求一次执行中对象参与相等判断的状态不变时结果稳定，且 equals 为 true 的两个对象必须返回相同哈希；反向并不要求，不同对象允许碰撞。哈希集合先用 hash 定位区域，再在候选中调用 equals，因此只重写其中一个会破坏查找。可变对象若在加入 HashSet 或作为 HashMap 键后修改参与哈希的字段，条目物理位置不随之搬迁，之后即使拿同一引用也可能按新哈希找不到。

![Java 引用相等、equals 语义相等与 hashCode 散列契约关系图](/content/diagrams/java-foundations/object-contract-v1.svg "先区分引用身份与业务相等，再确保相等对象产生相同散列值，集合才能稳定定位元素。")

**代码 / 场景：**

用户值对象若以 tenantId 和 userId 定义身份，应让 equals 与 hashCode 使用同一组字段。`Set<UserKey>` 加入 key 后再修改 userId，会让 contains/remove 失败；更好的做法是让键不可变。数组字段不能直接依赖数组的 Object.equals，应按契约选择 Arrays.equals 或 deepEquals。

**递进追问：**

1. **为什么不同对象拥有相同 hashCode 并不违反契约？**

   哈希值空间有限而对象可能无限，碰撞不可避免；集合在哈希相同后还会调用 equals 区分真正相等与碰撞对象。

2. **继承层次中扩展 equals 为何容易破坏对称性？**

   父类可能接受任意父类型比较，而子类又加入新字段；父看子为相等、子看父为不等，就会破坏对称或传递，值类型常优先组合。

**易错点：**

- 只重写 equals 不重写 hashCode，让逻辑相等对象落入不同哈希区域。
- 把可变业务字段放入哈希键，并在入表后继续修改这些字段。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：Java 21 Set API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html)

校验日期：2026-08-05

## Q17：浅拷贝、深拷贝与 `clone` 为什么不能只看对象是否换了地址？

**短回答：**

浅拷贝只复制当前对象字段，内部引用仍共享；深拷贝要按领域边界复制可变对象图，Object.clone 本身不会自动完成这一语义。

**原理：**

Object.clone 对可克隆类执行字段级复制：基本字段复制值，引用字段复制引用，所以结果与原对象仍指向同一内部集合或子对象。Cloneable 只是标记接口，没有声明 clone 方法；未实现它却调用 Object.clone 会抛 CloneNotSupportedException，且构造器通常不会按普通创建路径执行。这使 clone 在继承、final 字段和不变量维护上较难设计。深拷贝不是“递归复制一切”的通用动作，应明确哪些值对象可共享、哪些可变实体必须复制，以及循环引用和外部资源如何处理。实践中更常使用复制构造器、静态工厂或显式映射。

**代码 / 场景：**

Order 含 `List<OrderLine>` 时，`new ArrayList<>(old.lines)` 只复制列表结构，OrderLine 若可变仍被共享。可写 `Order.copyOf`，逐个调用 `line.copy()`，同时共享不可变的 Currency。数据库连接、线程和文件句柄不能靠字段复制获得独立资源，应禁止复制或重新建立资源。

**递进追问：**

1. **序列化再反序列化是否是可靠的通用深拷贝？**

   通常不是。它要求整张对象图可序列化，成本高，还可能绕开构造不变量、丢失瞬态状态并扩大不可信数据反序列化风险。

2. **不可变子对象需要深拷贝吗？**

   通常可以安全共享，因为外部无法观察到其状态变化；深拷贝应围绕可变性和领域所有权，而不是机械复制每个节点。

**易错点：**

- 认为 clone 会自动递归复制内部对象，修改副本后意外污染原对象。
- 用序列化充当所有对象的复制工具，忽略性能、不变量和安全边界。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：Java 对象序列化规范](https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/)

校验日期：2026-08-05

## Q18：怎样设计真正可用的不可变类，而不只是把字段标成 final？

**短回答：**

不可变对象在构造完成后对外不再改变可观察状态，需要封闭修改入口、保护可变成员，并避免构造期间逸出。

**原理：**

常见做法是类本身不可被不受控继承，字段 private final，通过构造器一次建立并校验不变量，不提供修改内部状态的方法。若参数是可变集合、数组或日期对象，构造时要防御性复制，访问时返回不可变视图或再次复制；仅把引用设为 final 不能阻止外部修改同一对象。构造器中不应发布 this，例如注册监听器或启动线程，否则其他线程可能看到未完成状态。不可变类可以缓存派生值，但缓存字段的可见性与线程安全仍需设计。对深层对象图，应明确元素本身是否不可变，`List.copyOf` 只保证列表结构不可变，不会复制或冻结元素。

**代码 / 场景：**

Money 可用 final amount、currency，在构造时校验非负并把 BigDecimal 规范到约定 scale；`add` 返回新 Money。Schedule 接收 `List<Slot>` 时应先确认 Slot 不可变，再保存 `List.copyOf(slots)`。若 getter 直接返回内部 Date 或 byte[]，调用方仍能修改内部状态，应返回副本。

**递进追问：**

1. **不可变对象为什么通常更适合并发共享？**

   构造完成并安全发布后状态不再变化，读取者无需协调后续写入，也不会发生迭代过程中内容被另一线程修改的问题。

2. **返回 Collections.unmodifiableList 就一定不可变吗？**

   不一定。它只是阻止经该视图修改结构；若原始列表仍被其他引用修改，视图会随之变化，元素自身也可能仍可变。

**易错点：**

- 字段虽是 final，却直接保存调用方传入的可变集合或数组。
- 返回不可修改视图后宣称深度不可变，忽略后门引用与可变元素。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q19：`String`、`StringBuilder` 与 `StringBuffer` 有什么区别，拼接时怎样选择？

**短回答：**

`String` 不可变，适合值语义、共享和作为键；`StringBuilder` 是可变字符序列，单线程大量拼接通常优先；`StringBuffer` 的主要方法带同步，适合极少数必须共享同一缓冲区的场景，但并不保证一串复合操作天然原子。

**原理：**

每次对 String 做运行期拼接都会产生新的结果值，编译器可把同一表达式中的简单 `+` 优化为拼接配方，但循环内反复扩展仍可能形成多次分配和复制。StringBuilder 内部维护可增长缓冲区，`append` 后最后一次 `toString`，能把意图和生命周期表达得更清楚。StringBuffer 提供同步方法，却只保护单次方法调用；“检查长度后再追加”仍需外部同步。不可变 String 可以安全共享，但其中的敏感内容无法主动擦除；密码等场景可考虑受控的字符数组。面试不要只回答“线程安全不同”，还要说明可变性、分配成本和共享边界。

**代码 / 场景：**

拼接 SQL 展示文本或生成报表行时，可在方法内部创建 `StringBuilder` 并预估容量；几项固定字段拼接直接使用 `+` 可读性更好，交给编译器处理。多个线程各自构建结果时应使用各自的 builder，而不是因为并发就共享一个 StringBuffer；最后再安全合并结果。

**递进追问：**

1. **`StringBuilder` 一定比 `+` 快吗？**

   不一定。常量表达式和单个短表达式常被编译器优化；真正需要关注的是循环、未知次数拼接和热点路径，应以生成字节码及基准为依据。

2. **`StringBuffer` 能保证“判断后追加”安全吗？**

   不能保证整个复合操作。它只同步自己的单次方法，跨多次调用的不变量仍需同一外部锁或改成线程封闭设计。

**易错点：**

- 见到字符串拼接就机械改成 StringBuilder，牺牲简单表达式可读性。
- 在线程池任务间共享同一可变缓冲区，依赖单方法同步维持跨调用业务不变量。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html)

校验日期：2026-08-05

## Q20：组合优于继承何时成立，如何遵守可替换性？

**短回答：**

当关系只是能力复用、策略可替换或生命周期独立时组合通常更稳；只有真正的子类型关系才适合继承，并须保持父类型全部可观察契约。

**原理：**

继承同时获得实现与子类型身份，子类会耦合父类受保护状态、构造顺序和可重写钩子，父类内部实现变化也可能破坏子类，这就是脆弱基类风险。组合只保存协作者引用并通过公开契约委托，能够独立替换策略、控制暴露面和分别测试，因此仅为代码复用时通常优先。继承成立的关键是可替换性：接受父类型的代码换成子类后仍应正确，子类不能加强前置条件、削弱后置保证、破坏不变量或引入父契约没有的可观察失败。Java 对访问权限、返回类型和受检异常只提供部分编译检查，业务语义仍需设计者用契约测试保证。

**代码 / 场景：**

正方形强行继承带独立 setWidth、setHeight 的可变矩形，会破坏调用方“只改宽不改高”的预期；应改成共享 Shape 接口或不可变值模型。订单服务需要折扣能力时，持有 `DiscountPolicy` 并委托计算，比继承某个 DiscountBase 更容易按租户替换，也不会暴露基类内部状态。

**递进追问：**

1. **模板方法模式是否说明继承仍然有价值？**

   是。若算法骨架稳定、扩展点有清晰不变量且类型确实同属一个层次，受控继承能表达设计；应限制可重写面并记录调用顺序。

2. **组合是否意味着每个方法都机械转发？**

   不应如此。组合对象应提供符合自身领域的接口，只在内部协调协作者；若完整暴露被组合对象，仍会泄漏实现并形成强耦合。

**易错点：**

- 仅为复用几行实现建立继承层次，把父类内部变化扩散给所有子类。
- 只满足语法上的 extends，却让子类拒绝父类允许的输入或改变核心语义。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（上）](https://javaguide.cn/java/basis/java-basic-questions-01.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)

校验日期：2026-08-05

# 异常、泛型、反射与注解

## Q21：String 为什么不可变，这一设计带来了哪些能力与代价？

**短回答：**

String 创建后字符序列不可改变，使其可安全共享、稳定哈希并适合常量池；所谓修改都会产生新字符串或返回原实例。

**原理：**

String 类是 final，公开 API 不提供修改内部字符序列的操作。不可变让同一字符串可在常量池、类元数据、集合键和多线程间共享，不必担心一方修改内容破坏另一方的安全检查或 hashCode。String 可以缓存哈希值，因为内容一旦建立就不再变化。不可变不等于每个操作必然创建对象：如果结果与原内容相同，某些方法可以返回 this；编译器也能折叠常量表达式。代价是循环拼接、反复替换等变换可能产生中间对象，应使用适合的构建或流式处理方式。敏感秘密若用 String 保存也无法主动擦除底层内容，可考虑受控 char[] 并及时覆盖。

**代码 / 场景：**

例如 `String s = "java"; s.toUpperCase();` 不会改变 s，必须接收返回值。字符串作为 HashMap 键后内容不会变化，因此哈希定位稳定。读取密码时若业务需要尽快清理内存，可使用 char[]，认证完成后 `Arrays.fill(password, (char) 0)`，而不是长期保存不可变 String。

**递进追问：**

1. **String 的 final 是否单独就足以保证不可变？**

   不足。final 只阻止子类破坏契约，还需要内部状态不向外暴露、构造时不共享可变存储且所有操作都不原地修改内容。

2. **不可变 String 是否天然让任意字符串操作线程安全？**

   读取和派生新值无需保护原字符串，但共享变量如何重新赋值、多个结果如何组合仍可能需要同步或其他并发控制。

**易错点：**

- 调用 replace、concat 等方法却不接收返回值，误以为原字符串已被修改。
- 把不可变等同于零分配，在高频循环中无条件使用连续加号拼接动态内容。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q22：字符串常量池、`new String` 与 `intern` 到底会产生什么引用关系？

**短回答：**

字面量和常量表达式会复用规范化字符串，new String 明确创建普通对象；intern 返回与相同内容池条目关联的规范引用。

**原理：**

每个字符串字面量以及由常量表达式得到的字符串都会被 intern，相同内容的此类表达式引用同一规范对象。`new String("x")` 明确创建一个内容相同但身份不同的 String 对象，字面量池对象是否此前存在不改变 new 的身份语义。`s.intern()` 查询按 equals 相同的池条目：存在则返回已有规范引用，否则将该字符串的规范表示加入池并返回对应引用。业务相等应始终用 equals，不能靠 `==` 猜测编译器常量折叠或运行时拼接。主动 intern 可减少大量重复长生命周期字符串，却也会增加池查找、全局池管理与驻留分析成本，必须以真实基数和存活数据验证。

**代码 / 场景：**

例如 `String a = "ja" + "va"; String b = "java";` 因常量折叠，a 与 b 可为同一规范引用；但 `String part = "ja"; String c = part + "va";` 是运行时拼接，`c == b` 不应为 true 的业务假设。`new String("java").intern()` 返回与 b 内容对应的规范引用。

**递进追问：**

1. **为什么字符串比较永远优先 equals？**

   equals 表达字符序列相等，符合业务语义；引用身份会受字面量、构造方式、常量折叠和 intern 影响，不稳定也不必要。

2. **是否应该给所有请求参数调用 intern？**

   不应该。高基数字符串会增加全局池压力和查找开销，只有大量重复且生命周期收益经过测量时才值得考虑。

**易错点：**

- 看到部分字面量 `==` 为 true，就把引用相等用于字符串业务判断。
- 无指标地对外部高基数字符串全部 intern，增加内存驻留和全局竞争。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-05

## Q23：字符串拼接在编译期和运行期分别可能怎样实现？

**短回答：**

编译期常量拼接可直接折叠，运行期拼接由编译器选择等价实现；性能判断应关注循环结构和中间结果，而非死记某个字节码模板。

**原理：**

只由常量表达式组成的字符串拼接可在编译期合并并进入常量池。包含变量的 `+` 由 Java 语言定义求值和字符串转换语义，但具体字节码实现不是稳定源码契约：现代 JDK 可使用 invokedynamic 和 StringConcatFactory 选择拼接策略，旧版本常见 StringBuilder 展开。单条表达式通常能被编译器整体优化；循环中 `result = result + item` 每轮都需要基于旧的不可变结果构造新字符串，累计复制可能显著增长。明确次数时可使用 StringBuilder，集合元素连接可用 String.join 或 Collectors.joining，并先确认 null 表示、分隔符和容量。

**代码 / 场景：**

日志标签写 `"order-" + orderId + "-" + status` 通常无需手工拆成构建器；但循环拼接一万行 CSV 应创建一次 StringBuilder，逐行 append，最后 toString。若只是连接名称列表，`String.join(",", names)` 更能直接表达分隔语义，也避免尾部分隔符处理错误。

**递进追问：**

1. **为什么不能断言加号一定编译成 StringBuilder？**

   语言规范约束结果与求值顺序，不固定编译器的字节码策略；不同 JDK 版本可以采用 invokedynamic 等更合适的实现。

2. **预估 StringBuilder 容量有什么作用？**

   合理初始容量可减少内部存储扩容和复制，但错误的超大预估也会浪费内存，应根据常见输出规模而非极端上限设置。

**易错点：**

- 把旧版本反编译结果当成所有 Java 版本必须遵循的语言规范。
- 在循环中反复把不可变结果重新赋值拼接，造成大量累计复制与临时对象。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)
- [技术校准：Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html)

校验日期：2026-08-05

## Q24：受检异常与非受检异常应如何映射到可恢复性和 API 契约？

**短回答：**

受检异常强制调用方处理或声明，非受检异常不做该编译要求；选型应表达调用方能否合理恢复，而不是简单按错误严重程度。

**原理：**

Throwable 下 Error 通常表示运行环境或系统级严重问题，应用一般不应泛化捕获后继续；Exception 中除 RuntimeException 及其子类外属于受检异常，可能抛出的受检异常必须被 catch 或出现在 throws 声明中。非受检异常常用于参数违反前置条件、对象状态非法或编程错误，但也可以表达某些无法在当前层恢复的运行故障。API 设计应给异常提供稳定语义和必要上下文，保持 cause 链，并在有能力增加处理策略的边界做转换。不能恢复的底层异常逐层机械声明会污染接口，而把所有异常包成 RuntimeException 又会丢失调用方可采取的重试、降级或纠正动作。

**代码 / 场景：**

解析用户上传文件格式错误时，可抛带行号的受检 ParseException，让调用方提示修正；向内部方法传负页数属于契约违规，可抛 IllegalArgumentException。仓储层捕获 SQLException 后可转换为领域 DataAccessException，但应保留 cause，并区分唯一键冲突与连接失败。

**递进追问：**

1. **捕获 Exception 统一返回失败有什么问题？**

   它会混淆可预期业务失败、编程错误和线程中断等不同语义，常导致错误重试、丢失诊断信息或系统带病继续运行。

2. **重写方法能否声明更宽的受检异常？**

   不能突破父方法契约声明更宽的新受检异常，否则按父类型调用的代码将无法预知；可声明更窄子类型或非受检异常。

**易错点：**

- 把受检异常等同于严重故障、非受检异常等同于轻微错误。
- 转换异常时只保留消息不保留 cause，切断原始堆栈和诊断链路。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 11：异常](https://docs.oracle.com/javase/specs/jls/se21/html/jls-11.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q25：try-with-resources 如何处理关闭顺序与被抑制异常？

**短回答：**

try-with-resources 会按声明逆序自动关闭资源；业务异常优先传播，关闭阶段的异常通常作为 suppressed 附着而不是覆盖主因。

**原理：**

资源必须实现 AutoCloseable，并在进入 try 前或资源声明处成功初始化。多个资源按从左到右创建、从右到左关闭，适合表达包装流依赖。若 try 主体抛异常 A，close 又抛异常 B，A 作为主要异常传播，B 通过 A.getSuppressed 保存；传统 finally 直接 close 则可能让 B 覆盖 A。若主体正常而 close 失败，关闭异常本身传播。资源初始化到中途失败时，先前已成功创建的资源仍会被关闭。Java 9 起可在满足 final 或有效 final 条件时直接引用既有变量。close 的幂等性并非 AutoCloseable 通用保证，不能随意重复关闭。

**代码 / 场景：**

例如 `try (InputStream in = open(); BufferedInputStream buf = new BufferedInputStream(in)) { return parse(buf); }` 会先关 buf 再关 in。若 parse 抛格式异常且 buf.close 也失败，日志应同时输出主异常及 getSuppressed 内容，不能只打印 message，否则会遗漏资源故障线索。

**递进追问：**

1. **AutoCloseable.close 是否必须幂等？**

   接口本身不作统一幂等保证，具体资源文档可能另有约定；调用方应让所有权清晰，避免多处重复关闭同一资源。

2. **资源构造到第二个时失败，第一个会泄漏吗？**

   不会。语法展开保证已成功初始化并纳入管理的前序资源被关闭，尚未成功创建的资源则不存在可关闭实例。

**易错点：**

- 只记录传播异常而不查看 suppressed，漏掉关闭阶段的重要故障。
- 在 try-with-resources 外再次关闭同一资源，假设所有 close 都安全幂等。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 AutoCloseable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/AutoCloseable.html)
- [技术校准：JLS 14：语句与控制流](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)
- [技术校准：JLS 11：异常](https://docs.oracle.com/javase/specs/jls/se21/html/jls-11.html)

校验日期：2026-08-05

## Q26：泛型擦除后，编译器如何维持类型安全并生成桥接方法？

**短回答：**

Java 泛型主要在编译期检查，类型实参通常在字节码中擦除为边界；必要的强制转换和桥接方法由编译器补充以维持多态。

**原理：**

参数化类型在编译时阻止把错误元素写入集合，并在读取处插入所需转换。擦除会把类型变量替换为其最左边界，若无显式边界则通常为 Object，同时保留类文件中的泛型签名元数据供工具和反射读取，但运行时对象并不是每种实参各一份新类。子类用具体类型重写泛型父类方法时，擦除后的签名可能不一致，编译器会生成 synthetic bridge 方法，把擦除签名转发到具体方法，从而保持 JVM 层面的重写关系。擦除也解释了为何不能重载仅泛型实参不同的方法，且不能直接 `new T()` 或 `new T[]`。

**代码 / 场景：**

若 `class Box<T> { T get(); }`，擦除后核心返回类型近似 Object，使用 `Box<String>` 的调用点由编译器插入 String 转换。`class Name implements Comparable<Name>` 会有比较 Name 的方法，并可能生成接收 Object 的桥接方法转发；反射列方法时要留意 `isBridge()`。

**递进追问：**

1. **既然擦除，反射为何还能看到 List<String> 字段的 String？**

   类文件可保存 Signature 等泛型声明元数据，反射能读取声明信息；但普通 List 实例运行时仍不携带可可靠检查每个元素实参的具体化类型。

2. **为什么不能重载 `m(List<String>)` 与 `m(List<Integer>)`？**

   两者擦除后的 JVM 方法描述符相同，无法在同一个类文件中形成两个可区分的方法，因此编译器直接拒绝。

**易错点：**

- 把类型擦除误解为泛型完全不存在，忽略类文件签名和编译器插入的检查转换。
- 把反射读到的声明实参当成任意运行时对象都保存了完整实际类型。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)
- [技术校准：JLS 18：类型推断](https://docs.oracle.com/javase/specs/jls/se21/html/jls-18.html)
- [技术校准：JVMS 4：Class 文件格式](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html)

校验日期：2026-08-05

## Q27：通配符中的 PECS 原则怎样指导集合 API 的读写边界？

**短回答：**

生产 T 的参数使用 `? extends T`，消费 T 的参数使用 `? super T`；通配符描述的是调用方可见能力，而非集合自身可变性。

**原理：**

`List<? extends Number>` 表示某一种未知的 Number 子类型列表，可以安全把元素读成 Number，却不能写入 Integer 或 Double，因为实际列表可能是另一具体子类型。`List<? super Integer>` 表示元素类型是 Integer 的某个父类型，可以安全加入 Integer，读取时静态上只能保证 Object。PECS 是 Producer Extends、Consumer Super 的助记法，适合方法参数提高可复用性；一个参数若既读又写同一精确类型，通常直接用 `List<T>`。通配符捕获允许辅助泛型方法把未知类型临时命名，解决例如交换 `List<?>` 元素的问题。返回类型滥用通配符会把复杂性推给调用方，应优先返回清晰的抽象类型。

**代码 / 场景：**

复制 API 可写 `static <T> void copy(List<? extends T> src, List<? super T> dst)`，允许从 List<Integer> 复制到 List<Number>。求和方法只读可接受 `List<? extends Number>`。若要交换任意列表两个位置，可让公开 `swap(List<?> list)` 调用私有 `<T> swapCaptured(List<T> list)` 完成捕获。

**递进追问：**

1. **`? extends T` 列表为什么仍能写入 null？**

   null 可转换为任意引用类型，不会违反未知实际元素类型；但它通常没有业务价值，且可能让后续读取产生空值风险。

2. **方法返回值是否也应该大量使用通配符？**

   通常应谨慎。返回通配符会限制调用方正常读写和组合；若没有隐藏型变的明确需求，返回 `List<T>` 等具体契约更友好。

**易错点：**

- 把 extends 列表简单称为“只读集合”，忽略结构仍可能由其他别名修改。
- API 所有泛型位置都套通配符，令类型推断和调用方代码无谓复杂。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：JLS 4：类型、值与变量](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html)
- [技术校准：JLS 18：类型推断](https://docs.oracle.com/javase/specs/jls/se21/html/jls-18.html)

校验日期：2026-08-05

## Q28：JDK 动态代理如何工作，它和基于子类的代理有什么边界？

**短回答：**

JDK 动态代理在运行时为一组接口生成代理类，把方法调用转交给 `InvocationHandler`；基于子类的代理通过继承目标类并重写可覆盖方法，因此不能代理 final 类或 final/private 方法。选择依据是类型边界和拦截需求，不是简单比较谁更快。

**原理：**

调用 `Proxy.newProxyInstance` 时要提供合适的类加载器、接口数组和 InvocationHandler。代理对象接到接口调用后进入 `invoke(proxy, method, args)`，处理器可在调用目标前后加入鉴权、事务、重试或观测逻辑。必须特别处理 `equals`、`hashCode`、`toString` 等 Object 方法，并避免在处理器里再次通过 proxy 调用同一方法造成递归。子类代理能覆盖没有接口的类，但构造器、可见性、final 限制和自调用都可能让拦截失效。框架代理还受到模块开放、桥接方法和默认接口方法等因素影响；业务代码应面向稳定接口，少依赖代理实现类身份。

**代码 / 场景：**

为 `PaymentService` 增加耗时统计时，可以让代理实现该接口，Handler 记录开始时间后反射调用真实对象，并在 `finally` 上报结果。若 Spring 中同一个对象的方法 A 直接调用自身方法 B，调用没有经过外部代理，B 上的事务或切面可能不生效；这不是注解失效，而是调用路径绕过代理。

**递进追问：**

1. **为什么 JDK 动态代理通常要求接口？**

   生成的代理类通过实现给定接口获得可调用的方法集合；没有接口的普通类不能仅靠 JDK Proxy 直接生成其子类。

2. **代理为何容易出现自调用失效？**

   拦截发生在经过代理对象的调用边界；目标对象内部用 `this` 调用另一个方法时没有重新进入代理。

**易错点：**

- 在 InvocationHandler 中调用 `method.invoke(proxy, args)`，导致无限递归。
- 把代理对象强转为目标实现类，忽略 JDK 代理只保证实现接口。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 Reflection API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html)
- [技术校准：Java 21 模块系统 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/module/package-summary.html)

校验日期：2026-08-05

## Q29：反射调用如何穿过类型检查，又会受到哪些访问与模块边界限制？

**短回答：**

反射把类、字段、构造器和方法变成运行时对象，可做动态发现与调用；代价是检查后移，并仍受访问控制和模块封装约束。

**原理：**

Class 可从实例、类字面量或受控类加载获得，再用 getMethod/getField 查询 public 且可继承成员，或用 getDeclaredMethod 等查询当前类声明成员。Method.invoke 会检查接收者、参数数量和可转换性，并把目标方法抛出的异常包装为 InvocationTargetException；调用方应解包 cause。`setAccessible(true)` 不能无条件突破 Java 9 之后的强模块封装，目标包通常还需向调用模块 open，且安全策略和运行环境可能继续限制。反射会削弱重构期检查、增加启动扫描和调用开销，框架常缓存元数据或转成 MethodHandle，但普通业务不应为“灵活”放弃显式接口。

**代码 / 场景：**

JSON 框架可在启动时扫描 DTO 构造器和访问器，校验一次后缓存 Method，而不是每条记录重复查找。插件系统应先用 ServiceLoader 或公开接口约束实现；若必须访问非公开成员，应在 module-info.java 精确 `opens com.example.dto to framework.module`，不要把整个模块无差别开放。

**递进追问：**

1. **getMethod 与 getDeclaredMethod 的主要区别是什么？**

   getMethod 查找可访问的 public 成员并考虑继承；getDeclaredMethod 只查当前类声明且可返回非 public 成员，但后续调用仍受访问检查。

2. **Method.invoke 抛 InvocationTargetException 时应记录哪一层？**

   包装异常说明反射调用边界，真正业务失败在 getCause 中；日志应保留两者关系，并按目标异常语义决定转换或传播。

**易错点：**

- 认为 setAccessible 可以在所有 JDK 21 模块配置中无条件突破私有边界。
- 在热点循环中重复扫描和查找反射成员，不缓存已验证的元数据。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 Reflection API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html)
- [技术校准：Java 21 模块系统 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/module/package-summary.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)

校验日期：2026-08-05

## Q30：注解的 Retention、Target 与处理阶段如何决定它能做什么？

**短回答：**

注解只是结构化元数据；Target 限制标注位置，Retention 决定保存阶段，真正行为来自编译期处理器、框架扫描或显式反射代码。

**原理：**

`@Target` 指定注解可用于类型、方法、字段、参数、TYPE_USE 等位置；`@Retention(SOURCE)` 只保留在源码，CLASS 写入类文件但运行时反射默认不可见，RUNTIME 才能被运行时反射读取。`@Inherited` 只影响类级注解沿父类被 getAnnotation 查询的行为，不会让方法注解、接口注解按同样方式普遍继承。重复注解通过 `@Repeatable` 和容器注解表达。注解本身不会拦截方法或校验参数：编译期 annotation processor 可生成源码或资源但不能直接改写既有源码语义；运行时框架则需扫描元数据并通过代理、反射或显式调用实现行为。

**代码 / 场景：**

定义运行时路由注解可写 `@Target(METHOD)` 与 `@Retention(RUNTIME)`，Web 框架启动时扫描并注册处理器。Lombok 风格代码生成发生在编译工具链，不是因为注解自己执行。若自定义 `@Audit` 只标在实现方法，而代理读取的是接口方法，就需明确扫描策略，否则注解存在却不生效。

**递进追问：**

1. **RetentionPolicy.CLASS 何时有价值？**

   字节码分析器、编译后工具或代理生成器可以读取类文件元数据，而运行时普通反射无需暴露它，适合构建期或装载期处理。

2. **@Inherited 为什么对接口实现类通常不起作用？**

   其规范只针对类声明注解沿超类链的查询，不把接口注解自动传播给实现类，也不处理成员方法和字段的继承。

**易错点：**

- 给注解加 RUNTIME 就认为业务逻辑会自动执行，实际没有任何处理器读取它。
- 依赖 Inherited 传播接口或方法注解，导致代理和实现类扫描结果不一致。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（中）](https://javaguide.cn/java/basis/java-basic-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 基础常见面试题（下）](https://javaguide.cn/java/basis/java-basic-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 Annotation API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/package-summary.html)
- [技术校准：Java 21 Reflection API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html)
- [技术校准：JLS 9：接口](https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html)

校验日期：2026-08-05

# 集合源码高频：List、HashMap 与并发容器

## Q31：List、Set、Queue 与 Map 分别承诺什么语义，选型时先看什么？

**短回答：**

先按业务不变量选择接口：List 表达有序序列，Set 表达不重复元素，Queue 表达待处理次序，Map 表达键到值的关联；性能与具体实现应放在语义之后判断。

**原理：**

Collection 是元素容器的根接口，List 进一步承诺按位置访问并允许重复，Set 约束元素不能按其相等性重复，Queue 用插入、检查和移除方法描述处理顺序；Map 不继承 Collection，它维护键值映射并分别提供 keySet、values 和 entrySet 视图。接口只给出契约，不自动保证线程安全、排序方式或复杂度。例如 Set 的“不重复”依赖实现采用的相等性规则，Queue 也不必都是先进先出。工程选型应依次确认是否需要重复、稳定顺序、按键定位、优先级、并发访问和空值，再用真实数据规模验证复杂度与内存成本。

**代码 / 场景：**

订单明细需要保留录入次序且同一商品可出现多行，可用 `List<OrderLine>`；已授权权限集合强调去重，可用 `Set<Permission>`；异步任务按优先级消费可用 `PriorityQueue<Job>`；用户编号查档案则用 `Map<Long, Profile>`。不要因为“查找快”就把每种数据都塞进 Map，否则会丢掉顺序或重复等业务语义。

**递进追问：**

1. **为什么不应该只凭大 O 复杂度选择集合？**

   复杂度通常描述平均或渐进成本，未覆盖元素语义、顺序保证、内存占用、缓存局部性、并发条件以及数据量很小时的常数成本。

2. **Map 的 values 视图是不是一个 Set？**

   不是，多个键可以映射到相等的值，因此 values 返回 Collection；keySet 才按键的唯一性表现为 Set 视图。

**易错点：**

- 把接口契约和某个常见实现的内部结构混为一谈。
- 为了理论查询速度牺牲业务需要的重复或顺序语义。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)
- [技术校准：Java 21 Collection API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collection.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)

校验日期：2026-08-05

## Q32：`ArrayList` 和 `LinkedList` 有什么区别，为什么多数场景优先 ArrayList？

**短回答：**

ArrayList 基于连续引用数组，随机访问快、内存和缓存局部性通常更好；LinkedList 是双向链表，头尾操作方便，但按下标访问必须遍历且每个节点有额外对象开销。只有已经定位节点或频繁操作两端时，链表的插删优势才成立。

**原理：**

ArrayList 的 `get` 根据索引直接访问底层数组，复杂度 O(1)；中间插入删除要移动后续引用，通常 O(n)，尾部追加在容量足够时为摊销 O(1)。LinkedList 的 `get` 会从较近的一端遍历到目标位置，复杂度 O(n)；插入删除节点本身是 O(1)，但通过索引定位节点仍是 O(n)。现代 CPU 对连续数组的预取和缓存命中较友好，而链表节点分散、需要额外保存前后指针并增加 GC 压力。因此不能只背“链表增删快”，必须把定位成本、数据规模和访问模式一起回答。两者都不是线程安全集合。

**代码 / 场景：**

订单明细经常按下标读取、遍历和在尾部追加，优先 `ArrayList` 并在已知规模时预设容量。任务队列若只在两端进出，使用 `ArrayDeque` 通常比 LinkedList 更直接；只有确实需要链表迭代器在当前位置插删且节点操作占主导时，再评估 LinkedList。最终用代表性数据做基准，不根据复杂度口诀替代测量。

**递进追问：**

1. **LinkedList 在中间插入一定是 O(1) 吗？**

   只有已经持有目标位置的迭代器或节点语境时，链接节点是 O(1)；若先通过索引查找位置，总成本仍是 O(n)。

2. **为什么 ArrayList 尾部追加称为摊销 O(1)？**

   大部分追加只写一个槽位；偶尔扩容需复制全部元素，把多次操作的总成本平均后为常数级。

**易错点：**

- 只背“查询用 ArrayList、增删用 LinkedList”，忽略定位和缓存成本。
- 把 LinkedList 当默认队列，未比较语义更清晰且通常更紧凑的 ArrayDeque。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 List API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q33：`ArrayList` 如何扩容，为什么它不是线程安全的？

**短回答：**

ArrayList 维护元素数组和逻辑大小，容量不足时创建更大的数组并复制旧元素；并发写入没有同步保护，可能出现覆盖、丢失更新、越界或读到不一致状态。已知规模时预设容量能减少扩容和复制。

**原理：**

调用 `add` 时先确保容量，再把元素写入 `size` 对应位置并递增 size。具体增长比例属于 JDK 实现细节，常见 OpenJDK 实现按约 1.5 倍增长，但业务代码不应依赖精确公式。扩容是 O(n) 复制，所以一次 append 不是永远 O(1)，只是摊销 O(1)。并发场景中两个线程可能读取同一个 size、写入同一槽位，结构修改与迭代也可能触发 fail-fast，但 ConcurrentModificationException 只是尽力检测错误，不是线程安全机制。可根据读写模式选择线程封闭、外部锁、不可变快照、`CopyOnWriteArrayList` 或其他并发结构。

**代码 / 场景：**

批量载入预计十万条记录时使用 `new ArrayList<>(100_000)`，避免从很小容量反复扩展。读多写少且快照一致性可接受的监听器列表可评估 CopyOnWriteArrayList；高频写入则不要用写时复制。若多个任务各自产生列表，优先让线程独占局部列表，结束后归并，而不是所有线程同时写一个 synchronizedList。

**递进追问：**

1. **`ensureCapacity` 会改变 size 吗？**

   不会，它只确保底层容量至少达到目标；逻辑元素数量仍由实际 add/remove 操作决定。

2. **`Collections.synchronizedList` 后迭代还要加锁吗？**

   通常需要按其文档在同一包装对象上显式同步整个迭代过程，否则单次方法同步无法保护复合遍历。

**易错点：**

- 把常见 1.5 倍增长说成 List 接口或所有 JDK 永恒不变的规范。
- 把 fail-fast 异常当作并发控制，认为没抛异常就没有数据竞争。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 List API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q34：`HashMap` 的底层结构是什么，链表什么时候会树化？

**短回答：**

JDK 8+ 常见 HashMap 由桶数组、链表和红黑树组成。哈希冲突先落在同一桶内；当单桶节点数达到树化阈值且表容量足够大时才转为红黑树，否则优先扩容，避免小表过早承担树结构成本。

**原理：**

HashMap 先对 key 的 hashCode 做扰动，再用数组长度掩码定位桶。桶为空可直接放入节点；发生冲突时比较哈希值，并按引用相同或 equals 相等判断是否已有键，否则沿链表或树查找。OpenJDK 常见实现中，链表节点达到 8 且数组容量至少 64 才树化；容量较小时先扩容，因为扩大桶数往往能自然分散冲突。树节点减少恶劣冲突下的查找退化，但节点更大、旋转和比较成本更高。阈值属于实现细节，面试可说明当前主流实现，同时强调 Map 契约不承诺内部结构。好 key 还应拥有稳定的 equals/hashCode。

**代码 / 场景：**

自定义 `UserKey` 作为键时，应使用不可变身份字段实现 equals/hashCode。若所有对象错误返回同一个 hash，数据会集中到单桶，性能明显下降；树化只能缓解，不能修复错误的键设计。不要在放入 Map 后修改参与 hashCode 的字段，否则同一个对象可能再也无法按新状态找到。

**递进追问：**

1. **为什么容量小于 64 时通常先扩容而不是树化？**

   小表的冲突更可能由桶数量不足造成，扩容可让节点重新分布；树节点的额外内存和维护成本此时不划算。

2. **红黑树能否把 HashMap 所有操作都保证为 O(log n)？**

   不能这样概括。只有树桶内的相关查找接近对数复杂度，扩容、哈希质量和其他桶仍影响整体行为。

**易错点：**

- 只背“数组+链表+红黑树”，说不清冲突、树化与扩容的决策顺序。
- 把具体阈值当成 Map 接口保证，或忽略可变 key 破坏定位。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q35：LinkedHashMap 的插入顺序与访问顺序有什么差别？

**短回答：**

LinkedHashMap 可按首次插入顺序迭代，也可配置为按最近访问顺序迭代；后者配合 removeEldestEntry 能实现简单的有界 LRU，但并不自动具备并发安全。

**原理：**

LinkedHashMap 在散列映射之外维护条目的双向顺序关系。默认 insertionOrder 中，替换已有键的值不会把条目移到末尾；构造时启用 accessOrder 后，get、getOrDefault 以及部分成功访问条目的更新方法会调整访问次序，最久未访问条目位于迭代前端。子类可覆写 removeEldestEntry，在插入新映射后根据 size 决定是否移除最老条目。访问顺序模式下，一次 get 会改变内部顺序，因此不能把“只有读取”误判为无结构变化；外部同步、容量权重、过期与加载合并仍需另外设计。

**代码 / 场景：**

本地保存最近 100 个模板可定义 `new LinkedHashMap<>(128, 0.75f, true)`，并让 `removeEldestEntry` 在 `size() > 100` 时返回 true。这个方案适合单线程或显式加锁的小缓存；若对象大小差异大、需要按时间过期或高并发统计，应该使用专门缓存组件，而不是继续给该 Map 叠加脆弱逻辑。

**递进追问：**

1. **在访问顺序模式调用 get，为什么迭代器可能受影响？**

   成功访问会调整条目在顺序链中的位置，属于影响迭代结构的操作，因此与并发迭代组合时不能按纯读取处理。

2. **removeEldestEntry 能否表达精确的 TTL？**

   它只在加入新映射后获得移除最老条目的机会，不能主动按时间驱逐，也不保证空闲期间及时清理过期项。

**易错点：**

- 把简单条目数上限当成具备 TTL 和权重控制的完整缓存。
- 访问顺序模式下无锁并发 get，忽略它会重排内部顺序。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q36：`HashMap` 的 `put` 与 `get` 流程怎样走，`equals` 在何时参与？

**短回答：**

`put` 先计算哈希和桶位置，再在桶内寻找同键：命中则替换值，未命中则新增并可能触发树化或扩容；`get` 走相同定位路径。hashCode 用来缩小候选范围，equals 用来确认业务上的同一个键。

**原理：**

定位过程可分三层：先处理 null 等特殊键语义，再计算扰动后的哈希并用 `(n - 1) & hash` 定位桶，最后在首节点、链表或红黑树中比较。两个键只有哈希相同才需要进一步 equals；哈希不同即使碰巧 equals 返回 true，也已经违反了“相等对象必须有相同 hashCode”的契约。put 命中旧键时返回旧值并保留键映射，新增节点后更新 size，超过阈值才扩容。get 返回 null 既可能是键不存在，也可能是该键显式映射到 null，应使用 containsKey 区分。平均 O(1) 依赖散列分布与负载控制，不是无条件承诺。

**代码 / 场景：**

实现缓存键时可用不可变 record，例如 `record QueryKey(long tenantId, String keyword) {}`，由稳定字段生成 equals/hashCode。读取 `map.get(key)` 得到 null 时，如果 null 是合法缓存值，要再检查 `containsKey` 或改用不允许 null 的约定。性能问题应观察键分布与扩容，而不是把 equals 写成只比较 hashCode。

**递进追问：**

1. **hashCode 相同是否代表两个 key 相等？**

   不代表，哈希碰撞允许存在；还必须由引用相同或 equals 返回 true 才视为同一个键。

2. **为什么 get 的平均复杂度是 O(1) 而不是永远 O(1)？**

   良好分布下候选桶很小；严重冲突、恶意哈希或扩容等情况会增加成本，树化也只是限制部分最坏退化。

**易错点：**

- 用 hashCode 是否相同直接替代 equals，碰撞时误判业务对象。
- 允许 null value 却只用 get(null 结果) 判断键是否存在。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)

校验日期：2026-08-05

## Q37：`HashMap` 为什么使用 2 的幂容量，负载因子和扩容如何配合？

**短回答：**

2 的幂容量让桶下标可用位掩码高效计算，并使扩容翻倍时节点只需留在原位置或移动旧容量的偏移量。负载因子控制空间与冲突的平衡，`size > capacity × loadFactor` 时通常触发扩容。

**原理：**

当容量 n 为 2 的幂时，`n - 1` 的低位全为 1，`hash & (n - 1)` 可均匀利用哈希低位。容量翻倍后只多检查 hash 中原容量对应的那一位：为 0 留在原桶，为 1 移到 `oldIndex + oldCapacity`，无需重新做除法。默认负载因子 0.75 是通用折中，不代表所有业务的最优值。初始容量会规范化到合适的 2 次幂；如果预计元素数量，应把负载因子算入容量规划，而不是直接把预计数量作为容量。扩容要分配新数组并迁移桶，是明显的延迟和内存峰值来源。

**代码 / 场景：**

预计写入 1000 个条目、使用默认负载因子时，初始容量至少应覆盖 `ceil(1000 / 0.75)` 再向上取合适的 2 次幂，从而减少构建阶段扩容。长期缓存不能只把容量设得很大，还要考虑过期、上限和 key/value 内存；固定数据可构建完成后发布不可变 Map。

**递进追问：**

1. **负载因子越小是否一定越快？**

   不一定。冲突可能减少，但空桶和内存占用增加，缓存局部性也可能变化；应结合键分布和内存预算衡量。

2. **为什么扩容会出现延迟尖峰？**

   需要申请更大数组并重新组织已有桶，元素多时会产生复制、节点处理和额外内存峰值。

**易错点：**

- 预估 1000 个元素就直接传 1000，忽略负载因子导致仍然扩容。
- 为了避免扩容无限放大初始容量，制造长期空桶和内存浪费。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q38：`HashMap` 为什么线程不安全，多线程读写会出现什么问题？

**短回答：**

HashMap 没有为并发修改提供可见性、互斥和复合操作原子性。多线程同时 put、resize、remove 或遍历可能丢失更新、读到不一致结果或抛出异常；即使只有 `get`，也必须保证 Map 构建完成后的安全发布。

**原理：**

单次 put 涉及读取桶、判断键、写节点、更新 size 和可能扩容，这些步骤不是一个原子事务。两个线程可能基于同一旧状态写入并覆盖结果；结构修改与迭代并发会触发 best-effort 的 ConcurrentModificationException，但未抛异常不代表正确。JDK 7 扩容环链是历史追问，不应拿它概括所有版本；JDK 8 的具体失效表现不同，但“无并发契约”始终成立。若数据构建后只读，仍需通过 final 字段、锁、volatile 引用或线程安全容器安全发布，不能把普通引用随意泄露。需要原子初始化时使用 ConcurrentHashMap 的 computeIfAbsent 等单键原子 API，并注意映射函数副作用。

**代码 / 场景：**

配置启动时在单线程构建普通 Map，然后用 `Map.copyOf` 形成不可修改快照并通过 final 字段发布，读线程可以无锁读取。若运行期持续更新，选择 ConcurrentHashMap；“如果不存在则 put”不要写成 containsKey + put，而用 `putIfAbsent` 或 `computeIfAbsent` 表达原子意图。

**递进追问：**

1. **只读 HashMap 是否永远线程安全？**

   若后续绝不修改且对象被安全发布，并发读取可以工作；若构造未完成就泄露引用，其他线程仍可能看不到完整状态。

2. **给 put 外面加锁，get 不加锁可以吗？**

   需要完整证明发布和可见性协议；普通 HashMap 不提供这种混合访问保证，工程上应统一同步或改用合适的并发/不可变结构。

**易错点：**

- 继续用 JDK 7 的“扩容死循环”解释所有现代 HashMap 并发问题。
- 看到压测没报错就认定并发安全，忽略沉默的数据丢失和可见性问题。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-05

## Q39：`ConcurrentHashMap` 如何保证并发安全，为什么复合操作仍要用原子 API？

**短回答：**

JDK 8+ 的 ConcurrentHashMap 通过 volatile 可见性、CAS 和桶级同步协作，读操作通常不锁全表，冲突更新只锁定更小范围。它保证文档规定的单次和复合 API，但 `get` 后再 `put` 仍不是原子事务。

**原理：**

现代 ConcurrentHashMap 使用 Node 数组组织桶，空桶初始化可用 CAS，桶内冲突更新常在桶首监视器上同步，扩容时多个线程还可协助迁移。与 JDK 7 的 Segment 分段锁实现相比，锁粒度和数据结构不同；回答时应明确版本。get 依赖 volatile 字段和内存语义读取，无需像 Hashtable 那样锁住整张表。弱一致遍历允许与更新并发，不抛普通 HashMap 式 fail-fast，但不等于某一瞬间的全局快照。`putIfAbsent`、`compute`、`merge` 才能在单键范围表达原子复合更新；映射函数可能在内部同步范围执行，必须短小且避免递归更新同一 Map。

**代码 / 场景：**

统计用户计数可用 `map.computeIfAbsent(userId, k -> new LongAdder()).increment()`，避免 containsKey + put 的竞态。配置全量一致切换不适合逐键更新 ConcurrentHashMap，因为读者可能看到新旧混合版本；应构建不可变 Map 后一次替换 volatile/AtomicReference 中的引用。

**递进追问：**

1. **ConcurrentHashMap 的 size 是强一致快照吗？**

   并发更新期间聚合结果可能是瞬时估计或弱一致观察，不应用它维护需要严格事务语义的业务不变量。

2. **为什么 computeIfAbsent 的函数不应做慢 I/O？**

   它可能处在实现的并发控制路径上，慢操作会放大桶竞争；函数还应避免递归修改同一键并处理失败重试语义。

**易错点：**

- 把 JDK 7 Segment 结构原样描述成 JDK 8+ 的实现。
- 使用线程安全容器后仍写 get-check-put，并误以为多个调用会自动合成原子操作。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)

校验日期：2026-08-05

## Q40：`HashSet` 如何保证元素不重复，它与 `HashMap`、`equals`、`hashCode` 有什么关系？

**短回答：**

HashSet 通常以元素作为底层 HashMap 的 key，所有元素映射到同一个占位值。能否去重取决于元素的 hashCode 与 equals 契约；对象相等就必须有相同哈希，且放入集合后不能修改参与相等判断的字段。

**原理：**

add 元素本质上尝试向 Map 写入该 key：先按 hash 定位候选桶，再用 equals 确认是否已有等价元素。如果找到等价 key，新增失败并返回 false。HashSet 不承诺迭代顺序；需要插入顺序用 LinkedHashSet，需要排序语义用 TreeSet。若只重写 equals 不重写 hashCode，相等对象可能进入不同桶而同时存在；若 key 放入后身份字段改变，remove 和 contains 会按新 hash 去另一个桶查找，从而“集合里看得到却找不到”。这也是不可变值对象适合作为散列键的原因。

**代码 / 场景：**

权限集合可把不可变枚举放入 EnumSet；业务实体若按 `tenantId + userId` 去重，可定义不可变 record 或在 equals/hashCode 中只使用不会变化的身份字段。不要直接用数据库实体全部可变字段生成 Lombok equals/hashCode，再在持久化前后改变 id。

**递进追问：**

1. **HashSet 可以存 null 吗？**

   常见 HashSet 实现允许一个 null，因为底层 HashMap 允许一个 null key；但接口层设计是否允许 null 应由业务契约明确。

2. **TreeSet 的去重也依赖 hashCode 吗？**

   通常不依赖，它按自然顺序或 Comparator 的比较结果是否为零判定同一排序键，因此比较器应与 equals 语义协调。

**易错点：**

- 只重写 equals 不重写 hashCode，导致逻辑相等对象无法稳定去重。
- 元素入 Set 后修改身份字段，随后 contains/remove 失效。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Set API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html)
- [技术校准：Java 21 Map API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)

校验日期：2026-08-05

# 集合实战、Lambda 与 Stream

## Q41：什么是 fail-fast，遍历集合时怎样安全删除元素？

**短回答：**

普通集合迭代器通常用修改计数尽力发现遍历期间的意外结构修改并抛 `ConcurrentModificationException`。安全删除应使用当前迭代器的 `remove`、集合的 `removeIf`，或先筛选生成新集合；不能在增强 for 中直接调用原集合 remove。

**原理：**

ArrayList 等集合维护结构修改计数，创建 Iterator 时记录 expectedModCount。迭代期间如果从迭代器之外增删元素，下一次检查发现计数不一致就快速失败，避免在不确定结构上继续运行。它是调试错误的机制，不是并发安全保证：检查并非强同步，跨线程竞态可能抛也可能不抛。`Iterator.remove` 会在删除后同步期望计数，并要求先成功 next 且每次 next 最多 remove 一次。只替换元素值是否算结构修改取决于操作契约。并发遍历应选择快照、显式锁或 ConcurrentHashMap 等弱一致迭代器，而不是捕获异常重试。

**代码 / 场景：**

删除过期会话可写 `sessions.removeIf(Session::expired)`；需要边遍历边执行更多逻辑时，用显式 Iterator，在命中后调用 `iterator.remove()`。若另一个线程同时更新列表，先明确需要快照还是强一致：快照可复制后遍历，强一致则在同一锁内保护迭代与修改。

**递进追问：**

1. **为什么增强 for 中删除容易失败？**

   增强 for 对集合通常使用隐藏 Iterator；直接调用集合 remove 改了结构，却没有更新该 Iterator 的期望计数。

2. **ConcurrentHashMap 迭代器为什么通常不抛该异常？**

   它提供弱一致遍历，允许和并发更新共存并观察部分变化，但不承诺某一时刻的完整快照。

**易错点：**

- 把 ConcurrentModificationException 当成锁，认为没抛异常的数据就是一致的。
- catch 异常后从头重试遍历，掩盖真正的结构修改协议错误。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Collection API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collection.html)
- [技术校准：Java 21 Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)

校验日期：2026-08-05

## Q42：`CopyOnWriteArrayList` 为什么适合读多写少，它的代价是什么？

**短回答：**

CopyOnWriteArrayList 每次结构写入都在锁内复制底层数组，再原子发布新数组；读取无需锁，迭代器看到创建时的稳定快照。代价是写放大、内存峰值和数据可见延迟，因此只适合列表较小、读远多于写且允许快照语义的场景。

**原理：**

读线程获取当前数组引用并按索引访问，不会被正在构造的新副本破坏；写线程持锁复制、修改副本后再发布。迭代器固定持有当时数组，所以写入不会让它 fail-fast，也不会反映迭代开始后的新元素，迭代器本身不支持 remove。一次 add 是 O(n) 复制，连续批量写若逐条进行会产生大量临时数组和 GC 压力。它保证容器操作的并发语义，但元素对象仍可能可变，多个线程修改元素字段要另行同步。与 `Collections.synchronizedList` 相比，后者写成本低但读和遍历需要协调锁。

**代码 / 场景：**

应用内监听器注册后很少变化、每次请求都要遍历通知时，可以使用 CopyOnWriteArrayList。十万条订单持续写入则不合适，应使用线程封闭批次、队列或锁保护的普通结构。需要批量更新时优先 `addAll` 等一次复制，而不是循环单条 add。

**递进追问：**

1. **它的迭代器能看到遍历期间新增元素吗？**

   不能保证看到；迭代器基于创建时的数组快照，这正是它无需与写线程互相阻塞的原因。

2. **元素本身是否自动变成线程安全？**

   不会。复制的是元素引用数组，不是深拷贝元素；可变元素内部状态仍需不可变设计或同步。

**易错点：**

- 只看到“线程安全”就把高频写列表替换成 CopyOnWriteArrayList。
- 误认为快照迭代会实时反映新增项，或认为元素对象也被深复制。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
- [技术校准：Java 21 List API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html)

校验日期：2026-08-05

## Q43：方法引用只是 Lambda 缩写吗，重载时如何确定目标方法？

**短回答：**

方法引用与 Lambda 都依赖目标函数式接口进行类型检查，但方法引用的接收者位置、参数适配和重载解析可能更隐含；不清晰时显式 Lambda 往往更易读。

**原理：**

静态方法引用 `Type::staticMethod` 把函数参数传给静态方法；绑定实例引用 `instance::method` 已固定接收者；未绑定实例引用 `Type::instanceMethod` 会把函数描述符的第一个参数当接收者；构造器引用则产生对象或数组。编译器结合赋值、实参或返回位置给出的目标函数式接口，推导参数类型后选择适用重载。因此同一个 `String::valueOf` 在不同目标类型下可解析到不同重载，也可能因信息不足而二义。方法引用不会忽略受检异常：目标函数式接口的方法若未声明兼容异常，引用的方法也不能直接抛出它。

**代码 / 场景：**

`Function<String, String> trim = String::trim` 属于未绑定实例引用，调用时第一个 String 既是接收者；`Supplier<String> empty = String::new` 是无参构造器引用。若 `service::load` 有多个重载导致编译信息难懂，可改写为 `(UserId id) -> service.load(id)`，显式给出参数类型并在 Lambda 内完成异常转换。

**递进追问：**

1. **Type::instanceMethod 的第一个参数为何会消失？**

   它并未消失，而是被用作调用该实例方法的接收者，剩余函数参数才对应实例方法自己的形参。

2. **方法引用一定比 Lambda 更好吗？**

   不一定。只有接收者和参数映射直观时才更简洁；重载、异常适配或多步逻辑下，显式 Lambda 更能表达意图。

**易错点：**

- 忽略目标类型对重载解析的决定作用，只看方法名猜签名。
- 为了形式简短强行使用方法引用，掩盖接收者和参数的真实映射。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)
- [技术校准：Java 21 函数式接口包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/function/package-summary.html)

校验日期：2026-08-05

## Q44：Stream 为什么是惰性的、一次性的，副作用又为何危险？

**短回答：**

中间操作只描述流水线，终止操作才触发遍历；Stream 一旦被消费就不能复用，而依赖外部可变状态会破坏优化、并行与结果可预测性。

**原理：**

filter、map、sorted 等中间操作返回新流并延迟执行，count、collect、forEach 等终止操作消费流水线。实现可融合操作、短路或省略不影响结果的阶段，所以不能把 peek 当成一定执行的业务回调。流与数据源不同，它通常只遍历一次，终止或显式 close 后再次操作会抛 IllegalStateException。函数参数应尽量 non-interfering 且 stateless：遍历过程中修改数据源或依赖共享可变状态，顺序流也可能产生并发修改或时序耦合，并行流更会出现竞态。需要资源的流还必须关闭。

![Java Stream 从数据源、中间操作到终止操作的惰性流水线图](/content/diagrams/java-foundations/stream-pipeline-v1.svg "中间操作只描述流水线，终止操作才触发拉取与融合执行；流消费后不能再次复用。")

**代码 / 场景：**

不要写 `orders.stream().peek(audit::save).count()` 来保证每笔审计落库，因为流水线优化与终止操作语义不应承担业务副作用。可先 `var accepted = orders.stream().filter(rule).toList()`，再用明确循环执行事务性保存。调试 peek 只用于观察，不作为正确性条件；同一个 Stream 若要执行两种统计，应重新从集合创建流或一次 collect 完成。

**递进追问：**

1. **调用 stream() 时数据已经遍历了吗？**

   通常没有，stream() 建立遍历源，中间操作继续描述流水线，直到终止操作请求结果才实际拉取元素。

2. **为什么同一个 Stream 不能执行两个终止操作？**

   终止操作已经消费并关闭该流水线状态；Stream 不是可重复读取的集合，需要从数据源重新创建或合并计算。

**易错点：**

- 把 peek 当作可靠的保存、计费或发送消息钩子。
- 缓存 Stream 实例并跨方法、跨线程或多次终止消费。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)
- [技术校准：Java 21 Spliterator API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Spliterator.html)

校验日期：2026-08-05

## Q45：map 与 flatMap 的区别如何从“层级”理解？

**短回答：**

map 对每个元素做一对一变换并保留结果层级，flatMap 则让每个元素产生一个流再把这些流展平，适合一对多关系和组合可选上下文。

**原理：**

Stream.map 接收 Function<T,R>，一个输入产生一个 R，因此把 `Stream<Order>` 映射为订单的行列表会得到 `Stream<List<Line>>`。flatMap 接收从元素到 Stream 的函数，随后把所有子流的元素串接成当前流，得到 `Stream<Line>`；映射函数返回 null 会被当作空流，但显式 Stream.empty 更清楚。flatMap 的展平只处理一层，且生成的子流在内容并入后会被关闭。Optional.map 在映射函数返回 null 时得到 empty，Optional.flatMap 则要求函数直接返回 Optional，用于避免 `Optional<Optional<T>>`。

**代码 / 场景：**

统计所有订单行可写 `orders.stream().flatMap(o -> o.lines().stream()).filter(Line::billable).toList()`；若用 map，后续面对的是一组列表。查找用户再查邮箱时，`findUser(id).flatMap(User::verifiedEmail)` 直接得到 `Optional<Email>`，而 map 会多包一层。若每个输入恰好产生一个输出，就保留 map，让基数关系更明确。

**递进追问：**

1. **flatMap 会自动递归展平任意层吗？**

   不会，它只按当前操作展平一层；更深嵌套需要再次 flatMap，或先调整不必要的数据结构。

2. **过滤空子集合应该在 flatMap 前还是后？**

   空集合的 stream 本身不产生元素，通常无需额外过滤；若子集合可能为 null，应先修正模型或显式转为空流。

**易错点：**

- 把所有映射都写成 flatMap，掩盖原本的一对一关系。
- 用 null 表示没有子流，增加读者对特殊行为的依赖。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)
- [技术校准：Java 21 Optional API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html)

校验日期：2026-08-05

## Q46：reduce 与 collect 为什么不能互相随便替换？

**短回答：**

reduce 适合把不可变值按结合运算归约，collect 适合把元素累积到可变结果容器；并行正确性取决于 identity、accumulator 与 combiner 满足契约。

**原理：**

reduce 的 identity 必须对运算保持单位元性质，accumulator 与 combiner 需要兼容且运算应具有结合性，才能在不同分组方式下得到相同结果；浮点加法等并非严格结合，因此并行分组可能有细微差异。collect 的 Supplier 为每个分区提供独立可变容器，accumulator 将元素加入容器，combiner 合并分区结果，适合列表、Map 或统计汇总。不要在 reduce 中反复复制可变 List，也不要让多个并行分区共享同一个 mutable identity。Collectors 的特征只在真实满足无序、并发等条件时才能声明。

**代码 / 场景：**

金额总和可用 `amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add)`；收集用户编号用 `collect(Collectors.toSet())`。错误示例是 `reduce(new ArrayList<>(), (a,e) -> { a.add(e); return a; }, ...)`，并行时 identity 与变异关系不满足预期。需要自定义汇总时，为每个分区 new 独立 Accumulator，再实现清晰的 merge。

**递进追问：**

1. **为什么字符串拼接可 reduce，列表收集更适合 collect？**

   字符串是不可变值，拼接能按值归约；列表是可变容器，collect 专门定义了创建、累积与合并各分区容器的协议。

2. **并行 reduce 结果错误最先检查什么？**

   先检查 identity 是否真是单位元、运算是否结合、combiner 是否与 accumulator 兼容，以及函数是否读写了共享状态。

**易错点：**

- 在 reduce 中复用并修改同一个可变 identity。
- 只在顺序流测试通过，就假设 accumulator 可安全用于并行分区。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)
- [技术校准：Java 21 Collectors API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Collectors.html)

校验日期：2026-08-05

## Q47：并行 Stream 何时可能更慢，顺序与线程安全如何判断？

**短回答：**

parallel 并不是免费加速：拆分、调度、合并和共享资源争用都有成本；是否保序、是否并发累积则由数据源、操作和 Collector 契约共同决定。

**原理：**

并行流利用 Spliterator 拆分数据；JDK 21 默认实现通常通过 `ForkJoinPool.commonPool()` 处理分区任务，但 Java SE 的 Stream 接口并未把具体执行器写成跨实现保证。规则计算足够重、数据量大、来源易均衡拆分且合并便宜时才可能获益；链表、I/O、锁竞争、很小的数据集或昂贵的顺序合并会抵消收益。流的 encounter order 来自有序数据源和操作，forEach 不保证并行输出顺序，forEachOrdered 保序但可能降低并行度。线程安全容器也不能自动让整条复合逻辑正确，非干扰与无状态仍是基本要求；共享执行资源还可能与应用其他任务相互影响，必须通过目标运行时基准验证。

**代码 / 场景：**

对百万个独立图像做纯 CPU 特征计算，可以用代表性数据比较 sequential 与 parallel；而“并行读取数据库再写同一个 ArrayList”既受连接池限制又有竞态。若只是把 500 个订单金额求和，调度成本可能高于计算。需要稳定输出时用 collect 保持有序结果，而不是给共享列表加锁后在 forEach 中追加。

**递进追问：**

1. **forEachOrdered 是否仍然并行执行所有上游操作？**

   它要求按遭遇顺序产生终端效果，会限制部分并行收益；具体调度由实现决定，不能把它理解为完全顺序或免费保序。

2. **ConcurrentHashMap 能否让任意并行流副作用都安全？**

   不能，它只能保证自身规定的操作；跨多个键、外部对象或检查后执行的业务不变量仍需原子设计。

**易错点：**

- 看到 CPU 多核就无基准地把所有 stream 改成 parallel。
- 并行 forEach 写共享容器，并把容器单次操作安全等同于整体逻辑正确。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)
- [技术校准：Java 21 Spliterator API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Spliterator.html)
- [技术校准：Java 21 Collectors API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Collectors.html)

校验日期：2026-08-05

## Q48：Optional 适合表达什么，不适合出现在哪里？

**短回答：**

Optional 最适合方法返回值明确表达“可能没有一个结果”，并通过 map、flatMap、orElseGet 组合处理；它不应成为所有字段、参数和集合元素的通用包装。

**原理：**

Optional 是可能包含一个非 null 值的容器，empty 表示缺失。of 要求非 null，ofNullable 接受 null；map 在有值时映射且将 null 结果变为空，flatMap 用于映射函数已经返回 Optional。orElse 的参数会在调用前求值，即使当前有值也可能执行昂贵查询；orElseGet 仅在缺失时调用 Supplier。Optional 本身是 value-based 类，不应依赖对象身份或拿来加锁。API 设计上，返回 Optional 能迫使调用者面对缺失，但参数、实体字段、集合元素通常可以通过重载、领域状态或空集合表达得更直接。

**代码 / 场景：**

缓存查询可写 `findLocal(id).or(() -> findRemote(id)).orElseThrow(...)`；默认值需要访问数据库时用 `orElseGet(() -> repository.loadDefault())`，避免命中本地结果仍执行查询。返回多项时优先空 List 而不是 `Optional<List<T>>`。持久化实体字段若必须区分“未加载”和“明确为空”，应建立领域类型，不能只靠 Optional 猜状态。

**递进追问：**

1. **orElse 与 orElseGet 的差异只在语法吗？**

   不是，orElse 的候选值在方法调用前已经求值；orElseGet 的 Supplier 仅在 Optional 为空时执行。

2. **为什么不推荐直接 get？**

   get 把缺失转成无上下文的 NoSuchElementException；orElseThrow、组合操作或显式分支更能表达业务处理策略。

**易错点：**

- 在有值概率很高时用 orElse 执行昂贵或有副作用的默认逻辑。
- 用 Optional 包装集合、参数和实体每个字段，反而模糊领域状态。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 Optional API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html)

校验日期：2026-08-05

## Q49：Instant、LocalDateTime 与 ZonedDateTime 应该如何按业务语义选择？

**短回答：**

Instant 表示时间线上的唯一时刻，LocalDateTime 只有墙上日期和时间而没有时区，ZonedDateTime 同时携带时区规则；存储和展示必须先弄清业务需要哪一种。

**原理：**

Instant 以 UTC 时间线上的秒和纳秒定位时刻，适合事件时间戳、跨系统排序和机器交换。LocalDate、LocalTime、LocalDateTime 是不含偏移与时区的本地值，单独一个 LocalDateTime 在夏令时切换区可能对应两个时刻或根本不存在。OffsetDateTime 携带固定偏移，但偏移本身不包含地区未来规则；ZonedDateTime 绑定 ZoneId 与时区规则，适合“巴黎每天九点开会”这类地区语义。Duration 基于秒和纳秒度量时间线长度，Period 按年、月、日表达日历差异，两者跨夏令时的结果可能不同。

**代码 / 场景：**

日志与数据库审计字段可保存 Instant，并在展示时执行 `instant.atZone(userZone)`；生日只需 LocalDate；航班当地起飞时间要同时保存地区 ZoneId，而不只是 `+08:00`。纽约夏令时切换日，“加 24 小时”和“加 1 天”可能落在不同本地时钟时间，排班逻辑应明确使用 Duration 还是 Period。

**递进追问：**

1. **固定的 UTC offset 为什么不能完全替代 ZoneId？**

   offset 只描述当下与 UTC 的差值，不包含地区历史和未来的夏令时规则，长期日程需要 ZoneId 重新解析规则。

2. **LocalDateTime 能否直接代表数据库创建时间？**

   只有系统明确约定统一时区且绝不混用时才勉强可行；跨区域审计通常应存 Instant，并在边界转换显示。

**易错点：**

- 把没有时区的 LocalDateTime 当成全球唯一事件时刻传输。
- 用固定偏移表示长期地区日程，忽略夏令时与规则调整。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 日期时间 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html)

校验日期：2026-08-05

## Q50：日期格式化、解析和夏令时边界怎样避免“看起来正确”？

**短回答：**

DateTimeFormatter 是不可变且线程安全的，但模式字母、Locale、解析严格度和 ZoneId 都必须显式；边界时间还要决定重叠与空洞时采用什么业务策略。

**原理：**

DateTimeFormatter 可复用并组合 pattern、Locale、DecimalStyle、ResolverStyle 与 ZoneId。模式中的 `uuuu` 表示纪年年份，`yyyy` 是纪元内年份；`MM` 是月份而 `mm` 是分钟，误用会产生隐蔽结果。STRICT 解析会拒绝无效日期，SMART 可能进行有限调整。把 LocalDateTime 绑定地区时区时，夏令时前跳会形成不存在的本地时间，回拨会形成两个有效偏移；ZonedDateTime 的默认解析有既定规则，但业务若涉及计费、调度或法规，必须检测有效偏移数量并明确选择、拒绝或提示用户。

**代码 / 场景：**

接口日期可固定 `DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(STRICT)`，并用明确 Locale 解析英文月份。用户输入 `2026-03-08 02:30 America/New_York` 时，该本地时间可能处于春季跳时空洞；预约系统不应静默当作普通时刻，而应校验 zone rules 后提示选择有效时间。格式化事件前先把 Instant 转入用户 ZoneId。

**递进追问：**

1. **SimpleDateFormat 与 DateTimeFormatter 的并发差异是什么？**

   DateTimeFormatter 是不可变且线程安全的，可作为常量复用；旧的 SimpleDateFormat 是可变对象，不应无保护跨线程共享。

2. **为什么日期模式更推荐 uuuu 而非 yyyy？**

   uuuu 直接表示 proleptic year，与严格解析和无纪元日期更一致；yyyy 是 year-of-era，严格解析时还涉及纪元信息。

**易错点：**

- 把 MM 与 mm、uuuu 与 yyyy 混用后只用普通日期样例测试。
- 解析本地时间时未指定地区时区，也未处理夏令时空洞和重叠。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（上）](https://javaguide.cn/java/collection/java-collection-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 集合常见面试题（下）](https://javaguide.cn/java/collection/java-collection-questions-02.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 集合面试题](https://www.xiaolincoding.com/interview/collections.html)
- [技术校准：Java 21 日期时间 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html)

校验日期：2026-08-05

# I/O、NIO 与序列化

## Q51：字节流与字符流怎样分层，Buffered 就一定更快吗？

**短回答：**

InputStream、OutputStream 处理原始字节，Reader、Writer 通过字符集处理字符；缓冲能减少小粒度底层调用，但缓冲层数量、刷新时机和真实访问模式仍需设计。

**原理：**

二进制图片、压缩包和协议帧应保持字节语义；文本必须在边界由 CharsetDecoder 或 Reader 把字节解释为字符，再由 Writer 编码回字节。InputStreamReader 与 OutputStreamWriter 是两套层级的桥接器。BufferedInputStream、BufferedReader 等通过内存块合并小读写，通常能减少系统调用，但若底层 API 已有缓冲或应用一次读大块，重复包装只增加复制和状态复杂度。Writer 的 flush 只把 Java 侧缓冲推进下层，不等于磁盘持久化或网络对端已经处理；close 通常会先刷新，但错误处理仍要保留最初异常。

**代码 / 场景：**

读取 UTF-8 配置可写 `Files.newBufferedReader(path, StandardCharsets.UTF_8)`；复制图片则用 InputStream/OutputStream 或 `Files.copy`，不能经 Reader 中转。日志逐字符写入性能差，可批量缓冲，但每行 flush 会抵消收益。若要求落盘耐久，还需 FileChannel.force 等明确机制，不能把 `writer.flush()` 当作断电安全承诺。

**递进追问：**

1. **Reader 读到的是 Unicode 码点吗？**

   Reader 的基本单位是 UTF-16 char；补充字符可能由一对代理项表示，按码点处理还需 Character 相关 API。

2. **为什么不能用字符流复制任意二进制文件？**

   解码和再编码会把任意字节解释成字符，非法序列可能被替换，合法序列也未必可逆，最终破坏原始字节。

**易错点：**

- 用平台默认字符集读取协议或配置，部署后结果随环境变化。
- 把 flush 等同于设备持久化或远端业务已确认接收。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 java.io 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html)
- [技术校准：Java 21 Files API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html)

校验日期：2026-08-05

## Q52：字符集、编码和乱码的根因怎样系统定位？

**短回答：**

字符串是字符序列，文件和网络上传输的是字节；乱码通常来自编码端与解码端字符集不一致、错误的二次转码，或对非法字节采用了不合适的替换策略。

**原理：**

CharsetEncoder 把字符编码为字节，CharsetDecoder 把字节解码为字符。同一字节在不同字符集中可映射为不同字符，某些字节序列在指定字符集中还可能 malformed；目标字符集无法表示某字符时则属于 unmappable。许多便捷构造器使用默认字符集，默认值会随运行环境配置而变化，因此持久格式和协议必须显式指定 Charset。错误处理可选择 REPORT、REPLACE 或 IGNORE：关键数据导入通常应 REPORT 并记录偏移，静默替换会让数据看似成功却已损坏。已经乱码的 String 再反复 getBytes/new String 通常无法恢复丢失信息。

**代码 / 场景：**

接收 CSV 时先保留原始字节，依据协议或 BOM 选择 UTF-8，再以配置为 REPORT 的 CharsetDecoder 解码；失败时记录文件名与字节位置并拒绝导入。不要写 `new String(text.getBytes("ISO-8859-1"), "UTF-8")` 当万能修复，它只在非常特定的错误链可逆时碰巧有效。HTTP、数据库连接和文件读写三端都要核对真实字节与声明。

**递进追问：**

1. **UTF-8 文件是否一定需要 BOM？**

   不一定，UTF-8 并不依赖 BOM；是否接受或生成 BOM 要依据具体协议，不能把它当成通用编码检测器。

2. **出现替换字符后还能完全还原原文吗？**

   通常不能，多个非法输入可能都被替换为同一字符，信息已经丢失；应回到原始字节和正确字符集重新解码。

**易错点：**

- 依赖 `Charset.defaultCharset()` 处理跨机器持久数据。
- 发生乱码后多轮猜测式转码，覆盖了还能用于诊断的原始字节。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 java.nio 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)
- [技术校准：Java 21 java.io 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html)

校验日期：2026-08-05

## Q53：BIO、NIO、AIO 有什么区别，选型时应看哪些业务条件？

**短回答：**

BIO 的读写调用通常阻塞当前线程；NIO 提供 Channel、Buffer 和 Selector，可用少量线程管理大量非阻塞连接；AIO 以完成回调或 Future 表达异步 I/O。选型取决于并发连接数、每连接流量、开发复杂度和运行平台，而不是“NIO 永远更快”。

**原理：**

阻塞/非阻塞描述一次调用在数据未就绪时是否等待，同步/异步描述完成通知与结果处理方式，两组概念不能混为一谈。传统 socket BIO 常采用一连接一线程或线程池，代码直接但大量空闲连接会占用线程资源。NIO 把连接注册到 Selector，事件循环只处理已就绪通道，适合连接多、单次数据量小的网络服务；业务处理仍需避免阻塞事件循环。AIO 把操作提交给系统或运行时，完成后通知处理器，但不同平台实现与生态成熟度有差异。文件顺序读取、连接数量有限时，缓冲 BIO 可能最清晰。

**代码 / 场景：**

上传大文件的后台任务连接数有限，可使用缓冲流和线程池，重点控制内存与超时。聊天网关维护数万长连接时，可用 NIO/Netty 事件循环，但数据库调用和复杂业务应转交业务线程池，避免一个慢请求卡住整个事件循环。做技术选型前应测连接规模、消息大小、阻塞比例与故障恢复。

**递进追问：**

1. **NIO 是否等于异步 I/O？**

   不等于。Java NIO 常见 Selector 模型是同步非阻塞：线程主动查询就绪事件，再由自己执行 read/write。

2. **为什么 NIO 事件循环不能直接做慢数据库查询？**

   事件循环线程负责推进许多连接，阻塞它会同时拖慢这一组连接，慢业务应卸载并设置背压。

**易错点：**

- 把阻塞/非阻塞与同步/异步当作同一维度。
- 为了“高性能”给低并发文件任务引入复杂事件循环，却没有背压、超时和监控。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 java.io 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html)
- [技术校准：Java 21 java.nio 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)
- [技术校准：Java 21 NIO Channels](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)

校验日期：2026-08-05

## Q54：Java NIO 的 Channel、Buffer、Selector 分别负责什么？

**短回答：**

Channel 是可读写的数据通道，Buffer 承载读写状态，Selector 让一个线程发现多个非阻塞通道的就绪事件。三者配合解决“数据在哪里、状态怎样切换、哪些连接现在可处理”三个问题。

**原理：**

Channel 的 read 把数据写入 Buffer，write 从 Buffer 取数据写出；两者都可能只完成一部分，必须根据返回值和剩余空间循环处理。Buffer 用 capacity、position、limit 描述当前区域：写完后 `flip` 把 limit 设为已写位置并把 position 归零，读取后 `clear` 为覆盖整个缓冲区做准备，`compact` 则保留未读数据。Selector 只报告 accept、connect、read、write 等就绪状态，不替你完成业务读写。非阻塞 write 经常返回 0，若始终注册 OP_WRITE 会形成忙循环，应仅在确有待发送数据时关注写就绪。

**代码 / 场景：**

协议解码器收到半包时，不应假设一次 read 得到完整消息：把数据写入 ByteBuffer，flip 后按长度字段解析；数据不足则 compact，等待下一次 read 继续。响应未写完时保留剩余 Buffer 并注册 OP_WRITE，写空后立即取消写关注。

**递进追问：**

1. **`clear()` 会把旧字节真正清零吗？**

   不会，它只重设 position 和 limit，让后续写入可覆盖旧内容；需要安全擦除时要显式覆盖。

2. **Selector 返回可读是否保证一次能读完整业务包？**

   不保证，它只表示当前有数据或状态可处理；TCP 是字节流，仍需自己处理半包、粘包和连接关闭。

**易错点：**

- 忘记 flip，导致读取区间为空或位置错乱。
- 把一次 Channel read/write 当成完整传输，未保存剩余状态。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 java.nio 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)
- [技术校准：Java 21 NIO Channels](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)

校验日期：2026-08-05

## Q55：Files.lines 与 Files.walk 为什么必须关注关闭和惰性遍历？

**短回答：**

这类方法返回按需读取目录或文件的 Stream，底层可能持有打开的文件或目录句柄；终止操作完成不应取代显式 try-with-resources 生命周期。

**原理：**

Files.lines 返回文本行的惰性 Stream，Files.list 和 Files.walk 也可能在遍历期间持有一个或多个打开目录。它们实现 AutoCloseable 的 Stream 关闭钩子，因此应放在 try-with-resources 中；把 Stream 返回到已离开资源作用域的调用方，或长期缓存它，都会让资源边界模糊。walk 会按深度优先遍历并可选择 FOLLOW_LINKS；跟随链接时必须考虑循环和越界。惰性还意味着异常可能不在创建流时发生，而是在终止操作拉取后续元素时以包装的未检查 I/O 异常出现。大目录上直接 toList 会把全部 Path 驻留内存。

**代码 / 场景：**

`try (var lines = Files.lines(path, UTF_8)) { return lines.filter(this::valid).limit(1000).toList(); }` 在方法内完成消费并关闭文件。扫描上传目录时使用 `try (var paths = Files.walk(root, maxDepth))`，默认不跟随符号链接，并边遍历边处理；不要返回 paths 给控制器以后再消费，也不要为找前十个文件先把整棵目录树收集进 List。

**递进追问：**

1. **调用 count 后 Stream 是否会自动替代 close？**

   不能把终止操作当作通用资源关闭保证；官方建议对持有 I/O 资源的 Stream 使用 try-with-resources 显式关闭。

2. **遍历时的 IOException 为什么可能变成未检查异常？**

   惰性 Stream 的函数接口不便直接声明 IOException，后续访问失败可能包装为 UncheckedIOException 再从终止操作传播。

**易错点：**

- 从方法返回仍绑定文件句柄的 Stream，让调用者难以正确关闭。
- 对巨大目录先 walk().toList()，造成句柄时间过长和内存峰值。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 Files API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html)
- [技术校准：Java 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)

校验日期：2026-08-05

## Q56：ByteBuffer 的 position、limit、capacity 如何配合 flip、clear 与 compact？

**短回答：**

ByteBuffer 依靠 position 和 limit 划分当前可读写区间；flip 是从写模式切到读模式，clear 是准备覆盖整个缓冲区，compact 则保留未读数据后继续写。

**原理：**

capacity 是缓冲区固定容量，position 指向下一个读或写位置，limit 表示当前不可越过的边界。新缓冲区通常 position 为零、limit 等于 capacity；写入后 position 前移，flip 把 limit 设为原 position 再把 position 归零，使刚写入部分可读。读完后 clear 仅重置索引，并不会擦除旧字节；若只消费部分数据，compact 会把未读字节移到开头，把 position 放到其后，便于继续从 Channel 追加。rewind 只把 position 归零以便重读当前 limit 内数据。mark/reset 受位置变化影响，不能用肉眼猜状态。

![ByteBuffer 的 capacity、position、limit 以及 flip clear compact 状态变化图](/content/diagrams/java-foundations/nio-buffer-state-v1.svg "读写切换本质是重设 position 与 limit；clear 不擦除数据，compact 才保留未读区间。")

**代码 / 场景：**

处理半包协议时，channel.read(buffer) 后 flip，循环解析完整帧；发现末尾不足一帧就 compact，把残余字节搬到开头并等待下一次 read。若此时误用 clear，残余半帧会被新数据覆盖；若读取后忘记 compact 或 clear，limit 仍停在旧数据末端，后续 read 可能立即返回零。调试时记录 position、limit、capacity 比打印整块数组更有效。

**递进追问：**

1. **clear 会把缓冲区内容填零吗？**

   不会，它只把 position 置零、limit 置为 capacity，并丢弃旧内容的逻辑可见性，底层字节可能仍在。

2. **compact 与 rewind 分别用于什么场景？**

   compact 保留未读数据并准备继续写；rewind 保持 limit 不变，只把 position 归零以重新读取已有数据。

**易错点：**

- 把 clear 当作安全擦除敏感数据的操作。
- 网络半包尚未解析完就 clear，导致跨读取边界的数据丢失。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 java.nio 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)
- [技术校准：Java 21 NIO Channels](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)

校验日期：2026-08-05

## Q57：Channel 的 read 和 write 为什么必须处理“部分完成”？

**短回答：**

Channel 方法返回本次实际传输数量，不保证一次读满缓冲区或一次写完全部内容；正确代码必须根据返回值、buffer 状态和 EOF 循环推进。

**原理：**

ReadableByteChannel.read 最多读取 buffer.remaining 个字节，可能读到较少字节，流结束时返回 -1；非阻塞通道暂时无数据时还可返回 0。WritableByteChannel.write 同样只写当前可写部分的一部分，特别是套接字发送缓冲区受限时。FileChannel 的 position 读写和带显式位置的读写具有不同共享位置语义，transferTo/transferFrom 也不应假设一次覆盖请求总量。循环必须保证每轮有进展或等待就绪，避免返回 0 时忙等；协议层还需区分“流结束”“当前无数据”和“还缺一帧”。

**代码 / 场景：**

写文件或阻塞套接字时使用 `while (buffer.hasRemaining()) channel.write(buffer)`，并处理 write 异常；非阻塞 SocketChannel 若 write 返回 0，应注册 OP_WRITE，待 Selector 通知后继续，不能在 CPU 上自旋。读固定长度消息时累计返回值，read 为 -1 且仍未收齐应报告截断，而不是把缓冲区未写区域当作有效零字节。

**递进追问：**

1. **阻塞 Channel 的 write 是否一定写完整个 buffer？**

   不保证，阻塞只影响等待行为，write 的契约仍允许返回小于 remaining 的正数，调用者应循环到写完。

2. **read 返回 0 与 -1 有什么区别？**

   0 表示本次没有传输数据但通道未必结束，-1 明确表示到达流末尾，协议处理不能混为一谈。

**易错点：**

- 一次 write 后直接复用缓冲区，丢掉尚未发送的尾部数据。
- 非阻塞通道返回零时紧密循环，制造高 CPU 忙等。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 NIO Channels](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)
- [技术校准：Java 21 java.nio 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)

校验日期：2026-08-05

## Q58：Java I/O 为什么大量使用装饰器模式，怎样避免包装层次混乱？

**短回答：**

InputStream/OutputStream 与 Reader/Writer 提供基础抽象，缓冲、数据类型转换、压缩等能力通过包装另一个流逐层组合。装饰器避免为每种能力组合建立子类，但要求正确选择字节/字符边界、包装顺序和关闭责任。

**原理：**

装饰器与被包装对象实现相同核心接口，并在转发前后增加行为。例如 BufferedInputStream 为任意输入流加缓冲，InputStreamReader 把字节按指定 Charset 解码为字符，BufferedReader 再提供字符缓冲和按行读取。包装顺序决定语义：压缩数据应先解压字节，再按字符集解码；反过来没有意义。最外层关闭通常会级联关闭内层资源，但是否要关闭调用方传入的底层流必须写进 API 契约。缓冲不是越多越快，重复缓冲会占内存且增加刷新时机的理解成本。

**代码 / 场景：**

读取 gzip 压缩 UTF-8 文本时，顺序可为 `FileInputStream -> GZIPInputStream -> InputStreamReader(UTF_8) -> BufferedReader`，并用 try-with-resources 管理最外层。若方法接收外部提供的 OutputStream，通常只 flush 而不擅自 close，所有权由调用者决定并在文档中说明。

**递进追问：**

1. **装饰器与适配器的关注点有什么不同？**

   装饰器保持同一抽象并叠加能力；适配器主要把一种接口转换为另一种接口，例如 InputStreamReader 连接字节流与字符流。

2. **为什么关闭最外层通常就够了？**

   标准包装流的 close 通常向内委托，从而释放整条链；但自定义流和资源所有权仍应核对契约。

**易错点：**

- 先按字符解码再尝试解压，弄反字节变换与字符变换顺序。
- 工具方法随意关闭调用者传入的流，破坏上层复用和响应写出。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 21 java.io 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html)
- [技术校准：Java 21 AutoCloseable API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/AutoCloseable.html)

校验日期：2026-08-05

## Q59：Java 原生序列化中的 serialVersionUID、transient 与钩子方法各管什么？

**短回答：**

serialVersionUID 用于反序列化版本兼容检查，transient 排除默认字段数据，而 writeObject、readObject 等钩子可定制格式；三者都不能把不可信反序列化变安全。

**原理：**

实现 Serializable 只是标记对象可参与协议。若未显式声明 serialVersionUID，运行时会根据类结构计算默认值，普通重构可能改变它并导致 InvalidClassException；显式 UID 只允许版本检查通过，不会自动解决字段语义变化。static 字段属于类而非对象状态，默认不序列化；transient 实例字段也跳过默认序列化，反序列化后取得类型默认值，需由 readObject 恢复不变量。自定义 writeObject/readObject、readResolve/writeReplace 能控制表示和身份，但必须遵守调用顺序、校验长度与对象不变量。构造器执行规则也与普通 new 不同，不能依赖构造器完成全部验证。

**代码 / 场景：**

会话对象把临时缓存字段标成 transient，并在 `readObject` 中先 `defaultReadObject()`，再检查用户名非空、集合大小上限并重建缓存。升级类时显式保持或变更 serialVersionUID 要基于兼容策略，而不是为了“强行读取旧数据”始终写 1。密码不应因 transient 就安全，因为其他字段图和自定义钩子仍可能泄露数据。

**递进追问：**

1. **serialVersionUID 相同是否保证新旧对象完全兼容？**

   不保证，它只是版本检查的一部分；字段类型、类层次、自定义钩子和业务不变量变化仍可能导致错误或静默语义偏差。

2. **transient 字段反序列化后是什么值？**

   默认序列化不会恢复它，字段先得到 Java 类型默认值，若对象需要其他状态必须在安全钩子中重建。

**易错点：**

- 把固定 serialVersionUID 当作任意类演进都兼容的开关。
- 依赖普通构造器校验反序列化对象，忽略协议的特殊构造过程。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 对象序列化规范](https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/)
- [技术校准：Java 21 java.io 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html)

校验日期：2026-08-05

## Q60：为什么不应反序列化不可信 Java 对象流，替代方案如何选？

**短回答：**

对象流会按输入重建复杂对象图并触发类中的反序列化行为，攻击面不只在目标 DTO；外部数据应优先使用受限结构格式、显式模式校验和最小类型集合。

**原理：**

ObjectInputStream 读取的类型信息与对象图可能触发 readObject、readResolve、代理处理及可达类的其他行为，历史上的 gadget 链会把“仅解析数据”变成代码执行或资源耗尽入口。ObjectInputFilter 能按类、数组长度、深度、引用数与字节量进行过滤，是遗留系统的重要纵深防御，但过滤规则遗漏和类演进仍可能扩大攻击面，不能替代可信边界。新协议更适合 JSON、CBOR、Protocol Buffers 等显式 schema：只绑定预期 DTO，限制大小、深度和字段，拒绝任意类型名，并对语义不变量再次校验。签名或 TLS 能验证来源和传输，不会让来源本身的恶意对象图变安全。

**代码 / 场景：**

内部旧队列若暂时必须读取对象流，应限定入口身份，同时配置 ObjectInputFilter 只允许 `com.example.dto` 中的少数最终类、基础集合及严格深度和数组上限，拒绝代理与未知类，并在隔离环境做兼容测试。面向浏览器的新接口则改为带版本字段的 JSON DTO，关闭多态类型自动解析，对集合数量、字符串长度和金额范围逐项校验。

**递进追问：**

1. **只允许一个顶层 DTO 类就足够安全吗？**

   不够，DTO 的字段可达图还可能包含集合、代理或危险类型，必须限制整个对象图的类型、深度、数量与字节规模。

2. **数据有数字签名后能否放心原生反序列化？**

   签名只证明数据来自持钥者且未被篡改，不保证生产方未被攻陷、内容无逻辑攻击或解析过程没有资源风险。

**易错点：**

- 把网络内网或登录用户等同于输入绝对可信。
- 配置过宽的类名前缀过滤，并误以为已经消除 gadget 与资源耗尽风险。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 知识体系与高频问题](https://javaguide.cn/java/)
- [高频题库参考（内容已重写）：小林 Coding：Java 基础面试题](https://www.xiaolincoding.com/interview/java.html)
- [技术校准：Java 对象序列化规范](https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/)
- [技术校准：Java 21 java.io 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html)

校验日期：2026-08-05

# 线程基础、线程池与异步任务

## Q61：创建线程时，为什么通常提交 Runnable 或 Callable，而不是继承 Thread？

**短回答：**

线程是执行载体，Runnable 和 Callable 是待执行任务。把二者分开后，任务既能交给不同执行器，也更容易测试、组合和控制生命周期；直接调用 run 只是在当前线程执行普通方法，只有 start 才会启动新线程。

**原理：**

Thread 同时包含线程身份、优先级、名称、中断状态等执行上下文，也提供 start 启动一次实际线程；start 最终会在新线程中回调 run，重复调用会抛 IllegalThreadStateException。Runnable.run 没有返回值且不能声明受检异常，Callable.call 可以返回结果并抛出异常，通常通过 ExecutorService 包装成 Future。继承 Thread 会把业务任务与具体执行线程绑定，还占用 Java 的单继承位置；实现任务接口则可以让同一个任务由测试代码直接调用、由线程执行或由执行器调度。线程创建、并发上限和关闭策略也应由执行层统一管理，而不是散落在领域对象里。

**代码 / 场景：**

批量计算十个文件摘要时，将每个文件封装为 Callable<Digest> 并提交给受控执行器，调用方保存返回的 Future，设置总截止时间并统一取消未完成任务。这样摘要算法可以在单元测试中直接调用 call，生产环境再决定使用多少工作线程；若写成十个 Thread 子类，返回值、异常收集和生命周期管理都会变得零散。

**递进追问：**

1. **直接调用 thread.run() 会发生什么？**

   它只是当前线程上的普通方法调用，不会创建新线程，也不会经历 start 所建立的线程生命周期。代码看似并发，实际上会同步执行，因此测试线程身份或时序时很容易误判。

2. **同一个 Thread 对象可以 start 两次吗？**

   不可以。Thread 实例的 start 只能成功一次，即使 run 已经结束也不能再次启动；需要再次执行任务时，应创建新的 Thread，通常更适合把任务重新提交给执行器。

**易错点：**

- 把 run 当成启动线程的方法，结果耗时任务仍阻塞当前调用线程。
- 业务对象随手 new Thread，导致并发上限、异常处理和应用关闭无法统一治理。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)
- [技术校准：Java 21 ExecutorService API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html)

校验日期：2026-08-05

## Q62：Java 线程的六种状态怎样理解，BLOCKED 与 WAITING 有什么区别？

**短回答：**

Thread.State 是 JVM 观察线程所用的六类快照：NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED。RUNNABLE 同时覆盖可运行和正在运行；BLOCKED 是等待进入监视器，WAITING 则是线程已经主动进入无期限等待。

**原理：**

NEW 表示尚未 start，TERMINATED 表示 run 已退出。RUNNABLE 不等于此刻占用 CPU，它还包含等待操作系统调度或正在执行的线程。BLOCKED 专指线程试图进入 synchronized 区域或重新获取对象监视器时受阻；WAITING 常由无超时 Object.wait、Thread.join 或 LockSupport.park 产生，TIMED_WAITING 则包括带超时的 wait、join、sleep 与 parkNanos。状态是采样瞬间的分类，不记录线程之前做过什么，也不能单凭一次快照判断故障；排查需要结合多次线程转储、锁拥有者、调用栈、CPU 和业务时间线。I/O 等待在 JVM 层也可能仍呈 RUNNABLE，不能把 RUNNABLE 直接解释为高 CPU。

**代码 / 场景：**

某请求卡住时，线程 A 在 synchronized(lock) 入口显示 BLOCKED，转储同时指出线程 B 持有该监视器；线程 C 在 queue.take 的内部等待条件，可能显示 WAITING；线程 D 调用了 sleep(1000) 则显示 TIMED_WAITING。连续采样若 A 一直被 B 阻塞，才进一步检查 B 的调用栈和持锁范围，而不是看到 BLOCKED 就立即重启。

**递进追问：**

1. **为什么 RUNNABLE 线程不一定正在消耗 CPU？**

   Java 的 RUNNABLE 合并了操作系统层面的就绪和运行等情况，某些本地 I/O 等待也可能映射为该状态。是否消耗 CPU 应结合采样分析器和线程 CPU 时间判断。

2. **线程从 Object.wait 返回后一定立刻运行吗？**

   不一定。收到通知后，它还必须重新竞争并获得同一个对象的监视器，才会从 wait 返回；竞争期间可表现为 BLOCKED，之后还要等待调度器分配执行机会。

**易错点：**

- 把 RUNNABLE 等同于正在占用处理器，据此误判高 CPU 根因。
- 只看一份线程转储就下结论，没有追踪状态、锁拥有者和调用栈的变化。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)

校验日期：2026-08-05

## Q63：interrupt 为什么是协作式取消，而不是强制终止线程？

**短回答：**

interrupt 只是发出取消请求：它设置中断状态，或让部分阻塞方法抛出 InterruptedException。任务必须在合适边界检查并退出、清理资源或向上转交；Java 不会在任意指令处粗暴杀死线程。

**原理：**

对正常运行的线程调用 interrupt，通常只把其中断标志设为 true；Thread.currentThread().isInterrupted 可读取而不清除，静态 Thread.interrupted 会读取并清除当前线程标志。sleep、wait、join 以及部分并发阻塞方法在响应中断时抛 InterruptedException，并会清除中断状态。底层任务若无法完成取消，通常应清理局部状态后重新设置中断 Thread.currentThread().interrupt，或把 InterruptedException 继续抛给能决定策略的上层。循环要在合理频率检查中断，阻塞 I/O 是否响应中断取决于具体 API。强行终止可能把共享对象留在不变量被破坏的中间状态，因此 Thread.stop 已不适合作为取消机制。

**代码 / 场景：**

文件导入任务每处理一批记录就检查 isInterrupted，数据库写入使用可取消或有超时的调用。收到取消后，任务停止领取新批次，在 finally 中关闭流并回滚未提交事务，然后正常返回。若一个库方法捕获 InterruptedException 只是为了关闭临时文件，它在退出前重新设置中断，让上层 Future 或请求编排器仍能识别这次取消。

**递进追问：**

1. **捕获 InterruptedException 后为什么常要重新设置中断？**

   抛出该异常的阻塞方法通常已经清除了中断标志。若当前层不能继续抛出异常，却直接吞掉它，上层会误以为任务可继续；重新设置可以保留取消信号。

2. **finally 中收到中断后还应做清理吗？**

   应该完成必要且有界的资源释放或一致性清理，但不要借机执行长时间新业务。清理代码也要考虑再次中断和超时，避免取消路径本身永久卡住。

**易错点：**

- 捕获 InterruptedException 后空处理，导致线程池关闭或请求取消迟迟不生效。
- 只在循环结束才检查中断，或调用不响应中断且无超时的阻塞 API。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q64：wait 与 notify 为什么必须配合条件循环和同一个监视器？

**短回答：**

wait/notify 不是消息队列，而是对象监视器上的条件等待协议。调用者必须先持有该对象的监视器；等待线程在循环里检查业务条件，wait 时释放监视器，被唤醒并重新获得监视器后再检查条件。

**原理：**

对对象调用 wait、notify 或 notifyAll 前必须处于 synchronized(该对象) 内，否则会抛 IllegalMonitorStateException。wait 会原子地把当前线程加入该对象等待集并释放其监视器，但不会自动释放线程持有的其他锁。notify 只选择一个等待者，选择规则不保证公平；notifyAll 唤醒全部等待者，它们仍需竞争锁。线程可能因为通知、超时、中断或所谓虚假唤醒而返回，所以条件必须用 while 而不是 if 检查。修改条件与发送通知也要在同一监视器保护下完成，才能避免检查条件与进入等待之间丢失通知。复杂的多个条件队列通常更适合 BlockingQueue 或 Lock/Condition。

![Java 线程在监视器等待、通知、中断与 join 协作中的状态流转图](/content/diagrams/java-foundations/thread-coordination-v1.svg "条件循环守住业务谓词，通知只让等待者重新竞争锁；中断与 join 都必须明确传播策略。")

**代码 / 场景：**

有界缓冲区的 put 在 synchronized(lock) 中使用 while(size == capacity) lock.wait()，入队后调用 lock.notifyAll；take 同样用 while(size == 0) 等待，出队后通知。即使多个生产者同时被唤醒，只有拿到锁且重新确认容量仍可用的线程才能入队，其余线程继续等待，因此不会因一次通知越过容量约束。

**递进追问：**

1. **为什么推荐 while 而不是 if？**

   线程醒来时业务条件可能已被另一线程再次改变，也允许在没有目标通知时醒来。while 会在重新持锁后再次验证不变量，if 则可能让线程在条件不成立时继续执行。

2. **notify 与 notifyAll 应怎样选择？**

   只有一个条件且任意等待者都能推进时 notify 可能足够；多个条件共用等待集或无法证明选中者一定能推进时，notifyAll 更安全，但应评估竞争开销并优先考虑更明确的条件工具。

**易错点：**

- 在 synchronized 外调用 wait 或 notify，运行时直接抛监视器状态异常。
- 用 if 检查条件，忽略竞争、超时和虚假唤醒后条件可能仍不成立。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-05

## Q65：Thread.join 能保证什么，带超时的 join 应怎样写？

**短回答：**

join 让当前线程等待目标线程终止，适合表达明确的生命周期依赖；它不传播目标线程异常，也不负责取消。Java 19 起优先使用返回 boolean 的 join(Duration)，可直接区分目标是否在期限内结束。

**原理：**

调用 worker.join 意味着调用线程暂停，直到 worker 进入 TERMINATED，并会响应等待线程自身的中断。Java 19 起，worker.join(Duration) 最多等待指定时长并返回目标是否已经终止；Duration 小于等于零时不等待，只做一次终止状态检查，适合用剩余 deadline 安全调用。旧的 join(long millis) 返回 void，超时后必须用 isAlive 判断，而且 millis 为 0 的语义不是立即返回，而是无限等待；把不足一毫秒的剩余时间截断成 0 会意外突破超时预算。等待多个线程时应计算统一 deadline，不给每个线程重复完整时长。目标线程抛出的未捕获异常不会由 join 转交，需要 UncaughtExceptionHandler、结果容器或 Future 收集。

**代码 / 场景：**

服务关闭时给两个后台线程总计五秒退出窗口：先设置停止标志并 interrupt，再记录 deadline。每次计算 Duration remaining，调用 worker.join(remaining) 并检查 boolean 结果，随后为下一线程重算剩余预算；remaining 为零时只检查而不等待。兼容旧 API 时，若换算后的剩余毫秒为 0 但仍有少量时间，应至少传 1，而不能调用 join(0) 进入无限等待。

**递进追问：**

1. **join 和 sleep 的本质区别是什么？**

   sleep 只等待一段时间，不关心其他线程状态；join 等待特定线程终止，并可无超时等待。两者都会让当前线程暂停且都可能抛 InterruptedException。

2. **目标线程异常退出后 join 会怎样？**

   目标线程仍会进入 TERMINATED，所以 join 正常返回，但不会把异常抛给等待者。若调用方关心成功或失败，应使用 Future.get 或显式的异常收集与处理机制。

**易错点：**

- 旧毫秒重载把换算后的 0 传给 join，误把“立即检查”变成无限等待。
- 循环等待多个线程时重复使用完整时长，使总关闭时间远超统一预算。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)

校验日期：2026-08-05

## Q66：`ThreadPoolExecutor` 的核心参数有哪些，任务提交后按什么顺序处理？

**短回答：**

核心参数包括 corePoolSize、maximumPoolSize、keepAliveTime、时间单位、workQueue、threadFactory 和拒绝策略。execute 提交后通常按“核心线程未满就创建 → 否则入队 → 队列满且未到最大线程数再创建 → 仍无法接收则拒绝”处理。

**原理：**

线程池复用工作线程并把并发度、排队和过载策略显式化。达到核心线程数后，新任务不是立刻创建非核心线程，而是先尝试进入 workQueue；只有队列无法接收时才向 maximumPoolSize 扩展。无界队列会让 maximumPoolSize 很难生效，并把过载转成内存和延迟问题；有界队列便于形成背压。非核心线程空闲超过 keepAliveTime 通常回收，核心线程也可配置超时。threadFactory 应提供可识别线程名和未捕获异常策略。参数不是孤立口诀：队列容量、任务耗时、到达速率和下游容量共同决定系统行为。

**代码 / 场景：**

订单通知平均每秒 200 个、单任务平均 50ms，先估算并发需求和下游 QPS，再配置独立有界线程池、命名线程工厂和明确拒绝策略。压力测试要观察 activeCount、queueSize、完成量、拒绝量和任务等待时间；若队列持续增长，扩大线程数可能只会压垮数据库，应先限流或降级。

**递进追问：**

1. **为什么使用无界队列时 maximumPoolSize 常常不起作用？**

   核心线程满后任务仍能不断入队，队列不满就不会走创建非核心线程的分支，最终风险转为排队延迟和内存增长。

2. **核心线程会一直存活吗？**

   默认通常会保留，但可通过 allowCoreThreadTimeOut 让核心线程也按空闲超时回收。

**易错点：**

- 把七个参数逐个背完，却说错“先扩到最大线程再入队”的执行顺序。
- 使用无界队列掩盖过载，直到延迟和堆内存不可控。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 ExecutorService API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q67：线程池大小怎样估算，为什么不建议直接使用 `Executors` 默认工厂？

**短回答：**

线程数应根据 CPU 核数、任务等待/计算比例、下游容量和延迟目标通过压测确定。部分 Executors 工厂使用无界队列或可无限创建线程，容易把过载隐藏成 OOM、延迟雪崩或线程耗尽，因此生产更适合显式 ThreadPoolExecutor。

**原理：**

CPU 密集任务的有效并行度通常接近可用核心数；I/O 等待较多时可以增加线程以覆盖等待，但不能超过数据库连接、远端 QPS 和内存承载。公式只能给初值，因为任务耗时分布、上下文切换、锁竞争和突发流量会改变结果。`newFixedThreadPool` 常配无界 LinkedBlockingQueue，积压时内存持续增长；`newCachedThreadPool` 最大线程数很大且使用直接交接，慢任务可能快速创建大量线程；`newSingleThreadExecutor` 同样可能无限排队。显式构造让容量、拒绝、线程命名和监控都可审核，还应按业务隔离线程池，避免一个慢依赖占满公共资源。

**代码 / 场景：**

CPU 图像处理池可从 `Ncpu` 或 `Ncpu + 1` 附近开始压测；调用外部接口的池先受连接池和对方限流约束，再根据等待比例设置并发。支付、报表、通知应使用不同池和队列，避免报表突发拖死支付链路。容量调整以 p95/p99 等待时间、拒绝率和下游健康度为依据。

**递进追问：**

1. **I/O 密集任务线程数是否越多越好？**

   不是。线程仍消耗栈和调度成本，更会争用连接池及下游容量；超过瓶颈后只会增加排队和超时。

2. **虚拟线程出现后还需要限流吗？**

   需要。虚拟线程降低线程成本，却不会增加数据库连接、CPU、内存和远端服务容量，稀缺资源仍要单独限制。

**易错点：**

- 套用固定公式后直接上线，不用真实耗时分布和下游容量验证。
- 所有业务共用一个线程池，一个慢依赖造成全站饥饿。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 ExecutorService API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q68：线程池的拒绝策略、`shutdown` 与 `shutdownNow` 应怎样设计？

**短回答：**

队列和最大线程均饱和时必须执行拒绝策略：抛异常、调用者执行、丢弃最旧或静默丢弃各有不同风险。`shutdown` 停止接收新任务并处理已提交任务，`shutdownNow` 尝试中断运行任务并返回未开始任务；二者都不是强制终止。

**原理：**

AbortPolicy 明确抛 RejectedExecutionException，便于上层降级；CallerRunsPolicy 让提交线程执行任务，可形成自然背压，但如果提交者是事件循环或持锁线程可能放大阻塞甚至死锁；Discard 与 DiscardOldest 会丢任务，只有业务明确允许并具备指标、补偿时才可用。关闭时应先 shutdown，再在预算内 awaitTermination，超时后才 shutdownNow 并再次等待。任务必须正确响应 interrupt，外部 I/O 还需设置自身超时，否则 shutdownNow 也无法及时停止。服务关闭顺序要先停止流量入口，再等待任务和下游资源，最后关闭依赖。

**代码 / 场景：**

消息异步落库不能使用静默丢弃，可让拒绝策略记录指标并把任务转入可靠消息或由调用方降级。应用退出时先从负载均衡摘除，停止接收请求，调用 shutdown，等待例如 30 秒；超时后 shutdownNow，并记录返回的未执行任务用于补偿。任务捕获 InterruptedException 后应恢复中断标记或结束，不要继续无限重试。

**递进追问：**

1. **CallerRunsPolicy 为什么能形成背压？**

   提交线程被迫同步执行任务，提交速度会下降；但它会阻塞提交者，所以必须确认该线程允许承担业务执行。

2. **`shutdownNow` 能保证正在运行的任务立刻停止吗？**

   不能，它主要通过 interrupt 发出协作取消请求；忽略中断或阻塞在不可中断操作中的任务仍可能继续。

**易错点：**

- 使用 DiscardPolicy 却没有丢弃指标、业务幂等和补偿机制。
- 服务退出直接 shutdownNow，未给正常任务清理和提交结果的时间。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 ExecutorService API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [技术校准：Java 21 Future API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Future.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q69：CompletableFuture 中 thenApply、thenCompose 与 thenCombine 怎样选择？

**短回答：**

thenApply 用于同步映射一个已完成结果；thenCompose 把返回的下一段异步任务摊平，避免嵌套 Future；thenCombine 在两个相互独立的异步结果都完成后合并。选择依据是数据依赖关系，而不是方法名熟悉程度。

**原理：**

CompletableFuture 同时实现 Future 与 CompletionStage。若函数从 T 同步得到 U，使用 thenApply 得到 CompletionStage<U>；若函数从 T 发起并返回 CompletionStage<U>，使用 thenCompose 得到扁平链，否则 thenApply 会形成 CompletionStage<CompletionStage<U>>。两个任务互不依赖时先并行启动，再用 thenCombine 合并；有先后依赖时用 thenCompose。allOf 只表示所有阶段结束，本身结果为 Void，仍需从各子阶段读取结果；anyOf 返回最先完成的 Object，要注意类型与失败策略。链式 API 描述完成关系，并不自动提供业务超时、取消传播或资源隔离，这些要显式设计。

**代码 / 场景：**

先异步查询用户，再根据 userId 异步查询订单，二者有依赖，写成 findUser(id).thenCompose(user -> findOrders(user.id()))；订单和优惠券都只依赖 userId 时则同时启动两个阶段，再 thenCombine 计算展示模型。最终统一设置超时与异常映射，避免在回调中 join 把本可异步的依赖重新阻塞。

**递进追问：**

1. **thenApply 返回 CompletableFuture 会有什么问题？**

   结果会多嵌套一层，外层完成只说明内层 Future 已创建，不代表内层任务已完成；后续还需再展开。返回异步阶段时通常应该使用 thenCompose。

2. **allOf 为什么不能直接得到 List 结果？**

   allOf 的契约只汇聚完成信号并返回 CompletableFuture<Void>。全部成功后仍要按原顺序从各子 Future 读取结果，并明确任一失败、部分结果和取消时的处理策略。

**易错点：**

- 所有关系都用 thenApply，造成嵌套 Future 和错误的“已完成”判断。
- 在回调里立即 join 另一个尚未启动或同池受限的任务，破坏并行性甚至造成饥饿。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 CompletableFuture API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)

校验日期：2026-08-05

## Q70：CompletableFuture 的异常处理和执行线程怎样控制？

**短回答：**

非 Async 阶段可能由完成前一阶段的线程直接执行，Async 重载若不传 Executor 通常使用公共池。异常会沿依赖链传播，handle、exceptionally 和 whenComplete 语义不同；生产代码应显式选择执行器、超时和恢复边界。

**原理：**

thenApply 等非 Async 方法的动作可由完成当前阶段的线程执行，不能假设它总在提交线程或某个固定线程；thenApplyAsync 等无 Executor 重载通常使用 ForkJoinPool.commonPool，有 Executor 重载则进入指定执行器。CPU 计算、阻塞 I/O 和关键业务不应无差别挤在公共池。exceptionally 只在异常时提供替代结果，handle 无论成功失败都把两种状态转换为新结果，whenComplete 更适合观察和清理，原异常通常继续传播。join 用 CompletionException 包装失败且不声明受检异常，get 使用 ExecutionException；orTimeout 使阶段在期限后异常完成，completeOnTimeout 提供默认值，但都要评估底层工作是否仍在运行以及取消如何处理。

**代码 / 场景：**

聚合接口把 HTTP 调用放到专用有界 I/O 执行器，thenApply 中只做轻量映射，重计算转入 CPU 执行器。链尾用 orTimeout 限制用户等待，whenComplete 记录耗时并释放追踪上下文，exceptionally 仅对允许降级的“推荐语”返回默认值；订单金额等关键数据异常则继续失败，避免用空值掩盖故障。

**递进追问：**

1. **whenComplete 能否像 exceptionally 一样恢复异常？**

   它主要用于观察成功值或异常并执行副作用，返回阶段通常保留原结果或原异常。需要把异常转换为替代值时使用 exceptionally，需同时映射成功和失败时使用 handle。

2. **为什么不应把所有 Async 阶段都丢给 commonPool？**

   公共池被整个进程共享，阻塞调用或长任务会相互干扰，也难以设置隔离、容量和监控。关键链路应按任务性质使用受控执行器，并明确拒绝和关闭策略。

**易错点：**

- 误以为非 Async 回调固定运行在主线程，在线程上下文和日志上产生错误假设。
- 用 exceptionally 为所有异常返回空集合，导致权限、数据和系统故障被静默吞掉。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（上）](https://javaguide.cn/java/concurrent/java-concurrent-questions-01.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 线程池详解](https://javaguide.cn/java/concurrent/java-thread-pool-summary.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 CompletableFuture API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

# JMM、锁、CAS 与并发安全

## Q71：Java 内存模型解决什么问题，可见性、原子性、有序性如何区分？

**短回答：**

JMM 规定线程如何通过共享内存交互，并用 happens-before 判断一个操作的结果是否必须对另一个操作可见。可见性关注能否看到最新值，原子性关注操作是否不可分割，有序性关注允许重排序后仍需保持哪些观察结果。

**原理：**

CPU 缓存、编译器优化和指令重排使源码顺序不能直接等同于跨线程观察顺序。JMM 不要求每次读写都直达所谓“主内存”，而是抽象规定同步动作和数据竞争下的合法行为。对同一监视器的 unlock happens-before 后续 lock；volatile 写 happens-before 后续读；线程 start 之前的动作对新线程可见，线程中的动作在线程成功终止并被 join 后对等待者可见；传递性可把这些边连接起来。单个 int 读写通常原子不代表 `count++` 原子，因为它包含读、计算、写。正确并发程序需要用锁、volatile、final 安全初始化、原子类或线程安全容器建立明确边界。

**代码 / 场景：**

一个线程设置 `data = build(); ready = true;`，另一个线程循环读普通 ready 后访问 data，存在数据竞争；把 ready 声明为 volatile，并保证先写 data 后写 ready，volatile 写读边可发布之前的初始化。若多个线程同时执行 count++，即使 count 是 volatile 仍会丢失更新，应使用 AtomicInteger 或同一锁。

**递进追问：**

1. **volatile 能否保证对象内部所有复合操作线程安全？**

   不能。它能通过引用或字段建立可见性与顺序边界，但多个步骤的不变量仍可能需要锁或原子结构。

2. **happens-before 是否等于实际时间上先发生？**

   它是内存可见性与顺序保证关系，不只是墙上时钟的先后；没有该关系的两个操作即使偶然按顺序执行也不能据此证明正确。

**易错点：**

- 用“线程工作内存一定就是某级 CPU 缓存”替代 JMM 的抽象语义。
- 把可见性、原子性和有序性混成“加 volatile 就线程安全”。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q72：`synchronized` 如何实现互斥和可见性，锁住的对象到底是谁？

**短回答：**

synchronized 以对象监视器为同步边界：实例同步方法锁当前 `this`，静态同步方法锁对应 Class 对象，代码块锁括号中的那个对象。进入与退出同一监视器建立互斥和 happens-before，可保证临界区写入对后续持锁线程可见。

**原理：**

字节码层面，同步代码块通常对应 monitorenter/monitorexit，并由异常表确保异常路径也释放；同步方法通过方法访问标志表达。锁是可重入的，同一线程再次获得同一监视器会增加持有计数，退出相应次数才完全释放。JVM 可使用偏向、轻量、自旋、锁消除等实现优化，但不同 JDK 版本策略会演进，面试应先讲规范语义，再把“锁升级”作为 HotSpot 实现补充。锁对象身份必须稳定且私有：锁字符串常量可能与其他代码意外共享，锁可变字段可能在替换引用后变成两把锁。临界区内的慢 I/O 会拉长所有竞争线程等待。

**代码 / 场景：**

账户转账要保护两个余额时，应建立稳定的全序锁定规则，例如按账户 id 排序后依次锁定，避免 A→B 与 B→A 形成死锁。单实例状态用 `synchronized(lock)` 保护私有 final lock；所有实例共享的静态注册表才考虑类级锁。锁内只完成必要状态检查与更新，远程调用放到临界区外并用事务/补偿保证一致性。

**递进追问：**

1. **两个实例调用同一个 synchronized 实例方法会互斥吗？**

   通常不会，因为分别锁各自的 this；只有它们实际使用同一个监视器对象时才互斥。

2. **synchronized 是否一定是重量级操作？**

   不能这样概括。规范给出同步语义，JVM 会根据竞争情况优化；真正成本应通过目标 JDK 和负载测量。

**易错点：**

- 把所有 synchronized 方法都说成锁 Class，混淆实例锁和类锁。
- 锁住公开对象、字符串常量或会被替换的引用，导致意外竞争或保护失效。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q73：`ThreadLocal` 的原理是什么，在线程池中为什么必须清理？

**短回答：**

ThreadLocal 把值存在线程自身的 ThreadLocalMap 中，key 对 ThreadLocal 是弱引用，value 仍是强引用。线程池线程生命周期很长，若任务结束不 remove，旧值可能泄漏、串到下一请求并长期占用内存。

**原理：**

调用 `threadLocal.set(value)` 时，条目不是保存在 ThreadLocal 对象里，而是当前 Thread 的专用 Map。弱 key 能在外部不再持有 ThreadLocal 时被回收，但 value 不会因此立即消失；只有后续 Map 操作清理陈旧条目或线程结束，value 才有机会释放。线程池复用同一个工作线程处理多个请求，所以 ThreadLocal 不是请求级自动变量。它适合传递明确生命周期的线程上下文，但异步切换到另一个线程、CompletableFuture 默认池和虚拟线程时，值不会自动按业务期望传播。更可靠的设计是显式传参，确需使用时在边界统一 set/try/finally/remove。

**代码 / 场景：**

Web 过滤器从请求读取 traceId 后执行 `TRACE.set(id); try { chain.doFilter(...); } finally { TRACE.remove(); }`。不能只在正常返回时清理，因为异常路径同样会把用户上下文留给下一个任务。异步任务应显式复制需要的不可变上下文，避免把大型请求对象整体放进 ThreadLocal。

**递进追问：**

1. **key 是弱引用，为什么还会内存泄漏？**

   key 被回收后，Entry 中的 value 仍由长寿命线程及其 Map 强引用；没有后续清理或线程结束时，value 可长期存活。

2. **InheritableThreadLocal 适合线程池传上下文吗？**

   通常不适合。它在线程创建时继承，而线程池线程早已存在且会复用，容易得到过期上下文。

**易错点：**

- 只调用 set 不在 finally 中 remove，在线程池里造成串号和内存滞留。
- 把数据库连接、请求对象等大资源塞入 ThreadLocal，并期待弱引用自动释放。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 ThreadLocal API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ThreadLocal.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q74：ReentrantLock、Condition 与 synchronized 的边界怎样选择？

**短回答：**

两者都能提供可重入互斥与必要的内存同步语义。简单、词法范围明确的临界区优先 synchronized；需要可中断或限时获取、非块结构解锁、多个条件等待队列时，再选择 ReentrantLock 与 Condition。

**原理：**

synchronized 绑定对象监视器，进入和退出由语言与 JVM 保证，正常返回或抛异常都会自动释放，代码结构更不容易漏锁；每个监视器只有一个 wait set，通过 wait、notify、notifyAll 协作。ReentrantLock 需要显式 lock，并且必须在成功获取后用 try/finally unlock；它额外提供 tryLock、带超时获取、lockInterruptibly、锁状态监测及可选公平策略。一个 Lock 可以 newCondition 出多个 Condition，例如 notEmpty 与 notFull 分离等待者；await 会原子释放关联锁，返回前重新获取，仍必须在 while 中检查条件，signal 也要求当前线程持有关联锁。功能更多不代表默认更快，应按语义需要选，而不是为“高级”替换所有 synchronized。

**代码 / 场景：**

普通账户余额更新只需短临界区且没有限时获取，使用 synchronized(account) 更直接。自定义有界缓冲区希望生产者只唤醒等待空间者、消费者只唤醒等待数据者，可使用一个 ReentrantLock 配两个 Condition；put 在 while(full) 中 notFull.await，成功入队后 notEmpty.signal，并在 finally 中 unlock。若获取锁还受请求截止时间约束，则使用 tryLock(remaining, unit)。

**递进追问：**

1. **lock() 与 lockInterruptibly() 有什么区别？**

   lockInterruptibly 在等待获取锁期间可以因中断抛出 InterruptedException，适合需要取消的阻塞流程；lock 获取前若已中断也会继续按其契约等待，取得锁后中断状态仍需业务处理。

2. **Condition.await 为什么也必须写在 while 中？**

   被 signal 只表示条件可能成立，线程还要重新竞争锁，期间状态可能再次变化，也允许虚假唤醒。返回后循环复查业务条件，才能守住缓冲区等共享状态的不变量。

**易错点：**

- 调用 lock 后没有在 finally 中 unlock，异常路径永久占住显式锁。
- 把 Condition 对象本身拿去 synchronized 或 wait，混淆两套互不关联的等待协议。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Locks API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-05

## Q75：volatile 能保证什么，为什么不能保证 count++ 的原子性？

**短回答：**

volatile 适合发布单个状态：写入对随后读取该字段的线程可见，并限制相关内存操作越过这次访问重排；它不把“读取、计算、写回”合成一个不可分割动作，所以 volatile count++ 仍会丢更新。

**原理：**

对 volatile 字段的写与之后读到该值的读取建立明确的线程间顺序，使写线程在发布前完成的普通写入也能被读取方按规则观察到，因此常用于停止标志、状态位或不可变配置引用。volatile 读写本身是单次访问语义，但 count++ 要先读取旧值、加一、再写回；两个线程可能读到相同旧值并各自写入相同新值。检查后执行、跨多个字段维护不变量也不能靠 volatile 完成，应使用 synchronized、Lock、原子类或更高层协议。volatile 修饰数组变量只约束数组引用的读写，不会自动让元素更新具备同样语义；它也不等于刷新全部业务对象或禁止所有编译器优化。

**代码 / 场景：**

后台任务用 volatile boolean shutdownRequested 作为停止请求：控制线程先写好关闭原因，再把标志设为 true；工作线程每处理一批就读取标志并退出。访问计数不能写 volatile int count 后执行 count++，而应按需求使用 AtomicInteger.incrementAndGet、LongAdder 或锁。配置更新可构造不可变 Snapshot 后一次写入 volatile 引用，读者不再原地修改快照。

**递进追问：**

1. **volatile boolean stop 为什么通常可用，volatile int count++ 为什么不行？**

   停止标志的协议通常只有单次写入和单次读取，不需要把多个动作合并；count++ 包含读、算、写三个步骤，线程可交错执行，单次 volatile 访问无法保护整个复合操作。

2. **volatile 引用指向可变对象后，对象字段都线程安全吗？**

   不是。正确发布能让读者看到发布前已构造的状态，但对象发布后的独立字段修改仍需要自身同步策略。更稳妥的方式是发布不可变快照，更新时替换整个引用。

**易错点：**

- 把 volatile 当作轻量锁，用它保护计数累加或多个字段之间的业务不变量。
- 只给数组引用加 volatile，却假设所有数组元素的并发修改都已受保护。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)

校验日期：2026-08-05

## Q76：死锁、活锁与饥饿有什么区别，线上应怎样排查？

**短回答：**

死锁是参与线程形成循环依赖而都无法继续；活锁是线程仍在响应和重试，却持续互相让步而没有有效进展；饥饿是某个线程长期得不到所需资源。三者都表现为业务停滞，但线程状态和修复方向不同。

**原理：**

典型死锁由互斥资源、持有并等待、不可抢占和循环等待共同形成，常见代码原因是不同路径以相反顺序获取两把锁。活锁中的线程并未永久阻塞，例如双方检测冲突后同时释放、等待相同时间再重试，状态不断变化但完成数不增长。饥饿则可能来自长期占锁、优先级策略、无界任务挤压或总被其他竞争者抢先。排查先确认业务吞吐与排队，再连续获取多份线程转储：死锁关注 BLOCKED 链、监视器或 ownable synchronizer 的拥有者及 JVM 检出的循环；活锁关注高 CPU、重复栈和重试日志；饥饿关注等待时间分布及资源是否总被少数线程占用。修复分别采用统一锁顺序、随机或指数退避、缩短临界区和有界公平策略。

**代码 / 场景：**

转账线程 A 先锁账户 1 再等账户 2，线程 B 顺序相反，会形成稳定的互等；规定始终按账户 ID 升序加锁可消除环。两个同步程序冲突后都固定等待 10 毫秒再重试，日志持续滚动但成功数为零，这是活锁，可加入随机退避。若批处理长期持有单线程资源导致在线请求一直排队，则按等待直方图和持有时长排查饥饿。

**递进追问：**

1. **为什么 tryLock 加超时不等于已经彻底消除死锁？**

   它能让线程在等待超时后退出，从而避免永久卡住，但若失败后仍以相同顺序和节奏无限重试，可能转成活锁；外部资源和回调中的锁也仍可能形成环。

2. **一次线程转储没有报告死锁就能排除并发停滞吗？**

   不能。活锁和饥饿通常不会被死锁检测器报告，外部数据库锁也未必出现在 JVM 锁图中。需要连续样本、业务吞吐、外部依赖与等待时长共同判断。

**易错点：**

- 看到大量 WAITING 就直接判断死锁，没有构造资源拥有与等待的循环关系。
- 所有重试使用固定间隔，故障恢复后多个线程仍同步碰撞形成活锁。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)
- [技术校准：JDK 21 jcmd 工具说明](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)
- [技术校准：Java 21 Locks API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html)

校验日期：2026-08-05

## Q77：AQS 是什么，`ReentrantLock`、`Semaphore`、`CountDownLatch` 如何基于它协作？

**短回答：**

AQS 用一个同步状态 `state`、原子更新和等待队列搭建锁与同步器骨架。子类定义共享或独占模式下获取/释放状态的规则，AQS 负责失败入队、阻塞、唤醒和取消等通用流程。

**原理：**

独占模式同一时刻通常只有一个线程成功，例如 ReentrantLock；共享模式允许多个线程按状态同时通过，例如 Semaphore 许可和 CountDownLatch 计数归零后的放行。线程先尝试 `tryAcquire` 或 `tryAcquireShared`，失败后进入 CLH 风格同步队列并在合适条件下挂起；释放状态后唤醒后继重新竞争。AQS 使用 CAS 管理 state 和队列关系，但完整实现不等于“纯自旋”，等待线程会阻塞。ConditionObject 维护独立条件队列，await 会释放锁并进入条件等待，signal 后转移回同步队列，最终仍要重新获得锁。理解 AQS 应抓住状态、队列、独占/共享三条主线，不必死背每个源码分支。

**代码 / 场景：**

限流器可用 Semaphore 的许可表达同时访问下游的最大数量，务必在成功 acquire 后用 finally release。一次启动等待多个组件初始化可用 CountDownLatch；重复阶段协作则考虑 CyclicBarrier/Phaser。自定义同步器前优先组合现有 JUC 工具，只有状态模型确实特殊且具备充分测试时才继承 AQS。

**递进追问：**

1. **AQS 的 state 具体表示什么？**

   AQS 只提供整数状态容器与原子访问，语义由子类定义：可表示重入次数、剩余许可或未完成计数。

2. **Condition.signal 后线程能立刻继续吗？**

   不能保证。它先从条件队列转移到同步队列，还要重新竞争并获得关联锁后，await 才能返回。

**易错点：**

- 把 AQS 说成所有线程一直 CAS 自旋，忽略入队与阻塞。
- 为普通业务直接手写 AQS 锁，未处理取消、中断、公平性和异常路径。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 Locks API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
- [技术校准：Java 21 原子变量包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html)

校验日期：2026-08-05

## Q78：新建对象怎样安全交给其他线程使用？

**短回答：**

构造完成不等于其他线程就能可靠看到完整状态。对象引用应通过明确的发布边界交给读者，例如类初始化、同步块、volatile 引用、并发容器或任务提交，并避免在构造期间让 this 提前逃逸。

**原理：**

若把新对象直接写入普通共享字段，而读写双方没有同步协议，读者可能没有可靠的可见性保证。常见安全路径包括：对象作为 static final 在类初始化期间建立；在同一监视器保护下写入和读取；写入 volatile 引用并由读者读取该引用；放入 BlockingQueue、ConcurrentMap 等具有并发规范的容器；或在提交任务前构造对象并让任务从执行器边界接收。final 字段在对象正确构造且未提前逸出时还具有额外初始化保证，但它不让对象中所有可变状态永久线程安全。构造函数中注册监听器、启动线程或把 this 放入全局集合，会让其他线程在构造完成前访问半初始化对象，应改为工厂完成构造后再注册。

**代码 / 场景：**

配置刷新先在局部变量中解析并校验出不可变 ConfigSnapshot，全部字段就绪后一次写入 volatile currentConfig。请求线程先读取一次 currentConfig 到局部变量，并在整次请求中使用同一快照。不能先把空 Config 放到普通静态字段，再逐项填充；也不应在 Config 构造函数里把 this 注册到全局监听器。

**递进追问：**

1. **把引用声明为 volatile 后，对象内部任意修改都自动安全吗？**

   不会。volatile 引用能建立引用写入和读取的发布边界，但对象发布后的独立字段修改仍需要不可变设计、锁、原子变量或再次发布新快照，不能把引用修饰符当作深层锁。

2. **构造函数中启动线程为什么危险？**

   新线程可能在构造函数完成前取得 this 并读取尚未初始化或尚未满足不变量的字段。这属于提前逸出，应由工厂或 start 方法在完整构造后再启动。

**易错点：**

- 先发布对象引用再逐个填写字段，使其他线程可能观察到半初始化状态。
- 认为所有字段是 final 就可以在构造函数中任意泄漏 this，破坏正确构造前提。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

## Q79：synchronized 实例方法、静态方法和代码块分别锁住谁，为什么可重入？

**短回答：**

实例同步方法锁当前对象 this，静态同步方法锁声明该方法的 Class 对象，代码块锁括号表达式得到的对象。只有竞争同一个锁对象才互斥；同一线程可以重复获得自己已持有的监视器，所以 synchronized 是可重入的。

**原理：**

调用某实例的 synchronized 实例方法等价于围绕该实例监视器进入临界区，因此两个不同实例默认不会互相阻塞。static synchronized 与实例无关，使用对应 Class 对象监视器；它和任一实例锁也是两把不同的锁。synchronized(lock) 则精确锁住运行时求值得到的非 null 引用，锁对象应稳定、私有且不暴露。监视器记录拥有线程和重入次数，同一线程已持锁时再进入同一对象的其他同步方法不会自我阻塞，退出每一层后次数递减，最外层退出才真正释放。子类继承的同步实例方法仍锁实际接收者 this，但 synchronized 修饰符本身不会作为可覆盖方法签名的一部分强制子类保持同步。

**代码 / 场景：**

Counter 的 synchronized increment 与 synchronized value 都锁同一个 Counter 实例，所以同一实例上互斥，不同 Counter 可并行。static synchronized resetAll 锁 Counter.class，并不会自动挡住某实例的 increment；若二者共同修改静态总量，必须统一锁。转账代码使用 private final Object balanceLock，避免锁 String 常量、装箱值或外部可取得对象而被无关代码争用。

**递进追问：**

1. **实例同步方法能与同类的静态同步方法并发执行吗？**

   通常可以，因为前者锁具体实例，后者锁 Class 对象，二者不是同一监视器。若它们访问同一份共享状态，这种写法就没有形成共同互斥，需要统一锁策略。

2. **可重入为什么对同步方法调用链很重要？**

   一个已持有对象锁的方法常会调用同对象的另一个同步方法。可重入允许同一线程再次进入并累计持有层数，否则这种正常的封装调用就会把自己永久阻塞。

**易错点：**

- 以为同一个类的所有 synchronized 方法共用一把锁，混淆实例锁与类锁。
- 锁住可变字段、字符串常量或公开对象，导致锁身份变化或遭到外部意外竞争。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：JLS 17：线程与内存模型](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q80：CAS 与 Atomic 原子类怎样工作，ABA 问题是什么？

**短回答：**

CAS 按“当前值仍等于预期值才替换”为条件完成单变量更新，AtomicInteger、AtomicReference 等据此提供线程安全的读改写和条件更新。它避免传统互斥阻塞，但竞争下会重试，也不能自动维护多变量事务。

**原理：**

compareAndSet(expected, update) 原子比较当前值和 expected，相等才写入 update 并返回 true，否则不修改并返回 false。incrementAndGet、updateAndGet 等方法通常把这种条件更新封装成重试循环，因此传入的更新函数可能被重复调用，必须无副作用。CAS 只检查当前位模式或引用是否等于预期；若值从 A 变成 B 又回到 A，等待线程可能误以为期间从未变化，这就是 ABA。只关心最终数值的计数场景未必受影响，但无锁栈节点复用等依赖版本历史的算法可能出错，可用 AtomicStampedReference 把引用与版本戳一并比较，或用 AtomicMarkableReference 携带标记。复杂不变量仍应使用锁或更高层并发结构。

**代码 / 场景：**

库存上限为 100 时，循环读取 AtomicInteger 当前值，若 current + delta 超限就拒绝，否则 compareAndSet(current, current + delta)，失败后重新读取。更新函数不发送消息，因为重试可能执行多次。无锁空闲节点表若节点引用可能被移除后又放回，则仅比较引用会漏掉 ABA，可同时维护递增 stamp；真正跨数据库库存和订单写入仍交给事务。

**递进追问：**

1. **AtomicInteger 能保证两个计数器之和恒定吗？**

   不能。它只能保证针对单个变量的指定操作原子，分别更新两个 AtomicInteger 之间仍有可见的中间状态。跨变量不变量需要同一锁、不可变整体快照或其他事务协议。

2. **为什么 updateAndGet 的函数不应包含外部副作用？**

   并发竞争会让一次 CAS 失败并重新计算，更新函数可能执行多次。若函数同时扣款、发消息或写日志，副作用会重复；它应是基于输入计算输出的纯函数。

**易错点：**

- 认为使用 Atomic 类后包含多个字段的业务操作也自动成为整体原子事务。
- 在 CAS 重试函数中执行不可重复副作用，竞争失败后产生重复外部动作。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（中）](https://javaguide.cn/java/concurrent/java-concurrent-questions-02.html)
- [高频题库参考（内容已重写）：JavaGuide：Java 并发常见面试题（下）](https://javaguide.cn/java/concurrent/java-concurrent-questions-03.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 并发编程面试题](https://www.xiaolincoding.com/interview/juc.html)
- [技术校准：Java 21 原子变量包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html)
- [技术校准：Java 21 并发工具包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

校验日期：2026-08-05

# JVM 内存、类加载与垃圾回收

## Q81：一段 Java 源码从 javac 编译到 JVM 执行会经过哪些阶段？

**短回答：**

Java 源码先由编译器完成词法、语法、类型检查并生成 Class 文件，运行时再由类加载、验证、链接和初始化把字节码交给解释器或即时编译器执行。

**原理：**

javac 的产物不是特定 CPU 的机器码，而是包含版本号、常量池、字段、方法、属性和字节码的 Class 文件。JVM 加载类后先完成验证与准备；符号引用可以提前解析，也可以在实际使用时按需解析。首次主动使用再触发类初始化。方法首次运行通常可以解释执行，热点代码会收集类型与分支信息并由 JIT 编译为本地机器码；假设失效时还可能去优化并回到较低层执行。因此“编译一次、到处运行”依赖目标 JVM 实现，而不是字节码自己直接被 CPU 执行。

**代码 / 场景：**

排查“本地能运行、服务器报 UnsupportedClassVersionError”时，应同时打印 `javac -version` 和 `java -version`，再用 `javap -verbose App.class` 查看 major version。源码语法通过并不代表目标运行时能识别该 Class 版本，CI 应明确 `--release` 和生产 JDK 基线。

**递进追问：**

1. **为什么只设置 `-source` 还不足以保证低版本运行？**

   `-source` 主要限制语言语法，不自动阻止引用高版本新增 API；使用 `--release` 才会同时约束语言级别、目标 Class 版本和可见标准库 API。

2. **字节码是否真的与操作系统完全无关？**

   Class 格式具有平台中立性，但运行仍依赖对应平台的 JVM、标准库和本地组件；JNI、本地文件路径与默认字符集仍可能引入平台差异。

**易错点：**

- 把 javac 生成的字节码误称为可以被 CPU 直接执行的机器码。
- 只看源码语法版本，不核对 Class 版本、API 基线和生产 JVM。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JVMS 4：Class 文件格式](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)

校验日期：2026-08-05

## Q82：Java 对象从 `new` 到可用会经历哪些步骤？

**短回答：**

JVM 遇到 new 时先确保目标类已加载和初始化，再为对象分配内存、把实例字段置默认值、设置对象头，随后执行构造器链完成显式初始化，最终把引用交给调用方。分配位置和对象布局属于具体 JVM 实现。

**原理：**

字节码 new 指令引用常量池中的类符号，解析后检查该类是否可实例化。以 HotSpot 常见路径为例，堆空间规整时可用指针碰撞分配，并通过线程本地分配缓冲 TLAB 降低竞争；空间不规整时需要空闲列表等策略。分配后的零值初始化保证构造器执行前字段有语言规定的默认值，随后对象头记录类型、同步和 GC 所需元数据，再依次执行父类构造器、实例字段初始化和当前构造器。JIT 通过逃逸分析可能做标量替换，使源码中的对象不一定真的出现在堆上，因此“所有对象必然在堆分配”不应作为绝对结论。构造期间泄露 this 会让其他线程看到未完成对象。

**代码 / 场景：**

不可变配置对象应在构造器中完成校验和字段赋值，构造器里不要注册监听器、启动线程或调用可重写方法，以免 this 提前泄露。分析大量短命对象时用 JFR/分配剖析确认热点，再决定减少分配或调整 GC；不要仅凭源码里的 new 数量推测堆压力。

**递进追问：**

1. **对象的实例字段何时获得默认值？**

   JVM 分配并初始化对象存储时先设零值，之后构造器链和字段初始化表达式再写入业务值。

2. **new 出来的对象一定分配在堆上吗？**

   语言语义把对象视为引用对象，但优化后的具体存储由 JVM 决定；逃逸分析可能消除分配或做标量替换。

**易错点：**

- 把 TLAB、对象头具体位布局说成 JVM 规范对所有实现的固定要求。
- 在构造器中把 this 发布到其他线程，破坏安全初始化。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)

校验日期：2026-08-05

## Q83：类的加载、链接与初始化为什么不能混为一个动作？

**短回答：**

加载负责取得二进制并创建类型表示，链接包含验证、准备和解析，初始化才执行静态字段赋值与静态代码块；三者触发条件和失败方式都不同。

**原理：**

加载阶段由类加载器按二进制名寻找定义并创建 Class 对象。验证检查文件结构、字节码和类型安全；准备为静态字段分配存储并设置规范默认值；解析把常量池符号引用转换为运行时引用，实现可以选择延迟解析。初始化在首次主动使用前执行编译器合成的 `<clinit>`，并保证父类先初始化、同一个类的初始化在并发下受 JVM 协调。仅获得类字面量、声明数组类型或读取编译期常量不一定触发初始化，反射调用、new、读写非常量静态字段则通常会触发。

**代码 / 场景：**

若 `static final int LIMIT = 10` 被调用方编译期内联，修改提供方常量但不重新编译调用方，旧值仍可能保留。诊断静态初始化失败时，应定位最初的 ExceptionInInitializerError；同一 ClassLoader 中后续使用通常只会看到 NoClassDefFoundError，而不会反复重跑失败逻辑。

**递进追问：**

1. **`Class.forName` 与 `ClassLoader.loadClass` 的默认初始化行为有什么差异？**

   常用的 `Class.forName(String)` 会请求初始化；`loadClass` 通常只完成加载，是否链接或初始化取决于后续使用和具体调用方式。

2. **接口初始化是否要求先初始化所有父接口？**

   接口初始化规则不同于类；初始化接口不会仅因其父接口存在就把所有父接口依次初始化，但使用到父接口成员时仍可能单独触发。

**易错点：**

- 把准备阶段的默认值误说成源码中静态字段初始化表达式的最终值。
- 认为只要拿到 Class 对象就必然执行了目标类的静态代码块。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-05

## Q84：类加载器有哪些，双亲委派模型是什么，为什么需要它？

**短回答：**

Java 运行时常见有 Bootstrap、Platform、Application ClassLoader，也可自定义加载器。双亲委派指加载类时先委托父加载器，父级无法完成再由当前加载器查找，用于避免核心类被重复或恶意替换，并维持类型身份的一致边界。

**原理：**

JVM 判断两个类是否相同，不只看全限定名，还要结合定义它们的 ClassLoader。同名 Class 被两个独立加载器定义，会成为两个不兼容类型。典型 `loadClass` 先检查是否已加载，再向父级委派，父级失败后调用自身 findClass；Bootstrap 由虚拟机实现，不一定表现为普通 Java 对象。委派不是不可突破的铁律：SPI 需要父层 API 发现子层实现，容器、模块系统和插件隔离也可能采用线程上下文加载器或受控的子优先策略。但自定义加载必须避免核心包覆盖、类泄漏和跨边界强转失败。

**代码 / 场景：**

插件系统为每个插件创建受控 ClassLoader，可让插件依赖隔离；公共接口必须由共享父加载器加载，插件实现由子加载器加载，否则即使接口名相同也会出现 ClassCastException。卸载插件时要清理线程、ThreadLocal、JDBC 驱动和静态缓存，否则 ClassLoader 仍被引用，相关类与 Metaspace 无法回收。

**递进追问：**

1. **为什么相同全限定类名仍可能不能互相强转？**

   类的运行时身份包含定义它的类加载器；不同加载器分别定义的同名类是不同类型。

2. **双亲委派可以被打破吗？**

   可以在受控场景改写加载顺序或使用上下文加载器，但必须明确隔离、安全与类型共享边界。

**易错点：**

- 把 Bootstrap ClassLoader 描述成一定可直接获取的普通 Java 实例。
- 插件接口和实现各自加载一份，导致同名类型无法转换。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 12：执行、加载与初始化](https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html)
- [技术校准：Java 21 模块系统 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/module/package-summary.html)

校验日期：2026-08-05

## Q85：Java 堆、Metaspace 与直接内存分别由谁使用和限制？

**短回答：**

Java 堆主要承载对象实例，Metaspace 在 HotSpot 中承载类元数据，直接内存位于堆外并常被 NIO 使用；三者有不同上限、回收触发与诊断指标。

**原理：**

堆由垃圾收集器管理，通常受 `-Xms/-Xmx` 约束。Metaspace 使用本地内存保存类元数据，类卸载依赖其定义类加载器及相关 Class 不再可达，可用 `-XX:MaxMetaspaceSize` 限制。ByteBuffer.allocateDirect 等可能申请直接缓冲区，内存不计入 Java 堆已用量，但仍计入进程 RSS 和容器限额，并受直接内存上限及 Cleaner 回收时机影响。线程栈、代码缓存、GC 辅助结构与 native 库也消耗进程内存，因此 `Xmx` 不能等同于进程最大占用。

![Java 进程中堆、Metaspace、直接内存和线程栈的边界与限制图](/content/diagrams/java-foundations/jvm-memory-v1.svg "Xmx 只约束 Java 堆；容量规划还要给类元数据、直接缓冲区、线程栈和本地组件留出余量。")

**代码 / 场景：**

容器限制 2GB 时把 `-Xmx2g` 设满很危险：直接缓冲区、线程栈和元数据没有余量，进程可能被 cgroup OOM 杀死且没有 Java heap dump。容量规划应同时观察 GC 堆指标、Native Memory Tracking、线程数量、direct buffer pool 和容器 memory.events。

**递进追问：**

1. **Metaspace 满一定说明类数量很多吗？**

   不一定；也可能是反复创建无法卸载的类加载器、动态生成类或元数据上限过小，需要按类加载器和类数量继续定位。

2. **DirectByteBuffer 对象本身完全位于堆外吗？**

   缓冲区引用与管理对象仍在 Java 堆中，真正的大块数据区域位于堆外；对象回收与 Cleaner 才会推进本地内存释放。

**易错点：**

- 把 `-Xmx` 直接当作 Java 进程或容器的总内存上限。
- 只看 heap usage 就断言没有内存问题，忽略直接内存、线程栈和元数据。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)
- [技术校准：JDK 21 Native Memory Tracking](https://docs.oracle.com/en/java/javase/21/vm/native-memory-tracking.html)
- [技术校准：Java 21 java.nio 包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)

校验日期：2026-08-05

## Q86：JVM 如何判断对象已经死亡，GC Roots 通常包括哪些引用？

**短回答：**

主流 JVM 使用可达性分析：从一组 GC Roots 出发沿引用图遍历，不可达对象才有资格回收。常见 Roots 包括线程栈中的活动引用、类静态字段、JNI 句柄以及 JVM 内部保持的活跃对象。

**原理：**

引用计数无法处理循环引用，因此 Java GC 以对象图可达性为核心。一次不可达并不等于立即回收：软、弱、虚引用有各自处理语义，带终结机制的旧代码还可能延迟对象生命周期，但 finalize 已被弃用，不应依赖“复活”。类卸载还要求该类实例、Class 对象和定义类加载器等都不再可达。GC Roots 的精确集合随 JVM 实现与收集器变化，回答时重点说明线程活动栈、本地引用、静态引用和运行时内部根。内存泄漏的本质常是对象业务上无用却仍从 Root 可达，例如静态 Map、监听器、ThreadLocal 或未关闭资源链。

**代码 / 场景：**

缓存条目过期却只标记状态、不从静态 Map 删除时，它仍从类静态字段可达，GC 无法回收。排查堆增长时获取 heap dump，用支配树和到 GC Roots 的引用链定位是谁保留对象，再修复生命周期；不能通过频繁 `System.gc()` 解决仍然可达的泄漏。

**递进追问：**

1. **两个对象互相引用会不会永远无法回收？**

   不会。只要这组对象整体不再从任何 GC Root 可达，可达性分析仍会把它们判为可回收。

2. **不可达对象会立刻释放吗？**

   不保证。收集器何时运行及引用处理都有时机，Java 只保证在需要时按内存管理策略处理，并不提供确定析构时间。

**易错点：**

- 仍用引用计数解释 Java GC，错误认为循环引用一定泄漏。
- 看到对象未回收就调用 System.gc，而不检查到 GC Roots 的保留链。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)
- [技术校准：Java 21 引用对象 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ref/package-summary.html)
- [技术校准：JDK 21 GC 调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)

校验日期：2026-08-05

## Q87：标记-清除、标记-复制、标记-整理算法有什么取舍？

**短回答：**

标记-清除回收不可达对象但可能产生碎片；标记-复制把存活对象复制到另一片区域，分配快但需要额外空间；标记-整理把存活对象向一端移动，减少碎片却增加移动和停顿成本。收集器通常按区域和存活率组合使用。

**原理：**

三类算法首先都需要识别存活对象，差异在回收与布局方式。清除算法只把死亡空间放回空闲集合，速度直接但长期可能难以找到连续大块。复制算法成本与存活对象数量更相关，适合大部分对象很快死亡的区域；它还让新分配可继续指针碰撞。整理算法移动对象并修正引用，获得连续空间，适合存活率高但对停顿和并发更新要求更高的区域。现代区域化收集器不是简单把一种算法用于整个堆，而是选择回收收益高的 Region，并通过转移完成局部整理。任何算法都要考虑 STW、写屏障、并发标记和浮动垃圾等实际成本。

**代码 / 场景：**

新生代大量短命请求对象适合复制式回收；长期运行服务若堆碎片导致大对象分配失败，需要观察收集器的整理与 Region 行为。选择算法不能只看吞吐，低延迟服务还要比较暂停分位数、CPU 余量和额外内存。

**递进追问：**

1. **复制算法是否一定浪费一半内存？**

   不一定。经典半区模型便于理解，现代分代和区域化收集器会按实际区域、存活率与晋升策略组织空间。

2. **为什么对象移动后引用仍然有效？**

   收集器在安全点或并发协议下更新相关引用，并通过转发表、屏障等机制维持一致性；具体方式取决于收集器。

**易错点：**

- 把算法名称与某个固定年代一一绑定，忽略现代收集器的区域化组合。
- 只比较平均停顿，不观察 p99 暂停、CPU 和内存冗余。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JDK 21 GC 调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)

校验日期：2026-08-05

## Q88：强引用、软引用、弱引用与虚引用的可达性语义有什么不同？

**短回答：**

强引用保持普通可达对象存活；软引用可在内存压力下被清理，弱引用会更积极地被处理，虚引用用于在对象进入 phantom reachable 后配合队列接收清理通知。

**原理：**

引用对象把业务引用包装成不同强度，垃圾收集器依据可达性级别处理 referent。SoftReference 的清理策略由实现和内存压力决定，不能承诺固定缓存时长；WeakReference 适合不应阻止 key 或元数据回收的关联，但读取后仍要处理 referent 已消失；PhantomReference 的 get 始终返回 null，必须配合 ReferenceQueue 和额外状态完成堆外资源等后处理。任何引用类型都不能替代显式 close，引用处理时间也不是实时调度。

**代码 / 场景：**

图片缓存若需要容量、命中率和过期时间可预测，应使用有界缓存策略，而不是把 SoftReference 当自动缓存。管理堆外句柄时仍以 try-with-resources 为主，Cleaner 或虚引用只作为调用方遗漏关闭时的兜底，并监控队列消费积压。

**递进追问：**

1. **WeakHashMap 为什么仍可能泄漏 value？**

   它只弱引用 key；若 value 直接或间接强引用回 key，就会形成从 map 到 value 再到 key 的强路径，key 不能按预期回收。

2. **虚引用能否告诉业务对象精确的回收时刻？**

   不能。它只会在 GC 按规范处理可达性后进入队列，实际收集与队列消费都没有实时性保证，不应承担业务时序。

**易错点：**

- 使用软引用实现必须精确控制容量和 TTL 的核心业务缓存。
- 依赖引用队列代替显式资源释放，却没有兜底线程和积压监控。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：Java 21 引用对象 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ref/package-summary.html)
- [技术校准：JDK 21 GC 调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)

校验日期：2026-08-05

## Q89：Minor GC、Major GC、Full GC 怎样区分，G1、ZGC 该如何选？

**短回答：**

Minor/Young GC 主要处理年轻代，Major 一词在不同工具中可能含义不一，Full GC 通常指覆盖整个堆并可能处理类元数据的重型回收。G1 追求可预测暂停与通用吞吐，ZGC 侧重超大堆和极低暂停；应按目标 JDK、延迟、吞吐和内存余量实测。

**原理：**

代际假设认为多数对象朝生夕死，因此年轻代更频繁回收，存活对象经复制和年龄增长后晋升。G1 把堆划为 Region，执行 Young 与 Mixed 回收，并依据暂停目标选择回收集合；Full GC 往往意味着并发周期来不及、分配或晋升失败等压力，成本较高。ZGC 将大量标记和转移工作并发化，使暂停通常与堆大小弱相关，但会付出 CPU、屏障和额外内存成本。CMS 是历史收集器，在现代 JDK 已移除，不应作为新项目默认候选。GC 日志里的名词和触发原因比口头“Major”更可靠，优化应先减少异常分配和内存保留。

**代码 / 场景：**

在线交易服务先以 G1 的默认配置建立基线，观察分配速率、晋升、暂停分位数和并发周期。如果数百 GB 堆仍要求毫秒级暂停并有足够 CPU/内存，可在目标硬件上评估 ZGC。遇到频繁 Full GC，先查看触发原因和 heap dump，而不是只调大堆或缩短暂停目标。

**递进追问：**

1. **G1 的 Mixed GC 回收什么？**

   它会在处理年轻代的同时选择部分垃圾收益较高的老年代 Region 回收，不等同于覆盖整个堆的 Full GC。

2. **为什么 Major GC 这个词要谨慎？**

   不同收集器、监控工具和文章对它的定义不完全一致，诊断时应看具体 GC 类型、覆盖区域和触发原因。

**易错点：**

- 仍把 CMS 当现代 JDK 的默认可选收集器，不说明版本背景。
- 只凭“ZGC 低延迟”切换收集器，不测 CPU、吞吐、内存余量和目标延迟。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JDK 21 GC 调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)
- [技术校准：JDK 21 jcmd 工具说明](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)

校验日期：2026-08-05

## Q90：OutOfMemoryError 与 StackOverflowError 应如何按内存区域定位？

**短回答：**

两类错误都不是简单的“机器没内存”：OOM 可能来自堆、Metaspace、直接内存或线程创建，StackOverflowError 通常来自单线程调用栈耗尽，证据与处理路径不同。

**原理：**

Java heap space 常见于存活集超过堆容量或单次大分配失败；Metaspace 指向类元数据增长；Direct buffer memory 涉及堆外缓冲区；unable to create native thread 还受进程地址空间、线程栈和系统限额影响。StackOverflowError 多由无限递归、过深对象遍历或过大的单帧需求触发。错误消息不是完整根因，容器被内核直接杀死时甚至来不及抛 Java 异常。需要结合 heap dump、类直方图、线程数、NMT、GC 日志和系统事件逐层确认。

**代码 / 场景：**

接口发布后出现 StackOverflowError，应先从栈迹找重复调用链，常见原因包括双向对象 `toString`、递归映射和代理自调用；不要先改 `-Xss`。若报 heap OOM，则保留首个现场并比较 dominator tree 与到 GC Roots 路径，确认是泄漏还是容量确实不足。

**递进追问：**

1. **捕获 OutOfMemoryError 后继续提供服务可靠吗？**

   通常不可靠，因为关键分配可能继续失败且进程状态已受影响；最多做极小、预分配的诊断或受控退出，不应把捕获当常规恢复策略。

2. **减小每线程 `-Xss` 一定能解决 native thread OOM 吗？**

   它可能降低单线程地址空间占用，但若根因是线程无界创建、系统进程限制或容器内存不足，仍必须修复任务模型和容量约束。

**易错点：**

- 看到 OOM 就盲目增大 `-Xmx`，完全不区分具体内存区域。
- 用扩大线程栈掩盖无限递归，导致每线程占用更大并降低可创建线程数。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：JavaGuide：类加载过程详解](https://javaguide.cn/java/jvm/class-loading-process.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)
- [技术校准：JDK 21 jcmd 工具说明](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)

校验日期：2026-08-05

# JVM 排查与现代 Java

## Q91：内存泄漏和内存溢出有什么区别，Java 为什么有 GC 仍会泄漏？

**短回答：**

内存泄漏是已无业务价值的对象仍被引用、无法回收；内存溢出是进程无法再满足分配请求。泄漏会逐步导致 OOM，但 OOM 也可能只是容量不足、瞬时流量、大对象、线程过多或堆外内存耗尽。

**原理：**

GC 只能回收从 GC Roots 不可达的对象，不理解“这条缓存业务上已经过期”。静态集合、无上限缓存、未注销监听器、ThreadLocal value、类加载器、未关闭资源以及错误的队列积压都会让对象继续可达。不同错误信息指向不同区域：`Java heap space` 关注堆，`Metaspace` 关注类元数据和类加载器，`Direct buffer memory` 关注直接缓冲区，`unable to create native thread` 还涉及线程栈和系统限制，StackOverflowError 常由递归或栈帧过深触发。定位要结合趋势、日志、dump 与业务流量，不能看到 OOM 就一律增大 Xmx。

**代码 / 场景：**

若老年代使用量在每轮完整回收后仍持续抬升，可在可控时机保存 heap dump，对比支配树和到 GC Roots 的路径，定位静态 Map 或监听器链。若堆稳定但 RSS 上升，再检查直接内存、线程数量、native 库和 NMT。修复后用相同压测验证回收基线恢复，并设置容量与告警。

**递进追问：**

1. **OOM 一定说明存在内存泄漏吗？**

   不一定。合理存活数据超过配置、突发分配、堆外耗尽或线程数过多都可能 OOM，需要按内存区域和对象保留链判断。

2. **为什么加大堆可能只是延后故障？**

   若对象被错误长期持有，增长趋势不变，更大堆只延长填满时间，还可能增加回收成本和 dump 体积。

**易错点：**

- 遇到任何 OOM 都只增加 Xmx，不区分堆、元空间、直接内存和线程。
- 只看一次内存快照下结论，不结合 GC 后基线、流量和多次 dump 对比。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JVMS 2：运行时数据区](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html)
- [技术校准：JDK 21 Native Memory Tracking](https://docs.oracle.com/en/java/javase/21/vm/native-memory-tracking.html)
- [技术校准：JDK 21 jcmd 工具说明](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)

校验日期：2026-08-05

## Q92：线上 CPU 飙高、死锁、频繁 GC 和内存增长分别怎样用 JVM 工具排查？

**短回答：**

先保留现场再分类：CPU 高看线程与热点栈，死锁看线程转储，GC 异常看 GC 日志与堆趋势，内存增长看 heap dump、类直方图和 Native Memory Tracking。`jcmd`、JFR、线程 dump 与 heap dump 要结合指标时间线使用。

**原理：**

CPU 飙高时先定位进程和高 CPU 线程，把操作系统线程 id 与 Java dump 中的线程对应，连续采样确认持续热点；JFR 能同时观察执行采样、锁、分配和 GC。怀疑死锁可用 `jcmd <pid> Thread.print -l` 或等价工具查看监视器等待环。频繁 GC 要区分分配速率过高、堆容量、晋升失败、并发周期来不及和真实泄漏，解析统一 GC 日志而不是只看次数。堆增长可先用类直方图低成本观察，再在磁盘与停顿预算允许时 dump；进程 RSS 大于堆则用 NMT、直接内存、线程栈和 native 库继续拆分。诊断命令可能有停顿和 I/O 成本，生产执行前必须评估。

**代码 / 场景：**

告警发生后记录请求量、CPU、堆/非堆、GC 暂停、线程池和版本信息。CPU 问题先抓 3 次间隔线程 dump 判断热点是否稳定；内存问题在 GC 后基线持续上升时采样直方图并保留 dump。修复后重放相同负载，比较分配率、保留集与 p99 暂停，而不是仅凭“服务不再 OOM”验收。

**递进追问：**

1. **为什么线程 dump 要连续抓多次？**

   一次快照可能只是线程偶然经过某段代码；多次采样能区分持续热点、锁等待和瞬时状态。

2. **heap dump 为什么不能随时直接抓？**

   大堆转储可能触发明显停顿、占用大量磁盘并包含敏感数据，需要提前评估空间、合规和业务窗口。

**易错点：**

- 线上故障先重启且不保留任何日志、dump 和版本现场。
- 把进程 RSS 全部归因于 Java 堆，忽略直接内存、线程栈和 native 组件。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JDK 21 jcmd 工具说明](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html)
- [技术校准：JDK 21 Native Memory Tracking](https://docs.oracle.com/en/java/javase/21/vm/native-memory-tracking.html)
- [技术校准：JDK 21 GC 调优指南](https://docs.oracle.com/en/java/javase/21/gctuning/)

校验日期：2026-08-05

## Q93：record 适合表达什么，为什么它不等于任意不可变对象？

**短回答：**

Java 16 正式提供 record，用紧凑语法声明以状态分量为核心的数据载体，并自动得到访问器、构造器契约及基于分量的 equals、hashCode、toString；但分量对象仍可能可变。

**原理：**

record 隐式继承 java.lang.Record，不能再继承其他类，但可以实现接口。每个分量对应 private final 字段和同名访问器，规范构造器负责给全部分量赋值；紧凑构造器适合校验和规范化输入。自动 equals 比较相同 record 类的分量，hashCode 与 toString 也基于分量。final 只固定字段引用，若分量是可变 List、数组或 Date，外部仍可能修改内部状态，因此需要防御性复制。record 也不适合依赖无参构造、可变代理或实体身份的框架模型。

**代码 / 场景：**

`record Page<T>(List<T> items, int total) { Page { items = List.copyOf(items); } }` 能在构造时封住列表结构；若元素本身可变，还要评估元素复制。JPA 实体通常更需要稳定身份、生命周期与代理，不应仅为了少写 getter 强改为 record。

**递进追问：**

1. **record 的访问器为什么不是传统 JavaBean getter？**

   分量 `name` 生成的是 `name()`，而非 `getName()`；依赖 Bean 命名约定的旧框架需要确认是否支持 record 元数据。

2. **可以在 record 中声明额外实例字段吗？**

   不能添加新的非静态实例字段，实例状态由 record header 中的分量完整描述；可以声明静态成员、方法和实现接口。

**易错点：**

- 看到字段是 final 就断言 record 深度不可变，忽略可变分量对象。
- 把带实体身份和框架代理需求的持久化模型机械改成 record。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 8.10：Record 类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.10)
- [技术校准：Java 21 Object API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html)

校验日期：2026-08-05

## Q94：sealed class 如何约束继承集合并帮助穷尽性检查？

**短回答：**

Java 17 正式提供密封类与接口，通过 permits 限制直接子类型；获准子类型必须继续声明为 final、sealed 或 non-sealed，使领域层级边界明确可见。

**原理：**

sealed 声明可以显式列出 permitted direct subclasses，也可在满足同一编译单元等规则时推断。直接子类型必须选择终止继承、继续密封或重新开放，形成可审计的层级。因为编译器能够知道封闭的类型集合，配合模式匹配 switch 时可以做更强的穷尽性检查。密封性只约束继承，不限制对象创建数量，也不自动实现不可变。跨模块使用还受 named module 或包等可访问范围约束，不能把 permits 当运行时插件注册表。

**代码 / 场景：**

支付结果可以定义 `sealed interface PayResult permits Success, Declined, RetryableFailure`，业务 switch 必须处理每个分支；第三方支付插件则不适合密封，因为其实现集合需要独立扩展，应改用普通接口和 ServiceLoader 或显式注册。

**递进追问：**

1. **non-sealed 子类会发生什么？**

   它重新开放从该分支继续继承，后续子类不再需要出现在原 sealed 类型 permits 列表中，因此穷尽推理只能基于直接层级语义。

2. **sealed 与 final 的区别是什么？**

   final 完全禁止继续继承；sealed 允许一组受控的直接子类型，并要求这些子类型明确下一步是封闭、继续受控还是开放。

**易错点：**

- 把 sealed 当作对象不可变或单例机制，而不是继承边界。
- 在需要第三方自由扩展的 SPI 上使用 sealed，破坏插件生态。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 8.1.6：密封类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.1.6)
- [技术校准：JLS 8：类](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html)

校验日期：2026-08-05

## Q95：switch 表达式的箭头分支和 yield 如何减少穿透错误？

**短回答：**

Java 14 正式提供 switch 表达式：箭头分支默认不穿透，多语句分支用 yield 提供结果，编译器还会检查穷尽性和每条可达路径是否完成求值。

**原理：**

传统冒号标签仍可用于语句或表达式，但保留穿透语义；箭头标签只执行右侧表达式、块或 throw，不需要 break。作为表达式时，每个正常完成的分支必须提供兼容结果，块内使用 yield 而不是 return 把值交给 switch。对 enum 和封闭类型，编译器可利用已知分支检查穷尽性；即使省略显式 default，编译产物也会考虑二进制演进出现未知常量的情况。null 处理则取决于所用模式与版本规则，不能默认所有 switch 都安全接受 null。

**代码 / 场景：**

`var fee = switch (level) { case VIP -> 0; case NORMAL -> 10; case UNKNOWN -> { audit(); yield 20; } };` 把赋值和分支绑定在一起。迁移旧 switch 时要先确认原代码是否故意利用穿透，不能机械替换冒号。

**递进追问：**

1. **yield 与 return 的作用域有什么不同？**

   yield 只结束当前 switch 表达式分支并提供其值；return 结束整个方法或 lambda，不能拿来替代普通的 switch 分支结果。

2. **enum switch 已覆盖全部常量，为何仍要关注版本升级？**

   调用方编译后可能遇到运行期新增枚举常量；即使源码看似穷尽，跨版本二进制演进仍需测试异常路径和兼容策略。

**易错点：**

- 在箭头分支后继续写 break，混淆新旧两套控制流。
- 机械迁移存在有意穿透的旧 switch，导致行为变化却没有回归测试。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 15.28：switch 表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.28)
- [技术校准：JLS 14：语句与控制流](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html)

校验日期：2026-08-05

## Q96：instanceof 与 switch 的模式匹配怎样结合类型检查和变量绑定？

**短回答：**

instanceof 类型模式在 Java 16 正式提供，switch 模式匹配在 Java 21 正式提供；它们把测试、转换和变量绑定结合，并检查作用域、支配关系与穷尽性。

**原理：**

`obj instanceof String s` 只有匹配成功路径才让 s 进入作用域，流敏感分析允许在 `&&` 右侧使用 s，却不允许在可能未匹配的路径使用。模式 switch 按标签顺序和支配关系匹配，更宽泛的类型不能挡在更具体类型之前；守卫条件可进一步细分。对 sealed 层级可做穷尽检查，并可显式处理 null。模式匹配减少手工强转，但不会改变运行时类型系统，也不能绕过泛型擦除去匹配 `List<String>`。

**代码 / 场景：**

处理 `Object payload` 时可写 `if (payload instanceof String text && !text.isBlank())`，避免重复强转。使用 switch 解析事件层级时，把 `case Payment p when p.amount() > 0` 放在普通 Payment 分支之前，并为 null 与未知开放实现保留明确策略。

**递进追问：**

1. **为什么不能写 `obj instanceof List<String> list`？**

   参数化类型的实际类型实参通常被擦除，运行时无法可靠区分 List<String> 与 List<Integer>，只能匹配可具体化类型如 List<?>。

2. **模式变量可以在 `||` 右侧使用吗？**

   通常不能，因为左侧匹配失败时仍可能求值右侧，此时变量没有成功绑定；编译器按控制流确保变量只在确定匹配的路径可用。

**易错点：**

- 把模式匹配理解成运行时保留完整泛型实参。
- 把宽泛 Object 分支放在具体类型之前，造成后续模式被支配而不可达。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 14.30：模式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.30)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-05

## Q97：文本块解决了哪些多行字符串问题，又会保留哪些空白语义？

**短回答：**

Java 15 正式提供文本块，用三引号表达多行字符串并统一处理共同缩进，减少 JSON、SQL 和 HTML 的转义噪声；它仍是普通 String。

**原理：**

文本块在编译期经过换行规范化、附带缩进移除和转义处理，开头分隔符后通常需要换行。关闭分隔符的位置会影响共同缩进，`\s` 可显式保留空格，行末反斜线可抑制换行。它不是模板字符串，不会自动把 `${name}` 替换为变量，也不会验证其中 JSON 或 SQL 的语法。编译结果仍是 String，因此与等价普通字符串的 equals 语义相同，并可能成为编译期常量。

**代码 / 场景：**

测试夹具可以用文本块保存 JSON，再交给真实解析器校验；SQL 仍应使用参数化查询，不能因为文本块可读就字符串拼接用户输入。若快照测试对换行敏感，应显示断言最终字符串或使用 `stripIndent`，不要靠编辑器外观猜测。

**递进追问：**

1. **文本块会自动使用当前操作系统换行符吗？**

   源代码中的行终止符会按语言规则规范化，不能把文本块当作平台原生行分隔符生成器；需要平台换行时应明确处理。

2. **为什么关闭分隔符向左或向右移动会改变结果？**

   它参与计算附带缩进边界，位置变化可能改变每行被移除的共同空白；应通过测试确认序列化协议中的精确字符。

**易错点：**

- 把文本块当成带变量插值和语法校验的模板语言。
- 仅凭编辑器显示判断精确空白，忽略缩进裁剪与尾随换行。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html)
- [技术校准：JLS 15：表达式](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html)

校验日期：2026-08-05

## Q98：Java 模块系统中的 requires、exports 与 opens 各控制什么？

**短回答：**

Java 9 引入模块系统：`requires` 声明模块依赖，`exports` 控制公开包，`opens` 主要允许深反射访问；模块边界位于类的 public 可见性之外。

**原理：**

module-info.java 为 named module 描述可读性与可访问性。一个 public 类只有位于被 exports 的包中，其他读取该模块的模块才能按普通方式使用。opens 可以对所有模块或特定模块开放包的深反射，不等于导出普通 API；open module 则整体开放反射。requires transitive 会让依赖可沿 API 暴露，requires static 可表达编译时需要而运行时可选。classpath 上的 unnamed module 与 module path 行为不同，迁移框架时常见问题是反射访问被模块边界拒绝。

**代码 / 场景：**

实体模块只需让 Hibernate 反射字段时，可用定向 `opens com.example.entity to org.hibernate.orm.core`，不必把整个包 exports 给所有调用方。迁移前用 jdeps 检查依赖，但仍需集成测试代理、序列化和测试框架的反射路径。

**递进追问：**

1. **包中类声明 public 后是否自动对其他模块可见？**

   不是。目标模块还必须 exports 该包，调用模块也要读取目标模块；类级 public 与模块级导出两层条件缺一不可。

2. **exports 能替代 opens 让框架访问 private 字段吗？**

   不能。exports 支持公开成员的正常访问，深反射访问非公开成员通常需要 opens，并仍受具体反射 API 与安全约束影响。

**易错点：**

- 把 exports 和 opens 都理解成简单的“公开包”，忽略正常访问与深反射差异。
- 为解决一个反射错误直接声明 open module，扩大整个模块的封装面。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：Java 21 模块系统 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/module/package-summary.html)
- [技术校准：Java 21 Reflection API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html)

校验日期：2026-08-05

## Q99：虚拟线程为什么适合阻塞式高并发 I/O，却不提高 CPU 密集计算吞吐？

**短回答：**

Java 21 正式提供虚拟线程；它是 JVM 调度的轻量 Thread，能让大量阻塞式任务保持直接风格并在阻塞时释放载体线程，但不会增加 CPU 核心。

**原理：**

平台线程通常映射昂贵的操作系统线程，虚拟线程由 JVM 在较少 carrier threads 上调度。遇到支持的阻塞操作时，虚拟线程可卸载，载体去运行其他任务，因此 thread-per-request 在 I/O 等待占比高时更易扩展。它仍遵守 Thread API 和内存模型，不应池化虚拟线程来复用稀缺资源；数据库连接等真正稀缺资源仍需信号量或连接池限流。长时间 CPU 计算会持续占用载体和核心，某些 native 或同步场景还可能造成 pinning，必须用 JFR 和负载测试确认。

**代码 / 场景：**

聚合服务并发调用三十个下游时，可为每个请求创建虚拟线程并保持同步代码，但数据库连接池仍限制为容量值，并设置超时和取消。若任务是图片编码或模型推理，虚拟线程不会凭空增加 CPU，应使用有界并行度和任务队列。

**递进追问：**

1. **虚拟线程是否应该放进固定大小线程池？**

   通常不应该，虚拟线程本身廉价且设计为按任务创建；需要限制的应是数据库连接、外部 QPS 或内存等稀缺资源，而非线程对象数量。

2. **ThreadLocal 在虚拟线程中还能使用吗？**

   语义上可以且每个虚拟线程独立，但海量线程上的大对象 ThreadLocal 会放大内存占用；上下文传递与生命周期仍需谨慎设计。

**易错点：**

- 把虚拟线程宣传成让 CPU 密集任务线性加速的并行计算方案。
- 取消所有下游限流，误以为线程轻量就代表数据库和远端服务容量无限。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JEP 444：Virtual Threads](https://openjdk.org/jeps/444)
- [技术校准：Java 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)

校验日期：2026-08-05

## Q100：升级 Java 版本时为什么要区分源码、二进制和行为兼容？

**短回答：**

源码兼容关注能否重新编译，二进制兼容关注旧 Class 能否链接，行为兼容关注同一程序运行结果是否改变；版本升级必须分别验证，不能只看编译通过。

**原理：**

删除方法、改变字段静态性或不兼容的层级修改可能让旧字节码在链接时抛 NoSuchMethodError、IncompatibleClassChangeError 等；新增重载则可能使重新编译后的方法选择改变，即源码能编译但行为不同。标准库实现、GC、默认字符集、强封装和反射限制也可能改变运行表现。`--release` 能控制编译目标，却不验证第三方依赖、代理、JNI 和运行参数。可靠升级要固定构建工具链，扫描内部 API，重编译并跑单元、集成、性能和回滚测试。

**代码 / 场景：**

从 Java 8 升到 21 时，先在 CI 生成依赖与 jdeps 报告，清理 `sun.*` 使用，再用目标 JDK 全量重编译。灰度阶段比较 GC、启动时间、线程、TLS 与序列化行为；保留旧 JDK 构建物，避免只升级运行时后无法快速回滚。

**递进追问：**

1. **旧 jar 在新 JDK 上能启动是否证明兼容完成？**

   不能。冷门路径可能尚未加载相关类，反射、序列化、时区、加密和性能变化也可能只在特定请求或数据下出现。

2. **为什么新增一个重载也可能改变客户端行为？**

   客户端重新编译时会按新的候选集合重新做重载解析，可能选中更具体的新方法；旧字节码则仍引用原方法描述符，两者结果可能不同。

**易错点：**

- 把“能启动”和“编译通过”当作版本升级全部验证。
- 只升级本地 JDK，不固定 CI、生产镜像、编译 `--release` 和回滚构建物。

**参考来源：**

- [高频题库参考（内容已重写）：JavaGuide：Java 内存区域详解](https://javaguide.cn/java/jvm/memory-area.html)
- [高频题库参考（内容已重写）：JavaGuide：JVM 垃圾回收详解](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
- [高频题库参考（内容已重写）：小林 Coding：Java 虚拟机面试题](https://www.xiaolincoding.com/interview/jvm.html)
- [技术校准：JLS 13：二进制兼容性](https://docs.oracle.com/javase/specs/jls/se21/html/jls-13.html)
- [技术校准：JVMS 4：Class 文件格式](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html)

校验日期：2026-08-05
