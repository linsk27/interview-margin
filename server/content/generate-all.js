import { enrichJavascriptBank } from './enrich-javascript-bank.js'
import { generateQuestionBanks } from './generate-question-banks.js'

const generatedBanks = generateQuestionBanks()
const javascript = enrichJavascriptBank()

console.log(JSON.stringify({
  questions: generatedBanks.reduce((sum, bank) => sum + bank.count, javascript.count),
  banks: [javascript, ...generatedBanks],
}, null, 2))
