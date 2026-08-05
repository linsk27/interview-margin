import { createDatabase } from './database.js'
import { denseProseBlocks } from './content/readability.js'

function normalizeTitle(value) {
  return value.toLowerCase()
    .replace(/^q[\d.]+[：:]?\s*/i, '')
    .replace(/[？?，,。.!！：“”'\s]/g, '')
}

function bigrams(value) {
  const normalized = normalizeTitle(value)
  return new Set(Array.from({ length: Math.max(0, normalized.length - 1) }, (_, index) => normalized.slice(index, index + 2)))
}

function similarity(left, right) {
  const a = bigrams(left)
  const b = bigrams(right)
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter((item) => b.has(item)).length
  return intersection / (a.size + b.size - intersection)
}

const { db } = createDatabase({
  filename: ':memory:',
  bootstrap: { username: 'admin', password: 'ContentCheckPassword!1', skipCredentialFile: true },
})

try {
  const bankCount = db.prepare('SELECT COUNT(*) AS count FROM question_banks WHERE archived_at IS NULL').get().count
  const questionCount = db.prepare('SELECT COUNT(*) AS count FROM questions WHERE archived_at IS NULL').get().count
  const uniqueCount = db.prepare('SELECT COUNT(DISTINCT id) AS count FROM questions').get().count
  const newQuestionCount = db.prepare(`SELECT COUNT(*) AS count FROM questions
    WHERE bank_id NOT IN ('interview', 'javascript', '360-ai-frontend',
      'frontend-ai-interviews', 'java-foundations', 'java-backend-interviews', 'java-ai-applications')`).get().count
  const sourcedCount = db.prepare(`SELECT COUNT(DISTINCT q.id) AS count FROM questions q
    JOIN source_refs s ON s.question_id=q.id
    WHERE q.bank_id NOT IN ('interview','javascript','360-ai-frontend',
      'frontend-ai-interviews','java-foundations','java-backend-interviews','java-ai-applications')`).get().count
  const communityQuestionCount = db.prepare(`SELECT COUNT(*) AS count FROM questions
    WHERE bank_id IN ('frontend-ai-interviews','java-backend-interviews','java-ai-applications')`).get().count
  const communityDualSourcedCount = db.prepare(`SELECT COUNT(*) AS count FROM questions q
    WHERE q.bank_id IN ('frontend-ai-interviews','java-backend-interviews','java-ai-applications')
      AND EXISTS (SELECT 1 FROM source_refs s WHERE s.question_id=q.id AND s.source_kind='community-interview')
      AND EXISTS (SELECT 1 FROM source_refs s WHERE s.question_id=q.id AND s.source_kind='official')`).get().count
  const foundationQuestionCount = db.prepare(`SELECT COUNT(*) AS count FROM questions
    WHERE bank_id='java-foundations'`).get().count
  const foundationOfficialSourcedCount = db.prepare(`SELECT COUNT(*) AS count FROM questions q
    WHERE q.bank_id='java-foundations'
      AND EXISTS (SELECT 1 FROM source_refs s WHERE s.question_id=q.id AND s.source_kind='official')`).get().count
  const javaCuratedGuideSourcedCount = db.prepare(`SELECT COUNT(*) AS count FROM questions q
    WHERE q.bank_id IN ('java-foundations','java-backend-interviews','java-ai-applications')
      AND EXISTS (SELECT 1 FROM source_refs s WHERE s.question_id=q.id AND s.source_kind='curated-guide')`).get().count
  const ai360QuestionCount = db.prepare(`SELECT COUNT(*) AS count FROM questions
    WHERE bank_id='360-ai-frontend'`).get().count
  const ai360SourcedCount = db.prepare(`SELECT COUNT(DISTINCT q.id) AS count FROM questions q
    JOIN source_refs s ON s.question_id=q.id WHERE q.bank_id='360-ai-frontend'`).get().count
  const incomplete = db.prepare(`SELECT id, title FROM questions WHERE archived_at IS NULL AND
    (trim(title)='' OR trim(body_md)='' OR trim(plain_text)='' OR read_minutes < 1)`).all()
  const missingSections = db.prepare(`SELECT b.id FROM question_banks b LEFT JOIN sections s ON s.bank_id=b.id
    GROUP BY b.id HAVING COUNT(s.id)=0`).all()
  const missingMarkers = db.prepare(`SELECT id, title FROM questions
    WHERE bank_id NOT IN ('interview','360-ai-frontend') AND
    (body_md NOT LIKE '%**短回答：**%' OR body_md NOT LIKE '%**原理：**%' OR
     body_md NOT LIKE '%**代码 / 场景：**%' OR body_md NOT LIKE '%**递进追问：**%' OR body_md NOT LIKE '%**易错点：**%')`).all()
  const thinEnrichedQuestions = db.prepare(`SELECT q.id, q.title, length(q.body_md) AS body_length,
    (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) AS source_count
    FROM questions q WHERE q.bank_id NOT IN ('interview','360-ai-frontend',
      'frontend-ai-interviews','java-foundations','java-backend-interviews','java-ai-applications') AND
    (length(q.body_md) < 900 OR q.read_minutes < 2 OR
      (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) < 2)`).all()
  const thinFoundationQuestions = db.prepare(`SELECT q.id, q.title, length(q.body_md) AS body_length,
    q.read_minutes,
    (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) AS source_count
    FROM questions q WHERE q.bank_id='java-foundations' AND
    (length(q.body_md) < 780 OR q.read_minutes < 2 OR
      (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id AND s.source_kind='official') < 1)`).all()
  const thinCommunityQuestions = db.prepare(`SELECT q.id, q.title, length(q.body_md) AS body_length,
    q.read_minutes,
    (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) AS source_count
    FROM questions q WHERE q.bank_id IN
      ('frontend-ai-interviews','java-backend-interviews','java-ai-applications') AND
    (length(q.body_md) < 780 OR q.read_minutes < 2 OR
      (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) < 2)`).all()
  const ai360MissingMarkers = db.prepare(`SELECT id, title FROM questions
    WHERE bank_id='360-ai-frontend' AND
    (body_md NOT LIKE '%**短回答：**%' OR body_md NOT LIKE '%**原理：**%' OR
     body_md NOT LIKE '%**代码 / 场景：**%' OR body_md NOT LIKE '%**递进追问：**%' OR
     body_md NOT LIKE '%**易错点：**%' OR body_md NOT LIKE '%**参考来源：**%')`).all()
  const thinAi360Questions = db.prepare(`SELECT q.id, q.title, length(q.body_md) AS body_length,
    q.read_minutes,
    (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) AS source_count
    FROM questions q WHERE q.bank_id='360-ai-frontend' AND
    (length(q.body_md) < 800 OR q.read_minutes < 2 OR
      (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) < 2)`).all()
  const genericTemplateCount = db.prepare(`SELECT COUNT(*) AS count FROM questions WHERE
    body_md LIKE '%这道题的关键是把%放回系统边界中%' OR
    body_md LIKE '%先记录可复现输入和关键指标，再做最小实验验证%' OR
    body_md LIKE '%不要只背术语，也不要把局部优化包装成通用架构%' OR
    body_md LIKE '%不能只停留在定义。%完整解释应包含输入与输出%'`).get().count
  const diagramQuestionCount = db.prepare("SELECT COUNT(*) AS count FROM questions WHERE body_md LIKE '%/content/diagrams/%'").get().count
  const denseParagraphs = db.prepare('SELECT id, bank_id, title, body_md FROM questions WHERE archived_at IS NULL').all()
    .flatMap((question) => denseProseBlocks(question.body_md).map((paragraph) => ({
      id: question.id,
      bankId: question.bank_id,
      title: question.title,
      length: paragraph.length,
      preview: paragraph.slice(0, 96),
    })))

  const titles = db.prepare('SELECT id, bank_id, title FROM questions ORDER BY bank_id, sort_order').all()
  const exact = new Map()
  for (const item of titles) {
    const key = normalizeTitle(item.title)
    const list = exact.get(key) ?? []
    list.push(item)
    exact.set(key, list)
  }
  const exactDuplicates = [...exact.values()].filter((items) => items.length > 1)
  const similar = []
  for (let left = 0; left < titles.length; left += 1) {
    for (let right = left + 1; right < titles.length; right += 1) {
      if (titles[left].bank_id === titles[right].bank_id) continue
      const score = similarity(titles[left].title, titles[right].title)
      if (score >= 0.82) similar.push({ score: Number(score.toFixed(2)), left: titles[left].title, right: titles[right].title })
    }
  }

  const report = {
    banks: bankCount,
    questions: questionCount,
    uniqueIds: uniqueCount,
    generatedQuestions: newQuestionCount,
    generatedQuestionsWithSources: sourcedCount,
    communityInterviewQuestions: communityQuestionCount,
    communityQuestionsWithInterviewAndOfficialSources: communityDualSourcedCount,
    javaFoundationQuestions: foundationQuestionCount,
    javaFoundationQuestionsWithOfficialSources: foundationOfficialSourcedCount,
    javaQuestionsWithCuratedGuideSources: javaCuratedGuideSourcedCount,
    ai360Questions: ai360QuestionCount,
    ai360QuestionsWithSources: ai360SourcedCount,
    incomplete,
    missingSections,
    missingRequiredMarkers: missingMarkers,
    thinEnrichedQuestions,
    thinCommunityQuestions,
    thinFoundationQuestions,
    missing360RequiredMarkers: ai360MissingMarkers,
    thin360Questions: thinAi360Questions,
    genericTemplateCount,
    diagramQuestionCount,
    denseParagraphs,
    exactDuplicateTitles: exactDuplicates,
    similarTitleReport: similar.slice(0, 30),
  }
  console.log(JSON.stringify(report, null, 2))
  if (bankCount !== 14 || questionCount !== 801 || uniqueCount !== 801 || newQuestionCount !== 320
    || sourcedCount !== 320 || ai360QuestionCount !== 72 || ai360SourcedCount !== 72
    || communityQuestionCount !== 128 || communityDualSourcedCount !== 128
    || foundationQuestionCount !== 100 || foundationOfficialSourcedCount !== 100
    || javaCuratedGuideSourcedCount !== 188
    || incomplete.length || missingSections.length || missingMarkers.length
    || thinEnrichedQuestions.length || thinCommunityQuestions.length || thinFoundationQuestions.length
    || ai360MissingMarkers.length || thinAi360Questions.length
    || genericTemplateCount || diagramQuestionCount < 29 || denseParagraphs.length) {
    process.exitCode = 1
  }
} finally {
  db.close()
}
