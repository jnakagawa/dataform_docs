const puppeteer = require('puppeteer');
const fs = require('fs');

async function takeScreenshot() {
  let browser;
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    console.log('📖 Navigating to documentation site...');
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait a bit for React to render
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take full page screenshot
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({
      path: 'dataform-docs-full.png',
      fullPage: true
    });

    // Take viewport screenshot
    console.log('📸 Taking viewport screenshot...');
    await page.screenshot({
      path: 'dataform-docs-viewport.png'
    });

    // Try to click on a model in the list
    try {
      console.log('🔍 Looking for model to click...');
      await page.waitForSelector('[data-testid="model-item"], .model-item, [class*="model"], [class*="card"]', { timeout: 5000 });
      
      // Click on first available model
      const modelElements = await page.$$('[class*="card"], [class*="model"]');
      if (modelElements.length > 0) {
        console.log('🖱️ Clicking on a model...');
        await modelElements[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.screenshot({
          path: 'dataform-docs-with-details.png'
        });
        console.log('📸 Screenshot with model details taken!');
      }
    } catch (e) {
      console.log('⚠️ Could not click on model:', e.message);
    }

    console.log('✅ Screenshots saved successfully!');
    console.log('   - dataform-docs-full.png (full page)');
    console.log('   - dataform-docs-viewport.png (viewport)');
    if (fs.existsSync('dataform-docs-with-details.png')) {
      console.log('   - dataform-docs-with-details.png (with model details)');
    }

  } catch (error) {
    console.error('❌ Error taking screenshots:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeScreenshot();