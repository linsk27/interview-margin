import { strengthenPlatformExamples } from './platform-example-quality.js'

const entries = [
  {
    number: 1,
    title: '数据库索引的本质是什么？',
    mechanism: '索引是把一个或多个列的键值按可搜索结构组织，并保存到数据行的定位信息，以额外空间、写放大和维护成本换取更少的数据页读取。InnoDB 常用 B+Tree：页是磁盘与缓冲池的基本单位，内部页保存分隔键与子页指针，叶子页保存整行或主键。优化器不会因为“存在索引”就必用，它会根据基数、范围宽度、回表次数、排序与统计信息估算成本；低选择性条件返回大部分表时，顺序扫描可能更便宜。因此索引设计必须来自查询的过滤、连接、排序和返回列，而不是给每列各建一棵树。索引还会占用 buffer pool，并使 INSERT/UPDATE/DELETE 同步修改相关页和日志。',
    example: [
      '先建立与真实查询匹配的联合索引，再比较计划和实际扫描，而不是只观察 SQL 是否“能跑”。',
      '',
      '~~~sql',
      'CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);',
      'EXPLAIN ANALYZE',
      "SELECT id, created_at FROM orders",
      "WHERE user_id = 42 AND created_at >= '2026-07-01'",
      'ORDER BY created_at LIMIT 20;',
      'SHOW INDEX FROM orders;',
      '~~~',
      '',
      '计划若显示沿 `idx_orders_user_created` 范围读取约 20 行且无需额外排序，索引解决了访问路径；若实际仍扫描数十万行，应核对统计、条件选择性和隐式类型转换。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么高选择性索引也可能不被使用？',
        answer: '查询返回列很多且需要大量回表、统计信息失真、列被函数包裹或类型发生转换时，优化器可能估算全表扫描成本更低；应查看实际执行计划。'
      },
      {
        question: '索引越多，查询一定越快吗？',
        answer: '不是。多余索引增加写入、日志、空间和缓存压力，优化器也要评估更多候选；只保留能服务稳定访问模式且收益经验证的索引。'
      }
    ],
    pitfalls: [
      '只看到 EXPLAIN 的 key 有值就认定优化完成，会忽略实际扫描行数、回表、排序以及估算与真实值的巨大偏差。',
      '给低基数字段单独建索引却不结合其他过滤列，可能读出表中大部分主键并随机回表，反而比全表扫描更慢。'
    ],
    sources: [
      { label: 'MySQL 8.4：How MySQL Uses Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html' },
      { label: 'MySQL 8.4：Optimization and Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html' }
    ]
  },
  {
    number: 2,
    title: 'B+Tree 为什么适合范围查询？',
    mechanism: 'B+Tree 适合范围查询，直接原因是所有数据都按索引键排在叶子页上，而且相邻叶子页彼此链接：先用树高很低的索引定位区间起点，之后只要顺着叶子页向后读到终点，不必为区间内每个值重新从根查找。它是面向页的多路平衡搜索树；内部节点只保存有序分隔键和子页指针，因此一个通常为 16KB 的 InnoDB 页能容纳大量分支，几层树高即可覆盖千万级记录。页分裂与合并维持有序和平衡，缓冲池又能缓存常访问的上层页。相比哈希结构，它既能等值定位，也天然支持 `>、BETWEEN、ORDER BY` 和前缀范围，但列顺序与排序方向仍必须符合索引键序。',
    example: [
      '用同一联合索引演示“先定位起点，再顺序扫描叶子”，并检查实际读取行数。',
      '',
      '~~~sql',
      'CREATE INDEX idx_events_tenant_time ON events(tenant_id, happened_at, id);',
      'EXPLAIN ANALYZE',
      "SELECT id, happened_at FROM events",
      "WHERE tenant_id = 7 AND happened_at BETWEEN '2026-07-01' AND '2026-07-02'",
      'ORDER BY happened_at, id;',
      '~~~',
      '',
      '预期计划出现 index range scan，读取行数接近该租户一天的真实记录数。若去掉 `tenant_id = 7`，不能直接跳到第二列的连续区间，扫描范围可能扩大。'
    ].join('\n'),
    followUps: [
      {
        question: 'B+Tree 与 B-Tree 在数据库语境中的关键差别是什么？',
        answer: 'B+Tree 把数据条目集中在叶子，内部页只做导航，并把叶子有序串联；这提高扇出且让范围扫描连续，数据库文档有时会宽泛地简称 B-tree。'
      },
      {
        question: '范围条件后面的索引列完全没用吗？',
        answer: '不一定。它们通常不能继续缩小连续定位区间，但可能用于索引条件下推、覆盖返回或满足部分排序；是否生效要看具体计划。'
      }
    ],
    pitfalls: [
      '把树高等同于物理磁盘随机 I/O 次数会高估成本，根和热点内部页通常已在 buffer pool，中间还受预读与缓存影响。',
      '认为任意列上的范围条件都能利用联合 B+Tree，会忽略索引从第一列开始的字典序以及前导列是否受约束。'
    ],
    sources: [
      { label: 'MySQL 8.4：The Physical Structure of an InnoDB Index', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html' },
      { label: 'MySQL 8.4：B-Tree Index Characteristics', url: 'https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html' }
    ]
  },
  {
    number: 3,
    title: '聚簇索引和二级索引有什么区别？',
    mechanism: 'InnoDB 的聚簇索引叶子就是整行数据，一张表只能按一套聚簇键组织；通常选择主键，没有显式主键时会找首个非空唯一键，仍没有则生成隐藏行 ID。二级索引叶子保存二级键和该行的主键，不保存通用物理地址，因此用二级索引查询非覆盖列时先取得主键，再访问聚簇树完成“回表”。主键过宽会被复制到每棵二级索引，增加空间、缓存与写成本；随机主键还容易造成叶子页分裂。二级索引若已经包含过滤列、返回列以及隐含主键，可直接覆盖查询而无需回表。选择主键时要同时考虑唯一、稳定、短小和插入局部性，而非只考虑业务可读性。',
    example: [
      '下面两条查询都走相同二级索引，但只有第一条可直接从索引叶子返回。',
      '',
      '~~~sql',
      'CREATE TABLE users (',
      '  id BIGINT PRIMARY KEY, email VARCHAR(255) NOT NULL, nickname VARCHAR(80),',
      '  UNIQUE KEY uk_users_email (email)',
      ') ENGINE=InnoDB;',
      "EXPLAIN SELECT id, email FROM users WHERE email = 'linda@example.com';",
      "EXPLAIN SELECT id, email, nickname FROM users WHERE email = 'linda@example.com';",
      '~~~',
      '',
      '第一条所需的 email 与隐含主键 id 均在二级索引中；第二条还需 nickname，计划会通过主键回到聚簇索引读取整行。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么 UUID 主键可能放大二级索引？',
        answer: '主键值存在每个二级索引叶子中，宽 UUID 会让所有二级索引更大；若值随机，还会降低聚簇叶子插入局部性并增加页分裂。'
      },
      {
        question: '二级索引查询一定发生两次磁盘 I/O 吗？',
        answer: '不一定。覆盖查询无需回表，且相关页可能已在 buffer pool；“两棵树访问”描述逻辑路径，不应机械等同为两次物理读盘。'
      }
    ],
    pitfalls: [
      '把聚簇索引理解成独立于表数据的另一份索引，会误算空间；InnoDB 聚簇叶子本身就是记录存储。',
      '使用可变业务字段作为主键后再更新，会同时影响聚簇组织及所有二级索引中的主键副本，代价远高于普通列更新。'
    ],
    sources: [
      { label: 'MySQL 8.4：Clustered and Secondary Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html' },
      { label: 'MySQL 8.4：Physical Structure of an InnoDB Index', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html' }
    ]
  },
  {
    number: 4,
    title: '联合索引的最左前缀是什么？',
    mechanism: '联合索引 `(a,b,c)` 按 a、再 b、再 c 的字典序排列。能直接形成连续查找区间的条件必须从最左列开始：`a=?`、`a=? AND b=?`、`a=? AND b=? AND c BETWEEN ...` 都可逐步缩小；只给 `b` 或 `c` 时，不同 a 分组中的目标值散落在整棵树，通常无法一次定位。某列出现非等值范围后，后续列一般不能继续界定单个连续范围，但可能用于覆盖、索引条件下推或 skip scan 等特定优化，不能简单说“后面完全失效”。最左前缀也影响 ORDER BY：前导列被常量等值约束后，后续键序才可直接提供排序。结论必须用具体 MySQL 版本和 EXPLAIN ANALYZE 验证。',
    example: [
      '建立 `(tenant_id, status, created_at)` 后，对三种条件分别检查访问行数和 Extra。',
      '',
      '~~~sql',
      'CREATE INDEX idx_jobs_tenant_status_time ON jobs(tenant_id, status, created_at);',
      "EXPLAIN SELECT id FROM jobs WHERE tenant_id=9 AND status='ready'",
      "  AND created_at >= '2026-07-01' ORDER BY created_at LIMIT 50;",
      "EXPLAIN SELECT id FROM jobs WHERE status='ready';",
      "EXPLAIN SELECT id FROM jobs WHERE tenant_id=9 AND created_at >= '2026-07-01';",
      '~~~',
      '',
      '第一条能连续定位完整前缀；第二条缺少 tenant_id，通常扫描更广；第三条虽跳过 status，仍可能使用 tenant 前缀过滤，但 created_at 不能形成同样紧凑的连续区间。'
    ].join('\n'),
    followUps: [
      {
        question: 'WHERE 条件书写顺序会改变最左前缀吗？',
        answer: '通常不会，优化器会重排可交换的条件；真正决定键序的是索引定义、操作符和约束关系，而不是 SQL 文本中先写哪一项。'
      },
      {
        question: '跳过第一列是否绝对不可能使用索引？',
        answer: '不是绝对。优化器可能做全索引扫描或 skip scan，但成本和适用条件不同；不能把“显示 key”误当成高效点查。'
      }
    ],
    pitfalls: [
      '把最左前缀解释成 WHERE 必须按索引列顺序书写，会造成无意义的 SQL 重排，却没有改变真实访问路径。',
      '看到后续列出现在 key_len 就断言所有条件都用于定位，应结合 range、rows、filtered 和索引条件下推判断。'
    ],
    sources: [
      { label: 'MySQL 8.4：Multiple-Column Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html' },
      { label: 'MySQL 8.4：Range Optimization of Row Constructor Expressions', url: 'https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html' }
    ]
  },
  {
    number: 5,
    title: '联合索引列顺序如何确定？',
    mechanism: '列顺序要围绕一组高频且高成本的查询共同设计。通常先放始终存在的等值租户/业务边界，再放其他等值过滤，随后考虑第一个范围列；若查询要求 ORDER BY 与 LIMIT，索引尾部应尽量延续排序键并加唯一决定项。选择性是成本因素但不是唯一规则：区分度最高列若经常缺失，放首位会让其他关键查询无法定位；一个低基数状态列与 tenant_id 组合后可能非常有效。还要评估返回列覆盖、索引宽度、更新频率和重复索引。用生产分布下的 EXPLAIN ANALYZE 比较候选方案，并验证不同参数值，防止只针对一个样本得到偶然最优。',
    example: [
      '订单列表按用户和状态过滤、按时间倒序分页，可先评估下面的访问路径。',
      '',
      '~~~sql',
      'CREATE INDEX idx_orders_user_status_created_id',
      '  ON orders(user_id, status, created_at DESC, id DESC);',
      'EXPLAIN ANALYZE',
      "SELECT id, total, created_at FROM orders",
      "WHERE user_id=42 AND status='paid'",
      'ORDER BY created_at DESC, id DESC LIMIT 30;',
      '~~~',
      '',
      'user_id 与 status 均为等值，后续键序直接提供稳定排序。若另一个主查询只按 status 跨用户统计，应为它单独评估索引，而不是强迫一棵索引兼顾所有场景。'
    ].join('\n'),
    followUps: [
      {
        question: '区分度最高的列是否永远应该放第一？',
        answer: '不是。首列还必须匹配常见查询前缀；租户列即使全局区分度较低，也能形成数据隔离边界，并让后续状态和时间在租户内有意义。'
      },
      {
        question: '等值列之间的顺序完全无所谓吗？',
        answer: '对单条同时等值约束两列的查询可能接近，但它会决定哪些较短前缀可复用，也影响压缩、统计和其他查询，因此仍要看整体工作负载。'
      }
    ],
    pitfalls: [
      '只为一条慢 SQL 堆满所有返回列，可能生成过宽索引，导致写放大和 buffer pool 命中率下降，整体性能反而变差。',
      '忽略参数分布只用测试库少量均匀数据验证，会掩盖热门租户、状态倾斜和范围跨度对计划选择的影响。'
    ],
    sources: [
      { label: 'MySQL 8.4：Multiple-Column Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html' },
      { label: 'MySQL 8.4：ORDER BY Optimization', url: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html' }
    ]
  },
  {
    number: 6,
    title: '什么是覆盖索引？',
    mechanism: '覆盖索引不是特殊索引类型，而是某条查询需要的过滤、连接、排序和返回列都能从选定索引获得，因此无需按主键回到聚簇索引读取整行。它减少随机页访问，在大量命中二级索引时收益明显；InnoDB 二级索引叶子还隐含主键，所以只查询二级键和主键往往天然覆盖。覆盖是“相对查询”的属性，同一索引对另一条多返回一个列的 SQL 就可能不覆盖。把所有字段追加进索引会让叶子页变宽、树增大、缓存效率下降，并提高每次写入成本。设计时应优先覆盖高频、返回行较多且列集合稳定的查询，并用 EXPLAIN 的 Extra 和实际 I/O 验证。',
    example: [
      '相同过滤条件下，比较覆盖查询与需要读取大文本列的查询。',
      '',
      '~~~sql',
      'CREATE INDEX idx_questions_bank_status_id ON questions(bank_id, status, id);',
      "EXPLAIN SELECT id, status FROM questions WHERE bank_id=8 AND status='published';",
      "EXPLAIN SELECT id, status, body FROM questions WHERE bank_id=8 AND status='published';",
      '~~~',
      '',
      '第一条通常显示 `Using index`，叶子已有 bank_id、status 和隐含/显式 id；第二条需要 body，会按每个匹配 id 回表。若匹配十万行，两者随机读差异会非常明显。'
    ].join('\n'),
    followUps: [
      {
        question: 'EXPLAIN 的 Using index 与 Using index condition 相同吗？',
        answer: '不同。Using index 通常表示覆盖读取；Using index condition 表示索引条件下推，仍可能需要回表获取其他列，二者不能混为一谈。'
      },
      {
        question: '为什么宽覆盖索引会降低其他查询性能？',
        answer: '每页容纳条目减少，树和缓存占用增大，页读与维护成本上升；热点内部/叶子页更难全部驻留在 buffer pool。'
      }
    ],
    pitfalls: [
      '把 `SELECT *` 的所有列都塞入联合索引来追求覆盖，通常会复制大文本和频繁变化列，写入与缓存成本不可接受。',
      '只凭 key 名称判断覆盖而不看查询返回列和 Extra，会把普通二级索引回表误认为已经消除随机访问。'
    ],
    sources: [
      { label: 'MySQL 8.4：Covering Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_covering_index' },
      { label: 'MySQL 8.4：EXPLAIN Extra Information', url: 'https://dev.mysql.com/doc/refman/8.4/en/explain-output.html#explain-extra-information' }
    ]
  },
  {
    number: 7,
    title: '为什么对索引列使用函数可能失效？',
    mechanism: '因为普通 B+Tree 索引只按原始列值排序，WHERE 先对每行做函数计算后，优化器通常无法把计算结果反推出原索引上的连续起止范围，只能逐行计算和筛选。普通索引保存原始列值的有序键。若条件写成 `DATE(created_at)=...`、`LOWER(email)=...` 或对列做算术，优化器通常无法把计算后的结果反推成原始键上的连续起止范围，只能逐行计算，导致全表或全索引扫描。优先把条件改写为列本身与常量范围比较，例如一天转为 `[起点, 次日起点)`；这既可使用 B+Tree，又正确处理时间精度。若业务确实频繁按表达式查询，可在 MySQL 支持范围内创建函数索引或可索引生成列，但表达式、排序规则和数据类型必须与查询匹配。隐式类型转换也属于相似问题，尤其字符串列与数字常量比较时要检查计划。',
    example: [
      '把按日期过滤从逐行函数计算改为半开区间，并比较 EXPLAIN ANALYZE。',
      '',
      '~~~sql',
      'CREATE INDEX idx_orders_created ON orders(created_at);',
      "EXPLAIN ANALYZE SELECT id FROM orders WHERE DATE(created_at)='2026-07-20';",
      'EXPLAIN ANALYZE SELECT id FROM orders',
      "WHERE created_at >= '2026-07-20 00:00:00'",
      "  AND created_at <  '2026-07-21 00:00:00';",
      '~~~',
      '',
      '第二条应形成 created_at 的 range scan；使用小于次日起点而非 `23:59:59`，可避免 DATETIME 微秒精度造成当天尾部记录遗漏。'
    ].join('\n'),
    followUps: [
      {
        question: '把函数移动到常量一侧为什么常能恢复索引？',
        answer: '常量只计算一次，列仍以索引中保存的原值参与比较，优化器可构造明确的起止键；前提是变换语义等价且处理好时区与边界。'
      },
      {
        question: '函数索引是否没有额外成本？',
        answer: '有。写入时必须计算和维护表达式结果，占用额外页与日志；表达式变更还涉及迁移，只有稳定且高收益的访问模式才值得建立。'
      }
    ],
    pitfalls: [
      '用 `BETWEEN 当天00:00:00 AND 23:59:59` 代替 DATE 可能遗漏带小数秒的数据，半开区间更准确。',
      '只修改 SQL 文本却不检查列与参数类型，驱动传错类型导致隐式转换时仍可能扫描大量索引条目。'
    ],
    sources: [
      { label: 'MySQL 8.4：Functional Key Parts', url: 'https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts' },
      { label: 'MySQL 8.4：Optimizer Use of Generated Column Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/generated-column-index-optimizations.html' }
    ]
  },
  {
    number: 8,
    title: 'LIKE 什么时候能使用索引？',
    mechanism: '对普通 B+Tree 字符串索引，模式具有固定前缀时，如 `name LIKE \'abc%\'`，优化器可把前缀转换为由排序规则决定的键范围，再过滤剩余模式；前导通配符 `\'%abc\'` 或 `\'_abc\'` 没有已知起点，通常必须扫描大量条目。能否使用还受列的排序规则、字符集、参数化、转义和索引前缀长度影响；大小写不敏感 collation 会按其比较规则形成范围。需要任意子串搜索时，应采用全文索引、倒排搜索引擎或专门的 n-gram 方案，而不是期待普通 B+Tree 解决。即使前缀可用，若前缀太短、命中大部分表，优化器也可能选择扫描。',
    example: [
      '给标题建立索引后，对固定前缀与前导通配符分别执行实际计划。',
      '',
      '~~~sql',
      'CREATE INDEX idx_questions_title ON questions(title);',
      "EXPLAIN ANALYZE SELECT id FROM questions WHERE title LIKE 'TCP%';",
      "EXPLAIN ANALYZE SELECT id FROM questions WHERE title LIKE '%TCP%';",
      "SELECT '100% coverage' LIKE '100\\% %' ESCAPE '\\\\';",
      '~~~',
      '',
      '第一条通常是 range scan，第二条只能遍历；第三条提醒用户输入中的 `%` 和 `_` 必须按既定 ESCAPE 规则处理，否则它们会意外变成通配符并扩大结果。'
    ].join('\n'),
    followUps: [
      {
        question: 'LIKE \'abc%def\' 能否使用索引？',
        answer: '可以先利用固定前缀 abc 定位范围，再对候选行检查后续 `%def`；索引缩小程度取决于 abc 的选择性。'
      },
      {
        question: '为什么短前缀可用索引却仍可能很慢？',
        answer: '可用不等于划算。若前缀命中数百万行，仍需扫描和可能回表；优化器可能选全表扫描，应以实际 rows 和耗时判断。'
      }
    ],
    pitfalls: [
      '把用户搜索文本直接拼进 LIKE，不转义 `%` 与 `_`，不仅结果范围错误，还会放大扫描并可能引入 SQL 注入风险。',
      '用 `LOWER(title) LIKE \'tcp%\'` 追求忽略大小写，却未建立对应函数索引；更应先选择合适 collation 或明确表达式索引。'
    ],
    sources: [
      { label: 'MySQL 8.4：B-Tree Index Use with LIKE', url: 'https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html' },
      { label: 'MySQL 8.4：Pattern Matching', url: 'https://dev.mysql.com/doc/refman/8.4/en/pattern-matching.html' }
    ]
  },
  {
    number: 9,
    title: '如何为给定 SQL 设计索引？',
    mechanism: '先还原完整访问模式，而不是只看 WHERE：列出等值、范围、JOIN 键、ORDER BY、LIMIT、返回列、查询频率、典型参数分布和写入量。候选联合索引通常从稳定等值边界开始，接范围或排序列，必要时追加少量返回列做覆盖；同时检查是否被现有索引前缀包含，避免重复。然后在接近生产的数据量与倾斜上运行 `EXPLAIN ANALYZE`，比较估算/实际行数、循环次数、排序、临时表和耗时；还需测试热门与冷门参数，因为同一 SQL 的选择性可能悬殊。上线后观察慢查询与写入成本，索引设计是工作负载驱动的迭代，不是按口诀一次完成。',
    example: [
      '给“租户内已发布题目按更新时间翻页”的查询设计一条既过滤又稳定排序的索引。',
      '',
      '~~~sql',
      'CREATE INDEX idx_questions_tenant_status_updated_id',
      '  ON questions(tenant_id, status, updated_at DESC, id DESC);',
      'EXPLAIN ANALYZE',
      'SELECT id, title, updated_at FROM questions',
      "WHERE tenant_id=12 AND status='published'",
      "  AND (updated_at, id) < ('2026-07-20 12:00:00', 9000)",
      'ORDER BY updated_at DESC, id DESC LIMIT 30;',
      '~~~',
      '',
      '预期扫描接近 30 行且无 filesort；若 title 导致回表但只取 30 行，未必值得把宽标题塞进索引，应以实际 I/O 和写成本取舍。'
    ].join('\n'),
    followUps: [
      {
        question: '为什么不能只依据 EXPLAIN 的估算 rows？',
        answer: '估算来自统计信息，遇到相关列或倾斜分布可能严重偏离；EXPLAIN ANALYZE 会给出实际行数和循环，有助于识别错误成本判断。'
      },
      {
        question: '一条联合索引能替代所有单列前缀索引吗？',
        answer: '仅当查询可使用该联合索引的左侧前缀且成本合适时；查询只按非前导列访问时，仍可能需要另一条索引。'
      }
    ],
    pitfalls: [
      '在空测试表上比较两个索引，优化器可能根本没有真实选择性与页成本，结论不能代表生产千万行和数据倾斜。',
      '为 ORDER BY 建索引却遗漏唯一决定列，分页时相同时间记录顺序不稳定，即使查询很快仍会出现重行和漏行。'
    ],
    sources: [
      { label: 'MySQL 8.4：Optimization and Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html' },
      { label: 'MySQL 8.4：Obtaining Information with EXPLAIN', url: 'https://dev.mysql.com/doc/refman/8.4/en/using-explain.html' }
    ]
  },
  {
    number: 10,
    title: '索引为什么会拖慢写入？',
    mechanism: '每次 INSERT 都要把新键写入聚簇索引及所有相关二级索引；DELETE 要标记并最终清理条目；更新索引列常等价于删除旧键再插入新键。随机键可能让目标叶子分散并触发页分裂，更多索引也会产生更多 undo/redo、脏页、buffer pool 占用和复制日志。唯一索引还需执行冲突检查。索引越宽、数量越多、更新列越频繁，写放大越明显，并可能延长锁持有和批量导入时间。删除索引前应证明它未服务关键查询；MySQL 可先把候选索引设为 invisible，观察计划和监控后再真正删除，但不可见索引仍会被维护，不能用于测量删除后的写收益。',
    example: [
      '先找出重复或低使用索引，把候选设为不可见验证读路径，再安排可回滚的删除与写入压测。',
      '',
      '~~~sql',
      'SHOW INDEX FROM events;',
      'ALTER TABLE events ALTER INDEX idx_events_status INVISIBLE;',
      'EXPLAIN SELECT id FROM events WHERE status = 1;',
      '-- 观察一轮完整业务周期后，如无计划退化再执行：',
      'ALTER TABLE events DROP INDEX idx_events_status;',
      '~~~',
      '',
      '对比删除前后的批量 INSERT TPS、redo bytes、buffer pool 脏页和关键读查询 P95；仅看单条 INSERT 毫秒数很容易被缓存和后台刷盘掩盖。'
    ].join('\n'),
    followUps: [
      {
        question: '顺序递增主键为何通常比随机键更利于写入？',
        answer: '新记录多落在聚簇树右侧热点叶子，页访问局部性较好、随机页分裂较少；但极高并发还要评估右端热点。'
      },
      {
        question: '把索引设为 invisible 会减少写成本吗？',
        answer: '不会。不可见只让优化器默认不选它，存储引擎仍维护该索引；它适合验证删除对读计划的影响，不代表删除后的写性能。'
      }
    ],
    pitfalls: [
      '仅凭“看起来重复”直接删除索引，可能破坏某个低频但关键的报表、外键检查或故障恢复查询，应先观察完整周期。',
      '批量写压测后立即结束而不观察后续刷脏和复制延迟，会把后台成本排除在测量外，得到虚高吞吐。'
    ],
    sources: [
      { label: 'MySQL 8.4：How MySQL Uses Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html' },
      { label: 'MySQL 8.4：Invisible Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html' }
    ]
  },
  {
    number: 11,
    title: 'EXPLAIN 主要看哪些信息？',
    mechanism: '`EXPLAIN` 要按执行树理解，而不是只寻找某个“好看”的 type。先看表/算子的连接顺序与访问方式，再看 `possible_keys`、实际 `key`、使用的键长度、估算 `rows` 与 `filtered`，估算输出大致是 rows×filtered；Extra 中的 `Using temporary`、`Using filesort`、覆盖、索引条件下推等说明后续工作。`EXPLAIN ANALYZE` 会真正执行查询，给出每个算子的实际时间、行数和循环次数，能暴露统计失真、嵌套循环放大和错误连接顺序。关注“上游传给下游多少行”以及估算/实际差距，而非把 ALL 一律判坏：小表全扫可能最优，显示 key 也可能扫描大半索引。对写语句使用 ANALYZE 前必须确认副作用和环境。',
    example: [
      '比较优化器估算与真实执行，重点读取 `actual rows` 和 `loops` 的乘积。',
      '',
      '~~~sql',
      'EXPLAIN FORMAT=TREE',
      'SELECT o.id, u.email FROM orders o JOIN users u ON u.id=o.user_id',
      "WHERE o.status='pending' ORDER BY o.created_at LIMIT 50;",
      'EXPLAIN ANALYZE',
      'SELECT o.id, u.email FROM orders o JOIN users u ON u.id=o.user_id',
      "WHERE o.status='pending' ORDER BY o.created_at LIMIT 50;",
      '~~~',
      '',
      '若估算 pending 为 100 行、实际为 500000 行，后面的主键查找 loops 也会被放大；先更新统计或改索引，而不是只因看到 `eq_ref` 就认为 JOIN 已最优。'
    ].join('\n'),
    followUps: [
      { question: 'Using filesort 是否一定落盘且一定很慢？', answer: '不是。它表示未直接按索引顺序完成排序，可能在内存中执行；成本取决于输入行数、排序键宽度、LIMIT 和内存，仍需看实际耗时。' },
      { question: '为什么 EXPLAIN ANALYZE 的 loops 很重要？', answer: '嵌套循环内层算子会执行多次，单次看似很快但乘以巨大 loops 后成为主成本；总工作量必须结合每轮行数和循环次数。' }
    ],
    pitfalls: [
      '把访问类型从 ALL 改成 range 就宣布成功，却不比较实际扫描和返回行数，可能只是从全表扫描变成全索引扫描。',
      '在生产直接对耗时 UPDATE/DELETE 执行 EXPLAIN ANALYZE，可能真实修改数据并持锁；应先确认版本语义并在安全副本验证。'
    ],
    sources: [
      { label: 'MySQL 8.4：EXPLAIN Output Format', url: 'https://dev.mysql.com/doc/refman/8.4/en/explain-output.html' },
      { label: 'MySQL 8.4：Obtaining Information with EXPLAIN ANALYZE', url: 'https://dev.mysql.com/doc/refman/8.4/en/explain.html#explain-analyze' }
    ]
  },
  {
    number: 12,
    title: '为什么 SELECT * 可能有问题？',
    mechanism: '`SELECT *` 让数据库、驱动和网络读取业务并不需要的列，宽 JSON/BLOB/TEXT 会放大页访问、内存复制和响应字节；原本可由二级索引覆盖的查询也会因为多取一列而回表。它还把接口结果隐式绑定到表结构：新增敏感列可能被意外序列化，列顺序变化可能破坏依赖位置的旧代码，同名列 JOIN 后也更易歧义。明确列清单能表达契约并支持最小权限和稳定映射。`SELECT *` 在临时人工检查或确实需要完整实体时可以使用，但高频列表、分页和 API 不应默认全取。优化不能只修改 SQL，还要确保 ORM 没有随后懒加载遗漏字段形成另一轮查询。',
    example: [
      '对题目列表只取卡片需要的列，避免每行读取正文和解析答案大字段。',
      '',
      '~~~sql',
      'CREATE INDEX idx_question_list ON questions(bank_id, status, updated_at, id);',
      "EXPLAIN ANALYZE SELECT * FROM questions WHERE bank_id=8 AND status='published' LIMIT 50;",
      'EXPLAIN ANALYZE SELECT id, status, updated_at FROM questions',
      "WHERE bank_id=8 AND status='published' LIMIT 50;",
      '~~~',
      '',
      '第二条可由列表索引覆盖，第一条还读取 body、answer 等整行。除耗时外，应记录 `Rows_examined` 与响应字节，确认优化不是仅在空缓存下偶然出现。'
    ].join('\n'),
    followUps: [
      { question: '明确列清单会增加维护成本吗？', answer: '会有少量显式更新成本，但它把数据库到接口的契约变得可审查，避免新增列被意外暴露，通常远小于隐式依赖造成的风险。' },
      { question: 'COUNT(*) 是否也有同样问题？', answer: '没有。COUNT(*) 表示统计行数，并非把每列传回客户端；优化器和存储引擎可选择合适访问路径，不能因星号字面相同而混淆。' }
    ],
    pitfalls: [
      '仅在数据库层改成指定列，但序列化器仍按完整实体触发 ORM 懒加载，会把一次宽查询变成大量 N+1 查询。',
      'JOIN 多表时使用 `SELECT *`，同名 id/status 在驱动映射中可能覆盖，造成数据错误而不仅是性能问题。'
    ],
    sources: [
      { label: 'MySQL 8.4：Optimizing SELECT Statements', url: 'https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html' },
      { label: 'MySQL 8.4：Optimization and Indexes', url: 'https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html' }
    ]
  },
  {
    number: 13,
    title: '深分页为什么慢？',
    mechanism: '`LIMIT 100000,20` 不会直接跳到第十万行。数据库必须沿满足 ORDER BY 的访问路径读取并丢弃前 100000 行，再返回 20 行；若索引不覆盖，还可能对大量候选回表或先排序。offset 越深，扫描成本近似线性增长，且并发插入/删除会让基于位置的页发生重复与遗漏。Keyset/seek 分页把上一页最后一条的稳定排序键作为下一次下界，索引可从该键继续扫描固定数量。排序包含同值时必须追加唯一键，并把所有排序列都放进游标条件；它适合“下一页”，但不天然支持任意跳到第 N 页，后台报表可用异步导出或预计算。',
    example: [
      '按 `created_at DESC, id DESC` 分页时，游标必须同时携带时间和 id。',
      '',
      '~~~sql',
      'CREATE INDEX idx_orders_created_id ON orders(created_at DESC, id DESC);',
      'EXPLAIN ANALYZE SELECT id, created_at FROM orders',
      'ORDER BY created_at DESC, id DESC LIMIT 100000, 20;',
      'EXPLAIN ANALYZE SELECT id, created_at FROM orders',
      "WHERE (created_at, id) < ('2026-07-19 12:00:00', 88321)",
      'ORDER BY created_at DESC, id DESC LIMIT 20;',
      '~~~',
      '',
      '第二条从游标位置继续，扫描应接近 20 行；在两页之间插入更新记录，再验证已浏览区域不会因 offset 位移而重复。'
    ].join('\n'),
    followUps: [
      { question: '为什么游标只保存 created_at 不够？', answer: '多行可能拥有相同时间，只用时间无法区分它们的相对位置，下一页条件会整组跳过或重复；必须追加唯一 id 形成全序。' },
      { question: 'Keyset 分页如何实现向上一页？', answer: '可保存页首游标，反转比较符与排序方向取前一批，再在应用层反转结果；接口应明确游标方向并对过滤条件签名。' }
    ],
    pitfalls: [
      '把 offset 改成基于 id 的 `id < lastId`，但页面实际按热度或时间排序，游标与 ORDER BY 不一致会产生错误结果。',
      '游标不绑定筛选条件和排序版本，客户端修改过滤器后复用旧游标，会从无意义位置继续并导致漏数据。'
    ],
    sources: [
      { label: 'MySQL 8.4：LIMIT Query Optimization', url: 'https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html' },
      { label: 'MySQL 8.4：ORDER BY Optimization', url: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html' }
    ]
  },
  {
    number: 14,
    title: 'JOIN 的驱动表如何选择？',
    mechanism: '在常见嵌套循环连接中，外层输入每产生一行，内层就按连接键查找一次，因此理想计划应尽早通过高选择性条件缩小外层，并让内层连接键可高效索引访问。但“永远小表驱动大表”不准确：优化器依据过滤后基数、统计、索引、排序和连接算法估算成本，原始表总行数并非决定项；MySQL 还可能采用 hash join。内连接通常可重排，外连接的语义会限制顺序。排查应读取 EXPLAIN ANALYZE 的树、实际行数和 loops，确认是哪一步产生放大；统计失真时先修复统计或查询结构，不应习惯性用 STRAIGHT_JOIN 固化可能只对当前分布有效的顺序。',
    example: [
      '订单表很大，但先过滤“最近一天未支付订单”后可能只剩少量行，适合作为外层。',
      '',
      '~~~sql',
      'CREATE INDEX idx_orders_status_created_user ON orders(status, created_at, user_id);',
      'EXPLAIN ANALYZE SELECT o.id, u.email FROM orders o',
      'JOIN users u ON u.id = o.user_id',
      "WHERE o.status='pending' AND o.created_at >= NOW() - INTERVAL 1 DAY;",
      '~~~',
      '',
      '若外层实际 500 行，users 主键查找 loops 约 500 合理；若统计估 500、实际 500000，应更新统计并重新设计过滤索引，而非只调整 JOIN 文本顺序。'
    ].join('\n'),
    followUps: [
      { question: 'SQL 中 FROM 后先写哪张表会决定驱动表吗？', answer: '对可重排的内连接通常不会，优化器会选择成本更低的顺序；外连接、依赖子查询或显式 hint 才可能限制重排。' },
      { question: '被驱动表连接列没有索引会怎样？', answer: '嵌套循环可能为外层每一行扫描大量内层数据，工作量成倍放大；优化器也可能改用 hash join，但仍需看内存和实际成本。' }
    ],
    pitfalls: [
      '死记“小表驱动大表”并按总行数选表，会忽略 WHERE 过滤后基数；大表过滤后可能反而是最小输入。',
      '用 STRAIGHT_JOIN 暂时修好一次倾斜参数后长期保留，数据分布变化时可能阻止优化器选择更好的新计划。'
    ],
    sources: [
      { label: 'MySQL 8.4：Nested-Loop Join Algorithms', url: 'https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html' },
      { label: 'MySQL 8.4：Hash Join Optimization', url: 'https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html' }
    ]
  },
  {
    number: 15,
    title: 'N+1 查询如何发现和修复？',
    mechanism: 'N+1 是先执行一次列表查询得到 N 行，再在循环中为每行执行一条关联查询，数据库往返、解析和连接池等待随 N 线性增长。少量测试数据时不明显，生产一页 100 条就变成 101 次，跨网络数据库尤其昂贵。发现方法是给单次 HTTP 请求关联 trace/request ID，统计 SQL 次数并把参数归一化，若相同模板重复出现即告警；ORM 日志和 APM span 也能定位懒加载触发点。修复可用 JOIN、一次 `WHERE id IN (...)` 批量查询后在内存映射、ORM eager preload，或 DataLoader 在同一调度窗口合并并缓存。需防止 JOIN 一对多导致行爆炸，批量 IN 也要限制大小并保留权限过滤。',
    example: [
      '题库列表需要每个题库的题目数时，用一次聚合替代循环中的 COUNT。',
      '',
      '~~~sql',
      'SELECT b.id, b.name, COUNT(q.id) AS question_count',
      'FROM question_banks b',
      'LEFT JOIN questions q ON q.bank_id=b.id AND q.deleted_at IS NULL',
      'WHERE b.owner_id=42',
      'GROUP BY b.id, b.name',
      'ORDER BY b.id LIMIT 50;',
      '~~~',
      '',
      '在集成测试中断言该接口 SQL 数量保持固定，例如不超过 3；把 page size 从 5 改为 50 后，查询次数不应从 6 增到 51。'
    ].join('\n'),
    followUps: [
      { question: '为什么直接 JOIN 不是所有 N+1 的最佳修复？', answer: '一对多 JOIN 会重复父行并放大传输，分页也可能被子行数量扭曲；有时分两次批量查询再按父键组装更稳定。' },
      { question: 'DataLoader 的缓存范围应如何设置？', answer: '通常限定在一次请求或明确授权上下文，避免跨用户缓存导致权限数据串用；它主要合并同一批次的键查询，不替代长期业务缓存。' }
    ],
    pitfalls: [
      '在开发环境只看单页 3 条数据，未对 SQL 次数建立断言，页面扩到 100 条后延迟才突然线性恶化。',
      '用一个无限长度 IN 列表替代 N+1，可能碰到包大小、解析成本和计划问题；应分批并控制上限。'
    ],
    sources: [
      { label: 'Hibernate 官方指南：Fetching 与 N+1', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#fetching' },
      { label: 'GraphQL DataLoader 官方仓库', url: 'https://github.com/graphql/dataloader' }
    ]
  },
  {
    number: 16,
    title: '规范化和反规范化如何权衡？',
    mechanism: '规范化把独立事实拆入关系并用键连接，减少同一信息多处复制，避免插入、更新和删除异常；数据库约束可在单点维护不变量。代价是读取时需要 JOIN 或聚合。反规范化把派生值、快照或重复字段预先写入读模型，减少高频复杂读取，但每份冗余都新增一致性协议：由谁更新、是否与主事务原子、失败如何重放、漂移如何检测和修复。应先用正确索引和查询计划验证规范化模型，再只对明确的读热点冗余。历史订单中的商品名称可能本来就是“下单时快照”，不属于错误重复；当前用户昵称则通常应引用单一事实源。选择基于读写比例、一致性要求、故障恢复和迁移成本。',
    example: [
      '订单保留下单时价格快照，同时用可重算汇总字段服务读请求，并建立对账修复。',
      '',
      '~~~sql',
      'START TRANSACTION;',
      'INSERT INTO order_items(order_id, product_id, product_name_snapshot, unit_price_snapshot)',
      'SELECT 9001, id, name, price FROM products WHERE id=77 FOR SHARE;',
      'INSERT INTO orders(id, item_total) VALUES(9001, 1);',
      'COMMIT;',
      'SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id',
      'GROUP BY o.id HAVING o.item_total <> COUNT(*);',
      '~~~',
      '',
      '快照字段表达历史事实，不随商品改名更新；item_total 是冗余加速字段，出现漂移时能由 order_items 重建。'
    ].join('\n'),
    followUps: [
      { question: '什么时候冗余字段应与主事务同步更新？', answer: '当业务读取要求提交后立即强一致，且冗余与事实位于同一数据库时，可放入同一事务；跨系统则通常需要 outbox 和可重放投影。' },
      { question: '历史快照为什么不应随主数据更新？', answer: '快照表达事件发生时的事实，例如成交价和收货地址；追随当前主数据更新会篡改历史语义、对账和审计结果。' }
    ],
    pitfalls: [
      '增加冗余列却没有指定事实源、更新路径和校验任务，短期查询变快，长期必然产生无法判断谁正确的漂移。',
      '为了“完全规范化”把稳定的一次性历史快照仍关联当前表，主数据变化后旧订单展示被意外改写。'
    ],
    sources: [
      { label: 'Microsoft Learn：Database Normalization Description', url: 'https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description' },
      { label: 'MySQL 8.4：Optimizing Database Structure', url: 'https://dev.mysql.com/doc/refman/8.4/en/optimizing-database-structure.html' }
    ]
  },
  {
    number: 17,
    title: '软删除字段如何影响索引？',
    mechanism: '软删除让绝大多数查询都隐含 `deleted_at IS NULL`，索引必须与租户、业务过滤和排序一起设计；单独给 deleted_at 建索引通常选择性很低。历史删除行仍占表和索引页，数据不断增长会放大扫描、备份与维护成本，因此还要有归档或物理清理策略。更棘手的是唯一性：普通 `UNIQUE(email)` 会阻止已删除用户重新使用邮箱，而 MySQL 没有通用部分唯一索引。可用生成列在活跃行返回 email、删除行返回 NULL，再对生成列唯一；MySQL 唯一索引允许多个 NULL。所有查询必须由统一作用域显式过滤软删除，管理员审计路径则要刻意包含历史，避免安全与业务语义混杂。',
    example: [
      '生成列只对活跃账号参与唯一约束，同时为常用列表建立组合访问路径。',
      '',
      '~~~sql',
      'ALTER TABLE users',
      '  ADD COLUMN active_email VARCHAR(255)',
      '    GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN email ELSE NULL END) STORED,',
      '  ADD UNIQUE INDEX uk_users_active_email(active_email),',
      '  ADD INDEX idx_users_tenant_live_updated(tenant_id, deleted_at, updated_at, id);',
      'UPDATE users SET deleted_at=NOW() WHERE id=7;',
      "INSERT INTO users(tenant_id,email) VALUES(1,'same@example.com');",
      '~~~',
      '',
      '插入应在旧行软删除后成功，但两条活跃同邮箱仍失败；迁移前先扫描现有重复值，否则添加唯一索引会中止。'
    ].join('\n'),
    followUps: [
      { question: '为什么 deleted_at 单列索引常常收益有限？', answer: '活跃行可能占绝大多数，IS NULL 命中范围过大；与 tenant、状态和排序列组合才能形成符合真实查询的紧凑访问路径。' },
      { question: '软删除能替代审计日志吗？', answer: '不能。它只保留当前行及删除时间，无法完整记录谁在何时把哪些字段从什么改为什么；审计需要不可篡改的事件或历史表。' }
    ],
    pitfalls: [
      'ORM 某条原生 SQL 忘记 `deleted_at IS NULL`，可能把已注销账号重新用于登录或统计；应统一默认作用域并测试旁路查询。',
      '软删除永不归档会让唯一检查、索引、备份和恢复持续膨胀，必须定义合规保留期与可恢复的清理流程。'
    ],
    sources: [
      { label: 'MySQL 8.4：CREATE TABLE Generated Columns', url: 'https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html' },
      { label: 'MySQL 8.4：CREATE INDEX', url: 'https://dev.mysql.com/doc/refman/8.4/en/create-index.html' }
    ]
  },
  {
    number: 18,
    title: '数据库为什么需要统计信息？',
    mechanism: '成本优化器需要预测每个谓词能留下多少行、索引范围要读多少页、不同 JOIN 顺序会循环多少次；这些预测来自表行数、索引基数、值分布与直方图等统计。统计陈旧、抽样误差、热门值倾斜或列间相关性会让估算偏离真实值，优化器可能选择错误索引、把大结果作为外层或错误估计排序内存。`ANALYZE TABLE` 可刷新 InnoDB 统计，列直方图能补充非索引列或倾斜分布，但更新统计也可能改变计划，因此应在副本/预发对关键 SQL 比较。最终依据是 EXPLAIN ANALYZE 的估算与实际行数差距，不能把“强制索引”当长期替代统计治理。',
    example: [
      '状态值高度倾斜时，先记录计划，再创建直方图并比较估算是否接近实际。',
      '',
      '~~~sql',
      'EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 9;',
      'ANALYZE TABLE jobs UPDATE HISTOGRAM ON status WITH 32 BUCKETS;',
      'EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 9;',
      'SELECT * FROM information_schema.column_statistics',
      "WHERE schema_name=DATABASE() AND table_name='jobs';",
      '~~~',
      '',
      '若 status=9 只占万分之一，更新后 estimated rows 应更接近 actual rows；还要测试 status=1 这个热门值，不能只优化一个参数。'
    ].join('\n'),
    followUps: [
      { question: 'ANALYZE TABLE 是否总能修复错误计划？', answer: '不能。列间相关性、复杂表达式或参数分布可能仍无法准确表达；需结合复合索引、改写查询或特定版本优化能力。' },
      { question: '统计更新为什么可能引起性能抖动？', answer: '成本估算变化会让优化器切换访问路径或连接顺序；关键查询应在更新前后做计划回归并准备回滚或稳定策略。' }
    ],
    pitfalls: [
      '统计失真时直接永久使用 FORCE INDEX，会把当前数据分布固化进 SQL，增长或参数变化后可能变成更差计划。',
      '只看 `rows` 的绝对值不与 EXPLAIN ANALYZE 的 actual 对比，无法判断问题来自估算还是执行本身。'
    ],
    sources: [
      { label: 'MySQL 8.4：InnoDB Optimizer Statistics', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html' },
      { label: 'MySQL 8.4：Optimizer Statistics with Histograms', url: 'https://dev.mysql.com/doc/refman/8.4/en/optimizer-statistics.html' }
    ]
  },
  {
    number: 19,
    title: '排序与分页如何建立稳定顺序？',
    mechanism: 'SQL 结果在没有 ORDER BY 时没有保证顺序；即使按 `score DESC` 排序，多个相同 score 的行之间仍没有确定次序，执行计划、并发写入或页分裂都可能改变返回顺序。稳定分页必须把 ORDER BY 扩展为全序，通常在业务排序列末尾追加唯一且不可变的主键，例如 `score DESC, id DESC`。Keyset 游标需要携带所有排序列，并用与方向一致的行比较继续；若排序值会在浏览期间更新，记录可能移动到已读或未读区域，强一致浏览需固定快照、版本或查询截止时间。索引键序应匹配过滤前缀与完整排序，确保 LIMIT 能早停。游标还应绑定筛选条件和排序版本，防止跨查询复用。',
    example: [
      '排行榜按分数降序，同分再按 id 降序，下一页从上一页末尾 `(980,5012)` 继续。',
      '',
      '~~~sql',
      'CREATE INDEX idx_scores_board_score_id ON scores(board_id, score DESC, id DESC);',
      'SELECT id, score FROM scores',
      'WHERE board_id=3 AND (score, id) < (980, 5012)',
      'ORDER BY score DESC, id DESC LIMIT 50;',
      '~~~',
      '',
      '测试数据要包含大量相同 score，并连续翻完后断言 id 无重复、无遗漏。若分数可实时变化，接口应说明弱一致语义或在游标中固定榜单版本。'
    ].join('\n'),
    followUps: [
      { question: '主键作为决定项为什么最好不可变？', answer: '游标依赖键的相对位置，若决定项更新，记录会跨越游标边界；不可变唯一键能稳定区分同值记录并减少移动。' },
      { question: 'NULL 排序列如何放入游标？', answer: '必须显式定义 NULL 的排序位置，并在游标编码与 WHERE 条件中复现同一语义；可用额外布尔表达式或规范化值组成完整键。' }
    ],
    pitfalls: [
      '只在 ORDER BY 追加 id，却在下一页 WHERE 只比较 score，仍会整批跳过同分记录，排序稳定但游标条件不完整。',
      '把可编辑的昵称作为唯一分页键，用户改名会使记录在翻页过程中移动，产生重复、遗漏和难以复现的顺序。'
    ],
    sources: [
      { label: 'MySQL 8.4：ORDER BY Optimization', url: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html' },
      { label: 'MySQL 8.4：LIMIT Query Optimization', url: 'https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html' }
    ]
  },
  {
    number: 20,
    title: 'JSON 字段何时不该使用？',
    mechanism: 'JSON 适合结构变化快、并非每条记录都有的附加属性，或需要原样保存外部载荷；它不适合核心关系、频繁 JOIN/过滤/排序、需要外键、唯一性、精确类型和列级权限的字段。把订单金额、用户 ID、状态都塞进 JSON，会让约束、索引、统计、迁移和查询可读性变差。MySQL 能验证 JSON 语法，并可通过生成列/函数索引优化固定路径，但每增加一个高频路径，本质上都在重新结构化；动态键更无法为所有路径建索引。设计时应把稳定且有业务约束的字段提升为普通列，JSON 只承载真正开放的扩展，并给文档版本、大小上限和迁移策略。更新大 JSON 也可能产生明显日志和复制成本。',
    example: [
      '把需要过滤的 `difficulty` 提升为生成列并加约束，展示 JSON 适用边界。',
      '',
      '~~~sql',
      'CREATE TABLE question_meta (',
      '  question_id BIGINT PRIMARY KEY, attrs JSON NOT NULL,',
      '  difficulty VARCHAR(16) GENERATED ALWAYS AS',
      "    (JSON_UNQUOTE(JSON_EXTRACT(attrs, '$.difficulty'))) STORED,",
      "  CHECK (difficulty IN ('basic','advanced') OR difficulty IS NULL),",
      '  INDEX idx_meta_difficulty(difficulty)',
      ');',
      "EXPLAIN SELECT question_id FROM question_meta WHERE difficulty='advanced';",
      '~~~',
      '',
      '如果随后十几个 JSON 路径都需要过滤、唯一约束和 JOIN，应迁移为结构化列或子表，而不是继续叠加生成列。'
    ].join('\n'),
    followUps: [
      { question: 'JSON 类型比 TEXT 保存 JSON 好在哪里？', answer: '数据库会验证文档语法，并提供原生提取、修改和索引表达式能力；但它仍不会自动理解你的业务 schema 和跨行约束。' },
      { question: 'EAV 与 JSON 哪个更适合动态属性？', answer: '两者都有查询和约束成本。需要按少量动态属性搜索时可评估 EAV/倒排；仅随实体读取的附加配置通常 JSON 更简单，需按访问模式选择。' }
    ],
    pitfalls: [
      '把 JSON 当成逃避 schema 设计的容器，最终所有接口都依赖隐式路径和类型，数据修复与迁移比普通列更困难。',
      '对 JSON_EXTRACT 的返回值忘记去引号或转换类型，会发生字符串/数值比较差异，索引表达式也可能与查询不匹配。'
    ],
    sources: [
      { label: 'MySQL 8.4：The JSON Data Type', url: 'https://dev.mysql.com/doc/refman/8.4/en/json.html' },
      { label: 'MySQL 8.4：Indexing a Generated Column for JSON', url: 'https://dev.mysql.com/doc/refman/8.4/en/create-table-secondary-indexes.html' }
    ]
  },
  {
    number: 21,
    title: 'ACID 分别表示什么？',
    mechanism: '原子性表示事务中的操作全成或全败，InnoDB 通过 undo 和事务状态支持回滚；一致性表示提交前后数据库满足主键、外键、CHECK 以及业务不变量，它不是引擎自动理解所有业务；隔离性定义并发事务彼此可见的程度，由 MVCC、锁和隔离级别实现；持久性表示成功 COMMIT 的结果在崩溃恢复后仍可重建，依赖 redo 日志、刷盘配置和存储可靠性。ACID 针对单个数据库事务，不自动覆盖 Redis、消息队列或远程 HTTP。复制副本收到数据、用户收到响应、业务恰好执行一次也都是额外语义。讨论 ACID 必须结合提交点、故障模型与配置，不能只背四个中文名词。',
    example: [
      '订单头与明细必须同时写入，并由外键和金额约束共同保护一致性。',
      '',
      '~~~sql',
      'START TRANSACTION;',
      "INSERT INTO orders(id,user_id,status,total) VALUES(9001,42,'pending',199.00);",
      'INSERT INTO order_items(order_id,product_id,quantity,unit_price)',
      'VALUES(9001,77,1,199.00);',
      'COMMIT;',
      '~~~',
      '',
      '第二条若违反外键或 CHECK，应用必须 ROLLBACK，订单头不能单独残留。测试还应在提交前断开连接与提交后杀进程，分别验证未提交回滚和已提交恢复。'
    ].join('\n'),
    followUps: [
      { question: '一致性是否完全由数据库保证？', answer: '不是。数据库可强制声明式约束，但“订单总额等于明细之和”等跨行业务规则仍需正确事务逻辑、锁定策略和对账修复。' },
      { question: 'COMMIT 成功是否表示所有副本都已持久化？', answer: '不一定。它取决于复制模式和确认策略；主库本地提交成功与同步副本确认是不同保证，故障切换时必须按复制语义评估数据丢失窗口。' }
    ],
    pitfalls: [
      '把 ACID 的一致性解释成“任何时候所有系统看到相同数据”，混淆了约束有效性、隔离可见性和分布式副本一致性。',
      '为了性能降低 redo 刷盘保证却仍向业务承诺零数据丢失，配置与持久性目标不一致，崩溃时会暴露承诺缺口。'
    ],
    sources: [
      { label: 'MySQL 8.4：InnoDB and the ACID Model', url: 'https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html' },
      { label: 'MySQL 8.4：InnoDB Transaction Model', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html' }
    ]
  },
  {
    number: 22,
    title: '脏读、不可重复读和幻读是什么？',
    mechanism: '脏读是事务读到另一事务尚未提交的数据，对方回滚后该值从未成立；不可重复读是同一事务两次读取同一行得到不同已提交版本；幻读是两次执行同一谓词查询时，满足条件的行集合因并发插入、删除而变化。隔离级别规定允许哪些现象：READ UNCOMMITTED 最弱，READ COMMITTED 每条语句建立新可见性边界，REPEATABLE READ 让一致性快照在事务内稳定，SERIALIZABLE 目标是效果等价于某个串行顺序。MySQL InnoDB 的具体锁和 MVCC 实现会比标准最低要求更强，但普通快照读、当前读不能混为一谈。还要单独防止丢失更新和写偏差，不能只检查三种读现象。',
    example: [
      '两个会话可复现 READ COMMITTED 下的不可重复读，执行顺序必须严格交错。',
      '',
      '~~~sql',
      '-- 会话 A',
      'SET TRANSACTION ISOLATION LEVEL READ COMMITTED; START TRANSACTION;',
      'SELECT balance FROM accounts WHERE id=1; -- 100',
      '-- 会话 B',
      'UPDATE accounts SET balance=80 WHERE id=1; COMMIT;',
      '-- 回到会话 A',
      'SELECT balance FROM accounts WHERE id=1; -- 80，不可重复读',
      'COMMIT;',
      '~~~',
      '',
      '改为 REPEATABLE READ 后，A 的普通 SELECT 通常仍看到 100；若改用 `FOR UPDATE`，它是当前读，行为和快照读不同。'
    ].join('\n'),
    followUps: [
      { question: '幻读与不可重复读的区别只在一行和多行吗？', answer: '核心是观察对象：不可重复读针对既有行值，幻读针对谓词结果集合成员变化；实现中更新也可能表现为集合进出，需要按查询语义判断。' },
      { question: '可重复读就能防止所有并发业务错误吗？', answer: '不能。两个事务可能各自读取不同记录后写入不同记录，形成写偏差；唯一约束、条件更新、显式锁或更强隔离仍可能需要。' }
    ],
    pitfalls: [
      '只背隔离级别表格，不在目标 MySQL 版本上区分快照读和锁定读，会对实际可见性和加锁范围作出错误判断。',
      '把任何“结果变了”都称为幻读，会掩盖真正的丢失更新或应用缓存问题，故障分析必须写清两事务时间线。'
    ],
    sources: [
      { label: 'MySQL 8.4：Transaction Isolation Levels', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html' },
      { label: 'PostgreSQL 官方文档：Transaction Isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' }
    ]
  },
  {
    number: 23,
    title: 'MVCC 如何减少读写阻塞？',
    mechanism: 'InnoDB 为记录维护事务相关隐藏信息，并通过 undo 日志链接旧版本。一致性读创建 Read View，根据创建者、活跃事务集合和事务 ID 边界判断哪个版本可见；若当前行版本不可见，就沿 undo 链重建更早版本。因此普通 SELECT 通常无需等待写事务释放行锁，写者也不必阻塞既有快照读。MVCC 不是“没有锁”：UPDATE、DELETE、唯一检查和 `SELECT ... FOR UPDATE` 仍需要锁，两个写者修改同一行仍会等待。长事务持续持有旧 Read View，会让 purge 无法清理其可能需要的 undo 版本，导致 history list、表空间与恢复成本增长。优化 MVCC 要缩短事务、及时提交并监控长事务，而不是禁用锁。',
    example: [
      '在两个会话中让写事务保持未提交，观察普通快照读与锁定读的差异。',
      '',
      '~~~sql',
      '-- 会话 A',
      'START TRANSACTION; UPDATE accounts SET balance=80 WHERE id=1;',
      '-- 会话 B',
      'START TRANSACTION; SELECT balance FROM accounts WHERE id=1; -- 读旧版本，不等待',
      'SELECT balance FROM accounts WHERE id=1 FOR UPDATE;           -- 等待 A 的行锁',
      '-- 会话 A',
      'COMMIT;',
      '~~~',
      '',
      '同时查看 `information_schema.innodb_trx` 与 `SHOW ENGINE INNODB STATUS`；若长期事务持续数小时，应先定位业务持有点，避免 undo 版本堆积。'
    ].join('\n'),
    followUps: [
      { question: 'MVCC 的旧版本存在哪里？', answer: 'InnoDB 当前记录包含指向 undo 记录的回滚指针，需要时沿版本链重建；它不是为每个版本复制一整张独立表。' },
      { question: '为什么长时间只读事务也可能造成空间压力？', answer: '只读事务若持有旧 Read View，purge 必须保留它仍可能看到的历史版本，更新频繁的表会累积更长 undo 链和历史列表。' }
    ],
    pitfalls: [
      '把 MVCC 说成“读永远不阻塞写、写永远不阻塞读”过于绝对，锁定读、DDL、元数据锁和资源压力都有例外。',
      '连接池开启事务后忘记提交，即使没有继续执行 SQL，也可能长期保留快照并阻碍 purge，应监控事务年龄而不只看活跃查询。'
    ],
    sources: [
      { label: 'MySQL 8.4：InnoDB Multi-Versioning', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html' },
      { label: 'MySQL 8.4：Consistent Nonlocking Reads', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html' }
    ]
  },
  {
    number: 24,
    title: 'MySQL 可重复读下快照读和当前读有何区别？',
    mechanism: '在 InnoDB REPEATABLE READ 下，普通 `SELECT` 通常是一致性快照读：第一次此类读取建立 Read View，之后读取该快照可见的版本，不给目标行加记录锁。`SELECT ... FOR UPDATE/FOR SHARE`、UPDATE 和 DELETE 属于锁定/当前读，需要基于最新可用版本判断并加锁；若目标行被别的事务修改，会等待其提交。二者混用时，一个事务可能先通过快照看到旧值，随后当前读看到更新后的值，这不是 MVCC 失效，而是两种语义不同。需要在事务开始就固定快照可用 `WITH CONSISTENT SNAPSHOT`，需要基于最新状态修改则应从一开始使用锁定读，并让查询条件有索引以限制 next-key 锁范围。',
    example: [
      '按顺序执行可看到同一事务中的快照值与当前值不同。',
      '',
      '~~~sql',
      '-- A: SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;',
      'START TRANSACTION; SELECT stock FROM products WHERE id=7; -- 10，建立快照',
      '-- B: UPDATE products SET stock=9 WHERE id=7; COMMIT;',
      '-- A:',
      'SELECT stock FROM products WHERE id=7;            -- 仍为 10',
      'SELECT stock FROM products WHERE id=7 FOR UPDATE; -- 当前读为 9，并加锁',
      'COMMIT;',
      '~~~',
      '',
      '业务若随后按 10 计算扣减就是错误混用；库存应使用条件 UPDATE 或先锁定读最新值，再在同一短事务完成写入。'
    ].join('\n'),
    followUps: [
      { question: 'START TRANSACTION 时就一定创建快照吗？', answer: '普通 REPEATABLE READ 通常在第一次一致性读时创建；若需要开始时固定，可使用 `START TRANSACTION WITH CONSISTENT SNAPSHOT` 并确认隔离级别。' },
      { question: '当前读为什么可能锁住不存在的行范围？', answer: '为防止满足谓词的新行插入，InnoDB 在适用场景使用 gap/next-key 锁；索引与条件决定锁定范围，缺索引可能显著扩大冲突。' }
    ],
    pitfalls: [
      '先普通 SELECT 做业务判断，再用 UPDATE 写最新行，却假设两者基于同一版本，会产生过期决策；应使用锁定读或原子条件更新。',
      '锁定读条件缺少合适索引，可能扫描并锁住大范围记录/间隙，导致看似无关的插入和更新也被阻塞。'
    ],
    sources: [
      { label: 'MySQL 8.4：Consistent Nonlocking Reads', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html' },
      { label: 'MySQL 8.4：Locking Reads', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html' }
    ]
  },
  {
    number: 25,
    title: '死锁是如何形成的？',
    mechanism: '死锁形成于等待图出现环：事务 A 已持有资源 X 并等待 Y，事务 B 持有 Y 又等待 X，双方都无法自行前进。常见原因是不同代码路径以相反顺序更新两行/两表，或范围扫描加锁比预期广。InnoDB 会检测环并选择一个事务回滚，返回 deadlock 错误；这不是数据库“卡死”，而是主动恢复进展。处理要从 `SHOW ENGINE INNODB STATUS` 或 Performance Schema 获取最后死锁的 SQL、持有锁和等待锁，统一资源顺序、缩短事务、为谓词补索引，并让应用对整个事务做有限次数退避重试。重试必须从事务开始重新读取，且外部副作用要幂等。锁等待超时不是死锁检测的替代，两者含义不同。',
    example: [
      '两个会话以相反顺序更新账户即可复现，然后读取死锁报告。',
      '',
      '~~~sql',
      '-- A: START TRANSACTION; UPDATE accounts SET balance=balance-10 WHERE id=1;',
      '-- B: START TRANSACTION; UPDATE accounts SET balance=balance-20 WHERE id=2;',
      '-- A: UPDATE accounts SET balance=balance+10 WHERE id=2; -- 等待',
      '-- B: UPDATE accounts SET balance=balance+20 WHERE id=1; -- 形成环，一方回滚',
      'SHOW ENGINE INNODB STATUS;',
      'SELECT * FROM performance_schema.data_lock_waits;',
      '~~~',
      '',
      '修复为所有转账都先锁较小 id、再锁较大 id；应用捕获 1213 后回滚整笔事务，随机退避并有限重试。'
    ].join('\n'),
    followUps: [
      { question: '统一锁顺序能消除所有死锁吗？', answer: '能消除对应资源环的主要来源，但范围锁、外键、唯一检查和不同执行计划仍可能产生其他环；应用仍应正确处理死锁重试。' },
      { question: '死锁与普通锁等待如何区分？', answer: '死锁存在闭环，引擎可立即选受害者；普通等待可能由长事务单向阻塞，直到持有者提交或达到 lock wait timeout。' }
    ],
    pitfalls: [
      '捕获死锁后只重新执行最后一条 UPDATE，会丢失事务前面的读写语义；必须回滚并从事务边界完整重试。',
      '把 `innodb_lock_wait_timeout` 调得很大来“解决死锁”无效，死锁检测会先回滚一方，真正修复是锁顺序和事务范围。'
    ],
    sources: [
      { label: 'MySQL 8.4：Deadlocks in InnoDB', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html' },
      { label: 'MySQL 8.4：How to Minimize and Handle Deadlocks', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html' }
    ]
  },
  {
    number: 26,
    title: '乐观锁和悲观锁如何选择？',
    mechanism: '乐观锁不预先阻塞其他事务，读取时带出 `version`，更新时用 `WHERE id=? AND version=?` 比较并递增版本；影响行数为 0 表示期间已被修改，应用要重新读取、合并或返回冲突。它适合冲突少、用户思考时间长、重试成本可控的场景。悲观锁用 `SELECT ... FOR UPDATE` 先锁住当前行，在短事务内串行完成检查与写入，适合高冲突且临界区很短的库存、队列领取等操作，但会增加等待、死锁和连接占用。两者都不能跨越远程调用长期持有“逻辑锁”；选择要测冲突率、等待时间和失败处理。能用单条条件 UPDATE 表达的不变量，通常比先读再选某种锁更简单可靠。',
    example: [
      '编辑题目使用版本号避免管理员互相覆盖，affected rows 必须进入业务分支。',
      '',
      '~~~sql',
      'SELECT id, body, version FROM questions WHERE id=88; -- version=5',
      'UPDATE questions',
      "SET body='new body', version=version+1, updated_at=NOW()",
      'WHERE id=88 AND version=5;',
      'SELECT ROW_COUNT(); -- 1=成功，0=已有并发修改',
      '~~~',
      '',
      '返回 0 时不要把页面显示成保存成功，应取回 version=6 的新内容，让用户合并或明确覆盖；盲目自动重试会再次用旧意图覆盖新值。'
    ].join('\n'),
    followUps: [
      { question: '时间戳能否替代 version？', answer: '可以作为比较字段，但时间精度、时区和同一时间多次更新可能带来歧义；单调整数版本更直接，且必须由数据库原子递增。' },
      { question: 'FOR UPDATE 为什么必须放在事务中？', answer: '锁需要持续到事务提交/回滚才保护后续操作；在 autocommit 下语句结束就释放，无法保护应用稍后执行的写入。' }
    ],
    pitfalls: [
      '执行乐观 UPDATE 后不检查 affected rows，会把冲突当成功，用户看到提示正常但实际修改完全未落库。',
      '悲观锁事务中等待用户输入或远程 HTTP，行锁会长时间占用，导致连接池堆积、超时和死锁概率上升。'
    ],
    sources: [
      { label: 'MySQL 8.4：Locking Reads', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html' },
      { label: 'MySQL 8.4：UPDATE Statement', url: 'https://dev.mysql.com/doc/refman/8.4/en/update.html' }
    ]
  },
  {
    number: 27,
    title: '库存扣减如何防止超卖？',
    mechanism: '核心是不把“先 SELECT 看库存，再 UPDATE”拆成无保护的两步，而把不变量写进数据库原子条件：`UPDATE ... SET available=available-n WHERE id=? AND available>=n`，再检查影响行数。并发更新同一行会由 InnoDB 行锁串行化，只有在扣减时仍满足条件的事务成功。若一单包含多个 SKU，应在短事务中按统一 SKU 顺序处理，任一失败全部回滚，减少死锁。数据库还可加 CHECK 防止负数。高峰用 Redis/Lua 预扣只能削峰，仍需唯一订单键、消息可靠投递、数据库最终落账和超时补偿；不能把缓存计数当永久事实源。接口重试必须用业务幂等键，防止同一订单重复扣减。',
    example: [
      '单 SKU 扣 2 件由一条语句决定成功与否，两个并发请求不会都基于旧值判断。',
      '',
      '~~~sql',
      'START TRANSACTION;',
      'INSERT INTO inventory_deductions(order_id, sku_id, quantity)',
      'VALUES(9001,77,2); -- order_id+sku_id 唯一，防重复',
      'UPDATE inventory SET available=available-2',
      'WHERE sku_id=77 AND available>=2;',
      'SELECT ROW_COUNT(); -- 必须为 1，否则 ROLLBACK 并返回售罄',
      'COMMIT;',
      '~~~',
      '',
      '测试初始库存 3，并发发起两笔各扣 2 的订单，最终只能一笔提交、库存为 1，另一笔明确失败且不能留下扣减记录。'
    ].join('\n'),
    followUps: [
      { question: '为什么先 SELECT 再 UPDATE 会超卖？', answer: '两个事务可同时读到相同旧库存并都判断充足，若后续写入未带条件或版本，业务判断失去原子性；条件 UPDATE 把判断放进锁保护的写入。' },
      { question: 'Redis 预扣成功就能立即宣布订单永久成功吗？', answer: '不能。Redis 故障、消息丢失或数据库约束都可能使最终落账失败；需要可靠事件、幂等消费、补偿和清晰的订单中间状态。' }
    ],
    pitfalls: [
      '只检查 SQL 是否抛异常，不检查 ROW_COUNT，库存不足导致零行更新时仍把订单标记为成功。',
      '多 SKU 按请求传入顺序逐个加锁，不同订单顺序相反时容易死锁；应排序后锁定并对整个事务重试。'
    ],
    sources: [
      { label: 'MySQL 8.4：InnoDB Locking', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html' },
      { label: 'MySQL 8.4：UPDATE Statement', url: 'https://dev.mysql.com/doc/refman/8.4/en/update.html' }
    ]
  },
  {
    number: 28,
    title: '事务为什么不应包含远程 HTTP 调用？',
    mechanism: '数据库事务持有连接、行锁、版本和 undo，远程 HTTP 的尾延迟、重试和不可控失败会把这些资源占用从毫秒拉到秒甚至更久，放大锁等待与连接池耗尽。更重要的是本地 COMMIT 与远端副作用没有共同原子提交点：HTTP 成功后数据库回滚会留下孤儿副作用，数据库提交后 HTTP 失败又会丢动作；简单重试还可能重复扣款。正确做法是让本地事务只写业务状态与 outbox 事件，快速提交；独立发布器异步调用远端，使用幂等键、重试、死信和补偿/Saga 管理最终状态。若用户必须同步得到结果，也应先明确状态机和超时后的查询语义，而不是假装一个本地事务覆盖网络。',
    example: [
      '下单事务只落订单和待支付事件，提交后 worker 再调用支付接口。',
      '',
      '~~~sql',
      'START TRANSACTION;',
      "INSERT INTO orders(id,status,total) VALUES(9001,'payment_pending',199.00);",
      "INSERT INTO outbox(id,topic,event_key,payload,status)",
      "VALUES(UUID(),'payment.requested','order:9001',JSON_OBJECT('orderId',9001),'pending');",
      'COMMIT;',
      '~~~',
      '',
      'worker 以 `order:9001` 作为支付幂等键；HTTP 超时后先查询支付状态再重试。成功事件再驱动订单变为 paid，永久失败则进入 failed/compensating。'
    ].join('\n'),
    followUps: [
      { question: '把 HTTP 超时设得很短就可以放进事务吗？', answer: '仍不建议。短超时不能消除网络不确定性和两个系统之间的原子性缺口，且超时只表示未知，不代表远端没有执行。' },
      { question: 'Saga 是否等同于数据库回滚？', answer: '不是。Saga 用一系列本地事务和补偿动作协调，补偿可能失败且通常不能完全抹去已发生的外部事实，需要显式状态与人工兜底。' }
    ],
    pitfalls: [
      'HTTP 客户端超时后直接认为远端失败并再次扣款，远端可能已经成功处理第一次请求；必须使用幂等键或状态查询。',
      '先提交数据库再“尽力”发送消息，中间进程崩溃会永久丢事件；业务写与 outbox 必须位于同一事务。'
    ],
    sources: [
      { label: 'AWS Prescriptive Guidance：Transactional Outbox Pattern', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html' },
      { label: 'Microsoft Azure Architecture Center：Saga Pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/saga' }
    ]
  },
  {
    number: 29,
    title: '什么是 outbox pattern？',
    mechanism: 'Transactional Outbox 在同一个数据库事务中同时写业务行和一条待发布事件，从而消除“业务已提交但消息未写入”的窗口。提交后，独立 relay 轮询 outbox 或通过 CDC 读取日志，把事件发送到 broker/HTTP，再标记已发布。relay 可能在发送成功、标记前崩溃，因此交付通常是至少一次，消费者必须按稳定 event_id 或业务键幂等去重；不能承诺天然 exactly-once。多 worker 可用 `FOR UPDATE SKIP LOCKED` 领取批次，但要设置租约/重试，避免 processing 状态永久卡死。表需要按时间归档、监控积压年龄、失败次数与死信，事件 schema 要版本化。顺序要求应按 aggregate key 分区或序列号校验。',
    example: [
      '业务事务写事件，relay 用短事务领取，网络发送必须在领取事务外执行。',
      '',
      '~~~sql',
      'START TRANSACTION;',
      "UPDATE orders SET status='paid' WHERE id=9001 AND status='payment_pending';",
      "INSERT INTO outbox(event_id,aggregate_id,event_type,payload,status)",
      "VALUES(UUID(),'9001','order.paid',JSON_OBJECT('orderId',9001),'pending');",
      'COMMIT;',
      'START TRANSACTION;',
      "SELECT * FROM outbox WHERE status='pending' ORDER BY created_at LIMIT 100",
      'FOR UPDATE SKIP LOCKED;',
      '~~~',
      '',
      'relay 发布后按 event_id 标记完成；消费者表对 event_id 建唯一约束，收到重复事件时返回已处理，而不是重复发货。'
    ].join('\n'),
    followUps: [
      { question: '为什么 outbox 仍可能重复发送？', answer: '发送到 broker 成功后、数据库标记 published 前进程可能崩溃，重启会再次发送同一行；稳定 event_id 与幂等消费者是设计的一部分。' },
      { question: '轮询 outbox 与 CDC 如何选择？', answer: '轮询实现简单但要权衡延迟和数据库负载；CDC 可低延迟读取提交日志，但增加连接器运维、schema 演进和偏移恢复复杂度。' }
    ],
    pitfalls: [
      '发布器把状态先改成 published 再发送，进程在两步之间崩溃会永久丢消息；状态只能在确认发送后更新。',
      'outbox 永不归档且没有积压告警，表和索引持续膨胀，故障时 pending 事件可能已延迟数小时却无人发现。'
    ],
    sources: [
      { label: 'AWS Prescriptive Guidance：Transactional Outbox Pattern', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html' },
      { label: 'Debezium 官方文档：Outbox Event Router', url: 'https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html' }
    ]
  },
  {
    number: 30,
    title: '隔离级别越高越好吗？',
    mechanism: '更高隔离减少可观察并发现象，但会付出更多锁等待、冲突回滚、序列化失败或更低并发；并非所有业务都需要串行化整个读写集合。选择应从业务不变量出发：普通内容浏览可接受 READ COMMITTED 快照变化，库存扣减可用单条条件 UPDATE，抢占任务可用 `FOR UPDATE SKIP LOCKED`，跨多行复杂约束才可能需要 SERIALIZABLE 或显式锁。即使最高隔离也不能替代唯一、外键、CHECK、幂等与正确错误处理。应用必须准备处理死锁/序列化失败，事务要短，且在真实并发下验证。MySQL 各级实现和默认值与其他数据库不同，迁移时不能按名称假设完全相同行为。',
    example: [
      '预约座位不必把所有请求升到 SERIALIZABLE，可让唯一约束作为最终并发裁决。',
      '',
      '~~~sql',
      'CREATE TABLE reservations (',
      '  id BIGINT PRIMARY KEY, show_id BIGINT NOT NULL, seat_no VARCHAR(10) NOT NULL,',
      '  user_id BIGINT NOT NULL, UNIQUE KEY uk_show_seat(show_id, seat_no)',
      ');',
      'START TRANSACTION;',
      "INSERT INTO reservations VALUES(1001,7,'A-12',42);",
      'COMMIT;',
      '~~~',
      '',
      '两事务并发插入同一 show/seat，只有一个能提交；应用把 duplicate key 映射为“座位已被占用”，无需用全局串行事务锁住整个场次。'
    ].join('\n'),
    followUps: [
      { question: 'SERIALIZABLE 是否意味着应用不再需要重试？', answer: '恰恰相反，为维持串行语义，数据库可能让事务等待或以序列化失败回滚；应用必须完整、有限、幂等地重试。' },
      { question: '如何按不变量选择隔离策略？', answer: '先写出不能被破坏的事实，再判断能否由唯一/CHECK/条件更新原子保证；只有跨多行读写依赖无法约束时，再考虑锁或更高隔离。' }
    ],
    pitfalls: [
      '把全站默认升到 SERIALIZABLE 作为“安全开关”，可能在高并发下制造大量等待和回滚，却仍未定义业务重试。',
      '为追求吞吐盲目降到 READ UNCOMMITTED，会让业务基于最终回滚的数据作决定；应针对明确现象与不变量调整。'
    ],
    sources: [
      { label: 'MySQL 8.4：Transaction Isolation Levels', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html' },
      { label: 'PostgreSQL 官方文档：Serializable Isolation Level', url: 'https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE' }
    ]
  },
  {
    number: 31,
    title: 'Redis 为什么快？',
    mechanism: 'Redis 的常用数据主要驻留内存，避免每次命令等待随机磁盘 I/O；命令路径短，数据结构针对计数、哈希、集合和排序做专门实现。事件循环用非阻塞 I/O 处理大量连接，核心命令执行通常串行化，省去共享数据上的复杂锁竞争；新版本可用 I/O 线程辅助网络读写，但不意味着耗时命令可并行无害。协议简单，pipeline 能把多条命令合并往返，降低 RTT。快是有条件的：`KEYS *`、大集合全量操作、复杂 Lua、大 key 删除、持久化 fork/COW、内存换页和网络带宽都可能制造长尾。评估应看 P99、slowlog、event loop latency、命中率与每条命令复杂度，而非只引用每秒请求数。',
    example: [
      '用同一连接比较逐条往返与 pipeline，并同时观察慢命令和延迟诊断。',
      '',
      '~~~bash',
      'redis-benchmark -h 127.0.0.1 -p 6379 -t set,get -n 100000 -P 1',
      'redis-benchmark -h 127.0.0.1 -p 6379 -t set,get -n 100000 -P 32',
      'redis-cli SLOWLOG GET 10',
      'redis-cli LATENCY DOCTOR',
      'redis-cli INFO commandstats',
      '~~~',
      '',
      'pipeline 吞吐上升主要来自减少网络往返，不代表单条命令计算变快。若 P99 仍尖峰，应按时间对齐 fork、swap、大 key 和 slowlog，而不是继续增加并发。'
    ].join('\n'),
    followUps: [
      { question: 'Redis 单线程为什么还能服务很多连接？', answer: '事件循环只在连接就绪时处理读写，避免每连接一线程的切换开销；内存命令通常很短，串行执行仍可获得高吞吐。' },
      { question: 'pipeline 与事务有什么区别？', answer: 'pipeline 是客户端批量发送以减少 RTT，不保证其他客户端命令不穿插；MULTI/EXEC 才保证队列命令连续执行，但也不提供关系数据库式回滚。' }
    ],
    pitfalls: [
      '把“核心命令串行”误解为所有操作 O(1)，对百万成员集合执行全量命令仍会阻塞其他客户端。',
      '压测只报告平均吞吐，隐藏持久化或大 key 导致的 P99/P999 停顿，上线后实时请求仍会明显抖动。'
    ],
    sources: [
      { label: 'Redis 官方文档：Latency Optimization', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/' },
      { label: 'Redis 官方文档：Pipelining', url: 'https://redis.io/docs/latest/develop/use/pipelining/' }
    ]
  },
  {
    number: 32,
    title: 'String、Hash、List、Set、ZSet 如何选？',
    mechanism: '应按访问操作而不是按对象名称选择。String 可保存标量、序列化值、计数和位图，支持原子 INCR，但把巨大对象整体序列化会让局部更新和网络传输昂贵；Hash 适合按字段读取/修改对象；List 保持插入顺序并支持两端操作，适合简单队列但可靠消费更宜用 Streams；Set 提供去重、成员判断和集合运算；Sorted Set 以 score 排序，适合排行榜、延迟队列候选和范围查询。Redis 会根据元素数量/大小使用紧凑或通用内部编码，跨阈值后内存特征会变化。键设计还要考虑 TTL、集群 hash slot、单 key 大小与热点，不能把整个租户所有数据塞进一个集合。',
    example: [
      '同一面试系统中，不同访问语义对应不同命令，而不是全部存 JSON 字符串。',
      '',
      '~~~bash',
      'redis-cli HSET user:42 name Linda role learner',
      'redis-cli SADD question:88:tags mysql redis transaction',
      'redis-cli ZADD leaderboard:weekly 980 user:42 870 user:77',
      'redis-cli ZREVRANGE leaderboard:weekly 0 9 WITHSCORES',
      'redis-cli INCR question:88:view-count',
      'redis-cli MEMORY USAGE leaderboard:weekly',
      '~~~',
      '',
      '需要可靠消费、确认和重放时，把 List 队列改为 Stream consumer group；需要按对象字段更新时，Hash 可避免每次传输整段大 JSON。'
    ].join('\n'),
    followUps: [
      { question: '为什么延迟任务常用 ZSet？', answer: '把执行时间戳作为 score，可按分数范围取到期成员；但领取、去重和故障恢复仍需 Lua/事务或更专业队列协议。' },
      { question: 'Hash 是否一定比 JSON String 省内存？', answer: '不一定，取决于字段数量、值大小和内部编码阈值；应在代表性数据上用 MEMORY USAGE 测量，同时考虑局部读写需求。' }
    ],
    pitfalls: [
      '把几百万成员放进一个 Set/ZSet，单次删除、迁移、持久化和集群重分片都会成为大 key 风险。',
      '用 List 的 LPOP 完成重要任务消费却没有确认/重试，消费者取出后崩溃会永久丢任务，应采用可靠队列模式或 Streams。'
    ],
    sources: [
      { label: 'Redis 官方文档：Data Types', url: 'https://redis.io/docs/latest/develop/data-types/' },
      { label: 'Redis 官方文档：Data Type Command Examples', url: 'https://redis.io/docs/latest/commands/' }
    ]
  },
  {
    number: 33,
    title: 'Redis 过期键如何删除？',
    mechanism: 'Redis 不保证 TTL 到零瞬间就物理删除。访问一个已过期键时会惰性删除；后台还会周期性抽样带过期时间的键并持续清理，使未访问过期键最终释放。键在逻辑上过期后 GET 应视为不存在，但内存释放时间受清理周期和负载影响。`maxmemory` 达上限时触发的是另一套 eviction：按 noeviction、LRU、LFU、随机或 TTL 等策略从候选键驱逐，即使它尚未过期。大量键同一秒失效会形成缓存雪崩和回源尖峰，应给 TTL 加随机抖动、分批预热并保护数据库；不存在对象可短时负缓存或 Bloom Filter 防穿透。监控 expired_keys、evicted_keys、内存和命中率，区分自然过期与容量驱逐。',
    example: [
      '为热点详情设置分散 TTL，并检查实例的过期与驱逐计数。',
      '',
      '~~~bash',
      'redis-cli SET question:88 "{...}" EX 3673   # 基础 3600 秒 + 随机 0~300 秒',
      'redis-cli TTL question:88',
      'redis-cli INFO stats | grep -E "expired_keys|evicted_keys|keyspace_hits|keyspace_misses"',
      'redis-cli CONFIG GET maxmemory-policy',
      'redis-cli MEMORY STATS',
      '~~~',
      '',
      '若 evicted_keys 持续增加而 TTL 尚长，是容量/策略驱逐，不是过期清理慢；若整点 misses 与数据库 QPS 同时尖峰，应分散 TTL 并限流回源。'
    ].join('\n'),
    followUps: [
      { question: 'TTL 返回 0 后为什么内存可能未立刻下降？', answer: '逻辑读取已按过期处理，但物理对象释放与内存分配器归还存在时序；应看 active expire、内存碎片和整体趋势而非单键瞬时值。' },
      { question: 'noeviction 策略下内存满了会怎样？', answer: '会让需要分配新内存的写命令返回错误，读通常仍可执行；应用必须处理写失败并告警，不能假设 Redis 会自动删旧键。' }
    ],
    pitfalls: [
      '把所有缓存统一设置整点过期，平时命中率很高却在过期瞬间把数据库压垮，这是典型缓存雪崩。',
      '看到内存满就随意改成 allkeys-random，可能驱逐关键会话和锁；策略必须与键的业务等级和可重建性匹配。'
    ],
    sources: [
      { label: 'Redis 官方文档：EXPIRE', url: 'https://redis.io/docs/latest/commands/expire/' },
      { label: 'Redis 官方文档：Key Eviction', url: 'https://redis.io/docs/latest/develop/reference/eviction/' }
    ]
  },
  {
    number: 34,
    title: 'RDB 和 AOF 的权衡是什么？',
    mechanism: 'RDB 在某个时间点生成紧凑快照，文件便于备份、传输和快速全量恢复；通常通过 fork 子进程写出，故障时会丢失最近一次快照后的写入，高写负载下 copy-on-write 还会产生内存峰值。AOF 追加记录写命令，可按 always、everysec、no 控制 fsync，everysec 常见的数据丢失窗口约为最近一秒；文件会通过 rewrite 压缩，恢复需重放命令，体积与时间通常大于 RDB。两者可组合使用以兼顾恢复速度和 RPO，但持久化不是备份：误删也会被记录，主从复制还会传播错误。必须做离机备份、校验和定期恢复演练，并根据可接受 RPO/RTO 配置磁盘与告警。',
    example: [
      '先明确“一秒 RPO、分钟级 RTO”，再验证配置、生成文件和离线检查。',
      '',
      '~~~bash',
      'redis-cli CONFIG GET appendonly appendfsync save dir dbfilename appendfilename',
      'redis-cli BGSAVE',
      'redis-cli BGREWRITEAOF',
      'redis-cli INFO persistence',
      'redis-check-rdb /var/lib/redis/dump.rdb',
      'redis-check-aof /var/lib/redis/appendonlydir/appendonly.aof.*',
      '~~~',
      '',
      '在隔离恢复机加载备份，核对关键键数量和业务抽样，再测量启动耗时；只看到 `rdb_last_bgsave_status:ok` 不能证明文件可满足恢复目标。'
    ].join('\n'),
    followUps: [
      { question: '开启 AOF always 就一定零数据丢失吗？', answer: '它显著缩小 Redis 进程崩溃窗口，但仍依赖操作系统、磁盘控制器和文件系统真实持久语义；还会带来更高写延迟。' },
      { question: '为什么复制不能替代备份？', answer: '误删、逻辑错误和恶意写会快速复制到副本；备份需要独立保留点、访问隔离和可验证的时间点恢复能力。' }
    ],
    pitfalls: [
      '在内存接近上限时触发 RDB/AOF rewrite，fork 后 COW 可能进一步抬高内存并被 OOM，必须预留峰值空间。',
      '配置了持久化却从未做恢复演练，文件路径、权限、版本或损坏问题直到事故才暴露，等同没有可靠备份。'
    ],
    sources: [
      { label: 'Redis 官方文档：Persistence', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/' },
      { label: 'Redis 官方文档：Redis Administration', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/admin/' }
    ]
  },
  {
    number: 35,
    title: 'Redis 事务能回滚吗？',
    mechanism: 'Redis 的 MULTI/EXEC 把后续命令排队，EXEC 时按顺序连续执行，期间不会插入其他客户端命令；它不提供关系数据库式运行时回滚。若命令在入队时就有语法/参数数量错误，事务会被标记并使 EXEC 失败；若命令类型错误只在执行时发现，前面已经成功的命令不会撤销，后续命令仍可能继续执行。WATCH 提供乐观并发：被监视键在 EXEC 前变化时，EXEC 返回空结果，客户端重新读取并重试。客户端在 EXEC 后网络断开时可能无法知道事务是否执行，重要业务仍需幂等键或结果查询。涉及“读后判断再写”的复杂原子逻辑，短 Lua 通常比多轮 WATCH 重试更直接。',
    example: [
      '下面故意制造运行时类型错误，证明第一条写入不会被自动回滚。',
      '',
      '~~~bash',
      'redis-cli DEL counter mylist',
      'redis-cli <<EOF',
      'MULTI',
      'SET counter 1',
      'LPUSH counter x',
      'SET after ok',
      'EXEC',
      'EOF',
      'redis-cli MGET counter after',
      '~~~',
      '',
      'LPUSH 对 String 返回 WRONGTYPE，但 counter 仍为 1，after 仍为 ok。业务不能依赖异常让前序命令撤销，应预先校验类型或改用原子 Lua。'
    ].join('\n'),
    followUps: [
      { question: 'WATCH 冲突后 Redis 会自动重试吗？', answer: '不会。EXEC 返回空结果，客户端必须重新读取最新值、重新计算并有限退避重试；旧计算结果不能直接再次提交。' },
      { question: 'DISCARD 的作用是什么？', answer: '它清空 MULTI 后尚未 EXEC 的队列并退出事务状态；它不能撤销已经通过 EXEC 执行的任何命令。' }
    ],
    pitfalls: [
      '把 MULTI/EXEC 当数据库事务，在第三条命令报错后假设前两条已回滚，会留下应用没有处理的部分状态。',
      'WATCH 重试没有上限和退避，在热 key 高冲突下会形成自激请求风暴，CPU 与网络消耗反而进一步升高。'
    ],
    sources: [
      { label: 'Redis 官方文档：Transactions', url: 'https://redis.io/docs/latest/develop/using-commands/transactions/' },
      { label: 'Redis 官方文档：WATCH', url: 'https://redis.io/docs/latest/commands/watch/' }
    ]
  },
  {
    number: 36,
    title: 'Lua 脚本为什么能实现原子操作？',
    mechanism: 'Redis 在执行一段 Lua 脚本期间不会穿插处理其他客户端命令，因此脚本内“读取—判断—写入”对其他客户端表现为一个原子步骤，避免客户端多轮请求之间的竞态。原子不等于可回滚：脚本运行时报错时，先前已经执行的写命令仍可能保留；脚本也不提供跨 Redis 与数据库的原子性。由于脚本阻塞服务事件循环，它必须有界、短小，不能遍历不受控大集合或执行重计算。脚本应显式通过 KEYS 声明访问键、ARGV 传参数；Redis Cluster 中涉及的键要位于同一 hash slot。生产应缓存脚本 SHA 或使用 Functions，处理重启后的 NOSCRIPT，并监控脚本耗时。',
    example: [
      '库存预扣把检查与递减合并为一段短脚本，返回明确业务码。',
      '',
      '~~~bash',
      'redis-cli SET stock:{sku77} 3',
      'redis-cli --eval deduct.lua stock:{sku77} , 2',
      '~~~',
      '',
      '~~~lua',
      'local current = tonumber(redis.call("GET", KEYS[1]) or "0")',
      'local wanted = tonumber(ARGV[1])',
      'if current < wanted then return {0, current} end',
      'local left = redis.call("DECRBY", KEYS[1], wanted)',
      'return {1, left}',
      '~~~',
      '',
      '两个并发请求各扣 2、初始为 3 时，只能一个返回 `{1,1}`，另一个返回 `{0,1}`；数据库最终落账仍需幂等消息与补偿。'
    ].join('\n'),
    followUps: [
      { question: 'Lua 脚本执行一半报错会自动回滚吗？', answer: '不会保证回滚已执行写命令。脚本应先完成可预见校验，再执行写入，并由调用方正确处理错误。' },
      { question: '为什么 Cluster 脚本的多个 key 要同一 slot？', answer: '集群无法在单节点原子执行跨分片脚本；使用相同 hash tag 可把相关键映射到同一 slot，否则会得到 CROSSSLOT 错误。' }
    ],
    pitfalls: [
      '在 Lua 中对百万成员执行全量遍历，脚本原子性会让所有其他客户端长时间等待，形成实例级故障。',
      '把订单写 Redis Lua 与写 MySQL 视作一个原子事务，任一系统失败仍会造成分叉，必须设计事件、幂等和补偿。'
    ],
    sources: [
      { label: 'Redis 官方文档：Scripting with Lua', url: 'https://redis.io/docs/latest/develop/programmability/eval-intro/' },
      { label: 'Redis 官方文档：EVAL', url: 'https://redis.io/docs/latest/commands/eval/' }
    ]
  },
  {
    number: 37,
    title: '缓存旁路模式如何更新数据？',
    mechanism: 'Cache-Aside 读流程是先 GET，miss 后查数据库并写入带 TTL 的缓存；写流程通常先提交数据库，再删除缓存，让下次读取回源重建。选择删除而非直接更新，是为了避免多写路径计算不同缓存值，但“更新库后删除”仍有并发窗口：旧读可能在删除后把旧值写回。可通过短 TTL、单飞回源、版本号只允许新版本覆盖、提交 outbox 后可靠失效，或对强一致场景绕过缓存来降低风险。缓存穿透要对确定不存在对象短时负缓存、校验输入或用 Bloom Filter；雪崩用 TTL 抖动和分批预热。数据库是真实源，缓存写失败不应回滚已提交业务，但必须告警并可重试失效。',
    example: [
      '用版本化缓存值避免慢旧查询覆盖新值，删除动作只在数据库提交后发生。',
      '',
      '~~~text',
      '读：GET question:88 -> miss；SELECT body,version FROM questions WHERE id=88',
      '    -> SET question:88 {version:7,...} EX 3673（仅当缓存版本 < 7）',
      '写：BEGIN; UPDATE questions SET body=?,version=version+1 WHERE id=88; COMMIT;',
      '    -> DEL question:88；失败则由 outbox/cache.invalidate 重试',
      '不存在：SET question:404 "__NOT_FOUND__" EX 30',
      '~~~',
      '',
      '并发测试应暂停一次旧 SELECT，让写事务提交并删除缓存，再恢复旧读；若版本保护正确，version 6 不能覆盖已经写入的 version 7。'
    ].join('\n'),
    followUps: [
      { question: '为什么不建议先删除缓存再更新数据库？', answer: '删除后并发读会从数据库读到旧值并重新写入缓存，随后数据库才提交新值，旧缓存可能一直保留到 TTL。' },
      { question: '负缓存会不会让刚创建的数据暂时不可见？', answer: '会，因此不存在值的 TTL 应短，创建成功后主动删除对应负缓存；对强即时可见路径可绕过或使用版本事件失效。' }
    ],
    pitfalls: [
      '数据库事务尚未提交就删除缓存，其他请求会回源读旧快照并重新缓存，扩大不一致窗口。',
      '所有 miss 都无保护地回源，恶意随机 ID 会造成缓存穿透，热点过期又会造成击穿，两种故障需分别治理。'
    ],
    sources: [
      { label: 'Microsoft Azure Architecture Center：Cache-Aside Pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside' },
      { label: 'AWS ElastiCache：Caching Strategies', url: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html' }
    ]
  },
  {
    number: 38,
    title: '缓存击穿时互斥锁有哪些风险？',
    mechanism: '缓存击穿是单个热点 key 到期或被驱逐后，大量并发同时回源。互斥重建可用 `SET lock token NX PX ttl` 只让一个请求查库，其余短暂等待、返回旧值或快速失败，但锁引入新的边界：TTL 太短时持有者未完成就出现第二个重建者，太长或无 TTL 时崩溃会长期阻塞；客户端暂停、网络分区会让旧持有者在过期后继续写；释放时若不比较 token，可能误删新持有者的锁。单纯让所有请求轮询同一锁会形成等待风暴。更稳健方案包括进程内 singleflight、逻辑过期配合 stale-while-revalidate、提前刷新、回源限流与降级，并给新缓存值加随机 TTL。锁只保护重建，不应成为数据正确性的唯一防线。',
    example: [
      '获取锁使用唯一 token，释放通过 Lua 比较所有权；未获得者优先返回尚可接受的旧值。',
      '',
      '~~~bash',
      'token=$(openssl rand -hex 16)',
      'redis-cli SET lock:question:88 "$token" NX PX 3000',
      '# 获得 OK 的请求查库并 SET question:88 ... EX 3600',
      'redis-cli --eval unlock.lua lock:question:88 , "$token"',
      '~~~',
      '',
      '~~~lua',
      'if redis.call("GET", KEYS[1]) == ARGV[1] then',
      '  return redis.call("DEL", KEYS[1])',
      'end',
      'return 0',
      '~~~',
      '',
      '压测让首个回源睡眠超过 3 秒，确认系统不会让旧持有者覆盖较新的版本，并观察数据库 QPS 是否始终受限。'
    ].join('\n'),
    followUps: [
      { question: '未获得重建锁的请求应该一直等待吗？', answer: '不应无界等待。可返回可接受旧值、短退避后重试、降级或限流；策略取决于新鲜度要求和数据库剩余容量。' },
      { question: '锁 TTL 应如何确定？', answer: '基于回源 P99 加安全余量并设上限，长任务需受控续租；即便续租也要用版本/fencing 防止过期持有者写回。' }
    ],
    pitfalls: [
      '释放锁直接 DEL，不核对随机 token；旧请求超时后可能删除后来请求新获得的同名锁，造成多个重建者。',
      '所有等待者以固定 10ms 轮询 Redis，热点失效时会把数据库风暴换成 Redis 轮询风暴，应退避、合并或返回旧值。'
    ],
    sources: [
      { label: 'Redis 官方文档：Distributed Locks with Redis', url: 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/' },
      { label: 'Microsoft Azure Architecture Center：Cache-Aside Pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside' }
    ]
  },
  {
    number: 39,
    title: '什么是大 key 和热 key？',
    mechanism: '大 key 指单个键占用大量内存或包含大量元素，它会造成网络传输、序列化、持久化 COW、集群迁移和删除阻塞；热 key 指访问量集中在一个键/分片，可能容量不大却打满单节点 CPU 或带宽。二者要分别用 `MEMORY USAGE`、`--bigkeys/--memkeys`、SCAN 抽样、commandstats、slowlog、LFU 频次或代理指标发现，禁止生产执行 `KEYS *` 全量阻塞扫描。大 key 可按业务维度拆分、分页读取、用 HSCAN/SSCAN 渐进处理，并用 UNLINK 异步释放；热读 key 可做进程本地短缓存、请求合并或副本读，热写计数需分桶后汇总。拆分要保留原子性和集群 slot 设计，并监控迁移前后 P99。',
    example: [
      '先用低风险工具定位，再针对具体类型采取渐进操作。',
      '',
      '~~~bash',
      'redis-cli --bigkeys -i 0.1',
      'redis-cli --memkeys -i 0.1',
      'redis-cli MEMORY USAGE tenant:7:questions SAMPLES 20',
      'redis-cli SLOWLOG GET 20',
      'redis-cli INFO commandstats',
      'redis-cli UNLINK obsolete:huge-key',
      '~~~',
      '',
      '若一个 Hash 有 200 万字段，先用 HSCAN 分批迁移到按月份/业务分片的键，双读校验后再 UNLINK；不要在线直接 HGETALL 或 DEL。'
    ].join('\n'),
    followUps: [
      { question: 'UNLINK 为什么比 DEL 更适合大 key？', answer: 'UNLINK 先从键空间解除关联，再由后台线程回收大对象内存，减少主事件循环长时间释放造成的阻塞；仍要监控后台回收压力。' },
      { question: '给热 key 加副本就能解决热写吗？', answer: '副本可分担允许陈旧的读取，但写仍到主节点；热写需分桶、局部聚合或重新设计数据模型，并处理汇总一致性。' }
    ],
    pitfalls: [
      '生产使用 `KEYS *` 或对大 Hash 执行 HGETALL 来盘点，本身就可能阻塞实例，诊断动作变成事故。',
      '只按字节定义大 key，忽略百万个小元素的 O(N) 命令和释放成本；元素数量与访问操作同样重要。'
    ],
    sources: [
      { label: 'Redis 官方文档：redis-cli Big Keys and Memory Usage', url: 'https://redis.io/docs/latest/develop/tools/cli/#scan-for-big-keys-and-memory-usage' },
      { label: 'Redis 官方文档：Memory Optimization', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/' }
    ]
  },
  {
    number: 40,
    title: 'Redis 分布式锁至少要满足什么？',
    mechanism: '最低要求是用单条 `SET resource random-token NX PX ttl` 原子获取，token 对每次持有唯一，释放用 Lua 比较 token 后 DEL，确保只能删除自己的锁；必须有有限租期，避免持有者崩溃后永久占用。调用方还要处理获取失败、超时、续租、网络不确定和重试。仅有这些仍不能保证业务资源绝对安全：进程停顿超过 TTL 后锁已转移，旧持有者恢复后可能继续写；主节点刚返回成功却在复制前故障切换，也可能让另一客户端再次获得锁。对数据库/存储写入应使用单调 fencing token，让资源层拒绝比已见 token 更旧的写；能用数据库唯一约束、条件更新或队列串行化时，通常比跨系统锁更可靠。',
    example: [
      '获取和释放使用同一随机 token，并把单调 fencing 版本传给最终资源。',
      '',
      '~~~bash',
      'token=$(openssl rand -hex 16)',
      'redis-cli SET lock:report:7 "$token" NX PX 10000',
      '# 获取成功后从强一致序列取得 fence=481，并在写数据库时提交该值',
      'redis-cli --eval unlock.lua lock:report:7 , "$token"',
      '~~~',
      '',
      '资源表执行 `UPDATE reports SET body=?, last_fence=481 WHERE id=7 AND last_fence<481`；即使 fence=480 的旧持有者暂停后恢复，它的写也影响 0 行。'
    ].join('\n'),
    followUps: [
      { question: '为什么锁值不能只存固定字符串 1？', answer: '持有者超时后新客户端可能已重获锁，旧客户端若直接 DEL 会删除新锁；唯一 token 允许释放脚本验证所有权。' },
      { question: '自动续租能否替代 fencing token？', answer: '不能完全替代。进程长暂停或网络分区期间可能无法续租，恢复后仍误以为持有锁；资源层 fencing 才能拒绝过期持有者写入。' }
    ],
    pitfalls: [
      '使用 `SETNX` 后再单独 EXPIRE，进程可能在两条命令之间崩溃留下永不过期锁；必须用带 NX/PX 的单条 SET。',
      '把 Redis 锁成功当作业务幂等，客户端超时重试仍可能重复执行外部副作用；锁、幂等键和资源约束解决的是不同问题。'
    ],
    sources: [
      { label: 'Redis 官方文档：Distributed Locks with Redis', url: 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/' },
      { label: 'Redis 官方文档：SET Command', url: 'https://redis.io/docs/latest/commands/set/' }
    ]
  }
]

export default strengthenPlatformExamples(entries, { bankId: 'database-cache' })
