const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture console output
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DAGRE DEBUG') || text.includes('DAGRE TEST')) {
      console.log('🔍', text);
    }
  });
  
  console.log('🌐 Opening http://localhost:3010');
  await page.goto('http://localhost:3010', { waitUntil: 'networkidle2' });
  
  console.log('⏳ Waiting for graph to load...');
  await page.waitForSelector('[data-testid="rf__wrapper"]', { timeout: 10000 });
  
  console.log('✅ Graph loaded! Check console output above for dagre debug info.');
  console.log('📷 Taking screenshot...');
  
  await page.screenshot({ 
    path: 'dagre-debug-spacing.png', 
    fullPage: true 
  });
  
  console.log('🎯 Screenshot saved as dagre-debug-spacing.png');
  console.log('🔍 Browser will stay open for manual inspection...');
  
  // Keep browser open for manual inspection
  // await browser.close();
})().catch(console.error);