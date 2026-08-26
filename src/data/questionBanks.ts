import type { QuestionBankDefinition, QuestionLibrary } from '../types'

export const QUESTION_BANKS: QuestionBankDefinition[] = [
  {
    id: 'interview',
    title: '简历技术面试题',
    shortTitle: '面试问答',
    kicker: 'INTERVIEW PLAYBOOK',
    category: '求职专项',
    description: '围绕当前简历整理的八股、项目拷打、业务场景与源码追问。',
    source: '/interview.md',
    baseTags: ['面试'],
    tone: 'blue',
  },
  {
    id: 'javascript',
    title: 'JavaScript 基础 100 题',
    shortTitle: 'JS 100',
    kicker: 'LANGUAGE FUNDAMENTALS',
    category: '前端开发',
    description: '覆盖类型转换、作用域、原型、异步、对象与数组的选择题及逐题解析。',
    source: '/javascript-100.md',
    idPrefix: 'js',
    baseTags: ['JavaScript'],
    tone: 'amber',
  },
]

export function questionBankFor(id: QuestionLibrary): QuestionBankDefinition | undefined {
  return QUESTION_BANKS.find((bank) => bank.id === id)
}
