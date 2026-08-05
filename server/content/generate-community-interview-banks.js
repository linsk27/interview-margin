import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { COMMUNITY_INTERVIEW_BANKS } from './community-banks/index.js'
import {
  generateCommunityInterviewBanks,
  renderCommunitySourceAudit,
} from './community-interview-bank.js'

const currentFile = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(currentFile), '../..')
const VERIFIED_AT = '2026-08-05'

export function generateCommunityBanks(outputRoot = projectRoot) {
  const banks = generateCommunityInterviewBanks(COMMUNITY_INTERVIEW_BANKS, {
    outputRoot,
    verifiedAt: VERIFIED_AT,
  })
  const auditTarget = path.join(outputRoot, 'docs/COMMUNITY_INTERVIEW_SOURCE_AUDIT.md')
  fs.mkdirSync(path.dirname(auditTarget), { recursive: true })
  fs.writeFileSync(
    auditTarget,
    `${renderCommunitySourceAudit(COMMUNITY_INTERVIEW_BANKS, { verifiedAt: VERIFIED_AT }).trim()}\n`,
    'utf8',
  )
  return { banks, auditTarget }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  console.log(JSON.stringify(generateCommunityBanks(), null, 2))
}
