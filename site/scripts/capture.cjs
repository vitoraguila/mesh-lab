/**
 * Re-captures the studio screenshots used on the site, at 2x, from a running
 * port-forward. The images checked in were captured at 1x and look soft on a
 * retina display; this replaces them with sharp ones.
 *
 *   make port-forward ENV=stg          # in one terminal, note the URL it prints
 *   node site/scripts/capture.cjs http://127.0.0.1:3000
 *
 * Grafana is a second, optional argument. Start it with `make grafana ENV=stg`,
 * which prints the generated login, then pass the dashboard URL:
 *
 *   node site/scripts/capture.cjs http://127.0.0.1:3000 http://127.0.0.1:3200
 *
 * Set GRAFANA_USER and GRAFANA_PASSWORD from what that command printed.
 *
 * Playwright comes from the repository's existing .local/browser install.
 */
const path = require('path')
const fs = require('fs')

const URL = process.argv[2]
const GRAFANA = process.argv[3]
if (!URL) {
  console.error('usage: node site/scripts/capture.cjs <url printed by make port-forward>')
  process.exit(1)
}

const MODULE = process.env.PLAYWRIGHT_MODULE || path.join(__dirname, '../../.local/browser/node_modules/playwright')
const { chromium } = require(MODULE)

const OUT = path.join(__dirname, '../public/shots')
const CROPS = [
  { name: 'map', clip: { x: 296, y: 96, width: 704, height: 464 } },
  { name: 'journey', clip: { x: 1008, y: 300, width: 424, height: 400 } },
  { name: 'flightlog', clip: { x: 1008, y: 700, width: 424, height: 262 } },
]

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  // Let the map settle and a request complete so the panels have real content.
  await page.waitForTimeout(6000)

  await page.screenshot({ path: path.join(OUT, 'studio.png') })
  for (const c of CROPS) {
    await page.screenshot({ path: path.join(OUT, `${c.name}.png`), clip: c.clip })
  }
  if (GRAFANA) {
    const g = await browser.newPage({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 })
    await g.goto(GRAFANA, { waitUntil: 'networkidle' })
    const user = process.env.GRAFANA_USER
    const pass = process.env.GRAFANA_PASSWORD
    if (user && pass && (await g.locator('input[name="user"]').count())) {
      await g.fill('input[name="user"]', user)
      await g.fill('input[name="password"]', pass)
      await g.click('button[type="submit"]')
      await g.waitForTimeout(4000)
    }
    // Land on the provisioned dashboard, then give the panels time to query.
    const link = g.locator('a[href*="/d/"]').first()
    if (await link.count()) {
      await link.click()
      await g.waitForTimeout(8000)
    }
    await g.screenshot({ path: path.join(OUT, 'grafana.png') })
    await g.close()
    console.log('Captured Grafana. Check it for a visible session token before committing.')
  }

  await browser.close()

  console.log('Wrote PNGs to', OUT)
  console.log('Convert them to the .webp the site loads:')
  console.log("  python3 -c \"from PIL import Image; import glob,os; [Image.open(f).convert('RGB').save(f[:-4]+'.webp','WEBP',quality=93,method=6) or os.remove(f) for f in glob.glob('site/public/shots/*.png')]\"")
})()
