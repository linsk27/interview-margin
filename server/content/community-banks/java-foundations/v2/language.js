import { GUIDE, OFFICIAL, withSources } from './sources.js'

export const JAVA_FOUNDATION_V2_LANGUAGE = {
  title: '一、Java 语言基础（14 题）',
  questions: [
    withSources({
      title: 'Java 有哪些核心特点，为什么能跨平台？',
      summary: 'Java 能跨平台，是因为编译器生成统一的 JVM 字节码，而 Windows、Linux 等系统各自用本平台的 JVM 把字节码翻译成本机指令。面向对象、静态类型、自动内存管理和丰富标准库是它常见的工程特点，但不等于所有系统差异都会自动消失。',
      mechanism: '因为 Java 没有把业务源码直接固定成某一种 CPU 的机器码，而是在应用和操作系统之间加了一层统一的 JVM 规范，所以同一个 jar 可以交给不同平台的 JVM 执行。理解这层抽象可以拆成三步：\n- javac 把源码编译成与具体 CPU 指令集无关的 class 字节码。\n- Windows、Linux 等平台分别提供遵循 JVM 规范的虚拟机，把同一份字节码解释或编译成本机指令。\n- 标准库屏蔽大量操作系统差异，但本地库、文件路径、字符集和系统命令仍可能破坏可移植性。\n因此跨平台是运行时抽象带来的能力，不代表任何 Java 程序无需验证就能在所有环境得到完全相同的行为。',
      example: '同一个 Spring Boot jar 可以在安装了兼容 JRE 的 Windows 和 Linux 上启动。若代码硬编码 C 盘路径、调用仅 Windows 存在的命令，或加载某个平台的 JNI 动态库，应用层仍会失去跨平台能力；上线前需要在目标 JDK、操作系统和容器限制下测试。',
      followUps: [
        { question: 'Java 是纯编译型还是纯解释型语言？', answer: '都不准确。源码先编译为字节码，JVM 可解释执行，也会把热点代码即时编译为本机机器码。' },
        { question: '字节码跨平台是否意味着 JVM 本身也跨平台？', answer: '不是。同一份字节码可复用，但每种操作系统和处理器需要对应实现的 JVM 可执行程序。' },
      ],
      pitfalls: ['把跨平台说成“Java 程序与操作系统完全无关”，忽略本地资源与环境差异。', '只背“一次编译到处运行”，说不清字节码、JVM 和本机指令之间的关系。'],
    }, GUIDE.basics01, OFFICIAL.javaOverview, OFFICIAL.jvmsRuntime),
    withSources({
      title: 'JDK、JRE 和 JVM 有什么区别？',
      summary: 'JVM 负责执行字节码，JRE 表示运行 Java 程序所需的虚拟机和类库，JDK 则在运行能力之上提供编译、诊断和打包等开发工具。',
      mechanism: '可以按“执行引擎—运行环境—开发套件”理解：\n- JVM 规范定义类加载、字节码执行和运行时数据区等规则，HotSpot 等具体 JVM 实现这些规则，并提供内存管理与垃圾回收能力。\n- 传统概念中的 JRE 包含 JVM 和运行时类库，面向只运行程序的场景。\n- JDK 包含 javac、java、javadoc、jcmd、jstack 等工具，是开发、构建和排障所需的完整套件。\n从 JDK 9 模块化以后，Oracle 不再像早期版本那样单独发布通用 JRE 安装包，生产镜像也可通过 jlink 裁剪，因此回答时要区分概念关系与现代发行方式。',
      example: 'CI 环境需要 javac 和测试工具，所以使用 JDK；生产容器可用同版本 JDK 运行，也可通过 jlink 生成只含所需模块的运行时。若线上只留下极度裁剪的镜像，发生故障时可能缺少 jcmd 等工具，部署设计应提前考虑诊断能力。',
      followUps: [
        { question: '生产环境必须只安装 JRE 吗？', answer: '不必须。现代发行版常直接提供 JDK 或定制运行时，关键是版本兼容、安全更新、镜像体积与诊断能力之间的取舍。' },
        { question: 'javac 和 java 命令分别做什么？', answer: 'javac 主要把 Java 源文件编译为 class 字节码，java 命令创建运行时并加载主类执行程序。' },
      ],
      pitfalls: ['沿用旧版本安装包结论，声称现代 JDK 一定自带一个可单独识别的 jre 目录。', '把 JVM 等同于整套 JDK，导致说不清编译工具和运行时组件边界。'],
    }, GUIDE.basics01, OFFICIAL.javaOverview, OFFICIAL.jvmsRuntime),
    withSources({
      title: '什么是 Java 泛型，类型擦除是什么意思？',
      summary: '泛型把类型作为参数，在编译期提供类型检查并减少强制转换；Java 泛型主要通过类型擦除实现，多数类型参数不会原样保留到运行时。',
      mechanism: '可以从“编译期约束”和“运行时表示”两层理解：\n- `List<String>` 限制调用方按字符串读写，编译器能更早发现类型错误。\n- 泛型默认不协变，`List<Integer>` 不是 `List<Number>` 的子类型。\n- `? extends T` 适合读取 T，通常不能安全写入具体值；`? super T` 适合写入 T，读取时只能按 Object 看待。\n- 编译后，类型变量通常擦除为上界或 Object，编译器补充必要的类型转换，并可能生成桥接方法维持多态。\n因此不能创建 `new T()`，也不能用 `instanceof List<String>` 判断元素的实际泛型参数。',
      example: '复制数字列表时可把方法参数写成 `List<? extends T> source` 与 `List<? super T> target`：`List<Integer>` 可以作为来源，`List<Number>` 可以作为目标。若直接使用原始类型 `List`，错误元素可能直到取值和隐式转换时才暴露为 ClassCastException。',
      followUps: [
        { question: '为什么 List<String> 和 List<Integer> 的运行时 Class 通常相同？', answer: '两者在编译后都擦除为原始 List 类型，字符串或整数参数主要用于编译期检查，不形成两个独立运行时类。' },
        { question: '泛型方法和泛型类有什么区别？', answer: '泛型类的类型参数作用于整个实例类型；泛型方法在自己的方法签名中声明类型参数，可独立于所属类进行类型推断。' },
      ],
      pitfalls: ['把 `List<Integer>` 当成 `List<Number>` 使用，忽略泛型默认不协变。', '使用原始类型绕过编译期检查，把类型错误推迟到运行时。'],
    }, GUIDE.basics03, OFFICIAL.jlsTypes),
    withSources({
      title: 'Java 的基本类型和引用类型有什么区别？',
      summary: '八种基本类型直接表示布尔、整数、浮点或字符值；引用类型变量保存对象或数组的引用，两者在默认值、空值、泛型和相等比较上表现不同。',
      mechanism: '基本类型包括 boolean、byte、short、int、long、char、float、double，它们不是对象且不能为 null；引用类型包括类、接口和数组，引用可为 null。字段与数组元素会获得零值、false 或 null，局部变量必须先确定赋值才能读取。基本值比较通常比较数值，引用使用双等号比较是否指向同一对象。泛型实参要求引用类型，因此基本值进入 List<Integer> 会装箱。JLS 规定语言语义，但不要随意把引用解释成固定大小的“内存地址”，实际表示由 JVM 决定。',
      example: '成员字段 int count 初始为 0，String name 初始为 null；方法内写 int n 后直接读取会编译失败。List<int> 不合法，需要 List<Integer>。判断一个可能为空的 Integer 是否等于 1 时要先处理 null，避免拆箱触发空指针。',
      followUps: [
        { question: 'char 一定能表示一个完整 Unicode 字符吗？', answer: '不一定。char 是一个 UTF-16 代码单元，补充平面字符需要两个代理项，应按代码点处理。' },
        { question: 'final 引用是否意味着对象不可变？', answer: '不是。final 只限制该变量再次绑定，引用指向对象的字段或集合内容仍可能改变。' },
      ],
      pitfalls: ['背诵每种类型位数时给 boolean 强行指定语言规范未承诺的存储大小。', '把引用变量本身和被引用对象混为一谈，误认为 final 会深度冻结对象。'],
    }, GUIDE.basics01, OFFICIAL.jlsTypes, OFFICIAL.jlsStatements),
    withSources({
      title: 'int 和 Integer 有什么区别，自动装箱有哪些坑？',
      summary: 'int 是不能为 null 的基本类型，Integer 是对象包装类型；自动装箱简化转换，但缓存、引用比较和 null 拆箱容易制造隐藏错误。',
      mechanism: '装箱把 int 转成 Integer，拆箱反向取出 int。核心差异包括：\n- Integer 可用于泛型并能表达 null，代价是对象语义和潜在分配。\n- 对两个 Integer 使用双等号比较引用身份，不是稳定的数值比较；部分小整数装箱结果会缓存。\n- 包装对象参与算术或赋给 int 时会拆箱，null 在此时抛出 NullPointerException。\n- 方法重载会依据编译期类型和转换阶段选择基本类型或包装类型版本。\n数值比较优先用 equals 或先明确空值策略，热点计算则避免不必要装箱。',
      example: 'Integer a = 127 与 b = 127 可能因缓存使 a == b 为 true，而 128 的两个对象常为 false，业务不能依赖这一差异。Map.get 返回 Integer，直接赋给 int 时若键不存在就会空指针，可用 getOrDefault 或显式判断 null。',
      followUps: [
        { question: '为什么 Integer 缓存范围外不能用双等号比较？', answer: '双等号比较对象身份，而缓存范围外的装箱不保证复用同一实例，数值相同也可能是两个对象。' },
        { question: 'Integer.equals(Long) 在数值相同情况下会返回什么？', answer: '返回 false，因为包装类 equals 通常同时要求相同包装类型，跨类型数值比较需要先统一类型。' },
      ],
      pitfalls: ['用 Integer 的双等号判断业务数值相等，让结果偶然依赖缓存。', '把可能为 null 的包装值直接参与运算，忽略隐式拆箱位置。'],
    }, GUIDE.basics01, OFFICIAL.jlsConversions, OFFICIAL.integer),
    withSources({
      title: '为什么金额计算通常使用 BigDecimal？',
      summary: 'double 无法精确表示多数十进制小数，金额需要明确的小数精度与舍入规则，因此通常使用以十进制数值语义工作的 BigDecimal。',
      mechanism: '二进制浮点只能近似表示许多十进制分数，所以 0.1 加 0.2 不一定精确等于 0.3。BigDecimal 由任意精度整数和 scale 表达十进制数，使用时要注意：\n- 优先用字符串构造或 BigDecimal.valueOf，避免把 double 的近似误差带入。\n- 除法可能无限不循环，必须按业务指定 scale 与 RoundingMode。\n- equals 同时比较数值和 scale，compareTo 只比较数值大小。\n- BigDecimal 不可变，每次运算返回新对象，必须接住结果。',
      example: '订单金额可写 `new BigDecimal("19.90")` 乘 `BigDecimal.valueOf(3)`，分摊时显式保留两位并指定 HALF_UP 或财务要求的模式。`new BigDecimal("1.0")` 与 `new BigDecimal("1.00")` 用 equals 不相等，但 compareTo 返回 0。',
      followUps: [
        { question: 'BigDecimal 可以直接用双等号比较吗？', answer: '不可以，双等号只比较对象身份；数值比较按是否关心 scale 选择 equals 或 compareTo。' },
        { question: '所有科学计算都应该换成 BigDecimal 吗？', answer: '不一定。科学计算常接受可量化误差并重视浮点吞吐，应基于误差模型和性能目标选择。' },
      ],
      pitfalls: ['用 `new BigDecimal(0.1)` 构造金额，把已有二进制近似完整带入。', '调用 divide 时不指定无法整除情况下的精度和舍入规则。'],
    }, GUIDE.basics01, OFFICIAL.bigDecimal),
    withSources({
      title: 'Java 是值传递还是引用传递？',
      summary: 'Java 只有值传递：基本类型复制具体值，引用类型复制引用值；方法能修改双方共同指向的对象，却不能替调用方变量重新绑定。',
      mechanism: '方法调用时，每个形参都会得到实参值的一份副本。基本类型的副本是数值，引用类型的副本是指向同一对象的引用值。于是方法内通过形参修改对象字段，调用方随后能看到共享对象的状态变化；但把形参赋成另一个新对象，只改变局部引用副本。数组也是对象，修改元素可见，重新给形参数组赋值不可见。准确说“复制了引用值”能解释现象，也避免误导为 C++ 式引用参数。',
      example: '方法 `rename(User u)` 先执行 `u.name = "Li"`，再执行 `u = new User("Wang")`。调用后原 User 的 name 变为 Li，但调用方变量不会指向 Wang。想交换两个调用方引用，应该返回结果并由调用方重新赋值。',
      followUps: [
        { question: '为什么传入 List 后 add 的结果能被调用方看到？', answer: '双方引用值虽然各自独立，却指向同一个 List 对象，add 修改的是这个共享对象。' },
        { question: 'String 参数为何看起来修改不了？', answer: 'String 不可变，所谓修改会创建新对象并重绑局部形参，不会改变调用方的变量。' },
      ],
      pitfalls: ['把“引用值的副本”简称为引用传递，错误认为方法能重绑调用方变量。', '为避免副作用只复制外层集合，实际仍与调用方共享内部可变元素。'],
    }, GUIDE.xiaolinJava, OFFICIAL.jlsExpressions, OFFICIAL.jlsTypes),
    withSources({
      title: '面向对象的封装、继承和多态分别是什么？',
      summary: '封装保护状态与不变量，继承建立可替换的类型关系，多态让调用方依赖抽象并在运行时选择具体实现；三者共同降低变化传播。',
      mechanism: '封装不只是把字段改成 private，而是让状态只能通过能校验规则的方法变化。继承表达“子类型是父类型”，只有子类能在父类所有合法场景中替代父类时才合理；仅为复用代码通常优先组合。多态主要体现在实例方法动态分派：编译期按静态类型确认可调用签名，运行时按实际对象选择重写实现。字段、静态方法和 private 方法不走相同的动态分派。好的抽象还要明确失败、生命周期与线程安全契约。',
      example: '支付模块定义 PaymentMethod.pay，银行卡和余额分别实现，订单服务只依赖接口。账户余额通过 debit 方法检查余额并更新，不能只暴露 setBalance。若 OrderService 只是想复用日志能力，应组合 Logger，而不是让它继承 Logger。',
      followUps: [
        { question: '为什么组合通常比实现继承更稳？', answer: '组合只依赖公开契约，不继承内部状态和可重写钩子，并且可以更灵活地替换实现。' },
        { question: '多态是否只发生在接口调用上？', answer: '不是。普通父子类的实例方法重写也会动态分派，接口只是更清晰地隔离抽象与实现。' },
      ],
      pitfalls: ['只背三个定义，不说明它们怎样维护业务不变量和隔离变化。', '把代码复用当作继承的充分理由，忽略子类型可替换关系。'],
    }, GUIDE.xiaolinJava, OFFICIAL.jlsClasses, OFFICIAL.jlsInterfaces),
    withSources({
      title: '方法重载和方法重写有什么区别？',
      summary: '重载是在同一作用域用不同参数列表提供多个方法，编译期决定调用哪一个；重写是子类替换可继承实例方法实现，运行时动态分派。',
      mechanism: '重载关注方法签名的参数类型、个数或顺序，不能只靠返回值区分；解析依据表达式的编译期类型，并按基本类型宽化、装箱、可变参数等适用阶段选择最具体方法。重写要求方法签名兼容，返回类型可协变，访问权限不能更严格，受检异常不能扩大。实例方法重写参与动态分派；static 方法是隐藏，private 方法不被子类继承，final 方法明确禁止重写。',
      example: '同时存在 print(long) 和 print(Integer) 时，传入 int 字面量通常选择 long，因为无需装箱的宽化阶段先适用。Animal a = new Dog() 调用 a.sound() 时，编译器确认 Animal 有该签名，运行时执行 Dog 的重写实现。',
      followUps: [
        { question: '返回值不同能构成合法重载吗？', answer: '不能。调用处可能不接收返回值，编译器无法仅靠返回类型区分同名同参数方法。' },
        { question: '构造器能被重写吗？', answer: '不能。构造器不被继承，因此只能在同一个类中重载，子类构造器会调用父类构造过程。' },
      ],
      pitfalls: ['把重载也说成运行时根据对象真实类型选择，混淆静态绑定与动态分派。', '认为 static 同名方法属于重写，忽略它只按引用静态类型进行隐藏解析。'],
    }, GUIDE.basics01, OFFICIAL.jlsClasses, OFFICIAL.jlsExpressions),
    withSources({
      title: '接口和抽象类有什么区别，应该怎样选择？',
      summary: '接口侧重定义跨类型能力与契约，抽象类适合共享受控状态和模板实现；选择关键是领域关系与演进边界，而不是简单比较是否能写方法。',
      mechanism: '类只能直接继承一个类，却可以实现多个接口。抽象类可有实例字段、构造器、不同可见性的成员和抽象方法，适合同一家族共享状态与骨架。接口字段隐式为 public static final，方法可包含 abstract、default、static 和 private 形式，但不持有每个实现对象的可变实例状态。default 方法用于兼容演进而非替代完整基类。若调用方只需要某种能力，优先依赖小接口；只有确实存在稳定“是一个”关系和共享不变量时再引入抽象类。',
      example: '不同存储实现都具备 Repository 能力，可以实现同一接口；若多种账户共享 id、开户规则和受保护状态迁移，可由 AbstractAccount 提供模板。不要创建只有空实现的巨大接口，也不要为了复用两个工具方法强迫无关类继承共同父类。',
      followUps: [
        { question: '接口有 default 方法后是否等同抽象类？', answer: '不等同。接口仍没有每个实例的构造和可变字段，并保留多实现能力，状态模型和继承约束不同。' },
        { question: '抽象类可以不包含抽象方法吗？', answer: '可以。它仍可通过 abstract 阻止直接实例化，并为子类提供共同状态和实现。' },
      ],
      pitfalls: ['继续用“接口不能有实现”解释区别，忽略现代 Java 的 default 与 private 方法。', '仅因想复用代码就建立抽象父类，制造不成立的继承关系。'],
    }, GUIDE.basics02, OFFICIAL.jlsInterfaces, OFFICIAL.jlsClasses),
    withSources({
      title: '双等号、equals 和 hashCode 有什么关系？',
      summary: '基本类型的双等号比较数值，引用类型的双等号比较身份；equals 定义逻辑相等，而相等对象必须返回相同 hashCode 才能正确用于哈希容器。',
      mechanism: 'Object.equals 默认仍是身份相等，值对象需要按业务身份重写，并满足自反、对称、传递、一致和非空约束。hashCode 的核心契约是：equals 为 true 的对象必须得到相同哈希值；反过来哈希相同不代表 equals。HashMap、HashSet 先用哈希定位候选桶，再用 equals 区分键。若只重写 equals，不同步重写 hashCode，相等对象可能进入不同桶。参与两者计算的字段在作为键期间也应保持稳定。',
      example: 'UserId 值对象按 id 重写 equals 和 hashCode 后，两次反序列化得到的对象可作为同一 Map 键。若对象放进 HashSet 后修改参与哈希的 id，集合可能无法在新旧桶位置正确找到或删除它，因此更适合使用不可变键。',
      followUps: [
        { question: '两个对象 hashCode 相同就一定 equals 吗？', answer: '不一定。哈希值空间有限，碰撞是允许的，容器还需要继续调用 equals 确认逻辑相等。' },
        { question: '为什么枚举常量通常可以用双等号？', answer: '每个枚举常量由运行时提供唯一实例，身份比较正好符合其语义，也避免 null 调用 equals。' },
      ],
      pitfalls: ['只重写 equals 而不重写 hashCode，破坏哈希集合查找契约。', '把可变字段放进哈希计算，并在对象作为键期间修改该字段。'],
    }, GUIDE.basics02, OFFICIAL.object, OFFICIAL.hashMap),
    withSources({
      title: 'String 为什么不可变，StringBuilder 和 StringBuffer 怎么选？',
      summary: 'String 创建后内容不再变化，便于共享、缓存、哈希与并发读取；频繁拼接用可变缓冲区，单线程优先 StringBuilder，需要同步语义才考虑 StringBuffer。',
      mechanism: 'String 的字符内容对外没有原地修改入口，拼接和 replace 都返回新对象。不可变使字符串池、安全参数和缓存的 hashCode 更可控，也便于跨线程安全共享。编译器可折叠常量拼接，但循环内反复使用加号可能创建大量中间对象。StringBuilder 提供非同步的可变字符序列，通常适合局部拼接；StringBuffer 的公开操作带同步，单次方法线程安全，但多步复合逻辑仍需外部协调。三者都不应被误解为自动解决编码和 Unicode 边界。',
      example: '生成一万行 CSV 时，应在方法内创建 StringBuilder 并连续 append，最后一次 toString；直接在循环中 result = result + line 会不断复制已有内容。若缓冲区只属于当前请求，没有理由使用 StringBuffer 增加同步开销。',
      followUps: [
        { question: '`String s = "a" + "b"` 一定创建多个运行时对象吗？', answer: '不一定。编译期常量表达式可被折叠为一个常量，变量参与的拼接才需要结合字节码和运行时优化判断。' },
        { question: 'StringBuffer 能保证一组 append 的整体原子性吗？', answer: '不能自动保证。每次方法调用可同步，但多个调用组成的业务步骤仍可能被其他线程穿插。' },
      ],
      pitfalls: ['笼统说所有加号拼接都慢，忽略常量折叠和编译器生成策略。', '把 StringBuffer 单方法同步等同于任意复合操作都线程安全。'],
    }, GUIDE.basics02, OFFICIAL.string, OFFICIAL.stringBuilder, OFFICIAL.stringBuffer),
    withSources({
      title: 'Java 的异常体系是怎样的，受检异常和非受检异常有何区别？',
      summary: 'Throwable 分为 Error 与 Exception；Exception 中除 RuntimeException 体系外通常属于受检异常，编译器要求捕获或声明，非受检异常则不强制处理。',
      mechanism: 'Error 多表示应用通常难以恢复的运行环境问题，不应靠普通业务捕获继续运行。受检异常用于调用方有合理恢复动作的失败，方法签名必须 throws 或在内部捕获；RuntimeException 及其子类常表达参数、状态或编程错误。异常设计应保留原始 cause，添加必要上下文，并在能真正恢复、转换边界或统一记录的位置处理。try-with-resources 会逆序关闭 AutoCloseable 资源，关闭异常作为 suppressed 附加，优于手写 finally 覆盖主异常。',
      example: '读取配置文件失败可在基础设施层捕获 IOException，附带文件名后转换为领域启动异常并保留 cause；不能空 catch 后返回默认值掩盖错误。数据库连接和输入流放入 try-with-resources，确保正常与异常路径都释放。',
      followUps: [
        { question: '业务异常一定要设计成受检异常吗？', answer: '不一定。应看调用方是否能合理恢复以及团队 API 约定，不能只按“业务”二字机械选择。' },
        { question: '为什么不建议直接 catch Throwable？', answer: '它会连 Error 一起捕获，可能让内存耗尽等严重状态被误当作普通失败继续执行。' },
      ],
      pitfalls: ['捕获 Exception 后既不处理也不继续抛出，导致根因和失败信号丢失。', '每层都记录同一异常再抛出，造成重复日志却没有新增上下文。'],
    }, GUIDE.basics03, OFFICIAL.jlsExceptions, OFFICIAL.throwable),
    withSources({
      title: '什么是反射，它有哪些典型用途和代价？',
      summary: '反射让程序在运行时检查类、方法、字段和构造器并进行动态调用，常用于框架装配、序列化和测试，但会削弱静态检查与封装边界。',
      mechanism: '反射入口通常来自 Class 对象，可查询声明成员、注解与类型信息，再通过 Constructor、Method 或 Field 执行操作。它支撑依赖注入、ORM 映射和通用序列化，但需要处理访问权限、参数转换、包装异常和模块开放。现代 JVM 会优化部分反射路径，不能简单宣称一定慢几十倍；真正代价还包括启动扫描、缓存、可读性、重构安全和原生镜像可达性配置。若类型在编译期已知，普通调用或明确接口通常更可靠。',
      example: '测试框架可扫描带 Test 注解的方法并动态执行，ORM 可依据映射创建实体。生产代码应缓存已解析的 Method 或元数据，启动时校验签名并给出清晰错误；不要在每条高频请求上重复扫描所有类。',
      followUps: [
        { question: 'Class 对象常见的获取方式有哪些？', answer: '可使用类型字面量、对象的 getClass，或按类名由 Class.forName 触发加载；三者适用时机不同。' },
        { question: '反射是否可以无条件访问 private 成员？', answer: '不可以。访问检查、模块 opens、运行环境策略和 API 限制都可能阻止深反射。' },
      ],
      pitfalls: ['把反射当成绕过所有封装和模块限制的万能入口。', '在热点路径反复扫描与解析成员，不做缓存、预热和失败校验。'],
    }, GUIDE.basics03, OFFICIAL.reflection, OFFICIAL.jlsExecution),
  ],
}
