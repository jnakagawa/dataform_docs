const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1400, height: 900 });
  
  try {
    console.log('🚀 Navigating to documentation site...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take initial screenshot (full view)
    await page.screenshot({ path: 'autozoom-1-initial.png' });
    console.log('📸 Screenshot 1: Initial full view');
    
    // Click the "Test Isolation" button to trigger isolation
    console.log('🔘 Looking for Test Isolation button...');
    const buttons = await page.$$('button');
    let testButton = null;
    
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Test Isolation')) {
        testButton = button;
        break;
      }
    }
    
    if (testButton) {
      console.log('🔘 Clicking Test Isolation button...');
      await testButton.click();
      
      // Wait for isolation and auto-zoom to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot after isolation + auto-zoom
      await page.screenshot({ path: 'autozoom-2-isolated.png' });
      console.log('📸 Screenshot 2: After isolation + auto-zoom');
      
      // Look for "Show All" button
      console.log('🔘 Looking for Show All button...');
      const allButtons = await page.$$('button');
      let showAllButton = null;
      
      for (const button of allButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Show All')) {
          showAllButton = button;
          break;
        }
      }
      
      if (showAllButton) {
        console.log('🔘 Clicking Show All button...');
        await showAllButton.click();
        
        // Wait for transition back to full view
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Take final screenshot
        await page.screenshot({ path: 'autozoom-3-full-again.png' });
        console.log('📸 Screenshot 3: Back to full view');
      } else {
        console.log('⚠️ Show All button not found');
      }
    } else {
      console.log('⚠️ Test Isolation button not found');
    }
    
    console.log('✅ Auto-zoom test completed!');
    
  } catch (error) {
    console.error('❌ Error testing auto-zoom:', error);
  } finally {
    await browser.close();
  }
})();