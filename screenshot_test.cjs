const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  } catch(e) {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/ribei/AppData/Local/Temp/screenshot_main.png' });
  console.log('Screenshot 1 taken');

  // Scroll down to the connections section
  await page.evaluate(() => {
    const panel = document.querySelector('.airport-connections-panel');
    if (panel) panel.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/ribei/AppData/Local/Temp/screenshot_connections.png' });
  console.log('Screenshot 2 taken');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
