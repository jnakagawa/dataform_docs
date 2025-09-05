const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    
    // Wait for the graph to load
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    console.log('Graph loaded');
    
    // Wait for model list to load 
    await page.waitForSelector('.cursor-pointer', { timeout: 5000 });
    
    // Get all clickable elements and find the ones in the model list
    const elements = await page.$$('.cursor-pointer');
    console.log(`Found ${elements.length} cursor-pointer elements`);
    
    // Try to find one that looks like a model item
    for (let i = 0; i < Math.min(elements.length, 10); i++) {
      const text = await elements[i].evaluate(el => el.textContent);
      console.log(`Element ${i}: ${text?.substring(0, 100)}`);
      if (text && text.includes('f_user_')) {
        console.log(`Clicking on element ${i} that contains model name`);
        await elements[i].click();
        break;
      }
    }
    
    // Wait to see if alert appears
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  await browser.close();
})();