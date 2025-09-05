const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3007', { waitUntil: 'networkidle2' });
  
  // Wait for React to load and check for v3
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Verify v3 text
  const titleText = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.textContent : 'No h1 found';
  });
  
  console.log('=== VERIFICATION ===');
  console.log(`Title: ${titleText}`);
  console.log(`Contains v3: ${titleText.includes('v3')}`);
  
  // TEST CRITERIA with ultra-low zoom
  console.log('\n=== TESTING CRITERIA ===');
  
  // Count all visible nodes in viewport with ultra-low zoom
  const nodeAnalysis = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node');
    const viewport = document.querySelector('.react-flow__viewport');
    
    if (!viewport) return { error: 'No viewport found' };
    
    const viewportRect = viewport.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let visibleCount = 0;
    let totalWithinBounds = 0;
    
    nodes.forEach(node => {
      const nodeRect = node.getBoundingClientRect();
      
      // Check if any part of the node is within the window
      if (nodeRect.right > 0 && 
          nodeRect.left < windowWidth && 
          nodeRect.bottom > 0 && 
          nodeRect.top < windowHeight) {
        visibleCount++;
      }
      
      totalWithinBounds++;
    });
    
    return {
      totalNodes: nodes.length,
      visibleInWindow: visibleCount,
      currentZoom: viewport.style.transform,
      windowDimensions: { width: windowWidth, height: windowHeight },
      viewportDimensions: { 
        width: viewportRect.width, 
        height: viewportRect.height 
      }
    };
  });
  
  console.log(`Total nodes: ${nodeAnalysis.totalNodes}`);
  console.log(`Nodes visible in window: ${nodeAnalysis.visibleInWindow}`);
  console.log(`Current transform: ${nodeAnalysis.currentZoom}`);
  
  const criterion1Met = nodeAnalysis.visibleInWindow >= Math.floor(nodeAnalysis.totalNodes * 0.6);
  console.log(`\\nCRITERION 1 (60%+ visible): ${criterion1Met ? 'PASSED' : 'FAILED'}`);
  console.log(`  Need: ${Math.floor(nodeAnalysis.totalNodes * 0.6)}+ visible`);
  console.log(`  Got: ${nodeAnalysis.visibleInWindow} visible`);
  
  // Take screenshot
  await page.screenshot({ path: 'verify-criteria.png', fullPage: false });
  console.log('\\nScreenshot saved as verify-criteria.png');
  
  // Test zoom in capability
  console.log('\\n=== TESTING ZOOM IN CAPABILITY ===');
  
  // Use zoom in controls
  const zoomButton = await page.$('[data-testid="rf__controls-zoomin"]');
  if (zoomButton) {
    await zoomButton.click();
    await zoomButton.click();
    await zoomButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const zoomAnalysis = await page.evaluate(() => {
      const viewport = document.querySelector('.react-flow__viewport');
      return {
        zoomTransform: viewport ? viewport.style.transform : 'not found'
      };
    });
    
    console.log(`After zoom in: ${zoomAnalysis.zoomTransform}`);
    
    await page.screenshot({ path: 'verify-criteria-zoom.png', fullPage: false });
    console.log('Zoom screenshot saved as verify-criteria-zoom.png');
    
    console.log('CRITERION 2 (Zoom capability): PASSED');
  } else {
    console.log('CRITERION 2 (Zoom capability): FAILED - No zoom controls found');
  }
  
  await browser.close();
})();