import { CURATED, OFFICIAL } from './shared.js'

const question = (title, summary, mechanism, example, followUps, pitfalls, sources) => ({
  title,
  summary,
  mechanism,
  example,
  followUps: followUps.map(([followUpQuestion, answer]) => ({ question: followUpQuestion, answer })),
  pitfalls,
  sources,
})

const OVERRIDES = {}

const SECTION_TITLES = [
  'Java 高频基础与语言机制',
  '面向对象、String 与 Object 契约',
  '异常、泛型、反射与注解',
  '集合源码高频：List、HashMap 与并发容器',
  '集合实战、Lambda 与 Stream',
  'I/O、NIO 与序列化',
  '线程基础、线程池与异步任务',
  'JMM、锁、CAS 与并发安全',
  'JVM 内存、类加载与垃圾回收',
  'JVM 排查与现代 Java',
]

const SECTION_GUIDES = [
  [CURATED.javaGuideBasics01, CURATED.xiaolinJava],
  [CURATED.javaGuideBasics01, CURATED.xiaolinJava],
  [CURATED.javaGuideBasics02, CURATED.javaGuideBasics03, CURATED.xiaolinJava],
  [CURATED.javaGuideCollections01, CURATED.javaGuideCollections02, CURATED.xiaolinCollections],
  [CURATED.javaGuideCollections01, CURATED.javaGuideCollections02, CURATED.xiaolinCollections],
  [CURATED.javaGuideIndex, CURATED.xiaolinJava],
  [CURATED.javaGuideConcurrent01, CURATED.javaGuideThreadPool, CURATED.xiaolinJuc],
  [CURATED.javaGuideConcurrent02, CURATED.javaGuideConcurrent03, CURATED.xiaolinJuc],
  [CURATED.javaGuideMemory, CURATED.javaGuideGc, CURATED.javaGuideClassLoading, CURATED.xiaolinJvm],
  [CURATED.javaGuideMemory, CURATED.javaGuideGc, CURATED.xiaolinJvm],
]

Object.assign(OVERRIDES, {
  2: question(
    'JDK、JRE、JVM 和字节码是什么关系，Java 为什么能跨平台？',
    'JDK 用来开发并包含运行工具，JRE 是传统意义上的运行环境，JVM 负责执行字节码；Java 先编译为面向 JVM 的 `.class`，再由各平台上的 JVM 实现解释或编译为本机代码，因此实现“一份字节码、多平台运行”。',
    '源文件由 `javac` 编译为符合 Class File 规范的字节码。类加载器把字节码装入 JVM，验证、链接并初始化后，执行引擎可解释执行，也可把热点代码交给 JIT 编译为机器码。跨平台并不是 JVM 自己没有平台差异，而是 Windows、Linux 等平台各自提供兼容规范的 JVM，把同一套字节码映射到不同指令集。JDK 还包含编译、诊断和打包工具；从模块化 JDK 开始，生产运行时可以按模块裁剪，不应再死背“JRE 一定是 JDK 目录里的固定子目录”。面试回答要区分语言规范、JVM 规范和某个 HotSpot 实现，避免把实现细节说成所有 JVM 的保证。',
    '排查“本机能跑、服务器不能跑”时，先确认编译目标版本与生产 JVM 版本：用 Java 21 编译出的高版本 Class 文件不能直接交给 Java 8 JVM。构建中可使用 `--release` 固定目标平台，再用同版本容器镜像做集成测试；JNI、本地字体、默认字符集和文件路径等平台资源仍可能破坏应用层的跨平台性。',
    [
      ['Java 是编译型还是解释型语言？', '更准确的回答是编译与运行时执行并存：源码先编译为字节码，JVM 实现可以解释字节码，也可以通过 JIT 或 AOT 转成本机代码。'],
      ['JDK 21 还需要单独安装 JRE 吗？', '通常不需要。现代 JDK 已包含运行所需模块，也可用 jlink 制作定制运行时；部署时更应关注实际运行镜像和模块依赖。'],
    ],
    ['把跨平台理解成任何 Java 程序都不依赖操作系统资源。', '只检查 `java -version`，不检查 Class 文件版本、构建目标和第三方本地依赖。'],
    [OFFICIAL.jvmsClassFile, OFFICIAL.jvmsRuntime],
  ),
  8: question(
    'Java 为什么说是“编译与解释并存”，JIT 在什么时候发挥作用？',
    '源码先由 `javac` 编译为字节码；运行时 JVM 可以先解释执行，并把频繁执行的热点方法编译为优化后的机器码。两条执行路径共同兼顾启动速度、可移植性和长期运行性能。',
    '字节码是稳定的中间表示，不等于逐行源码解释。以 HotSpot 为例，方法最初可能由解释器执行，同时收集调用次数、分支概率和类型分布；达到阈值后进入分层编译，JIT 可做内联、逃逸分析和无用检查消除。优化依赖运行时假设，如果之后加载的新类型使假设失效，JVM 可以去优化并回到较保守的执行路径。规范并不要求所有 JVM 采用完全相同的解释器和编译器，所以回答时应把“HotSpot 常见实现”与“Java/JVM 规范承诺”分开。预热、代码形状和真实负载会影响基准，不能用一次冷启动耗时证明 Java 的稳态性能。',
    '接口服务刚启动时延迟偏高，可能同时受到类加载、连接池建立和 JIT 预热影响。应通过 JFR、编译日志和分阶段压测定位，而不是盲目循环调用接口“暖机”。微基准应使用 JMH 避免死代码消除和错误预热；短命 CLI 程序则更关注启动时间，未必能获得热点编译的长期收益。',
    [
      ['JIT 编译后的代码是否永久不变？', '不是。JVM 可能基于运行时画像重新编译，也可能在假设失效时去优化，恢复解释执行或进入另一层编译。'],
      ['为什么生产压测需要预热阶段？', '预热可让类加载、缓存和热点编译进入较稳定状态，从而把冷启动成本与稳态吞吐、延迟分开观察。'],
    ],
    ['把字节码说成 CPU 可以直接执行的机器码。', '用手写循环做微基准，忽略 JIT 的死代码消除、内联和预热效应。'],
    [OFFICIAL.jvmsClassFile, OFFICIAL.hotspotPerformance],
  ),
  10: question(
    'Java 为什么不支持类的多继承，却允许实现多个接口？',
    '类的多继承会让状态布局、构造顺序和同名实现的选择变复杂；Java 让类只继承一个直接父类，同时允许实现多个接口来组合能力契约。接口默认方法发生冲突时，编译器要求按明确规则消解。',
    '继承不仅复用方法，还继承可见状态、初始化过程与可重写行为。若一个类同时继承两个带状态父类，菱形结构中同一祖先状态该保留几份、先调用哪个构造器、同名方法选谁都会增加模型复杂度。接口主要描述类型能力，可多实现；Java 8 之后接口虽可提供 default 方法，但不拥有普通实例字段。冲突规则是：类方法优先于接口默认方法，更具体的子接口优先；两个无继承关系接口提供同签名默认实现时，实现类必须显式重写，并可用 `InterfaceName.super.method()` 选择。工程上也不应把“允许多接口”理解成鼓励巨型接口，仍需按职责拆分。',
    '一个 `CachedUserRepository` 可以继承单一抽象基类获得模板流程，同时实现 `UserRepository`、`HealthChecked` 和 `Closeable` 等小接口。若 `A` 与 `B` 都定义 `default String name()`，实现类必须自己决定组合规则。业务能力复用优先考虑组合对象，而不是继续加深继承树。',
    [
      ['接口能有状态吗？', '接口字段隐式为 `public static final`，属于类型常量而非每个实例的可变状态；实例状态仍由实现类或组合对象持有。'],
      ['两个接口声明相同抽象方法会冲突吗？', '若方法签名与返回类型兼容，它们可归并为同一个实现契约；真正需要显式消解的常见情况是互不相关接口提供冲突的默认实现。'],
    ],
    ['把接口 default 方法等同于带实例状态的第二父类。', '为复用几行代码建立脆弱继承层级，忽略组合与委托更容易演进。'],
    [OFFICIAL.jlsClasses, OFFICIAL.jlsInterfaces],
  ),
  19: question(
    '`String`、`StringBuilder` 与 `StringBuffer` 有什么区别，拼接时怎样选择？',
    '`String` 不可变，适合值语义、共享和作为键；`StringBuilder` 是可变字符序列，单线程大量拼接通常优先；`StringBuffer` 的主要方法带同步，适合极少数必须共享同一缓冲区的场景，但并不保证一串复合操作天然原子。',
    '每次对 String 做运行期拼接都会产生新的结果值，编译器可把同一表达式中的简单 `+` 优化为拼接配方，但循环内反复扩展仍可能形成多次分配和复制。StringBuilder 内部维护可增长缓冲区，`append` 后最后一次 `toString`，能把意图和生命周期表达得更清楚。StringBuffer 提供同步方法，却只保护单次方法调用；“检查长度后再追加”仍需外部同步。不可变 String 可以安全共享，但其中的敏感内容无法主动擦除；密码等场景可考虑受控的字符数组。面试不要只回答“线程安全不同”，还要说明可变性、分配成本和共享边界。',
    '拼接 SQL 展示文本或生成报表行时，可在方法内部创建 `StringBuilder` 并预估容量；几项固定字段拼接直接使用 `+` 可读性更好，交给编译器处理。多个线程各自构建结果时应使用各自的 builder，而不是因为并发就共享一个 StringBuffer；最后再安全合并结果。',
    [
      ['`StringBuilder` 一定比 `+` 快吗？', '不一定。常量表达式和单个短表达式常被编译器优化；真正需要关注的是循环、未知次数拼接和热点路径，应以生成字节码及基准为依据。'],
      ['`StringBuffer` 能保证“判断后追加”安全吗？', '不能保证整个复合操作。它只同步自己的单次方法，跨多次调用的不变量仍需同一外部锁或改成线程封闭设计。'],
    ],
    ['见到字符串拼接就机械改成 StringBuilder，牺牲简单表达式可读性。', '在线程池任务间共享同一可变缓冲区，依赖单方法同步维持跨调用业务不变量。'],
    [OFFICIAL.string],
  ),
  28: question(
    'JDK 动态代理如何工作，它和基于子类的代理有什么边界？',
    'JDK 动态代理在运行时为一组接口生成代理类，把方法调用转交给 `InvocationHandler`；基于子类的代理通过继承目标类并重写可覆盖方法，因此不能代理 final 类或 final/private 方法。选择依据是类型边界和拦截需求，不是简单比较谁更快。',
    '调用 `Proxy.newProxyInstance` 时要提供合适的类加载器、接口数组和 InvocationHandler。代理对象接到接口调用后进入 `invoke(proxy, method, args)`，处理器可在调用目标前后加入鉴权、事务、重试或观测逻辑。必须特别处理 `equals`、`hashCode`、`toString` 等 Object 方法，并避免在处理器里再次通过 proxy 调用同一方法造成递归。子类代理能覆盖没有接口的类，但构造器、可见性、final 限制和自调用都可能让拦截失效。框架代理还受到模块开放、桥接方法和默认接口方法等因素影响；业务代码应面向稳定接口，少依赖代理实现类身份。',
    '为 `PaymentService` 增加耗时统计时，可以让代理实现该接口，Handler 记录开始时间后反射调用真实对象，并在 `finally` 上报结果。若 Spring 中同一个对象的方法 A 直接调用自身方法 B，调用没有经过外部代理，B 上的事务或切面可能不生效；这不是注解失效，而是调用路径绕过代理。',
    [
      ['为什么 JDK 动态代理通常要求接口？', '生成的代理类通过实现给定接口获得可调用的方法集合；没有接口的普通类不能仅靠 JDK Proxy 直接生成其子类。'],
      ['代理为何容易出现自调用失效？', '拦截发生在经过代理对象的调用边界；目标对象内部用 `this` 调用另一个方法时没有重新进入代理。'],
    ],
    ['在 InvocationHandler 中调用 `method.invoke(proxy, args)`，导致无限递归。', '把代理对象强转为目标实现类，忽略 JDK 代理只保证实现接口。'],
    [OFFICIAL.reflection, OFFICIAL.modules],
  ),
})

Object.assign(OVERRIDES, {
  82: question(
    'Java 对象从 `new` 到可用会经历哪些步骤？',
    'JVM 遇到 new 时先确保目标类已加载和初始化，再为对象分配内存、把实例字段置默认值、设置对象头，随后执行构造器链完成显式初始化，最终把引用交给调用方。分配位置和对象布局属于具体 JVM 实现。',
    '字节码 new 指令引用常量池中的类符号，解析后检查该类是否可实例化。以 HotSpot 常见路径为例，堆空间规整时可用指针碰撞分配，并通过线程本地分配缓冲 TLAB 降低竞争；空间不规整时需要空闲列表等策略。分配后的零值初始化保证构造器执行前字段有语言规定的默认值，随后对象头记录类型、同步和 GC 所需元数据，再依次执行父类构造器、实例字段初始化和当前构造器。JIT 通过逃逸分析可能做标量替换，使源码中的对象不一定真的出现在堆上，因此“所有对象必然在堆分配”不应作为绝对结论。构造期间泄露 this 会让其他线程看到未完成对象。',
    '不可变配置对象应在构造器中完成校验和字段赋值，构造器里不要注册监听器、启动线程或调用可重写方法，以免 this 提前泄露。分析大量短命对象时用 JFR/分配剖析确认热点，再决定减少分配或调整 GC；不要仅凭源码里的 new 数量推测堆压力。',
    [
      ['对象的实例字段何时获得默认值？', 'JVM 分配并初始化对象存储时先设零值，之后构造器链和字段初始化表达式再写入业务值。'],
      ['new 出来的对象一定分配在堆上吗？', '语言语义把对象视为引用对象，但优化后的具体存储由 JVM 决定；逃逸分析可能消除分配或做标量替换。'],
    ],
    ['把 TLAB、对象头具体位布局说成 JVM 规范对所有实现的固定要求。', '在构造器中把 this 发布到其他线程，破坏安全初始化。'],
    [OFFICIAL.jvmsRuntime, OFFICIAL.jlsExecution],
  ),
  84: question(
    '类加载器有哪些，双亲委派模型是什么，为什么需要它？',
    'Java 运行时常见有 Bootstrap、Platform、Application ClassLoader，也可自定义加载器。双亲委派指加载类时先委托父加载器，父级无法完成再由当前加载器查找，用于避免核心类被重复或恶意替换，并维持类型身份的一致边界。',
    'JVM 判断两个类是否相同，不只看全限定名，还要结合定义它们的 ClassLoader。同名 Class 被两个独立加载器定义，会成为两个不兼容类型。典型 `loadClass` 先检查是否已加载，再向父级委派，父级失败后调用自身 findClass；Bootstrap 由虚拟机实现，不一定表现为普通 Java 对象。委派不是不可突破的铁律：SPI 需要父层 API 发现子层实现，容器、模块系统和插件隔离也可能采用线程上下文加载器或受控的子优先策略。但自定义加载必须避免核心包覆盖、类泄漏和跨边界强转失败。',
    '插件系统为每个插件创建受控 ClassLoader，可让插件依赖隔离；公共接口必须由共享父加载器加载，插件实现由子加载器加载，否则即使接口名相同也会出现 ClassCastException。卸载插件时要清理线程、ThreadLocal、JDBC 驱动和静态缓存，否则 ClassLoader 仍被引用，相关类与 Metaspace 无法回收。',
    [
      ['为什么相同全限定类名仍可能不能互相强转？', '类的运行时身份包含定义它的类加载器；不同加载器分别定义的同名类是不同类型。'],
      ['双亲委派可以被打破吗？', '可以在受控场景改写加载顺序或使用上下文加载器，但必须明确隔离、安全与类型共享边界。'],
    ],
    ['把 Bootstrap ClassLoader 描述成一定可直接获取的普通 Java 实例。', '插件接口和实现各自加载一份，导致同名类型无法转换。'],
    [OFFICIAL.jlsExecution, OFFICIAL.modules],
  ),
  86: question(
    'JVM 如何判断对象已经死亡，GC Roots 通常包括哪些引用？',
    '主流 JVM 使用可达性分析：从一组 GC Roots 出发沿引用图遍历，不可达对象才有资格回收。常见 Roots 包括线程栈中的活动引用、类静态字段、JNI 句柄以及 JVM 内部保持的活跃对象。',
    '引用计数无法处理循环引用，因此 Java GC 以对象图可达性为核心。一次不可达并不等于立即回收：软、弱、虚引用有各自处理语义，带终结机制的旧代码还可能延迟对象生命周期，但 finalize 已被弃用，不应依赖“复活”。类卸载还要求该类实例、Class 对象和定义类加载器等都不再可达。GC Roots 的精确集合随 JVM 实现与收集器变化，回答时重点说明线程活动栈、本地引用、静态引用和运行时内部根。内存泄漏的本质常是对象业务上无用却仍从 Root 可达，例如静态 Map、监听器、ThreadLocal 或未关闭资源链。',
    '缓存条目过期却只标记状态、不从静态 Map 删除时，它仍从类静态字段可达，GC 无法回收。排查堆增长时获取 heap dump，用支配树和到 GC Roots 的引用链定位是谁保留对象，再修复生命周期；不能通过频繁 `System.gc()` 解决仍然可达的泄漏。',
    [
      ['两个对象互相引用会不会永远无法回收？', '不会。只要这组对象整体不再从任何 GC Root 可达，可达性分析仍会把它们判为可回收。'],
      ['不可达对象会立刻释放吗？', '不保证。收集器何时运行及引用处理都有时机，Java 只保证在需要时按内存管理策略处理，并不提供确定析构时间。'],
    ],
    ['仍用引用计数解释 Java GC，错误认为循环引用一定泄漏。', '看到对象未回收就调用 System.gc，而不检查到 GC Roots 的保留链。'],
    [OFFICIAL.jvmsRuntime, OFFICIAL.references, OFFICIAL.gcTuning],
  ),
  87: question(
    '标记-清除、标记-复制、标记-整理算法有什么取舍？',
    '标记-清除回收不可达对象但可能产生碎片；标记-复制把存活对象复制到另一片区域，分配快但需要额外空间；标记-整理把存活对象向一端移动，减少碎片却增加移动和停顿成本。收集器通常按区域和存活率组合使用。',
    '三类算法首先都需要识别存活对象，差异在回收与布局方式。清除算法只把死亡空间放回空闲集合，速度直接但长期可能难以找到连续大块。复制算法成本与存活对象数量更相关，适合大部分对象很快死亡的区域；它还让新分配可继续指针碰撞。整理算法移动对象并修正引用，获得连续空间，适合存活率高但对停顿和并发更新要求更高的区域。现代区域化收集器不是简单把一种算法用于整个堆，而是选择回收收益高的 Region，并通过转移完成局部整理。任何算法都要考虑 STW、写屏障、并发标记和浮动垃圾等实际成本。',
    '新生代大量短命请求对象适合复制式回收；长期运行服务若堆碎片导致大对象分配失败，需要观察收集器的整理与 Region 行为。选择算法不能只看吞吐，低延迟服务还要比较暂停分位数、CPU 余量和额外内存。',
    [
      ['复制算法是否一定浪费一半内存？', '不一定。经典半区模型便于理解，现代分代和区域化收集器会按实际区域、存活率与晋升策略组织空间。'],
      ['为什么对象移动后引用仍然有效？', '收集器在安全点或并发协议下更新相关引用，并通过转发表、屏障等机制维持一致性；具体方式取决于收集器。'],
    ],
    ['把算法名称与某个固定年代一一绑定，忽略现代收集器的区域化组合。', '只比较平均停顿，不观察 p99 暂停、CPU 和内存冗余。'],
    [OFFICIAL.gcTuning, OFFICIAL.jvmsRuntime],
  ),
  89: question(
    'Minor GC、Major GC、Full GC 怎样区分，G1、ZGC 该如何选？',
    'Minor/Young GC 主要处理年轻代，Major 一词在不同工具中可能含义不一，Full GC 通常指覆盖整个堆并可能处理类元数据的重型回收。G1 追求可预测暂停与通用吞吐，ZGC 侧重超大堆和极低暂停；应按目标 JDK、延迟、吞吐和内存余量实测。',
    '代际假设认为多数对象朝生夕死，因此年轻代更频繁回收，存活对象经复制和年龄增长后晋升。G1 把堆划为 Region，执行 Young 与 Mixed 回收，并依据暂停目标选择回收集合；Full GC 往往意味着并发周期来不及、分配或晋升失败等压力，成本较高。ZGC 将大量标记和转移工作并发化，使暂停通常与堆大小弱相关，但会付出 CPU、屏障和额外内存成本。CMS 是历史收集器，在现代 JDK 已移除，不应作为新项目默认候选。GC 日志里的名词和触发原因比口头“Major”更可靠，优化应先减少异常分配和内存保留。',
    '在线交易服务先以 G1 的默认配置建立基线，观察分配速率、晋升、暂停分位数和并发周期。如果数百 GB 堆仍要求毫秒级暂停并有足够 CPU/内存，可在目标硬件上评估 ZGC。遇到频繁 Full GC，先查看触发原因和 heap dump，而不是只调大堆或缩短暂停目标。',
    [
      ['G1 的 Mixed GC 回收什么？', '它会在处理年轻代的同时选择部分垃圾收益较高的老年代 Region 回收，不等同于覆盖整个堆的 Full GC。'],
      ['为什么 Major GC 这个词要谨慎？', '不同收集器、监控工具和文章对它的定义不完全一致，诊断时应看具体 GC 类型、覆盖区域和触发原因。'],
    ],
    ['仍把 CMS 当现代 JDK 的默认可选收集器，不说明版本背景。', '只凭“ZGC 低延迟”切换收集器，不测 CPU、吞吐、内存余量和目标延迟。'],
    [OFFICIAL.gcTuning, OFFICIAL.jcmd],
  ),
  91: question(
    '内存泄漏和内存溢出有什么区别，Java 为什么有 GC 仍会泄漏？',
    '内存泄漏是已无业务价值的对象仍被引用、无法回收；内存溢出是进程无法再满足分配请求。泄漏会逐步导致 OOM，但 OOM 也可能只是容量不足、瞬时流量、大对象、线程过多或堆外内存耗尽。',
    'GC 只能回收从 GC Roots 不可达的对象，不理解“这条缓存业务上已经过期”。静态集合、无上限缓存、未注销监听器、ThreadLocal value、类加载器、未关闭资源以及错误的队列积压都会让对象继续可达。不同错误信息指向不同区域：`Java heap space` 关注堆，`Metaspace` 关注类元数据和类加载器，`Direct buffer memory` 关注直接缓冲区，`unable to create native thread` 还涉及线程栈和系统限制，StackOverflowError 常由递归或栈帧过深触发。定位要结合趋势、日志、dump 与业务流量，不能看到 OOM 就一律增大 Xmx。',
    '若老年代使用量在每轮完整回收后仍持续抬升，可在可控时机保存 heap dump，对比支配树和到 GC Roots 的路径，定位静态 Map 或监听器链。若堆稳定但 RSS 上升，再检查直接内存、线程数量、native 库和 NMT。修复后用相同压测验证回收基线恢复，并设置容量与告警。',
    [
      ['OOM 一定说明存在内存泄漏吗？', '不一定。合理存活数据超过配置、突发分配、堆外耗尽或线程数过多都可能 OOM，需要按内存区域和对象保留链判断。'],
      ['为什么加大堆可能只是延后故障？', '若对象被错误长期持有，增长趋势不变，更大堆只延长填满时间，还可能增加回收成本和 dump 体积。'],
    ],
    ['遇到任何 OOM 都只增加 Xmx，不区分堆、元空间、直接内存和线程。', '只看一次内存快照下结论，不结合 GC 后基线、流量和多次 dump 对比。'],
    [OFFICIAL.jvmsRuntime, OFFICIAL.nativeMemory, OFFICIAL.jcmd],
  ),
  92: question(
    '线上 CPU 飙高、死锁、频繁 GC 和内存增长分别怎样用 JVM 工具排查？',
    '先保留现场再分类：CPU 高看线程与热点栈，死锁看线程转储，GC 异常看 GC 日志与堆趋势，内存增长看 heap dump、类直方图和 Native Memory Tracking。`jcmd`、JFR、线程 dump 与 heap dump 要结合指标时间线使用。',
    'CPU 飙高时先定位进程和高 CPU 线程，把操作系统线程 id 与 Java dump 中的线程对应，连续采样确认持续热点；JFR 能同时观察执行采样、锁、分配和 GC。怀疑死锁可用 `jcmd <pid> Thread.print -l` 或等价工具查看监视器等待环。频繁 GC 要区分分配速率过高、堆容量、晋升失败、并发周期来不及和真实泄漏，解析统一 GC 日志而不是只看次数。堆增长可先用类直方图低成本观察，再在磁盘与停顿预算允许时 dump；进程 RSS 大于堆则用 NMT、直接内存、线程栈和 native 库继续拆分。诊断命令可能有停顿和 I/O 成本，生产执行前必须评估。',
    '告警发生后记录请求量、CPU、堆/非堆、GC 暂停、线程池和版本信息。CPU 问题先抓 3 次间隔线程 dump 判断热点是否稳定；内存问题在 GC 后基线持续上升时采样直方图并保留 dump。修复后重放相同负载，比较分配率、保留集与 p99 暂停，而不是仅凭“服务不再 OOM”验收。',
    [
      ['为什么线程 dump 要连续抓多次？', '一次快照可能只是线程偶然经过某段代码；多次采样能区分持续热点、锁等待和瞬时状态。'],
      ['heap dump 为什么不能随时直接抓？', '大堆转储可能触发明显停顿、占用大量磁盘并包含敏感数据，需要提前评估空间、合规和业务窗口。'],
    ],
    ['线上故障先重启且不保留任何日志、dump 和版本现场。', '把进程 RSS 全部归因于 Java 堆，忽略直接内存、线程栈和 native 组件。'],
    [OFFICIAL.jcmd, OFFICIAL.nativeMemory, OFFICIAL.gcTuning],
  ),
})

Object.assign(OVERRIDES, {
  71: question(
    'Java 内存模型解决什么问题，可见性、原子性、有序性如何区分？',
    'JMM 规定线程如何通过共享内存交互，并用 happens-before 判断一个操作的结果是否必须对另一个操作可见。可见性关注能否看到最新值，原子性关注操作是否不可分割，有序性关注允许重排序后仍需保持哪些观察结果。',
    'CPU 缓存、编译器优化和指令重排使源码顺序不能直接等同于跨线程观察顺序。JMM 不要求每次读写都直达所谓“主内存”，而是抽象规定同步动作和数据竞争下的合法行为。对同一监视器的 unlock happens-before 后续 lock；volatile 写 happens-before 后续读；线程 start 之前的动作对新线程可见，线程中的动作在线程成功终止并被 join 后对等待者可见；传递性可把这些边连接起来。单个 int 读写通常原子不代表 `count++` 原子，因为它包含读、计算、写。正确并发程序需要用锁、volatile、final 安全初始化、原子类或线程安全容器建立明确边界。',
    '一个线程设置 `data = build(); ready = true;`，另一个线程循环读普通 ready 后访问 data，存在数据竞争；把 ready 声明为 volatile，并保证先写 data 后写 ready，volatile 写读边可发布之前的初始化。若多个线程同时执行 count++，即使 count 是 volatile 仍会丢失更新，应使用 AtomicInteger 或同一锁。',
    [
      ['volatile 能否保证对象内部所有复合操作线程安全？', '不能。它能通过引用或字段建立可见性与顺序边界，但多个步骤的不变量仍可能需要锁或原子结构。'],
      ['happens-before 是否等于实际时间上先发生？', '它是内存可见性与顺序保证关系，不只是墙上时钟的先后；没有该关系的两个操作即使偶然按顺序执行也不能据此证明正确。'],
    ],
    ['用“线程工作内存一定就是某级 CPU 缓存”替代 JMM 的抽象语义。', '把可见性、原子性和有序性混成“加 volatile 就线程安全”。'],
    [OFFICIAL.jlsThreads, OFFICIAL.concurrent],
  ),
  72: question(
    '`synchronized` 如何实现互斥和可见性，锁住的对象到底是谁？',
    'synchronized 以对象监视器为同步边界：实例同步方法锁当前 `this`，静态同步方法锁对应 Class 对象，代码块锁括号中的那个对象。进入与退出同一监视器建立互斥和 happens-before，可保证临界区写入对后续持锁线程可见。',
    '字节码层面，同步代码块通常对应 monitorenter/monitorexit，并由异常表确保异常路径也释放；同步方法通过方法访问标志表达。锁是可重入的，同一线程再次获得同一监视器会增加持有计数，退出相应次数才完全释放。JVM 可使用偏向、轻量、自旋、锁消除等实现优化，但不同 JDK 版本策略会演进，面试应先讲规范语义，再把“锁升级”作为 HotSpot 实现补充。锁对象身份必须稳定且私有：锁字符串常量可能与其他代码意外共享，锁可变字段可能在替换引用后变成两把锁。临界区内的慢 I/O 会拉长所有竞争线程等待。',
    '账户转账要保护两个余额时，应建立稳定的全序锁定规则，例如按账户 id 排序后依次锁定，避免 A→B 与 B→A 形成死锁。单实例状态用 `synchronized(lock)` 保护私有 final lock；所有实例共享的静态注册表才考虑类级锁。锁内只完成必要状态检查与更新，远程调用放到临界区外并用事务/补偿保证一致性。',
    [
      ['两个实例调用同一个 synchronized 实例方法会互斥吗？', '通常不会，因为分别锁各自的 this；只有它们实际使用同一个监视器对象时才互斥。'],
      ['synchronized 是否一定是重量级操作？', '不能这样概括。规范给出同步语义，JVM 会根据竞争情况优化；真正成本应通过目标 JDK 和负载测量。'],
    ],
    ['把所有 synchronized 方法都说成锁 Class，混淆实例锁和类锁。', '锁住公开对象、字符串常量或会被替换的引用，导致意外竞争或保护失效。'],
    [OFFICIAL.jlsThreads, OFFICIAL.jlsClasses],
  ),
  73: question(
    '`ThreadLocal` 的原理是什么，在线程池中为什么必须清理？',
    'ThreadLocal 把值存在线程自身的 ThreadLocalMap 中，key 对 ThreadLocal 是弱引用，value 仍是强引用。线程池线程生命周期很长，若任务结束不 remove，旧值可能泄漏、串到下一请求并长期占用内存。',
    '调用 `threadLocal.set(value)` 时，条目不是保存在 ThreadLocal 对象里，而是当前 Thread 的专用 Map。弱 key 能在外部不再持有 ThreadLocal 时被回收，但 value 不会因此立即消失；只有后续 Map 操作清理陈旧条目或线程结束，value 才有机会释放。线程池复用同一个工作线程处理多个请求，所以 ThreadLocal 不是请求级自动变量。它适合传递明确生命周期的线程上下文，但异步切换到另一个线程、CompletableFuture 默认池和虚拟线程时，值不会自动按业务期望传播。更可靠的设计是显式传参，确需使用时在边界统一 set/try/finally/remove。',
    'Web 过滤器从请求读取 traceId 后执行 `TRACE.set(id); try { chain.doFilter(...); } finally { TRACE.remove(); }`。不能只在正常返回时清理，因为异常路径同样会把用户上下文留给下一个任务。异步任务应显式复制需要的不可变上下文，避免把大型请求对象整体放进 ThreadLocal。',
    [
      ['key 是弱引用，为什么还会内存泄漏？', 'key 被回收后，Entry 中的 value 仍由长寿命线程及其 Map 强引用；没有后续清理或线程结束时，value 可长期存活。'],
      ['InheritableThreadLocal 适合线程池传上下文吗？', '通常不适合。它在线程创建时继承，而线程池线程早已存在且会复用，容易得到过期上下文。'],
    ],
    ['只调用 set 不在 finally 中 remove，在线程池里造成串号和内存滞留。', '把数据库连接、请求对象等大资源塞入 ThreadLocal，并期待弱引用自动释放。'],
    [OFFICIAL.threadLocal, OFFICIAL.concurrent],
  ),
  77: question(
    'AQS 是什么，`ReentrantLock`、`Semaphore`、`CountDownLatch` 如何基于它协作？',
    'AQS 用一个同步状态 `state`、原子更新和等待队列搭建锁与同步器骨架。子类定义共享或独占模式下获取/释放状态的规则，AQS 负责失败入队、阻塞、唤醒和取消等通用流程。',
    '独占模式同一时刻通常只有一个线程成功，例如 ReentrantLock；共享模式允许多个线程按状态同时通过，例如 Semaphore 许可和 CountDownLatch 计数归零后的放行。线程先尝试 `tryAcquire` 或 `tryAcquireShared`，失败后进入 CLH 风格同步队列并在合适条件下挂起；释放状态后唤醒后继重新竞争。AQS 使用 CAS 管理 state 和队列关系，但完整实现不等于“纯自旋”，等待线程会阻塞。ConditionObject 维护独立条件队列，await 会释放锁并进入条件等待，signal 后转移回同步队列，最终仍要重新获得锁。理解 AQS 应抓住状态、队列、独占/共享三条主线，不必死背每个源码分支。',
    '限流器可用 Semaphore 的许可表达同时访问下游的最大数量，务必在成功 acquire 后用 finally release。一次启动等待多个组件初始化可用 CountDownLatch；重复阶段协作则考虑 CyclicBarrier/Phaser。自定义同步器前优先组合现有 JUC 工具，只有状态模型确实特殊且具备充分测试时才继承 AQS。',
    [
      ['AQS 的 state 具体表示什么？', 'AQS 只提供整数状态容器与原子访问，语义由子类定义：可表示重入次数、剩余许可或未完成计数。'],
      ['Condition.signal 后线程能立刻继续吗？', '不能保证。它先从条件队列转移到同步队列，还要重新竞争并获得关联锁后，await 才能返回。'],
    ],
    ['把 AQS 说成所有线程一直 CAS 自旋，忽略入队与阻塞。', '为普通业务直接手写 AQS 锁，未处理取消、中断、公平性和异常路径。'],
    [OFFICIAL.locks, OFFICIAL.concurrent, OFFICIAL.atomic],
  ),
})

Object.assign(OVERRIDES, {
  66: question(
    '`ThreadPoolExecutor` 的核心参数有哪些，任务提交后按什么顺序处理？',
    '核心参数包括 corePoolSize、maximumPoolSize、keepAliveTime、时间单位、workQueue、threadFactory 和拒绝策略。execute 提交后通常按“核心线程未满就创建 → 否则入队 → 队列满且未到最大线程数再创建 → 仍无法接收则拒绝”处理。',
    '线程池复用工作线程并把并发度、排队和过载策略显式化。达到核心线程数后，新任务不是立刻创建非核心线程，而是先尝试进入 workQueue；只有队列无法接收时才向 maximumPoolSize 扩展。无界队列会让 maximumPoolSize 很难生效，并把过载转成内存和延迟问题；有界队列便于形成背压。非核心线程空闲超过 keepAliveTime 通常回收，核心线程也可配置超时。threadFactory 应提供可识别线程名和未捕获异常策略。参数不是孤立口诀：队列容量、任务耗时、到达速率和下游容量共同决定系统行为。',
    '订单通知平均每秒 200 个、单任务平均 50ms，先估算并发需求和下游 QPS，再配置独立有界线程池、命名线程工厂和明确拒绝策略。压力测试要观察 activeCount、queueSize、完成量、拒绝量和任务等待时间；若队列持续增长，扩大线程数可能只会压垮数据库，应先限流或降级。',
    [
      ['为什么使用无界队列时 maximumPoolSize 常常不起作用？', '核心线程满后任务仍能不断入队，队列不满就不会走创建非核心线程的分支，最终风险转为排队延迟和内存增长。'],
      ['核心线程会一直存活吗？', '默认通常会保留，但可通过 allowCoreThreadTimeOut 让核心线程也按空闲超时回收。'],
    ],
    ['把七个参数逐个背完，却说错“先扩到最大线程再入队”的执行顺序。', '使用无界队列掩盖过载，直到延迟和堆内存不可控。'],
    [OFFICIAL.executor, OFFICIAL.concurrent],
  ),
  67: question(
    '线程池大小怎样估算，为什么不建议直接使用 `Executors` 默认工厂？',
    '线程数应根据 CPU 核数、任务等待/计算比例、下游容量和延迟目标通过压测确定。部分 Executors 工厂使用无界队列或可无限创建线程，容易把过载隐藏成 OOM、延迟雪崩或线程耗尽，因此生产更适合显式 ThreadPoolExecutor。',
    'CPU 密集任务的有效并行度通常接近可用核心数；I/O 等待较多时可以增加线程以覆盖等待，但不能超过数据库连接、远端 QPS 和内存承载。公式只能给初值，因为任务耗时分布、上下文切换、锁竞争和突发流量会改变结果。`newFixedThreadPool` 常配无界 LinkedBlockingQueue，积压时内存持续增长；`newCachedThreadPool` 最大线程数很大且使用直接交接，慢任务可能快速创建大量线程；`newSingleThreadExecutor` 同样可能无限排队。显式构造让容量、拒绝、线程命名和监控都可审核，还应按业务隔离线程池，避免一个慢依赖占满公共资源。',
    'CPU 图像处理池可从 `Ncpu` 或 `Ncpu + 1` 附近开始压测；调用外部接口的池先受连接池和对方限流约束，再根据等待比例设置并发。支付、报表、通知应使用不同池和队列，避免报表突发拖死支付链路。容量调整以 p95/p99 等待时间、拒绝率和下游健康度为依据。',
    [
      ['I/O 密集任务线程数是否越多越好？', '不是。线程仍消耗栈和调度成本，更会争用连接池及下游容量；超过瓶颈后只会增加排队和超时。'],
      ['虚拟线程出现后还需要限流吗？', '需要。虚拟线程降低线程成本，却不会增加数据库连接、CPU、内存和远端服务容量，稀缺资源仍要单独限制。'],
    ],
    ['套用固定公式后直接上线，不用真实耗时分布和下游容量验证。', '所有业务共用一个线程池，一个慢依赖造成全站饥饿。'],
    [OFFICIAL.executor, OFFICIAL.concurrent],
  ),
  68: question(
    '线程池的拒绝策略、`shutdown` 与 `shutdownNow` 应怎样设计？',
    '队列和最大线程均饱和时必须执行拒绝策略：抛异常、调用者执行、丢弃最旧或静默丢弃各有不同风险。`shutdown` 停止接收新任务并处理已提交任务，`shutdownNow` 尝试中断运行任务并返回未开始任务；二者都不是强制终止。',
    'AbortPolicy 明确抛 RejectedExecutionException，便于上层降级；CallerRunsPolicy 让提交线程执行任务，可形成自然背压，但如果提交者是事件循环或持锁线程可能放大阻塞甚至死锁；Discard 与 DiscardOldest 会丢任务，只有业务明确允许并具备指标、补偿时才可用。关闭时应先 shutdown，再在预算内 awaitTermination，超时后才 shutdownNow 并再次等待。任务必须正确响应 interrupt，外部 I/O 还需设置自身超时，否则 shutdownNow 也无法及时停止。服务关闭顺序要先停止流量入口，再等待任务和下游资源，最后关闭依赖。',
    '消息异步落库不能使用静默丢弃，可让拒绝策略记录指标并把任务转入可靠消息或由调用方降级。应用退出时先从负载均衡摘除，停止接收请求，调用 shutdown，等待例如 30 秒；超时后 shutdownNow，并记录返回的未执行任务用于补偿。任务捕获 InterruptedException 后应恢复中断标记或结束，不要继续无限重试。',
    [
      ['CallerRunsPolicy 为什么能形成背压？', '提交线程被迫同步执行任务，提交速度会下降；但它会阻塞提交者，所以必须确认该线程允许承担业务执行。'],
      ['`shutdownNow` 能保证正在运行的任务立刻停止吗？', '不能，它主要通过 interrupt 发出协作取消请求；忽略中断或阻塞在不可中断操作中的任务仍可能继续。'],
    ],
    ['使用 DiscardPolicy 却没有丢弃指标、业务幂等和补偿机制。', '服务退出直接 shutdownNow，未给正常任务清理和提交结果的时间。'],
    [OFFICIAL.executor, OFFICIAL.future, OFFICIAL.concurrent],
  ),
})

Object.assign(OVERRIDES, {
  53: question(
    'BIO、NIO、AIO 有什么区别，选型时应看哪些业务条件？',
    'BIO 的读写调用通常阻塞当前线程；NIO 提供 Channel、Buffer 和 Selector，可用少量线程管理大量非阻塞连接；AIO 以完成回调或 Future 表达异步 I/O。选型取决于并发连接数、每连接流量、开发复杂度和运行平台，而不是“NIO 永远更快”。',
    '阻塞/非阻塞描述一次调用在数据未就绪时是否等待，同步/异步描述完成通知与结果处理方式，两组概念不能混为一谈。传统 socket BIO 常采用一连接一线程或线程池，代码直接但大量空闲连接会占用线程资源。NIO 把连接注册到 Selector，事件循环只处理已就绪通道，适合连接多、单次数据量小的网络服务；业务处理仍需避免阻塞事件循环。AIO 把操作提交给系统或运行时，完成后通知处理器，但不同平台实现与生态成熟度有差异。文件顺序读取、连接数量有限时，缓冲 BIO 可能最清晰。',
    '上传大文件的后台任务连接数有限，可使用缓冲流和线程池，重点控制内存与超时。聊天网关维护数万长连接时，可用 NIO/Netty 事件循环，但数据库调用和复杂业务应转交业务线程池，避免一个慢请求卡住整个事件循环。做技术选型前应测连接规模、消息大小、阻塞比例与故障恢复。',
    [
      ['NIO 是否等于异步 I/O？', '不等于。Java NIO 常见 Selector 模型是同步非阻塞：线程主动查询就绪事件，再由自己执行 read/write。'],
      ['为什么 NIO 事件循环不能直接做慢数据库查询？', '事件循环线程负责推进许多连接，阻塞它会同时拖慢这一组连接，慢业务应卸载并设置背压。'],
    ],
    ['把阻塞/非阻塞与同步/异步当作同一维度。', '为了“高性能”给低并发文件任务引入复杂事件循环，却没有背压、超时和监控。'],
    [OFFICIAL.io, OFFICIAL.nio, OFFICIAL.channels],
  ),
  54: question(
    'Java NIO 的 Channel、Buffer、Selector 分别负责什么？',
    'Channel 是可读写的数据通道，Buffer 承载读写状态，Selector 让一个线程发现多个非阻塞通道的就绪事件。三者配合解决“数据在哪里、状态怎样切换、哪些连接现在可处理”三个问题。',
    'Channel 的 read 把数据写入 Buffer，write 从 Buffer 取数据写出；两者都可能只完成一部分，必须根据返回值和剩余空间循环处理。Buffer 用 capacity、position、limit 描述当前区域：写完后 `flip` 把 limit 设为已写位置并把 position 归零，读取后 `clear` 为覆盖整个缓冲区做准备，`compact` 则保留未读数据。Selector 只报告 accept、connect、read、write 等就绪状态，不替你完成业务读写。非阻塞 write 经常返回 0，若始终注册 OP_WRITE 会形成忙循环，应仅在确有待发送数据时关注写就绪。',
    '协议解码器收到半包时，不应假设一次 read 得到完整消息：把数据写入 ByteBuffer，flip 后按长度字段解析；数据不足则 compact，等待下一次 read 继续。响应未写完时保留剩余 Buffer 并注册 OP_WRITE，写空后立即取消写关注。',
    [
      ['`clear()` 会把旧字节真正清零吗？', '不会，它只重设 position 和 limit，让后续写入可覆盖旧内容；需要安全擦除时要显式覆盖。'],
      ['Selector 返回可读是否保证一次能读完整业务包？', '不保证，它只表示当前有数据或状态可处理；TCP 是字节流，仍需自己处理半包、粘包和连接关闭。'],
    ],
    ['忘记 flip，导致读取区间为空或位置错乱。', '把一次 Channel read/write 当成完整传输，未保存剩余状态。'],
    [OFFICIAL.nio, OFFICIAL.channels],
  ),
  58: question(
    'Java I/O 为什么大量使用装饰器模式，怎样避免包装层次混乱？',
    'InputStream/OutputStream 与 Reader/Writer 提供基础抽象，缓冲、数据类型转换、压缩等能力通过包装另一个流逐层组合。装饰器避免为每种能力组合建立子类，但要求正确选择字节/字符边界、包装顺序和关闭责任。',
    '装饰器与被包装对象实现相同核心接口，并在转发前后增加行为。例如 BufferedInputStream 为任意输入流加缓冲，InputStreamReader 把字节按指定 Charset 解码为字符，BufferedReader 再提供字符缓冲和按行读取。包装顺序决定语义：压缩数据应先解压字节，再按字符集解码；反过来没有意义。最外层关闭通常会级联关闭内层资源，但是否要关闭调用方传入的底层流必须写进 API 契约。缓冲不是越多越快，重复缓冲会占内存且增加刷新时机的理解成本。',
    '读取 gzip 压缩 UTF-8 文本时，顺序可为 `FileInputStream -> GZIPInputStream -> InputStreamReader(UTF_8) -> BufferedReader`，并用 try-with-resources 管理最外层。若方法接收外部提供的 OutputStream，通常只 flush 而不擅自 close，所有权由调用者决定并在文档中说明。',
    [
      ['装饰器与适配器的关注点有什么不同？', '装饰器保持同一抽象并叠加能力；适配器主要把一种接口转换为另一种接口，例如 InputStreamReader 连接字节流与字符流。'],
      ['为什么关闭最外层通常就够了？', '标准包装流的 close 通常向内委托，从而释放整条链；但自定义流和资源所有权仍应核对契约。'],
    ],
    ['先按字符解码再尝试解压，弄反字节变换与字符变换顺序。', '工具方法随意关闭调用者传入的流，破坏上层复用和响应写出。'],
    [OFFICIAL.io, OFFICIAL.autoCloseable],
  ),
})

Object.assign(OVERRIDES, {
  41: question(
    '什么是 fail-fast，遍历集合时怎样安全删除元素？',
    '普通集合迭代器通常用修改计数尽力发现遍历期间的意外结构修改并抛 `ConcurrentModificationException`。安全删除应使用当前迭代器的 `remove`、集合的 `removeIf`，或先筛选生成新集合；不能在增强 for 中直接调用原集合 remove。',
    'ArrayList 等集合维护结构修改计数，创建 Iterator 时记录 expectedModCount。迭代期间如果从迭代器之外增删元素，下一次检查发现计数不一致就快速失败，避免在不确定结构上继续运行。它是调试错误的机制，不是并发安全保证：检查并非强同步，跨线程竞态可能抛也可能不抛。`Iterator.remove` 会在删除后同步期望计数，并要求先成功 next 且每次 next 最多 remove 一次。只替换元素值是否算结构修改取决于操作契约。并发遍历应选择快照、显式锁或 ConcurrentHashMap 等弱一致迭代器，而不是捕获异常重试。',
    '删除过期会话可写 `sessions.removeIf(Session::expired)`；需要边遍历边执行更多逻辑时，用显式 Iterator，在命中后调用 `iterator.remove()`。若另一个线程同时更新列表，先明确需要快照还是强一致：快照可复制后遍历，强一致则在同一锁内保护迭代与修改。',
    [
      ['为什么增强 for 中删除容易失败？', '增强 for 对集合通常使用隐藏 Iterator；直接调用集合 remove 改了结构，却没有更新该 Iterator 的期望计数。'],
      ['ConcurrentHashMap 迭代器为什么通常不抛该异常？', '它提供弱一致遍历，允许和并发更新共存并观察部分变化，但不承诺某一时刻的完整快照。'],
    ],
    ['把 ConcurrentModificationException 当成锁，认为没抛异常的数据就是一致的。', 'catch 异常后从头重试遍历，掩盖真正的结构修改协议错误。'],
    [OFFICIAL.collection, OFFICIAL.collections],
  ),
  42: question(
    '`CopyOnWriteArrayList` 为什么适合读多写少，它的代价是什么？',
    'CopyOnWriteArrayList 每次结构写入都在锁内复制底层数组，再原子发布新数组；读取无需锁，迭代器看到创建时的稳定快照。代价是写放大、内存峰值和数据可见延迟，因此只适合列表较小、读远多于写且允许快照语义的场景。',
    '读线程获取当前数组引用并按索引访问，不会被正在构造的新副本破坏；写线程持锁复制、修改副本后再发布。迭代器固定持有当时数组，所以写入不会让它 fail-fast，也不会反映迭代开始后的新元素，迭代器本身不支持 remove。一次 add 是 O(n) 复制，连续批量写若逐条进行会产生大量临时数组和 GC 压力。它保证容器操作的并发语义，但元素对象仍可能可变，多个线程修改元素字段要另行同步。与 `Collections.synchronizedList` 相比，后者写成本低但读和遍历需要协调锁。',
    '应用内监听器注册后很少变化、每次请求都要遍历通知时，可以使用 CopyOnWriteArrayList。十万条订单持续写入则不合适，应使用线程封闭批次、队列或锁保护的普通结构。需要批量更新时优先 `addAll` 等一次复制，而不是循环单条 add。',
    [
      ['它的迭代器能看到遍历期间新增元素吗？', '不能保证看到；迭代器基于创建时的数组快照，这正是它无需与写线程互相阻塞的原因。'],
      ['元素本身是否自动变成线程安全？', '不会。复制的是元素引用数组，不是深拷贝元素；可变元素内部状态仍需不可变设计或同步。'],
    ],
    ['只看到“线程安全”就把高频写列表替换成 CopyOnWriteArrayList。', '误认为快照迭代会实时反映新增项，或认为元素对象也被深复制。'],
    [OFFICIAL.concurrent, OFFICIAL.list],
  ),
})

Object.assign(OVERRIDES, {
  32: question(
    '`ArrayList` 和 `LinkedList` 有什么区别，为什么多数场景优先 ArrayList？',
    'ArrayList 基于连续引用数组，随机访问快、内存和缓存局部性通常更好；LinkedList 是双向链表，头尾操作方便，但按下标访问必须遍历且每个节点有额外对象开销。只有已经定位节点或频繁操作两端时，链表的插删优势才成立。',
    'ArrayList 的 `get` 根据索引直接访问底层数组，复杂度 O(1)；中间插入删除要移动后续引用，通常 O(n)，尾部追加在容量足够时为摊销 O(1)。LinkedList 的 `get` 会从较近的一端遍历到目标位置，复杂度 O(n)；插入删除节点本身是 O(1)，但通过索引定位节点仍是 O(n)。现代 CPU 对连续数组的预取和缓存命中较友好，而链表节点分散、需要额外保存前后指针并增加 GC 压力。因此不能只背“链表增删快”，必须把定位成本、数据规模和访问模式一起回答。两者都不是线程安全集合。',
    '订单明细经常按下标读取、遍历和在尾部追加，优先 `ArrayList` 并在已知规模时预设容量。任务队列若只在两端进出，使用 `ArrayDeque` 通常比 LinkedList 更直接；只有确实需要链表迭代器在当前位置插删且节点操作占主导时，再评估 LinkedList。最终用代表性数据做基准，不根据复杂度口诀替代测量。',
    [
      ['LinkedList 在中间插入一定是 O(1) 吗？', '只有已经持有目标位置的迭代器或节点语境时，链接节点是 O(1)；若先通过索引查找位置，总成本仍是 O(n)。'],
      ['为什么 ArrayList 尾部追加称为摊销 O(1)？', '大部分追加只写一个槽位；偶尔扩容需复制全部元素，把多次操作的总成本平均后为常数级。'],
    ],
    ['只背“查询用 ArrayList、增删用 LinkedList”，忽略定位和缓存成本。', '把 LinkedList 当默认队列，未比较语义更清晰且通常更紧凑的 ArrayDeque。'],
    [OFFICIAL.list, OFFICIAL.collections],
  ),
  33: question(
    '`ArrayList` 如何扩容，为什么它不是线程安全的？',
    'ArrayList 维护元素数组和逻辑大小，容量不足时创建更大的数组并复制旧元素；并发写入没有同步保护，可能出现覆盖、丢失更新、越界或读到不一致状态。已知规模时预设容量能减少扩容和复制。',
    '调用 `add` 时先确保容量，再把元素写入 `size` 对应位置并递增 size。具体增长比例属于 JDK 实现细节，常见 OpenJDK 实现按约 1.5 倍增长，但业务代码不应依赖精确公式。扩容是 O(n) 复制，所以一次 append 不是永远 O(1)，只是摊销 O(1)。并发场景中两个线程可能读取同一个 size、写入同一槽位，结构修改与迭代也可能触发 fail-fast，但 ConcurrentModificationException 只是尽力检测错误，不是线程安全机制。可根据读写模式选择线程封闭、外部锁、不可变快照、`CopyOnWriteArrayList` 或其他并发结构。',
    '批量载入预计十万条记录时使用 `new ArrayList<>(100_000)`，避免从很小容量反复扩展。读多写少且快照一致性可接受的监听器列表可评估 CopyOnWriteArrayList；高频写入则不要用写时复制。若多个任务各自产生列表，优先让线程独占局部列表，结束后归并，而不是所有线程同时写一个 synchronizedList。',
    [
      ['`ensureCapacity` 会改变 size 吗？', '不会，它只确保底层容量至少达到目标；逻辑元素数量仍由实际 add/remove 操作决定。'],
      ['`Collections.synchronizedList` 后迭代还要加锁吗？', '通常需要按其文档在同一包装对象上显式同步整个迭代过程，否则单次方法同步无法保护复合遍历。'],
    ],
    ['把常见 1.5 倍增长说成 List 接口或所有 JDK 永恒不变的规范。', '把 fail-fast 异常当作并发控制，认为没抛异常就没有数据竞争。'],
    [OFFICIAL.list, OFFICIAL.collections],
  ),
  34: question(
    '`HashMap` 的底层结构是什么，链表什么时候会树化？',
    'JDK 8+ 常见 HashMap 由桶数组、链表和红黑树组成。哈希冲突先落在同一桶内；当单桶节点数达到树化阈值且表容量足够大时才转为红黑树，否则优先扩容，避免小表过早承担树结构成本。',
    'HashMap 先对 key 的 hashCode 做扰动，再用数组长度掩码定位桶。桶为空可直接放入节点；发生冲突时比较哈希值，并按引用相同或 equals 相等判断是否已有键，否则沿链表或树查找。OpenJDK 常见实现中，链表节点达到 8 且数组容量至少 64 才树化；容量较小时先扩容，因为扩大桶数往往能自然分散冲突。树节点减少恶劣冲突下的查找退化，但节点更大、旋转和比较成本更高。阈值属于实现细节，面试可说明当前主流实现，同时强调 Map 契约不承诺内部结构。好 key 还应拥有稳定的 equals/hashCode。',
    '自定义 `UserKey` 作为键时，应使用不可变身份字段实现 equals/hashCode。若所有对象错误返回同一个 hash，数据会集中到单桶，性能明显下降；树化只能缓解，不能修复错误的键设计。不要在放入 Map 后修改参与 hashCode 的字段，否则同一个对象可能再也无法按新状态找到。',
    [
      ['为什么容量小于 64 时通常先扩容而不是树化？', '小表的冲突更可能由桶数量不足造成，扩容可让节点重新分布；树节点的额外内存和维护成本此时不划算。'],
      ['红黑树能否把 HashMap 所有操作都保证为 O(log n)？', '不能这样概括。只有树桶内的相关查找接近对数复杂度，扩容、哈希质量和其他桶仍影响整体行为。'],
    ],
    ['只背“数组+链表+红黑树”，说不清冲突、树化与扩容的决策顺序。', '把具体阈值当成 Map 接口保证，或忽略可变 key 破坏定位。'],
    [OFFICIAL.map, OFFICIAL.collections],
  ),
  36: question(
    '`HashMap` 的 `put` 与 `get` 流程怎样走，`equals` 在何时参与？',
    '`put` 先计算哈希和桶位置，再在桶内寻找同键：命中则替换值，未命中则新增并可能触发树化或扩容；`get` 走相同定位路径。hashCode 用来缩小候选范围，equals 用来确认业务上的同一个键。',
    '定位过程可分三层：先处理 null 等特殊键语义，再计算扰动后的哈希并用 `(n - 1) & hash` 定位桶，最后在首节点、链表或红黑树中比较。两个键只有哈希相同才需要进一步 equals；哈希不同即使碰巧 equals 返回 true，也已经违反了“相等对象必须有相同 hashCode”的契约。put 命中旧键时返回旧值并保留键映射，新增节点后更新 size，超过阈值才扩容。get 返回 null 既可能是键不存在，也可能是该键显式映射到 null，应使用 containsKey 区分。平均 O(1) 依赖散列分布与负载控制，不是无条件承诺。',
    '实现缓存键时可用不可变 record，例如 `record QueryKey(long tenantId, String keyword) {}`，由稳定字段生成 equals/hashCode。读取 `map.get(key)` 得到 null 时，如果 null 是合法缓存值，要再检查 `containsKey` 或改用不允许 null 的约定。性能问题应观察键分布与扩容，而不是把 equals 写成只比较 hashCode。',
    [
      ['hashCode 相同是否代表两个 key 相等？', '不代表，哈希碰撞允许存在；还必须由引用相同或 equals 返回 true 才视为同一个键。'],
      ['为什么 get 的平均复杂度是 O(1) 而不是永远 O(1)？', '良好分布下候选桶很小；严重冲突、恶意哈希或扩容等情况会增加成本，树化也只是限制部分最坏退化。'],
    ],
    ['用 hashCode 是否相同直接替代 equals，碰撞时误判业务对象。', '允许 null value 却只用 get(null 结果) 判断键是否存在。'],
    [OFFICIAL.map, OFFICIAL.object],
  ),
  37: question(
    '`HashMap` 为什么使用 2 的幂容量，负载因子和扩容如何配合？',
    '2 的幂容量让桶下标可用位掩码高效计算，并使扩容翻倍时节点只需留在原位置或移动旧容量的偏移量。负载因子控制空间与冲突的平衡，`size > capacity × loadFactor` 时通常触发扩容。',
    '当容量 n 为 2 的幂时，`n - 1` 的低位全为 1，`hash & (n - 1)` 可均匀利用哈希低位。容量翻倍后只多检查 hash 中原容量对应的那一位：为 0 留在原桶，为 1 移到 `oldIndex + oldCapacity`，无需重新做除法。默认负载因子 0.75 是通用折中，不代表所有业务的最优值。初始容量会规范化到合适的 2 次幂；如果预计元素数量，应把负载因子算入容量规划，而不是直接把预计数量作为容量。扩容要分配新数组并迁移桶，是明显的延迟和内存峰值来源。',
    '预计写入 1000 个条目、使用默认负载因子时，初始容量至少应覆盖 `ceil(1000 / 0.75)` 再向上取合适的 2 次幂，从而减少构建阶段扩容。长期缓存不能只把容量设得很大，还要考虑过期、上限和 key/value 内存；固定数据可构建完成后发布不可变 Map。',
    [
      ['负载因子越小是否一定越快？', '不一定。冲突可能减少，但空桶和内存占用增加，缓存局部性也可能变化；应结合键分布和内存预算衡量。'],
      ['为什么扩容会出现延迟尖峰？', '需要申请更大数组并重新组织已有桶，元素多时会产生复制、节点处理和额外内存峰值。'],
    ],
    ['预估 1000 个元素就直接传 1000，忽略负载因子导致仍然扩容。', '为了避免扩容无限放大初始容量，制造长期空桶和内存浪费。'],
    [OFFICIAL.map, OFFICIAL.collections],
  ),
  38: question(
    '`HashMap` 为什么线程不安全，多线程读写会出现什么问题？',
    'HashMap 没有为并发修改提供可见性、互斥和复合操作原子性。多线程同时 put、resize、remove 或遍历可能丢失更新、读到不一致结果或抛出异常；即使只有 `get`，也必须保证 Map 构建完成后的安全发布。',
    '单次 put 涉及读取桶、判断键、写节点、更新 size 和可能扩容，这些步骤不是一个原子事务。两个线程可能基于同一旧状态写入并覆盖结果；结构修改与迭代并发会触发 best-effort 的 ConcurrentModificationException，但未抛异常不代表正确。JDK 7 扩容环链是历史追问，不应拿它概括所有版本；JDK 8 的具体失效表现不同，但“无并发契约”始终成立。若数据构建后只读，仍需通过 final 字段、锁、volatile 引用或线程安全容器安全发布，不能把普通引用随意泄露。需要原子初始化时使用 ConcurrentHashMap 的 computeIfAbsent 等单键原子 API，并注意映射函数副作用。',
    '配置启动时在单线程构建普通 Map，然后用 `Map.copyOf` 形成不可修改快照并通过 final 字段发布，读线程可以无锁读取。若运行期持续更新，选择 ConcurrentHashMap；“如果不存在则 put”不要写成 containsKey + put，而用 `putIfAbsent` 或 `computeIfAbsent` 表达原子意图。',
    [
      ['只读 HashMap 是否永远线程安全？', '若后续绝不修改且对象被安全发布，并发读取可以工作；若构造未完成就泄露引用，其他线程仍可能看不到完整状态。'],
      ['给 put 外面加锁，get 不加锁可以吗？', '需要完整证明发布和可见性协议；普通 HashMap 不提供这种混合访问保证，工程上应统一同步或改用合适的并发/不可变结构。'],
    ],
    ['继续用 JDK 7 的“扩容死循环”解释所有现代 HashMap 并发问题。', '看到压测没报错就认定并发安全，忽略沉默的数据丢失和可见性问题。'],
    [OFFICIAL.map, OFFICIAL.jlsThreads],
  ),
  39: question(
    '`ConcurrentHashMap` 如何保证并发安全，为什么复合操作仍要用原子 API？',
    'JDK 8+ 的 ConcurrentHashMap 通过 volatile 可见性、CAS 和桶级同步协作，读操作通常不锁全表，冲突更新只锁定更小范围。它保证文档规定的单次和复合 API，但 `get` 后再 `put` 仍不是原子事务。',
    '现代 ConcurrentHashMap 使用 Node 数组组织桶，空桶初始化可用 CAS，桶内冲突更新常在桶首监视器上同步，扩容时多个线程还可协助迁移。与 JDK 7 的 Segment 分段锁实现相比，锁粒度和数据结构不同；回答时应明确版本。get 依赖 volatile 字段和内存语义读取，无需像 Hashtable 那样锁住整张表。弱一致遍历允许与更新并发，不抛普通 HashMap 式 fail-fast，但不等于某一瞬间的全局快照。`putIfAbsent`、`compute`、`merge` 才能在单键范围表达原子复合更新；映射函数可能在内部同步范围执行，必须短小且避免递归更新同一 Map。',
    '统计用户计数可用 `map.computeIfAbsent(userId, k -> new LongAdder()).increment()`，避免 containsKey + put 的竞态。配置全量一致切换不适合逐键更新 ConcurrentHashMap，因为读者可能看到新旧混合版本；应构建不可变 Map 后一次替换 volatile/AtomicReference 中的引用。',
    [
      ['ConcurrentHashMap 的 size 是强一致快照吗？', '并发更新期间聚合结果可能是瞬时估计或弱一致观察，不应用它维护需要严格事务语义的业务不变量。'],
      ['为什么 computeIfAbsent 的函数不应做慢 I/O？', '它可能处在实现的并发控制路径上，慢操作会放大桶竞争；函数还应避免递归修改同一键并处理失败重试语义。'],
    ],
    ['把 JDK 7 Segment 结构原样描述成 JDK 8+ 的实现。', '使用线程安全容器后仍写 get-check-put，并误以为多个调用会自动合成原子操作。'],
    [OFFICIAL.concurrent, OFFICIAL.map],
  ),
  40: question(
    '`HashSet` 如何保证元素不重复，它与 `HashMap`、`equals`、`hashCode` 有什么关系？',
    'HashSet 通常以元素作为底层 HashMap 的 key，所有元素映射到同一个占位值。能否去重取决于元素的 hashCode 与 equals 契约；对象相等就必须有相同哈希，且放入集合后不能修改参与相等判断的字段。',
    'add 元素本质上尝试向 Map 写入该 key：先按 hash 定位候选桶，再用 equals 确认是否已有等价元素。如果找到等价 key，新增失败并返回 false。HashSet 不承诺迭代顺序；需要插入顺序用 LinkedHashSet，需要排序语义用 TreeSet。若只重写 equals 不重写 hashCode，相等对象可能进入不同桶而同时存在；若 key 放入后身份字段改变，remove 和 contains 会按新 hash 去另一个桶查找，从而“集合里看得到却找不到”。这也是不可变值对象适合作为散列键的原因。',
    '权限集合可把不可变枚举放入 EnumSet；业务实体若按 `tenantId + userId` 去重，可定义不可变 record 或在 equals/hashCode 中只使用不会变化的身份字段。不要直接用数据库实体全部可变字段生成 Lombok equals/hashCode，再在持久化前后改变 id。',
    [
      ['HashSet 可以存 null 吗？', '常见 HashSet 实现允许一个 null，因为底层 HashMap 允许一个 null key；但接口层设计是否允许 null 应由业务契约明确。'],
      ['TreeSet 的去重也依赖 hashCode 吗？', '通常不依赖，它按自然顺序或 Comparator 的比较结果是否为零判定同一排序键，因此比较器应与 equals 语义协调。'],
    ],
    ['只重写 equals 不重写 hashCode，导致逻辑相等对象无法稳定去重。', '元素入 Set 后修改身份字段，随后 contains/remove 失效。'],
    [OFFICIAL.set, OFFICIAL.map, OFFICIAL.object],
  ),
})

function uniqueSources(sources) {
  const seen = new Set()
  return sources.filter((source) => {
    if (!source || seen.has(source.url)) return false
    seen.add(source.url)
    return true
  })
}

export function optimizeJavaFoundationSections(sections) {
  let questionNumber = 0
  return sections.map((section, sectionIndex) => ({
    ...section,
    title: SECTION_TITLES[sectionIndex] ?? section.title,
    questions: section.questions.map((baseQuestion) => {
      questionNumber += 1
      const replacement = OVERRIDES[questionNumber]
      const merged = replacement ? { ...baseQuestion, ...replacement } : baseQuestion
      return {
        ...merged,
        sources: uniqueSources([
          ...(SECTION_GUIDES[sectionIndex] ?? [CURATED.javaGuideIndex]),
          ...(merged.sources ?? []),
        ]),
      }
    }),
  }))
}
