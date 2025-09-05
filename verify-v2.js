const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check for v2 text in the title
  const titleText = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.textContent : 'No h1 found';
  });
  
  console.log('Title text:', titleText);
  console.log('Contains "v2":', titleText.includes('v2'));
  
  // Check for Test Isolation button
  const testButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const testButton = buttons.find(btn => btn.textContent.includes('Test Isolation'));
    return testButton ? testButton.textContent : null;
  });
  
  console.log('Test Isolation button:', testButton ? `Found: "${testButton}"` : 'Not found');
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'verify-v2-screenshot.png', fullPage: false });
  console.log('Screenshot saved as verify-v2-screenshot.png');
  
  await browser.close();
})();