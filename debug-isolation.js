const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  // Listen to console events
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });
  
  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    
    // Wait for the graph to load
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    console.log('Graph loaded');
    
    // Find and click on a model in the sidebar
    const modelItems = await page.$$('.cursor-pointer');
    console.log('Found', modelItems.length, 'clickable items');
    
    if (modelItems.length > 3) {
      console.log('Clicking on model...');
      await modelItems[3].click();
      await page.waitForTimeout(3000); // Wait to see console output
    }
    
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('Keeping browser open for inspection...');
  await page.waitForTimeout(20000); // Keep browser open
  await browser.close();
})();