import fs from 'node:fs'
import path from 'node:path'

function stamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

export async function backupDatabase(db, backupDir, retain = 30) {
  fs.mkdirSync(backupDir, { recursive: true })
  const filename = `interview-${stamp()}.db`
  const target = path.join(backupDir, filename)
  await db.backup(target)
  const backups = fs.readdirSync(backupDir)
    .filter((file) => /^interview-.*\.db$/.test(file))
    .map((file) => ({ file, path: path.join(backupDir, file), mtime: fs.statSync(path.join(backupDir, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  backups.slice(retain).forEach((item) => fs.rmSync(item.path))
  return { filename, path: target, size: fs.statSync(target).size }
}

export function listBackups(backupDir) {
  if (!fs.existsSync(backupDir)) return []
  return fs.readdirSync(backupDir)
    .filter((file) => /^interview-.*\.db$/.test(file))
    .map((file) => {
      const stats = fs.statSync(path.join(backupDir, file))
      return { filename: file, size: stats.size, createdAt: stats.mtime.toISOString() }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function resolveBackup(backupDir, filename) {
  if (!/^interview-[a-zA-Z0-9_.-]+\.db$/.test(filename)) return undefined
  const target = path.resolve(backupDir, filename)
  if (!target.startsWith(`${path.resolve(backupDir)}${path.sep}`) || !fs.existsSync(target)) return undefined
  return target
}
