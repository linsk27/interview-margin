import { JAVA_FOUNDATION_CHAPTERS_01_03 } from './java-foundations/chapters-01-03.js'
import { JAVA_FOUNDATION_CHAPTERS_04_06 } from './java-foundations/chapters-04-06.js'
import { JAVA_FOUNDATION_CHAPTERS_07_08 } from './java-foundations/chapters-07-08.js'
import { JAVA_FOUNDATION_CHAPTERS_09_10 } from './java-foundations/chapters-09-10.js'
import { optimizeJavaFoundationSections } from './java-foundations/high-frequency-overrides.js'

const sections = optimizeJavaFoundationSections([
  ...JAVA_FOUNDATION_CHAPTERS_01_03,
  ...JAVA_FOUNDATION_CHAPTERS_04_06,
  ...JAVA_FOUNDATION_CHAPTERS_07_08,
  ...JAVA_FOUNDATION_CHAPTERS_09_10,
])

export const javaFoundationBank = {
  id: 'java-foundations',
  title: 'Java 基础 100 题',
  shortTitle: 'Java 100',
  kicker: 'JAVA LANGUAGE FUNDAMENTALS',
  category: '后端基础',
  description: '按 JavaGuide 与小林 Coding 高频面试主线重新整理，并用 Java 21、Oracle 与 OpenJDK 资料校准；重点覆盖 Java 基础、HashMap、JMM、锁、线程池、JVM 与 GC。',
  baseTags: ['Java', '高频八股', 'Java 21'],
  tone: 'blue',
  sourcePolicy: 'curated-guide',
  verifiedAt: '2026-08-05',
  source: 'public/question-banks/java-foundations.md',
  sections,
}
