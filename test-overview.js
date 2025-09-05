const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Take screenshot of main overview - should show whole pipeline
  await page.screenshot({ path: 'overview-test-1.png', fullPage: false });
  console.log('Overview screenshot saved as overview-test-1.png');
  
  // Test zoom in capability - zoom to a higher level to see detail
  await page.evaluate(() => {
    const reactFlowElement = document.querySelector('.react-flow');
    if (reactFlowElement) {
      // Simulate zoom in by changing the transform
      const viewport = reactFlowElement.querySelector('.react-flow__viewport');
      if (viewport) {
        viewport.style.transform = 'translate(300px, 200px) scale(0.5)';
      }
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Take screenshot after zoom in
  await page.screenshot({ path: 'overview-test-2-zoom.png', fullPage: false });
  console.log('Zoom test screenshot saved as overview-test-2-zoom.png');
  
  await browser.close();
})();