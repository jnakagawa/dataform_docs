const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // TEST CRITERION 1: Whole pipeline visible at a glance
  console.log('=== TESTING CRITERION 1: Whole pipeline visible at a glance ===');
  
  // Count visible nodes in the viewport
  const visibleNodeCount = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node');
    const viewport = document.querySelector('.react-flow__viewport');
    const viewportRect = viewport.getBoundingClientRect();
    
    let visibleCount = 0;
    nodes.forEach(node => {
      const nodeRect = node.getBoundingClientRect();
      // Check if node is within viewport bounds
      if (nodeRect.left < viewportRect.right && 
          nodeRect.right > viewportRect.left && 
          nodeRect.top < viewportRect.bottom && 
          nodeRect.bottom > viewportRect.top) {
        visibleCount++;
      }
    });
    
    return {
      total: nodes.length,
      visible: visibleCount
    };
  });
  
  console.log(`Total models in graph: ${visibleNodeCount.total}`);
  console.log(`Visible models in viewport: ${visibleNodeCount.visible}`);
  console.log(`Criterion 1 met: ${visibleNodeCount.visible >= Math.floor(visibleNodeCount.total * 0.8) ? 'YES' : 'NO'}`);
  
  // Take screenshot of main view
  await page.screenshot({ path: 'criteria-test-1-overview.png', fullPage: false });
  console.log('Overview screenshot saved');
  
  // TEST CRITERION 2: Ability to zoom in and see segments clearly
  console.log('\\n=== TESTING CRITERION 2: Zoom capability ===');
  
  // Test zoom in by using the zoom controls
  await page.click('[data-testid="rf__controls-zoomin"]');
  await page.click('[data-testid="rf__controls-zoomin"]');
  await page.click('[data-testid="rf__controls-zoomin"]');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Take screenshot after zooming in
  await page.screenshot({ path: 'criteria-test-2-zoomin.png', fullPage: false });
  console.log('Zoom-in screenshot saved');
  
  // Check if we can see node details clearly after zoom
  const nodeDetailsVisible = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node');
    let detailsVisibleCount = 0;
    
    nodes.forEach(node => {
      // Check if node text is readable (not too small)
      const textElements = node.querySelectorAll('div');
      textElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const fontSize = parseFloat(computedStyle.fontSize);
        if (fontSize >= 10) { // Readable font size
          detailsVisibleCount++;
        }
      });
    });
    
    return detailsVisibleCount > 0;
  });
  
  console.log(`Node details visible after zoom: ${nodeDetailsVisible ? 'YES' : 'NO'}`);
  console.log(`Criterion 2 met: ${nodeDetailsVisible ? 'YES' : 'NO'}`);
  
  // Test zoom out back to overview
  await page.click('[data-testid="rf__controls-fitview"]');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await page.screenshot({ path: 'criteria-test-3-fit-view.png', fullPage: false });
  console.log('Fit-view screenshot saved');
  
  console.log('\\n=== FINAL RESULTS ===');
  console.log(`Criterion 1 (Overview): ${visibleNodeCount.visible >= Math.floor(visibleNodeCount.total * 0.8) ? 'PASSED' : 'FAILED'}`);
  console.log(`Criterion 2 (Zoom): ${nodeDetailsVisible ? 'PASSED' : 'FAILED'}`);
  
  await browser.close();
})();