import { GENERATED_BANKS } from './question-data.js'

const LEGACY_BANKS = [
  {
    id: 'interview',
    title: '简历技术面试题',
    shortTitle: '面试问答',
    kicker: 'INTERVIEW PLAYBOOK',
    category: '求职面试',
    description: '围绕当前简历整理的八股、项目拷打、业务场景与源码追问。',
    source: 'public/interview.md',
    idPrefix: '',
    baseTags: ['面试'],
    tone: 'blue',
  },
  {
    id: 'javascript',
    title: 'JavaScript 基础 100 题',
    shortTitle: 'JS 100',
    kicker: 'LANGUAGE FUNDAMENTALS',
    category: '前端基础',
    description: '覆盖类型转换、作用域、原型、异步、对象与数组的选择题及逐题解析。',
    source: 'public/javascript-100.md',
    idPrefix: 'js',
    baseTags: ['JavaScript'],
    tone: 'amber',
  },
]

export const BUILTIN_BANKS = [
  ...LEGACY_BANKS.map((bank) => ({ ...bank, preserveIds: true })),
  ...GENERATED_BANKS.map((bank) => ({
    id: bank.id,
    title: bank.title,
    shortTitle: bank.shortTitle,
    kicker: bank.kicker,
    category: bank.category,
    description: bank.description,
    source: bank.source,
    idPrefix: bank.id,
    baseTags: bank.baseTags,
    tone: bank.tone,
    preserveIds: false,
  })),
]
