import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

/**
 * Phase 1 Verification Script: Real Playwright Chromium Engine Verification
 * 
 * Verifies:
 * 1. Real Chromium process launch
 * 2. Browser context creation
 * 3. Page navigation to http://localhost:3000
 * 4. Actual Title and URL inspection
 * 5. Real DOM element discovery and enumeration
 * 6. Real binary screenshot capture and saving to disk
 * 7. Clean browser close
 */
async function runRealBrowserVerification() {
  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
  const screenshotDir = path.resolve(process.cwd(), 'playwright-evidence');
  const screenshotPath = path.join(screenshotDir, 'phase1-verification-screenshot.png');

  console.log('====================================================');
  console.log(' [PHASE 1] REAL PLAYWRIGHT CHROMIUM VERIFICATION');
  console.log('====================================================');
  console.log(`Target: ${targetUrl}`);

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const startTime = Date.now();

  console.log('\n[1/6] Launching real Chromium browser via Playwright...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  console.log('  -> Browser launched successfully. Connected:', browser.isConnected());

  console.log('\n[2/6] Creating browser context and isolated page...');
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log(`\n[3/6] Navigating to ${targetUrl}...`);
  const response = await page.goto(targetUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  const statusCode = response ? response.status() : 'N/A';
  console.log(`  -> HTTP Response Status: ${statusCode}`);

  // Wait for React app root container to mount
  await page.waitForSelector('#root', { state: 'attached', timeout: 10000 });
  await page.waitForSelector('button, header, h1', { timeout: 10000 });

  console.log('\n[4/6] Inspecting live DOM and page metadata...');
  const currentUrl = page.url();
  const pageTitle = await page.title();
  console.log(`  -> Verified Current URL: ${currentUrl}`);
  console.log(`  -> Verified Page Title: "${pageTitle}"`);

  // Inspect real interactive DOM elements
  const buttonsCount = await page.locator('button').count();
  const inputsCount = await page.locator('input').count();
  const linksCount = await page.locator('a').count();

  // Extract real text from first 5 buttons
  const sampleButtons = await page.locator('button').evaluateAll(btns =>
    btns.slice(0, 6).map(b => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40))
  );

  console.log(`  -> DOM Element Counts:`);
  console.log(`     - Buttons discovered: ${buttonsCount}`);
  console.log(`     - Inputs discovered:  ${inputsCount}`);
  console.log(`     - Links discovered:   ${linksCount}`);
  console.log(`  -> Sample Discovered Button Texts:`, sampleButtons);

  console.log('\n[5/6] Capturing real binary screenshot file to disk...');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const fileStats = fs.statSync(screenshotPath);
  console.log(`  -> Screenshot saved to: ${screenshotPath}`);
  console.log(`  -> File size: ${fileStats.size} bytes (${(fileStats.size / 1024).toFixed(1)} KB)`);

  console.log('\n[6/6] Closing browser context and Chromium process cleanly...');
  await page.close();
  await context.close();
  await browser.close();
  console.log('  -> Chromium browser closed cleanly. Still connected:', browser.isConnected());

  const elapsedMs = Date.now() - startTime;
  console.log('\n====================================================');
  console.log(` [VERIFICATION SUCCESS] Completed in ${elapsedMs}ms`);
  console.log('====================================================\n');
}

runRealBrowserVerification().catch(err => {
  console.error('\n[VERIFICATION FAILED]', err);
  process.exit(1);
});
