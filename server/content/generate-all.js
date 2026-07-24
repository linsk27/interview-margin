import { enrichJavascriptBank } from './enrich-javascript-bank.js'
import { generateQuestionBanks } from './generate-question-banks.js'
import { import360AiBank } from './import-360-ai-bank.js'

const generatedBanks = generateQuestionBanks()
const javascript = enrichJavascriptBank()
const interview360 = import360AiBank()

console.log(JSON.stringify({
  questions: generatedBanks.reduce((sum, bank) => sum + bank.count, javascript.count + interview360.questions),
  banks: [javascript, ...generatedBanks, {
    id: '360-ai-frontend',
    count: interview360.questions,
    target: interview360.outputPath,
  }],
}, null, 2))
