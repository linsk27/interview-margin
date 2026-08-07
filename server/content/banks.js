import { GENERATED_BANKS } from './question-data.js'
import { COMMUNITY_INTERVIEW_BANKS } from './community-banks/index.js'

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

const CURATED_BANKS = [
  {
    id: '360-ai-frontend',
    title: '360 AI 应用前端一面预判',
    shortTitle: '360 AI 一面',
    kicker: '360 INTERVIEW PLAYBOOK',
    category: '求职专项',
    description: '面向 360 AI 应用前端一面的 72 道公共技术题解，覆盖 RAG、Agent、MCP / Skill / Tool、SSE / WebSocket 安全、React 与工程基础。',
    source: 'public/question-banks/360-ai-frontend.md',
    idPrefix: '360-ai-frontend',
    baseTags: ['360', 'AI 应用前端', '一面'],
    tone: 'blue',
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
    idPrefix: bank.idPrefix ?? bank.id,
    baseTags: bank.baseTags,
    tone: bank.tone,
    preserveIds: false,
  })),
  ...COMMUNITY_INTERVIEW_BANKS.map((bank) => ({
    id: bank.id,
    title: bank.title,
    shortTitle: bank.shortTitle,
    kicker: bank.kicker,
    category: bank.category,
    description: bank.description,
    source: bank.source,
    idPrefix: bank.idPrefix ?? bank.id,
    baseTags: bank.baseTags,
    tone: bank.tone,
    preserveIds: false,
  })),
  ...CURATED_BANKS.map((bank) => ({ ...bank, preserveIds: false })),
]
