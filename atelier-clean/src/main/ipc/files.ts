import { ipcMain, dialog, app } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

function htmlToText(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function exportToPdf(title: string, html: string): Promise<string | null> {
  const { BrowserWindow } = await import('electron')
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false }
  })

  const styledHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'EB Garamond', Garamond, Georgia, serif;
    font-size: 12pt;
    line-height: 1.8;
    color: #1C1C28;
    background: #fff;
    padding: 2.5cm 3cm;
    max-width: 21cm;
    margin: 0 auto;
  }
  h1, h2, h3, h4 {
    font-family: 'Cormorant Garamond', Garamond, Georgia, serif;
    font-weight: 600;
    margin: 1.2em 0 0.4em;
    color: #1B2B5E;
  }
  h1 { font-size: 24pt; border-bottom: 1px solid #C4A35A; padding-bottom: 0.3em; }
  h2 { font-size: 18pt; }
  h3 { font-size: 14pt; }
  p { margin-bottom: 0.8em; }
  blockquote {
    border-left: 3px solid #C4A35A;
    margin: 1em 0;
    padding: 0.5em 1em;
    color: #4A4560;
    font-style: italic;
  }
  code { font-family: 'Courier New', monospace; font-size: 0.9em; background: #f0ebe0; padding: 0.1em 0.3em; border-radius: 2px; }
  pre { background: #f0ebe0; padding: 1em; border-radius: 4px; overflow-x: auto; }
  ul, ol { padding-left: 1.5em; margin-bottom: 0.8em; }
  li { margin-bottom: 0.2em; }
  a { color: #1B2B5E; }
  .title-page { text-align: center; padding-top: 4cm; }
  .title-page h1 { border: none; font-size: 32pt; }
</style>
</head>
<body>
<div class="title-page"><h1>${title}</h1><p style="color:#C4A35A;margin-top:0.5em">${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
<div style="page-break-after:always"></div>
${html}
</body>
</html>`

  await win.loadURL('about:blank')
  await win.webContents.executeJavaScript(
    `document.documentElement.innerHTML = ${JSON.stringify(styledHtml)}`
  )

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    pageSize: 'A4'
  })

  win.destroy()

  const downloadsPath = app.getPath('downloads')
  const fileName = `${title.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s]/g, '').trim() || 'belge'}.pdf`
  const filePath = join(downloadsPath, fileName)
  writeFileSync(filePath, pdfData)
  return filePath
}

async function exportToDocx(title: string, html: string): Promise<string | null> {
  const text = htmlToText(html)
  const paragraphs = text
    .split('\n')
    .filter((p) => p.trim())
    .map((line) => {
      if (line.startsWith('# ')) {
        return new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1
        })
      } else if (line.startsWith('## ')) {
        return new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2
        })
      } else {
        return new Paragraph({
          children: [new TextRun({ text: line, font: 'Garamond', size: 24 })],
          spacing: { after: 200 }
        })
      }
    })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 }
          }
        },
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE
          }),
          ...paragraphs
        ]
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  const downloadsPath = app.getPath('downloads')
  const fileName = `${title.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s]/g, '').trim() || 'belge'}.docx`
  const filePath = join(downloadsPath, fileName)
  writeFileSync(filePath, buffer)
  return filePath
}

export function registerFileHandlers(): void {
  ipcMain.handle('file:exportPdf', async (_event, title: string, html: string) => {
    try {
      const path = await exportToPdf(title, html)
      return { success: true, path }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('file:exportDocx', async (_event, title: string, html: string) => {
    try {
      const path = await exportToDocx(title, html)
      return { success: true, path }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('file:exportMarkdown', async (_event, title: string, html: string) => {
    try {
      const markdown = htmlToMarkdown(html)
      const downloadsPath = app.getPath('downloads')
      const fileName = `${title.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s]/g, '').trim() || 'belge'}.md`
      const filePath = join(downloadsPath, fileName)
      writeFileSync(filePath, `# ${title}\n\n${markdown}`, 'utf-8')
      return { success: true, path: filePath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('file:importMarkdown', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Markdown dosyası aç',
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const content = readFileSync(result.filePaths[0], 'utf-8')
    return content
  })

  ipcMain.handle('file:openInExplorer', async (_event, path: string) => {
    const { shell } = await import('electron')
    shell.showItemInFolder(path)
  })

  ipcMain.handle('file:getDataPath', async () => {
    return app.getPath('userData')
  })
}
