// Запуск Chromium для Playwright: CHROME_PATH, иначе свой браузер Playwright,
// иначе любой chromium_headless_shell из кеша ~/.cache/ms-playwright.
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function launchBrowser() {
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH })
  try {
    return await chromium.launch()
  } catch (error) {
    const cache = path.join(process.env.HOME ?? '', '.cache', 'ms-playwright')
    const shells = (await fs.readdir(cache).catch(() => []))
      .filter((d) => d.startsWith('chromium_headless_shell-'))
      .sort()
      .reverse()
    for (const dir of shells) {
      const exe = path.join(cache, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
      if (await fs.access(exe).then(() => true, () => false)) return chromium.launch({ executablePath: exe })
    }
    throw error
  }
}
