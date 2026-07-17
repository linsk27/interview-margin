import 'dotenv/config'

import path from 'node:path'

import { backupDatabase } from './backup-service.js'
import { createDatabase } from './database.js'

const rootDir = path.resolve(process.cwd())
const database = createDatabase({ rootDir, bootstrap: false })

try {
  const result = await backupDatabase(database.db, path.join(rootDir, 'backups'), 30)
  console.log(`Database backup created: ${result.path} (${result.size} bytes)`)
} finally {
  database.db.close()
}
