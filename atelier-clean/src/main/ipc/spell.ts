import { ipcMain, app } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

const spellers: Record<string, any> = {}
const loading: Record<string, Promise<any> | undefined> = {}

async function loadFromDictionaryPackage(
  lang: string
): Promise<{ aff: Buffer; dic: Buffer } | null> {
  return new Promise((resolve) => {
    try {
      // dictionary-* packages export a callback-style API
      const pkg = require(`dictionary-${lang}`)
      if (typeof pkg === 'function') {
        pkg((err: Error, data: { aff: Buffer; dic: Buffer }) => {
          if (err) {
            console.warn(`dictionary-${lang} callback error:`, err.message)
            resolve(null)
          } else {
            resolve(data)
          }
        })
      } else if (pkg && pkg.aff && pkg.dic) {
        resolve(pkg)
      } else {
        // Try loading file path approach
        const pkgPath = require.resolve(`dictionary-${lang}/package.json`)
        const pkgDir = pkgPath.replace(/[/\\]package\.json$/, '')
        const affPath = join(pkgDir, 'index.aff')
        const dicPath = join(pkgDir, 'index.dic')
        if (existsSync(affPath) && existsSync(dicPath)) {
          resolve({ aff: readFileSync(affPath), dic: readFileSync(dicPath) })
        } else {
          resolve(null)
        }
      }
    } catch (err: any) {
      console.warn(`Failed to load dictionary-${lang}:`, err.message)
      resolve(null)
    }
  })
}

async function loadFromResources(lang: string): Promise<{ aff: Buffer; dic: Buffer } | null> {
  const resourcesPath = app.isPackaged
    ? join(process.resourcesPath, 'resources', 'dictionaries', lang)
    : join(process.cwd(), 'resources', 'dictionaries', lang)

  const affPath = join(resourcesPath, `${lang}.aff`)
  const dicPath = join(resourcesPath, `${lang}.dic`)

  if (existsSync(affPath) && existsSync(dicPath)) {
    return { aff: readFileSync(affPath), dic: readFileSync(dicPath) }
  }
  return null
}

async function loadSpeller(_lang: string): Promise<any> {
  // if (spellers[lang]) return spellers[lang]
  // if (loading[lang]) return loading[lang]

  // loading[lang] = (async () => {
  //   try {
  //     // Try bundled resources first, then npm dictionary packages
  //     let data = await loadFromResources(lang)
  //     if (!data) data = await loadFromDictionaryPackage(lang)
  //     if (!data) {
  //       console.warn(`No dictionary found for ${lang}`)
  //       return null
  //     }

  //     const nspell = (await import('nspell')).default
  //     const speller = nspell({ aff: data.aff, dic: data.dic })
  //     spellers[lang] = speller
  //     return speller
  //   } catch (err: any) {
  //     console.error(`Failed to initialize speller for ${lang}:`, err.message)
  //     return null
  //   } finally {
  //     delete loading[lang]
  //   }
  // })()

  // return loading[lang]
  return null
}

export function registerSpellHandlers(): void {
  ipcMain.handle('spell:check', async (_event, word: string, lang: string) => {
    const speller = await loadSpeller(lang)
    if (!speller) return { correct: true, suggestions: [] }
    try {
      const correct = speller.correct(word)
      const suggestions = correct ? [] : speller.suggest(word).slice(0, 8)
      return { correct, suggestions }
    } catch (err) {
      return { correct: true, suggestions: [] }
    }
  })

  ipcMain.handle('spell:checkBatch', async (_event, words: string[], lang: string) => {
    const speller = await loadSpeller(lang)
    if (!speller) return words.map(() => ({ correct: true, suggestions: [] }))
    return words.map((word) => {
      try {
        const correct = speller.correct(word)
        return { correct, suggestions: correct ? [] : speller.suggest(word).slice(0, 6) }
      } catch {
        return { correct: true, suggestions: [] }
      }
    })
  })

  ipcMain.handle('spell:addWord', async (_event, word: string, lang: string) => {
    const speller = await loadSpeller(lang)
    if (!speller) return false
    try {
      speller.add(word)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('spell:languages', async () => {
    const available: string[] = []
    for (const lang of ['tr', 'en', 'fr', 'it']) {
      const s = await loadSpeller(lang)
      if (s) available.push(lang)
    }
    return available
  })
}
