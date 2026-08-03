import { enrichJavascriptBank } from './enrich-javascript-bank.js'
import { generateCommunityBanks } from './generate-community-interview-banks.js'
import { generateQuestionBanks } from './generate-question-banks.js'
import { import360AiBank } from './import-360-ai-bank.js'

const generatedBanks = generateQuestionBanks()
const javascript = enrichJavascriptBank()
const interview360 = import360AiBank()
const community = generateCommunityBanks()

console.log(JSON.stringify({
  questions: [...generatedBanks, ...community.banks]
    .reduce((sum, bank) => sum + bank.count, javascript.count + interview360.questions),
  banks: [javascript, ...generatedBanks, {
    id: '360-ai-frontend',
    count: interview360.questions,
    target: interview360.outputPath,
  }, ...community.banks],
  sourceAudit: community.auditTarget,
}, null, 2))
