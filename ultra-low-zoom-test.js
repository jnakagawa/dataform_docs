const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3007', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Take screenshot with ultra-low zoom 0.005
  await page.screenshot({ path: 'ultra-low-zoom-test.png', fullPage: false });
  console.log('ULTRA LOW ZOOM (0.005) screenshot saved as ultra-low-zoom-test.png');
  
  // Count actual visible node elements
  const visibleAnalysis = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node');
    const viewport = document.querySelector('.react-flow__viewport');
    
    let actuallyVisible = 0;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      
      // Check if node is actually visible in window (not just existing in DOM)
      if (rect.width > 0 && rect.height > 0 && 
          rect.right > 0 && rect.left < windowWidth && 
          rect.bottom > 0 && rect.top < windowHeight) {
        actuallyVisible++;
      }
    });
    
    return {
      totalNodes: nodes.length,
      actuallyVisibleInViewport: actuallyVisible,
      viewportTransform: viewport ? viewport.style.transform : 'not found'
    };
  });
  
  console.log(`Total DOM nodes: ${visibleAnalysis.totalNodes}`);
  console.log(`ACTUALLY visible in viewport: ${visibleAnalysis.actuallyVisibleInViewport}`);
  console.log(`Transform: ${visibleAnalysis.viewportTransform}`);
  
  const success = visibleAnalysis.actuallyVisibleInViewport >= 80; // Need 80+ models visible
  console.log(`\\nCRITERION 1 - Whole pipeline visible: ${success ? 'PASSED' : 'FAILED'}`);
  console.log(`Need: 80+ models visible at once`);
  console.log(`Got: ${visibleAnalysis.actuallyVisibleInViewport} models visible`);
  
  await browser.close();
})();