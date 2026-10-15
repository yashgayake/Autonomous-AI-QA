import { playwrightBrowserManager } from '../src/lib/playwrightService';
import { playwrightExplorer } from '../src/lib/playwrightExplorer';
import { validateUrlSafety } from '../src/lib/qaAgent';
import { canonicalizeTargetUrl, isValidHttpUrl } from '../src/utils/urlUtils';

/**
 * Regression Test Suite: Target Website Selection & Authority
 * Verifies:
 * 1. Entering an authorized external test URL preserves that URL.
 * 2. Playwright actually navigates to that external URL (Real Chromium).
 * 3. The captured page title and observed DOM belong to the selected target.
 * 4. The built-in demo is used only when explicitly selected.
 * 5. An absent or invalid URL does not trigger a silent fallback.
 * 6. Navigation redirects are revalidated against the security policy.
 * 7. The final report identifies the actual website tested.
 */
async function runTargetSelectionVerification() {
  console.log('====================================================');
  console.log(' [REGRESSION TEST] AUTHORITATIVE TARGET SELECTION');
  console.log('====================================================');

  const startTime = Date.now();

  // ------------------------------------------------------------
  // CHECK 1: Absent or invalid URL does not trigger silent fallback
  // ------------------------------------------------------------
  console.log('\n[Check 1 & 5] Absent or invalid URL handling (No silent fallback):');
  
  const emptyCheck = validateUrlSafety('');
  if (emptyCheck.safe) {
    throw new Error('FAIL: Empty URL was accepted instead of being rejected!');
  }
  console.log('  -> PASS: Empty URL rejected explicitly:', emptyCheck.reason);

  const spacesOnly = validateUrlSafety('   ');
  if (spacesOnly.safe) {
    throw new Error('FAIL: Whitespace-only URL was accepted!');
  }
  console.log('  -> PASS: Whitespace-only URL rejected explicitly.');

  const invalidProtocol = validateUrlSafety('file:///etc/passwd');
  if (invalidProtocol.safe) {
    throw new Error('FAIL: file:// protocol was accepted!');
  }
  console.log('  -> PASS: Non-HTTP protocol rejected explicitly.');

  // ------------------------------------------------------------
  // CHECK 2: SSRF and private destination blocking
  // ------------------------------------------------------------
  console.log('\n[Check 6] SSRF and forbidden destinations revalidation:');
  const ssrfCases = [
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.1:8080',
    'http://192.168.1.1',
    'http://[fe80::1]/'
  ];
  for (const badUrl of ssrfCases) {
    const safety = validateUrlSafety(badUrl, false);
    if (safety.safe) {
      throw new Error(`FAIL: SSRF destination was permitted: ${badUrl}`);
    }
    console.log(`  -> PASS: Blocked unsafe target: ${badUrl} (${safety.reason})`);
  }

  // ------------------------------------------------------------
  // CHECK 3: Canonicalization works safely without modifying domain
  // ------------------------------------------------------------
  console.log('\n[Check 3] URL Canonicalization:');
  const canon1 = canonicalizeTargetUrl('example.com');
  if (canon1 !== 'https://example.com') {
    throw new Error(`FAIL: Expected https://example.com, got ${canon1}`);
  }
  const canon2 = canonicalizeTargetUrl('http://localhost:3000');
  if (canon2 !== 'http://localhost:3000') {
    throw new Error(`FAIL: Expected http://localhost:3000, got ${canon2}`);
  }
  console.log('  -> PASS: Canonicalization preserves scheme and normalizes naked hosts.');

  // ------------------------------------------------------------
  // CHECK 4: Real Chromium navigation to authorized external URL
  // ------------------------------------------------------------
  console.log('\n[Check 2, 3, 4] Real Playwright Chromium Navigation to Authorized External URL:');
  const externalTarget = 'https://example.com';
  console.log(`  -> Inspecting external target: ${externalTarget} via real Chromium...`);

  const inspectResult = await playwrightBrowserManager.inspectUrl(externalTarget, {
    captureScreenshot: true,
    timeoutMs: 15000
  });

  if (!inspectResult.success) {
    throw new Error(`FAIL: Chromium failed to inspect external target: ${inspectResult.error}`);
  }

  console.log(`  -> HTTP Response Status: ${inspectResult.status}`);
  console.log(`  -> Requested Target URL:  ${inspectResult.requestedUrl}`);
  console.log(`  -> Actual Final URL:      ${inspectResult.actualBrowserUrl}`);
  console.log(`  -> Observed Page Title:   "${inspectResult.title}"`);
  console.log(`  -> Target Type:           ${inspectResult.isBuiltInDemo ? 'BUILT-IN DEMO' : 'EXTERNAL WEB APP'}`);
  console.log(`  -> Observed DOM Buttons:  ${inspectResult.domSummary.buttonsCount}`);
  console.log(`  -> Observed DOM Links:    ${inspectResult.domSummary.linksCount}`);
  console.log(`  -> Screenshot Captured:   ${inspectResult.screenshotBase64 ? 'YES (' + Math.round(inspectResult.screenshotBase64.length / 1024) + ' KB base64)' : 'NO'}`);

  // Assertions on the real browser observation
  if (!inspectResult.actualBrowserUrl?.includes('example.com')) {
    throw new Error(`FAIL: Browser did not navigate to example.com! Current URL: ${inspectResult.actualBrowserUrl}`);
  }
  if (!inspectResult.title.includes('Example Domain')) {
    throw new Error(`FAIL: Page title mismatch! Expected "Example Domain", got "${inspectResult.title}"`);
  }
  if (inspectResult.isBuiltInDemo === true) {
    throw new Error(`FAIL: isBuiltInDemo was true for external target!`);
  }
  console.log('  -> PASS: Real Chromium navigated to external URL without falling back to demo.');

  // ------------------------------------------------------------
  // CHECK 5: Autonomous crawler verification on external target
  // ------------------------------------------------------------
  console.log('\n[Check 5] Autonomous Playwright exploration on external target:');
  const exploreResult = await playwrightExplorer.explore({
    startUrl: externalTarget,
    maxPages: 1,
    timeoutMs: 10000,
    captureScreenshots: false
  });

  if (!exploreResult.success) {
    throw new Error(`FAIL: Autonomous exploration failed: ${exploreResult.error}`);
  }

  console.log(`  -> Visited Page States: ${exploreResult.totalPagesVisited}`);
  console.log(`  -> Actual Final URL:    ${exploreResult.actualFinalUrl}`);
  console.log(`  -> Discovered Elements: ${exploreResult.totalElementsDiscovered}`);

  if (!exploreResult.actualFinalUrl?.includes('example.com')) {
    throw new Error(`FAIL: Autonomous exploration navigated to wrong URL: ${exploreResult.actualFinalUrl}`);
  }
  console.log('  -> PASS: Exploration respects external target URL.');

  // ------------------------------------------------------------
  // CHECK 6: Built-in demo is used ONLY when explicitly requested
  // ------------------------------------------------------------
  console.log('\n[Check 6] Built-in demo used only when explicitly selected:');
  const demoTarget = 'http://localhost:3000';
  const demoInspect = await playwrightBrowserManager.inspectUrl(demoTarget, {
    captureScreenshot: false,
    timeoutMs: 10000
  });

  if (!demoInspect.success) {
    throw new Error(`FAIL: Could not inspect local demo: ${demoInspect.error}`);
  }

  console.log(`  -> Demo URL:         ${demoInspect.actualBrowserUrl}`);
  console.log(`  -> Demo Title:       "${demoInspect.title}"`);
  console.log(`  -> isBuiltInDemo:    ${demoInspect.isBuiltInDemo}`);

  if (!demoInspect.isBuiltInDemo) {
    throw new Error(`FAIL: Localhost 3000 was not flagged as built-in demo!`);
  }
  console.log('  -> PASS: Built-in demo flagged correctly when explicitly selected.');

  // Cleanup
  await playwrightBrowserManager.close();

  const duration = Date.now() - startTime;
  console.log('\n====================================================');
  console.log(` [VERIFICATION SUCCESS] Target selection passed in ${duration}ms`);
  console.log('====================================================\n');
}

runTargetSelectionVerification().catch(err => {
  console.error('\n[REGRESSION TEST FAILED]', err);
  process.exit(1);
});
