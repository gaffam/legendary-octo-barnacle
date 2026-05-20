import { ipcMain, app } from 'electron'
import { getDb } from '../database'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

async function getWebDAVClient(config: { url: string; username: string; password: string }) {
  const { createClient } = await import('webdav')
  return createClient(config.url, {
    username: config.username,
    password: config.password
  })
}

function getBackupData() {
  const db = getDb()
  return {
    documents: db.prepare('SELECT * FROM documents WHERE is_archived = 0').all(),
    notebooks: db.prepare('SELECT * FROM notebooks').all(),
    agenda: db.prepare('SELECT * FROM agenda_entries').all(),
    zettels: db.prepare('SELECT * FROM zettel_notes').all(),
    settings: db.prepare('SELECT * FROM settings').all(),
    exportedAt: Date.now(),
    version: '1.0'
  }
}

export function registerCloudHandlers(): void {
  ipcMain.handle(
    'cloud:testConnection',
    async (
      _e,
      config: {
        provider: string
        url: string
        username: string
        password: string
      }
    ) => {
      try {
        if (config.provider === 'webdav') {
          const client = await getWebDAVClient(config)
          const contents = await client.getDirectoryContents('/')
          return { success: true, message: 'Bağlantı başarılı' }
        }
        return { success: false, error: 'Desteklenmeyen sağlayıcı' }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'cloud:sync',
    async (
      _e,
      config: {
        provider: string
        url: string
        username: string
        password: string
      }
    ) => {
      try {
        const backupData = getBackupData()
        const json = JSON.stringify(backupData, null, 2)
        const remotePath = '/Atelier/backup.json'

        if (config.provider === 'webdav') {
          const client = await getWebDAVClient(config)

          // Ensure directory exists
          try {
            await client.createDirectory('/Atelier')
          } catch {
            /* may already exist */
          }

          await client.putFileContents(remotePath, json, {
            contentLength: Buffer.byteLength(json),
            overwrite: true
          })

          return { success: true, message: `${backupData.documents.length} belge yedeklendi` }
        }

        return { success: false, error: 'Desteklenmeyen sağlayıcı' }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'cloud:restore',
    async (
      _e,
      config: {
        provider: string
        url: string
        username: string
        password: string
      }
    ) => {
      try {
        if (config.provider === 'webdav') {
          const client = await getWebDAVClient(config)
          const content = (await client.getFileContents('/Atelier/backup.json', {
            format: 'text'
          })) as string
          const data = JSON.parse(content)

          // Save local backup before restoring
          const userDataPath = app.getPath('userData')
          const backupPath = join(userDataPath, `backup_before_restore_${Date.now()}.json`)
          writeFileSync(backupPath, JSON.stringify(getBackupData()), 'utf-8')

          return { success: true, data, localBackup: backupPath }
        }
        return { success: false, error: 'Desteklenmeyen sağlayıcı' }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle('cloud:localBackup', async () => {
    try {
      const backupData = getBackupData()
      const json = JSON.stringify(backupData, null, 2)
      const downloadsPath = app.getPath('downloads')
      const fileName = `atelier_backup_${new Date().toISOString().slice(0, 10)}.json`
      const filePath = join(downloadsPath, fileName)
      writeFileSync(filePath, json, 'utf-8')
      return { success: true, path: filePath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
