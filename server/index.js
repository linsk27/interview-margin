import 'dotenv/config'

import { createApp } from './app.js'

const port = Number.parseInt(process.env.PORT ?? '4173', 10)
const host = process.env.HOST ?? '127.0.0.1'
const { app, database } = createApp({
  databaseOptions: { usePrecompiledSeed: true },
})

const server = app.listen(port, host, () => {
  console.log(`Interview Margin is running at http://${host}:${port}`)
  console.log(`SQLite: ${database.filename}`)
  if (database.bootstrap) {
    console.log(`Bootstrap administrator created. Credentials: ${database.dataDir}/bootstrap-admin.txt`)
  }
})

function shutdown(signal) {
  console.log(`${signal}: closing HTTP server and SQLite database.`)
  server.close(() => {
    database.db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
