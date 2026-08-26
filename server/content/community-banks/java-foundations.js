import { JAVA_FOUNDATION_V2_LANGUAGE } from './java-foundations/v2/language.js'
import { JAVA_FOUNDATION_V2_COLLECTIONS } from './java-foundations/v2/collections.js'
import { JAVA_FOUNDATION_V2_CONCURRENCY } from './java-foundations/v2/concurrency.js'
import { JAVA_FOUNDATION_V2_JVM } from './java-foundations/v2/jvm.js'
import { JAVA_FOUNDATION_V2_MODERN } from './java-foundations/v2/modern.js'

const sections = [
  JAVA_FOUNDATION_V2_LANGUAGE,
  JAVA_FOUNDATION_V2_COLLECTIONS,
  JAVA_FOUNDATION_V2_CONCURRENCY,
  JAVA_FOUNDATION_V2_JVM,
  JAVA_FOUNDATION_V2_MODERN,
]

export const javaFoundationBank = {
  id: 'java-foundations',
  idPrefix: 'java-foundations-v2',
  title: 'Java 基础高频 60 题',
  shortTitle: 'Java 高频',
  kicker: 'JAVA HIGH-FREQUENCY FOUNDATIONS',
  category: '后端开发',
  description: '以高频概念问答覆盖 Java 语言基础、集合、并发、JVM 与现代 Java，突出定义、适用边界和常见误区。',
  baseTags: ['Java', '高频必问', 'Java 21'],
  tone: 'blue',
  sourcePolicy: 'curated-guide',
  verifiedAt: '2026-08-06',
  source: 'public/question-banks/java-foundations.md',
  sections,
}
