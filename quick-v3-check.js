const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3007', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const titleText = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.textContent : 'No h1 found';
  });
  
  console.log(`Title: ${titleText}`);
  console.log(`Contains v3: ${titleText.includes('v3')}`);
  
  await browser.close();
})();