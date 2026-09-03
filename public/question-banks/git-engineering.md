# Git 与协作工程

# Git 对象与工作区

## Q1：Git 的工作区、暂存区和仓库分别是什么？

**短回答：**

工作区是实际文件，暂存区保存下一次提交的快照，仓库以对象和引用保存历史；git add 更新索引，git commit 由索引生成提交。

**原理：**

![Git 工作区、暂存区和仓库之间的数据流图](/content/diagrams/git-engineering/three-trees-v1.svg "git add 更新索引，git commit 从索引生成提交，checkout/restore 改变对应区域。")

- 工作区是某个提交被检出后供编辑器和构建工具直接读写的文件树；暂存区实际是 .git/index 中的一份路径清单，每条记录包含路径、文件模式和将进入下一次快照的 blob 对象名；
- 仓库则由 .git/objects 中的不可变对象、refs 下的引用、HEAD 与配置等元数据组成。
- git add 会根据选定的工作区内容写入 blob 并更新 index，git commit 递归把 index 写成 tree，再创建指向该 tree 和父提交的 commit，最后移动当前分支引用。
- 未暂存修改只在工作区，已暂存修改在 index，提交之后才由引用可达，三层不能简单理解成三个文件夹。

**代码 / 场景：**

下面用短状态码观察同一文件依次经过“未跟踪、已暂存、已提交后又修改”三种状态。

~~~bash
git init demo && cd demo
printf "v1\n" > app.txt
git status --short        # ?? app.txt：只在工作区
git add app.txt
git status --short        # A  app.txt：index 已有新文件
git commit -m "add app"
printf "v2\n" >> app.txt
git status --short        #  M app.txt：仓库/index 仍是 v1，工作区已变
~~~

状态码左列描述 index 相对 HEAD，右列描述工作区相对 index，因此能定位变化所在层。

**递进追问：**

1. **暂存区为什么不等于“待提交文件夹”？**

   index 保存的是路径到对象名与模式的映射，是下一棵 tree 的扁平缓存；同一文件还可只暂存部分补丁，并不存在复制完整目录的独立文件夹。

2. **git commit 会重新读取工作区吗？**

   正常提交主要从 index 构造 tree，不会自动纳入未 git add 的工作区变化；因此提交前应同时检查 git diff 与 git diff --cached。

**易错点：**

- 不要把 git add 说成把文件搬进缓存，它会写对象并改变 index 中路径对应的快照内容。
- 只看工作区文件无法确定下次提交内容，必须查看 index 与 HEAD 之间的差异。

**参考来源：**

- [Git Glossary：working tree 与 index](https://git-scm.com/docs/gitglossary)
- [Pro Git：Recording Changes to the Repository](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Git index format](https://git-scm.com/docs/index-format)

校验日期：2026-07-20

## Q2：Git 为什么说是快照模型而不是差异模型？

**短回答：**

每次提交记录一棵完整目录树，并通过内容寻址复用未变化的 blob；展示 diff 是比较两个快照的结果。

**原理：**

- 每个 commit 直接记录一棵根 tree 的对象名，tree 再按目录层级引用子 tree 和 blob，因此一个提交在逻辑上描述该时刻完整项目快照，而不是只保存“相对上一个版本改了哪些行”的补丁。
- 对象采用内容寻址：未变化文件产生相同 blob，对应子目录也可复用相同 tree，所以完整快照并不意味着每次复制所有字节。git diff、git show 中看到的补丁是 Git 读取两棵 tree 后按需比较得到的视图。
- 对象打包时 packfile 可能使用 delta 压缩节省磁盘，这是物理存储优化，不改变 commit 指向完整 tree 的逻辑模型；理解这一区别才能正确解释 checkout、merge 与任意两版本比较。

**代码 / 场景：**

两个提交只改 b.txt；ls-tree 会显示 a.txt 的 blob 对象名复用，而根 tree 和 b.txt 对象发生变化。

~~~bash
printf "A\n" > a.txt; printf "B1\n" > b.txt
git add . && git commit -m "first"
git ls-tree HEAD              # 记录 a、b 的 blob OID
printf "B2\n" > b.txt
git add b.txt && git commit -m "change b"
git ls-tree HEAD              # a.txt OID 不变，b.txt OID 改变
git diff HEAD^ HEAD           # 补丁是比较两个快照后计算出来
~~~

对象复用让快照模型兼具空间效率，不能据 pack 的 delta 就反推逻辑上是差异链。

**递进追问：**

1. **为什么任意两个提交都能直接比较？**

   每个提交都能解析出完整根 tree，Git 无需从最早版本逐补丁回放，只需遍历两棵树并对不同对象继续比较即可。

2. **packfile 的 delta 是否会让 Git 变成差异模型？**

   不会。delta 只是对象字节的存储编码，解码后对象仍由自身内容与类型定义，commit 的语义仍是指向完整 tree 快照。

**易错点：**

- “快照”不等于每次复制全部文件，内容相同的 blob 与 tree 会被对象名复用。
- git show 展示补丁只是用户界面视图，commit 对象本身并不保存那份行级 diff。

**参考来源：**

- [Pro Git：Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [Pro Git：Snapshots, Not Differences](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F#_snapshots_not_differences)
- [Git pack format](https://git-scm.com/docs/gitformat-pack)

校验日期：2026-07-20

## Q3：blob、tree、commit 和 tag 对象有什么关系？

**短回答：**

blob 保存文件内容，tree 保存目录项，commit 指向根 tree 和父提交，附注 tag 再指向目标对象并保存签名等元数据。

**原理：**

- blob 对象只保存文件内容，不含文件名；tree 对象保存目录条目，每项由文件模式、名称和对象名组成，可指向 blob 或子 tree；commit 对象指向一个根 tree，并记录零个或多个父 commit、作者、提交者和消息，从而形成历史图；
- 附注 tag 对象再指向任意 Git 对象，保存标签名、tagger、消息并可包含签名。轻量 tag 则不是 tag 对象，而只是 refs/tags 下直接指向目标对象的引用。对象本身不可变，名称由类型、长度和内容共同计算；
- 修改文件会产生新 blob，并使沿路径的 tree 与最终 commit 变化，但其他未变对象仍复用。

**代码 / 场景：**

cat-file 逐层查看 HEAD，可从 commit 的 tree 走到目录条目，再检查文件 blob；附注标签多一层 tag 对象。

~~~bash
git cat-file -p HEAD                 # 第一行形如 tree <oid>
git ls-tree HEAD                     # 模式、类型、OID、路径
git cat-file -p HEAD:README.md        # 直接输出 README 的 blob 内容
git tag -a v1.0.0 -m "release"
git cat-file -p v1.0.0                # 输出 tagger、message 与 object <oid>
git cat-file -t v1.0.0^{}             # 解引用后通常是 commit
~~~

文件名属于 tree 条目，同一 blob 可被不同路径或不同提交共同引用。

**递进追问：**

1. **为什么 blob 对象没有文件名？**

   内容寻址希望相同字节只存一份；名称与模式属于目录关系，由 tree 条目保存，这样同一 blob 可被多个路径复用。

2. **轻量 tag 与附注 tag 如何选择？**

   临时私人标记可用轻量 tag；正式发布通常使用附注 tag，因为它有独立对象，可保存 tagger、说明和可验证签名。

**易错点：**

- 不要说 commit 直接包含文件内容，它只指向根 tree，文件内容需沿 tree 条目找到 blob。
- tag 名称可能是轻量引用或附注对象，讨论签名与元数据前必须先区分类型。

**参考来源：**

- [Pro Git：Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [git cat-file 官方文档](https://git-scm.com/docs/git-cat-file)
- [git tag 官方文档](https://git-scm.com/docs/git-tag)

校验日期：2026-07-20

## Q4：HEAD、branch 和 tag 有什么区别？

**短回答：**

HEAD 表示当前检出的提交或分支，branch 是可移动的提交引用，tag 通常是指向固定版本的发布标记。

**原理：**

- branch 本质是 refs/heads 下可移动的引用，通常指向某个 commit；在该分支提交成功后，Git 原子地把它推进到新 commit。HEAD 表示当前检出位置，常以 symbolic ref 形式保存 ref: refs/heads/main，从而间接指向分支；
- 也可直接保存 commit 对象名，形成 detached HEAD。tag 位于 refs/tags，约定用于稳定标记版本，轻量 tag 直接指向对象，附注 tag 先指向 tag 对象再指向目标。三者都不是提交容器：提交的父链接形成历史图，引用只是让某个节点有可达名称。
- 删除 branch 或 tag 只删除引用，不会立即删除仍被其他引用或 reflog 可达的对象。

**代码 / 场景：**

以下命令同时查看 HEAD 的符号目标、分支与标签解析结果，并演示 detached HEAD 的变化。

~~~bash
git symbolic-ref --short HEAD       # main
git rev-parse HEAD                  # 当前 commit OID
git branch experiment               # 新建可移动引用，不切换
git tag -a v1.0.0 -m "release"     # 新建附注标签
git switch --detach HEAD~1
git symbolic-ref --short HEAD       # 失败：HEAD 已直接指向 commit
git switch main                     # 再次让 HEAD 指向 refs/heads/main
~~~

提交时移动的是 HEAD 所指分支；稳定发布 tag 不应被日常提交自动推进。

**递进追问：**

1. **删除分支会马上删除提交吗？**

   不会。删除的只是引用；提交若仍被其他分支、tag 或 reflog 引用便保持可达，即使暂时不可达也要等对象清理后才可能消失。

2. **为什么发布 tag 通常不应强制移动？**

   构建、制品与审计可能已把 tag 当成不可变版本标识；移动同名 tag 会让不同人解析到不同提交，应发布新版本并保护 tag。

**易错点：**

- 分支不是一串提交的副本，它只是一个会移动的提交引用，历史来自 commit 的父边。
- HEAD 不总是分支名，排查脚本前必须考虑 detached HEAD 与 unborn branch 等状态。

**参考来源：**

- [Git Glossary：HEAD、branch、tag](https://git-scm.com/docs/gitglossary)
- [gitrevisions 官方文档](https://git-scm.com/docs/gitrevisions)
- [git symbolic-ref 官方文档](https://git-scm.com/docs/git-symbolic-ref)

校验日期：2026-07-20

## Q5：git add 到底做了什么？

**短回答：**

它把指定文件内容写成对象并更新 index 中路径对应的 blob、模式和阶段信息，不是简单把文件“放进缓存”。

**原理：**

- git add 会把选定路径当前内容按仓库过滤规则规范化，写成 blob 对象，并更新 index 中该路径的文件模式、对象名和阶段等记录，使 index 更接近希望提交的下一棵 tree。
- 它不是简单记录“文件已修改”，也不是只保存路径：同一工作区文件可通过 git add -p 只把部分补丁写入 index，未选部分仍留在工作区。删除路径时 add -u 或 add -A 会把删除反映到 index。
- 发生合并冲突时，index 可同时保存共同祖先、ours、theirs 的 stage 1/2/3 条目；解决文件后再次 git add 会用最终内容建立单一 stage 0 记录，表示该路径已解决。

**代码 / 场景：**

先暂存 v1，再把工作区改成 v2；index 仍指向 v1 blob，证明 add 捕获的是调用时快照。

~~~bash
printf "v1\n" > note.txt
git add note.txt
git ls-files --stage note.txt       # 显示 v1 blob OID 与 stage 0
printf "v2\n" > note.txt
git diff --cached -- note.txt       # HEAD -> v1
git diff -- note.txt                # index 的 v1 -> 工作区 v2
git add note.txt
git diff -- note.txt                # 为空，index 已更新到 v2
~~~

对象可能在 commit 前就写入仓库，但只有后续 tree、commit 与引用让它长期可达。

**递进追问：**

1. **git add -p 为什么能只暂存部分修改？**

   它把工作区差异拆成 hunk，让用户选择后基于 index 旧内容应用选中补丁，再为所得内容写 blob 并更新该路径。

2. **冲突解决后为什么必须 git add？**

   编辑工作区只产生最终文件；git add 才会移除 index 的 stage 1/2/3 冲突条目，写入 stage 0，供 merge commit 构造 tree。

**易错点：**

- 暂存后继续编辑文件不会自动更新 index，下次提交仍使用最近一次 git add 捕获的版本。
- git add 可能运行 clean filter 和换行规范化，仓库 blob 字节不一定与工作区文件逐字节相同。

**参考来源：**

- [git add 官方文档](https://git-scm.com/docs/git-add)
- [Git index format](https://git-scm.com/docs/index-format)
- [git ls-files 官方文档](https://git-scm.com/docs/git-ls-files)

校验日期：2026-07-20

## Q6：git status 为什么能判断文件状态？

**短回答：**

Git 比较 HEAD 树、index 与工作区三份状态：HEAD 对 index 得到待提交变化，index 对工作区得到未暂存变化。

**原理：**

- git status 不是只扫描一个目录，而是综合比较三份状态。它把 HEAD commit 的 tree 与 index 比较，得到“Changes to be committed”；
- 再把 index 与工作区文件比较，得到“Changes not staged for commit”；工作区中没有 index 条目的路径经忽略规则过滤后成为 untracked。实现上 index 还缓存时间、大小等 stat 信息以避免每次读取全部内容，必要时才重新散列；
- 合并冲突则根据 index 的多阶段条目报告 unmerged。短格式两列状态正对应 index 相对 HEAD 与工作区相对 index，因此同一路径可同时出现 MM：已暂存一版，之后工作区又修改一版。

**代码 / 场景：**

同一文件先暂存再修改，会同时出现在两组比较中；短格式左、右两列都显示 M。

~~~bash
printf "base\n" > app.txt
git add app.txt && git commit -m "base"
printf "staged\n" >> app.txt
git add app.txt
printf "working\n" >> app.txt
git status --short              # MM app.txt
git diff --cached -- app.txt    # HEAD 与 index：包含 staged
git diff -- app.txt             # index 与工作区：只包含 working
~~~

status 只汇总状态；要审查具体内容必须继续查看两类 diff。

**递进追问：**

1. **为什么未跟踪文件不会出现在 git diff？**

   普通 diff 比较已有路径在 tree、index 与工作区中的内容，未跟踪路径尚无 index 基线；先 git add -N 或直接查看文件才能纳入差异流程。

2. **短格式 XY 两列分别表示什么？**

   X 描述 index 相对 HEAD 的状态，Y 描述工作区相对 index 的状态；冲突组合有专门含义，解析脚本应按 porcelain 格式文档处理。

**易错点：**

- git status 显示 clean 只说明受跟踪和未忽略状态无待报告变化，不代表构建产物或外部依赖完全一致。
- 状态文字是比较结果，不会自动审查差异质量；提交前仍需分别阅读 staged 与 unstaged diff。

**参考来源：**

- [git status 官方文档](https://git-scm.com/docs/git-status)
- [git diff 官方文档](https://git-scm.com/docs/git-diff)
- [Git index format](https://git-scm.com/docs/index-format)

校验日期：2026-07-20

## Q7：git diff、git diff --cached 和 git show 如何区分？

**短回答：**

前者比较工作区与 index，--cached 比较 index 与 HEAD，git show 默认展示指定对象及提交引入的变化。

**原理：**

- 不带参数的 git diff 比较工作区与 index，回答“哪些改动还没暂存”；git diff --cached（同 --staged）比较 index 与 HEAD，回答“下一次普通提交将包含哪些改动”；
- git show 默认解析指定对象并以适合类型的方式展示，指定 commit 时通常先显示提交元数据，再展示它相对父提交引入的补丁。根提交和合并提交有不同父结构，show 的默认合并差异格式也要单独理解。
- git diff HEAD 则把当前工作区整体与 HEAD tree 比较，合并 staged 与 unstaged 的最终效果。以上命令通常不展示普通未跟踪文件，也不会改变任何层，适合在提交前组合审查。

**代码 / 场景：**

先暂存第一行再追加第二行，三个命令各自看到不同边界，提交后 show 展示最终 commit。

~~~bash
printf "one\n" > demo.txt
git add demo.txt
printf "two\n" >> demo.txt
git diff -- demo.txt             # index -> 工作区，只见 two
git diff --cached -- demo.txt    # HEAD -> index，只见 one
git diff HEAD -- demo.txt        # HEAD -> 工作区，见 one 与 two
git add demo.txt && git commit -m "add demo"
git show --stat --oneline HEAD   # 提交元数据及其改动摘要
~~~

明确左右两端对象，比死记“看代码差异”更能避免漏审。

**递进追问：**

1. **git show 一个合并提交展示什么？**

   合并提交有多个父节点，默认格式可能使用 combined diff 且只突出父提交都不同的路径；需要逐父比较时可显式使用 git diff merge^1 merge 等命令。

2. **如何只检查暂存区是否含空白错误？**

   可先运行 git diff --cached --check，它基于 HEAD 与 index 的差异报告空白问题；这不会检查仍未暂存的工作区修改。

**易错点：**

- 只运行 git diff 可能误以为没有变化，因为已暂存内容要用 --cached 才能看到。
- git show 默认参数和对象类型会影响输出，自动化脚本应显式指定格式、父节点和路径范围。

**参考来源：**

- [git diff 官方文档](https://git-scm.com/docs/git-diff)
- [git show 官方文档](https://git-scm.com/docs/git-show)
- [git diff-tree 官方文档](https://git-scm.com/docs/git-diff-tree)

校验日期：2026-07-20

## Q8：什么是 detached HEAD？

**短回答：**

HEAD 直接指向提交而非分支引用；此时提交可创建但没有分支名称保护，应及时创建分支避免后续不可达。

**原理：**

- detached HEAD 指 HEAD 不再是指向 refs/heads/某分支的符号引用，而是直接指向某个 commit 对象名，常见于检出 tag、远程跟踪引用或任意历史提交。此时工作区和 index 仍正常对应该提交，也可以创建新 commit；
- 区别是提交完成后只移动 HEAD 自身，没有本地分支引用跟随。随后切到别处分支，这段新历史可能不再被稳定引用，只能暂时从 reflog 找回，并最终可能被垃圾回收。若决定保留工作，应在离开前或事后用 git switch -c name 把分支指向当前提交。
- CI 为构建精确提交而 detached 通常是正常状态，不应一概视为故障。

**代码 / 场景：**

从旧提交进入 detached 状态并创建提交，再立即建立分支，保证新提交获得稳定引用。

~~~bash
git switch --detach HEAD~1
git status --short --branch       # ## HEAD (no branch)
printf "experiment\n" > trial.txt
git add trial.txt && git commit -m "experiment"
git rev-parse HEAD                # 记下新 commit OID
git switch -c save-experiment     # 新分支指向该 OID
git symbolic-ref --short HEAD     # save-experiment
~~~

detached 不阻止提交，风险只在没有持久引用保护新提交可达性。

**递进追问：**

1. **离开 detached HEAD 后如何找回刚才的提交？**

   先用 git reflog 查看 HEAD 移动记录，确认目标 OID，再执行 git branch recover <oid> 建立引用；应在 reflog 过期和对象清理前完成。

2. **检出 tag 为什么通常进入 detached HEAD？**

   tag 约定为稳定版本标记，不应随新提交移动；Git 因而让 HEAD 直接指向 tag 解析的 commit，而不是把 tag 当成可写分支。

**易错点：**

- detached HEAD 不等于仓库损坏，读取、构建、测试和提交都仍可正常工作。
- 仅记住新提交短哈希但长期不建引用仍有风险，可靠做法是立即创建分支或 tag。

**参考来源：**

- [git switch 官方文档](https://git-scm.com/docs/git-switch)
- [git checkout：Detached HEAD](https://git-scm.com/docs/git-checkout#_detached_head)
- [git reflog 官方文档](https://git-scm.com/docs/git-reflog)

校验日期：2026-07-20

## Q9：.gitignore 为什么对已跟踪文件不生效？

**短回答：**

忽略规则只影响未跟踪路径的发现；已进入 index 的路径仍受版本控制，需要先 git rm --cached 再提交。

**原理：**

- .gitignore 参与的是未跟踪路径发现与是否默认纳入 add 的决策，不会从 index 删除已经存在的路径条目。一个文件一旦被提交或暂存为受跟踪路径，status 和 diff 必须继续报告它的变化，否则历史中的文件将无法可靠更新。
- 因此后来新增忽略规则不会让该路径自动“失踪”。若确实要停止跟踪但保留本地文件，应先写好忽略规则，再执行 git rm --cached -- path 更新 index，并提交这次删除；其他协作者拉取该提交时，版本库中的文件会被移除，部署影响必须评估。
- 若只是本机临时忽略，不应滥用 assume-unchanged 作为配置管理方案。

**代码 / 场景：**

以下过程先提交配置，再加入忽略规则；只有 rm --cached 并提交后，它才从跟踪集合移除。

~~~bash
printf "local=true\n" > app.env
git add app.env && git commit -m "track env"
printf "app.env\n" >> .gitignore
git add .gitignore
printf "secret=x\n" >> app.env
git status --short              # app.env 仍显示已修改
git rm --cached app.env         # 保留工作区文件，删除 index 路径
git commit -m "stop tracking local env"
git check-ignore -v app.env     # 显示命中的忽略规则
~~~

敏感信息若已提交，仅停止跟踪不能抹掉历史，还必须先轮换凭据。

**递进追问：**

1. **git rm --cached 会删除本地文件吗？**

   带 --cached 时主要从 index 移除路径并保留工作区文件；提交后其他检出该历史的环境会看到仓库删除，因此仍要评估共享影响。

2. **如何判断某路径被哪条规则忽略？**

   使用 git check-ignore -v -- path，它会输出规则来源文件、行号与匹配模式；若路径已跟踪，还需先理解默认检查对跟踪文件的限制。

**易错点：**

- 把凭据加入 .gitignore 不能消除既有提交中的秘密，泄露后首要动作仍是吊销与轮换。
- assume-unchanged 和 skip-worktree 不是团队共享配置忽略机制，误用会造成静默覆盖与合并困惑。

**参考来源：**

- [gitignore 官方文档](https://git-scm.com/docs/gitignore)
- [git rm 官方文档](https://git-scm.com/docs/git-rm)
- [git check-ignore 官方文档](https://git-scm.com/docs/git-check-ignore)

校验日期：2026-07-20

## Q10：Git 的内容寻址和 SHA 哈希解决什么问题？

**短回答：**

对象名由类型、长度和内容计算，可用于去重与完整性校验；哈希相同表示 Git 按对象模型识别为同一内容。

**原理：**

- Git 对对象按“类型 + 空格 + 内容长度 + NUL + 内容”计算对象名，传统仓库使用 SHA-1，新格式可使用 SHA-256。对象名同时承担内容身份、完整性校验和去重索引：相同类型与字节得到相同 OID，未变化 blob 可跨 tree 与 commit 复用；
- 读取对象时重新计算可发现意外损坏。commit 又包含 tree、父提交和元数据的对象名，因此篡改任意可达内容会沿图改变后续身份。但哈希本身不证明作者身份或服务器权限，也不能替代签名、受保护引用和传输安全。
- Git 已设计哈希算法迁移以应对 SHA-1 碰撞风险，回答时不能把“几乎唯一”说成数学上绝不碰撞。

**代码 / 场景：**

hash-object 可在不写入时预测 OID；加 -w 后同一内容返回同一对象名，并能用 cat-file 校验。

~~~bash
printf "hello\n" > one.txt
cp one.txt two.txt
git hash-object one.txt           # 记为 <oid>
git hash-object two.txt           # 同一 <oid>
git hash-object -w one.txt        # 写入对象库，仍是 <oid>
git cat-file -t <oid>             # blob
git cat-file -p <oid>             # hello
printf "changed\n" >> two.txt
git hash-object two.txt           # 得到不同 OID
~~~

文件名不参与 blob 哈希，因此不同路径的相同内容可以共享对象。

**递进追问：**

1. **内容寻址是否能证明提交由某个人创建？**

   不能。OID 证明对象内容与名称一致，不认证作者字段；身份与来源需要签名、托管平台账号控制、审计日志和受保护分支共同保证。

2. **为什么修改一行会改变 commit OID？**

   新内容产生新 blob，沿目录路径产生新 tree，commit 中根 tree 字段随之改变；commit 字节变化后其对象名也重新计算。

**易错点：**

- 不要把对象哈希等同于安全签名，攻击者可创建自洽对象但不能仅凭 OID证明可信身份。
- OID 包含对象类型和长度前缀，不是简单对工作区文件字节直接计算普通 SHA 输出。

**参考来源：**

- [Pro Git：Object Storage](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [git hash-object 官方文档](https://git-scm.com/docs/git-hash-object)
- [Git hash function transition](https://git-scm.com/docs/hash-function-transition)

校验日期：2026-07-20

# 分支、合并与历史

## Q11：merge 和 rebase 的核心区别是什么？

**短回答：**

merge 保留分叉并产生合并提交，rebase 复制提交到新基线并重写提交身份；公共历史通常避免随意 rebase。

**原理：**

- merge 找到两个分支的共同祖先并合成结果；若不能快进，通常创建一个同时指向两个父提交的 merge commit，原有提交身份和分叉拓扑保持不变。
- rebase 则选出当前分支相对上游独有的提交，逐个计算并在新基线上重新应用，每一步创建新的 commit 对象，所以 tree 可能相同但父提交、提交者时间和 OID 都会变化。merge 表达“两个历史在此汇合”，rebase 用线性历史表达“这些变更仿佛基于新基线完成”。
- 已经共享的提交若 rebase 后强推，会让协作者必须协调重置或再次合并；本地尚未共享分支则常可安全整理。

**代码 / 场景：**

假设 main 与 feature 已分叉：merge 保留 C、D 并新增 M；rebase 会把 D 复制为 D-prime 后直接接到 C。

~~~text
初始： A---B---C  main
            \
             D  feature

merge：  A---B---C---M
              \     /
               D---

rebase： A---B---C---D-prime
~~~

命令分别是 git switch main && git merge feature，或在 feature 上执行 git rebase main；后者的 D 与 D-prime OID 不同。

**递进追问：**

1. **rebase 后内容相同，为什么 commit OID 仍改变？**

   commit 对象包含父提交、作者与提交者元数据、消息和 tree；新基线改变父 OID，重新创建对象后哈希必然不同。

2. **什么时候优先保留 merge commit？**

   当分支合并本身是有意义的审计事件、需要保留并行开发拓扑，或提交已经多人共享时，merge 通常比改写历史更稳妥。

**易错点：**

- rebase 不是移动旧提交，而是按旧变更创建新提交；引用旧 OID 的评审和签名会受影响。
- “线性历史更干净”不是无条件目标，发布审计与真实集成边界有时需要 merge 拓扑。

**参考来源：**

- [git merge 官方文档](https://git-scm.com/docs/git-merge)
- [git rebase 官方文档](https://git-scm.com/docs/git-rebase)
- [Pro Git：Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)

校验日期：2026-07-20

## Q12：fast-forward 合并是什么？

**短回答：**

目标分支没有额外提交时，只需把分支引用前移到新提交，不必创建双亲合并提交。

**原理：**

- 当当前分支 tip 是待合并提交的祖先时，目标历史没有独立分叉，Git 无需做三方内容合并或创建双亲 commit，只需把当前分支引用沿已有提交链前移到对方 tip，这就是 fast-forward。
- 工作区与 index 会更新到新 tip 对应快照，reflog 记录引用移动，但对象图中没有“发生过一次合并”的新节点。git merge --ff-only 可把“必须可快进”设为前置条件，分叉时直接失败；
- --no-ff 即使可快进也创建 merge commit，用于保留功能分支的集成边界。是否允许 FF 是历史表达和治理选择，不影响最终 tree 内容必然相同这一点。

**代码 / 场景：**

main 停在 B、feature 已到 D 且 B 是 D 的祖先，ff-only 只把 refs/heads/main 从 B 更新到 D。

~~~bash
git switch main
git merge-base --is-ancestor main feature
echo $?                         # 0：main 是 feature 祖先
git rev-parse main              # <B>
git merge --ff-only feature
git rev-parse main              # <D>，与 feature 相同
git log --graph --oneline -5    # 没有额外 merge commit
~~~

若检查返回非零，ff-only 会拒绝，必须先决定真正 merge、rebase 还是停止。

**递进追问：**

1. **--no-ff 的价值和代价是什么？**

   它保留明确的分支集成节点，便于整体 revert 和审计；代价是增加 merge commit，频繁小分支可能使图形历史更嘈杂。

2. **pull --ff-only 能防止什么？**

   它允许本地分支只在无独立提交时前移，若已经分叉便停止，避免 pull 隐式生成 merge commit 或按未知策略改写历史。

**易错点：**

- fast-forward 不是把文件复制过来，而是验证祖先关系后移动引用并检出目标快照。
- FF 后看不到独立合并节点，若审计要求记录集成事件，应明确使用 --no-ff 或平台合并策略。

**参考来源：**

- [git merge：Fast-forward merge](https://git-scm.com/docs/git-merge#_fast_forward_merge)
- [git merge-base 官方文档](https://git-scm.com/docs/git-merge-base)
- [git pull 官方文档](https://git-scm.com/docs/git-pull)

校验日期：2026-07-20

## Q13：三方合并为什么需要共同祖先？

**短回答：**

因为只看两个分支的最终文件，Git 无法判断哪一边是新增、删除还是保持不变；

- 共同祖先给了它一份“分叉前的原稿”。Git 分别计算 base→ours 和 base→theirs 的变化，只有修改/修改、修改/删除、目录/文件冲突等变化无法自动协调成唯一结果时才报冲突。

**原理：**

- 因为没有 merge base 时 Git 只看到两份不同的终稿，不知道某行是 ours 删除了，还是 theirs 新增了，所以三方合并必须先找到共同祖先。以它为基线才能分别计算 base→ours 与 base→theirs；
- 若 ours 与 base 相同而 theirs 改变，可直接采用 theirs，反之亦然。当两侧变化无法自动协调成唯一结果时，Git 才留下冲突等待人工决定。
- 冲突不只是双方修改同一行：一侧修改而另一侧删除、同一路径被重命名到两个不同目标、一侧重命名而另一侧删除，以及同路径在一侧是目录、另一侧是文件，都可能无法自动合并。反过来，Git 即使自动合并了不同文件或不同行，也可能产生业务上的语义冲突，因此仍需要测试。
- Git 会根据提交图寻找最佳共同祖先；复杂 criss-cross 历史可能有多个 merge base，合并策略会先构造虚拟基线。重命名检测是根据相似性推断，并非对象模型显式保存。

**代码 / 场景：**

冲突时 index 的 stage 1、2、3 正好保存 base、ours、theirs，可分别查看而不是只读冲突标记。

~~~bash
git merge feature                 # 假设 README.md 冲突
git ls-files -u README.md         # stage 1/2/3 与各自 blob OID
git show :1:README.md             # merge base 版本
git show :2:README.md             # ours：当前分支版本
git show :3:README.md             # theirs：被合并分支版本
git merge-base HEAD MERGE_HEAD    # 显示共同祖先 OID
~~~

把三份输入并排审查，才能判断是选择一侧、组合两侧还是重新设计。

**递进追问：**

1. **共同祖先一定只有一个吗？**

   不一定。criss-cross 合并可能产生多个最佳 merge base；现代合并策略会递归合成虚拟基线，再进行最终三方合并。

2. **为什么双方改了不同文件通常不会冲突？**

   通常因为相对同一 base 的路径变化互不重叠，合并策略可同时应用两组变化。但若还涉及跨路径重命名、目录/文件占位或构建约束，仍可能出现文本冲突或语义冲突。

**易错点：**

- 不要把冲突等同于“两人改了同一行”；它的本质是两组相对基线的变化无法自动协调。
- Git 没有报文本冲突不代表结果正确；接口、配置和数据约束可能已在不同文件中被两侧改到不兼容。
- ours 与 theirs 会随 merge、rebase 等操作上下文变化，执行恢复命令前必须确认当前含义。

**参考来源：**

- [git merge 官方文档](https://git-scm.com/docs/git-merge)
- [git merge-base 官方文档](https://git-scm.com/docs/git-merge-base)
- [Pro Git：Basic Merge Conflicts](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)

校验日期：2026-07-20

## Q14：如何安全解决 merge conflict？

**短回答：**

先读取冲突阶段和业务语义，编辑出最终内容，运行测试后 git add 标记已解决，再继续 merge 或 rebase；不要只删除标记。

**原理：**

- 先用 git status 确认当前操作类型、冲突路径和可用的 abort/continue 命令，再读取 base、ours、theirs 或使用 mergetool 理解双方意图。工作区冲突标记只是可视化结果，真正的未合并状态存于 index stage 1/2/3。
- 应按业务不变量编辑出最终文件，而不是机械删除标记或全选一侧；随后运行格式化、单元与集成测试，git diff --check 检查残留标记和空白。git add 路径会写最终 blob 并折叠为 stage 0，全部解决后 git merge --continue 或提交。
- 方向不明确时可先 git merge --abort 回到操作前；不要在混杂未提交改动时贸然开始合并。

**代码 / 场景：**

以下序列保留诊断证据、验证最终差异，并在确认后才标记解决与继续。

~~~bash
git status
git diff --name-only --diff-filter=U
git show :1:src/config.js > base.js
git show :2:src/config.js > ours.js
git show :3:src/config.js > theirs.js
# 编辑 src/config.js，按业务语义组合结果
npm test
git diff --check
git add src/config.js
git diff --cached -- src/config.js
git merge --continue
~~~

若最终 staged diff 不符合预期，应在 continue 前继续修改，而不是先完成再补救。

**递进追问：**

1. **为什么 rebase 冲突中的 ours/theirs 容易反直觉？**

   rebase 正把旧提交重放到新基线，当前检出侧通常是新基线与已重放结果，而被应用提交是另一侧；应看 status 和三阶段内容，不凭名称猜。

2. **git rerere 能解决什么问题？**

   它记录某组冲突形状及人工解决结果，后续遇到相同冲突时可复用；仍需审查并测试，不能把历史解决方案当成永远正确。

**易错点：**

- 仅删除 <<<<<<< 等标记不代表语义正确，可能同时丢失双方必要逻辑或不变量。
- 冲突解决后的 git add 是写入最终 index 状态，不是普通意义上的“确认我看过了”。

**参考来源：**

- [git merge：How to resolve conflicts](https://git-scm.com/docs/git-merge#_how_to_resolve_conflicts)
- [git checkout：index stages](https://git-scm.com/docs/git-checkout#_description)
- [git rerere 官方文档](https://git-scm.com/docs/git-rerere)

校验日期：2026-07-20

## Q15：git rebase --onto 适合什么场景？

**短回答：**

它可把一段提交从旧基线搬到指定新基线，适合拆错分支或只迁移某段连续历史。

**原理：**

- 因为普通 rebase 往往默认搬动整个分支，而 `--onto` 能把“提交选择边界”和“新落点”分开指定，所以它适合只搬一段连续历史。
- `git rebase --onto <newbase> <upstream> <branch>` 会选出 branch 可达但 upstream 不可达的提交，按顺序在 newbase 上重新应用并创建新提交，最后移动 branch。
- 它适合把从错误父分支切出的主题分支移到正确基线，或只搬迁连续历史的一部分。例如 topic 基于 featureA 开发，但实际只依赖 main，可用 --onto main featureA topic 去掉 featureA 独有提交。
- upstream 是“排除边界”而不是新基线，参数写反可能丢选或多选提交；执行前应以 git log upstream..branch 核对集合并创建备份引用。由于提交 OID 重写，已共享分支需要协调和带 lease 的推送。

**代码 / 场景：**

topic 错从 featureA 分出；命令只选 D、E，复制到 main 的 C 之后，A 分支的 X 不会进入新历史。

~~~text
原图： A---B---C  main
              \
               X  featureA
                \
                 D---E  topic

检查：git log --oneline featureA..topic   # 只应看到 D、E
执行：git rebase --onto main featureA topic
结果：A---B---C---D-prime---E-prime  topic
~~~

若检查集合不对，先停止并重新选择 upstream；不要靠 rebase 完成后再猜哪些提交被复制。

**递进追问：**

1. **--onto 的三个核心参数各是什么？**

   newbase 是新提交链起点，upstream 定义不应重放的可达边界，branch 是要移动的分支；提交集合近似 upstream..branch。

2. **操作后发现选错提交如何恢复？**

   立即用 git reflog 找到 rebase 前的 branch OID，创建恢复分支或 reset；执行前主动建立 backup/topic 引用会让恢复路径更清晰。

**易错点：**

- upstream 不是“旧基线名称”的随意描述，它直接参与提交集合计算，选错会重放错误范围。
- rebase 后新旧提交 OID 不同，不能在公共分支上无协调强推覆盖协作者新增历史。

**参考来源：**

- [git rebase --onto 官方文档](https://git-scm.com/docs/git-rebase#_transplanting_a_topic_branch_with_onto)
- [git rev-list 官方文档](https://git-scm.com/docs/git-rev-list)
- [git reflog 官方文档](https://git-scm.com/docs/git-reflog)

校验日期：2026-07-20

## Q16：cherry-pick 的作用和风险是什么？

**短回答：**

它把指定提交的补丁应用为新提交；会生成新身份，重复挑选或与后续合并叠加可能产生冲突与重复变更。

**原理：**

- git cherry-pick <commit> 读取该提交相对其父提交引入的变化，把这组变化三方应用到当前 HEAD 快照，成功后以当前 HEAD 为父创建一个全新 commit。新提交可复用原作者信息和消息，但父节点、提交者时间与对象内容不同，因此 OID 不同；
- 它不是把原 commit 引用“搬过来”。适合把独立修复选择性带到维护分支。风险包括补丁依赖未一并带入、在不同上下文产生语义冲突，以及未来合并原分支时出现等价变更、冲突或难以追踪的重复历史。挑选 merge commit 还必须用 -m 指定主父，选择错误会反转错误的差异基线。

**代码 / 场景：**

在 release 分支选择主线修复，并用 -x 在消息中记录来源；冲突时可中止而不留下半成品提交。

~~~bash
git switch release/1.x
git log --oneline main -- src/security.js
git cherry-pick -x <fix-commit>
# 若冲突：编辑、测试、git add 后执行：
git cherry-pick --continue
# 若发现依赖不完整：
git cherry-pick --abort
git log -1 --format=fuller          # 新 OID，并含来源说明
~~~

-x 只增加追踪信息，不会自动保证补丁依赖完整或避免未来重复合并。

**递进追问：**

1. **cherry-pick merge commit 为什么需要 -m？**

   merge 有多个父节点，Git 必须知道把该 merge 看作相对哪一个主父的变化；-m 选择父编号，选错会得到完全不同补丁。

2. **如何判断补丁是否依赖前置提交？**

   审查目标提交的 diff、调用关系和测试，并在源分支查看相邻历史；必要时按拓扑顺序挑选一组提交，而不是只看单个消息。

**易错点：**

- 新 OID 不代表出现两套不同功能，但未来合并时 Git 的拓扑无法把两者当成同一提交。
- 不要只 cherry-pick 代码而忽略数据库迁移、配置、测试或版本约束等隐含依赖。

**参考来源：**

- [git cherry-pick 官方文档](https://git-scm.com/docs/git-cherry-pick)
- [Pro Git：Rebasing and Cherry-Picking Workflows](https://git-scm.com/book/en/v2/Distributed-Git-Maintaining-a-Project)
- [git patch-id 官方文档](https://git-scm.com/docs/git-patch-id)

校验日期：2026-07-20

## Q17：revert 和 reset 有什么区别？

**短回答：**

revert 新建反向提交，适合共享分支；reset 移动当前分支并可改变 index/工作区，更适合尚未共享的本地历史。

**原理：**

- git revert 不移动已有分支历史，而是计算目标提交的反向变化，尝试应用到当前快照并创建一个新的撤销 commit；原提交仍可达，适合已经推送的共享分支，审计能看到“发生过并被撤销”。若当前代码已演进，反向补丁仍可能冲突；
- 撤销 merge 还需 -m 指定保留哪条主线，且会影响后续合并判断。git reset 则直接把当前分支引用移到指定 commit，并按 --soft、--mixed、--hard 等模式决定是否同步 index 和工作区。它更适合修正尚未共享的本地历史或恢复层状态；
- 在公共分支 reset 后强推会让其他人的可达历史分叉。

**代码 / 场景：**

共享 main 用 revert 产生新节点；本地草稿分支则先建备份再 reset，体现两种不同历史策略。

~~~bash
# 已发布错误提交：保留历史并新增撤销提交
git switch main
git revert <bad-commit>
git log --oneline -2             # revert commit 在 bad 之后

# 仅本地错误提交：移动引用，保留文件供重做
git switch draft
git branch backup/draft
git reset --mixed HEAD~1
git status --short               # 原提交改动变成未暂存修改
~~~

选择依据不是“哪个命令更强”，而是历史是否已共享以及要保留哪些层。

**递进追问：**

1. **revert 一个 merge commit 为什么需要主父？**

   merge 有多个父，反向变化必须相对某个父计算；-m 指定要视为主线保留的一侧，错误选择会撤掉不该撤的内容。

2. **reset 后提交是否立刻消失？**

   只是当前分支不再指向它；提交可能仍被其他引用或 reflog 保留，可在对象清理前找回，但不能把 reflog 当长期备份。

**易错点：**

- revert 也可能产生冲突，因为当前代码不一定仍与目标提交之后的快照结构相同。
- 公共分支 reset 后的强推会改写协作者基线，必须先协调并使用受保护分支策略。

**参考来源：**

- [git revert 官方文档](https://git-scm.com/docs/git-revert)
- [git reset 官方文档](https://git-scm.com/docs/git-reset)
- [Pro Git：Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified)

校验日期：2026-07-20

## Q18：soft、mixed、hard reset 分别改变什么？

**短回答：**

soft 只移动 HEAD，mixed 还重置 index，hard 进一步覆盖工作区；hard 会丢弃未保存修改，使用前必须确认范围。

**原理：**

- 三种模式都先让当前分支（或 detached HEAD）指向目标 commit，区别在其他层。--soft 只移动引用，index 与工作区保持原样，所以原提交差异表现为已暂存；
- --mixed 是默认模式，引用移动后把 index 重置为目标 tree，但保留工作区文件，所以差异表现为未暂存；--hard 同时把引用、index 和受跟踪工作区路径重置到目标快照，会丢弃这些路径的未保存改动，并可能删除阻碍写入的未跟踪路径。
- reset 还可用于路径级重置 index，但路径形式不会移动 HEAD。执行 commit 级 hard 前应确认目标、工作区、未跟踪文件和子模块边界，并建立可恢复引用。

**代码 / 场景：**

在临时分支分别观察同一个最近提交被 soft、mixed 后的短状态；hard 只在已备份且确认后执行。

~~~bash
git branch backup/before-reset HEAD
git reset --soft HEAD~1
git status --short            # 原提交变化位于左列：已暂存
git reset --mixed backup/before-reset
git reset --mixed HEAD~1
git status --short            # 原提交变化位于右列：未暂存

# 确认备份引用和 diff 后才可：
git reset --hard backup/before-reset
git status --short            # 受跟踪三层与备份提交一致
~~~

示例用分支备份目标 OID，避免只依赖记忆中的 HEAD~n。

**递进追问：**

1. **如何撤销最近提交但保留为已暂存修改？**

   在确认尚未共享后使用 git reset --soft HEAD~1；分支回到父提交，index 与工作区仍保持原提交快照，可修改消息或重新组合。

2. **git reset path 与 commit 级 reset 有何区别？**

   路径级形式只把指定路径的 index 内容恢复到某个 tree，不移动当前分支或 HEAD；常用于取消暂存，不能用 --soft 解释。

**易错点：**

- --hard 的风险不仅是已暂存内容，受跟踪工作区未提交修改也会被目标快照覆盖。
- HEAD~1 依赖当前拓扑，合并提交有多个父；关键恢复操作应先 rev-parse 并记录准确 OID。

**参考来源：**

- [git reset 官方文档](https://git-scm.com/docs/git-reset)
- [Pro Git：Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified)
- [git restore 官方文档](https://git-scm.com/docs/git-restore)

校验日期：2026-07-20

## Q19：reflog 能恢复哪些误操作？

**短回答：**

它记录本地引用的移动，可找回误 reset、误 rebase 或删除分支前指向的提交；但有过期清理且不随 push 共享。

**原理：**

- reflog 在本地记录引用曾经指向的对象名及移动原因，例如 commit、reset、rebase、checkout、merge 和 branch 更新。
- 即使分支被 reset 到旧提交或 rebase 改写，原 tip 往往仍能从 HEAD@{时间}、branch@{序号} 对应记录找到，从而新建恢复分支；删除分支后也常可从 HEAD 或其他相关日志追到最近检出位置。
- reflog 不会随 push 传给远端，其他克隆各有自己的记录；条目还会按可达性和配置过期，对象随后可能被 git gc 清理。因此它是短期本地安全网，不是审计日志或备份。恢复前应先用 show 检查候选快照，再创建分支而非直接 hard reset。

**代码 / 场景：**

误 reset 后先只读定位旧 tip，再建立 recover 分支，整个过程不覆盖当前工作区。

~~~bash
git reset --hard HEAD~3          # 假设这是误操作
git reflog --date=iso --oneline
# 找到 reset 前记录，例如 HEAD@{1} -> <old-tip>
git show --stat HEAD@{1}
git branch recover/reset HEAD@{1}
git log --graph --oneline --all -8
# 确认 recover/reset 包含丢失提交后再决定 merge、cherry-pick 或切换
~~~

先建引用可阻止目标提交继续处于不可达状态，也保留多种后续恢复方案。

**递进追问：**

1. **远端能否帮你恢复本地 reflog？**

   远端没有你的本地 reflog；若旧提交曾推送并仍被远端引用，可 fetch 找回，否则只能依赖其他克隆、CI 缓存或备份中的对象。

2. **为什么 reflog 不是永久备份？**

   条目会按配置过期，未被引用的对象之后可被垃圾回收；磁盘损坏或删除仓库也会同时失去 reflog 与对象库。

**易错点：**

- 发现误操作后继续大量 reset 或 gc 会增加恢复难度，应先停止写操作并建立恢复引用。
- reflog 中同一序号会随新事件变化，长期记录应保存具体对象名而不是只写 HEAD@{1}。

**参考来源：**

- [git reflog 官方文档](https://git-scm.com/docs/git-reflog)
- [gitrevisions：reflog selectors](https://git-scm.com/docs/gitrevisions#_specifying_revisions)
- [git gc 官方文档](https://git-scm.com/docs/git-gc)

校验日期：2026-07-20

## Q20：什么是 squash，何时不该 squash？

**短回答：**

squash 把多个提交整理为较少提交；需要保留独立回滚点、审计轨迹或有意义的分阶段变更时不应盲目压缩。

**原理：**

- squash 是把多个逻辑提交整理为更少的新提交。交互式 rebase 中把后续提交标为 squash 或 fixup，会重放并合并 tree 变化、重写消息，产生新 OID；
- git merge --squash 则把另一分支相对当前分支的综合结果放入 index 和工作区，但不创建 merge commit，也不记录第二父，需要随后自行 commit。适合合并临时修正、噪声提交，让一个提交对应一个可审查与可回滚变更。
- 不应盲目 squash 彼此可独立验证或回滚的步骤、签名与审计要求明确的提交、需要 git bisect 定位的阶段，或已经共享且会迫使协作者重写历史的提交。

**代码 / 场景：**

交互式 rebase 把两个 fixup 合入功能提交；执行前先确认这三步确实构成一个原子变更。

~~~text
git rebase -i HEAD~3

pick  a1b2c3 add parser
fixup d4e5f6 fix parser typo
squash 789abc add parser edge test

# 保存后 Git 创建一个新提交；运行测试并检查：
git log --oneline -3
git show --stat HEAD
~~~

若 parser、迁移和清理可独立回滚，应拆成语义完整提交而不是只追求数量少。

**递进追问：**

1. **merge --squash 与普通 merge 有何拓扑差异？**

   普通非快进 merge 创建双亲 commit，记录分支已合并；--squash 只暂存综合内容，后续单亲 commit 不保存第二父关系。

2. **什么时候多个提交应保留？**

   当每个提交能独立构建测试、代表不同风险或可单独回滚，保留边界能帮助评审、bisect、cherry-pick 与事故恢复。

**易错点：**

- squash 会创建新提交身份，已有评审链接、签名和基于旧 OID 的自动化可能失效。
- 把不相关变更压成一个大提交会降低可审查性和回滚精度，反而不是“干净历史”。

**参考来源：**

- [git rebase：Interactive mode](https://git-scm.com/docs/git-rebase#_interactive_mode)
- [git merge --squash 官方文档](https://git-scm.com/docs/git-merge)
- [Pro Git：Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)

校验日期：2026-07-20

# 远程协作与发布

## Q21：fetch、pull 和 push 的边界是什么？

**短回答：**

fetch 更新远程跟踪引用但不整合，pull 等于 fetch 后 merge 或 rebase，push 请求更新远端引用并发送缺失对象。

**原理：**

- git fetch 与远端协商并下载本地缺少的对象，然后按 refspec 更新 origin/main 等远程跟踪引用；它通常不移动当前本地分支，也不改工作区，因而适合先观察。
- git pull 是组合命令：先 fetch，再把所跟踪远端分支整合进当前分支，整合策略可为 merge、rebase 或仅 fast-forward，若未显式配置就容易产生意外历史。git push 方向相反，向远端发送缺少对象并请求把远端引用从旧 OID 更新到新 OID；
- 服务器会检查快进、权限、hook 和保护规则。三者都操作对象和引用，不能把 pull 说成下载文件、push 说成上传工作区。

**代码 / 场景：**

先 fetch 再显式审查和 ff-only 合并，把网络同步与本地历史决策拆开。

~~~bash
git fetch origin
git log --oneline --left-right main...origin/main
git diff main..origin/main
git switch main
git merge --ff-only origin/main
# 本地提交并通过测试后：
git push origin main
~~~

若 left-right 显示双方都有独立提交，ff-only 会停止，团队再决定 merge 或 rebase。

**递进追问：**

1. **git fetch 会修改当前工作区吗？**

   正常 fetch 只传输对象并更新配置允许的引用，不检出当前分支；但它会改变 origin/main 等比较基线，自动化仍应记录 fetch 前后 OID。

2. **如何避免 pull 隐式产生未知历史？**

   显式配置 pull.ff only、pull.rebase true 或 false，并在关键仓库采用 fetch 后手工整合，让分叉时由人作出清晰决策。

**易错点：**

- 工作区未提交修改会影响 pull 的整合安全，但 push 只发送已提交且可达对象，不会上传未提交文件。
- 把 origin/main 当成实时服务器状态会误判，只有成功 fetch 等同步后它才反映新观察。

**参考来源：**

- [git fetch 官方文档](https://git-scm.com/docs/git-fetch)
- [git pull 官方文档](https://git-scm.com/docs/git-pull)
- [git push 官方文档](https://git-scm.com/docs/git-push)

校验日期：2026-07-20

## Q22：origin/main 是什么？

**短回答：**

它是本地保存的远程跟踪引用，表示最近一次 fetch 后远端 main 的位置，不会在离线时自动变化。

**原理：**

- origin 是本地 remote 配置的惯用名称，包含 URL 与 fetch refspec；
- origin/main 是 refs/remotes/origin/main 的简写，是本地保存的远程跟踪引用，记录最近一次相关 fetch 或其他同步操作后所知的远端 main 位置。它不是网络连接、不是服务器上的分支对象，也不会在离线时自行变化。
- 远端真正的 main 常写作 refs/heads/main，fetch 按 refspec把它映射到本地 refs/remotes/origin/main。你通常不直接在远程跟踪引用上开发，而是让本地 main 设置 upstream，然后比较、merge 或 rebase。
- 删除远端分支后，本地旧引用还可能保留，需 fetch --prune 才清理。

**代码 / 场景：**

以下命令查看 remote 配置、远程跟踪引用的完整名字和本地 main 的 upstream 关系。

~~~bash
git remote -v
git config --get-all remote.origin.fetch
git rev-parse refs/remotes/origin/main
git for-each-ref refs/remotes/origin --format="%(refname) %(objectname:short)"
git branch -vv                       # 查看 main 跟踪 origin/main
git fetch origin --prune
git log --left-right main...origin/main --oneline
~~~

fetch 前后记录 OID，才能准确说明本地对远端状态的观察何时更新。

**递进追问：**

1. **origin 一定指向最初克隆的服务器吗？**

   不一定。origin 只是可修改的本地 remote 名称，可更换 URL、删除或重命名；语义由 .git/config 中的 remote 配置决定。

2. **为什么不能直接 commit 到 origin/main？**

   检出远程跟踪引用通常进入 detached HEAD，它由 fetch 管理；应在本地分支提交，再通过 push 请求更新远端 refs/heads/main。

**易错点：**

- origin/main 可能陈旧，讨论远端是否领先前应先明确最近一次 fetch 的时间和结果。
- 远端删除分支不会保证本地引用立刻消失，缺少 prune 会留下误导性的旧远程跟踪引用。

**参考来源：**

- [Git Glossary：remote-tracking branch](https://git-scm.com/docs/gitglossary)
- [git remote 官方文档](https://git-scm.com/docs/git-remote)
- [git fetch：Configured Remote-tracking Branches](https://git-scm.com/docs/git-fetch)

校验日期：2026-07-20

## Q23：non-fast-forward push 为什么被拒绝？

**短回答：**

远端引用若不能只前移到本地提交，普通 push 会覆盖别人可达的历史，因此服务器默认拒绝。

**原理：**

- non-fast-forward push 会被拒绝，是因为直接移动远端分支会让旧 tip 独有的提交失去该分支的可达名称，等于可能覆盖同事已经推送的历史。接收端因此先检查旧 tip 是否是新 tip 的祖先：若是，引用只向前移动，所有旧提交仍可从新 tip 到达；
- 若不是就默认拒绝。它不是文件冲突检测，而是引用拓扑保护。正确处理通常是 fetch 最新远端，审查分叉后将远端变化 merge 或 rebase 到本地，再推送一个包含双方历史的新 tip。
- 只有团队明确需要改写远端历史时才使用带 lease 的强推，并仍受受保护分支、权限与服务端 hook 限制。

**代码 / 场景：**

先画出双方独有提交，再把远端 main 合入本地；新 tip 包含远端旧 tip 后，push 才成为快进。

~~~bash
git push origin main                 # rejected non-fast-forward
git fetch origin
git log --graph --oneline --left-right main...origin/main
# 选择团队策略之一：
git rebase origin/main               # 仅适合可改写的本地提交
# 或 git merge origin/main
npm test
git merge-base --is-ancestor origin/main main
git push origin main                 # 现在远端旧 tip 可达
~~~

不要用 force 把“尚未理解的分叉”快速消掉。

**递进追问：**

1. **为什么删除远端分支不遵循同样的快进检查？**

   删除是把远端 ref 更新为空值，属于显式移除引用的特殊操作；服务器仍可通过权限、保护规则和 receive hook 禁止删除。

2. **non-fast-forward 与代码冲突是一回事吗？**

   不是。它只说明提交图无法单纯前移，即使两边改不同文件也会拒绝；内容冲突要在后续 merge 或 rebase 的三方合并中判断。

**易错点：**

- 看到拒绝就强推会绕过保护目标，可能让同事提交失去远端分支可达性。
- 只执行 pull 而不明确 merge/rebase 策略可能生成意外历史，先 fetch 与审查分叉更安全。

**参考来源：**

- [git push：fast-forward updates](https://git-scm.com/docs/git-push#_description)
- [git receive-pack 官方文档](https://git-scm.com/docs/git-receive-pack)
- [git merge-base 官方文档](https://git-scm.com/docs/git-merge-base)

校验日期：2026-07-20

## Q24：force-with-lease 为什么比 force 安全？

**短回答：**

它只在远端引用仍等于本地预期值时强推，能避免无意覆盖他人在最近一次 fetch 后新增的提交。

**原理：**

- 普通 --force 表示即使远端引用不是本地新 tip 的祖先也直接请求覆盖；--force-with-lease 则为目标引用附加“租约”条件：只有服务器当前 OID 仍等于本地预期 OID 时才允许非快进更新。
- 默认预期值通常来自对应远程跟踪引用，这能检测从你最后观察后别人新增的提交并拒绝覆盖。更严格的形式 --force-with-lease=refs/heads/main:<expected> 可显式固定已审查 OID。
- 它仍不是绝对安全：后台 fetch 可能悄悄更新远程跟踪引用，错误 refspec 会作用到其他分支，而且租约只保护引用未变，不验证你改写后的内容质量。公共主分支仍应依赖保护规则。

**代码 / 场景：**

先 fetch 并记录已审查的远端 OID，rebase 后用显式 lease；若他人期间推送，服务器因 OID 不匹配而拒绝。

~~~bash
git fetch origin
expected=$(git rev-parse origin/topic)
git log --oneline origin/topic..topic
git rebase -i origin/main
npm test
git push origin \
  --force-with-lease=refs/heads/topic:$expected \
  topic:refs/heads/topic
# 若远端 topic 已变化：stale info，push 被拒绝
~~~

失败后重新 fetch 与审查，不应立即改用 --force 绕过租约。

**递进追问：**

1. **默认 lease 为什么会受后台 fetch 影响？**

   默认预期常取 origin/topic；IDE 后台 fetch 可在你未审查时推进它，使租约接受这个新 OID，降低“最后亲自观察点”的保护。

2. **force-with-lease 能否保证不会丢数据？**

   它只保证目标 ref 与预期一致；预期若错误、推错分支或改写内容遗漏提交仍会造成问题，还需备份引用、评审和分支保护。

**易错点：**

- lease 不是允许在 main 上随意改写历史的许可证，组织策略应继续限制受保护分支强推。
- 省略目标 refspec 时可能影响多个匹配分支，危险操作应显式写完整源与目标引用。

**参考来源：**

- [git push：--force-with-lease](https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegtltexpectgt)
- [git push：Safety](https://git-scm.com/docs/git-push#_note_about_fast_forwards)
- [GitHub：About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

校验日期：2026-07-20

## Q25：如何设计 feature branch 与主干协作？

**短回答：**

分支应短生命周期、频繁同步主干、通过 PR 和自动检查合并；功能开关用于把部署与功能发布解耦。

**原理：**

- feature branch 应从已验证的主干提交创建，保持单一目标、短生命周期和可独立评审；开发期间通过 fetch 后 rebase 本地未共享提交或 merge 主干，尽早暴露集成问题。
- 推送后用 PR 绑定需求、设计说明和风险，受保护主干要求自动测试、静态检查、必要评审与最新基线；合并策略由团队统一选择 merge、squash 或 rebase，避免每个人随意改图。大功能用 feature flag 把“代码合入/部署”与“用户启用”解耦，而不是维持数月分支。
- 数据库与 API 变更采用向前兼容步骤，使主干任意提交可构建、测试和安全部署，失败时有清晰 revert 单元。

**代码 / 场景：**

一个小功能从最新 main 开始，经提交、同步、测试和 PR 合并；分支删除不影响已合入历史。

~~~bash
git fetch origin
git switch -c feature/search origin/main
# 小步实现并让每个提交可测试
git add src/search.js test/search.test.js
git commit -m "feat(search): add prefix matching"
git fetch origin
git rebase origin/main             # 尚未共享或团队允许时
npm test
git push -u origin feature/search
# PR 检查通过后由平台按统一策略合并并删除远端分支
~~~

若已有人基于该 feature 分支开发，应改用协商后的 merge，避免无通知重写。

**递进追问：**

1. **为什么分支生命周期越短越好？**

   与主干的差异和并行假设更少，冲突与集成反馈更早；小 PR 也更容易审查、回滚和定位失败检查。

2. **未完成功能如何安全合入主干？**

   把代码放在默认关闭的功能开关后，确保关闭路径稳定并测试两种状态；同时设置开关所有者、清理日期与监控。

**易错点：**

- 长期 feature 分支会把集成风险推迟到最后，频繁“同步主干”不能完全替代持续集成。
- 功能开关若没有删除计划会形成永久分支逻辑，增加测试组合和维护成本。

**参考来源：**

- [Pro Git：Distributed Workflows](https://git-scm.com/book/en/v2/Distributed-Git-Distributed-Workflows)
- [GitHub：Understanding GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [GitHub：About pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)

校验日期：2026-07-20

## Q26：Git Flow、GitHub Flow 和 trunk-based 如何选择？

**短回答：**

多版本发布可用更重的发布分支；持续部署偏向短分支或主干开发。选择依据是并行维护版本数、发布节奏、合规审批、测试时长和回滚能力，而不是简单按团队规模贴标签。

**原理：**

- 选择依据是发布与治理约束，不是团队规模标签。Git Flow 以 main、develop、release、hotfix 和 feature 多类长期/阶段分支协调多个待发布版本，适合确有并行维护与计划发布窗口的产品，但合并路径和版本回灌成本高。
- GitHub Flow 以可部署主干和短分支 PR 为中心，适合持续交付且变更可经开关隐藏。trunk-based 更强调开发者频繁集成主干，分支极短甚至直接小批提交，并依赖强 CI、功能开关和向前兼容变更。
- 先明确同时维护版本数、部署频率、合规审批、测试时长和回滚能力，再选择最少但足够的分支状态；流程可组合，不必机械照搬品牌。

**代码 / 场景：**

可用约束表做决策，而不是只问“哪个更流行”。

| 约束 | 更可能的选择 | 必备能力 |
| --- | --- | --- |
| 每日多次部署、单一线上版本 | GitHub Flow / trunk-based | 快速 CI、功能开关、自动回滚 |
| 同时维护 2.x、3.x 且定期发版 | release 分支或简化 Git Flow | 修复回灌、版本矩阵测试 |
| 严格人工发布审批 | 受保护发布分支/标签 | 审计、签名、制品晋级 |

无论选择哪种，都应让主干提交可构建，并用度量观察 PR 周期、失败率和回滚时间。

**递进追问：**

1. **trunk-based 是否意味着所有人直接推 main？**

   不一定。关键是频繁集成和极短分支；团队仍可用小 PR、队列合并与受保护主干，只要反馈足够快且不形成长期分叉。

2. **多版本维护一定要完整 Git Flow 吗？**

   不一定。可只保留 main 与少量 release/x.y 分支，修复通过 cherry-pick 或 merge 回灌；分支类型应由真实版本矩阵驱动。

**易错点：**

- 照搬 Git Flow 全套分支而没有并行版本需求，会增加无价值合并、冻结期和回灌遗漏。
- 采用 trunk-based 却缺少快速可靠测试与功能开关，只会把未隔离风险直接推向主干。

**参考来源：**

- [Pro Git：Git Branching Workflows](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows)
- [GitHub：Understanding GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)

校验日期：2026-07-20

## Q27：如何处理线上 hotfix？

**短回答：**

从线上实际版本创建修复分支，最小改动并回归，发布后把修复合并或挑选回所有仍维护的分支，避免分叉遗漏。

**原理：**

- 先确定线上实际运行的不可变 commit、tag、制品摘要与配置，不要默认等于最新 main；从该生产基线创建 hotfix 分支，只做修复根因所需的最小变更，并添加能复现事故的回归测试。
- 通过缩短但不跳过的评审、CI、安全扫描和预发布验证后，从明确 OID 构建并发布，监控关键指标与回滚条件。发布成功后，要把修复传播到所有仍维护且同样受影响的分支：可 merge hotfix 或按依赖顺序 cherry-pick，并处理代码已经演进的差异。
- 最后记录事故、撤销临时开关并验证分支不再分叉；紧急不等于直接在服务器改文件。

**代码 / 场景：**

从生产 tag 而非 main 建分支，发布新补丁 tag 后再将同一修复带回 main。

~~~bash
git fetch origin --tags
git switch -c hotfix/auth-timeout v2.4.3
# 修改并新增回归测试
git add src/auth.js test/auth-timeout.test.js
git commit -m "fix(auth): bound token refresh timeout"
npm test
git tag -s v2.4.4 -m "hotfix auth timeout"
git push origin hotfix/auth-timeout v2.4.4
# 发布验证后：
git switch main && git pull --ff-only
git cherry-pick -x <hotfix-commit>
~~~

若 main 已包含不同认证重构，应重新审查补丁语义，而不是只要求 cherry-pick 无冲突。

**递进追问：**

1. **生产版本落后 main 时为什么不能直接从 main 修？**

   main 可能含尚未发布的功能、迁移或不兼容配置，从它构建会把额外变化带入紧急发布；应以生产可验证 OID 为基线。

2. **hotfix 发布后为什么还要回灌？**

   不回灌会让后续主线或其他维护版本重新引入缺陷；每个受影响分支都应显式接收修复并通过自己的版本矩阵测试。

**易错点：**

- 直接登录服务器改文件会产生不可追踪状态，下一次部署可能覆盖修复且无法复现制品。
- 只修 release 分支而遗漏 main，会在未来版本再次出现同一事故。

**参考来源：**

- [Pro Git：Maintaining a Project](https://git-scm.com/book/en/v2/Distributed-Git-Maintaining-a-Project)
- [git switch 官方文档](https://git-scm.com/docs/git-switch)
- [git cherry-pick 官方文档](https://git-scm.com/docs/git-cherry-pick)

校验日期：2026-07-20

## Q28：语义化版本与 Git tag 如何配合？

**短回答：**

通过受保护 tag 标记已构建的不可变提交，流水线从 tag 产出制品；版本号表达不兼容、功能和修复级别。

**原理：**

- 语义化版本用 MAJOR.MINOR.PATCH 表达公共 API 兼容承诺：不兼容变更升主版本，向后兼容功能升次版本，向后兼容修复升补丁，并定义预发布与构建元数据排序。Git tag 则把版本名解析到确切 Git 对象；
- 正式发布宜用附注或签名 tag 保存 tagger、说明与签名，并由保护规则禁止移动和删除。流水线应从 tag 解引用的不可变 commit 构建一次，记录 commit OID、依赖锁、构建环境与制品摘要，再将同一制品晋级，而不是各环境重新构建。
- 版本号不自动保证兼容性，仍需 API diff、迁移说明和测试；移动同名 tag 会破坏制品可追溯性，应发布新补丁版本。

**代码 / 场景：**

在已验证 commit 上创建签名附注 tag，校验后推送；流水线同时记录 tag 与精确 OID。

~~~bash
git switch main
git pull --ff-only
npm test
git tag -s v2.3.1 -m "release 2.3.1: fix retry boundary"
git verify-tag v2.3.1
git rev-parse v2.3.1^{}             # 记录 release commit OID
git push origin v2.3.1
# CI 从 refs/tags/v2.3.1 构建，并保存制品 SHA-256 与来源 OID
~~~

若发布内容错误，应修复后创建 v2.3.2，不要悄悄把 v2.3.1 移到新提交。

**递进追问：**

1. **预发布版本如何排序？**

   SemVer 在补丁号后使用连字符标识符，如 2.0.0-rc.1；同一主次补丁下预发布优先级低于正式版本，标识符按规范比较。

2. **为什么 tag 签名不等于制品可信？**

   签名证明 tag 对象由相应密钥签署，但构建系统仍可能被篡改；还需记录可验证构建来源、依赖与制品摘要并保护密钥。

**易错点：**

- 轻量 tag 缺少独立 tagger、消息与签名对象，正式发布审计通常应采用附注或签名 tag。
- SemVer 依赖明确的公共 API 定义，随意升版本号但不维护兼容契约没有实际保证。

**参考来源：**

- [Semantic Versioning 2.0.0](https://semver.org/)
- [git tag 官方文档](https://git-scm.com/docs/git-tag)
- [git verify-tag 官方文档](https://git-scm.com/docs/git-verify-tag)

校验日期：2026-07-20

## Q29：submodule 和 monorepo 的权衡是什么？

**短回答：**

submodule 保持仓库与版本边界但协作复杂；monorepo 统一变更和工具链但需要权限、构建缓存与依赖边界治理。

**原理：**

- submodule 在父仓库 tree 中以 mode 160000 的 gitlink 记录子仓库某个 commit OID，并用 .gitmodules 保存 URL 等映射；
- 父提交固定依赖版本，但不包含子仓库对象，克隆后需 init/update，权限、分支推进和递归 CI 都要额外治理。它适合真正独立发布、权限和历史边界明确的组件。
- monorepo 把多个项目放在同一对象图和引用历史中，可用一个 commit 原子修改跨项目接口、统一工具链与评审，但仓库规模、路径权限、依赖边界、受影响测试和构建缓存需要专门基础设施。
- 选择应由发布自治、跨项目变更频率、访问控制和构建成本决定，不应把二者当作简单的“多仓/单仓文件布局”。

**代码 / 场景：**

submodule 更新在父仓库中表现为 gitlink OID 变化；协作者必须显式取得对应子仓库对象。

~~~bash
git submodule add https://example.com/lib.git libs/lib
git commit -m "build: pin lib submodule"
git ls-tree HEAD libs/lib          # 160000 commit <child-oid>

cd libs/lib && git switch main && git pull --ff-only
cd ../..
git add libs/lib
git diff --cached --submodule      # 旧 child OID -> 新 child OID
git commit -m "build: update lib pin"

# 新克隆需：git submodule update --init --recursive
~~~

父仓库只固定 OID，不保证子仓库 URL 权限和该 OID 永久可获取。

**递进追问：**

1. **submodule 为什么常出现“本机能构建、CI 失败”？**

   本机可能已有子仓库对象或凭据，CI 新克隆若未递归初始化、无访问权限或远端已丢目标 OID，就无法检出父仓库固定版本。

2. **monorepo 如何避免每次构建全部项目？**

   维护显式依赖图，依据变更路径计算受影响目标，并结合内容寻址远程缓存；边界检查要防止代码绕过声明依赖。

**易错点：**

- 把 submodule 当普通目录提交不会包含子仓库文件，父仓库存的是 gitlink 提交指针。
- monorepo 统一存储不等于天然模块化，没有所有权和依赖规则会演变成高耦合大仓库。

**参考来源：**

- [git submodule 官方文档](https://git-scm.com/docs/git-submodule)
- [Pro Git：Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [Google Software Engineering：Dependency Management](https://abseil.io/resources/swe-book/html/ch21.html)

校验日期：2026-07-20

## Q30：git worktree 解决什么问题？

**短回答：**

同一仓库可同时拥有多个工作树，各有 HEAD 和 index，适合并行热修复或评审分支而无需反复 stash 和切换。

**原理：**

- git worktree 允许一个仓库对象库同时关联多个工作树，每个工作树拥有独立的工作目录、HEAD 与 index，因此可在不反复 stash、切分支或重新克隆对象的情况下并行处理主线、hotfix 和评审。
- 主工作树的 .git 是目录，附加工作树的 .git 是指向公共管理目录的文件；对象、绝大多数 refs 和配置仍共享，所以任一工作树 fetch 后其他工作树也能看到新对象与引用。为防止两个 index 对同一分支产生竞争，Git 通常禁止同一分支同时检出到多个工作树。
- 删除目录应使用 git worktree remove，异常删除后用 prune 清理元数据；每个工作树仍需独立安装依赖和管理未跟踪产物。

**代码 / 场景：**

从生产 tag 建 hotfix 工作树，同时保留当前 feature 工作区完全不动。

~~~bash
git worktree list
git worktree add -b hotfix/2.4 ../project-hotfix v2.4.3
cd ../project-hotfix
git status --short --branch        # hotfix/2.4，独立 index/HEAD
# 修复、测试并提交
cd ../project
git log --all --oneline -5        # 共享对象与 refs，可见 hotfix 提交
git worktree remove ../project-hotfix
git worktree prune
~~~

不要直接复制现有工作区目录，worktree 会正确登记共享仓库关系和独立管理状态。

**递进追问：**

1. **为什么同一分支通常不能在两个 worktree 检出？**

   两个独立 index 和工作区都可能基于同一分支提交并移动同一 ref，Git 用占用检查避免一侧更新让另一侧状态突然失配。

2. **worktree 与重新 clone 有什么区别？**

   worktree 共享对象库和多数 refs，创建快且节省磁盘；clone 是独立仓库，有自己的对象、引用和远端状态，隔离更强。

**易错点：**

- 附加 worktree 目录含未提交内容时强行删除仍会丢数据，应先逐个检查 status 和未跟踪文件。
- 共享 refs 意味着在一个 worktree 执行 fetch、branch 删除等操作会影响其他 worktree 的仓库视图。

**参考来源：**

- [git worktree 官方文档](https://git-scm.com/docs/git-worktree)
- [Git repository layout：worktrees](https://git-scm.com/docs/gitrepository-layout)
- [Git Glossary：worktree](https://git-scm.com/docs/gitglossary)

校验日期：2026-07-20

# 排障与工程质量

## Q31：git bisect 如何定位回归提交？

**短回答：**

给定一个 good 与 bad，Git 二分检出中间提交；每轮运行测试并标记，最终把搜索缩小到首个坏提交。

**原理：**

- git bisect 在提交图上维护一个已知 bad 与一个或多个已知 good 边界，选择大致能把候选集二分的中间提交并检出。你在该快照运行能够稳定判定回归的测试，以 git bisect good、bad 或 skip 标记结果；
- Git据此缩小“good 可达之后、bad 可达之前”的候选，最终报告首个 bad commit。它搜索的是提交拓扑，不只是按时间戳对半。git bisect run 可自动执行脚本：退出码 0 表示 good，1–127（125 除外）表示 bad，125 表示无法测试而跳过。
- 前提是性质近似单调且测试可复现；环境漂移和间歇失败会误导定位。

**代码 / 场景：**

从当前失败版本与已知正常 tag 开始，自动运行单个回归测试，结束后 reset 回原分支。

~~~bash
git bisect start
git bisect bad HEAD
git bisect good v2.3.0
git bisect run npm test -- --runInBand auth-timeout.test.js
# 输出类似：<oid> is the first bad commit
git show --stat <oid>
git bisect log                  # 保存每轮判定供复核
git bisect reset                # 回到开始前检出位置
~~~

自动测试必须在旧提交也能安装和运行，否则应对不可测版本返回 125。

**递进追问：**

1. **测试脚本偶发失败会怎样？**

   错误的 good/bad 标记会把真正回归排除在候选外；应先稳定环境、重复关键测试或人工核验，再用 bisect log 检查判定。

2. **为什么某些提交需要标记 skip？**

   中间版本可能无法构建或缺少测试基础，无法可靠判定性质；skip 保留可能性并选择其他提交，但过多 skip 会使结果变成候选范围。

**易错点：**

- 不要用依赖当前线上服务的非确定测试直接 bisect，外部状态变化会破坏 good/bad 单调假设。
- 结束后忘记 git bisect reset 会继续停在 detached 检出状态，后续提交容易失去分支保护。

**参考来源：**

- [git bisect 官方文档](https://git-scm.com/docs/git-bisect)
- [git bisect run 官方说明](https://git-scm.com/docs/git-bisect#_bisect_run)
- [Pro Git：Debugging with Git](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git)

校验日期：2026-07-20

## Q32：git blame 应该如何正确使用？

**短回答：**

它用于找到某行最近一次修改，辅助理解上下文；应结合 log、PR 和业务历史，不应当作责任追究工具。

**原理：**

- git blame 为文件当前所选行寻找最近一次改变该行内容的 commit，并显示提交、作者和行号；它回答“这行最后由哪个快照引入”，不等同于最初设计者、缺陷责任人或当前维护者。
- 格式化、移动和复制会改变表面归属，可用 -w 忽略空白，-M 检测同文件移动，-C 尝试跨文件复制，但这些仍是相似性启发式。正确流程是从 blame 得到候选 commit，再用 git show、log -L、PR、issue 与周边提交理解当时约束，并与代码所有者沟通。
- 对人使用 blame 做追责会压制协作；对技术使用则是进入历史上下文的一把索引。

**代码 / 场景：**

只调查函数范围，并忽略空白改动；拿到 OID 后继续阅读完整补丁和前后历史。

~~~bash
git blame -w -L 40,85 -- src/cache.js
# 假设目标行显示 <oid>
git show --find-renames --find-copies <oid> -- src/cache.js
git log -L :loadCache:src/cache.js
git log --follow -- src/cache.js
# 再打开关联 PR/issue，核对约束与后续修复
~~~

若一次格式化提交占满结果，应通过 ignore-revs 或追溯父提交，而不是把格式化作者当设计者。

**递进追问：**

1. **如何降低大规模格式化对 blame 的干扰？**

   可维护 .git-blame-ignore-revs 并配置 blame.ignoreRevsFile，或临时使用 --ignore-rev；团队应审查忽略清单并保留原提交。

2. **log -L 与 blame 如何互补？**

   blame 给当前每行最近归属，log -L 跟踪指定行区间或函数随提交演进，更适合理解一段逻辑为何逐步形成。

**易错点：**

- 作者字段只反映提交记录，不能独立证明实际决策者或责任归属，可能还有结对与代提交。
- 开启 -C 等复制检测会增加启发式成本，结果仍需结合完整补丁和业务历史验证。

**参考来源：**

- [git blame 官方文档](https://git-scm.com/docs/git-blame)
- [git log：Line Log](https://git-scm.com/docs/git-log#Documentation/git-log.txt--Lltstartgtltendgtltfilegt)
- [Pro Git：File Annotation](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git#_file_annotation)

校验日期：2026-07-20

## Q33：如何从错误提交中只恢复一个文件？

**短回答：**

先用 git restore --source=<commit> -- path 把目标版本写入工作区或 index，检查 diff 后作为新修复提交保存。

**原理：**

- 先确定“正确版本”对应的 commit 与路径，再用 git restore --source=<good> --worktree -- path 把该 blob 写到工作区；
- 若希望同时进入下一次提交，可加 --staged --worktree，或先只恢复工作区、审查后 git add。该操作不会移动当前分支，也不会删除错误 commit，而是在当前历史上形成一项普通文件修改，适合共享分支通过新修复提交纠正。
- 默认 source 对 staged 与 worktree 组合有不同规则，所以关键操作应显式写 source 和目标层。路径必须置于 -- 之后避免与 revision 歧义；若文件曾重命名，要先用 log --follow 或 diff-tree 找到旧路径。
- 恢复后审查 diff、运行相关测试并提交。

**代码 / 场景：**

错误 commit 改坏 config.yml；从它的父提交取回该文件，只写工作区，确认后再暂存为新修复。

~~~bash
bad=$(git rev-parse <bad-commit>)
git show --stat $bad
git diff $bad^ $bad -- config.yml
git restore --source=$bad^ --worktree -- config.yml
git diff -- config.yml
./scripts/validate-config.sh config.yml
git add config.yml
git diff --cached -- config.yml
git commit -m "fix(config): restore pre-regression settings"
~~~

若想保留错误提交中其他文件，不能直接 revert 整个提交而不审查反向补丁范围。

**递进追问：**

1. **如何让正确版本同时写入 index 和工作区？**

   使用 git restore --source=<good> --staged --worktree -- path；仍应在提交前查看 --cached diff，确认 source 与路径正确。

2. **文件在历史中重命名了怎么办？**

   先用 git log --follow -- current-path 或 git diff-tree -M 找到旧路径和目标 commit，再用 commit:old-path 导出或 restore 对应路径后重命名。

**易错点：**

- git restore 默认 source 与目标层会随选项变化，恢复事故中应显式写 --source、--worktree 和 --staged。
- 只运行命令不提交会让修复停留在本地层，必须按团队流程测试、暂存并创建可审计新提交。

**参考来源：**

- [git restore 官方文档](https://git-scm.com/docs/git-restore)
- [git diff 官方文档](https://git-scm.com/docs/git-diff)
- [git log --follow 官方文档](https://git-scm.com/docs/git-log)

校验日期：2026-07-20

## Q34：大文件为什么会拖慢 Git？

**短回答：**

每个历史版本都进入对象库，克隆和对象遍历成本持续累积；应使用 Git LFS、制品仓库或对象存储管理二进制资产。

**原理：**

- Git 会把每个已提交版本作为对象长期保留；大型二进制文件若频繁变化，即使 packfile 尝试 delta 压缩，也可能产生大量难压缩对象。
- 普通 clone 和 fetch 需要传输当前可达历史所需对象，checkout、repack、gc、对象遍历和托管平台备份都会承担网络、磁盘、CPU 与内存成本。删除当前分支中的文件只产生“该路径不存在”的新快照，旧 blob 仍在历史。
- Git LFS 把小型指针文件提交到 Git，对应大内容存入 LFS 对象服务，检出时由客户端按 OID 获取；它需要服务器、配额、凭据和 CI 客户端支持。制品、日志和生成包通常更适合制品库或对象存储，而非版本历史。

**代码 / 场景：**

新项目先声明 LFS 规则再提交文件；已有历史迁移必须单独协调，因为会重写相关提交 OID。

~~~bash
git lfs install
git lfs track "*.psd"
git add .gitattributes
git add design/home.psd
git commit -m "design: add source through Git LFS"
git lfs ls-files
git show HEAD:design/home.psd      # 显示 LFS pointer，而非二进制主体

# 既有历史评估：git lfs migrate info --everything
# 真正 migrate import 会改写历史，需备份、停写和全员重新同步
~~~

LFS 减少 Git 对象体积，但大文件下载、存储和保留策略仍要治理。

**递进追问：**

1. **把大文件从最新提交删除能缩小 clone 吗？**

   通常不能，旧版本 blob 仍从历史提交可达；需评估历史重写并让所有引用、fork 和克隆同步，或接受历史成本。

2. **哪些文件不该放 Git LFS？**

   可由源码稳定重建的构建产物、短期日志和部署制品更适合制品库；LFS 适合必须版本化且体积大的源资产。

**易错点：**

- 新增 .gitattributes 只影响之后按规则加入的内容，不会自动迁移既有 Git 历史中的大 blob。
- LFS pointer 已提交不代表远端主体已上传，CI 和发布前应验证 LFS 对象可获取与配额状态。

**参考来源：**

- [Git LFS 官方站点](https://git-lfs.com/)
- [GitHub：About Git Large File Storage](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)
- [git gc 官方文档](https://git-scm.com/docs/git-gc)

校验日期：2026-07-20

## Q35：什么是 shallow clone 和 partial clone？

**短回答：**

shallow clone 截断提交历史，partial clone 延迟获取部分对象；能降低 CI 初始成本，但某些历史分析命令受限。

**原理：**

- shallow clone 用 --depth、--shallow-since 等方式只取得有限提交历史，并在 .git/shallow 标记边界提交为临时根；
- 它减少初始传输，但 merge-base、blame、bisect、日志、推送和版本计算可能因缺少祖先而受限，可用 fetch --deepen 或 --unshallow 补齐。
- partial clone 则通过 --filter 与 promisor remote 协议取得完整或较完整的提交/tree 图，同时故意缺少可延迟获取的对象，例如 blob:none 在首次访问文件内容时再按需 fetch。
- 两者可组合但解决不同维度：shallow 截断历史图，partial 保留图而延迟对象内容。sparse-checkout 又是工作区路径选择，不能与对象传输策略混为一谈。

**代码 / 场景：**

两个克隆分别观察提交边界与按需 blob；实际服务器必须支持 partial clone 过滤协议。

~~~bash
git clone --depth=20 https://example.com/repo.git shallow-repo
cd shallow-repo
git rev-parse --is-shallow-repository   # true
git fetch --deepen=50

cd ..
git clone --filter=blob:none --no-checkout \
  https://example.com/repo.git partial-repo
cd partial-repo
git config --get remote.origin.promisor # true
git checkout main                       # 需要的 blob 可按需获取
~~~

离线任务若稍后需要缺失 blob，partial clone 会失败；应提前预取所需对象。

**递进追问：**

1. **为什么 shallow clone 可能算错版本号？**

   基于最近 tag 或提交数量的脚本可能看不到边界之外的 tag 与祖先，得到不同结果；发布构建应明确拉取所需历史。

2. **partial clone 与 sparse-checkout 如何配合？**

   partial clone 减少传输的对象内容，sparse-checkout 减少写入工作区的路径；组合可优化大仓库，但访问新路径时仍可能联网取 blob。

**易错点：**

- CI 使用 depth=1 后直接执行 blame、bisect 或 changelog 生成，结果可能不完整甚至失败。
- partial clone 的延迟获取依赖 promisor remote 可用性，不能假设首次 clone 后所有内容都可离线读取。

**参考来源：**

- [git clone 官方文档](https://git-scm.com/docs/git-clone)
- [Git partial clone design](https://git-scm.com/docs/partial-clone)
- [git fetch：Shallow options](https://git-scm.com/docs/git-fetch)

校验日期：2026-07-20

## Q36：Git hooks 能做什么，为什么不能只依赖本地 hook？

**短回答：**

hook 可在提交或接收阶段执行校验；本地 hook 容易被跳过且分发不一致，关键规则还应在 CI 或服务端执行。

**原理：**

- 不能只依赖本地 Git hook，因为 `.git/hooks` 不会随普通 clone 自动分发，开发者机器的环境和权限也不同，部分 hook 还可用 `--no-verify` 跳过；它只能提供快速反馈，不能充当团队唯一门禁。
- Git hooks 是在特定客户端或服务端事件前后执行的程序：客户端 pre-commit 可检查暂存内容，commit-msg 校验消息，pre-push 在发送前测试；
- 服务端 pre-receive、update 可在引用更新前统一拒绝违规 push，post-receive 可触发异步流程。
- 可把脚本放进仓库并通过 core.hooksPath 或安装命令分发，但真正关键的测试、权限、签名和分支策略仍要在 CI 或服务端重复验证，保证无法由单台电脑绕过。

**代码 / 场景：**

把轻量检查脚本版本化并配置 hooksPath，同时在 CI 再运行同一命令作为权威门禁。

~~~bash
mkdir -p .githooks
cat > .githooks/pre-commit <<SCRIPT
#!/bin/sh
npm run lint && npm test -- --runInBand
SCRIPT
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
git add .githooks/pre-commit
git commit -m "build: version local hook checks"

# CI 配置仍必须执行 npm run lint && npm test
~~~

本地 hook 给秒级反馈；CI 以干净环境、固定版本和受保护分支提供一致裁决。

**递进追问：**

1. **哪些规则更适合服务端 hook？**

   引用权限、禁止非快进、签名与提交元数据等必须对所有 push 一致执行的规则适合 pre-receive/update，且需考虑托管平台支持。

2. **本地 hook 为什么仍有价值？**

   它能在提交或推送前快速发现格式、单测和秘密问题，缩短反馈周期；只要明确 CI 仍是权威门禁，本地优化很有价值。

**易错点：**

- hook 中放耗时且不稳定的全量任务会诱导开发者跳过，应分层安排快速本地检查和完整 CI。
- hook 脚本若依赖机器全局工具版本，会产生“我这里通过”，应固定运行时并给出安装自检。

**参考来源：**

- [githooks 官方文档](https://git-scm.com/docs/githooks)
- [git config：core.hooksPath](https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath)
- [GitHub：About status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)

校验日期：2026-07-20

## Q37：CI 中如何保证构建可复现？

**短回答：**

固定依赖锁、运行时与构建参数，从明确提交构建并保存校验和；不要让流水线隐式依赖开发机或浮动版本。

**原理：**

- 可复现构建要求同一源提交与声明输入在受控环境中产生逐字节相同或至少可验证等价的制品。Git 提供精确 commit 和树快照，但还需锁定依赖及校验和、编译器/运行时/系统镜像版本、构建参数、区域与时区，并消除当前时间、随机顺序、绝对路径和未声明网络下载等非确定输入。
- CI 应从干净 checkout 构建，拒绝脏工作区，记录 commit OID、tag、依赖锁、镜像 digest、命令与制品摘要，最好生成可验证 provenance；同一制品构建一次后在环境间晋级，而不是在测试和生产重复构建。缓存只能加速，命中与否不得改变结果。

**代码 / 场景：**

流水线验证干净提交、使用锁文件安装，构建后保存来源 OID 与制品摘要；第二次独立构建可比较哈希。

~~~bash
set -eu
test -z "$(git status --porcelain)"
SOURCE_COMMIT=$(git rev-parse HEAD)
npm ci                         # 严格使用 package-lock
export TZ=UTC LC_ALL=C
export SOURCE_DATE_EPOCH=$(git show -s --format=%ct HEAD)
npm run build
sha256sum dist/app.tar > dist/app.tar.sha256
printf "%s\n" "$SOURCE_COMMIT" > dist/source-commit.txt
# 在固定镜像 digest 的独立 job 重建并比较 SHA-256
~~~

若哈希不同，应定位时间戳、文件顺序或工具版本，而不是接受“功能看起来一样”。

**递进追问：**

1. **依赖锁文件为什么仍不够？**

   锁文件通常固定包图，但运行时、原生工具链、系统库、镜像基础层和下载源也会影响产物；还需固定环境并校验获取内容。

2. **CI 缓存如何避免污染可复现性？**

   缓存键应包含锁文件、工具链与平台信息，产物还要做校验；必须能在完全禁用缓存时得到相同结果，缓存不能成为隐式输入。

**易错点：**

- 仅给 Docker 镜像写 latest 标签不算固定环境，应记录不可变 digest 与构建器版本。
- 从 tag 构建但允许 tag 移动会破坏来源稳定性，发布应同时记录解引用后的 commit OID。

**参考来源：**

- [Reproducible Builds：定义](https://reproducible-builds.org/docs/definition/)
- [SLSA Build Track](https://slsa.dev/spec/v1.0/levels)
- [git rev-parse 官方文档](https://git-scm.com/docs/git-rev-parse)

校验日期：2026-07-20

## Q38：如何避免敏感信息进入 Git 历史？

**短回答：**

提交前用密钥扫描和环境变量；一旦泄露先吊销轮换，再用历史重写清理，并通知协作者重新同步。

**原理：**

- 预防层应把密钥放入受控秘密管理或环境注入，仓库只提交无秘密模板；.gitignore 阻止常见本地文件，提交前与 CI/服务端执行秘密扫描，并用最小权限、短寿命凭据降低暴露后果。
- 若秘密已提交，第一优先是立即吊销和轮换，因为即使历史稍后重写，克隆、fork、日志和缓存中的值仍可能可用；随后评估访问范围并通报。需要清理时可用 git filter-repo 按路径或替换规则重写所有相关引用，验证后协调强推、PR 关闭、分支保护临时变更及全员重新克隆。
- 删除最新文件或追加 .gitignore 都不会删除旧 blob，历史重写也不能代替凭据轮换。

**代码 / 场景：**

示例先描述事故处置顺序，再给出不包含真实秘密的历史清理骨架；执行前必须备份并停写。

~~~bash
# 1. 在凭据系统立即吊销并轮换；审计访问日志
# 2. 镜像备份仓库并暂停 push
git clone --mirror <repo-url> sanitized.git
cd sanitized.git
git filter-repo --path config/leaked.env --invert-paths
git log --all -- config/leaked.env     # 应无结果
git fsck --full
# 3. 经安全/仓库管理员批准后协调 force push 所有重写 refs
# 4. 通知所有协作者删除旧克隆并重新克隆
~~~

filter-repo 改写提交 OID，任何基于旧历史的分支都可能把秘密重新推回来。

**递进追问：**

1. **为什么先轮换而不是先清理 Git？**

   重写和传播需要时间且无法控制所有副本；轮换能立即使泄露值失效，直接降低攻击窗口，再进行历史与缓存清理。

2. **.gitignore 能防止已暂存秘密吗？**

   不能。已进入 index 的路径不受忽略规则影响，且旧提交仍保留内容；扫描应覆盖 staged diff 与完整历史，而非只看工作区。

**易错点：**

- 在修复提交中把秘密替换为星号，旧 commit 仍可直接读取原值，不能算完成清理。
- 历史重写后若有人从旧克隆普通 push 或 merge，可能重新引入被删除对象，必须协调重新同步。

**参考来源：**

- [GitHub：Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo 官方项目](https://github.com/newren/git-filter-repo)
- [GitHub：About secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)

校验日期：2026-07-20

## Q39：如何评审一个大型 PR？

**短回答：**

先核对目标和架构边界，再按提交或模块审查，运行测试并关注失败路径；大型改动应提前拆成可独立验证的小批次。

**原理：**

- 因为大型 PR 同时增加阅读上下文、遗漏边界和验证成本，所以评审不能从第一行漫无目的地读到最后一行，而要先缩小风险面并建立顺序。先验证问题、范围与架构决策，要求作者提供行为前后、风险、迁移和回滚说明；若多个独立目标混在一起，应优先拆分。
- 无法再拆时，按提交或模块阅读：先接口与数据模型，再核心路径，最后适配和测试；确认 diff 基线正确，关注删除、权限、并发、失败与兼容分支，而不只读快乐路径。先让自动检查处理格式、类型、测试和依赖，再由人判断设计与业务不变量。
- 可本地检出精确 head 运行关键场景，并把意见区分为阻塞、建议和提问；批准前核对最新 base 与检查结果，合并后安排监控与后续清理。

**代码 / 场景：**

用明确基线生成统计与目录 diff，再按风险路径运行测试；命令输出应与 PR 页面 head/base OID 一致。

~~~bash
git fetch origin pull/123/head:review/pr-123
git rev-parse review/pr-123 origin/main
git diff --stat origin/main...review/pr-123
git diff --name-status origin/main...review/pr-123
git log --reverse --oneline origin/main..review/pr-123
git switch --detach review/pr-123
npm ci && npm test
# 针对鉴权、迁移、重试和回滚路径补充手工验证
git diff --check origin/main...review/pr-123
~~~

三点 diff 使用 merge base，能聚焦该分支相对分叉点引入的变化。

**递进追问：**

1. **大型 PR 什么时候必须退回拆分？**

   当包含多个可独立发布目标、无法建立可靠测试边界，或评审者无法在合理时间理解风险时，应先拆出机械重构、接口和行为变更。

2. **为什么不能只相信 CI 绿灯？**

   CI 只覆盖已实现的规则与测试，无法证明需求、权限模型和未建模失败路径正确；人工评审负责意图与系统边界。

**易错点：**

- 在过时 base 上批准后直接合并，可能漏掉最新主干交互；应要求最新检查或使用合并队列。
- 把风格建议与安全阻塞混在同一语气会降低沟通效率，应明确严重度与可接受替代方案。

**参考来源：**

- [GitHub：Reviewing proposed changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests)
- [Google Engineering Practices：Code Review](https://google.github.io/eng-practices/review/)
- [git diff 官方文档](https://git-scm.com/docs/git-diff)

校验日期：2026-07-20

## Q40：如何制定提交信息规范？

**短回答：**

标题说明可观察的变更，正文解释原因、边界和迁移；关联任务与破坏性变更，便于生成日志、回滚和追踪决策。

**原理：**

- 规范应让人和工具从提交本身理解“发生了什么、为什么、影响与迁移是什么”。标题用稳定格式概括可观察变更，可采用 type(scope): description 以支持 changelog；正文解释问题背景、取舍、失败边界和未做事项，而不是重复 diff；
- 尾注关联 issue、共同作者、签名或 BREAKING CHANGE。提交本身还应原子、可构建测试，使消息与实际 tree 一一对应。
- 团队应明确语言、标题长度建议、允许类型、破坏性变更和 revert 格式，并在 commit-msg/CI 中只自动检查稳定规则，避免把主观文风变成难以维护的正则。版本发布由审查后的提交与 tag 驱动，不能只凭关键词自动推断兼容性。

**代码 / 场景：**

下面的消息既能生成结构化日志，也说明原因、行为变化与不兼容迁移。

~~~text
feat(auth): rotate refresh token after successful use

Prevent replay by invalidating the previous token in the same
transaction that issues its replacement. Failed transactions keep
the original token valid so clients can retry safely.

BREAKING CHANGE: refresh responses now require clients to persist
the replacement token returned by the server.

Refs: SEC-142
~~~

标题描述结果，正文补足 diff 无法表达的并发不变量和客户端迁移要求。

**递进追问：**

1. **为什么提交消息不能只写 fix bug？**

   它无法区分修复对象、触发条件和行为变化，后续 blame、revert、changelog 与事故调查都必须重新阅读全部 diff 才能理解。

2. **Conventional Commits 是否等于 SemVer 自动发布真相？**

   它提供可解析意图，但提交者仍可能漏标或误标破坏性变化；发布前应结合 API 检查、评审和迁移说明验证版本级别。

**易错点：**

- 消息写得详细不能弥补一个提交混入多项无关变更，先保证提交边界原子且可验证。
- 过度强制字符数和措辞会鼓励形式合规，自动化应聚焦类型、空标题和破坏性标记等稳定规则。

**参考来源：**

- [git commit 官方文档](https://git-scm.com/docs/git-commit)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning 2.0.0](https://semver.org/)

校验日期：2026-07-20
