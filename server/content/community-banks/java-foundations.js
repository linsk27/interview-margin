import { JAVA_FOUNDATION_CHAPTERS_01_03 } from './java-foundations/chapters-01-03.js'
import { JAVA_FOUNDATION_CHAPTERS_04_06 } from './java-foundations/chapters-04-06.js'
import { JAVA_FOUNDATION_CHAPTERS_07_08 } from './java-foundations/chapters-07-08.js'
import { JAVA_FOUNDATION_CHAPTERS_09_10 } from './java-foundations/chapters-09-10.js'

export const javaFoundationBank = {
  id: 'java-foundations',
  title: 'Java 基础 100 题',
  shortTitle: 'Java 100',
  kicker: 'JAVA LANGUAGE FUNDAMENTALS',
  category: '后端基础',
  description: '以 Java 21 与官方规范校准的系统基础题库，覆盖类型、面向对象、集合、函数式编程、IO、并发、JVM 与现代 Java 特性。',
  baseTags: ['Java', '基础八股', 'Java 21'],
  tone: 'blue',
  sourcePolicy: 'official-only',
  verifiedAt: '2026-08-05',
  source: 'public/question-banks/java-foundations.md',
  sections: [
    ...JAVA_FOUNDATION_CHAPTERS_01_03,
    ...JAVA_FOUNDATION_CHAPTERS_04_06,
    ...JAVA_FOUNDATION_CHAPTERS_07_08,
    ...JAVA_FOUNDATION_CHAPTERS_09_10,
  ],
}
