// Temporary verification — new 3D airport visuals
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  page.on('pageerror', e => console.log('PAGE EXCEPTION:', e.message));

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { [...document.querySelectorAll('[role="button"]')][0]?.click(); });
  await page.waitForTimeout(1200);
  await page.click('.airport-game-card', { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.click('.ag-nav-btn--play', { timeout: 10000 });
  await page.waitForTimeout(5000); // headless shader warm-up

  await page.screenshot({ path: 'C:/Users/ribei/AppData/Local/Temp/atc3d_airport_full.png' });
  console.log('shot: full');

  // Airport close-up — apron spans game x ≈ 410..515, y ≈ 185..330
  const rect = await page.evaluate(() => {
    const r = document.querySelector('.atc-canvas').getBoundingClientRect();
    const sx = r.width / 800, sy = r.height / 600;
    return { x: r.left + 400 * sx, y: r.top + 160 * sy, width: 200 * sx, height: 200 * sy };
  });
  await page.screenshot({ path: 'C:/Users/ribei/AppData/Local/Temp/atc3d_airport_close.png', clip: rect });
  console.log('shot: close');

  // Second close-up moments later — strobe sequence should differ
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/Users/ribei/AppData/Local/Temp/atc3d_airport_close2.png', clip: rect });
  console.log('shot: close 2');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
