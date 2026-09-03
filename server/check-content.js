import { createDatabase } from './database.js'
import {
  extractFollowUpAnswers,
  isConclusionOnlyDecisionAnswer,
} from './content/answer-quality.js'
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

const AUDIT_SECTION_PATTERNS = {
  answer: /^(?:\*\*)?(?:先背答案|短回答|题解)(?:[：:])(?:\*\*)?\s*$/,
  glossary: /^(?:\*\*)?关键词翻译(?:[：:])(?:\*\*)?\s*$/,
  mechanism: /^(?:\*\*)?(?:原理(?:\s*\/?\s*流程)?|机制拆解)(?:[：:])(?:\*\*)?\s*$/,
  practice: /^(?:\*\*)?(?:代码\s*\/\s*场景|排查\s*\/\s*场景|项目\s*\/\s*场景|项目场景|项目落点)(?:[：:])(?:\*\*)?\s*$/,
  followups: /^(?:\*\*)?(?:继续追问|递进追问)(?:[：:])?.*?(?:\*\*)?\s*$/,
  pitfalls: /^(?:\*\*)?易错点(?:[：:])(?:\*\*)?\s*$/,
  sources: /^(?:\*\*)?参考来源(?:[：:])(?:\*\*)?\s*$/,
}
const FENCE_START = /^[\t ]*(?:`{3,}|~{3,})/m

function auditSections(markdown) {
  const sections = { intro: [] }
  let current = 'intro'
  let fence
  for (const line of String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const fenceMatch = line.trim().match(/^(```|~~~)/)
    if (fence) {
      sections[current].push(line)
      if (fenceMatch?.[1] === fence) fence = undefined
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      sections[current].push(line)
      continue
    }
    const next = Object.entries(AUDIT_SECTION_PATTERNS)
      .find(([, pattern]) => pattern.test(line.trim()))?.[0]
    if (next) {
      current = next
      sections[current] ??= []
      if (next === 'followups') sections[current].push(line)
      continue
    }
    sections[current].push(line)
  }
  return Object.fromEntries(Object.entries(sections)
    .map(([key, lines]) => [key, lines.join('\n').trim()]))
}

function proseLength(markdown) {
  return markdown
    .replace(/(```|~~~)[\s\S]*?\1/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#-]/g, '')
    .replace(/\s+/g, '')
    .length
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
    (length(q.body_md) < 620 OR q.read_minutes < 1 OR
      (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id AND s.source_kind='official') < 1)`).all()
  const thinCommunityQuestions = db.prepare(`SELECT q.id, q.title, length(q.body_md) AS body_length,
    q.read_minutes,
    (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) AS source_count
    FROM questions q WHERE q.bank_id IN
      ('frontend-ai-interviews','java-backend-interviews','java-ai-applications') AND
    (length(q.body_md) < 620 OR q.read_minutes < 1 OR
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

  const activeQuestions = db.prepare(`
    SELECT q.id, q.bank_id, q.section_id, q.title, q.body_md,
      EXISTS(SELECT 1 FROM source_refs s WHERE s.question_id=q.id) AS has_sources
    FROM questions q
    WHERE q.archived_at IS NULL
  `).all()
  const auditedQuestions = activeQuestions.map((question) => ({
    ...question,
    sections: auditSections(question.body_md),
  }))
  const structuredAnswerCount = auditedQuestions.filter((question) => (
    /\*\*结论[：:]\*\*/.test(question.sections.answer ?? '')
      && /\*\*为什么[：:]\*\*/.test(question.sections.answer ?? '')
      && /\*\*怎么用[：:]\*\*/.test(question.sections.answer ?? '')
  )).length
  const glossaryQuestionCount = auditedQuestions.filter((question) => question.sections.glossary).length
  const knownGlossaryCollisions = auditedQuestions.flatMap((question) => {
    const glossary = question.sections.glossary ?? ''
    const problems = []
    if (question.bank_id === 'react-core' && /\*\*ReAct[：:]\*\*/.test(glossary)) {
      problems.push('React was mistaken for the ReAct agent pattern')
    }
    if (question.bank_id === 'git-engineering' && /\*\*CAP\s*\/\s*BASE[：:]\*\*/.test(glossary)) {
      problems.push('merge base was mistaken for the BASE database model')
    }
    if (question.bank_id === 'network-deployment'
      && !/节流|限流/.test(question.title)
      && /\*\*节流[：:]\*\*/.test(glossary)) {
      problems.push('a byte stream or unrelated phrase was mistaken for throttling')
    }
    if (!question.bank_id.startsWith('java-')
      && /\*\*GC[：:]\*\*/.test(glossary)
      && /JVM/.test(glossary)) {
      problems.push('a non-Java question received a JVM-only GC explanation')
    }
    return problems.map((problem) => ({
      id: question.id,
      bankId: question.bank_id,
      title: question.title,
      problem,
    }))
  })
  const firstScreenReasonProblems = auditedQuestions.flatMap((question) => {
    const conclusion = question.sections.answer
      ?.match(/- \*\*结论[：:]\*\* ([^\n]+)/)?.[1]
      ?.trim() ?? ''
    const reason = question.sections.answer
      ?.match(/- \*\*为什么[：:]\*\* ([^\n]+)/)?.[1]
      ?.trim() ?? ''
    const problems = []
    if (/^(?:这道题|本题|真实面经|牛客公开面经).{0,48}(?:来自|源自|题源|面经|延伸|不冒充)|^(?:题源|资料来源|参考来源|社区题源|官方校验)/.test(conclusion)) {
      problems.push('the conclusion explains source provenance instead of answering the question')
    }
    if (/^(?:这道题|本题|真实面经|牛客公开面经).{0,48}(?:来自|源自|题源|面经|延伸|不冒充)|^(?:题源|资料来源|参考来源|社区题源|官方校验)/.test(reason)) {
      problems.push('the reason explains source provenance instead of the concept')
    }
    return problems.map((problem) => ({
      id: question.id,
      bankId: question.bank_id,
      title: question.title,
      conclusion,
      reason,
      problem,
    }))
  })
  const fencedCodeByBank = Object.fromEntries(db.prepare(`
    SELECT bank_id, COUNT(*) AS count
    FROM questions
    WHERE archived_at IS NULL
      AND (body_md LIKE '%\`\`\`%' OR body_md LIKE '%~~~%')
    GROUP BY bank_id
  `).all().map((row) => [row.bank_id, row.count]))
  const conclusionOnlyFollowups = auditedQuestions.flatMap((question) => (
    extractFollowUpAnswers(question.body_md)
      .filter((followUp) => isConclusionOnlyDecisionAnswer(followUp.question, followUp.answer))
      .map((followUp) => ({
        id: question.id,
        bankId: question.bank_id,
        title: question.title,
        followUpQuestion: followUp.question,
        answer: followUp.answer,
      }))
  ))
  const categoryDistribution = db.prepare(`
    SELECT b.category,
      COUNT(DISTINCT b.id) AS banks,
      COUNT(q.id) AS questions
    FROM question_banks b
    JOIN questions q ON q.bank_id=b.id AND q.archived_at IS NULL
    WHERE b.archived_at IS NULL
    GROUP BY b.category
    ORDER BY b.category
  `).all()
  const bankAudit = db.prepare(`
    SELECT id, title, category
    FROM question_banks
    WHERE archived_at IS NULL
    ORDER BY sort_order
  `).all().map((bank) => {
    const questions = auditedQuestions.filter((question) => question.bank_id === bank.id)
    return {
      bankId: bank.id,
      title: bank.title,
      category: bank.category,
      questions: questions.length,
      activeSections: new Set(questions.map((question) => question.section_id)).size,
      sourcedQuestions: questions.filter((question) => question.has_sources).length,
      mechanismSections: questions.filter((question) => question.sections.mechanism).length,
      practiceSections: questions.filter((question) => question.sections.practice).length,
      bodyUnder620: questions.filter((question) => question.body_md.length < 620).length,
      shortAnswerOver160: questions.filter((question) => proseLength(question.sections.answer ?? '') > 160).length,
      fencedCode: questions.filter((question) => FENCE_START.test(question.body_md)).length,
      diagrams: questions.filter((question) => question.body_md.includes('/content/diagrams/')).length,
    }
  })
  const qualityAudit = {
    activeSections: db.prepare(`
      SELECT COUNT(DISTINCT section_id) AS count
      FROM questions WHERE archived_at IS NULL
    `).get().count,
    categoryDistribution,
    byBank: bankAudit,
    sourcedQuestions: activeQuestions.filter((question) => question.has_sources).length,
    sourceReferences: db.prepare('SELECT COUNT(*) AS count FROM source_refs').get().count,
    uniqueSourceUrls: db.prepare('SELECT COUNT(DISTINCT url) AS count FROM source_refs').get().count,
    sectionCoverage: Object.fromEntries(Object.keys(AUDIT_SECTION_PATTERNS).map((section) => [
      section,
      auditedQuestions.filter((question) => question.sections[section]).length,
    ])),
    structuredAnswerCount,
    glossaryQuestionCount,
    fencedCodeByBank,
    bodyUnder620: activeQuestions.filter((question) => question.body_md.length < 620).length,
    bodyOver1800: activeQuestions.filter((question) => question.body_md.length > 1800).length,
    shortAnswerNonWhitespaceCharsOver160: auditedQuestions.filter((question) => proseLength(question.sections.answer ?? '') > 160).length,
    shortAnswerNonWhitespaceCharsOver240: auditedQuestions.filter((question) => proseLength(question.sections.answer ?? '') > 240).length,
    shortAnswerNonWhitespaceCharsOver400: auditedQuestions.filter((question) => proseLength(question.sections.answer ?? '') > 400).length,
    shortAnswerContainsFencedCode: auditedQuestions.filter((question) => FENCE_START.test(question.sections.answer ?? '')).length,
    questionsWithFencedCode: activeQuestions.filter((question) => FENCE_START.test(question.body_md)).length,
    practiceSectionsWithFencedCode: auditedQuestions.filter((question) => FENCE_START.test(question.sections.practice ?? '')).length,
    questionsWithDiagrams: activeQuestions.filter((question) => question.body_md.includes('/content/diagrams/')).length,
    longTitlesOver40: activeQuestions.filter((question) => question.title.length > 40).length,
    conclusionOnlyFollowupAnswers: conclusionOnlyFollowups.length,
  }

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
    knownGlossaryCollisions,
    firstScreenReasonProblems,
    conclusionOnlyFollowups,
    exactDuplicateTitles: exactDuplicates,
    similarTitleReport: similar.slice(0, 30),
    qualityAudit,
  }
  console.log(JSON.stringify(report, null, 2))
  if (bankCount !== 14 || questionCount !== 762 || uniqueCount !== 762 || newQuestionCount !== 320
    || sourcedCount !== 320 || ai360QuestionCount !== 72 || ai360SourcedCount !== 72
    || communityQuestionCount !== 129 || communityDualSourcedCount !== 129
    || foundationQuestionCount !== 60 || foundationOfficialSourcedCount !== 60
    || javaCuratedGuideSourcedCount !== 149
    || incomplete.length || missingSections.length || missingMarkers.length
    || thinEnrichedQuestions.length || thinCommunityQuestions.length || thinFoundationQuestions.length
    || ai360MissingMarkers.length || thinAi360Questions.length
    || genericTemplateCount || diagramQuestionCount < 53 || denseParagraphs.length
    || knownGlossaryCollisions.length
    || firstScreenReasonProblems.length
    || structuredAnswerCount !== questionCount || glossaryQuestionCount < 480
    || activeQuestions.some((question) => question.body_md.length < 620)
    || (fencedCodeByBank['frontend-ai-interviews'] ?? 0) < 18
    || (fencedCodeByBank['java-foundations'] ?? 0) < 10
    || (fencedCodeByBank['java-backend-interviews'] ?? 0) < 8
    || (fencedCodeByBank['java-ai-applications'] ?? 0) < 6
    || conclusionOnlyFollowups.length) {
    process.exitCode = 1
  }
} finally {
  db.close()
}
