const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3008', { waitUntil: 'networkidle2' });
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Take screenshot with increased node spacing
  await page.screenshot({ path: 'readable-spacing-test.png', fullPage: false });
  console.log('READABLE SPACING TEST screenshot saved as readable-spacing-test.png');
  
  // Check if nodes are properly spaced and readable
  const readabilityAnalysis = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node');
    const viewport = document.querySelector('.react-flow__viewport');
    
    if (!viewport) return { error: 'No viewport found' };
    
    let visibleNodes = 0;
    let overlappingNodes = 0;
    const nodePositions = [];
    
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      
      // Check if visible
      if (rect.width > 0 && rect.height > 0 && 
          rect.right > 0 && rect.left < window.innerWidth && 
          rect.bottom > 0 && rect.top < window.innerHeight) {
        visibleNodes++;
        
        // Check for overlaps with other nodes
        const position = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        
        for (const otherPos of nodePositions) {
          // Check if rectangles overlap significantly (more than just touching edges)
          const xOverlap = Math.max(0, Math.min(position.x + position.width, otherPos.x + otherPos.width) - Math.max(position.x, otherPos.x));
          const yOverlap = Math.max(0, Math.min(position.y + position.height, otherPos.y + otherPos.height) - Math.max(position.y, otherPos.y));
          
          if (xOverlap > 10 && yOverlap > 10) { // More than 10px overlap is considered overlapping
            overlappingNodes++;
            break;
          }
        }
        
        nodePositions.push(position);
      }
    });
    
    return {
      totalNodes: nodes.length,
      visibleNodes,
      overlappingNodes,
      overlapPercentage: visibleNodes > 0 ? (overlappingNodes / visibleNodes * 100).toFixed(1) : 0,
      transform: viewport.style.transform
    };
  });
  
  console.log(`Total nodes: ${readabilityAnalysis.totalNodes}`);
  console.log(`Visible nodes: ${readabilityAnalysis.visibleNodes}`);
  console.log(`Overlapping nodes: ${readabilityAnalysis.overlappingNodes}`);
  console.log(`Overlap percentage: ${readabilityAnalysis.overlapPercentage}%`);
  console.log(`Transform: ${readabilityAnalysis.transform}`);
  
  const criterion1 = readabilityAnalysis.visibleNodes >= 70;
  const criterion2 = readabilityAnalysis.overlapPercentage < 20; // Less than 20% overlap
  
  console.log(`\\n=== FINAL ASSESSMENT ===`);
  console.log(`CRITERION 1 (Pipeline visible): ${criterion1 ? 'PASSED' : 'FAILED'}`);
  console.log(`  Need: 70+ nodes visible | Got: ${readabilityAnalysis.visibleNodes}`);
  
  console.log(`CRITERION 2 (Readable/Not overlapping): ${criterion2 ? 'PASSED' : 'FAILED'}`);
  console.log(`  Need: <20% overlap | Got: ${readabilityAnalysis.overlapPercentage}%`);
  
  console.log(`\\nOVERALL: ${criterion1 && criterion2 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  
  await browser.close();
})();