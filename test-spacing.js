const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Take a screenshot of the current state
  await page.screenshot({ path: 'spacing-test-1.png', fullPage: false });
  console.log('Screenshot 1 saved as spacing-test-1.png');
  
  // Click "Test Isolation" button to test isolated view
  const testButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const testButton = buttons.find(btn => btn.textContent.includes('Test Isolation'));
    if (testButton) {
      testButton.click();
      return true;
    }
    return false;
  });
  
  if (testButton) {
    // Wait for the isolation to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot of the isolated view
    await page.screenshot({ path: 'spacing-test-2-isolated.png', fullPage: false });
    console.log('Screenshot 2 (isolated) saved as spacing-test-2-isolated.png');
  }
  
  await browser.close();
})();